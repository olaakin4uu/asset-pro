import { Injectable, Scope, Inject, Logger, Optional } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';
import { Request } from 'express';
import { SyncOutboxService } from '../middleware/sync-outbox.middleware';

export interface TenantRequest extends Request {
  tenantSlug?: string;
  tenantId?: string;
  schemaName?: string;
}

/**
 * TenantPrismaService - Request-scoped service for tenant database operations
 *
 * This service provides access to tenant-specific database schema.
 * It's scoped to REQUEST so each request gets its own connection to the correct tenant schema.
 *
 * IMPORTANT: All non-transaction queries acquire and release a PoolClient per call
 * to prevent connection pool exhaustion (REQUEST-scoped providers don't get
 * per-request lifecycle hooks in NestJS).
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  private readonly logger = new Logger(TenantPrismaService.name);
  private static pool: Pool;
  private schemaName: string | null = null;

  constructor(
    @Inject(REQUEST) private request: TenantRequest,
    private configService: ConfigService,
    @Optional() private syncOutbox?: SyncOutboxService,
  ) {
    // Initialize static pool if not exists
    if (!TenantPrismaService.pool) {
      TenantPrismaService.pool = new Pool({
        connectionString: this.configService.get('DATABASE_URL'),
        max: 15, // DO managed DB has max_connections=25; 15 leaves room for other services
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }
  }

  /**
   * Sanitize schema name to prevent SQL injection
   */
  private sanitizeSchemaName(slug: string): string {
    return `tenant_${slug.replace(/[^a-z0-9]/gi, '_')}`;
  }

  /**
   * Resolve schema name from various sources
   */
  private resolveSchemaName(): string | null {
    if (this.schemaName) {
      return this.schemaName;
    }

    // Try to get from request (set by middleware)
    if (this.request.schemaName) {
      return this.request.schemaName;
    }

    if (this.request.tenantSlug) {
      return this.sanitizeSchemaName(this.request.tenantSlug);
    }

    // Try to get from user object (set by JWT guard after constructor)
    const user = (this.request as any).user;
    if (user?.tenantSlug) {
      return this.sanitizeSchemaName(user.tenantSlug);
    }

    return null;
  }

  /**
   * Ensure schema name is resolved, throwing if not available
   */
  private ensureSchemaName(): string {
    if (!this.schemaName) {
      this.schemaName = this.resolveSchemaName();
    }

    if (!this.schemaName) {
      throw new Error('Tenant schema not set. Ensure request has tenantSlug or authenticated user.');
    }

    return this.schemaName;
  }

  /**
   * Acquire a client, set the tenant schema, run the callback, and always release.
   * This pattern prevents connection pool exhaustion.
   */
  private async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const schema = this.ensureSchemaName();
    const client = await TenantPrismaService.pool.connect();
    try {
      await client.query(`SET search_path TO "${schema}"`);
      return await fn(client);
    } finally {
      client.release();
    }
  }

  /**
   * Get a database client with the tenant's schema set.
   * IMPORTANT: Caller is responsible for releasing the client.
   * Prefer using query/queryOne/insert/update/etc. methods instead.
   */
  async getClient(): Promise<PoolClient> {
    const schema = this.ensureSchemaName();
    const client = await TenantPrismaService.pool.connect();
    await client.query(`SET search_path TO "${schema}"`);
    return client;
  }

  /**
   * Release a client back to the pool (for use with getClient)
   */
  releaseClient(client: PoolClient): void {
    client.release();
  }

  /** Replace JS NaN with null so pg driver never serialises it as the string "NaN". */
  private sanitizeParams(params?: any[]): any[] | undefined {
    if (!params) return params;
    return params.map(v => (typeof v === 'number' && !Number.isFinite(v)) ? null : v);
  }

  /**
   * Execute a query with automatic schema context
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return this.withClient(async (client) => {
      const result = await client.query(sql, this.sanitizeParams(params));
      return result.rows as T[];
    });
  }

  /**
   * Alias for query() — execute a query and return array of results
   */
  async queryMany<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return this.query<T>(sql, params);
  }

  /**
   * Execute a statement without returning results (INSERT/UPDATE/DELETE)
   */
  async execute(sql: string, params?: any[]): Promise<void> {
    await this.query(sql, params);
  }

  /**
   * Execute a query and return single result
   */
  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] || null;
  }

  /**
   * Execute an insert and return the inserted row
   */
  async insert<T = any>(table: string, data: Record<string, any>): Promise<T> {
    const now = new Date();
    const withTimestamps = { ...data };
    if (!('createdAt' in withTimestamps)) {
      withTimestamps.createdAt = now;
    }
    if (!('updatedAt' in withTimestamps)) {
      withTimestamps.updatedAt = now;
    }

    const keys = Object.keys(withTimestamps);
    const values = Object.values(withTimestamps);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map(k => `"${k}"`).join(', ');

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.query<T>(sql, values);
    const row = result[0];

    // Track for sync outbox (fire-and-forget)
    if (this.syncOutbox?.isEnabled() && row) {
      const tenantId = this.request.tenantId ?? this.request.tenantSlug ?? '';
      const recordId = String((row as Record<string, unknown>).id ?? 'unknown');
      this.syncOutbox.trackInsert(tenantId, table, recordId, row as Record<string, unknown>);
    }

    return row;
  }

  /**
   * Execute an update and return the updated row
   */
  async update<T = any>(
    table: string,
    id: number | string,
    data: Record<string, any>,
    idColumn = 'id',
  ): Promise<T | null> {
    // Strip updatedAt (auto-appended as NOW()) and undefined values
    // (undefined keys would land in the SET clause as NULL in PostgreSQL)
    const { updatedAt: _ignored, ...rawData } = data;
    const cleanData = Object.fromEntries(
      Object.entries(rawData).filter(([, v]) => v !== undefined),
    );
    const keys = Object.keys(cleanData);
    const values = Object.values(cleanData);
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');

    // If cleanData is empty (caller passed only {updatedAt}, or passed
    // nothing other than what we strip), emit a SET with just "updatedAt".
    // Without this guard, the SQL ended up as `SET , "updatedAt" = NOW()`
    // — a stray leading comma that produces a Postgres "syntax error at
    // or near ','". Reported by the sales E2E submit flow calling this
    // with only finalize fields the service doesn't consume into
    // updateData. Any caller that sends no updatable fields still gets
    // a harmless timestamp bump.
    const sql = keys.length === 0
      ? `UPDATE ${table} SET "updatedAt" = NOW() WHERE "${idColumn}" = $1 RETURNING *`
      : `UPDATE ${table} SET ${setClause}, "updatedAt" = NOW() WHERE "${idColumn}" = $${keys.length + 1} RETURNING *`;
    const params = keys.length === 0 ? [id] : [...values, id];
    const result = await this.query<T>(sql, params);
    const row = result[0] || null;

    // Track for sync outbox (fire-and-forget)
    if (this.syncOutbox?.isEnabled() && row) {
      const tenantId = this.request.tenantId ?? this.request.tenantSlug ?? '';
      this.syncOutbox.trackUpdate(tenantId, table, String(id), row as Record<string, unknown>);
    }

    return row;
  }

  /**
   * Soft delete a record
   */
  async softDelete<T = any>(
    table: string,
    id: number | string,
    idColumn = 'id',
  ): Promise<T | null> {
    const sql = `UPDATE ${table} SET "deletedAt" = NOW(), "updatedAt" = NOW() WHERE "${idColumn}" = $1 RETURNING *`;
    const result = await this.query<T>(sql, [id]);
    const row = result[0] || null;

    // Track as DELETE for sync outbox (soft deletes are logically deletes)
    if (this.syncOutbox?.isEnabled() && row) {
      const tenantId = this.request.tenantId ?? this.request.tenantSlug ?? '';
      this.syncOutbox.trackDelete(tenantId, table, String(id), row as Record<string, unknown>);
    }

    return row;
  }

  /**
   * Hard delete a record
   */
  async delete(
    table: string,
    id: number | string,
    idColumn = 'id',
  ): Promise<boolean> {
    // Fetch record before deletion for sync outbox tracking
    let previousRecord: Record<string, unknown> | undefined;
    if (this.syncOutbox?.isEnabled()) {
      const existing = await this.queryOne<Record<string, unknown>>(
        `SELECT * FROM ${table} WHERE "${idColumn}" = $1`,
        [id],
      );
      if (existing) previousRecord = existing;
    }

    const deleted = await this.withClient(async (client) => {
      const sql = `DELETE FROM ${table} WHERE "${idColumn}" = $1`;
      const result = await client.query(sql, [id]);
      return (result.rowCount ?? 0) > 0;
    });

    // Track for sync outbox (fire-and-forget)
    if (this.syncOutbox?.isEnabled() && deleted) {
      const tenantId = this.request.tenantId ?? this.request.tenantSlug ?? '';
      this.syncOutbox.trackDelete(tenantId, table, String(id), previousRecord);
    }

    return deleted;
  }

  /**
   * Find one record by ID
   */
  async findById<T = any>(
    table: string,
    id: number | string,
    idColumn = 'id',
  ): Promise<T | null> {
    const sql = `SELECT * FROM ${table} WHERE "${idColumn}" = $1 AND "deletedAt" IS NULL LIMIT 1`;
    return this.queryOne<T>(sql, [id]);
  }

  /**
   * Find all records with optional filters
   */
  async findAll<T = any>(
    table: string,
    options: {
      where?: Record<string, any>;
      orderBy?: string;
      order?: 'ASC' | 'DESC';
      limit?: number;
      offset?: number;
      includeDeleted?: boolean;
    } = {},
  ): Promise<T[]> {
    const { where = {}, orderBy = 'id', order = 'DESC', limit, offset, includeDeleted = false } = options;

    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];
    const conditions: string[] = [];

    // Add where conditions
    Object.entries(where).forEach(([key, value], index) => {
      if (value !== undefined) {
        conditions.push(`"${key}" = $${index + 1}`);
        params.push(value);
      }
    });

    // Add soft delete filter
    if (!includeDeleted) {
      conditions.push(`"deletedAt" IS NULL`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY "${orderBy}" ${order}`;

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    if (offset) {
      sql += ` OFFSET ${offset}`;
    }

    return this.query<T>(sql, params);
  }

  /**
   * Count records with optional filters
   */
  async count(
    table: string,
    where: Record<string, any> = {},
    includeDeleted = false,
  ): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const params: any[] = [];
    const conditions: string[] = [];

    Object.entries(where).forEach(([key, value], index) => {
      if (value !== undefined) {
        conditions.push(`"${key}" = $${index + 1}`);
        params.push(value);
      }
    });

    if (!includeDeleted) {
      conditions.push(`"deletedAt" IS NULL`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.queryOne<{ count: string }>(sql, params);
    return parseInt(result?.count || '0', 10);
  }

  /**
   * Execute a transaction. The client is acquired at start and released
   * after commit or rollback.
   *
   * @param fn - Callback receiving the client
   * @param options - Optional: { isolationLevel: 'SERIALIZABLE' | 'REPEATABLE READ' | 'READ COMMITTED' }
   */
  async transaction<T>(
    fn: (client: PoolClient) => Promise<T>,
    options?: { isolationLevel?: 'SERIALIZABLE' | 'REPEATABLE READ' | 'READ COMMITTED' },
  ): Promise<T> {
    const schema = this.ensureSchemaName();
    const client = await TenantPrismaService.pool.connect();
    try {
      await client.query(`SET search_path TO "${schema}"`);
      if (options?.isolationLevel) {
        await client.query(`BEGIN ISOLATION LEVEL ${options.isolationLevel}`);
      } else {
        await client.query('BEGIN');
      }
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get current schema name
   */
  getSchemaName(): string | null {
    return this.schemaName;
  }

  /**
   * Set schema name manually (for background jobs, etc.)
   */
  setSchemaName(slug: string): void {
    this.schemaName = this.sanitizeSchemaName(slug);
  }
}
