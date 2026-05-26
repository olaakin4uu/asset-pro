import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { SyncConfigService } from '../services/sync-config.service';

/**
 * SyncOutboxService — records tenant data changes to the `public.sync_outbox` table.
 *
 * This service is called by TenantPrismaService after insert/update/delete operations
 * when DEPLOYMENT_MODE is on_premise or hybrid and SYNC_ENABLED is true.
 *
 * The outbox table lives in the public (central) schema, not in tenant schemas.
 * A shared static pool writes to it so we don't interfere with the tenant connection's
 * search_path.
 *
 * Design principles:
 * - Fire-and-forget: outbox write failures never block the primary operation
 * - Non-blocking: uses a separate pool connection
 * - Transparent: application code doesn't know about sync tracking
 */
@Injectable()
export class SyncOutboxService {
  private readonly logger = new Logger(SyncOutboxService.name);
  private static pool: Pool;
  private readonly enabled: boolean;

  constructor(
    private readonly syncConfig: SyncConfigService,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.syncConfig.isSyncEnabled();

    if (this.enabled && !SyncOutboxService.pool) {
      SyncOutboxService.pool = new Pool({
        connectionString: this.configService.get<string>('DATABASE_URL'),
        max: 2, // Small pool — outbox writes are lightweight
        idleTimeoutMillis: 30000,
      });
    }
  }

  /**
   * Whether sync tracking is active.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Record an INSERT operation to the sync outbox.
   *
   * @param tenantId - Tenant identifier
   * @param tableName - Database table name (snake_case)
   * @param recordId - Primary key of the inserted record
   * @param payload - The full inserted record data
   */
  async trackInsert(
    tenantId: string,
    tableName: string,
    recordId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!this.shouldTrack(tableName)) return;
    await this.writeOutbox(tenantId, tableName, recordId, 'INSERT', payload);
  }

  /**
   * Record an UPDATE operation to the sync outbox.
   *
   * @param tenantId - Tenant identifier
   * @param tableName - Database table name (snake_case)
   * @param recordId - Primary key of the updated record
   * @param payload - The full updated record data
   * @param previousPayload - The record data before the update (optional)
   */
  async trackUpdate(
    tenantId: string,
    tableName: string,
    recordId: string,
    payload: Record<string, unknown>,
    previousPayload?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.shouldTrack(tableName)) return;
    await this.writeOutbox(
      tenantId,
      tableName,
      recordId,
      'UPDATE',
      payload,
      previousPayload,
    );
  }

  /**
   * Record a DELETE operation to the sync outbox.
   *
   * @param tenantId - Tenant identifier
   * @param tableName - Database table name (snake_case)
   * @param recordId - Primary key of the deleted record
   * @param previousPayload - The record data before deletion
   */
  async trackDelete(
    tenantId: string,
    tableName: string,
    recordId: string,
    previousPayload?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.shouldTrack(tableName)) return;
    await this.writeOutbox(
      tenantId,
      tableName,
      recordId,
      'DELETE',
      {},
      previousPayload,
    );
  }

  // ── Private ─────────────────────────────────────────────────────────

  private shouldTrack(tableName: string): boolean {
    return this.enabled && this.syncConfig.shouldTrackTable(tableName);
  }

  /**
   * Write a record to the public.sync_outbox table.
   * This is fire-and-forget — errors are logged but never thrown.
   */
  private async writeOutbox(
    tenantId: string,
    tableName: string,
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: Record<string, unknown>,
    previousPayload?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const client = await SyncOutboxService.pool.connect();
      try {
        await client.query(
          `INSERT INTO public.sync_outbox
            ("tenantId", "tableName", "recordId", operation, payload, "previousPayload", status, timestamp, "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())`,
          [
            tenantId,
            tableName,
            recordId,
            operation,
            JSON.stringify(payload),
            previousPayload ? JSON.stringify(previousPayload) : null,
          ],
        );
      } finally {
        client.release();
      }
    } catch (err) {
      // Never block the primary operation — log and move on
      this.logger.warn(
        `Failed to write sync outbox for ${operation} on ${tableName}#${recordId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
