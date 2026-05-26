import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import {
  CreateMessageDto,
  ReplyMessageDto,
  MessageQueryDto,
  MessageResponseDto,
  PaginatedMessagesDto,
  MessagePriority,
  RecipientType,
} from '../dto';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  /**
   * Send a new message (or save as draft)
   */
  async create(companyId: number, senderId: number, dto: CreateMessageDto): Promise<MessageResponseDto> {
    const isDraft = dto.isDraft ?? false;

    const message = await this.tenantPrisma.insert<any>('messages', {
      companyId,
      senderId,
      subject: dto.subject,
      body: dto.body,
      bodyHtml: dto.bodyHtml || null,
      priority: dto.priority || MessagePriority.NORMAL,
      referenceableType: dto.referenceableType || null,
      referenceableId: dto.referenceableId || null,
      isDraft,
      sentAt: isDraft ? null : new Date(),
    });

    // Insert recipients
    for (const recipient of dto.recipients) {
      await this.tenantPrisma.insert('message_recipients', {
        messageId: message.id,
        recipientId: recipient.recipientId,
        recipientType: recipient.recipientType || RecipientType.TO,
      });
    }

    return this.findOne(companyId, senderId, message.id);
  }

  /**
   * Reply to a message
   */
  async reply(companyId: number, senderId: number, parentId: number, dto: ReplyMessageDto): Promise<MessageResponseDto> {
    // Get parent message
    const parent = await this.tenantPrisma.queryOne<any>(
      `SELECT * FROM messages WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [parentId, companyId],
    );

    if (!parent) {
      throw new NotFoundException('Original message not found');
    }

    const replyMessage = await this.tenantPrisma.insert<any>('messages', {
      companyId,
      senderId,
      subject: parent.subject.startsWith('Re: ') ? parent.subject : `Re: ${parent.subject}`,
      body: dto.body,
      bodyHtml: dto.bodyHtml || null,
      priority: parent.priority,
      referenceableType: parent.referenceableType,
      referenceableId: parent.referenceableId,
      parentId,
      isDraft: false,
      sentAt: new Date(),
    });

    // Add original sender as recipient
    await this.tenantPrisma.insert('message_recipients', {
      messageId: replyMessage.id,
      recipientId: parent.senderId,
      recipientType: RecipientType.TO,
    });

    // Add additional recipients if provided
    if (dto.additionalRecipients) {
      for (const recipient of dto.additionalRecipients) {
        // Avoid duplicate
        if (recipient.recipientId !== parent.senderId) {
          await this.tenantPrisma.insert('message_recipients', {
            messageId: replyMessage.id,
            recipientId: recipient.recipientId,
            recipientType: recipient.recipientType || RecipientType.TO,
          });
        }
      }
    }

    return this.findOne(companyId, senderId, replyMessage.id);
  }

  /**
   * Get inbox (messages received by user)
   */
  async getInbox(companyId: number, userId: number, query: MessageQueryDto): Promise<PaginatedMessagesDto> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE mr."recipientId" = $1 AND m."companyId" = $2 AND m."deletedAt" IS NULL AND mr."deletedAt" IS NULL AND m."isDraft" = false`;
    const params: any[] = [userId, companyId];
    let paramIndex = 3;

    if (query.search) {
      whereClause += ` AND (m.subject ILIKE $${paramIndex} OR m.body ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    if (query.priority) {
      whereClause += ` AND m.priority = $${paramIndex}`;
      params.push(query.priority);
      paramIndex++;
    }

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM messages m
       INNER JOIN message_recipients mr ON mr."messageId" = m.id
       ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || '0');

    params.push(limit, offset);
    const messages = await this.tenantPrisma.query<any>(
      `SELECT m.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as sender,
        mr."readAt", mr."starredAt"
       FROM messages m
       INNER JOIN message_recipients mr ON mr."messageId" = m.id
       LEFT JOIN users u ON u.id = m."senderId"
       ${whereClause}
       ORDER BY m."sentAt" DESC NULLS LAST, m.id DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params,
    );

    return {
      data: messages.map((m: any) => this.mapToResponse(m)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get sent messages
   */
  async getSent(companyId: number, userId: number, query: MessageQueryDto): Promise<PaginatedMessagesDto> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE m."senderId" = $1 AND m."companyId" = $2 AND m."deletedAt" IS NULL AND m."isDraft" = false`;
    const params: any[] = [userId, companyId];
    let paramIndex = 3;

    if (query.search) {
      whereClause += ` AND (m.subject ILIKE $${paramIndex} OR m.body ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM messages m ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || '0');

    params.push(limit, offset);
    const messages = await this.tenantPrisma.query<any>(
      `SELECT m.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as sender
       FROM messages m
       LEFT JOIN users u ON u.id = m."senderId"
       ${whereClause}
       ORDER BY m."sentAt" DESC NULLS LAST, m.id DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params,
    );

    return {
      data: messages.map((m: any) => this.mapToResponse(m)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get draft messages
   */
  async getDrafts(companyId: number, userId: number, query: MessageQueryDto): Promise<PaginatedMessagesDto> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE m."senderId" = $1 AND m."companyId" = $2 AND m."deletedAt" IS NULL AND m."isDraft" = true`;
    const params: any[] = [userId, companyId];
    let paramIndex = 3;

    if (query.search) {
      whereClause += ` AND (m.subject ILIKE $${paramIndex} OR m.body ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM messages m ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || '0');

    params.push(limit, offset);
    const messages = await this.tenantPrisma.query<any>(
      `SELECT m.* FROM messages m
       ${whereClause}
       ORDER BY m."updatedAt" DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params,
    );

    return {
      data: messages.map((m: any) => this.mapToResponse(m)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single message by ID with recipients and replies
   */
  async findOne(companyId: number, userId: number, id: number): Promise<MessageResponseDto> {
    const message = await this.tenantPrisma.queryOne<any>(
      `SELECT m.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as sender
       FROM messages m
       LEFT JOIN users u ON u.id = m."senderId"
       WHERE m.id = $1 AND m."companyId" = $2 AND m."deletedAt" IS NULL`,
      [id, companyId],
    );

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Get recipients
    const recipients = await this.tenantPrisma.query<any>(
      `SELECT mr.*,
        json_build_object('id', e.id, 'name', CONCAT(e."firstName", ' ', e."lastName"), 'email', e.email) as recipient
       FROM message_recipients mr
       LEFT JOIN employees e ON e.id = mr."recipientId"
       WHERE mr."messageId" = $1 AND mr."deletedAt" IS NULL
       ORDER BY mr."recipientType", mr.id`,
      [id],
    );

    // Get replies
    const replies = await this.tenantPrisma.query<any>(
      `SELECT r.*,
        json_build_object('id', u.id, 'name', u.name, 'email', u.email) as sender
       FROM messages r
       LEFT JOIN users u ON u.id = r."senderId"
       WHERE r."parentId" = $1 AND r."deletedAt" IS NULL
       ORDER BY r."sentAt" ASC`,
      [id],
    );

    return this.mapToResponse({ ...message, recipients, replies });
  }

  /**
   * Mark a message as read
   */
  async markAsRead(companyId: number, userId: number, id: number): Promise<void> {
    // Verify message exists
    const message = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT m.id FROM messages m WHERE m.id = $1 AND m."companyId" = $2 AND m."deletedAt" IS NULL`,
      [id, companyId],
    );

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.tenantPrisma.query(
      `UPDATE message_recipients SET "readAt" = NOW(), "updatedAt" = NOW()
       WHERE "messageId" = $1 AND "recipientId" = $2 AND "readAt" IS NULL`,
      [id, userId],
    );
  }

  /**
   * Delete a message (soft delete the recipient record or message)
   */
  async delete(companyId: number, userId: number, id: number): Promise<void> {
    const message = await this.tenantPrisma.queryOne<{ id: number; senderId: number }>(
      `SELECT id, "senderId" FROM messages WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [id, companyId],
    );

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId === userId) {
      // Sender deletes: soft delete the message
      await this.tenantPrisma.softDelete('messages', id);
    } else {
      // Recipient deletes: soft delete their recipient record
      await this.tenantPrisma.query(
        `UPDATE message_recipients SET "deletedAt" = NOW(), "updatedAt" = NOW()
         WHERE "messageId" = $1 AND "recipientId" = $2`,
        [id, userId],
      );
    }
  }

  /**
   * Map database record to response DTO
   */
  private mapToResponse(message: any): MessageResponseDto {
    return {
      id: message.id,
      uuid: message.uuid,
      companyId: message.companyId,
      senderId: message.senderId,
      subject: message.subject,
      body: message.body,
      bodyHtml: message.bodyHtml,
      priority: message.priority as MessagePriority,
      referenceableType: message.referenceableType,
      referenceableId: message.referenceableId,
      parentId: message.parentId,
      isDraft: message.isDraft,
      sentAt: message.sentAt?.toISOString?.() || message.sentAt,
      createdAt: message.createdAt?.toISOString?.() || message.createdAt,
      updatedAt: message.updatedAt?.toISOString?.() || message.updatedAt,
      sender: message.sender?.id ? message.sender : undefined,
      recipients: message.recipients?.map((r: any) => ({
        id: r.id,
        recipientId: r.recipientId,
        recipientType: r.recipientType as RecipientType,
        readAt: r.readAt?.toISOString?.() || r.readAt,
        starredAt: r.starredAt?.toISOString?.() || r.starredAt,
        recipient: r.recipient?.id ? r.recipient : undefined,
      })),
      replies: message.replies?.map((r: any) => this.mapToResponse(r)),
    };
  }
}
