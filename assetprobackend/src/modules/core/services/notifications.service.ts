import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import {
  NotificationQueryDto,
  NotificationResponseDto,
  UnreadCountDto,
  PaginatedNotificationsDto,
} from '../dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  /**
   * Get notifications for a user
   */
  async findAll(userId: number, companyId: number, query: NotificationQueryDto): Promise<PaginatedNotificationsDto> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE n."notifiableType" = 'User' AND n."notifiableId" = $1`;
    const params: any[] = [userId];
    let paramIndex = 2;

    // Optionally filter by company
    if (companyId) {
      whereClause += ` AND (n."companyId" = $${paramIndex} OR n."companyId" IS NULL)`;
      params.push(companyId);
      paramIndex++;
    }

    if (query.type) {
      whereClause += ` AND n.type = $${paramIndex}`;
      params.push(query.type);
      paramIndex++;
    }

    if (query.isRead === 'true') {
      whereClause += ` AND n."readAt" IS NOT NULL`;
    } else if (query.isRead === 'false') {
      whereClause += ` AND n."readAt" IS NULL`;
    }

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM notifications n ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || '0');

    params.push(limit, offset);
    const notifications = await this.tenantPrisma.query<any>(
      `SELECT n.* FROM notifications n
       ${whereClause}
       ORDER BY n."createdAt" DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params,
    );

    return {
      data: notifications.map((n: any) => this.mapToResponse(n)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: number, companyId: number): Promise<UnreadCountDto> {
    const result = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM notifications
       WHERE "notifiableType" = 'User' AND "notifiableId" = $1
         AND "readAt" IS NULL
         AND ("companyId" = $2 OR "companyId" IS NULL)`,
      [userId, companyId],
    );

    return {
      count: parseInt(result?.count || '0'),
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: number, id: string): Promise<NotificationResponseDto> {
    const notification = await this.tenantPrisma.queryOne<any>(
      `SELECT * FROM notifications WHERE id = $1 AND "notifiableType" = 'User' AND "notifiableId" = $2`,
      [id, userId],
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.tenantPrisma.update('notifications', id, { readAt: new Date() });

    return this.mapToResponse({ ...notification, readAt: new Date() });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: number, companyId: number): Promise<{ count: number }> {
    const result = await this.tenantPrisma.query<any>(
      `UPDATE notifications SET "readAt" = NOW(), "updatedAt" = NOW()
       WHERE "notifiableType" = 'User' AND "notifiableId" = $1
         AND "readAt" IS NULL
         AND ("companyId" = $2 OR "companyId" IS NULL)
       RETURNING id`,
      [userId, companyId],
    );

    return { count: result.length };
  }

  /**
   * Delete a notification
   */
  async delete(userId: number, id: string): Promise<void> {
    const notification = await this.tenantPrisma.queryOne<{ id: string }>(
      `SELECT id FROM notifications WHERE id = $1 AND "notifiableType" = 'User' AND "notifiableId" = $2`,
      [id, userId],
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.tenantPrisma.delete('notifications', id);
  }

  /**
   * Map database record to response DTO
   */
  private mapToResponse(notification: any): NotificationResponseDto {
    const data = typeof notification.data === 'string'
      ? JSON.parse(notification.data)
      : notification.data || {};

    return {
      id: notification.id,
      type: notification.type,
      title: data.title || notification.type || 'Notification',
      message: data.message || '',
      isRead: !!notification.readAt,
      notifiableType: notification.notifiableType,
      notifiableId: notification.notifiableId,
      data,
      readAt: notification.readAt?.toISOString?.() || notification.readAt,
      companyId: notification.companyId,
      createdAt: notification.createdAt?.toISOString?.() || notification.createdAt,
      updatedAt: notification.updatedAt?.toISOString?.() || notification.updatedAt,
    };
  }
}
