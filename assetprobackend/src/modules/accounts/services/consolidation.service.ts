import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import {
  ConsolidationQueryDto,
  ConsolidatedBalanceSheetQueryDto,
  ConsolidatedIncomeStatementQueryDto,
  ConsolidationReportDto,
  ConsolidatedBalanceSheetDto,
  ConsolidatedIncomeStatementDto,
  EliminationEntryDto,
  ConsolidatedAccountLineDto,
  ConsolidationMethod,
  EliminationType,
} from '../dto/consolidation.dto';

// ============================================================================
// INTERFACES FOR INTERNAL DATA STRUCTURES
// ============================================================================

interface CompanyBalance {
  companyId: number;
  companyName: string;
  accountCode: string;
  accountName: string;
  category: string;
  balance: number;
}

interface ConsolidatedAccount {
  accountCode: string;
  accountName: string;
  category: string;
  companyBalances: Map<number, number>;
  totalBeforeEliminations: number;
  eliminationAdjustments: number;
  consolidatedBalance: number;
}

@Injectable()
export class ConsolidationService {
  private readonly logger = new Logger(ConsolidationService.name);

  constructor(private readonly prisma: TenantPrismaService) {}

  /**
   * Generate consolidated balance sheet for multiple companies
   */
  async generateConsolidatedBalanceSheet(
    query: ConsolidatedBalanceSheetQueryDto,
    tenantId: string,
  ): Promise<ConsolidatedBalanceSheetDto> {
    this.logger.log(
      `Generating consolidated balance sheet for companies: ${query.companyIds.join(', ')}`,
    );

    // Validate companies exist
    await this.validateCompanies(query.companyIds, tenantId);

    // Get company details
    const companyNames = await this.getCompanyNames(query.companyIds, tenantId);

    // Determine date range
    const asOfDate = query.asOfDate || new Date().toISOString().split('T')[0];

    // Get balances for all companies
    const companyBalances = await this.getCompanyBalances(
      query.companyIds,
      asOfDate,
      tenantId,
    );

    // Consolidate balances
    const consolidatedAccounts = this.consolidateBalances(
      companyBalances,
      query.method || ConsolidationMethod.FULL,
    );

    // Apply elimination entries if requested
    let eliminationEntries: EliminationEntryDto[] = [];
    if (query.applyEliminations) {
      eliminationEntries = await this.generateEliminationEntries(
        query.companyIds,
        asOfDate,
        tenantId,
      );
      this.applyEliminations(consolidatedAccounts, eliminationEntries);
    }

    // Categorize accounts into assets, liabilities, equity
    const assets = this.filterByCategory(
      consolidatedAccounts,
      ['Current Assets', 'Non-Current Assets', 'Fixed Assets'],
    );
    const liabilities = this.filterByCategory(
      consolidatedAccounts,
      ['Current Liabilities', 'Non-Current Liabilities'],
    );
    const equity = this.filterByCategory(consolidatedAccounts, ['Equity']);

    // Calculate totals
    const totalAssets = this.sumBalances(assets);
    const totalLiabilities = this.sumBalances(liabilities);
    const totalEquity = this.sumBalances(equity);

    const totalBeforeEliminations = companyBalances.reduce(
      (sum, cb) => sum + Math.abs(cb.balance),
      0,
    );
    const totalEliminationAdjustments = eliminationEntries.reduce(
      (sum, ee) => sum + ee.debitAmount,
      0,
    );

    return {
      title: 'Consolidated Balance Sheet',
      subtitle: `As of ${asOfDate}`,
      asOfDate,
      companyIds: query.companyIds,
      companyNames: Object.fromEntries(
        Array.from(companyNames.entries()).map(([id, name]) => [id.toString(), name]),
      ),
      method: query.method || ConsolidationMethod.FULL,
      lines: this.toAccountLines(consolidatedAccounts, companyNames),
      totalBeforeEliminations,
      totalEliminationAdjustments,
      consolidatedTotal: totalAssets,
      eliminationEntries: query.includeAdjustmentDetails
        ? eliminationEntries
        : undefined,
      generatedAt: new Date().toISOString(),
      assets: this.toAccountLines(assets, companyNames),
      liabilities: this.toAccountLines(liabilities, companyNames),
      equity: this.toAccountLines(equity, companyNames),
      totalAssets,
      totalLiabilities,
      totalEquity,
    };
  }

  /**
   * Generate consolidated income statement for multiple companies
   */
  async generateConsolidatedIncomeStatement(
    query: ConsolidatedIncomeStatementQueryDto,
    tenantId: string,
  ): Promise<ConsolidatedIncomeStatementDto> {
    this.logger.log(
      `Generating consolidated income statement for companies: ${query.companyIds.join(', ')}`,
    );

    // Validate companies exist
    await this.validateCompanies(query.companyIds, tenantId);

    // Get company details
    const companyNames = await this.getCompanyNames(query.companyIds, tenantId);

    // Determine date range
    const startDate = query.startDate || `${new Date().getFullYear()}-01-01`;
    const endDate = query.endDate || new Date().toISOString().split('T')[0];

    // Get P&L balances for all companies
    const companyBalances = await this.getCompanyPLBalances(
      query.companyIds,
      startDate,
      endDate,
      tenantId,
    );

    // Consolidate balances
    const consolidatedAccounts = this.consolidateBalances(
      companyBalances,
      query.method || ConsolidationMethod.FULL,
    );

    // Apply elimination entries if requested
    let eliminationEntries: EliminationEntryDto[] = [];
    if (query.applyEliminations) {
      eliminationEntries = await this.generatePLEliminationEntries(
        query.companyIds,
        startDate,
        endDate,
        tenantId,
      );
      this.applyEliminations(consolidatedAccounts, eliminationEntries);
    }

    // Categorize accounts
    const revenue = this.filterByCategory(consolidatedAccounts, [
      'Revenue',
      'Sales',
    ]);
    const costOfSales = this.filterByCategory(consolidatedAccounts, [
      'Cost of Sales',
      'Cost of Goods Sold',
    ]);
    const operatingExpenses = this.filterByCategory(consolidatedAccounts, [
      'Operating Expenses',
      'Administrative Expenses',
      'Selling Expenses',
    ]);
    const otherIncomeExpenses = this.filterByCategory(consolidatedAccounts, [
      'Other Income',
      'Other Expenses',
      'Finance Costs',
    ]);

    // Calculate totals
    const totalRevenue = this.sumBalances(revenue);
    const totalCostOfSales = this.sumBalances(costOfSales);
    const grossProfit = totalRevenue - totalCostOfSales;
    const totalOperatingExpenses = this.sumBalances(operatingExpenses);
    const operatingProfit = grossProfit - totalOperatingExpenses;
    const totalOtherIncomeExpenses = this.sumBalances(otherIncomeExpenses);
    const netProfit = operatingProfit + totalOtherIncomeExpenses;

    const totalBeforeEliminations = companyBalances.reduce(
      (sum, cb) => sum + Math.abs(cb.balance),
      0,
    );
    const totalEliminationAdjustments = eliminationEntries.reduce(
      (sum, ee) => sum + ee.debitAmount,
      0,
    );

    return {
      title: 'Consolidated Income Statement',
      subtitle: `For the period ${startDate} to ${endDate}`,
      asOfDate: endDate,
      companyIds: query.companyIds,
      companyNames: Object.fromEntries(
        Array.from(companyNames.entries()).map(([id, name]) => [id.toString(), name]),
      ),
      method: query.method || ConsolidationMethod.FULL,
      lines: this.toAccountLines(consolidatedAccounts, companyNames),
      totalBeforeEliminations,
      totalEliminationAdjustments,
      consolidatedTotal: netProfit,
      eliminationEntries: query.includeAdjustmentDetails
        ? eliminationEntries
        : undefined,
      generatedAt: new Date().toISOString(),
      revenue: this.toAccountLines(revenue, companyNames),
      costOfSales: this.toAccountLines(costOfSales, companyNames),
      operatingExpenses: this.toAccountLines(operatingExpenses, companyNames),
      otherIncomeExpenses: this.toAccountLines(
        otherIncomeExpenses,
        companyNames,
      ),
      grossProfit,
      operatingProfit,
      netProfit,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate that all companies exist and belong to the tenant
   */
  private async validateCompanies(
    companyIds: number[],
    tenantId: string,
  ): Promise<void> {
    if (!companyIds || companyIds.length === 0) {
      throw new BadRequestException('At least one company ID is required');
    }

    const placeholders = companyIds.map((_, i) => `$${i + 1}`).join(', ');
    const companies = await this.prisma.query<{ id: number }>(
      `SELECT id FROM companies WHERE id IN (${placeholders}) AND "deletedAt" IS NULL`,
      companyIds,
    );

    if (companies.length !== companyIds.length) {
      const foundIds = companies.map((c) => c.id);
      const missingIds = companyIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Companies not found: ${missingIds.join(', ')}`,
      );
    }
  }

  /**
   * Get company names as a map
   */
  private async getCompanyNames(
    companyIds: number[],
    tenantId: string,
  ): Promise<Map<number, string>> {
    const placeholders = companyIds.map((_, i) => `$${i + 1}`).join(', ');
    const companies = await this.prisma.query<{ id: number; name: string }>(
      `SELECT id, name FROM companies WHERE id IN (${placeholders}) AND "deletedAt" IS NULL`,
      companyIds,
    );

    return new Map(companies.map((c) => [c.id, c.name]));
  }

  /**
   * Get account balances for all companies as of a date
   */
  private async getCompanyBalances(
    companyIds: number[],
    asOfDate: string,
    tenantId: string,
  ): Promise<CompanyBalance[]> {
    const balances: CompanyBalance[] = [];

    for (const companyId of companyIds) {
      const company = await this.prisma.queryOne<{ name: string }>(
        `SELECT name FROM companies WHERE id = $1`,
        [companyId],
      );

      // Get aggregated balances from journal entry lines
      const accountBalances = await this.prisma.query<{
        accountId: number;
        accountCode: string;
        accountName: string;
        categoryName: string;
        balance: string;
      }>(
        `SELECT a.id as "accountId", a.code as "accountCode", a.name as "accountName",
                COALESCE(ac.name, 'Uncategorized') as "categoryName",
                COALESCE(SUM(jl.debit - jl.credit), 0)::text as balance
         FROM ifrs_accounts a
         LEFT JOIN ifrs_account_categories ac ON a."categoryId" = ac.id
         LEFT JOIN journal_entry_line_items jl ON jl."accountId" = a.id
         LEFT JOIN journal_entries je ON jl."journalEntryId" = je.id AND je."companyId" = $1 AND je."entryDate" <= $2
         WHERE a."companyId" = $1 AND a."deletedAt" IS NULL
         GROUP BY a.id, a.code, a.name, ac.name
         HAVING COALESCE(SUM(jl.debit - jl.credit), 0) != 0
         ORDER BY a.code`,
        [companyId, new Date(asOfDate)],
      );

      for (const ab of accountBalances) {
        balances.push({
          companyId,
          companyName: company?.name || `Company ${companyId}`,
          accountCode: ab.accountCode,
          accountName: ab.accountName,
          category: ab.categoryName,
          balance: Number(ab.balance),
        });
      }
    }

    return balances;
  }

  /**
   * Get P&L account balances for all companies for a period
   */
  private async getCompanyPLBalances(
    companyIds: number[],
    startDate: string,
    endDate: string,
    tenantId: string,
  ): Promise<CompanyBalance[]> {
    const balances: CompanyBalance[] = [];

    for (const companyId of companyIds) {
      const company = await this.prisma.queryOne<{ name: string }>(
        `SELECT name FROM companies WHERE id = $1`,
        [companyId],
      );

      // Get P&L account balances
      const accountBalances = await this.prisma.query<{
        accountId: number;
        accountCode: string;
        accountName: string;
        categoryName: string;
        balance: string;
      }>(
        `SELECT a.id as "accountId", a.code as "accountCode", a.name as "accountName",
                COALESCE(ac.name, 'Uncategorized') as "categoryName",
                COALESCE(SUM(jl.debit - jl.credit), 0)::text as balance
         FROM ifrs_accounts a
         LEFT JOIN ifrs_account_categories ac ON a."categoryId" = ac.id
         LEFT JOIN journal_entry_line_items jl ON jl."accountId" = a.id
         LEFT JOIN journal_entries je ON jl."journalEntryId" = je.id
           AND je."companyId" = $1 AND je."entryDate" >= $2 AND je."entryDate" <= $3
         WHERE a."companyId" = $1 AND a."deletedAt" IS NULL
           AND a.type IN ('REVENUE', 'EXPENSE', 'COST_OF_SALES', 'OTHER_INCOME')
         GROUP BY a.id, a.code, a.name, ac.name
         HAVING COALESCE(SUM(jl.debit - jl.credit), 0) != 0
         ORDER BY a.code`,
        [companyId, new Date(startDate), new Date(endDate)],
      );

      for (const ab of accountBalances) {
        balances.push({
          companyId,
          companyName: company?.name || `Company ${companyId}`,
          accountCode: ab.accountCode,
          accountName: ab.accountName,
          category: ab.categoryName,
          balance: Number(ab.balance),
        });
      }
    }

    return balances;
  }

  /**
   * Consolidate balances from multiple companies
   */
  private consolidateBalances(
    companyBalances: CompanyBalance[],
    method: ConsolidationMethod,
  ): ConsolidatedAccount[] {
    const accountsMap = new Map<string, ConsolidatedAccount>();

    for (const cb of companyBalances) {
      const key = `${cb.accountCode}|${cb.accountName}`;
      let account = accountsMap.get(key);

      if (!account) {
        account = {
          accountCode: cb.accountCode,
          accountName: cb.accountName,
          category: cb.category,
          companyBalances: new Map(),
          totalBeforeEliminations: 0,
          eliminationAdjustments: 0,
          consolidatedBalance: 0,
        };
        accountsMap.set(key, account);
      }

      // Apply consolidation method
      let adjustedBalance = cb.balance;
      if (method === ConsolidationMethod.PROPORTIONAL) {
        adjustedBalance = cb.balance * 1.0; // 100% for now
      } else if (method === ConsolidationMethod.EQUITY) {
        adjustedBalance = cb.balance * 1.0; // Simplified
      }

      account.companyBalances.set(cb.companyId, adjustedBalance);
      account.totalBeforeEliminations += adjustedBalance;
      account.consolidatedBalance += adjustedBalance;
    }

    return Array.from(accountsMap.values());
  }

  /**
   * Generate elimination entries for inter-company transactions
   */
  private async generateEliminationEntries(
    companyIds: number[],
    asOfDate: string,
    tenantId: string,
  ): Promise<EliminationEntryDto[]> {
    const eliminations: EliminationEntryDto[] = [];

    // Placeholder - generate sample eliminations
    if (companyIds.length >= 2) {
      eliminations.push({
        id: 1,
        type: EliminationType.INTER_COMPANY_RECEIVABLES,
        description: `Eliminate inter-company receivables between companies`,
        debitAccountCode: '2100',
        debitAccountName: 'Accounts Payable',
        debitAmount: 0,
        creditAccountCode: '1200',
        creditAccountName: 'Accounts Receivable',
        creditAmount: 0,
        sourceCompanyId: companyIds[0],
        sourceCompanyName: `Company ${companyIds[0]}`,
        targetCompanyId: companyIds[1],
        targetCompanyName: `Company ${companyIds[1]}`,
      });
    }

    return eliminations;
  }

  /**
   * Generate P&L elimination entries
   */
  private async generatePLEliminationEntries(
    companyIds: number[],
    startDate: string,
    endDate: string,
    tenantId: string,
  ): Promise<EliminationEntryDto[]> {
    const eliminations: EliminationEntryDto[] = [];

    // Placeholder for inter-company sales eliminations
    if (companyIds.length >= 2) {
      eliminations.push({
        id: 1,
        type: EliminationType.INTER_COMPANY_SALES,
        description: `Eliminate inter-company sales`,
        debitAccountCode: '4000',
        debitAccountName: 'Sales Revenue',
        debitAmount: 0,
        creditAccountCode: '5000',
        creditAccountName: 'Cost of Goods Sold',
        creditAmount: 0,
        sourceCompanyId: companyIds[0],
        sourceCompanyName: `Company ${companyIds[0]}`,
        targetCompanyId: companyIds[1],
        targetCompanyName: `Company ${companyIds[1]}`,
      });
    }

    return eliminations;
  }

  /**
   * Apply elimination entries to consolidated accounts
   */
  private applyEliminations(
    accounts: ConsolidatedAccount[],
    eliminations: EliminationEntryDto[],
  ): void {
    for (const elimination of eliminations) {
      const debitAccount = accounts.find(
        (a) => a.accountCode === elimination.debitAccountCode,
      );
      if (debitAccount) {
        debitAccount.eliminationAdjustments += elimination.debitAmount;
        debitAccount.consolidatedBalance += elimination.debitAmount;
      }

      const creditAccount = accounts.find(
        (a) => a.accountCode === elimination.creditAccountCode,
      );
      if (creditAccount) {
        creditAccount.eliminationAdjustments -= elimination.creditAmount;
        creditAccount.consolidatedBalance -= elimination.creditAmount;
      }
    }
  }

  /**
   * Filter accounts by category
   */
  private filterByCategory(
    accounts: ConsolidatedAccount[],
    categories: string[],
  ): ConsolidatedAccount[] {
    return accounts.filter((a) => categories.includes(a.category));
  }

  /**
   * Sum balances
   */
  private sumBalances(accounts: ConsolidatedAccount[]): number {
    return accounts.reduce((sum, a) => sum + a.consolidatedBalance, 0);
  }

  /**
   * Convert consolidated accounts to DTO format
   */
  private toAccountLines(
    accounts: ConsolidatedAccount[],
    companyNames: Map<number, string>,
  ): ConsolidatedAccountLineDto[] {
    return accounts.map((account) => ({
      accountCode: account.accountCode,
      accountName: account.accountName,
      category: account.category,
      companyBalances: Object.fromEntries(
        Array.from(account.companyBalances.entries()).map(([id, balance]) => [
          companyNames.get(id) || `Company ${id}`,
          balance,
        ]),
      ),
      totalBeforeEliminations: account.totalBeforeEliminations,
      eliminationAdjustments: account.eliminationAdjustments,
      consolidatedBalance: account.consolidatedBalance,
    }));
  }
}
