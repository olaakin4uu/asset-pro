import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { isSuperAdmin } from '../../../common/utils/super-admin';

/**
 * PeriodLockService — controls which accounting periods are open for posting.
 *
 * Rules:
 * - Locked periods reject all journal entry posting, opening balance changes, and bank reconciliation completion.
 * - Only Super Admin or users with 'accounts.period_lock' permission can lock/unlock.
 * - Unlocking a locked period requires a reason (audit trail).
 * - Period 0 = full fiscal year lock.
 */
@Injectable()
export class PeriodLockService {
  private readonly logger = new Logger(PeriodLockService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // ==========================================================================
  // CHECK IF PERIOD IS LOCKED (called by journal entry service, etc.)
  // ==========================================================================

  async isPeriodLocked(companyId: number, date: Date | string): Promise<boolean> {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-12

    // Check year-level lock (period = 0)
    const yearLock = await this.tenantPrisma.queryOne<{ isLocked: boolean }>(
      `SELECT "isLocked" FROM period_locks WHERE "companyId" = $1 AND year = $2 AND period = 0 AND "isLocked" = true`,
      [companyId, year],
    );
    if (yearLock?.isLocked) return true;

    // Check month-level lock
    const monthLock = await this.tenantPrisma.queryOne<{ isLocked: boolean }>(
      `SELECT "isLocked" FROM period_locks WHERE "companyId" = $1 AND year = $2 AND period = $3 AND "isLocked" = true`,
      [companyId, year, month],
    );
    return monthLock?.isLocked ?? false;
  }

  /**
   * Validate that a date is in an open period. Throws if locked.
   */
  async validatePeriodOpen(companyId: number, date: Date | string): Promise<void> {
    const locked = await this.isPeriodLocked(companyId, date);
    if (locked) {
      const d = typeof date === 'string' ? new Date(date) : date;
      const monthName = d.toLocaleString('en', { month: 'long', year: 'numeric' });
      throw new BadRequestException(
        `Cannot post to ${monthName}. This period is locked. Contact your administrator to unlock if an adjustment is needed.`,
      );
    }
  }

  // ==========================================================================
  // LOCK / UNLOCK
  // ==========================================================================

  async lockPeriod(
    companyId: number,
    year: number,
    period: number,
    userId: number,
    reason?: string,
  ) {
    await this.requireLockPermission(userId);

    // Check if already locked
    const existing = await this.tenantPrisma.queryOne<{ id: number; isLocked: boolean }>(
      `SELECT id, "isLocked" FROM period_locks WHERE "companyId" = $1 AND year = $2 AND period = $3`,
      [companyId, year, period],
    );

    if (existing?.isLocked) {
      throw new BadRequestException('This period is already locked.');
    }

    if (existing) {
      // Re-lock a previously unlocked period
      await this.tenantPrisma.update('period_locks', existing.id, {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: userId,
        lockedReason: reason || null,
        unlockedAt: null,
        unlockedBy: null,
        unlockReason: null,
      });
    } else {
      await this.tenantPrisma.insert('period_locks', {
        companyId,
        year,
        period,
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: userId,
        lockedReason: reason || null,
      });
    }

    const periodLabel = period === 0 ? `Fiscal Year ${year}` : `${year}-${String(period).padStart(2, '0')}`;
    this.logger.log(`Period locked: ${periodLabel} by user ${userId}${reason ? ` — ${reason}` : ''}`);

    return { success: true, message: `Period ${periodLabel} has been locked.` };
  }

  async unlockPeriod(
    companyId: number,
    year: number,
    period: number,
    userId: number,
    reason: string,
  ) {
    await this.requireLockPermission(userId);

    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('Unlock reason is required (minimum 5 characters).');
    }

    const existing = await this.tenantPrisma.queryOne<{ id: number; isLocked: boolean }>(
      `SELECT id, "isLocked" FROM period_locks WHERE "companyId" = $1 AND year = $2 AND period = $3`,
      [companyId, year, period],
    );

    if (!existing || !existing.isLocked) {
      throw new BadRequestException('This period is not locked.');
    }

    await this.tenantPrisma.update('period_locks', existing.id, {
      isLocked: false,
      unlockedAt: new Date(),
      unlockedBy: userId,
      unlockReason: reason.trim(),
    });

    const periodLabel = period === 0 ? `Fiscal Year ${year}` : `${year}-${String(period).padStart(2, '0')}`;
    this.logger.warn(`Period UNLOCKED: ${periodLabel} by user ${userId} — ${reason}`);

    return { success: true, message: `Period ${periodLabel} has been unlocked.` };
  }

  // ==========================================================================
  // LIST
  // ==========================================================================

  async listLocks(companyId: number, year?: number) {
    let sql = `SELECT pl.*, u.name as "lockedByName", u2.name as "unlockedByName"
               FROM period_locks pl
               LEFT JOIN users u ON u.id = pl."lockedBy"
               LEFT JOIN users u2 ON u2.id = pl."unlockedBy"
               WHERE pl."companyId" = $1`;
    const params: (number | string)[] = [companyId];

    if (year) {
      sql += ` AND pl.year = $2`;
      params.push(year);
    }

    sql += ` ORDER BY pl.year DESC, pl.period ASC`;

    return this.tenantPrisma.query(sql, params);
  }

  // ==========================================================================
  // PERMISSION CHECK
  // ==========================================================================

  private async requireLockPermission(userId: number): Promise<void> {
    const isAdmin = await isSuperAdmin(this.tenantPrisma, userId);
    if (!isAdmin) {
      throw new ForbiddenException('You do not have permission to lock/unlock accounting periods. Contact your Super Admin.');
    }
  }
}
