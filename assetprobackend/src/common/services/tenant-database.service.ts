import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { TENANT_MIGRATIONS, type TenantMigration } from './tenant-migrations';

const execAsync = promisify(exec);

export interface TenantAdminData {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
}

export interface TenantProvisioningData {
  schemaName: string;
  companyName: string;
  subdomain: string;
  adminData: TenantAdminData;
}

export interface ProvisioningResult {
  success: boolean;
  companyId?: number;
  entityId?: number;
  branchId?: number;
  currencyId?: number;
  userId?: number;
  error?: string;
}

@Injectable()
export class TenantDatabaseService {
  private readonly logger = new Logger(TenantDatabaseService.name);
  private pool: Pool;

  constructor(private configService: ConfigService) {
    this.pool = new Pool({
      connectionString: this.configService.get('DATABASE_URL'),
      max: 1,
      idleTimeoutMillis: 30000,
    });
  }

  /**
   * Full tenant provisioning: create schema, migrate, seed, and create admin user
   */
  async provisionTenantDatabase(data: TenantProvisioningData): Promise<ProvisioningResult> {
    const { schemaName, companyName, subdomain, adminData } = data;

    try {
      this.logger.log(`Starting provisioning for tenant: ${schemaName}`);

      // Step 1: Create the schema
      await this.createSchema(schemaName);
      this.logger.log(`Schema ${schemaName} created`);

      // Step 2: Run migrations
      await this.runMigrations(schemaName);
      this.logger.log(`Migrations completed for ${schemaName}`);

      // Step 3: Seed and setup
      return await this.seedAndSetupTenant(schemaName, companyName, subdomain, adminData);
    } catch (error) {
      this.logger.error(`Provisioning failed for ${schemaName}: ${error.message}`);

      // Attempt cleanup on failure
      try {
        await this.dropSchema(schemaName);
      } catch (cleanupError) {
        this.logger.error(`Cleanup failed: ${cleanupError.message}`);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Seed and setup tenant database (assumes schema and migrations are already done)
   * Use this when you want finer control over the provisioning steps
   */
  async seedAndSetupTenant(
    schemaName: string,
    companyName: string,
    subdomain: string,
    adminData: TenantAdminData,
  ): Promise<ProvisioningResult> {
    let client: PoolClient | null = null;

    try {
      // Get a connection to the tenant schema
      client = await this.pool.connect();
      await client.query(`SET search_path TO "${schemaName}"`);

      // Create base records (Entity, Currency, Company, Branch)
      const baseRecords = await this.createBaseRecords(client, companyName, subdomain);
      this.logger.log(`Base records created for ${schemaName}`);

      // Seed the tenant database
      await this.seedTenantDatabase(client, baseRecords);
      this.logger.log(`Seeding completed for ${schemaName}`);

      // Create admin user
      const userId = await this.createAdminUser(client, adminData, baseRecords.companyId);
      this.logger.log(`Admin user created for ${schemaName}`);

      return {
        success: true,
        companyId: baseRecords.companyId,
        entityId: baseRecords.entityId,
        branchId: baseRecords.branchId,
        currencyId: baseRecords.currencyId,
        userId,
      };
    } catch (error) {
      this.logger.error(`Seeding failed for ${schemaName}: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Create a new PostgreSQL schema for the tenant
   */
  async createSchema(schemaName: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Sanitize schema name to prevent SQL injection
      const sanitizedName = schemaName.replace(/[^a-z0-9_]/gi, '');
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${sanitizedName}"`);
    } finally {
      client.release();
    }
  }

  /**
   * Drop a tenant schema (for cleanup on failure)
   */
  async dropSchema(schemaName: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const sanitizedName = schemaName.replace(/[^a-z0-9_]/gi, '');
      await client.query(`DROP SCHEMA IF EXISTS "${sanitizedName}" CASCADE`);
    } finally {
      client.release();
    }
  }

  /**
   * Run Prisma db push on the tenant schema
   * Using db push instead of migrate deploy for multi-tenant - simpler and doesn't require migration history
   */
  async runMigrations(schemaName: string): Promise<void> {
    const sanitizedName = schemaName.replace(/[^a-z0-9_]/gi, '');
    const baseUrl = this.configService.get('DATABASE_URL');

    // Construct tenant-specific database URL with schema
    // Format: postgresql://user:pass@host:port/db?schema=tenant_xxx
    const tenantDbUrl = this.appendSchemaToUrl(baseUrl, sanitizedName);

    // Use process.cwd() which is the project root when running npm start
    const projectRoot = process.cwd();
    const schemaPath = path.join(projectRoot, 'prisma', 'schema.tenant.prisma');

    this.logger.debug(`Project root: ${projectRoot}`);
    this.logger.debug(`Schema path: ${schemaPath}`);

    try {
      // Run prisma db push for tenant schema - creates tables without migration history
      // Use --url to pass the tenant-specific database URL directly
      const { stdout, stderr } = await execAsync(
        `npx prisma db push --schema="${schemaPath}" --url="${tenantDbUrl}" --accept-data-loss`,
        {
          cwd: projectRoot,
          env: {
            ...process.env,
          },
        },
      );

      if (stderr && !stderr.includes('pushed') && !stderr.includes('synced')) {
        this.logger.warn(`DB push stderr: ${stderr}`);
      }

      this.logger.debug(`DB push stdout: ${stdout}`);

      // Run tenant migrations (adds any columns/defaults not in Prisma schema yet)
      await this.runTenantMigrations(sanitizedName);
    } catch (error) {
      throw new Error(`DB push failed: ${error.message}`);
    }
  }

  /**
   * Ensure all updatedAt columns have DEFAULT CURRENT_TIMESTAMP.
   * Prisma's @updatedAt only works via Prisma Client, not raw SQL.
   * Without this default, raw INSERT calls will fail with NOT NULL violation.
   */
  private async fixUpdatedAtDefaults(schemaName: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`SET search_path TO "${schemaName}"`);
      const { rows } = await client.query(`
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = $1
          AND column_name = 'updatedAt'
          AND is_nullable = 'NO'
          AND (column_default IS NULL OR column_default NOT LIKE '%CURRENT_TIMESTAMP%')
      `, [schemaName]);

      for (const row of rows) {
        await client.query(`ALTER TABLE "${row.table_name}" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`);
      }

      if (rows.length > 0) {
        this.logger.log(`Fixed updatedAt defaults on ${rows.length} tables in schema ${schemaName}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to fix updatedAt defaults for ${schemaName}: ${err.message}`);
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // TENANT MIGRATIONS
  // ============================================================================

  /**
   * Run all pending migrations on a single tenant schema.
   * Migrations are idempotent â€” safe to run multiple times.
   */
  async runTenantMigrations(schemaName: string): Promise<{ applied: number; skipped: number; errors: string[] }> {
    const client = await this.pool.connect();
    const errors: string[] = [];
    let applied = 0;
    let skipped = 0;

    try {
      await client.query(`SET search_path TO "${schemaName}"`);

      // Ensure migration tracking table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS _tenant_migrations (
          id VARCHAR(255) PRIMARY KEY,
          description TEXT,
          "appliedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Apply in chronological order regardless of array position. IDs are
      // date-prefixed (YYYY-MM-DD-NNN-â€¦), so lexicographic sort = dependency
      // order. Without this, when `_tenant_migrations` gets wiped (e.g. by a
      // `prisma db push` that doesn't know about the table), every migration
      // re-runs in array order â€” and any migration that references a column
      // added by a later one in the array crashes.
      const orderedMigrations = [...TENANT_MIGRATIONS].sort((a, b) => a.id.localeCompare(b.id));

      for (const migration of orderedMigrations) {
        // Check if already applied
        const existing = await client.query(
          `SELECT id FROM _tenant_migrations WHERE id = $1`,
          [migration.id],
        );

        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        // Apply migration — run all SQL statements, then record as applied.
        // If any SQL fails, we do NOT record the migration so it will be
        // retried on the next startup rather than silently skipped forever.
        try {
          for (const sql of migration.sql) {
            if (sql.trim()) {
              await client.query(sql);
            }
          }

          // Only record AFTER all SQL succeeds. This ensures a failed migration
          // is retried on next startup rather than being permanently skipped.
          await client.query(
            `INSERT INTO _tenant_migrations (id, description) VALUES ($1, $2)`,
            [migration.id, migration.description],
          );

          applied++;
          this.logger.log(`[${schemaName}] ✅ Applied migration: ${migration.id}`);
        } catch (err) {
          // Log at ERROR (not warn) so it surfaces clearly in PM2 error log.
          const msg = `[${schemaName}] ❌ Migration ${migration.id} FAILED: ${err.message}`;
          errors.push(msg);
          this.logger.error(msg);
          this.logger.error(`[${schemaName}]    Description: ${migration.description}`);
          // Continue to next migration — don't abort the whole tenant.
        }
      }

    } catch (err) {
      errors.push(`[${schemaName}] Setup failed: ${err.message}`);
    } finally {
      client.release();
    }

    // Fix updatedAt defaults AFTER releasing the pool connection.
    // Calling it inside the try block above caused a pool deadlock: this method
    // holds the only connection (max=1) and fixUpdatedAtDefaults() tries to
    // acquire another one, waiting forever.
    await this.fixUpdatedAtDefaults(schemaName);

    return { applied, skipped, errors };
  }

  /**
   * List every `tenant_*` schema present in the database. Useful for
   * background jobs that need to sweep across all tenants.
   */
  async listTenantSchemas(): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT schema_name FROM information_schema.schemata
          WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name`,
      );
      return result.rows.map((r) => r.schema_name as string);
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations on ALL existing tenant schemas.
   */
  async runMigrationsAllTenants(): Promise<{
    totalTenants: number;
    totalApplied: number;
    totalSkipped: number;
    totalErrors: number;
    details: Array<{ schema: string; applied: number; skipped: number; errors: string[] }>;
  }> {
    const client = await this.pool.connect();
    let schemas: string[] = [];

    try {
      const result = await client.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name`,
      );
      schemas = result.rows.map(r => r.schema_name);
    } finally {
      client.release();
    }

    this.logger.log(`Running migrations on ${schemas.length} tenant schema(s)...`);

    const details: Array<{ schema: string; applied: number; skipped: number; errors: string[] }> = [];
    let totalApplied = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const schema of schemas) {
      const result = await this.runTenantMigrations(schema);
      details.push({ schema, ...result });
      totalApplied += result.applied;
      totalSkipped += result.skipped;
      totalErrors += result.errors.length;
    }

    this.logger.log(
      `Migration complete: ${schemas.length} tenant(s), ${totalApplied} applied, ${totalSkipped} skipped, ${totalErrors} error(s)`,
    );

    return {
      totalTenants: schemas.length,
      totalApplied,
      totalSkipped,
      totalErrors,
      details,
    };
  }

  /**
   * Create base records: Entity, Currency, Company, Branch
   */
  private async createBaseRecords(
    client: PoolClient,
    companyName: string,
    subdomain: string,
  ): Promise<{ entityId: number; currencyId: number; companyId: number; branchId: number }> {
    // Create Currency (NGN) first
    const currencyResult = await client.query(
      `INSERT INTO ifrs_currencies (code, name, symbol, "decimalPlaces", "isActive", "createdAt", "updatedAt")
       VALUES ('NGN', 'Nigerian Naira', 'â‚¦', 2, true, NOW(), NOW())
       RETURNING id`,
    );
    const currencyId = currencyResult.rows[0].id;

    // Create IFRS Entity with currency reference
    const entityResult = await client.query(
      `INSERT INTO ifrs_entities (name, "currencyId", "createdAt", "updatedAt")
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id`,
      [companyName, currencyId],
    );
    const entityId = entityResult.rows[0].id;

    // Update currency with entityId
    await client.query(
      `UPDATE ifrs_currencies SET "entityId" = $1 WHERE id = $2`,
      [entityId, currencyId],
    );

    // Create Company
    const companyResult = await client.query(
      `INSERT INTO companies ("entityId", name, "displayName", currency, "businessType", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'NGN', 'general', true, NOW(), NOW())
       RETURNING id`,
      [entityId, companyName, companyName],
    );
    const companyId = companyResult.rows[0].id;

    // Create Default Branch
    const branchResult = await client.query(
      `INSERT INTO branches ("companyId", name, code, timezone, "isActive", "isHeadOffice", "createdAt", "updatedAt")
       VALUES ($1, 'Head Office', 'HQ', 'Africa/Lagos', true, true, NOW(), NOW())
       RETURNING id`,
      [companyId],
    );
    const branchId = branchResult.rows[0].id;

    return { entityId, currencyId, companyId, branchId };
  }

  /**
   * Seed the tenant database with default data
   */
  private async seedTenantDatabase(
    client: PoolClient,
    baseRecords: { entityId: number; currencyId: number; companyId: number; branchId: number },
  ): Promise<void> {
    const { entityId, currencyId, companyId, branchId } = baseRecords;

    // Seed Permissions
    await this.seedPermissions(client);

    // Seed Roles and assign permissions
    await this.seedRoles(client);

    // Seed Account Categories
    const categoryMap = await this.seedAccountCategories(client, entityId);

    // Seed Chart of Accounts
    await this.seedChartOfAccounts(client, entityId, companyId, currencyId, categoryMap);

    // Seed VAT Rates
    await this.seedVatRates(client, entityId);

    // Seed WHT Rates
    await this.seedWhtRates(client, companyId);

    // Seed Default Currencies (USD, EUR, GBP, etc.)
    await this.seedCurrencies(client, entityId);

    // Seed Approval Flows
    await this.seedApprovalFlows(client, companyId);
  }

  /**
   * Create the admin user with Super Admin role.
   * AssetPro has no employees table — users are created directly.
   */
  private async createAdminUser(
    client: PoolClient,
    adminData: TenantAdminData,
    companyId: number,
  ): Promise<number> {
    const userResult = await client.query(
      `INSERT INTO users (
        email, name, password, "companyId", "userType",
        "createdAt", "updatedAt"
      )
       VALUES ($1, $2, $3, $4, 'ADMIN', NOW(), NOW())
       RETURNING id`,
      [adminData.email, adminData.name, adminData.passwordHash, companyId],
    );
    const userId = userResult.rows[0].id;

    const roleResult = await client.query(
      `SELECT id FROM roles WHERE name = 'Super Admin' AND "guardName" = 'web' LIMIT 1`,
    );
    if (roleResult.rows.length > 0) {
      const roleId = roleResult.rows[0].id;
      await client.query(
        `INSERT INTO user_roles ("userId", "roleId", "createdAt", "updatedAt")
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [userId, roleId],
      );
    }

    this.logger.log(`Admin user created: ${adminData.email} (User ID: ${userId})`);
    return userId;
  }

  // =========================================================================
  // SEEDING HELPER METHODS
  // =========================================================================

  private async seedPermissions(client: PoolClient): Promise<void> {
    // Full permissions list â€” keep in sync with prisma/seed.tenant.ts corePermissions
    const permissions = [
      // â”€â”€ Core â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access Core module', module: 'Core' },
      { name: 'access admin panel', module: 'Core' },
      { name: 'view all records', module: 'Core' },
      { name: 'manage all records', module: 'Core' },
      { name: 'view system logs', module: 'Core' },
      { name: 'manage system settings', module: 'Core' },
      { name: 'view audit-logs', module: 'Core' },
      { name: 'export audit-logs', module: 'Core' },
      { name: 'view backups', module: 'Core' },
      { name: 'create backups', module: 'Core' },
      { name: 'edit backups', module: 'Core' },
      { name: 'delete backups', module: 'Core' },
      { name: 'view branches', module: 'Core' },
      { name: 'create branches', module: 'Core' },
      { name: 'edit branches', module: 'Core' },
      { name: 'delete branches', module: 'Core' },
      { name: 'manage branches', module: 'Core' },
      { name: 'view companies', module: 'Core' },
      { name: 'create companies', module: 'Core' },
      { name: 'edit companies', module: 'Core' },
      { name: 'delete companies', module: 'Core' },
      { name: 'manage companies', module: 'Core' },
      { name: 'view roles', module: 'Core' },
      { name: 'create roles', module: 'Core' },
      { name: 'edit roles', module: 'Core' },
      { name: 'delete roles', module: 'Core' },
      { name: 'manage roles', module: 'Core' },
      { name: 'view users', module: 'Core' },
      { name: 'create users', module: 'Core' },
      { name: 'edit users', module: 'Core' },
      { name: 'delete users', module: 'Core' },
      { name: 'manage users', module: 'Core' },
      { name: 'access Accounts module', module: 'Accounts' },
      { name: 'view chart-of-accounts', module: 'Accounts' },
      { name: 'create chart-of-accounts', module: 'Accounts' },
      { name: 'edit chart-of-accounts', module: 'Accounts' },
      { name: 'delete chart-of-accounts', module: 'Accounts' },
      { name: 'view accounts', module: 'Accounts' },
      { name: 'create accounts', module: 'Accounts' },
      { name: 'edit accounts', module: 'Accounts' },
      { name: 'delete accounts', module: 'Accounts' },
      { name: 'view journal-entries', module: 'Accounts' },
      { name: 'create journal-entries', module: 'Accounts' },
      { name: 'edit journal-entries', module: 'Accounts' },
      { name: 'delete journal-entries', module: 'Accounts' },
      { name: 'view currencies', module: 'Accounts' },
      { name: 'create currencies', module: 'Accounts' },
      { name: 'edit currencies', module: 'Accounts' },
      { name: 'delete currencies', module: 'Accounts' },
      { name: 'view exchange-rates', module: 'Accounts' },
      { name: 'create exchange-rates', module: 'Accounts' },
      { name: 'edit exchange-rates', module: 'Accounts' },
      { name: 'delete exchange-rates', module: 'Accounts' },
      { name: 'view vats', module: 'Accounts' },
      { name: 'create vats', module: 'Accounts' },
      { name: 'edit vats', module: 'Accounts' },
      { name: 'delete vats', module: 'Accounts' },
      { name: 'view whts', module: 'Accounts' },
      { name: 'create whts', module: 'Accounts' },
      { name: 'edit whts', module: 'Accounts' },
      { name: 'delete whts', module: 'Accounts' },
      { name: 'view payment-methods', module: 'Accounts' },
      { name: 'create payment-methods', module: 'Accounts' },
      { name: 'edit payment-methods', module: 'Accounts' },
      { name: 'delete payment-methods', module: 'Accounts' },
      { name: 'view banks', module: 'Accounts' },
      { name: 'create banks', module: 'Accounts' },
      { name: 'edit banks', module: 'Accounts' },
      { name: 'delete banks', module: 'Accounts' },
      { name: 'view bank-reconciliations', module: 'Accounts' },
      { name: 'create bank-reconciliations', module: 'Accounts' },
      { name: 'edit bank-reconciliations', module: 'Accounts' },
      { name: 'delete bank-reconciliations', module: 'Accounts' },
      { name: 'view bank-transfers', module: 'Accounts' },
      { name: 'create bank-transfers', module: 'Accounts' },
      { name: 'edit bank-transfers', module: 'Accounts' },
      { name: 'delete bank-transfers', module: 'Accounts' },
      { name: 'approve bank-transfers', module: 'Accounts' },
      { name: 'post bank-transfers', module: 'Accounts' },
      { name: 'view expense-requests', module: 'Accounts' },
      { name: 'create expense-requests', module: 'Accounts' },
      { name: 'edit expense-requests', module: 'Accounts' },
      { name: 'approve expense-requests', module: 'Accounts' },
      { name: 'delete expense-requests', module: 'Accounts' },
      { name: 'import-overwrite accounts', module: 'Accounts' },
      // â”€â”€ Assets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access Assets module', module: 'Assets' },
      { name: 'view asset-classes', module: 'Assets' },
      { name: 'create asset-classes', module: 'Assets' },
      { name: 'edit asset-classes', module: 'Assets' },
      { name: 'delete asset-classes', module: 'Assets' },
      { name: 'view asset-categories', module: 'Assets' },
      { name: 'create asset-categories', module: 'Assets' },
      { name: 'edit asset-categories', module: 'Assets' },
      { name: 'delete asset-categories', module: 'Assets' },
      { name: 'view assets', module: 'Assets' },
      { name: 'create assets', module: 'Assets' },
      { name: 'edit assets', module: 'Assets' },
      { name: 'delete assets', module: 'Assets' },
    ];

    for (const perm of permissions) {
      await client.query(
        `INSERT INTO permissions (name, "guardName", module, "createdAt", "updatedAt")
         VALUES ($1, 'web', $2, NOW(), NOW())
         ON CONFLICT (name, "guardName") DO NOTHING`,
        [perm.name, perm.module],
      );
    }
  }

  private async seedRoles(client: PoolClient): Promise<void> {
    const roles = [
      { name: 'Super Admin', description: 'Full system access', permissions: 'all' },
      { name: 'System Admin', description: 'System administration access', permissions: ['access admin panel', 'view all records', 'manage all records', 'access Core module', 'view system logs', 'manage system settings'] },
      { name: 'hod', description: 'Head of Department', permissions: ['view all records'] },
      { name: 'audit', description: 'Internal Audit', permissions: ['view audit-logs', 'export audit-logs'] },
      { name: 'accountant', description: 'Accountant', permissions: ['access Accounts module'] },
      { name: 'management', description: 'Management', permissions: ['view all records'] },
      { name: 'asset_manager', description: 'Asset Manager', permissions: ['access Assets module'] },
    ];

    // Get all permissions
    const permResult = await client.query(`SELECT id, name FROM permissions`);
    const permMap = new Map(permResult.rows.map((r) => [r.name, r.id]));

    for (const roleData of roles) {
      // Create role
      const roleResult = await client.query(
        `INSERT INTO roles (name, "guardName", description, "createdAt", "updatedAt")
         VALUES ($1, 'web', $2, NOW(), NOW())
         ON CONFLICT (name, "guardName") DO UPDATE SET description = $2
         RETURNING id`,
        [roleData.name, roleData.description],
      );
      const roleId = roleResult.rows[0].id;

      // Assign permissions
      let permIds: number[] = [];
      if (roleData.permissions === 'all') {
        permIds = Array.from(permMap.values());
      } else {
        permIds = (roleData.permissions as string[])
          .map((p) => permMap.get(p))
          .filter((id): id is number => id !== undefined);
      }

      for (const permId of permIds) {
        await client.query(
          `INSERT INTO role_has_permissions ("roleId", "permissionId")
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [roleId, permId],
        );
      }
    }
  }

  private async seedAccountCategories(client: PoolClient, entityId: number): Promise<Map<string, number>> {
    const categories = [
      { name: 'Current Assets', categoryType: 'current_asset' },
      { name: 'Non-Current Assets', categoryType: 'non_current_asset' },
      { name: 'Bank', categoryType: 'bank' },
      { name: 'Cash', categoryType: 'current_asset' },
      { name: 'Receivable', categoryType: 'receivable' },
      { name: 'Inventory', categoryType: 'inventory' },
      { name: 'Fixed Assets', categoryType: 'non_current_asset' },
      { name: 'Prepayment', categoryType: 'current_asset' },
      { name: 'Contra Asset', categoryType: 'contra_asset' },
      { name: 'Current Liabilities', categoryType: 'current_liability' },
      { name: 'Non-Current Liabilities', categoryType: 'non_current_liability' },
      { name: 'Payable', categoryType: 'payable' },
      { name: 'Credit Card', categoryType: 'current_liability' },
      { name: 'Long Term Liability', categoryType: 'non_current_liability' },
      { name: 'VAT Payable', categoryType: 'payable' },
      { name: 'WHT Payable', categoryType: 'payable' },
      { name: 'Control', categoryType: 'control' },
      { name: 'Equity', categoryType: 'equity' },
      { name: 'Retained Earnings', categoryType: 'equity' },
      { name: 'Share Capital', categoryType: 'equity' },
      { name: 'Income', categoryType: 'operating_revenue' },
      { name: 'Sales', categoryType: 'operating_revenue' },
      { name: 'Service Revenue', categoryType: 'operating_revenue' },
      { name: 'Other Income', categoryType: 'non_operating_revenue' },
      { name: 'Discount Received', categoryType: 'non_operating_revenue' },
      { name: 'Expenses', categoryType: 'operating_expense' },
      { name: 'Direct Costs', categoryType: 'direct_expense' },
      { name: 'Cost of Goods Sold', categoryType: 'direct_expense' },
      { name: 'Operating Expenses', categoryType: 'operating_expense' },
      { name: 'Depreciation', categoryType: 'overhead_expense' },
      { name: 'Administrative Expenses', categoryType: 'operating_expense' },
      { name: 'Other Expenses', categoryType: 'other_expense' },
      { name: 'Reconciliation', categoryType: 'reconciliation' },
    ];

    const categoryMap = new Map<string, number>();

    for (const cat of categories) {
      const result = await client.query(
        `INSERT INTO ifrs_categories ("entityId", name, "categoryType", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [entityId, cat.name, cat.categoryType],
      );

      if (result.rows.length > 0) {
        categoryMap.set(cat.name, result.rows[0].id);
      } else {
        const existing = await client.query(
          `SELECT id FROM ifrs_categories WHERE "entityId" = $1 AND name = $2`,
          [entityId, cat.name],
        );
        if (existing.rows.length > 0) {
          categoryMap.set(cat.name, existing.rows[0].id);
        }
      }
    }

    return categoryMap;
  }

  private async seedChartOfAccounts(
    client: PoolClient,
    entityId: number,
    companyId: number,
    currencyId: number,
    categoryMap: Map<string, number>,
  ): Promise<void> {
    const accounts = [
      { code: '1000', name: 'Assets', accountType: 'asset', category: 'Current Assets', isPosting: false },
      { code: '1100', name: 'Current Assets', accountType: 'asset', category: 'Current Assets', isPosting: false },
      { code: '1110', name: 'Cash on Hand', accountType: 'asset', category: 'Cash', isPosting: true },
      { code: '1111', name: 'Petty Cash', accountType: 'asset', category: 'Cash', isPosting: true },
      { code: '1120', name: 'Bank Accounts', accountType: 'asset', category: 'Bank', isPosting: false },
      { code: '1121', name: 'Main Operating Account', accountType: 'asset', category: 'Bank', isPosting: true },
      { code: '1122', name: 'Payroll Account', accountType: 'asset', category: 'Bank', isPosting: true },
      { code: '1130', name: 'Accounts Receivable', accountType: 'asset', category: 'Receivable', isPosting: false },
      { code: '1131', name: 'Trade Receivables', accountType: 'asset', category: 'Receivable', isPosting: true },
      { code: '1132', name: 'Staff Advances', accountType: 'asset', category: 'Receivable', isPosting: true },
      { code: '1140', name: 'Inventory', accountType: 'asset', category: 'Inventory', isPosting: false },
      { code: '1141', name: 'Raw Materials', accountType: 'asset', category: 'Inventory', isPosting: true },
      { code: '1142', name: 'Work in Progress', accountType: 'asset', category: 'Inventory', isPosting: true },
      { code: '1143', name: 'Finished Goods', accountType: 'asset', category: 'Inventory', isPosting: true },
      { code: '1160', name: 'VAT Recoverable', accountType: 'asset', category: 'Current Assets', isPosting: true },
      { code: '1200', name: 'Non-Current Assets', accountType: 'asset', category: 'Non-Current Assets', isPosting: false },
      { code: '1210', name: 'Property, Plant & Equipment', accountType: 'asset', category: 'Fixed Assets', isPosting: false },
      { code: '1211', name: 'Land', accountType: 'asset', category: 'Fixed Assets', isPosting: true },
      { code: '1212', name: 'Buildings', accountType: 'asset', category: 'Fixed Assets', isPosting: true },
      { code: '1213', name: 'Motor Vehicles', accountType: 'asset', category: 'Fixed Assets', isPosting: true },
      { code: '1220', name: 'Accumulated Depreciation', accountType: 'asset', category: 'Fixed Assets', isPosting: false },
      { code: '2000', name: 'Liabilities', accountType: 'liability', category: 'Current Liabilities', isPosting: false },
      { code: '2100', name: 'Current Liabilities', accountType: 'liability', category: 'Current Liabilities', isPosting: false },
      { code: '2110', name: 'Accounts Payable', accountType: 'liability', category: 'Payable', isPosting: false },
      { code: '2111', name: 'Trade Payables', accountType: 'liability', category: 'Payable', isPosting: true },
      { code: '2121', name: 'VAT Payable', accountType: 'liability', category: 'VAT Payable', isPosting: true },
      { code: '2122', name: 'WHT Payable', accountType: 'liability', category: 'WHT Payable', isPosting: true },
      { code: '2131', name: 'Salaries Payable', accountType: 'liability', category: 'Current Liabilities', isPosting: true },
      { code: '2140', name: 'Customer Deposits', accountType: 'liability', category: 'Current Liabilities', isPosting: true },
      { code: '3000', name: 'Equity', accountType: 'equity', category: 'Equity', isPosting: false },
      { code: '3100', name: 'Share Capital', accountType: 'equity', category: 'Share Capital', isPosting: false },
      { code: '3110', name: 'Ordinary Share Capital', accountType: 'equity', category: 'Share Capital', isPosting: true },
      { code: '3200', name: 'Retained Earnings', accountType: 'equity', category: 'Retained Earnings', isPosting: false },
      { code: '3210', name: 'Current Year Earnings', accountType: 'equity', category: 'Retained Earnings', isPosting: true },
      { code: '4000', name: 'Revenue', accountType: 'revenue', category: 'Income', isPosting: false },
      { code: '4100', name: 'Sales Revenue', accountType: 'revenue', category: 'Sales', isPosting: false },
      { code: '4110', name: 'Product Sales', accountType: 'revenue', category: 'Sales', isPosting: true },
      { code: '4120', name: 'Service Sales', accountType: 'revenue', category: 'Service Revenue', isPosting: true },
      { code: '5000', name: 'Cost of Sales', accountType: 'expense', category: 'Cost of Goods Sold', isPosting: false },
      { code: '5100', name: 'Direct Materials', accountType: 'expense', category: 'Cost of Goods Sold', isPosting: true },
      { code: '6000', name: 'Operating Expenses', accountType: 'expense', category: 'Operating Expenses', isPosting: false },
      { code: '6110', name: 'Salaries & Wages', accountType: 'expense', category: 'Operating Expenses', isPosting: true },
      { code: '6210', name: 'Rent Expense', accountType: 'expense', category: 'Administrative Expenses', isPosting: true },
      { code: '6220', name: 'Utilities', accountType: 'expense', category: 'Administrative Expenses', isPosting: true },
      { code: '6280', name: 'Bank Charges', accountType: 'expense', category: 'Administrative Expenses', isPosting: true },
      { code: '6430', name: 'Depreciation - Vehicles', accountType: 'expense', category: 'Depreciation', isPosting: true },
    ];

    for (const acct of accounts) {
      const categoryId = categoryMap.get(acct.category);
      await client.query(
        `INSERT INTO ifrs_accounts ("entityId", "companyId", "categoryId", "currencyId", code, name, "accountType", "isPosting", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [entityId, companyId, categoryId, currencyId, acct.code, acct.name, acct.accountType, acct.isPosting],
      );
    }
  }

  private async seedVatRates(client: PoolClient, entityId: number): Promise<void> {
    const vatRates = [
      { name: 'Standard Rate', code: 'STD', rate: 7.5 },
      { name: 'Zero Rated', code: 'ZERO', rate: 0 },
      { name: 'Exempt', code: 'EXEMPT', rate: 0 },
      { name: 'Out of Scope', code: 'OOS', rate: 0 },
    ];

    for (const vat of vatRates) {
      await client.query(
        `INSERT INTO ifrs_vats ("entityId", name, code, rate, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [entityId, vat.name, vat.code, vat.rate],
      );
    }

    // Link Standard Rate to both GL accounts: VAT Payable (output) and VAT Recoverable (input)
    await client.query(
      `UPDATE ifrs_vats v
       SET "accountId" = (
         SELECT id FROM ifrs_accounts WHERE "entityId" = $1 AND code = '2121' AND "deletedAt" IS NULL LIMIT 1
       ),
       "inputAccountId" = (
         SELECT id FROM ifrs_accounts WHERE "entityId" = $1 AND code = '1160' AND "deletedAt" IS NULL LIMIT 1
       )
       WHERE v."entityId" = $1 AND v.code = 'STD' AND v."accountId" IS NULL`,
      [entityId],
    );
  }

  private async seedWhtRates(client: PoolClient, companyId: number): Promise<void> {
    const whtRates = [
      { name: 'Dividends - Companies', code: 'DIV_CO', rate: 10.0 },
      { name: 'Interest - Companies', code: 'INT_CO', rate: 10.0 },
      { name: 'Royalties - Companies', code: 'ROY_CO', rate: 10.0 },
      { name: 'Rent - Companies', code: 'RENT_CO', rate: 10.0 },
      { name: 'Contract - Companies', code: 'CONT_CO', rate: 5.0 },
      { name: 'Dividends - Individuals', code: 'DIV_IND', rate: 10.0 },
      { name: 'Interest - Individuals', code: 'INT_IND', rate: 10.0 },
      { name: 'Contract - Individuals', code: 'CONT_IND', rate: 5.0 },
    ];

    for (const wht of whtRates) {
      await client.query(
        `INSERT INTO withholding_taxes ("companyId", name, code, rate, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [companyId, wht.name, wht.code, wht.rate],
      );
    }
  }

  /**
   * Seed default currencies (NGN is created in base records, this adds common international currencies)
   */
  private async seedCurrencies(client: PoolClient, entityId: number): Promise<void> {
    const currencies = [
      { code: 'USD', name: 'United States Dollar', symbol: '$', decimals: 2 },
      { code: 'EUR', name: 'Euro', symbol: 'â‚¬', decimals: 2 },
      { code: 'GBP', name: 'British Pound Sterling', symbol: 'Â£', decimals: 2 },
      { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GHâ‚µ', decimals: 2 },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2 },
      { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', decimals: 2 },
      { code: 'XOF', name: 'CFA Franc (BCEAO)', symbol: 'CFA', decimals: 0 },
      { code: 'XAF', name: 'CFA Franc (BEAC)', symbol: 'FCFA', decimals: 0 },
      { code: 'CNY', name: 'Chinese Yuan', symbol: 'Â¥', decimals: 2 },
      { code: 'JPY', name: 'Japanese Yen', symbol: 'Â¥', decimals: 0 },
      { code: 'INR', name: 'Indian Rupee', symbol: 'â‚¹', decimals: 2 },
      { code: 'AED', name: 'UAE Dirham', symbol: 'Ø¯.Ø¥', decimals: 2 },
      { code: 'SAR', name: 'Saudi Riyal', symbol: 'ï·¼', decimals: 2 },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2 },
      { code: 'EGP', name: 'Egyptian Pound', symbol: 'EÂ£', decimals: 2 },
      { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', decimals: 2 },
      { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', decimals: 0 },
    ];

    for (const c of currencies) {
      await client.query(
        `INSERT INTO ifrs_currencies (code, name, symbol, "decimalPlaces", "entityId", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [c.code, c.name, c.symbol, c.decimals, entityId],
      );
    }
  }

  private async seedApprovalFlows(client: PoolClient, companyId: number): Promise<void> {
    // Fetch all needed roles in one query
    const roleResult = await client.query(
      `SELECT id, name FROM roles WHERE name IN ('hod','audit','accountant','management') AND "guardName" = 'web'`,
    );
    const roleMap: Record<string, number> = {};
    for (const r of roleResult.rows) roleMap[r.name] = r.id;
    if (!roleMap['hod']) return; // no roles seeded yet

    // Expense Request Approval Flow â€” 5 configurable steps
    const expenseFlowResult = await client.query(
      `INSERT INTO process_approval_flows ("companyId", name, "approvableType", "entitySlug", description, "isActive", "createdAt", "updatedAt")
       VALUES ($1, 'Expense Request Approval', 'expense_requests', 'accounts.expense-requests', 'Configurable approval workflow for expense requests', true, NOW(), NOW())
       ON CONFLICT DO NOTHING RETURNING id`,
      [companyId],
    );

    if (expenseFlowResult.rows.length > 0) {
      const flowId = expenseFlowResult.rows[0].id;
      const expenseSteps: Array<{ name: string; order: number; role: string; isLocked?: boolean; isFinalStep?: boolean; stepType?: string }> = [
        { name: 'HOD Approval', order: 1, role: 'hod' },
        { name: 'Audit Review', order: 2, role: 'audit' },
        { name: 'Accountant and Finance Coding/Approval', order: 3, role: 'accountant', isLocked: true, stepType: 'accountant' },
        { name: 'Management Approval', order: 4, role: 'management' },
        { name: 'Payment Processing', order: 5, role: 'accountant', isLocked: true, isFinalStep: true, stepType: 'payment' },
      ];
      for (const step of expenseSteps) {
        const roleId = roleMap[step.role];
        if (!roleId) continue;
        await client.query(
          `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isLocked", "isFinalStep", "stepType", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'APPROVE', true, true, $6, $7, $8, NOW(), NOW()) ON CONFLICT DO NOTHING`,
          [flowId, companyId, roleId, step.name, step.order, step.isLocked ?? false, step.isFinalStep ?? false, step.stepType ?? 'approve'],
        );
      }
    }
    // Define remaining flows: [name, approvableType, entitySlug, steps[]]
    const remainingFlows: Array<{
      name: string;
      approvableType: string;
      entitySlug: string;
      steps: Array<{ name: string; order: number; role: string; isLocked?: boolean; isFinalStep?: boolean }>;
    }> = [
      {
        name: 'Journal Entry Approval',
        approvableType: 'journal_entries',
        entitySlug: 'accounts.journal-entries',
        steps: [
          { name: 'Accountant Review', order: 1, role: 'accountant' },
          { name: 'Audit Review', order: 2, role: 'audit' },
        ],
      },
      {
        name: 'Bank Transfer Approval',
        approvableType: 'bank_transfers',
        entitySlug: 'accounts.bank-transfers',
        steps: [
          { name: 'Internal Audit Check', order: 1, role: 'audit' },
          { name: 'Accountant Review', order: 2, role: 'accountant' },
          { name: 'General Manager Approval', order: 3, role: 'management' },
          { name: 'Management Approval', order: 4, role: 'management' },
          { name: 'Transfer Processing', order: 5, role: 'accountant', isLocked: true, isFinalStep: true },
        ],
      },
    ];
    for (const flow of remainingFlows) {
      const flowResult = await client.query(
        `INSERT INTO process_approval_flows ("companyId", name, "approvableType", "entitySlug", description, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
         ON CONFLICT DO NOTHING RETURNING id`,
        [companyId, flow.name, flow.approvableType, flow.entitySlug, `Configurable approval workflow for ${flow.approvableType.replace(/_/g, ' ')}`],
      );

      if (flowResult.rows.length > 0) {
        const flowId = flowResult.rows[0].id;
        for (const step of flow.steps) {
          const roleId = roleMap[step.role];
          if (!roleId) {
            this.logger.warn(`Role '${step.role}' missing for company ${companyId}; skipping step '${step.name}' in flow '${flow.name}'`);
            continue;
          }
          await client.query(
            `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isLocked", "isFinalStep", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, 'APPROVE', true, true, $6, $7, NOW(), NOW()) ON CONFLICT DO NOTHING`,
            [flowId, companyId, roleId, step.name, step.order, step.isLocked ?? false, step.isFinalStep ?? false],
          );
        }
      }
    }
  }
  /**
   * Run a single query in a specific tenant schema by name.
   * Used by public (no-auth) endpoints that receive the tenantSlug from the URL.
   */
  async queryInSchema<T = Record<string, unknown>>(
    schema: string,
    sql: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    const sanitized = schema.replace(/[^a-z0-9_]/gi, '');
    const client = await this.pool.connect();
    try {
      await client.query(`SET search_path TO "${sanitized}"`);
      const result = await client.query(sql, params);
      return (result.rows[0] ?? null) as T | null;
    } finally {
      await client.query(`SET search_path TO "public"`);
      client.release();
    }
  }

  /**
   * Seed default fund products from the D'Namaz Capital term sheet.
   * These are seeded per-tenant so each client can edit/customise their own copy.
   * Uses ON CONFLICT (fundCode) DO NOTHING â€” safe to re-run.
   */

  /**
   * Seed default Document Management System categories
   */

  /**
   * Helper to append schema to database URL
   */
  private appendSchemaToUrl(baseUrl: string, schema: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schema);
    return url.toString();
  }
}
