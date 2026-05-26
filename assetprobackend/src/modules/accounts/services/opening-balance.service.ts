import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { toMoney, subMoney } from '../../../common/utils/decimal';
import { isSuperAdmin } from '../../../common/utils/super-admin';
import {
  SetOpeningBalancesDto,
  UpdateOpeningBalanceDto,
  OpeningBalanceQueryDto,
  OpeningBalanceEntryDto,
} from '../dto/opening-balance.dto';

export interface OpeningBalance {
  id: number;
  entityId: number;
  accountId: number;
  year: number;
  period: number;
  balance: number;
  balanceType: 'debit' | 'credit';
  accountCode?: string;
  accountName?: string;
  accountType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpeningBalanceSummary {
  year: number;
  period: number;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  accountCount: number;
}

@Injectable()
export class OpeningBalanceService {
  private readonly logger = new Logger(OpeningBalanceService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  private async resolveEntityId(companyId: number): Promise<number> {
    const company = await this.tenantPrisma.queryOne<{ entityId: number | null }>(
      `SELECT "entityId" FROM companies WHERE id = $1 AND "deletedAt" IS NULL`,
      [companyId],
    );
    if (!company?.entityId) {
      throw new BadRequestException(
        'This company has no IFRS entity configured. Please contact your administrator to link the company to an IFRS reporting entity.',
      );
    }
    return company.entityId;
  }

  async setOpeningBalances(
    companyId: number,
    dto: SetOpeningBalancesDto,
    userId?: number,
  ): Promise<{ success: boolean; count: number; requiresApproval: boolean }> {
    if (!companyId) {
      throw new BadRequestException('Company context is required to set opening balances');
    }

    const period = dto.period;

    // Validate all accounts exist (accounts are scoped by companyId)
    const accountIds = dto.entries.map((e) => Number(e.accountId));
    const accounts = await this.tenantPrisma.query<{ id: number }>(
      `SELECT id FROM ifrs_accounts WHERE id = ANY($1::int[]) AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [accountIds, companyId],
    );

    const validAccountIds = new Set(accounts.map((a) => Number(a.id)));
    const invalidAccountIds = accountIds.filter((id) => !validAccountIds.has(id));

    if (invalidAccountIds.length > 0) {
      throw new BadRequestException(
        `Invalid account IDs: ${invalidAccountIds.join(', ')}`,
      );
    }

    // Reject GL accounts that are mapped to banks (their opening balances are set via bank module)
    const bankMappedAccounts = await this.tenantPrisma.query<{ glAccountId: number; bankName: string }>(
      `SELECT "glAccountId", name as "bankName" FROM banks
       WHERE "companyId" = $1 AND "glAccountId" = ANY($2::int[]) AND "deletedAt" IS NULL`,
      [companyId, accountIds],
    );
    if (bankMappedAccounts.length > 0) {
      const names = bankMappedAccounts.map((b) => b.bankName).join(', ');
      throw new BadRequestException(
        `The following GL accounts are mapped to banks and cannot have opening balances set here. Use the Banks module instead: ${names}`,
      );
    }

    // Validate that debits equal credits
    const totalDebit = dto.entries
      .filter((e) => e.balanceType === 'debit')
      .reduce((sum, e) => sum + Number(e.balance || 0), 0);
    const totalCredit = dto.entries
      .filter((e) => e.balanceType === 'credit')
      .reduce((sum, e) => sum + Number(e.balance || 0), 0);

    const difference = subMoney(totalDebit, totalCredit);
    if (Math.abs(difference) > 0.01) {
      throw new BadRequestException(
        `Opening balances must be balanced. Debit: ${toMoney(totalDebit)}, Credit: ${toMoney(totalCredit)}`,
      );
    }

    const entityId = await this.resolveEntityId(companyId);

    // Check if approval is required (Super Admin can bypass)
    let requiresApproval = true;
    if (userId) {
      const isAdmin = await isSuperAdmin(this.tenantPrisma, userId);
      if (isAdmin) requiresApproval = false;
    }

    // Use transaction to upsert all balances
    await this.tenantPrisma.transaction(async (client) => {
      for (const entry of dto.entries) {
        await client.query(
          `INSERT INTO ifrs_balances ("entityId", "accountId", year, period, balance, "balanceType", "createdBy", "approvedBy", "approvedAt", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           ON CONFLICT ("entityId", "accountId", year, period)
           DO UPDATE SET balance = $5, "balanceType" = $6, "lastModifiedBy" = $7, "updatedAt" = NOW()`,
          [
            entityId,
            entry.accountId,
            dto.year,
            period,
            entry.balance,
            entry.balanceType,
            userId || null,
            requiresApproval ? null : userId,
            requiresApproval ? null : new Date(),
          ],
        );
      }
    }, { isolationLevel: 'SERIALIZABLE' });

    if (requiresApproval) {
      this.logger.log(`Opening balances set for year ${dto.year} period ${period} by user ${userId} — pending approval`);
    } else {
      this.logger.log(`Opening balances set and auto-approved for year ${dto.year} period ${period} by Super Admin ${userId}`);
    }

    return {
      success: true,
      count: dto.entries.length,
      requiresApproval,
    };
  }

  async updateOpeningBalance(
    companyId: number,
    balanceId: number,
    dto: UpdateOpeningBalanceDto,
  ): Promise<OpeningBalance> {
    const balance = await this.findById(companyId, balanceId);

    const updateData: Record<string, any> = {};
    if (dto.balance !== undefined) updateData.balance = dto.balance;
    if (dto.balanceType !== undefined) updateData.balanceType = dto.balanceType;

    if (Object.keys(updateData).length === 0) {
      return balance;
    }

    const updated = await this.tenantPrisma.update<OpeningBalance>(
      'ifrs_balances',
      balanceId,
      updateData,
    );

    if (!updated) {
      throw new NotFoundException('Opening balance not found');
    }

    return this.findById(companyId, balanceId);
  }

  async deleteOpeningBalance(companyId: number, balanceId: number): Promise<void> {
    await this.findById(companyId, balanceId);

    const entityId = await this.resolveEntityId(companyId);
    await this.tenantPrisma.query(
      `DELETE FROM ifrs_balances WHERE id = $1 AND "entityId" = $2`,
      [balanceId, entityId],
    );
  }

  async findById(companyId: number, balanceId: number): Promise<OpeningBalance> {
    const entityId = await this.resolveEntityId(companyId);
    const balance = await this.tenantPrisma.queryOne<OpeningBalance>(
      `SELECT b.*,
         a.code as "accountCode", a.name as "accountName", a."accountType"
       FROM ifrs_balances b
       JOIN ifrs_accounts a ON a.id = b."accountId"
       WHERE b.id = $1 AND b."entityId" = $2 AND b."deletedAt" IS NULL`,
      [balanceId, entityId],
    );

    if (!balance) {
      throw new NotFoundException('Opening balance not found');
    }

    return balance;
  }

  async findAll(
    companyId: number,
    query: OpeningBalanceQueryDto,
  ): Promise<{
    data: OpeningBalance[];
    summary: OpeningBalanceSummary;
  }> {
    const entityId = await this.resolveEntityId(companyId);
    let sql = `
      SELECT b.*,
        a.code as "accountCode", a.name as "accountName", a."accountType"
      FROM ifrs_balances b
      JOIN ifrs_accounts a ON a.id = b."accountId"
      WHERE b."entityId" = $1 AND b."deletedAt" IS NULL
    `;
    const params: any[] = [entityId];
    let paramIndex = 2;

    if (query.year !== undefined) {
      sql += ` AND b.year = $${paramIndex}`;
      params.push(query.year);
      paramIndex++;
    }

    if (query.period !== undefined) {
      sql += ` AND b.period = $${paramIndex}`;
      params.push(query.period);
      paramIndex++;
    }

    if (query.accountType) {
      sql += ` AND a."accountType" = $${paramIndex}`;
      params.push(query.accountType);
      paramIndex++;
    }

    if (!query.includeZeroBalances) {
      sql += ` AND b.balance > 0`;
    }

    sql += ` ORDER BY a.code ASC`;

    const data = await this.tenantPrisma.query<OpeningBalance>(sql, params);

    // Calculate summary
    const totalDebit = data
      .filter((b) => b.balanceType === 'debit')
      .reduce((sum, b) => sum + Number(b.balance), 0);
    const totalCredit = data
      .filter((b) => b.balanceType === 'credit')
      .reduce((sum, b) => sum + Number(b.balance), 0);

    const summary: OpeningBalanceSummary = {
      year: query.year || new Date().getFullYear(),
      period: query.period || 1,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      accountCount: data.length,
    };

    return { data, summary };
  }

  // ==========================================================================
  // APPROVAL
  // ==========================================================================

  /**
   * Approve opening balances for a specific year/period. Super Admin only.
   */
  async approveOpeningBalances(
    companyId: number,
    year: number,
    period: number,
    userId: number,
    comment?: string,
  ): Promise<{ success: boolean; approved: number }> {
    const isAdmin = await isSuperAdmin(this.tenantPrisma, userId);
    if (!isAdmin) {
      throw new ForbiddenException('You do not have permission to approve opening balances. Contact your Super Admin.');
    }

    const entityId = await this.resolveEntityId(companyId);

    // Find unapproved balances for this year/period
    const unapproved = await this.tenantPrisma.query<{ id: number; createdBy: number | null }>(
      `SELECT id, "createdBy" FROM ifrs_balances
       WHERE "entityId" = $1 AND year = $2 AND period = $3 AND "approvedBy" IS NULL AND "deletedAt" IS NULL`,
      [entityId, year, period],
    );

    if (unapproved.length === 0) {
      throw new BadRequestException('No unapproved opening balances found for this period.');
    }

    // Verify approver is different from creator (segregation of duties)
    const creators = new Set(unapproved.filter(u => u.createdBy).map(u => u.createdBy));
    if (creators.size === 1 && creators.has(userId)) {
      throw new BadRequestException('You cannot approve opening balances you created. A different Super Admin must approve.');
    }

    await this.tenantPrisma.query(
      `UPDATE ifrs_balances
       SET "approvedBy" = $1, "approvedAt" = NOW(), "approvalComment" = $2, "updatedAt" = NOW()
       WHERE "entityId" = $3 AND year = $4 AND period = $5 AND "approvedBy" IS NULL AND "deletedAt" IS NULL`,
      [userId, comment || null, entityId, year, period],
    );

    this.logger.log(`Opening balances approved for year ${year} period ${period} by Super Admin ${userId} (${unapproved.length} entries)`);
    return { success: true, approved: unapproved.length };
  }

  /**
   * Get approval status for opening balances of a year/period.
   */
  async getApprovalStatus(companyId: number, year: number, period: number) {
    const entityId = await this.resolveEntityId(companyId);
    const result = await this.tenantPrisma.queryOne<{
      total: string;
      approved: string;
      unapproved: string;
    }>(
      `SELECT
         COUNT(*) as total,
         COUNT("approvedBy") as approved,
         COUNT(*) - COUNT("approvedBy") as unapproved
       FROM ifrs_balances
       WHERE "entityId" = $1 AND year = $2 AND period = $3 AND "deletedAt" IS NULL`,
      [entityId, year, period],
    );

    return {
      year,
      period,
      total: parseInt(result?.total || '0', 10),
      approved: parseInt(result?.approved || '0', 10),
      unapproved: parseInt(result?.unapproved || '0', 10),
      isFullyApproved: parseInt(result?.unapproved || '0', 10) === 0 && parseInt(result?.total || '0', 10) > 0,
    };
  }

  async getYearsWithBalances(companyId: number): Promise<{ year: number; period: number }[]> {
    const entityId = await this.resolveEntityId(companyId);
    return this.tenantPrisma.query<{ year: number; period: number }>(
      `SELECT DISTINCT year, period FROM ifrs_balances
       WHERE "entityId" = $1 AND "deletedAt" IS NULL
       ORDER BY year DESC, period ASC`,
      [entityId],
    );
  }

  async getAccountsForBalances(companyId: number): Promise<
    {
      id: number;
      code: string;
      name: string;
      accountType: string;
    }[]
  > {
    // Accounts scoped by companyId, excluding GL accounts already mapped to banks
    // (bank opening balances are posted via the bank module, not here)
    return this.tenantPrisma.query(
      `SELECT id, code, name, "accountType"
       FROM ifrs_accounts
       WHERE "companyId" = $1
         AND "isPosting" = true
         AND "isActive" = true
         AND "deletedAt" IS NULL
         AND id NOT IN (
           SELECT "glAccountId" FROM banks
           WHERE "companyId" = $1 AND "glAccountId" IS NOT NULL AND "deletedAt" IS NULL
         )
       ORDER BY code ASC`,
      [companyId],
    );
  }

  async clearOpeningBalances(
    companyId: number,
    year: number,
    period?: number,
  ): Promise<{ deleted: number }> {
    const entityId = await this.resolveEntityId(companyId);
    let sql = `DELETE FROM ifrs_balances WHERE "entityId" = $1 AND year = $2`;
    const params: any[] = [entityId, year];

    if (period !== undefined) {
      sql += ` AND period = $3`;
      params.push(period);
    }

    const result = await this.tenantPrisma.query(sql, params);

    return { deleted: (result as any).rowCount || 0 };
  }

  // --------------------------------------------------------------------------
  // IMPORT TEMPLATE & IMPORT
  // --------------------------------------------------------------------------

  async getImportTemplate(companyId: number) {
    const accounts = await this.tenantPrisma.query<{
      id: number;
      code: string;
      name: string;
      accountType: string;
      normalBalance: string;
    }>(
      `SELECT id, code, name, "accountType",
         CASE WHEN "accountType" IN ('asset', 'expense') THEN 'debit' ELSE 'credit' END as "normalBalance"
       FROM ifrs_accounts
       WHERE "entityId" IN (SELECT "entityId" FROM companies WHERE id = $1)
         AND "isActive" = true AND "deletedAt" IS NULL
       ORDER BY code`,
      [companyId],
    );

    return {
      headers: ['Account Code', 'Account Name (read-only)', 'Account Type (read-only)', 'Normal Balance (read-only)', 'Debit Amount', 'Credit Amount'],
      instructions: [
        'Fill in Account Code, Debit Amount, and/or Credit Amount columns.',
        'Account Name, Account Type, and Normal Balance columns are for reference only — ignored on import.',
        'Each row should have either a Debit or Credit amount, not both.',
        'Assets and Expenses normally have Debit balances.',
        'Liabilities, Equity, and Revenue normally have Credit balances.',
        'Total Debits must equal Total Credits for the import to succeed.',
        'Duplicate account codes will use the last occurrence.',
      ],
      sampleRows: accounts.slice(0, 5).map((a) => ({
        accountCode: a.code,
        accountName: a.name,
        accountType: a.accountType,
        normalBalance: a.normalBalance,
        debit: a.normalBalance === 'debit' ? 0 : '',
        credit: a.normalBalance === 'credit' ? 0 : '',
      })),
      accounts: accounts.map((a) => ({
        code: a.code,
        name: a.name,
        accountType: a.accountType,
        normalBalance: a.normalBalance,
      })),
    };
  }

  async importOpeningBalances(
    companyId: number,
    dto: { year: number; period: number; rows: { accountCode: string; debit: number; credit: number }[] },
  ) {
    const { year, period, rows } = dto;
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    // Get entity ID for the company
    const company = await this.tenantPrisma.queryOne<{ entityId: number }>(
      `SELECT "entityId" FROM companies WHERE id = $1`,
      [companyId],
    );
    if (!company) throw new BadRequestException('Company not found');

    // Build entries
    const entries: { accountId: number; balance: number; balanceType: 'debit' | 'credit' }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      if (!row.accountCode) {
        errors.push(`Row ${rowNum}: Missing account code`);
        skipped++;
        continue;
      }

      const debit = Number(row.debit) || 0;
      const credit = Number(row.credit) || 0;

      if (debit === 0 && credit === 0) {
        skipped++;
        continue;
      }

      if (debit > 0 && credit > 0) {
        errors.push(`Row ${rowNum}: Account "${row.accountCode}" has both debit and credit — use only one`);
        skipped++;
        continue;
      }

      const account = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT id FROM ifrs_accounts
         WHERE "entityId" = $1 AND code = $2 AND "isActive" = true AND "deletedAt" IS NULL`,
        [company.entityId, row.accountCode.trim()],
      );

      if (!account) {
        errors.push(`Row ${rowNum}: Account "${row.accountCode}" not found`);
        skipped++;
        continue;
      }

      const balance = debit > 0 ? debit : credit;
      const balanceType: 'debit' | 'credit' = debit > 0 ? 'debit' : 'credit';

      totalDebit += debit;
      totalCredit += credit;

      entries.push({ accountId: account.id, balance: toMoney(balance), balanceType });
    }

    // Check balance
    const diff = Math.abs(toMoney(totalDebit) - toMoney(totalCredit));
    if (diff > 0.01 && entries.length > 0) {
      return {
        imported: 0,
        skipped: rows.length,
        total: rows.length,
        totalDebit: toMoney(totalDebit),
        totalCredit: toMoney(totalCredit),
        difference: toMoney(diff),
        errors: [`Total Debits (${toMoney(totalDebit)}) must equal Total Credits (${toMoney(totalCredit)}). Difference: ${toMoney(diff)}`],
      };
    }

    // Save entries
    for (const entry of entries) {
      try {
        // Upsert — delete existing then insert
        await this.tenantPrisma.query(
          `DELETE FROM opening_balances
           WHERE "entityId" = $1 AND "accountId" = $2 AND year = $3 AND period = $4`,
          [company.entityId, entry.accountId, year, period],
        );

        await this.tenantPrisma.insert('opening_balances', {
          entityId: company.entityId,
          accountId: entry.accountId,
          year,
          period,
          balance: entry.balance,
          balanceType: entry.balanceType,
        });
        imported++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Account ${entry.accountId}: ${msg}`);
        skipped++;
      }
    }

    return {
      imported,
      skipped,
      total: rows.length,
      totalDebit: toMoney(totalDebit),
      totalCredit: toMoney(totalCredit),
      difference: 0,
      errors,
    };
  }
}
