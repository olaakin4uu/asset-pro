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

    // Seed Units of Measure & Conversions
    await this.seedUnitsOfMeasure(client, companyId);

    // Seed Default Warehouse
    await this.seedWarehouse(client, companyId, branchId);

    // Seed Walk-in Customer for POS
    await this.seedWalkInCustomer(client, companyId, branchId);

    // Seed Loan Types
    await this.seedLoanTypes(client, companyId);

    // Seed Approval Flows
    await this.seedApprovalFlows(client, companyId);

    // Seed Fleet Vehicle Service Types
    await this.seedFleetVehicleServiceTypes(client, companyId);

    // Seed Default Fund Products (D'Namaz Capital term-sheet funds)
    await this.seedFundProducts(client, companyId);
    await this.seedCreditFacilityTypes(client, companyId);

    // Seed Document Management System default categories
    await this.seedDocumentCategories(client, companyId);
  }

  /**
   * Create the admin user with Super Admin role (Unified Login Design)
   * Creates: Employee -> User linked via employeeId
   * Employee.isUser = true (counts against plan user limit)
   */
  private async createAdminUser(
    client: PoolClient,
    adminData: TenantAdminData,
    companyId: number,
  ): Promise<number> {
    // Step 1: Create Employee record first
    const nameParts = adminData.name.split(' ');
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    const employeeResult = await client.query(
      `INSERT INTO employees (
        "companyId", "employeeCode", "firstName", "lastName",
        "personalEmail", "phone", "employmentStatus", "employmentType",
        "isActive", "isUser", "createdAt", "updatedAt"
      )
       VALUES ($1, 'EMP001', $2, $3, $4, $5, 'ACTIVE', 'FULL_TIME', true, true, NOW(), NOW())
       RETURNING id`,
      [companyId, firstName, lastName, adminData.email, adminData.phone || null],
    );
    const employeeId = employeeResult.rows[0].id;

    // Step 2: Create User record linked to Employee via employeeId
    const userResult = await client.query(
      `INSERT INTO users (
        email, name, password, "companyId", "userType", "employeeId",
        "createdAt", "updatedAt"
      )
       VALUES ($1, $2, $3, $4, 'EMPLOYEE', $5, NOW(), NOW())
       RETURNING id`,
      [adminData.email, adminData.name, adminData.passwordHash, companyId, employeeId],
    );
    const userId = userResult.rows[0].id;

    // Step 3: Update Employee with legacy userId reference (for backwards compatibility)
    await client.query(
      `UPDATE employees SET "userId" = $1 WHERE id = $2`,
      [userId, employeeId],
    );

    // Step 4: Assign Super Admin role to user
    const roleResult = await client.query(
      `SELECT id FROM roles WHERE name = 'Super Admin' AND "guardName" = 'web' LIMIT 1`,
    );

    if (roleResult.rows.length > 0) {
      const roleId = roleResult.rows[0].id;

      // Assign Super Admin role to user (using new user_roles table)
      await client.query(
        `INSERT INTO user_roles ("userId", "roleId", "createdAt", "updatedAt")
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [userId, roleId],
      );
    }

    this.logger.log(`Admin user created: ${adminData.email} (Employee ID: ${employeeId}, User ID: ${userId})`);

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
      { name: 'view customers', module: 'Core' },
      { name: 'create customers', module: 'Core' },
      { name: 'edit customers', module: 'Core' },
      { name: 'delete customers', module: 'Core' },
      { name: 'view suppliers', module: 'Core' },
      { name: 'create suppliers', module: 'Core' },
      { name: 'edit suppliers', module: 'Core' },
      { name: 'delete suppliers', module: 'Core' },
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
      { name: 'import accounts', module: 'Core' },
      { name: 'import-overwrite accounts', module: 'Core' },
      { name: 'import users', module: 'Core' },
      { name: 'import-overwrite users', module: 'Core' },
      // â”€â”€ Help â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access Help module', module: 'Help' },
      { name: 'view help-articles', module: 'Help' },
      { name: 'create help-articles', module: 'Help' },
      { name: 'edit help-articles', module: 'Help' },
      { name: 'delete help-articles', module: 'Help' },
      { name: 'view help-categories', module: 'Help' },
      { name: 'create help-categories', module: 'Help' },
      { name: 'edit help-categories', module: 'Help' },
      { name: 'delete help-categories', module: 'Help' },
      // â”€â”€ Accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      // â”€â”€ Budget â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access Budget module', module: 'Budget' },
      { name: 'view budget-settings', module: 'Budget' },
      { name: 'create budget-settings', module: 'Budget' },
      { name: 'edit budget-settings', module: 'Budget' },
      { name: 'delete budget-settings', module: 'Budget' },
      { name: 'view budgets', module: 'Budget' },
      { name: 'create budgets', module: 'Budget' },
      { name: 'edit budgets', module: 'Budget' },
      { name: 'delete budgets', module: 'Budget' },
      { name: 'view budget-lines', module: 'Budget' },
      { name: 'create budget-lines', module: 'Budget' },
      { name: 'edit budget-lines', module: 'Budget' },
      { name: 'delete budget-lines', module: 'Budget' },
      { name: 'view budget-period-allocations', module: 'Budget' },
      { name: 'create budget-period-allocations', module: 'Budget' },
      { name: 'edit budget-period-allocations', module: 'Budget' },
      { name: 'delete budget-period-allocations', module: 'Budget' },
      { name: 'view budget-transactions', module: 'Budget' },
      { name: 'create budget-transactions', module: 'Budget' },
      { name: 'edit budget-transactions', module: 'Budget' },
      { name: 'delete budget-transactions', module: 'Budget' },
      { name: 'view budget-transfers', module: 'Budget' },
      { name: 'create budget-transfers', module: 'Budget' },
      { name: 'edit budget-transfers', module: 'Budget' },
      { name: 'delete budget-transfers', module: 'Budget' },
      { name: 'view budget-overrides', module: 'Budget' },
      { name: 'create budget-overrides', module: 'Budget' },
      { name: 'edit budget-overrides', module: 'Budget' },
      { name: 'delete budget-overrides', module: 'Budget' },
      { name: 'view budget-control-exceptions', module: 'Budget' },
      { name: 'create budget-control-exceptions', module: 'Budget' },
      { name: 'edit budget-control-exceptions', module: 'Budget' },
      { name: 'delete budget-control-exceptions', module: 'Budget' },
      // â”€â”€ Payables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access Payables module', module: 'Payables' },
      { name: 'view payments', module: 'Payables' },
      { name: 'create payments', module: 'Payables' },
      { name: 'edit payments', module: 'Payables' },
      { name: 'delete payments', module: 'Payables' },
      { name: 'approve payments', module: 'Payables' },
      { name: 'void payments', module: 'Payables' },
      { name: 'post payments', module: 'Payables' },
      { name: 'view payment-allocations', module: 'Payables' },
      { name: 'create payment-allocations', module: 'Payables' },
      { name: 'edit payment-allocations', module: 'Payables' },
      { name: 'delete payment-allocations', module: 'Payables' },
      { name: 'view payment-payment-methods', module: 'Payables' },
      { name: 'create payment-payment-methods', module: 'Payables' },
      { name: 'edit payment-payment-methods', module: 'Payables' },
      { name: 'delete payment-payment-methods', module: 'Payables' },
      // â”€â”€ Receivables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access Receivables module', module: 'Receivables' },
      { name: 'view receipts', module: 'Receivables' },
      { name: 'create receipts', module: 'Receivables' },
      { name: 'edit receipts', module: 'Receivables' },
      { name: 'delete receipts', module: 'Receivables' },
      { name: 'approve receipts', module: 'Receivables' },
      { name: 'void receipts', module: 'Receivables' },
      { name: 'post receipts', module: 'Receivables' },
      { name: 'allocate receipts', module: 'Receivables' },
      { name: 'view credit-notes', module: 'Receivables' },
      { name: 'create credit-notes', module: 'Receivables' },
      { name: 'edit credit-notes', module: 'Receivables' },
      { name: 'delete credit-notes', module: 'Receivables' },
      { name: 'approve credit-notes', module: 'Receivables' },
      { name: 'void credit-notes', module: 'Receivables' },
      { name: 'post credit-notes', module: 'Receivables' },
      { name: 'view customer-deposits', module: 'Receivables' },
      { name: 'create customer-deposits', module: 'Receivables' },
      { name: 'edit customer-deposits', module: 'Receivables' },
      { name: 'delete customer-deposits', module: 'Receivables' },
      { name: 'approve customer-deposits', module: 'Receivables' },
      { name: 'void customer-deposits', module: 'Receivables' },
      { name: 'view receivables-reports', module: 'Receivables' },
      // â”€â”€ Inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access Inventory module', module: 'Inventory' },
      { name: 'view unit-of-measures', module: 'Inventory' },
      { name: 'create unit-of-measures', module: 'Inventory' },
      { name: 'edit unit-of-measures', module: 'Inventory' },
      { name: 'delete unit-of-measures', module: 'Inventory' },
      { name: 'view unit-conversions', module: 'Inventory' },
      { name: 'create unit-conversions', module: 'Inventory' },
      { name: 'edit unit-conversions', module: 'Inventory' },
      { name: 'delete unit-conversions', module: 'Inventory' },
      { name: 'view item-categories', module: 'Inventory' },
      { name: 'create item-categories', module: 'Inventory' },
      { name: 'edit item-categories', module: 'Inventory' },
      { name: 'delete item-categories', module: 'Inventory' },
      { name: 'view brands', module: 'Inventory' },
      { name: 'create brands', module: 'Inventory' },
      { name: 'edit brands', module: 'Inventory' },
      { name: 'delete brands', module: 'Inventory' },
      { name: 'view warehouses', module: 'Inventory' },
      { name: 'create warehouses', module: 'Inventory' },
      { name: 'edit warehouses', module: 'Inventory' },
      { name: 'delete warehouses', module: 'Inventory' },
      { name: 'view items', module: 'Inventory' },
      { name: 'create items', module: 'Inventory' },
      { name: 'edit items', module: 'Inventory' },
      { name: 'delete items', module: 'Inventory' },
      { name: 'view item-beginning-balances', module: 'Inventory' },
      { name: 'create item-beginning-balances', module: 'Inventory' },
      { name: 'edit item-beginning-balances', module: 'Inventory' },
      { name: 'delete item-beginning-balances', module: 'Inventory' },
      { name: 'view stock-batches', module: 'Inventory' },
      { name: 'create stock-batches', module: 'Inventory' },
      { name: 'edit stock-batches', module: 'Inventory' },
      { name: 'delete stock-batches', module: 'Inventory' },
      { name: 'view item-barcodes', module: 'Inventory' },
      { name: 'create item-barcodes', module: 'Inventory' },
      { name: 'edit item-barcodes', module: 'Inventory' },
      { name: 'delete item-barcodes', module: 'Inventory' },
      { name: 'view stock-levels', module: 'Inventory' },
      { name: 'create stock-levels', module: 'Inventory' },
      { name: 'edit stock-levels', module: 'Inventory' },
      { name: 'delete stock-levels', module: 'Inventory' },
      { name: 'view stock-movements', module: 'Inventory' },
      { name: 'create stock-movements', module: 'Inventory' },
      { name: 'edit stock-movements', module: 'Inventory' },
      { name: 'delete stock-movements', module: 'Inventory' },
      { name: 'submit stock-movements', module: 'Inventory' },
      { name: 'approve stock-movements', module: 'Inventory' },
      { name: 'reject stock-movements', module: 'Inventory' },
      { name: 'return stock-movements', module: 'Inventory' },
      { name: 'view item-price-groups', module: 'Inventory' },
      { name: 'create item-price-groups', module: 'Inventory' },
      { name: 'edit item-price-groups', module: 'Inventory' },
      { name: 'delete item-price-groups', module: 'Inventory' },
      { name: 'view item-prices', module: 'Inventory' },
      { name: 'create item-prices', module: 'Inventory' },
      { name: 'edit item-prices', module: 'Inventory' },
      { name: 'delete item-prices', module: 'Inventory' },
      { name: 'import items', module: 'Inventory' },
      { name: 'import-overwrite items', module: 'Inventory' },
      { name: 'import categories', module: 'Inventory' },
      { name: 'import-overwrite categories', module: 'Inventory' },
      // â”€â”€ Sales â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access Sales module', module: 'Sales' },
      { name: 'view sales-orders', module: 'Sales' },
      { name: 'create sales-orders', module: 'Sales' },
      { name: 'edit sales-orders', module: 'Sales' },
      { name: 'delete sales-orders', module: 'Sales' },
      { name: 'view sales-order-lines', module: 'Sales' },
      { name: 'create sales-order-lines', module: 'Sales' },
      { name: 'edit sales-order-lines', module: 'Sales' },
      { name: 'delete sales-order-lines', module: 'Sales' },
      { name: 'view loading-orders', module: 'Sales' },
      { name: 'create loading-orders', module: 'Sales' },
      { name: 'edit loading-orders', module: 'Sales' },
      { name: 'delete loading-orders', module: 'Sales' },
      { name: 'view sales-deliveries', module: 'Sales' },
      { name: 'create sales-deliveries', module: 'Sales' },
      { name: 'edit sales-deliveries', module: 'Sales' },
      { name: 'delete sales-deliveries', module: 'Sales' },
      { name: 'view sales-invoices', module: 'Sales' },
      { name: 'create sales-invoices', module: 'Sales' },
      { name: 'edit sales-invoices', module: 'Sales' },
      { name: 'delete sales-invoices', module: 'Sales' },
      { name: 'import customers', module: 'Sales' },
      { name: 'import-overwrite customers', module: 'Sales' },
      // â”€â”€ Purchase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access Purchase module', module: 'Purchase' },
      { name: 'view purchase-settings', module: 'Purchase' },
      { name: 'edit purchase-settings', module: 'Purchase' },
      { name: 'view purchase-requisitions', module: 'Purchase' },
      { name: 'create purchase-requisitions', module: 'Purchase' },
      { name: 'edit purchase-requisitions', module: 'Purchase' },
      { name: 'delete purchase-requisitions', module: 'Purchase' },
      { name: 'submit purchase-requisitions', module: 'Purchase' },
      { name: 'approve purchase-requisitions', module: 'Purchase' },
      { name: 'reject purchase-requisitions', module: 'Purchase' },
      { name: 'return purchase-requisitions', module: 'Purchase' },
      { name: 'view request-for-quotations', module: 'Purchase' },
      { name: 'create request-for-quotations', module: 'Purchase' },
      { name: 'edit request-for-quotations', module: 'Purchase' },
      { name: 'delete request-for-quotations', module: 'Purchase' },
      { name: 'view supplier-quotations', module: 'Purchase' },
      { name: 'create supplier-quotations', module: 'Purchase' },
      { name: 'edit supplier-quotations', module: 'Purchase' },
      { name: 'delete supplier-quotations', module: 'Purchase' },
      { name: 'view purchase-orders', module: 'Purchase' },
      { name: 'create purchase-orders', module: 'Purchase' },
      { name: 'edit purchase-orders', module: 'Purchase' },
      { name: 'delete purchase-orders', module: 'Purchase' },
      { name: 'submit purchase-orders', module: 'Purchase' },
      { name: 'approve purchase-orders', module: 'Purchase' },
      { name: 'reject purchase-orders', module: 'Purchase' },
      { name: 'return purchase-orders', module: 'Purchase' },
      { name: 'view goods-received-notes', module: 'Purchase' },
      { name: 'create goods-received-notes', module: 'Purchase' },
      { name: 'edit goods-received-notes', module: 'Purchase' },
      { name: 'delete goods-received-notes', module: 'Purchase' },
      { name: 'view purchase-invoices', module: 'Purchase' },
      { name: 'create purchase-invoices', module: 'Purchase' },
      { name: 'edit purchase-invoices', module: 'Purchase' },
      { name: 'delete purchase-invoices', module: 'Purchase' },
      { name: 'submit purchase-invoices', module: 'Purchase' },
      { name: 'approve purchase-invoices', module: 'Purchase' },
      { name: 'reject purchase-invoices', module: 'Purchase' },
      { name: 'view purchase-returns', module: 'Purchase' },
      { name: 'create purchase-returns', module: 'Purchase' },
      { name: 'edit purchase-returns', module: 'Purchase' },
      { name: 'delete purchase-returns', module: 'Purchase' },
      { name: 'approve purchase-returns', module: 'Purchase' },
      { name: 'view purchase-inspections', module: 'Purchase' },
      { name: 'create purchase-inspections', module: 'Purchase' },
      { name: 'edit purchase-inspections', module: 'Purchase' },
      { name: 'delete purchase-inspections', module: 'Purchase' },
      { name: 'approve purchase-inspections', module: 'Purchase' },
      { name: 'view service-inspections', module: 'Purchase' },
      { name: 'create service-inspections', module: 'Purchase' },
      { name: 'edit service-inspections', module: 'Purchase' },
      { name: 'delete service-inspections', module: 'Purchase' },
      { name: 'approve service-inspections', module: 'Purchase' },
      { name: 'view service-orders', module: 'Purchase' },
      { name: 'create service-orders', module: 'Purchase' },
      { name: 'edit service-orders', module: 'Purchase' },
      { name: 'delete service-orders', module: 'Purchase' },
      { name: 'approve service-orders', module: 'Purchase' },
      { name: 'view service-categories', module: 'Purchase' },
      { name: 'create service-categories', module: 'Purchase' },
      { name: 'edit service-categories', module: 'Purchase' },
      { name: 'delete service-categories', module: 'Purchase' },
      { name: 'view supplier-payments', module: 'Purchase' },
      { name: 'create supplier-payments', module: 'Purchase' },
      { name: 'edit supplier-payments', module: 'Purchase' },
      { name: 'delete supplier-payments', module: 'Purchase' },
      { name: 'approve supplier-payments', module: 'Purchase' },
      { name: 'view supplier-performance', module: 'Purchase' },
      { name: 'view certificates-of-completion', module: 'Purchase' },
      { name: 'create certificates-of-completion', module: 'Purchase' },
      { name: 'edit certificates-of-completion', module: 'Purchase' },
      { name: 'delete certificates-of-completion', module: 'Purchase' },
      { name: 'view po-matching', module: 'Purchase' },
      { name: 'create po-matching', module: 'Purchase' },
      { name: 'view purchase-reports', module: 'Purchase' },
      { name: 'view import-orders', module: 'Purchase' },
      { name: 'create import-orders', module: 'Purchase' },
      { name: 'edit import-orders', module: 'Purchase' },
      { name: 'delete import-orders', module: 'Purchase' },
      { name: 'view import-shipments', module: 'Purchase' },
      { name: 'create import-shipments', module: 'Purchase' },
      { name: 'edit import-shipments', module: 'Purchase' },
      { name: 'delete import-shipments', module: 'Purchase' },
      { name: 'view import-documents', module: 'Purchase' },
      { name: 'create import-documents', module: 'Purchase' },
      { name: 'view import-clearances', module: 'Purchase' },
      { name: 'create import-clearances', module: 'Purchase' },
      { name: 'edit import-clearances', module: 'Purchase' },
      { name: 'view import-duties', module: 'Purchase' },
      { name: 'create import-duties', module: 'Purchase' },
      { name: 'edit import-duties', module: 'Purchase' },
      { name: 'view import-payments', module: 'Purchase' },
      { name: 'create import-payments', module: 'Purchase' },
      { name: 'edit import-payments', module: 'Purchase' },
      { name: 'view import-landed-costs', module: 'Purchase' },
      { name: 'create import-landed-costs', module: 'Purchase' },
      { name: 'edit import-landed-costs', module: 'Purchase' },
      { name: 'view import-lc', module: 'Purchase' },
      { name: 'create import-lc', module: 'Purchase' },
      { name: 'edit import-lc', module: 'Purchase' },
      { name: 'view import-form-m', module: 'Purchase' },
      { name: 'create import-form-m', module: 'Purchase' },
      { name: 'edit import-form-m', module: 'Purchase' },
      { name: 'view import-certifications', module: 'Purchase' },
      { name: 'create import-certifications', module: 'Purchase' },
      { name: 'view branch-inspection-officers', module: 'Purchase' },
      { name: 'create branch-inspection-officers', module: 'Purchase' },
      { name: 'edit branch-inspection-officers', module: 'Purchase' },
      { name: 'delete branch-inspection-officers', module: 'Purchase' },
      { name: 'import suppliers', module: 'Purchase' },
      { name: 'import-overwrite suppliers', module: 'Purchase' },
      // â”€â”€ HRPayroll â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access HRPayroll module', module: 'HRPayroll' },
      { name: 'view appointments', module: 'HRPayroll' },
      { name: 'create appointments', module: 'HRPayroll' },
      { name: 'edit appointments', module: 'HRPayroll' },
      { name: 'delete appointments', module: 'HRPayroll' },
      { name: 'approve appointments', module: 'HRPayroll' },
      { name: 'view cadres', module: 'HRPayroll' },
      { name: 'create cadres', module: 'HRPayroll' },
      { name: 'edit cadres', module: 'HRPayroll' },
      { name: 'delete cadres', module: 'HRPayroll' },
      { name: 'view departments', module: 'HRPayroll' },
      { name: 'create departments', module: 'HRPayroll' },
      { name: 'edit departments', module: 'HRPayroll' },
      { name: 'delete departments', module: 'HRPayroll' },
      { name: 'view employees', module: 'HRPayroll' },
      { name: 'create employees', module: 'HRPayroll' },
      { name: 'edit employees', module: 'HRPayroll' },
      { name: 'delete employees', module: 'HRPayroll' },
      { name: 'approve employees', module: 'HRPayroll' },
      { name: 'view grade-levels', module: 'HRPayroll' },
      { name: 'create grade-levels', module: 'HRPayroll' },
      { name: 'edit grade-levels', module: 'HRPayroll' },
      { name: 'delete grade-levels', module: 'HRPayroll' },
      { name: 'view leaves', module: 'HRPayroll' },
      { name: 'create leaves', module: 'HRPayroll' },
      { name: 'edit leaves', module: 'HRPayroll' },
      { name: 'delete leaves', module: 'HRPayroll' },
      { name: 'approve leaves', module: 'HRPayroll' },
      { name: 'view loans', module: 'HRPayroll' },
      { name: 'create loans', module: 'HRPayroll' },
      { name: 'edit loans', module: 'HRPayroll' },
      { name: 'delete loans', module: 'HRPayroll' },
      { name: 'approve loans', module: 'HRPayroll' },
      { name: 'view loan-types', module: 'HRPayroll' },
      { name: 'create loan-types', module: 'HRPayroll' },
      { name: 'edit loan-types', module: 'HRPayroll' },
      { name: 'delete loan-types', module: 'HRPayroll' },
      { name: 'view payrolls', module: 'HRPayroll' },
      { name: 'create payrolls', module: 'HRPayroll' },
      { name: 'edit payrolls', module: 'HRPayroll' },
      { name: 'delete payrolls', module: 'HRPayroll' },
      { name: 'view payroll-components', module: 'HRPayroll' },
      { name: 'create payroll-components', module: 'HRPayroll' },
      { name: 'edit payroll-components', module: 'HRPayroll' },
      { name: 'delete payroll-components', module: 'HRPayroll' },
      { name: 'view positions', module: 'HRPayroll' },
      { name: 'create positions', module: 'HRPayroll' },
      { name: 'edit positions', module: 'HRPayroll' },
      { name: 'delete positions', module: 'HRPayroll' },
      { name: 'view salary-structures', module: 'HRPayroll' },
      { name: 'create salary-structures', module: 'HRPayroll' },
      { name: 'edit salary-structures', module: 'HRPayroll' },
      { name: 'delete salary-structures', module: 'HRPayroll' },
      { name: 'view statutory-deductions', module: 'HRPayroll' },
      { name: 'create statutory-deductions', module: 'HRPayroll' },
      { name: 'edit statutory-deductions', module: 'HRPayroll' },
      { name: 'delete statutory-deductions', module: 'HRPayroll' },
      { name: 'import employees', module: 'HRPayroll' },
      { name: 'import-overwrite employees', module: 'HRPayroll' },
      // â”€â”€ POS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access POS module', module: 'POS' },
      { name: 'view cash-registers', module: 'POS' },
      { name: 'create cash-registers', module: 'POS' },
      { name: 'edit cash-registers', module: 'POS' },
      { name: 'delete cash-registers', module: 'POS' },
      { name: 'view cash-register-sessions', module: 'POS' },
      { name: 'create cash-register-sessions', module: 'POS' },
      { name: 'view sales-invoices', module: 'POS' },
      { name: 'create sales-invoices', module: 'POS' },
      { name: 'edit sales-invoices', module: 'POS' },
      { name: 'delete sales-invoices', module: 'POS' },
      { name: 'view payment-receipts', module: 'POS' },
      { name: 'create payment-receipts', module: 'POS' },
      // â”€â”€ IIoT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access IIoT module', module: 'IIoT' },
      { name: 'view iiot-devices', module: 'IIoT' },
      { name: 'create iiot-devices', module: 'IIoT' },
      { name: 'edit iiot-devices', module: 'IIoT' },
      { name: 'delete iiot-devices', module: 'IIoT' },
      { name: 'view iiot-tags', module: 'IIoT' },
      { name: 'create iiot-tags', module: 'IIoT' },
      { name: 'edit iiot-tags', module: 'IIoT' },
      { name: 'delete iiot-tags', module: 'IIoT' },
      { name: 'view iiot-dashboards', module: 'IIoT' },
      { name: 'create iiot-dashboards', module: 'IIoT' },
      { name: 'edit iiot-dashboards', module: 'IIoT' },
      { name: 'delete iiot-dashboards', module: 'IIoT' },
      { name: 'view iiot-alarms', module: 'IIoT' },
      { name: 'acknowledge iiot-alarms', module: 'IIoT' },
      { name: 'view iiot-scale', module: 'IIoT' },
      { name: 'manage iiot-settings', module: 'IIoT' },
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
      // â”€â”€ Manufacturing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access Manufacturing module', module: 'Manufacturing' },
      { name: 'view shift-patterns', module: 'Manufacturing' },
      { name: 'create shift-patterns', module: 'Manufacturing' },
      { name: 'edit shift-patterns', module: 'Manufacturing' },
      { name: 'delete shift-patterns', module: 'Manufacturing' },
      { name: 'view work-centers', module: 'Manufacturing' },
      { name: 'create work-centers', module: 'Manufacturing' },
      { name: 'edit work-centers', module: 'Manufacturing' },
      { name: 'delete work-centers', module: 'Manufacturing' },
      { name: 'view bill-of-materials', module: 'Manufacturing' },
      { name: 'create bill-of-materials', module: 'Manufacturing' },
      { name: 'edit bill-of-materials', module: 'Manufacturing' },
      { name: 'delete bill-of-materials', module: 'Manufacturing' },
      { name: 'view production-orders', module: 'Manufacturing' },
      { name: 'create production-orders', module: 'Manufacturing' },
      { name: 'edit production-orders', module: 'Manufacturing' },
      { name: 'delete production-orders', module: 'Manufacturing' },
      // â”€â”€ FleetManagement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access FleetManagement module', module: 'FleetManagement' },
      { name: 'view vehicles', module: 'FleetManagement' },
      { name: 'create vehicles', module: 'FleetManagement' },
      { name: 'edit vehicles', module: 'FleetManagement' },
      { name: 'delete vehicles', module: 'FleetManagement' },
      { name: 'view fleet-maintenance', module: 'FleetManagement' },
      { name: 'create fleet-maintenance', module: 'FleetManagement' },
      { name: 'edit fleet-maintenance', module: 'FleetManagement' },
      { name: 'delete fleet-maintenance', module: 'FleetManagement' },
      { name: 'view fleet-trips', module: 'FleetManagement' },
      { name: 'create fleet-trips', module: 'FleetManagement' },
      { name: 'edit fleet-trips', module: 'FleetManagement' },
      { name: 'delete fleet-trips', module: 'FleetManagement' },
      // â”€â”€ ProjectManagement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      { name: 'access ProjectManagement module', module: 'ProjectManagement' },
      { name: 'view projects', module: 'ProjectManagement' },
      { name: 'create projects', module: 'ProjectManagement' },
      { name: 'edit projects', module: 'ProjectManagement' },
      { name: 'delete projects', module: 'ProjectManagement' },
      { name: 'view tasks', module: 'ProjectManagement' },
      { name: 'create tasks', module: 'ProjectManagement' },
      { name: 'edit tasks', module: 'ProjectManagement' },
      { name: 'delete tasks', module: 'ProjectManagement' },
      { name: 'view timesheets', module: 'ProjectManagement' },
      { name: 'create timesheets', module: 'ProjectManagement' },
      { name: 'edit timesheets', module: 'ProjectManagement' },
      { name: 'delete timesheets', module: 'ProjectManagement' },
      { name: 'approve timesheets', module: 'ProjectManagement' },
      // â”€â”€ FundManagement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Granular read permissions used by the shariah-board role and any
      // future read-only viewer role. The richer write permissions are not
      // listed here yet because the FM controllers currently rely on
      // JwtAuthGuard alone for writes â€” wiring those up is a separate step.
      { name: 'access FundManagement module', module: 'FundManagement' },
      { name: 'view fund-management', module: 'FundManagement' },
      { name: 'view fm-investors', module: 'FundManagement' },
      { name: 'view fm-securities', module: 'FundManagement' },
      { name: 'view fm-credit-facilities', module: 'FundManagement' },
      { name: 'view fm-facility-assets', module: 'FundManagement' },
      { name: 'view fm-contract-signings', module: 'FundManagement' },
      { name: 'view fm-sharia', module: 'FundManagement' },
      { name: 'view fm-compliance-reports', module: 'FundManagement' },
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
      { name: 'System Admin', description: 'System administration access', permissions: ['access admin panel', 'view all records', 'manage all records', 'access Core module', 'access HRPayroll module', 'view system logs', 'manage system settings'] },
      { name: 'Employee', description: 'Basic employee access', permissions: ['access HRPayroll module', 'view employees', 'edit employees', 'view leaves', 'create leaves', 'view loans', 'create loans'] },
      { name: 'hod', description: 'Head of Department', permissions: ['approve leaves', 'approve loans'] },
      { name: 'audit', description: 'Internal Audit', permissions: ['view audit-logs', 'export audit-logs'] },
      { name: 'accountant', description: 'Accountant', permissions: ['access Accounts module'] },
      { name: 'management', description: 'Management', permissions: ['view all records'] },
      { name: 'cashier', description: 'Cashier', permissions: ['access POS module'] },
      { name: 'Inventory Manager', description: 'Inventory Manager', permissions: ['access Inventory module'] },
      { name: 'Operations Manager', description: 'Operations Manager', permissions: ['access Inventory module', 'access Sales module'] },
      { name: 'fleet_manager', description: 'Fleet Manager â€” approves vehicle bookings, assigns vehicles', permissions: ['access FleetManagement module'] },
      // Shari'ah Board â€” read-only access to Halal Fund Management features.
      // No write permissions; POST/PATCH/DELETE on guarded FM endpoints will 403.
      {
        name: 'shariah-board',
        description: "Shari'ah Board â€” read-only access to Halal Fund Management compliance views",
        permissions: [
          'access FundManagement module',
          'view fund-management',
          'view fm-investors',
          'view fm-securities',
          'view fm-credit-facilities',
          'view fm-facility-assets',
          'view fm-contract-signings',
          'view fm-sharia',
          'view fm-compliance-reports',
        ],
      },
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

  private async seedUnitsOfMeasure(client: PoolClient, companyId: number): Promise<void> {
    // â”€â”€ Base Units (no baseUomId, conversionFactor = 1) â”€â”€
    const baseUoms: { code: string; name: string; symbol: string; type: string }[] = [
      { code: 'PC',  name: 'Piece',    symbol: 'pc',  type: 'quantity' },
      { code: 'KG',  name: 'Kilogram', symbol: 'kg',  type: 'weight' },
      { code: 'L',   name: 'Litre',    symbol: 'L',   type: 'volume' },
      { code: 'M',   name: 'Metre',    symbol: 'm',   type: 'length' },
      { code: 'HR',  name: 'Hour',     symbol: 'hr',  type: 'time' },
    ];

    // â”€â”€ Derived Units (linked to a base unit via conversionFactor) â”€â”€
    const derivedUoms: { code: string; name: string; symbol: string; type: string; baseCode: string; factor: number }[] = [
      // Weight
      { code: 'G',    name: 'Gram',         symbol: 'g',    type: 'weight',   baseCode: 'KG', factor: 0.001 },
      { code: 'TON',  name: 'Tonne',        symbol: 'ton',  type: 'weight',   baseCode: 'KG', factor: 1000 },
      { code: 'LB',   name: 'Pound',        symbol: 'lb',   type: 'weight',   baseCode: 'KG', factor: 0.4536 },
      // Volume
      { code: 'ML',   name: 'Millilitre',   symbol: 'ml',   type: 'volume',   baseCode: 'L',  factor: 0.001 },
      { code: 'GAL',  name: 'Gallon',       symbol: 'gal',  type: 'volume',   baseCode: 'L',  factor: 3.7854 },
      // Length
      { code: 'CM',   name: 'Centimetre',   symbol: 'cm',   type: 'length',   baseCode: 'M',  factor: 0.01 },
      { code: 'FT',   name: 'Foot',         symbol: 'ft',   type: 'length',   baseCode: 'M',  factor: 0.3048 },
      { code: 'IN',   name: 'Inch',         symbol: 'in',   type: 'length',   baseCode: 'M',  factor: 0.0254 },
      // Pack
      { code: 'BOX',  name: 'Box',          symbol: 'box',  type: 'pack',     baseCode: 'PC', factor: 12 },
      { code: 'CTN',  name: 'Carton',       symbol: 'ctn',  type: 'pack',     baseCode: 'PC', factor: 24 },
      { code: 'DZ',   name: 'Dozen',        symbol: 'dz',   type: 'pack',     baseCode: 'PC', factor: 12 },
      { code: 'BAG',  name: 'Bag',          symbol: 'bag',  type: 'pack',     baseCode: 'PC', factor: 50 },
      { code: 'PK',   name: 'Pack',         symbol: 'pk',   type: 'pack',     baseCode: 'PC', factor: 6 },
      { code: 'SET',  name: 'Set',          symbol: 'set',  type: 'pack',     baseCode: 'PC', factor: 1 },
      { code: 'ROLL', name: 'Roll',         symbol: 'roll', type: 'quantity', baseCode: 'PC', factor: 1 },
      // Area
      { code: 'SQM',  name: 'Square Metre', symbol: 'mÂ²',   type: 'area',    baseCode: 'M',  factor: 1 },
      // Time
      { code: 'MIN',  name: 'Minute',       symbol: 'min',  type: 'time',     baseCode: 'HR', factor: 0.016667 },
    ];

    // Insert base units
    const codeToId = new Map<string, number>();
    for (const u of baseUoms) {
      const res = await client.query(
        `INSERT INTO inv_unit_of_measures ("companyId", "uomCode", name, symbol, "uomType", "conversionFactor", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 1, true, NOW(), NOW())
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [companyId, u.code, u.name, u.symbol, u.type],
      );
      if (res.rows.length > 0) {
        codeToId.set(u.code, res.rows[0].id);
      } else {
        // Already exists â€” fetch its id
        const existing = await client.query(
          `SELECT id FROM inv_unit_of_measures WHERE "companyId" = $1 AND "uomCode" = $2 AND "deletedAt" IS NULL LIMIT 1`,
          [companyId, u.code],
        );
        if (existing.rows.length > 0) codeToId.set(u.code, existing.rows[0].id);
      }
    }

    // Insert derived units
    for (const u of derivedUoms) {
      const baseId = codeToId.get(u.baseCode) ?? null;
      const res = await client.query(
        `INSERT INTO inv_unit_of_measures ("companyId", "uomCode", name, symbol, "uomType", "baseUomId", "conversionFactor", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [companyId, u.code, u.name, u.symbol, u.type, baseId, u.factor],
      );
      if (res.rows.length > 0) {
        codeToId.set(u.code, res.rows[0].id);
      } else {
        const existing = await client.query(
          `SELECT id FROM inv_unit_of_measures WHERE "companyId" = $1 AND "uomCode" = $2 AND "deletedAt" IS NULL LIMIT 1`,
          [companyId, u.code],
        );
        if (existing.rows.length > 0) codeToId.set(u.code, existing.rows[0].id);
      }
    }

    // â”€â”€ Seed common unit conversions (bidirectional) â”€â”€
    const conversions: { from: string; to: string; factor: number }[] = [
      { from: 'KG',  to: 'G',   factor: 1000 },        // 1 kg = 1000 g
      { from: 'KG',  to: 'TON', factor: 0.001 },        // 1 kg = 0.001 ton
      { from: 'KG',  to: 'LB',  factor: 2.2046 },       // 1 kg = 2.2046 lb
      { from: 'L',   to: 'ML',  factor: 1000 },          // 1 L  = 1000 ml
      { from: 'L',   to: 'GAL', factor: 0.2642 },        // 1 L  = 0.2642 gal
      { from: 'M',   to: 'CM',  factor: 100 },            // 1 m  = 100 cm
      { from: 'M',   to: 'FT',  factor: 3.2808 },        // 1 m  = 3.2808 ft
      { from: 'M',   to: 'IN',  factor: 39.3701 },        // 1 m  = 39.3701 in
      { from: 'HR',  to: 'MIN', factor: 60 },             // 1 hr = 60 min
      { from: 'DZ',  to: 'PC',  factor: 12 },             // 1 dz = 12 pc
      { from: 'BOX', to: 'PC',  factor: 12 },             // 1 box = 12 pc
      { from: 'CTN', to: 'PC',  factor: 24 },             // 1 ctn = 24 pc
      { from: 'BAG', to: 'PC',  factor: 50 },             // 1 bag = 50 pc
      { from: 'PK',  to: 'PC',  factor: 6 },              // 1 pk = 6 pc
    ];

    for (const c of conversions) {
      const fromId = codeToId.get(c.from);
      const toId = codeToId.get(c.to);
      if (!fromId || !toId) continue;
      await client.query(
        `INSERT INTO inv_unit_conversions ("companyId", "fromUnitId", "toUnitId", "conversionFactor", "isBidirectional", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [companyId, fromId, toId, c.factor],
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

  private async seedWarehouse(client: PoolClient, companyId: number, branchId: number): Promise<void> {
    await client.query(
      `INSERT INTO inv_warehouses ("companyId", "branchId", code, name, "isDefault", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, 'MAIN', 'Main Warehouse', true, true, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [companyId, branchId],
    );
  }

  private async seedWalkInCustomer(client: PoolClient, companyId: number, branchId: number): Promise<void> {
    const result = await client.query(
      `INSERT INTO customers ("companyId", code, name, email, phone, "customerType", "isActive", "isWalkInCustomer", "createdAt", "updatedAt")
       VALUES ($1, 'WALK-IN', 'Walk-in Customer', 'walkin@pos.local', '0000000000', 'RETAIL', true, true, NOW(), NOW())
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [companyId],
    );

    if (result.rows.length > 0) {
      const customerId = result.rows[0].id;
      await client.query(
        `INSERT INTO branch_customer ("branchId", "customerId", "createdAt", "updatedAt")
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [branchId, customerId],
      );
    }
  }

  private async seedLoanTypes(client: PoolClient, companyId: number): Promise<void> {
    const loanTypes = [
      { name: 'Salary Advance', code: 'SAL_ADV', interestRate: 0, maxTenure: 1, eligibilityMonths: 3, requiresGuarantor: false },
      { name: 'Personal Loan', code: 'PERSONAL', interestRate: 5, maxTenure: 12, eligibilityMonths: 6, requiresGuarantor: true },
      { name: 'Emergency Loan', code: 'EMERGENCY', interestRate: 0, maxTenure: 3, eligibilityMonths: 3, requiresGuarantor: false },
      { name: 'Car Loan', code: 'CAR', interestRate: 8, maxTenure: 48, eligibilityMonths: 24, requiresGuarantor: true },
    ];

    for (const loan of loanTypes) {
      await client.query(
        `INSERT INTO loan_types ("companyId", name, code, "interestRate", "maxTenure", "eligibilityMonths", "requiresGuarantor", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [companyId, loan.name, loan.code, loan.interestRate, loan.maxTenure, loan.eligibilityMonths, loan.requiresGuarantor],
      );
    }
  }

  private async seedApprovalFlows(client: PoolClient, companyId: number): Promise<void> {
    // Fetch all needed roles in one query
    const roleResult = await client.query(
      `SELECT id, name FROM roles WHERE name IN ('hod','audit','accountant','management','cashier','Inventory Manager','fleet_manager') AND "guardName" = 'web'`,
    );
    const roleMap: Record<string, number> = {};
    for (const r of roleResult.rows) roleMap[r.name] = r.id;
    // Alias for ISR final "Issue Stock" step â€” fall back to cashier if Inventory Manager role missing
    if (roleMap['Inventory Manager']) roleMap['inventory_manager'] = roleMap['Inventory Manager'];

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
        { name: 'Payment Processing', order: 5, role: 'cashier', isLocked: true, isFinalStep: true, stepType: 'payment' },
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

    // Payroll Approval Flow — copies steps from expense_requests flow (tenant-configured chain)
    const payrollFlowResult = await client.query(
      `INSERT INTO process_approval_flows (“companyId”, name, “approvableType”, “entitySlug”, description, “isActive”, “createdAt”, “updatedAt”)
       VALUES ($1, 'Payroll Approval', 'payroll_runs', 'hrpayroll.payrolls', 'Approval workflow for payroll runs — mirrors expense request approval chain', true, NOW(), NOW())
       ON CONFLICT DO NOTHING RETURNING id`,
      [companyId],
    );

    if (payrollFlowResult.rows.length > 0) {
      const payrollFlowId = payrollFlowResult.rows[0].id;
      // Copy steps from the expense_requests flow seeded just above
      const expenseStepsResult = await client.query(
        `SELECT s.”roleId”, s.name, s.”stepOrder”, s.action, s.”isRequired”, s.”isActive”, s.”isLocked”, s.”isFinalStep”, s.”stepType”
         FROM process_approval_flow_steps s
         JOIN process_approval_flows f ON f.id = s.”processApprovalFlowId”
         WHERE f.”approvableType” = 'expense_requests' AND f.”companyId” = $1 AND f.”isActive” = true
         ORDER BY s.”stepOrder”`,
        [companyId],
      );
      for (const step of expenseStepsResult.rows) {
        await client.query(
          `INSERT INTO process_approval_flow_steps (“processApprovalFlowId”, “companyId”, “roleId”, name, “stepOrder”, action, “isRequired”, “isActive”, “isLocked”, “isFinalStep”, “stepType”, “createdAt”, “updatedAt”)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) ON CONFLICT DO NOTHING`,
          [payrollFlowId, companyId, step.roleId, step.name, step.stepOrder,
           step.action, step.isRequired, step.isActive, step.isLocked, step.isFinalStep, step.stepType],
        );
      }
    }

    // Purchase Requisition Approval Flow — 2 configurable steps
    const prFlowResult = await client.query(
      `INSERT INTO process_approval_flows ("companyId", name, "approvableType", "entitySlug", description, "isActive", "createdAt", "updatedAt")
       VALUES ($1, 'Purchase Requisition Approval', 'purchase_requisitions', 'purchase.requisitions', 'Configurable approval workflow for purchase requisitions', true, NOW(), NOW())
       ON CONFLICT DO NOTHING RETURNING id`,
      [companyId],
    );

    if (prFlowResult.rows.length > 0) {
      const prFlowId = prFlowResult.rows[0].id;
      const prSteps = [
        { name: 'HOD Approval', order: 1, role: 'hod' },
        { name: 'Management Approval', order: 2, role: 'management' },
      ];
      for (const step of prSteps) {
        const roleId = roleMap[step.role];
        if (!roleId) continue;
        await client.query(
          `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'APPROVE', true, true, NOW(), NOW()) ON CONFLICT DO NOTHING`,
          [prFlowId, companyId, roleId, step.name, step.order],
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
        name: 'Purchase Order Approval',
        approvableType: 'purchase_orders',
        entitySlug: 'purchase.orders',
        steps: [
          { name: 'HOD Approval', order: 1, role: 'hod' },
          { name: 'Management Approval', order: 2, role: 'management' },
        ],
      },
      {
        name: 'Supplier Payment Approval',
        approvableType: 'supplier_payments',
        entitySlug: 'payables.payments',
        steps: [
          { name: 'Internal Audit Check', order: 1, role: 'audit' },
          { name: 'Accountant Review', order: 2, role: 'accountant' },
          { name: 'General Manager Approval', order: 3, role: 'management' },
          { name: 'Management Approval', order: 4, role: 'management' },
          { name: 'Payment Processing', order: 5, role: 'cashier', isLocked: true, isFinalStep: true },
        ],
      },
      {
        name: 'Sales Order Approval',
        approvableType: 'sales_orders',
        entitySlug: 'sales.orders',
        steps: [
          { name: 'HOD Approval', order: 1, role: 'hod' },
        ],
      },
      {
        name: 'Sales Invoice Approval',
        approvableType: 'sales_invoices',
        entitySlug: 'sales.invoices',
        steps: [
          { name: 'Accountant Review', order: 1, role: 'accountant' },
        ],
      },
      {
        name: 'Customer Receipt Approval',
        approvableType: 'customer_receipts',
        entitySlug: 'receivables.receipts',
        steps: [
          { name: 'Accountant Review', order: 1, role: 'accountant' },
          { name: 'Management Approval', order: 2, role: 'management' },
        ],
      },
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
      {
        name: 'Inventory Transfer Approval',
        approvableType: 'inventory_transfers',
        entitySlug: 'inventory.transfers',
        steps: [
          { name: 'HOD Approval', order: 1, role: 'hod' },
        ],
      },
      {
        name: 'Inventory Adjustment Approval',
        approvableType: 'inventory_adjustments',
        entitySlug: 'inventory.adjustments',
        steps: [
          { name: 'HOD Approval', order: 1, role: 'hod' },
          { name: 'Audit Review', order: 2, role: 'audit' },
        ],
      },
      {
        name: 'Internal Stock Request Approval',
        approvableType: 'internal_stock_requests',
        entitySlug: 'inventory.stock-requests',
        steps: [
          { name: 'HOD Approval', order: 1, role: 'hod' },
          { name: 'Audit Review', order: 2, role: 'audit' },
          // Final "Issue Stock" step â€” defaults to Inventory Manager, falls back to cashier if absent
          { name: 'Issue Stock', order: 3, role: 'inventory_manager', isFinalStep: true },
        ],
      },
      {
        name: 'Leave Request Approval',
        approvableType: 'leave_requests',
        entitySlug: 'hrpayroll.leave-requests',
        steps: [
          { name: 'HOD Approval', order: 1, role: 'hod' },
        ],
      },
      {
        name: 'Payroll Run Approval',
        approvableType: 'payroll_runs',
        entitySlug: 'hrpayroll.payroll-runs',
        steps: [
          { name: 'HOD Approval', order: 1, role: 'hod' },
          { name: 'Management Approval', order: 2, role: 'management' },
        ],
      },
      {
        name: 'Employee Loan Approval',
        approvableType: 'employee_loans',
        entitySlug: 'hrpayroll.loans',
        steps: [
          { name: 'HOD Approval', order: 1, role: 'hod' },
          { name: 'HR Review', order: 2, role: 'management' },
          { name: 'Finance Approval', order: 3, role: 'accountant', isFinalStep: true },
        ],
      },
      {
        name: 'Customer Onboarding Approval',
        approvableType: 'investor_onboarding',
        entitySlug: 'fund-management.customer-onboarding',
        steps: [
          { name: 'Compliance Officer Review', order: 1, role: 'audit' },
          { name: 'Manager Sign-off', order: 2, role: 'management', isFinalStep: true },
        ],
      },
      {
        name: 'Vehicle Booking Approval',
        approvableType: 'vehicle_bookings',
        entitySlug: 'fleet-management.bookings',
        steps: [
          { name: 'Fleet Manager Approval', order: 1, role: 'fleet_manager', isFinalStep: true },
        ],
      },
      {
        name: 'Credit Note Approval',
        approvableType: 'credit_notes',
        entitySlug: 'receivables.credit-notes',
        steps: [
          { name: 'Accountant Review', order: 1, role: 'accountant' },
          { name: 'Management Approval', order: 2, role: 'management', isFinalStep: true },
        ],
      },
      {
        name: 'Loading Order Approval',
        approvableType: 'loading_orders',
        entitySlug: 'sales.loading-orders',
        steps: [
          { name: 'HOD Approval', order: 1, role: 'hod' },
          { name: 'Management Approval', order: 2, role: 'management', isFinalStep: true },
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
          // Fallback: inventory_manager â†’ cashier when Inventory Manager role doesn't exist
          let resolvedRole = step.role;
          let roleId = roleMap[resolvedRole];
          if (!roleId && step.role === 'inventory_manager') {
            this.logger.warn(`Role 'Inventory Manager' missing for company ${companyId}; falling back to 'cashier' for step '${step.name}'`);
            resolvedRole = 'cashier';
            roleId = roleMap[resolvedRole];
          }
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

    // Document Review Approval Flow — 2 steps (HOD → Management)
    const dmsFlowResult = await client.query(
      `INSERT INTO process_approval_flows ("companyId", name, "approvableType", "entitySlug", description, "isActive", "createdAt", "updatedAt")
       VALUES ($1, 'Document Review Approval', 'dms_documents', 'documents.repository', 'Review and approve uploaded documents', true, NOW(), NOW())
       ON CONFLICT DO NOTHING RETURNING id`,
      [companyId],
    );

    if (dmsFlowResult.rows.length > 0) {
      const dmsFlowId = dmsFlowResult.rows[0].id;
      const dmsSteps = [
        { name: 'HOD Review', order: 1, role: 'hod' },
        { name: 'Management Approval', order: 2, role: 'management', isFinalStep: true },
      ];
      for (const step of dmsSteps) {
        const roleId = roleMap[step.role];
        if (!roleId) continue;
        await client.query(
          `INSERT INTO process_approval_flow_steps ("processApprovalFlowId", "companyId", "roleId", name, "stepOrder", action, "isRequired", "isActive", "isFinalStep", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, 'APPROVE', true, true, $6, NOW(), NOW()) ON CONFLICT DO NOTHING`,
          [dmsFlowId, companyId, roleId, step.name, step.order, step.isFinalStep ?? false],
        );
      }
    }
  }

  /**
   * Mark documents past their expiresAt date as EXPIRED across all tenant schemas.
   * Called daily by DocumentsScheduler.
   */
  async markExpiredDocuments(): Promise<{ tenantsProcessed: number; documentsExpired: number }> {
    const listClient = await this.pool.connect();
    let schemas: string[] = [];
    try {
      const result = await listClient.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' ORDER BY schema_name`,
      );
      schemas = result.rows.map((r: { schema_name: string }) => r.schema_name);
    } finally {
      listClient.release();
    }

    let documentsExpired = 0;
    for (const schema of schemas) {
      const client = await this.pool.connect();
      try {
        await client.query(`SET search_path TO "${schema}"`);
        const result = await client.query(
          `UPDATE dms_documents
           SET status = 'EXPIRED', "updatedAt" = NOW()
           WHERE status NOT IN ('EXPIRED', 'SUPERSEDED', 'REJECTED')
             AND "deletedAt" IS NULL
             AND "expiresAt" IS NOT NULL
             AND "expiresAt" < NOW()`,
        );
        documentsExpired += result.rowCount ?? 0;
      } catch (err) {
        this.logger.warn(`Failed to mark expired docs in ${schema}: ${(err as Error).message}`);
      } finally {
        await client.query(`SET search_path TO "public"`);
        client.release();
      }
    }

    return { tenantsProcessed: schemas.length, documentsExpired };
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

  private async seedFleetVehicleServiceTypes(client: PoolClient, companyId: number): Promise<void> {
    const types = [
      { name: 'Truck',           code: 'TRUCK' },
      { name: 'Van',             code: 'VAN' },
      { name: 'Car',             code: 'CAR' },
      { name: 'Motorcycle',      code: 'MOTORCYCLE' },
      { name: 'Bus',             code: 'BUS' },
      { name: 'Trailer',         code: 'TRAILER' },
      { name: 'Heavy Equipment', code: 'HEAVY_EQUIPMENT' },
      { name: 'Other',           code: 'OTHER' },
    ];
    for (const t of types) {
      await client.query(
        `INSERT INTO fleet_vehicle_service_types (name, code, "isSystem", "isActive", "companyId", "createdAt", "updatedAt")
         VALUES ($1, $2, true, true, $3, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [t.name, t.code, companyId],
      );
    }
  }

  /**
   * Seed default fund products from the D'Namaz Capital term sheet.
   * These are seeded per-tenant so each client can edit/customise their own copy.
   * Uses ON CONFLICT (fundCode) DO NOTHING â€” safe to re-run.
   */
  private async seedFundProducts(client: PoolClient, companyId: number): Promise<void> {
    const funds = [
      {
        fundCode: 'DHFIF',
        name: "D'Namaz Halal Fixed Income Fund",
        shortName: 'DHFIF',
        description:
          'A SEC-registered mutual fund that provides investors with long-term income generation, stable cash distribution, and capital preservation through FGN Sukuks, shariah-compliant income contracts, and fixed-term investments.',
        fundType: 'OPEN_ENDED',
        baseCurrency: 'NGN',
        isShariaCompliant: true,
        navFrequency: 'MONTHLY',
        regulatoryType: 'SEC',
        minimumSubscription: 10000.00,
        lockUpPeriodDays: 90,        // 3 months
        redemptionNoticeDays: 5,
        benchmarkFormula: '70% FGN Sukuk Yield + 30% Treasury Bill Rates',
        profitSharingRatio: null,    // benchmark-based, not a fixed split
        projectedRate: null,
        autoReinvest: false,
        status: 'ACTIVE',
        inceptionDate: '2024-01-01',
      },
      {
        fundCode: 'MIA',
        name: 'Mudarabah Investment Account',
        shortName: 'MIA',
        description:
          'A discretionary Mudarabah investment account that achieves long-term capital appreciation and income generation through a well-diversified portfolio of equity, sukuk, commodity, real estate, facilities, and shariah-compliant money market instruments.',
        fundType: 'OPEN_ENDED',
        baseCurrency: 'NGN',
        isShariaCompliant: true,
        navFrequency: 'MONTHLY',
        regulatoryType: 'SEC',
        minimumSubscription: 1000000.00,
        lockUpPeriodDays: 180,       // 6 months
        redemptionNoticeDays: 5,
        benchmarkFormula: null,
        profitSharingRatio: '55:45',
        projectedRate: 16.00,
        autoReinvest: false,
        status: 'ACTIVE',
        inceptionDate: '2024-01-01',
      },
      {
        fundCode: 'BKMI',
        name: 'Barakah Kids Mudarabah Investment Account',
        shortName: 'BKMI',
        description:
          'A long-horizon Mudarabah account designed for children from age 2 and above, managed until the beneficiary turns 18. Profits are reinvested automatically. All investments are held under the custody of parents or guardians.',
        fundType: 'OPEN_ENDED',
        baseCurrency: 'NGN',
        isShariaCompliant: true,
        navFrequency: 'MONTHLY',
        regulatoryType: 'SEC',
        minimumSubscription: 1000000.00,
        lockUpPeriodDays: 365,       // 12 months minimum; runs to age 18
        redemptionNoticeDays: 5,
        benchmarkFormula: null,
        profitSharingRatio: '55:45',
        projectedRate: 16.00,
        autoReinvest: true,          // profits reinvested, not distributed
        status: 'ACTIVE',
        inceptionDate: '2024-01-01',
      },
      {
        fundCode: 'EMP',
        name: 'Equity Mudarabah Portfolio',
        shortName: 'EMP',
        description:
          'A discretionary equity-focused Mudarabah portfolio investing in shariah-compliant shares on the NGX and other exchanges, Mudarabah/Musharakah facilities to SMEs, fast-moving commodity goods, healthcare, and technology.',
        fundType: 'OPEN_ENDED',
        baseCurrency: 'NGN',
        isShariaCompliant: true,
        navFrequency: 'MONTHLY',
        regulatoryType: 'SEC',
        minimumSubscription: 1000000.00,
        lockUpPeriodDays: 180,       // 6 months
        redemptionNoticeDays: 5,
        benchmarkFormula: null,
        profitSharingRatio: '55:45',
        projectedRate: null,
        autoReinvest: false,
        status: 'ACTIVE',
        inceptionDate: '2024-01-01',
      },
      {
        fundCode: 'D-REIN',
        name: "D'Namaz Real Estate Mudarabah Investment",
        shortName: 'D-REIN',
        description:
          'A real estate investment portfolio targeting rental income and capital appreciation through acquisition and development of shariah-compliant residential, commercial, and industrial properties. Targeted at high-net-worth and institutional investors.',
        fundType: 'OPEN_ENDED',
        baseCurrency: 'NGN',
        isShariaCompliant: true,
        navFrequency: 'MONTHLY',
        regulatoryType: 'SEC',
        minimumSubscription: 50000000.00,
        lockUpPeriodDays: 365,       // 12 months
        redemptionNoticeDays: 5,
        benchmarkFormula: null,
        profitSharingRatio: '55:45',
        projectedRate: 20.00,
        autoReinvest: false,
        status: 'ACTIVE',
        inceptionDate: '2024-01-01',
      },
      {
        fundCode: 'CMP',
        name: 'Commodity Mudarabah Portfolio',
        shortName: 'CMP',
        description:
          'A commodity trading portfolio that buys and sells shariah-compliant tangible cash crops (cocoa, oil palm, groundnut, cotton, sesame seeds, rice), gold, oil and gas, and other qualified shariah-compliant minerals and commodity-related financing.',
        fundType: 'OPEN_ENDED',
        baseCurrency: 'NGN',
        isShariaCompliant: true,
        navFrequency: 'MONTHLY',
        regulatoryType: 'SEC',
        minimumSubscription: 1000000.00,
        lockUpPeriodDays: 180,       // 6 months
        redemptionNoticeDays: 5,
        benchmarkFormula: null,
        profitSharingRatio: '55:45',
        projectedRate: 16.00,
        autoReinvest: false,
        status: 'ACTIVE',
        inceptionDate: '2024-01-01',
      },
    ];

    for (const f of funds) {
      await client.query(
        `INSERT INTO fm_funds (
          "fundCode", name, "shortName", description, "fundType",
          "baseCurrency", "isShariaCompliant", "navFrequency", "regulatoryType",
          "minimumSubscription", "lockUpPeriodDays", "redemptionNoticeDays",
          "benchmarkFormula", "profitSharingRatio", "projectedRate",
          "autoReinvest", status, "inceptionDate", "companyId", "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5::\"FmFundType\",
          $6,$7,$8::\"FmNavFrequency\",$9,
          $10,$11,$12,
          $13,$14,$15,
          $16,$17,$18::date,$19,NOW(),NOW()
        )
        ON CONFLICT ("fundCode") DO NOTHING`,
        [
          f.fundCode, f.name, f.shortName, f.description, f.fundType,
          f.baseCurrency, f.isShariaCompliant, f.navFrequency, f.regulatoryType,
          f.minimumSubscription, f.lockUpPeriodDays, f.redemptionNoticeDays,
          f.benchmarkFormula, f.profitSharingRatio, f.projectedRate,
          f.autoReinvest, f.status, f.inceptionDate, companyId,
        ],
      );
    }
  }

  private async seedCreditFacilityTypes(client: PoolClient, companyId: number): Promise<void> {
    const types = [
      {
        code: 'MRB-STD',
        name: 'Standard Murabaha Facility',
        description: 'Cost-plus trade finance for goods, equipment, and working capital. The fund purchases the asset and sells to the investee at a fixed markup. Profit rate is fixed at signing â€” no interest.',
        facilityStructure: 'murabaha',
        profitRate: 16.00,
        profitCalculation: 'flat',
        repaymentMethod: 'emi',
        repaymentFrequency: 'monthly',
        minAmount: 500000,
        maxAmount: 50000000,
        minTenureMonths: 3,
        maxTenureMonths: 24,
        processingFee: 0,
        processingFeeType: 'fixed',
        managerProfitSharePct: 55,
        investorProfitSharePct: 45,
        requiresApproval: true,
        isShariaCompliant: true,
      },
      {
        code: 'MDB-STD',
        name: 'Standard Mudarabah Investment Facility',
        description: 'Capital provision to SMEs and businesses where the fund provides 100% capital and the investee provides expertise. Profits split per agreed ratio; losses fall to the fund (capital provider).',
        facilityStructure: 'mudarabah',
        profitRate: 16.00,
        profitCalculation: 'flat',
        repaymentMethod: 'bullet',
        repaymentFrequency: 'quarterly',
        minAmount: 1000000,
        maxAmount: 100000000,
        minTenureMonths: 6,
        maxTenureMonths: 36,
        processingFee: 0,
        processingFeeType: 'fixed',
        managerProfitSharePct: 55,
        investorProfitSharePct: 45,
        requiresApproval: true,
        isShariaCompliant: true,
      },
      {
        code: 'MSH-STD',
        name: 'Standard Musharakah Partnership Facility',
        description: 'Joint venture partnership where both the fund and investee contribute capital and share profits and losses proportionally. Used for business expansion, real estate, and equity co-investments.',
        facilityStructure: 'musharakah',
        profitRate: 16.00,
        profitCalculation: 'flat',
        repaymentMethod: 'emi',
        repaymentFrequency: 'quarterly',
        minAmount: 2000000,
        maxAmount: 200000000,
        minTenureMonths: 6,
        maxTenureMonths: 36,
        processingFee: 0,
        processingFeeType: 'fixed',
        managerProfitSharePct: 55,
        investorProfitSharePct: 45,
        requiresApproval: true,
        isShariaCompliant: true,
      },
      {
        code: 'IJR-STD',
        name: 'Standard Ijarah Lease Facility',
        description: 'Asset-backed lease financing. The fund purchases and owns the asset; the investee pays rent for its use. Rent is consideration for usufruct â€” not interest. Option to purchase at end of tenure (Ijarah Muntahia Bittamleek).',
        facilityStructure: 'ijarah',
        profitRate: 16.00,
        profitCalculation: 'flat',
        repaymentMethod: 'emi',
        repaymentFrequency: 'monthly',
        minAmount: 1000000,
        maxAmount: 100000000,
        minTenureMonths: 12,
        maxTenureMonths: 60,
        processingFee: 0,
        processingFeeType: 'fixed',
        managerProfitSharePct: 55,
        investorProfitSharePct: 45,
        requiresApproval: true,
        isShariaCompliant: true,
      },
      {
        code: 'REIN-MSH',
        name: 'Real Estate Musharakah Facility',
        description: 'Diminishing Musharakah for real estate acquisition and development. The fund and investee co-own the property; the investee progressively buys out the fund\'s share via installments. Used for residential, commercial, and industrial property.',
        facilityStructure: 'musharakah',
        profitRate: 20.00,
        profitCalculation: 'declining_balance',
        repaymentMethod: 'emi',
        repaymentFrequency: 'monthly',
        minAmount: 10000000,
        maxAmount: 500000000,
        minTenureMonths: 12,
        maxTenureMonths: 60,
        processingFee: 0,
        processingFeeType: 'fixed',
        managerProfitSharePct: 55,
        investorProfitSharePct: 45,
        requiresApproval: true,
        isShariaCompliant: true,
      },
      {
        code: 'CMP-MRB',
        name: 'Commodity Murabaha Trade Finance',
        description: 'Short-term commodity trade finance. Fund purchases commodity (cocoa, palm oil, sesame, rice, cotton, etc.) and on-sells to the investee at a fixed markup payable at maturity. Ideal for seasonal commodity traders and agribusinesses.',
        facilityStructure: 'murabaha',
        profitRate: 16.00,
        profitCalculation: 'flat',
        repaymentMethod: 'bullet',
        repaymentFrequency: 'lump_sum',
        minAmount: 500000,
        maxAmount: 50000000,
        minTenureMonths: 1,
        maxTenureMonths: 12,
        processingFee: 0,
        processingFeeType: 'fixed',
        managerProfitSharePct: 55,
        investorProfitSharePct: 45,
        requiresApproval: true,
        isShariaCompliant: true,
      },
    ];

    for (const t of types) {
      await client.query(
        `INSERT INTO fm_credit_facility_types (
          "companyId", code, name, description,
          "facilityStructure", "profitRate", "profitCalculation",
          "repaymentMethod", "repaymentFrequency",
          "minAmount", "maxAmount", "minTenureMonths", "maxTenureMonths",
          "processingFee", "processingFeeType",
          "managerProfitSharePct", "investorProfitSharePct",
          "requiresApproval", "isShariaCompliant", "isActive",
          "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,
          $5,$6,$7,
          $8,$9,
          $10,$11,$12,$13,
          $14,$15,
          $16,$17,
          $18,$19,true,
          NOW(),NOW()
        )
        ON CONFLICT ("companyId", code) DO NOTHING`,
        [
          companyId, t.code, t.name, t.description,
          t.facilityStructure, t.profitRate, t.profitCalculation,
          t.repaymentMethod, t.repaymentFrequency,
          t.minAmount, t.maxAmount, t.minTenureMonths, t.maxTenureMonths,
          t.processingFee, t.processingFeeType,
          t.managerProfitSharePct, t.investorProfitSharePct,
          t.requiresApproval, t.isShariaCompliant,
        ],
      );
    }
  }

  /**
   * Seed default Document Management System categories
   */
  private async seedDocumentCategories(client: PoolClient, companyId: number): Promise<void> {
    const categories = [
      // Top-level
      { name: 'Finance', slug: 'finance', color: '#3B82F6', icon: 'Wallet', sortOrder: 1, parentSlug: null },
      { name: 'Procurement', slug: 'procurement', color: '#F59E0B', icon: 'ShoppingCart', sortOrder: 2, parentSlug: null },
      { name: 'HR', slug: 'hr', color: '#8B5CF6', icon: 'Users', sortOrder: 3, parentSlug: null },
      { name: 'Legal & Compliance', slug: 'legal-compliance', color: '#EF4444', icon: 'Scale', sortOrder: 4, parentSlug: null },
      { name: 'Operations', slug: 'operations', color: '#10B981', icon: 'Settings', sortOrder: 5, parentSlug: null },
      { name: 'General', slug: 'general', color: '#6B7280', icon: 'Folder', sortOrder: 6, parentSlug: null },
      // Finance children
      { name: 'Invoices', slug: 'finance-invoices', color: '#3B82F6', icon: 'FileText', sortOrder: 1, parentSlug: 'finance' },
      { name: 'Receipts', slug: 'finance-receipts', color: '#3B82F6', icon: 'Receipt', sortOrder: 2, parentSlug: 'finance' },
      { name: 'Bank Statements', slug: 'finance-bank-statements', color: '#3B82F6', icon: 'Building2', sortOrder: 3, parentSlug: 'finance' },
      { name: 'Expense Reports', slug: 'finance-expense-reports', color: '#3B82F6', icon: 'CreditCard', sortOrder: 4, parentSlug: 'finance' },
      // Procurement children
      { name: 'Purchase Orders', slug: 'procurement-pos', color: '#F59E0B', icon: 'ClipboardList', sortOrder: 1, parentSlug: 'procurement' },
      { name: 'Supplier Contracts', slug: 'procurement-contracts', color: '#F59E0B', icon: 'FileSignature', sortOrder: 2, parentSlug: 'procurement' },
      { name: 'GRN Documents', slug: 'procurement-grn', color: '#F59E0B', icon: 'Package', sortOrder: 3, parentSlug: 'procurement' },
      // HR children
      { name: 'Employment Contracts', slug: 'hr-employment-contracts', color: '#8B5CF6', icon: 'FileCheck', sortOrder: 1, parentSlug: 'hr' },
      { name: 'Payslips', slug: 'hr-payslips', color: '#8B5CF6', icon: 'DollarSign', sortOrder: 2, parentSlug: 'hr' },
      { name: 'Leave Documents', slug: 'hr-leave', color: '#8B5CF6', icon: 'Calendar', sortOrder: 3, parentSlug: 'hr' },
      { name: 'Certificates', slug: 'hr-certificates', color: '#8B5CF6', icon: 'Award', sortOrder: 4, parentSlug: 'hr' },
      // Legal children
      { name: 'Licenses', slug: 'legal-licenses', color: '#EF4444', icon: 'BadgeCheck', sortOrder: 1, parentSlug: 'legal-compliance' },
      { name: 'Regulatory Filings', slug: 'legal-filings', color: '#EF4444', icon: 'FilePlus', sortOrder: 2, parentSlug: 'legal-compliance' },
      { name: 'Insurance Certificates', slug: 'legal-insurance', color: '#EF4444', icon: 'Shield', sortOrder: 3, parentSlug: 'legal-compliance' },
      // Operations children
      { name: 'Quality Reports', slug: 'ops-quality', color: '#10B981', icon: 'CheckCircle', sortOrder: 1, parentSlug: 'operations' },
      { name: 'Inspection Reports', slug: 'ops-inspections', color: '#10B981', icon: 'Search', sortOrder: 2, parentSlug: 'operations' },
      { name: 'Delivery Notes', slug: 'ops-delivery-notes', color: '#10B981', icon: 'Truck', sortOrder: 3, parentSlug: 'operations' },
    ];

    // Insert top-level first, collecting IDs for parent reference
    const idMap = new Map<string, number>();

    for (const cat of categories) {
      const parentId = cat.parentSlug ? (idMap.get(cat.parentSlug) ?? null) : null;

      const result = await client.query(
        `INSERT INTO dms_document_categories
           ("companyId", name, slug, "parentId", color, icon, "sortOrder", "isActive", "requiresApproval", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, false, NOW(), NOW())
         ON CONFLICT ("companyId", slug) DO NOTHING
         RETURNING id`,
        [companyId, cat.name, cat.slug, parentId, cat.color, cat.icon, cat.sortOrder],
      );

      if (result.rows[0]) {
        idMap.set(cat.slug, result.rows[0].id);
      } else {
        // Already existed — fetch its id for children
        const existing = await client.query(
          `SELECT id FROM dms_document_categories WHERE "companyId" = $1 AND slug = $2`,
          [companyId, cat.slug],
        );
        if (existing.rows[0]) idMap.set(cat.slug, existing.rows[0].id);
      }
    }
  }

  /**
   * Helper to append schema to database URL
   */
  private appendSchemaToUrl(baseUrl: string, schema: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('schema', schema);
    return url.toString();
  }
}
