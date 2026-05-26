import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { toMoney, subMoney } from '../../../common/utils/decimal';
import {
  CreateFiscalYearDto,
  UpdateFiscalYearDto,
  CloseFiscalYearDto,
  FiscalYearQueryDto,
} from '../dto';

export interface FiscalYear {
  id: number;
  companyId: number;
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
  isCurrent: boolean;
  closeRequestedAt: Date | null;
  closeRequestedBy: number | null;
  closeApprovedAt: Date | null;
  closeApprovedBy: number | null;
  closeComment: string | null;
  closedAt: Date | null;
  closedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FiscalYearService {
  private readonly logger = new Logger(FiscalYearService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  async create(companyId: number, dto: CreateFiscalYearDto): Promise<FiscalYear> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Validate dates
    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check for overlapping fiscal years
    const overlapping = await this.tenantPrisma.queryOne<FiscalYear>(
      `SELECT * FROM fiscal_years
       WHERE "companyId" = $1
         AND (
           ("startDate" <= $2 AND "endDate" >= $2) OR
           ("startDate" <= $3 AND "endDate" >= $3) OR
           ("startDate" >= $2 AND "endDate" <= $3)
         )`,
      [companyId, dto.startDate, dto.endDate],
    );

    if (overlapping) {
      throw new BadRequestException('Fiscal year overlaps with existing fiscal year');
    }

    // If setting as current, unset other current fiscal years
    if (dto.isCurrent) {
      await this.tenantPrisma.query(
        `UPDATE fiscal_years SET "isCurrent" = false, "updatedAt" = NOW() WHERE "companyId" = $1`,
        [companyId],
      );
    }

    const fiscalYear = await this.tenantPrisma.insert<FiscalYear>('fiscal_years', {
      companyId,
      name: dto.name,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: 'open',
      isCurrent: dto.isCurrent ?? false,
    });

    // Auto-generate 12 monthly reporting periods
    await this.autoCreateReportingPeriods(companyId, fiscalYear);

    return fiscalYear;
  }

  /**
   * Auto-create 12 monthly reporting periods when a fiscal year is created.
   * Each period is one month within the fiscal year date range.
   */
  private async autoCreateReportingPeriods(
    companyId: number,
    fiscalYear: FiscalYear,
  ): Promise<void> {
    try {
      // Resolve entity ID from company
      const company = await this.tenantPrisma.queryOne<{ entityId: number | null }>(
        `SELECT "entityId" FROM companies WHERE id = $1`,
        [companyId],
      );

      if (!company?.entityId) {
        this.logger.warn(
          `Company ${companyId} has no IFRS entity — skipping auto-creation of reporting periods`,
        );
        return;
      }

      const entityId = company.entityId;
      const start = new Date(fiscalYear.startDate);
      const end = new Date(fiscalYear.endDate);
      const calendarYear = start.getFullYear();

      // Check if reporting periods already exist for this entity + year
      const existing = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM ifrs_reporting_periods
         WHERE "entityId" = $1 AND "calendarYear" = $2 AND "deletedAt" IS NULL`,
        [entityId, calendarYear],
      );

      if (parseInt(existing?.count || '0', 10) > 0) {
        this.logger.log(
          `Reporting periods for year ${calendarYear} already exist for entity ${entityId}`,
        );
        return;
      }

      // Generate monthly periods — auto-close past periods
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let cursor = new Date(start);
      let periodNum = 1;

      while (cursor < end && periodNum <= 13) {
        const periodStart = new Date(cursor);
        const next = new Date(cursor);
        next.setMonth(next.getMonth() + 1);
        const periodEnd = next > end ? new Date(end) : new Date(next.getTime() - 86400000);

        const label = periodStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

        // Past periods (endDate before today) are auto-closed
        const status = periodEnd < today ? 'CLOSED' : 'OPEN';

        await this.tenantPrisma.insert('ifrs_reporting_periods', {
          entityId,
          calendarYear,
          number: periodNum,
          label,
          startDate: periodStart.toISOString().split('T')[0],
          endDate: periodEnd.toISOString().split('T')[0],
          status,
        });

        cursor = next;
        periodNum++;
      }

      this.logger.log(
        `Auto-created ${periodNum - 1} reporting periods for FY ${fiscalYear.name} (entity=${entityId})`,
      );
    } catch (error) {
      // Non-critical — don't fail fiscal year creation if reporting period creation fails
      this.logger.warn(`Failed to auto-create reporting periods: ${error}`);
    }
  }

  async update(companyId: number, fiscalYearId: number, dto: UpdateFiscalYearDto): Promise<FiscalYear> {
    const fiscalYear = await this.findById(companyId, fiscalYearId);

    if (fiscalYear.status === 'closed') {
      throw new BadRequestException('Cannot update closed fiscal year');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;

    // Validate and update dates
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate ? new Date(dto.startDate) : fiscalYear.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : fiscalYear.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }

      // Check for overlapping (excluding current fiscal year)
      const overlapping = await this.tenantPrisma.queryOne<FiscalYear>(
        `SELECT * FROM fiscal_years
         WHERE "companyId" = $1
           AND id != $4
           AND (
             ("startDate" <= $2 AND "endDate" >= $2) OR
             ("startDate" <= $3 AND "endDate" >= $3) OR
             ("startDate" >= $2 AND "endDate" <= $3)
           )`,
        [companyId, dto.startDate || fiscalYear.startDate, dto.endDate || fiscalYear.endDate, fiscalYearId],
      );

      if (overlapping) {
        throw new BadRequestException('Fiscal year would overlap with existing fiscal year');
      }

      if (dto.startDate) updateData.startDate = dto.startDate;
      if (dto.endDate) updateData.endDate = dto.endDate;
    }

    let result = fiscalYear;

    if (Object.keys(updateData).length > 0) {
      const updated = await this.tenantPrisma.update<FiscalYear>(
        'fiscal_years',
        fiscalYearId,
        updateData,
      );

      if (!updated) {
        throw new NotFoundException('Fiscal year not found');
      }

      result = updated;
    }

    // Backfill: auto-create reporting periods if missing
    await this.autoCreateReportingPeriods(companyId, result);

    return result;
  }

  async setCurrent(companyId: number, fiscalYearId: number): Promise<FiscalYear> {
    const fiscalYear = await this.findById(companyId, fiscalYearId);

    if (fiscalYear.status === 'closed') {
      throw new BadRequestException('Cannot set closed fiscal year as current');
    }

    // Unset current from all fiscal years
    await this.tenantPrisma.query(
      `UPDATE fiscal_years SET "isCurrent" = false, "updatedAt" = NOW() WHERE "companyId" = $1`,
      [companyId],
    );

    // Set this one as current
    const updated = await this.tenantPrisma.update<FiscalYear>(
      'fiscal_years',
      fiscalYearId,
      { isCurrent: true },
    );

    if (!updated) {
      throw new NotFoundException('Fiscal year not found');
    }

    return updated;
  }

  /**
   * Request fiscal year close — sets status to pending_close.
   * Another user (Super Admin) must approve.
   */
  async requestClose(
    companyId: number,
    fiscalYearId: number,
    userId: number,
    comment?: string,
  ): Promise<FiscalYear> {
    const fiscalYear = await this.findById(companyId, fiscalYearId);

    if (fiscalYear.status === 'closed') {
      throw new BadRequestException('Fiscal year is already closed');
    }
    if (fiscalYear.closeRequestedAt) {
      throw new BadRequestException('Fiscal year close is already pending approval');
    }

    // Check for unposted journal entries
    const unpostedEntries = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM journal_entries
       WHERE "companyId" = $1
         AND "fiscalYearId" = $2
         AND status NOT IN ('posted', 'reversed')
         AND "deletedAt" IS NULL`,
      [companyId, fiscalYearId],
    );

    if (parseInt(unpostedEntries?.count || '0', 10) > 0) {
      throw new BadRequestException('Cannot close fiscal year with unposted journal entries. Post or delete all pending entries first.');
    }

    await this.tenantPrisma.query(
      `UPDATE fiscal_years
       SET status = 'pending_close', "closeRequestedAt" = NOW(), "closeRequestedBy" = $1,
           "closeComment" = $2, "updatedAt" = NOW()
       WHERE id = $3`,
      [userId, comment || null, fiscalYearId],
    );

    this.logger.log(`Fiscal year ${fiscalYear.name} close requested by user ${userId}`);
    return this.findById(companyId, fiscalYearId);
  }

  /**
   * Approve and execute fiscal year close.
   * Must be different user from requester. Super Admin only.
   */
  async close(
    companyId: number,
    fiscalYearId: number,
    dto: CloseFiscalYearDto,
    userId: number,
  ): Promise<FiscalYear> {
    const fiscalYear = await this.findById(companyId, fiscalYearId);

    if (fiscalYear.status === 'closed') {
      throw new BadRequestException('Fiscal year is already closed');
    }

    // If pending_close, enforce segregation of duties
    const je = await this.tenantPrisma.queryOne<{ closeRequestedBy: number | null }>(
      `SELECT "closeRequestedBy" FROM fiscal_years WHERE id = $1`,
      [fiscalYearId],
    );
    if (je?.closeRequestedBy === userId) {
      throw new BadRequestException('You cannot approve a fiscal year close you requested. A different user must approve.');
    }

    // Check for unposted journal entries
    const unpostedEntries = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM journal_entries
       WHERE "companyId" = $1
         AND "fiscalYearId" = $2
         AND status NOT IN ('posted', 'reversed')
         AND "deletedAt" IS NULL`,
      [companyId, fiscalYearId],
    );

    if (parseInt(unpostedEntries?.count || '0', 10) > 0) {
      throw new BadRequestException('Cannot close fiscal year with unposted journal entries');
    }

    return this.tenantPrisma.transaction(async (client) => {
      // Update fiscal year status
      const result = await client.query(
        `UPDATE fiscal_years
         SET status = 'closed', "closedAt" = NOW(), "closedBy" = $1,
             "closeApprovedAt" = NOW(), "closeApprovedBy" = $1,
             "isCurrent" = false, "updatedAt" = NOW()
         WHERE id = $2 RETURNING *`,
        [userId, fiscalYearId],
      );

      const closedFiscalYear = result.rows[0] as FiscalYear;

      // Create opening balances for next fiscal year if requested
      if (dto.createOpeningBalances) {
        // Get balance sheet account balances
        const balances = await client.query(
          `SELECT
             a.id as "accountId",
             SUM(CASE WHEN t."debitAccountId" = a.id THEN t.amount ELSE 0 END) as debit,
             SUM(CASE WHEN t."creditAccountId" = a.id THEN t.amount ELSE 0 END) as credit
           FROM ifrs_accounts a
           LEFT JOIN ifrs_transactions t ON (t."debitAccountId" = a.id OR t."creditAccountId" = a.id)
             AND t."transactionDate" >= $1
             AND t."transactionDate" <= $2
             AND t.posted = true
             AND t."deletedAt" IS NULL
           WHERE a."companyId" = $3
             AND a."isPosting" = true
             AND a."accountType" IN ('asset', 'liability', 'equity')
             AND a."deletedAt" IS NULL
           GROUP BY a.id
           HAVING SUM(CASE WHEN t."debitAccountId" = a.id THEN t.amount ELSE 0 END) -
                  SUM(CASE WHEN t."creditAccountId" = a.id THEN t.amount ELSE 0 END) != 0`,
          [fiscalYear.startDate, fiscalYear.endDate, companyId],
        );

        // Insert opening balances for next period
        const nextYearStart = new Date(fiscalYear.endDate);
        nextYearStart.setDate(nextYearStart.getDate() + 1);
        const year = nextYearStart.getFullYear();
        const period = 1;

        for (const balance of balances.rows) {
          const debit = toMoney(balance.debit);
          const credit = toMoney(balance.credit);
          const balanceAmount = subMoney(debit, credit);

          // Get entity ID
          const company = await client.query(
            `SELECT "entityId" FROM companies WHERE id = $1`,
            [companyId],
          );
          const entityId = company.rows[0]?.entityId;

          if (entityId) {
            await client.query(
              `INSERT INTO ifrs_balances ("entityId", "accountId", year, period, balance, "balanceType", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
               ON CONFLICT ("entityId", "accountId", year, period)
               DO UPDATE SET balance = $5, "balanceType" = $6, "updatedAt" = NOW()`,
              [
                entityId,
                balance.accountId,
                year,
                period,
                Math.abs(balanceAmount),
                balanceAmount >= 0 ? 'debit' : 'credit',
              ],
            );
          }
        }
      }

      return closedFiscalYear;
    }, { isolationLevel: 'SERIALIZABLE' });
  }

  /**
   * Get pre-closing checklist for a fiscal year.
   * Runs real validations against the database.
   */
  async getYearEndChecklist(companyId: number, fiscalYearId: number): Promise<{
    fiscalYear: FiscalYear;
    checks: {
      id: string;
      label: string;
      description: string;
      status: 'pass' | 'fail' | 'warning';
      detail: string;
      count?: number;
    }[];
    summary: {
      totalEntries: number;
      totalDebit: number;
      totalCredit: number;
      trialBalanceDiff: number;
      unpostedCount: number;
      openPeriodsCount: number;
    };
  }> {
    const fiscalYear = await this.findById(companyId, fiscalYearId);

    if (fiscalYear.status === 'closed') {
      throw new BadRequestException('Fiscal year is already closed');
    }

    const checks: {
      id: string;
      label: string;
      description: string;
      status: 'pass' | 'fail' | 'warning';
      detail: string;
      count?: number;
    }[] = [];

    // 1. Unposted journal entries
    const unposted = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM journal_entries
       WHERE "companyId" = $1
         AND "fiscalYearId" = $2
         AND status NOT IN ('posted', 'reversed')
         AND "deletedAt" IS NULL`,
      [companyId, fiscalYearId],
    );
    const unpostedCount = parseInt(unposted?.count || '0', 10);
    checks.push({
      id: 'unposted',
      label: 'Unposted Journal Entries',
      description: 'All journal entries should be posted before closing',
      status: unpostedCount === 0 ? 'pass' : 'warning',
      detail: unpostedCount === 0
        ? 'All entries are posted'
        : `${unpostedCount} unposted entries found — review and post or reverse them`,
      count: unpostedCount,
    });

    // 2. Trial balance check (debits = credits)
    const trialBalance = await this.tenantPrisma.queryOne<{
      totalDebit: string;
      totalCredit: string;
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN t."debitAccountId" IS NOT NULL THEN t.amount ELSE 0 END), 0) as "totalDebit",
         COALESCE(SUM(CASE WHEN t."creditAccountId" IS NOT NULL THEN t.amount ELSE 0 END), 0) as "totalCredit"
       FROM ifrs_transactions t
       JOIN journal_entries je ON t."referenceId" = je.id AND t."referenceType" = 'journal'
       WHERE je."companyId" = $1
         AND je."fiscalYearId" = $2
         AND je.status = 'posted'
         AND je."deletedAt" IS NULL
         AND t."deletedAt" IS NULL`,
      [companyId, fiscalYearId],
    );
    const totalDebit = toMoney(parseFloat(trialBalance?.totalDebit || '0'));
    const totalCredit = toMoney(parseFloat(trialBalance?.totalCredit || '0'));
    const diff = toMoney(Math.abs(totalDebit - totalCredit));
    checks.push({
      id: 'trial-balance',
      label: 'Trial Balance Balanced',
      description: 'Total debits must equal total credits',
      status: diff === 0 ? 'pass' : 'fail',
      detail: diff === 0
        ? `Balanced — Debits: ${totalDebit.toFixed(2)}, Credits: ${totalCredit.toFixed(2)}`
        : `Imbalance of ${diff.toFixed(2)} — Debits: ${totalDebit.toFixed(2)}, Credits: ${totalCredit.toFixed(2)}`,
    });

    // 3. Fiscal year dates valid
    const start = new Date(fiscalYear.startDate);
    const end = new Date(fiscalYear.endDate);
    const datesValid = start < end;
    checks.push({
      id: 'fiscal-year-valid',
      label: 'Fiscal Year Dates Valid',
      description: 'Start and end dates are properly configured',
      status: datesValid ? 'pass' : 'fail',
      detail: datesValid
        ? `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`
        : 'End date is before or equal to start date',
    });

    // 4. No future-dated entries (entries after fiscal year end)
    const futureEntries = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM journal_entries
       WHERE "companyId" = $1
         AND "fiscalYearId" = $2
         AND "entryDate" > $3
         AND "deletedAt" IS NULL`,
      [companyId, fiscalYearId, fiscalYear.endDate],
    );
    const futureCount = parseInt(futureEntries?.count || '0', 10);
    checks.push({
      id: 'no-future-entries',
      label: 'No Future-Dated Entries',
      description: 'No entries should be dated after the fiscal year end date',
      status: futureCount === 0 ? 'pass' : 'warning',
      detail: futureCount === 0
        ? 'No future-dated entries found'
        : `${futureCount} entries dated after ${end.toLocaleDateString()}`,
      count: futureCount,
    });

    // 5. All reporting periods closed or closeable
    const company = await this.tenantPrisma.queryOne<{ entityId: number | null }>(
      `SELECT "entityId" FROM companies WHERE id = $1`,
      [companyId],
    );
    let openPeriodsCount = 0;
    if (company?.entityId) {
      const calendarYear = start.getFullYear();
      const openPeriods = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM ifrs_reporting_periods
         WHERE "entityId" = $1
           AND "calendarYear" = $2
           AND status != 'CLOSED'
           AND "deletedAt" IS NULL`,
        [company.entityId, calendarYear],
      );
      openPeriodsCount = parseInt(openPeriods?.count || '0', 10);
      checks.push({
        id: 'periods-closed',
        label: 'Reporting Periods Closed',
        description: 'All reporting periods should be closed before year-end',
        status: openPeriodsCount === 0 ? 'pass' : 'warning',
        detail: openPeriodsCount === 0
          ? 'All reporting periods are closed'
          : `${openPeriodsCount} reporting periods still open — they will be auto-closed`,
        count: openPeriodsCount,
      });
    }

    // 6. Suspense account check — should have zero balance
    const suspenseAccounts = await this.tenantPrisma.query<{ code: string; name: string; balance: string }>(
      `SELECT a.code, a.name,
              COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as balance
       FROM ifrs_accounts a
       LEFT JOIN journal_entry_line_items jel ON jel."accountId" = a.id
       LEFT JOIN journal_entries je ON je.id = jel."journalEntryId"
         AND je."fiscalYearId" = $2 AND je.status = 'posted'
       WHERE a."companyId" = $1 AND a."deletedAt" IS NULL
         AND (LOWER(a.name) LIKE '%suspense%' OR LOWER(a.name) LIKE '%clearing%' OR LOWER(a.name) LIKE '%control%')
         AND a."isPosting" = true
       GROUP BY a.id
       HAVING ABS(COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)) > 0.01`,
      [companyId, fiscalYearId],
    );
    checks.push({
      id: 'suspense-cleared',
      label: 'Suspense/Clearing Accounts Cleared',
      description: 'Suspense and clearing accounts should have zero balance at year-end',
      status: suspenseAccounts.length === 0 ? 'pass' : 'warning',
      detail: suspenseAccounts.length === 0
        ? 'All suspense/clearing accounts have zero balance'
        : `${suspenseAccounts.length} account(s) have outstanding balances: ${suspenseAccounts.map(a => `${a.code} (${parseFloat(a.balance).toFixed(2)})`).join(', ')}`,
      count: suspenseAccounts.length,
    });

    // 7. Bank reconciliation check — all banks should be reconciled
    const unreconciledBanks = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM banks b
       WHERE b."companyId" = $1 AND b."isActive" = true AND b."deletedAt" IS NULL
         AND b.id NOT IN (
           SELECT DISTINCT "bankId" FROM bank_reconciliations
           WHERE "companyId" = $1 AND status IN ('completed', 'locked')
             AND "reconciliationDate" >= $2 AND "reconciliationDate" <= $3
         )`,
      [companyId, fiscalYear.startDate, fiscalYear.endDate],
    );
    const unreconciledCount = parseInt(unreconciledBanks?.count || '0', 10);
    checks.push({
      id: 'banks-reconciled',
      label: 'Bank Accounts Reconciled',
      description: 'All active bank accounts should be reconciled for the fiscal year',
      status: unreconciledCount === 0 ? 'pass' : 'warning',
      detail: unreconciledCount === 0
        ? 'All bank accounts have been reconciled'
        : `${unreconciledCount} bank account(s) not reconciled for this fiscal year`,
      count: unreconciledCount,
    });

    // 8. Unapproved opening balances check
    const unapprovedOB = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ifrs_balances
       WHERE "entityId" = $1 AND year = $2 AND "approvedBy" IS NULL AND "deletedAt" IS NULL`,
      [companyId, start.getFullYear()],
    );
    const unapprovedOBCount = parseInt(unapprovedOB?.count || '0', 10);
    checks.push({
      id: 'opening-balances-approved',
      label: 'Opening Balances Approved',
      description: 'All opening balances for this year should be approved',
      status: unapprovedOBCount === 0 ? 'pass' : 'warning',
      detail: unapprovedOBCount === 0
        ? 'All opening balances are approved'
        : `${unapprovedOBCount} unapproved opening balance entries — get Super Admin approval`,
      count: unapprovedOBCount,
    });

    // 9. Pending approval journal entries
    const pendingApproval = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM journal_entries
       WHERE "companyId" = $1 AND "fiscalYearId" = $2
         AND status IN ('pending_review', 'reviewed')
         AND "deletedAt" IS NULL`,
      [companyId, fiscalYearId],
    );
    const pendingApprovalCount = parseInt(pendingApproval?.count || '0', 10);
    if (pendingApprovalCount > 0) {
      checks.push({
        id: 'pending-approvals',
        label: 'Pending Journal Approvals',
        description: 'All journal entries in the approval workflow should be resolved',
        status: 'warning',
        detail: `${pendingApprovalCount} journal entries awaiting review or approval`,
        count: pendingApprovalCount,
      });
    }

    // 10. Total entries count
    const totalEntriesResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM journal_entries
       WHERE "companyId" = $1
         AND "fiscalYearId" = $2
         AND "deletedAt" IS NULL`,
      [companyId, fiscalYearId],
    );
    const totalEntries = parseInt(totalEntriesResult?.count || '0', 10);

    return {
      fiscalYear,
      checks,
      summary: {
        totalEntries,
        totalDebit,
        totalCredit,
        trialBalanceDiff: diff,
        unpostedCount,
        openPeriodsCount,
      },
    };
  }

  async delete(companyId: number, fiscalYearId: number): Promise<void> {
    const fiscalYear = await this.findById(companyId, fiscalYearId);

    if (fiscalYear.status === 'closed') {
      throw new BadRequestException('Cannot delete a closed fiscal year');
    }

    if (fiscalYear.isCurrent) {
      throw new BadRequestException('Cannot delete the current fiscal year. Set another fiscal year as current first.');
    }

    // Check for journal entries
    const hasEntries = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM journal_entries WHERE "companyId" = $1 AND "fiscalYearId" = $2 AND "deletedAt" IS NULL`,
      [companyId, fiscalYearId],
    );

    if (parseInt(hasEntries?.count || '0', 10) > 0) {
      throw new BadRequestException('Cannot delete fiscal year with journal entries. Close it instead.');
    }

    await this.tenantPrisma.query(
      `DELETE FROM fiscal_years WHERE id = $1 AND "companyId" = $2`,
      [fiscalYearId, companyId],
    );
  }

  async findById(companyId: number, fiscalYearId: number): Promise<FiscalYear> {
    const fiscalYear = await this.tenantPrisma.queryOne<FiscalYear>(
      `SELECT * FROM fiscal_years WHERE id = $1 AND "companyId" = $2`,
      [fiscalYearId, companyId],
    );

    if (!fiscalYear) {
      throw new NotFoundException('Fiscal year not found');
    }

    return fiscalYear;
  }

  async findCurrent(companyId: number): Promise<FiscalYear | null> {
    return this.tenantPrisma.queryOne<FiscalYear>(
      `SELECT * FROM fiscal_years WHERE "companyId" = $1 AND "isCurrent" = true`,
      [companyId],
    );
  }

  async findAll(companyId: number, query: FiscalYearQueryDto): Promise<{
    data: FiscalYear[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM fiscal_years WHERE "companyId" = $1`;
    let countSql = `SELECT COUNT(*) as count FROM fiscal_years WHERE "companyId" = $1`;
    const params: unknown[] = [companyId];
    let paramIndex = 2;

    if (query.status) {
      sql += ` AND status = $${paramIndex}`;
      countSql += ` AND status = $${paramIndex}`;
      params.push(query.status);
      paramIndex++;
    }

    if (query.isCurrent !== undefined) {
      sql += ` AND "isCurrent" = $${paramIndex}`;
      countSql += ` AND "isCurrent" = $${paramIndex}`;
      params.push(query.isCurrent);
      paramIndex++;
    }

    sql += ` ORDER BY "startDate" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<FiscalYear>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }
}
