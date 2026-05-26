import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import {
  AuditLogQueryDto,
  AuditLogResponseDto,
  AuditLogListResponseDto,
  AuditLogStatsDto,
  AuditLogEntityTypeDto,
  AuditLogUserDto,
  AuditChangeDto,
} from '../dto';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  /**
   * Get all audit logs with pagination and filters
   */
  async findAll(query: AuditLogQueryDto): Promise<AuditLogListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT a.*,
             u.id as "user_id",
             u.name as "user_name",
             u.email as "user_email"
      FROM audits a
      LEFT JOIN users u ON a."userId" = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (query.search) {
      sql += ` AND (a."auditableType" ILIKE $${paramIndex} OR a.event ILIKE $${paramIndex} OR a.tags ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    if (query.event) {
      sql += ` AND a.event = $${paramIndex++}`;
      params.push(query.event);
    }

    if (query.entityType) {
      sql += ` AND a."auditableType" ILIKE $${paramIndex++}`;
      params.push(`%${query.entityType}%`);
    }

    if (query.userId) {
      sql += ` AND a."userId" = $${paramIndex++}`;
      params.push(query.userId);
    }

    if (query.dateFrom) {
      sql += ` AND a."createdAt" >= $${paramIndex++}`;
      params.push(new Date(query.dateFrom));
    }

    if (query.dateTo) {
      sql += ` AND a."createdAt" <= $${paramIndex++}`;
      params.push(new Date(query.dateTo + ' 23:59:59'));
    }

    sql += ` ORDER BY a."createdAt" DESC`;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const audits = await this.tenantPrisma.query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM audits a WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (query.search) {
      countSql += ` AND (a."auditableType" ILIKE $${countParamIndex} OR a.event ILIKE $${countParamIndex} OR a.tags ILIKE $${countParamIndex})`;
      countParams.push(`%${query.search}%`);
      countParamIndex++;
    }

    if (query.event) {
      countSql += ` AND a.event = $${countParamIndex++}`;
      countParams.push(query.event);
    }

    if (query.entityType) {
      countSql += ` AND a."auditableType" ILIKE $${countParamIndex++}`;
      countParams.push(`%${query.entityType}%`);
    }

    if (query.userId) {
      countSql += ` AND a."userId" = $${countParamIndex++}`;
      countParams.push(query.userId);
    }

    if (query.dateFrom) {
      countSql += ` AND a."createdAt" >= $${countParamIndex++}`;
      countParams.push(new Date(query.dateFrom));
    }

    if (query.dateTo) {
      countSql += ` AND a."createdAt" <= $${countParamIndex++}`;
      countParams.push(new Date(query.dateTo + ' 23:59:59'));
    }

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(countSql, countParams);
    const total = parseInt(countResult?.count || '0', 10);
    const totalPages = Math.ceil(total / limit);

    return {
      data: audits.map((audit) => this.mapToResponse(audit)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get a single audit log by ID with navigation
   */
  async findOne(id: number): Promise<AuditLogResponseDto> {
    const sql = `
      SELECT a.*,
             u.id as "user_id",
             u.name as "user_name",
             u.email as "user_email"
      FROM audits a
      LEFT JOIN users u ON a."userId" = u.id
      WHERE a.id = $1
    `;

    const audit = await this.tenantPrisma.queryOne(sql, [id]);

    if (!audit) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    // Get previous audit (same entity, earlier ID)
    const prevSql = `
      SELECT id
      FROM audits
      WHERE "auditableType" = $1
        AND "auditableId" = $2
        AND id < $3
      ORDER BY id DESC
      LIMIT 1
    `;
    const previousAudit = await this.tenantPrisma.queryOne<{ id: number }>(prevSql, [
      audit.auditableType,
      audit.auditableId,
      id,
    ]);

    // Get next audit (same entity, later ID)
    const nextSql = `
      SELECT id
      FROM audits
      WHERE "auditableType" = $1
        AND "auditableId" = $2
        AND id > $3
      ORDER BY id ASC
      LIMIT 1
    `;
    const nextAudit = await this.tenantPrisma.queryOne<{ id: number }>(nextSql, [
      audit.auditableType,
      audit.auditableId,
      id,
    ]);

    const response = this.mapToResponse(audit);
    response.previousAuditId = previousAudit?.id || null;
    response.nextAuditId = nextAudit?.id || null;

    return response;
  }

  /**
   * Get audit log statistics
   */
  async getStats(): Promise<AuditLogStatsDto> {
    const sql = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE DATE("createdAt") = CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE "createdAt" >= DATE_TRUNC('week', CURRENT_DATE)) as "thisWeek",
        COUNT(*) FILTER (WHERE event = 'created') as created,
        COUNT(*) FILTER (WHERE event = 'updated') as updated,
        COUNT(*) FILTER (WHERE event = 'deleted') as deleted
      FROM audits
    `;

    const stats = await this.tenantPrisma.queryOne(sql, []);

    return {
      total: parseInt(stats?.total || '0', 10),
      today: parseInt(stats?.today || '0', 10),
      thisWeek: parseInt(stats?.thisWeek || '0', 10),
      created: parseInt(stats?.created || '0', 10),
      updated: parseInt(stats?.updated || '0', 10),
      deleted: parseInt(stats?.deleted || '0', 10),
    };
  }

  /**
   * Get unique entity types
   */
  async getEntityTypes(): Promise<AuditLogEntityTypeDto[]> {
    const sql = `
      SELECT DISTINCT "auditableType"
      FROM audits
      ORDER BY "auditableType"
    `;

    const types = await this.tenantPrisma.query(sql, []);

    return types.map((type) => {
      const fullType = type.auditableType;
      const shortType = fullType.split('\\').pop() || fullType;

      return {
        value: shortType,
        label: shortType,
        full: fullType,
      };
    });
  }

  /**
   * Get users who have audit entries
   */
  async getUsers(): Promise<AuditLogUserDto[]> {
    const sql = `
      SELECT DISTINCT u.id, u.name
      FROM audits a
      INNER JOIN users u ON a."userId" = u.id
      WHERE u."deletedAt" IS NULL
      ORDER BY u.name
    `;

    const users = await this.tenantPrisma.query(sql, []);

    return users.map((user) => ({
      id: user.id,
      name: user.name,
    }));
  }

  /**
   * Get audit history for a specific entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: number,
    query?: { page?: number; limit?: number },
  ): Promise<AuditLogListResponseDto> {
    const page = query?.page || 1;
    const limit = query?.limit || 25;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT a.*,
             u.id as "user_id",
             u.name as "user_name",
             u.email as "user_email"
      FROM audits a
      LEFT JOIN users u ON a."userId" = u.id
      WHERE a."auditableType" ILIKE $1
        AND a."auditableId" = $2
      ORDER BY a."createdAt" DESC
      LIMIT $3 OFFSET $4
    `;

    const audits = await this.tenantPrisma.query(sql, [
      `%${entityType}%`,
      entityId,
      limit,
      offset,
    ]);

    // Get total count
    const countSql = `
      SELECT COUNT(*) as count
      FROM audits
      WHERE "auditableType" ILIKE $1
        AND "auditableId" = $2
    `;

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(countSql, [
      `%${entityType}%`,
      entityId,
    ]);
    const total = parseInt(countResult?.count || '0', 10);
    const totalPages = Math.ceil(total / limit);

    return {
      data: audits.map((audit) => this.mapToResponse(audit)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Export audit logs to CSV format
   */
  async exportCsv(query?: AuditLogQueryDto): Promise<string> {
    let sql = `
      SELECT a.*,
             u.name as "user_name"
      FROM audits a
      LEFT JOIN users u ON a."userId" = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters (same as findAll)
    if (query?.event) {
      sql += ` AND a.event = $${paramIndex++}`;
      params.push(query.event);
    }

    if (query?.entityType) {
      sql += ` AND a."auditableType" ILIKE $${paramIndex++}`;
      params.push(`%${query.entityType}%`);
    }

    if (query?.userId) {
      sql += ` AND a."userId" = $${paramIndex++}`;
      params.push(query.userId);
    }

    if (query?.dateFrom) {
      sql += ` AND a."createdAt" >= $${paramIndex++}`;
      params.push(new Date(query.dateFrom));
    }

    if (query?.dateTo) {
      sql += ` AND a."createdAt" <= $${paramIndex++}`;
      params.push(new Date(query.dateTo + ' 23:59:59'));
    }

    sql += ` ORDER BY a."createdAt" DESC LIMIT 10000`;

    const audits = await this.tenantPrisma.query(sql, params);

    // Build CSV content
    const headers = ['ID', 'Date/Time', 'User', 'Event', 'Entity Type', 'Entity ID', 'IP Address', 'URL'];
    const rows = audits.map((audit) => {
      const createdAt = new Date(audit.createdAt);
      const entityType = this.extractEntityType(audit.auditableType);

      return [
        audit.id,
        createdAt.toISOString(),
        audit.user_name || 'System',
        audit.event,
        entityType,
        audit.auditableId,
        audit.ipAddress || '',
        audit.url || '',
      ];
    });

    // Convert to CSV string
    const csvLines = [
      headers.map(this.escapeCsvValue).join(','),
      ...rows.map((row) => row.map(this.escapeCsvValue).join(',')),
    ];

    return csvLines.join('\n');
  }

  /**
   * Escape CSV value
   */
  private escapeCsvValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * Map database record to response DTO
   */
  private mapToResponse(audit: any): AuditLogResponseDto {
    const eventLabel = this.getEventLabel(audit.event);
    const eventColor = this.getEventColor(audit.event);
    const auditableTypeLabel = this.extractEntityType(audit.auditableType);
    const changes = this.calculateChanges(audit.oldValues, audit.newValues);

    // Format dates
    const createdAt = new Date(audit.createdAt);
    const createdAtFormatted = createdAt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const createdAtRelative = this.getRelativeTime(createdAt);
    const createdAtDate = createdAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const createdAtTime = createdAt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // User initials
    const initials = audit.user_name
      ? audit.user_name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'SY';

    return {
      id: audit.id,
      event: audit.event,
      eventLabel,
      eventColor,
      auditableType: audit.auditableType,
      auditableTypeLabel,
      auditableId: audit.auditableId,
      userId: audit.userId,
      user: audit.user_id
        ? {
            id: audit.user_id,
            name: audit.user_name,
            email: audit.user_email,
            initials,
          }
        : null,
      userName: audit.user_name || 'System',
      oldValues: audit.oldValues,
      newValues: audit.newValues,
      changes,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
      userAgentShort: this.shortenUserAgent(audit.userAgent),
      url: audit.url,
      tags: audit.tags,
      companyId: audit.companyId,
      branchId: audit.branchId,
      createdAt: audit.createdAt,
      createdAtFormatted,
      createdAtRelative,
      createdAtDate,
      createdAtTime,
    };
  }

  /**
   * Get event label
   */
  private getEventLabel(event: string): string {
    const labels: Record<string, string> = {
      created: 'Created',
      updated: 'Updated',
      deleted: 'Deleted',
      restored: 'Restored',
    };
    return labels[event] || event;
  }

  /**
   * Get event color
   */
  private getEventColor(event: string): string {
    const colors: Record<string, string> = {
      created: 'green',
      updated: 'blue',
      deleted: 'red',
      restored: 'purple',
    };
    return colors[event] || 'gray';
  }

  /**
   * Extract entity type from full class path
   */
  private extractEntityType(fullType: string): string {
    return fullType.split('\\').pop() || fullType;
  }

  /**
   * Calculate changes between old and new values
   */
  private calculateChanges(oldValues: any, newValues: any): AuditChangeDto[] {
    if (!oldValues && !newValues) return [];

    const changes: AuditChangeDto[] = [];
    const allKeys = new Set([
      ...Object.keys(oldValues || {}),
      ...Object.keys(newValues || {}),
    ]);

    for (const key of allKeys) {
      // Skip metadata fields
      if (['id', 'createdAt', 'updatedAt', 'deletedAt', 'createdById', 'updatedById'].includes(key)) {
        continue;
      }

      const oldVal = oldValues?.[key];
      const newVal = newValues?.[key];

      if (oldVal === newVal) continue;

      const change: AuditChangeDto = {
        field: key,
        fieldLabel: this.formatFieldLabel(key),
        oldValue: this.formatValue(oldVal),
        newValue: this.formatValue(newVal),
        type: oldVal === undefined ? 'added' : newVal === undefined ? 'removed' : 'modified',
      };

      changes.push(change);
    }

    return changes;
  }

  /**
   * Format value for display
   */
  private formatValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Boolean values
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    // Array values
    if (Array.isArray(value)) {
      return JSON.stringify(value, null, 2);
    }

    // Object values
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return value;
  }

  /**
   * Format field name to human-readable label
   */
  private formatFieldLabel(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get relative time string
   */
  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
    const years = Math.floor(diffDays / 365);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }

  /**
   * Shorten user agent string
   */
  private shortenUserAgent(userAgent: string | null): string | null {
    if (!userAgent) return null;

    // Extract browser and OS
    const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
    const oses = ['Windows', 'Mac OS', 'Linux', 'Android', 'iOS'];

    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    for (const b of browsers) {
      if (userAgent.includes(b)) {
        browser = b;
        break;
      }
    }

    for (const o of oses) {
      if (userAgent.includes(o)) {
        os = o;
        break;
      }
    }

    return `${browser} on ${os}`;
  }
}
