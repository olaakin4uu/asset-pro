import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import {
  AuditTrailQueryDto,
  AuditTrailEntryDto,
  AuditTrailListDto,
  FieldChangeDto,
  AuditStatisticsDto,
  CompareVersionsDto,
  AuditAction,
  AuditEntityType,
} from '../dto/audit-trail.dto';

@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);

  constructor(private readonly prisma: TenantPrismaService) {}

  /**
   * Get audit trail entries with filtering and pagination
   */
  async getAuditTrail(
    query: AuditTrailQueryDto,
    tenantId: string,
  ): Promise<AuditTrailListDto> {
    this.logger.log(`Getting audit trail for tenant: ${tenantId}`);

    const page = query.page || 1;
    const limit = query.limit || 25;
    const skip = (page - 1) * limit;

    // Build where clause
    const conditions: string[] = ['al."deletedAt" IS NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.entityType) {
      conditions.push(`al."entityType" = $${paramIndex++}`);
      params.push(query.entityType);
    }

    if (query.entityId) {
      conditions.push(`al."entityId" = $${paramIndex++}`);
      params.push(query.entityId);
    }

    if (query.action) {
      conditions.push(`al.action = $${paramIndex++}`);
      params.push(query.action);
    }

    if (query.userId) {
      conditions.push(`al."userId" = $${paramIndex++}`);
      params.push(query.userId);
    }

    if (query.startDate) {
      conditions.push(`al.timestamp >= $${paramIndex++}`);
      params.push(new Date(query.startDate));
    }

    if (query.endDate) {
      conditions.push(`al.timestamp <= $${paramIndex++}`);
      params.push(new Date(query.endDate));
    }

    if (query.search) {
      conditions.push(`(al.description ILIKE $${paramIndex} OR al."entityReference" ILIKE $${paramIndex})`);
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get audit log entries
    const [entries, countResult] = await Promise.all([
      this.prisma.query<any>(
        `SELECT al.*, u.name as "userName", u.email as "userEmail"
         FROM audit_logs al
         LEFT JOIN users u ON al."userId" = u.id
         WHERE ${whereClause}
         ORDER BY al.timestamp DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, skip],
      ),
      this.prisma.queryOne<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM audit_logs al WHERE ${whereClause}`,
        params,
      ),
    ]);

    const total = parseInt(countResult?.count || '0');

    const data: AuditTrailEntryDto[] = entries.map((entry: any) => ({
      id: entry.id,
      entityType: entry.entityType as AuditEntityType,
      entityId: entry.entityId,
      entityReference: entry.entityReference || `${entry.entityType}-${entry.entityId}`,
      action: entry.action as AuditAction,
      userId: entry.userId,
      userName: entry.userName || 'Unknown User',
      userEmail: entry.userEmail || '',
      timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      description: entry.description || '',
      changes: this.extractFieldChanges(entry.oldData, entry.newData),
      oldData: entry.oldData,
      newData: entry.newData,
      metadata: entry.metadata as Record<string, any>,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityAuditTrail(
    entityType: AuditEntityType,
    entityId: number,
    tenantId: string,
  ): Promise<AuditTrailEntryDto[]> {
    this.logger.log(
      `Getting audit trail for ${entityType} ${entityId}`,
    );

    const entries = await this.prisma.query<any>(
      `SELECT al.*, u.name as "userName", u.email as "userEmail"
       FROM audit_logs al
       LEFT JOIN users u ON al."userId" = u.id
       WHERE al."entityType" = $1 AND al."entityId" = $2 AND al."deletedAt" IS NULL
       ORDER BY al.timestamp DESC`,
      [entityType, entityId],
    );

    return entries.map((entry: any) => ({
      id: entry.id,
      entityType: entry.entityType as AuditEntityType,
      entityId: entry.entityId,
      entityReference: entry.entityReference || `${entry.entityType}-${entry.entityId}`,
      action: entry.action as AuditAction,
      userId: entry.userId,
      userName: entry.userName || 'Unknown User',
      userEmail: entry.userEmail || '',
      timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      description: entry.description || '',
      changes: this.extractFieldChanges(entry.oldData, entry.newData),
      oldData: entry.oldData,
      newData: entry.newData,
      metadata: entry.metadata as Record<string, any>,
    }));
  }

  /**
   * Compare two versions of an entity
   */
  async compareVersions(
    entityType: AuditEntityType,
    entityId: number,
    timestamp1: string,
    timestamp2: string,
    tenantId: string,
  ): Promise<CompareVersionsDto> {
    this.logger.log(
      `Comparing versions for ${entityType} ${entityId}: ${timestamp1} vs ${timestamp2}`,
    );

    // Get the two audit entries closest to the timestamps
    const [version1Entry, version2Entry] = await Promise.all([
      this.prisma.queryOne<any>(
        `SELECT al.*, u.name as "userName"
         FROM audit_logs al
         LEFT JOIN users u ON al."userId" = u.id
         WHERE al."entityType" = $1 AND al."entityId" = $2 AND al.timestamp <= $3
         ORDER BY al.timestamp DESC LIMIT 1`,
        [entityType, entityId, new Date(timestamp1)],
      ),
      this.prisma.queryOne<any>(
        `SELECT al.*, u.name as "userName"
         FROM audit_logs al
         LEFT JOIN users u ON al."userId" = u.id
         WHERE al."entityType" = $1 AND al."entityId" = $2 AND al.timestamp <= $3
         ORDER BY al.timestamp DESC LIMIT 1`,
        [entityType, entityId, new Date(timestamp2)],
      ),
    ]);

    if (!version1Entry || !version2Entry) {
      throw new Error('Version not found');
    }

    const differences = this.extractFieldChanges(
      version1Entry.newData,
      version2Entry.newData,
    );

    return {
      version1Timestamp: version1Entry.timestamp instanceof Date ? version1Entry.timestamp.toISOString() : version1Entry.timestamp,
      version2Timestamp: version2Entry.timestamp instanceof Date ? version2Entry.timestamp.toISOString() : version2Entry.timestamp,
      differences,
      version1User: version1Entry.userName || 'Unknown',
      version2User: version2Entry.userName || 'Unknown',
    };
  }

  /**
   * Get audit statistics
   */
  async getStatistics(
    startDate?: string,
    endDate?: string,
    tenantId?: string,
  ): Promise<AuditStatisticsDto> {
    this.logger.log('Getting audit statistics');

    const conditions: string[] = ['"deletedAt" IS NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(new Date(startDate));
    }
    if (endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(new Date(endDate));
    }

    const whereClause = conditions.join(' AND ');

    // Get total entries
    const totalResult = await this.prisma.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM audit_logs WHERE ${whereClause}`,
      params,
    );
    const totalEntries = parseInt(totalResult?.count || '0');

    // Get action groups
    const actionGroups = await this.prisma.query<{ action: string; count: string }>(
      `SELECT action, COUNT(*)::text as count FROM audit_logs WHERE ${whereClause} GROUP BY action`,
      params,
    );

    // Get entity type groups
    const entityTypeGroups = await this.prisma.query<{ entityType: string; count: string }>(
      `SELECT "entityType", COUNT(*)::text as count FROM audit_logs WHERE ${whereClause} GROUP BY "entityType"`,
      params,
    );

    // Get top users
    const topUsers = await this.prisma.query<{ userId: number; count: string }>(
      `SELECT "userId", COUNT(*)::text as count FROM audit_logs WHERE ${whereClause} GROUP BY "userId" ORDER BY COUNT(*) DESC LIMIT 10`,
      params,
    );

    // Get user details for top users
    const userIds = topUsers.map((u) => u.userId);
    let userMap = new Map<number, string>();
    if (userIds.length > 0) {
      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
      const users = await this.prisma.query<{ id: number; name: string }>(
        `SELECT id, name FROM users WHERE id IN (${placeholders})`,
        userIds,
      );
      userMap = new Map(users.map((u) => [u.id, u.name]));
    }

    // Get changes by date
    const dailyCounts = await this.getChangesByDate(startDate, endDate);

    return {
      totalEntries,
      byAction: Object.fromEntries(
        actionGroups.map((g) => [g.action, parseInt(g.count)]),
      ) as Record<AuditAction, number>,
      byEntityType: Object.fromEntries(
        entityTypeGroups.map((g) => [g.entityType, parseInt(g.count)]),
      ) as Record<AuditEntityType, number>,
      mostActiveUsers: topUsers.map((u) => ({
        userId: u.userId,
        userName: userMap.get(u.userId) || `User ${u.userId}`,
        changeCount: parseInt(u.count),
      })),
      changesByDate: dailyCounts,
    };
  }

  /**
   * Create an audit log entry
   */
  async createAuditEntry(
    entityType: AuditEntityType,
    entityId: number,
    action: AuditAction,
    userId: number,
    oldData: any,
    newData: any,
    description: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    this.logger.log(
      `Creating audit entry: ${action} on ${entityType} ${entityId} by user ${userId}`,
    );

    await this.prisma.insert('audit_logs', {
      entityType,
      entityId,
      entityReference: `${entityType}-${entityId}`,
      action,
      userId,
      oldData: oldData ? JSON.stringify(oldData) : '{}',
      newData: newData ? JSON.stringify(newData) : '{}',
      description,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      metadata: metadata ? JSON.stringify(metadata) : '{}',
      timestamp: new Date(),
    });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Extract field-level changes between old and new data
   */
  private extractFieldChanges(oldData: any, newData: any): FieldChangeDto[] {
    const changes: FieldChangeDto[] = [];

    if (!oldData && !newData) {
      return changes;
    }

    // Parse JSON if needed
    const parsedOld = typeof oldData === 'string' ? JSON.parse(oldData) : (oldData || {});
    const parsedNew = typeof newData === 'string' ? JSON.parse(newData) : (newData || {});

    const allKeys = new Set([
      ...Object.keys(parsedOld),
      ...Object.keys(parsedNew),
    ]);

    for (const key of allKeys) {
      const oldValue = parsedOld[key];
      const newValue = parsedNew[key];

      // Skip if values are the same
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
        continue;
      }

      // Skip internal fields
      if (
        ['id', 'createdAt', 'updatedAt', 'tenantId', 'deletedAt'].includes(key)
      ) {
        continue;
      }

      changes.push({
        fieldName: key,
        fieldLabel: this.fieldNameToLabel(key),
        oldValue,
        newValue,
        dataType: typeof newValue || typeof oldValue,
      });
    }

    return changes;
  }

  /**
   * Convert field name to display label
   */
  private fieldNameToLabel(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Get changes grouped by date for the last 30 days
   */
  private async getChangesByDate(
    startDate?: string,
    endDate?: string,
  ): Promise<Record<string, number>> {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const entries = await this.prisma.query<{ date: string; count: string }>(
      `SELECT DATE(timestamp)::text as date, COUNT(*)::text as count
       FROM audit_logs
       WHERE timestamp >= $1 AND timestamp <= $2 AND "deletedAt" IS NULL
       GROUP BY DATE(timestamp)
       ORDER BY DATE(timestamp)`,
      [start, end],
    );

    const countsByDate: Record<string, number> = {};
    for (const entry of entries) {
      countsByDate[entry.date] = parseInt(entry.count);
    }

    return countsByDate;
  }
}
