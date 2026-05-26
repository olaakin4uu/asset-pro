import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from './tenant-prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  /**
   * Write an audit log entry to the audits table.
   *
   * Fire-and-forget safe: failures are logged but never propagated,
   * so audit writes can never break the main business flow.
   */
  async log(params: {
    userId: number;
    event: 'created' | 'updated' | 'deleted' | 'restored';
    auditableType: string;
    auditableId: number;
    oldValues?: Record<string, any> | null;
    newValues?: Record<string, any> | null;
    url?: string;
    ipAddress?: string;
    userAgent?: string;
    tags?: string;
  }): Promise<void> {
    try {
      await this.tenantPrisma.insert('audits', {
        userId: params.userId,
        event: params.event,
        auditableType: params.auditableType,
        auditableId: params.auditableId,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        url: params.url || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        tags: params.tags || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err) {
      this.logger.error('Audit log write failed', err);
    }
  }
}
