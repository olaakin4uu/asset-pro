/**
 * AssetPro Tenant Schema Migrations
 *
 * Migrations applied to existing tenant schemas after initial provisioning.
 * New tenants get the full schema via `prisma db push` at sign-up time;
 * these migrations exist only for schema evolution on already-live tenants.
 *
 * Rules:
 * - Every migration ID must be unique and date-prefixed (YYYY-MM-DD-NNN-slug)
 * - All SQL must use IF NOT EXISTS / IF EXISTS (idempotent)
 * - Add migrations here AND update schema.tenant.prisma for consistency
 */

export interface TenantMigration {
  id: string;
  description: string;
  sql: string[];
}

export const TENANT_MIGRATIONS: TenantMigration[] = [
  // ============================================================================
  // Infrastructure — applied on every provisioning run
  // ============================================================================
  {
    id: '2026-01-01-001-updated-at-defaults',
    description: 'Ensure all updatedAt columns have DEFAULT CURRENT_TIMESTAMP for raw SQL safety',
    sql: [
      // The TenantDatabaseService.fixUpdatedAtDefaults() method handles this dynamically.
      // This entry is a no-op placeholder so the migration is recorded.
      `SELECT 1`,
    ],
  },
  // ============================================================================
  // Future migrations for AssetPro go here (date-ordered, unique IDs)
  // ============================================================================
];
