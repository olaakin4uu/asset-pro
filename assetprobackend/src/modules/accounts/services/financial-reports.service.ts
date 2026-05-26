import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { toMoney } from '../../../common/utils/decimal';
import {
  BalanceSheetQueryDto,
  IncomeStatementQueryDto,
  TrialBalanceQueryDto,
  CashFlowQueryDto,
  AccountStatementQueryDto,
  GroupedTrialBalanceQueryDto,
} from '../dto/financial-reports.dto';

// ============================================================================
// INTERFACES FOR REPORT DATA STRUCTURES
// ============================================================================

export interface AccountBalanceItem {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  categoryName: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalanceItem {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  categoryName: string | null;
  debit: number;
  credit: number;
}

export interface TrialBalanceReport {
  companyId: number;
  companyName: string;
  asOfDate: string;
  fiscalYearId: number | null;
  fiscalYearName: string | null;
  items: TrialBalanceItem[];
  totals: {
    debit: number;
    credit: number;
  };
  isBalanced: boolean;
  generatedAt: string;
}

export interface GroupedTrialBalanceAccount {
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface GroupedTrialBalanceSection {
  groupName: string;
  accountType: string;
  accounts: GroupedTrialBalanceAccount[];
  totalDebit: number;
  totalCredit: number;
  totalBalance: number;
}

export interface GroupedTrialBalanceReport {
  companyId: number;
  companyName: string;
  asOfDate: string;
  fiscalYearId: number | null;
  fiscalYearName: string | null;
  groupedBy: string;
  sections: GroupedTrialBalanceSection[];
  totals: {
    debit: number;
    credit: number;
    balance: number;
  };
  isBalanced: boolean;
  generatedAt: string;
}

export interface BalanceSheetSection {
  name: string;
  items: {
    accountId: number;
    accountCode: string;
    accountName: string;
    balance: number;
    percentage?: number;
  }[];
  total: number;
  percentage?: number;
}

export interface BalanceSheetReport {
  companyId: number;
  companyName: string;
  asOfDate: string;
  fiscalYearId: number | null;
  fiscalYearName: string | null;
  assets: {
    nonCurrentAssets: BalanceSheetSection;
    currentAssets: BalanceSheetSection;
    totalAssets: number;
  };
  liabilities: {
    nonCurrentLiabilities: BalanceSheetSection;
    currentLiabilities: BalanceSheetSection;
    totalLiabilities: number;
  };
  equity: {
    shareCapital: BalanceSheetSection;
    retainedEarnings: number;
    currentYearProfit: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
  variance: number;
  generatedAt: string;
}

export interface IncomeStatementSection {
  name: string;
  items: {
    accountId: number;
    accountCode: string;
    accountName: string;
    amount: number;
    percentage?: number;
  }[];
  total: number;
  percentage?: number;
}

export interface IncomeStatementReport {
  companyId: number;
  companyName: string;
  startDate: string;
  endDate: string;
  fiscalYearId: number | null;
  fiscalYearName: string | null;
  revenue: IncomeStatementSection;
  costOfSales: IncomeStatementSection;
  grossProfit: number;
  grossProfitMargin: number;
  operatingExpenses: IncomeStatementSection;
  operatingProfit: number;
  operatingProfitMargin: number;
  otherIncome: IncomeStatementSection;
  otherExpenses: IncomeStatementSection;
  profitBeforeTax: number;
  taxExpense: number;
  netProfit: number;
  netProfitMargin: number;
  generatedAt: string;
}

export interface CashFlowSection {
  name: string;
  items: {
    description: string;
    amount: number;
  }[];
  total: number;
}

export interface CashFlowStatement {
  companyId: number;
  companyName: string;
  startDate: string;
  endDate: string;
  fiscalYearId: number | null;
  fiscalYearName: string | null;
  operatingActivities: CashFlowSection;
  investingActivities: CashFlowSection;
  financingActivities: CashFlowSection;
  netCashFlow: number;
  openingCashBalance: number;
  closingCashBalance: number;
  generatedAt: string;
}

export interface AccountStatementEntry {
  date: Date;
  entryNumber: string;
  reference: string | null;
  narration: string;
  debit: number | null;
  credit: number | null;
  balance: number;
}

export interface AccountStatementReport {
  companyId: number;
  companyName: string;
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  entries: AccountStatementEntry[];
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  generatedAt: string;
}

@Injectable()
export class FinancialReportsService {
  private readonly logger = new Logger(FinancialReportsService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // TRIAL BALANCE
  // ============================================================================

  async getTrialBalance(
    companyId: number,
    query: TrialBalanceQueryDto,
  ): Promise<TrialBalanceReport> {
    const asOfDate = query.asOfDate || new Date().toISOString().split('T')[0];

    // Get company info
    const company = await this.tenantPrisma.queryOne<{ id: number; name: string }>(
      `SELECT id, name FROM companies WHERE id = $1`,
      [companyId],
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get fiscal year if specified
    let fiscalYear: { id: number; name: string } | null = null;
    if (query.fiscalYearId) {
      fiscalYear = await this.tenantPrisma.queryOne<{ id: number; name: string }>(
        `SELECT id, name FROM fiscal_years WHERE id = $1 AND "companyId" = $2`,
        [query.fiscalYearId, companyId],
      );
    }

    // Get all accounts with their balances
    const accountsData = await this.tenantPrisma.query<{
      id: number;
      code: string;
      name: string;
      accountType: string;
      categoryName: string | null;
      totalDebit: any;
      totalCredit: any;
    }>(
      `
      SELECT
        a.id,
        a.code,
        a.name,
        a."accountType",
        c.name as "categoryName",
        COALESCE(SUM(jel.debit), 0) as "totalDebit",
        COALESCE(SUM(jel.credit), 0) as "totalCredit"
      FROM ifrs_accounts a
      LEFT JOIN ifrs_categories c ON c.id = a."categoryId"
      LEFT JOIN journal_entry_line_items jel ON jel."accountId" = a.id
      LEFT JOIN journal_entries je ON je.id = jel."journalEntryId"
      WHERE a."companyId" = $1
        AND a."isPosting" = true
        AND a."isActive" = true
        AND a."deletedAt" IS NULL
        AND (je.id IS NULL OR (
          je."entryDate" <= $2::date
          AND je.status = 'posted'
          ${query.fiscalYearId ? `AND je."fiscalYearId" = $3` : ''}
        ))
      GROUP BY a.id, a.code, a.name, a."accountType", c.name
      ORDER BY a.code
      `,
      query.fiscalYearId ? [companyId, asOfDate, query.fiscalYearId] : [companyId, asOfDate],
    );

    // Load opening balances from ifrs_balances
    const openingBalanceMap = await this.loadOpeningBalanceMap(companyId);

    const items: TrialBalanceItem[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const account of accountsData) {
      const ob = openingBalanceMap.get(account.id);
      const grossDebit = toMoney(account.totalDebit) + (ob?.debit ?? 0);
      const grossCredit = toMoney(account.totalCredit) + (ob?.credit ?? 0);

      // Calculate net balance — show on ONE side only
      const net = grossDebit - grossCredit;
      const debit = net > 0 ? net : 0;
      const credit = net < 0 ? Math.abs(net) : 0;

      // Skip zero balances if not requested
      if (!query.includeZeroBalances && debit === 0 && credit === 0) {
        continue;
      }

      items.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.accountType,
        categoryName: account.categoryName,
        debit,
        credit,
      });

      totalDebit += debit;
      totalCredit += credit;
    }

    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return {
      companyId: company.id,
      companyName: company.name,
      asOfDate,
      fiscalYearId: fiscalYear?.id || null,
      fiscalYearName: fiscalYear?.name || null,
      items,
      totals: {
        debit: totalDebit,
        credit: totalCredit,
      },
      isBalanced,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // GROUPED TRIAL BALANCE
  // ============================================================================

  async getGroupedTrialBalance(
    companyId: number,
    query: GroupedTrialBalanceQueryDto,
  ): Promise<GroupedTrialBalanceReport> {
    const asOfDate = query.asOfDate || new Date().toISOString().split('T')[0];
    const groupBy = query.groupBy || 'category';

    // Get company info
    const company = await this.tenantPrisma.queryOne<{ id: number; name: string }>(
      `SELECT id, name FROM companies WHERE id = $1`,
      [companyId],
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get fiscal year if specified
    let fiscalYear: { id: number; name: string } | null = null;
    if (query.fiscalYearId) {
      fiscalYear = await this.tenantPrisma.queryOne<{ id: number; name: string }>(
        `SELECT id, name FROM fiscal_years WHERE id = $1 AND "companyId" = $2`,
        [query.fiscalYearId, companyId],
      );
    }

    // Get all accounts with their balances
    const accountsData = await this.tenantPrisma.query<{
      id: number;
      code: string;
      name: string;
      accountType: string;
      categoryId: number | null;
      categoryName: string | null;
      totalDebit: any;
      totalCredit: any;
    }>(
      `
      SELECT
        a.id,
        a.code,
        a.name,
        a."accountType",
        a."categoryId",
        c.name as "categoryName",
        COALESCE(SUM(jel.debit), 0) as "totalDebit",
        COALESCE(SUM(jel.credit), 0) as "totalCredit"
      FROM ifrs_accounts a
      LEFT JOIN ifrs_categories c ON c.id = a."categoryId"
      LEFT JOIN journal_entry_line_items jel ON jel."accountId" = a.id
      LEFT JOIN journal_entries je ON je.id = jel."journalEntryId"
      WHERE a."companyId" = $1
        AND a."isPosting" = true
        AND a."isActive" = true
        AND a."deletedAt" IS NULL
        AND (je.id IS NULL OR (
          je."entryDate" <= $2::date
          AND je.status = 'posted'
          ${query.fiscalYearId ? `AND je."fiscalYearId" = $3` : ''}
        ))
      GROUP BY a.id, a.code, a.name, a."accountType", a."categoryId", c.name
      ORDER BY a."accountType", ${groupBy === 'category' ? 'c.name' : 'a."accountType"'}, a.code
      `,
      query.fiscalYearId ? [companyId, asOfDate, query.fiscalYearId] : [companyId, asOfDate],
    );

    // Load opening balances from ifrs_balances
    const openingBalanceMap = await this.loadOpeningBalanceMap(companyId);

    // Group accounts
    const groupMap = new Map<string, GroupedTrialBalanceSection>();

    for (const account of accountsData) {
      const ob = openingBalanceMap.get(account.id);
      const debit = toMoney(account.totalDebit) + (ob?.debit ?? 0);
      const credit = toMoney(account.totalCredit) + (ob?.credit ?? 0);
      const balance = debit - credit;

      // Skip zero balances if not requested
      if (!query.includeZeroBalances && debit === 0 && credit === 0) {
        continue;
      }

      // Determine group key
      let groupKey: string;
      let groupName: string;

      if (groupBy === 'category') {
        groupKey = account.categoryName || 'Uncategorized';
        groupName = account.categoryName || 'Uncategorized';
      } else {
        groupKey = account.accountType;
        groupName = this.formatAccountType(account.accountType);
      }

      // Create or get group
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          groupName,
          accountType: account.accountType,
          accounts: [],
          totalDebit: 0,
          totalCredit: 0,
          totalBalance: 0,
        });
      }

      const group = groupMap.get(groupKey)!;

      // Add account to group
      group.accounts.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        debit,
        credit,
        balance,
      });

      // Update group totals
      group.totalDebit += debit;
      group.totalCredit += credit;
      group.totalBalance += balance;
    }

    // Convert map to array and sort by account type and group name
    const sections = Array.from(groupMap.values()).sort((a, b) => {
      // Sort by account type first (asset, liability, equity, revenue, expense)
      const typeOrder = { asset: 1, liability: 2, equity: 3, revenue: 4, expense: 5 };
      const typeCompare =
        (typeOrder[a.accountType] || 99) - (typeOrder[b.accountType] || 99);
      if (typeCompare !== 0) return typeCompare;

      // Then by group name
      return a.groupName.localeCompare(b.groupName);
    });

    // Calculate grand totals
    let grandTotalDebit = 0;
    let grandTotalCredit = 0;
    let grandTotalBalance = 0;

    for (const section of sections) {
      grandTotalDebit += section.totalDebit;
      grandTotalCredit += section.totalCredit;
      grandTotalBalance += section.totalBalance;
    }

    const isBalanced = Math.abs(grandTotalDebit - grandTotalCredit) < 0.01;

    return {
      companyId: company.id,
      companyName: company.name,
      asOfDate,
      fiscalYearId: fiscalYear?.id || null,
      fiscalYearName: fiscalYear?.name || null,
      groupedBy: groupBy,
      sections,
      totals: {
        debit: grandTotalDebit,
        credit: grandTotalCredit,
        balance: grandTotalBalance,
      },
      isBalanced,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // BALANCE SHEET
  // ============================================================================

  async getBalanceSheet(
    companyId: number,
    query: BalanceSheetQueryDto,
  ): Promise<BalanceSheetReport> {
    const asOfDate = query.asOfDate || new Date().toISOString().split('T')[0];

    // Get company info
    const company = await this.tenantPrisma.queryOne<{ id: number; name: string }>(
      `SELECT id, name FROM companies WHERE id = $1`,
      [companyId],
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get fiscal year if specified
    let fiscalYear: { id: number; name: string } | null = null;
    if (query.fiscalYearId) {
      fiscalYear = await this.tenantPrisma.queryOne<{ id: number; name: string }>(
        `SELECT id, name FROM fiscal_years WHERE id = $1 AND "companyId" = $2`,
        [query.fiscalYearId, companyId],
      );
    }

    // Load opening balances from ifrs_balances
    const openingBalanceMap = await this.loadOpeningBalanceMap(companyId);

    // Helper to calculate account balances (transactions + opening balances)
    const getAccountBalances = async (accountType: string) => {
      const accounts = await this.tenantPrisma.query<{
        id: number;
        code: string;
        name: string;
        accountType: string;
        categoryType: string | null;
        totalDebit: any;
        totalCredit: any;
      }>(
        `
        SELECT
          a.id,
          a.code,
          a.name,
          a."accountType",
          c."categoryType",
          COALESCE(SUM(jel.debit), 0) as "totalDebit",
          COALESCE(SUM(jel.credit), 0) as "totalCredit"
        FROM ifrs_accounts a
        LEFT JOIN ifrs_categories c ON c.id = a."categoryId"
        LEFT JOIN journal_entry_line_items jel ON jel."accountId" = a.id
        LEFT JOIN journal_entries je ON je.id = jel."journalEntryId"
        WHERE a."companyId" = $1
          AND a."accountType" = $2
          AND a."isPosting" = true
          AND a."isActive" = true
          AND a."deletedAt" IS NULL
          AND (je.id IS NULL OR (
            je."entryDate" <= $3::date
            AND je.status = 'posted'
            ${query.fiscalYearId ? `AND je."fiscalYearId" = $4` : ''}
          ))
        GROUP BY a.id, a.code, a.name, a."accountType", c."categoryType"
        ORDER BY a.code
        `,
        query.fiscalYearId
          ? [companyId, accountType, asOfDate, query.fiscalYearId]
          : [companyId, accountType, asOfDate],
      );

      // Filter out accounts with zero balance (after including opening balances)
      return accounts.filter((acc) => {
        const ob = openingBalanceMap.get(acc.id);
        const totalDebit = toMoney(acc.totalDebit) + (ob?.debit ?? 0);
        const totalCredit = toMoney(acc.totalCredit) + (ob?.credit ?? 0);
        return Math.abs(totalDebit - totalCredit) > 0.01;
      });
    };

    // Get asset accounts
    const assetAccounts = await getAccountBalances('asset');
    const liabilityAccounts = await getAccountBalances('liability');
    const equityAccounts = await getAccountBalances('equity');

    // Helper to build section (includes opening balances)
    const buildSection = (
      accounts: { id: number; code: string; name: string; categoryType: string | null; totalDebit: string; totalCredit: string }[],
      filter: (acc: { code: string; categoryType: string | null }) => boolean,
      isCredit = false,
    ): BalanceSheetSection => {
      const filteredAccounts = accounts.filter((a) => filter(a));
      const items = filteredAccounts.map((acc) => {
        const ob = openingBalanceMap.get(acc.id);
        const debit = toMoney(acc.totalDebit) + (ob?.debit ?? 0);
        const credit = toMoney(acc.totalCredit) + (ob?.credit ?? 0);
        const balance = isCredit ? credit - debit : debit - credit;
        return {
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          balance,
        };
      });
      const total = items.reduce((sum, item) => sum + item.balance, 0);
      return {
        name: '',
        items,
        total,
      };
    };

    // Classify using categoryType from ifrs_categories (not code prefixes)
    const CURRENT_ASSET_TYPES = new Set([
      'current_asset', 'cash', 'bank', 'receivable',
      'inventory', 'prepayment', 'other_current_asset',
    ]);
    const CURRENT_LIABILITY_TYPES = new Set([
      'current_liability', 'payable', 'accrued_liability',
      'tax_payable', 'other_current_liability', 'control',
    ]);

    const currentAssets = buildSection(
      assetAccounts,
      (a) => CURRENT_ASSET_TYPES.has(a.categoryType || '') || !a.categoryType,
    );
    currentAssets.name = 'Current Assets';

    const nonCurrentAssets = buildSection(
      assetAccounts,
      (a) => !CURRENT_ASSET_TYPES.has(a.categoryType || '') && a.categoryType != null,
    );
    nonCurrentAssets.name = 'Non-Current Assets';

    const currentLiabilities = buildSection(
      liabilityAccounts,
      (a) => CURRENT_LIABILITY_TYPES.has(a.categoryType || '') || !a.categoryType,
      true,
    );
    currentLiabilities.name = 'Current Liabilities';

    const nonCurrentLiabilities = buildSection(
      liabilityAccounts,
      (a) => !CURRENT_LIABILITY_TYPES.has(a.categoryType || '') && a.categoryType != null,
      true,
    );
    nonCurrentLiabilities.name = 'Non-Current Liabilities';

    const shareCapital = buildSection(equityAccounts, () => true, true);
    shareCapital.name = 'Share Capital & Reserves';

    // Calculate retained earnings and current year profit
    const profitData = await this.calculateProfitLoss(companyId, asOfDate, query.fiscalYearId);
    const retainedEarnings = profitData.retainedEarnings;
    const currentYearProfit = profitData.currentYearProfit;

    // Calculate totals
    const totalAssets = currentAssets.total + nonCurrentAssets.total;
    const totalLiabilities = currentLiabilities.total + nonCurrentLiabilities.total;
    const totalEquity = shareCapital.total + retainedEarnings + currentYearProfit;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;
    const variance = totalAssets - totalLiabilitiesAndEquity;

    return {
      companyId: company.id,
      companyName: company.name,
      asOfDate,
      fiscalYearId: fiscalYear?.id || null,
      fiscalYearName: fiscalYear?.name || null,
      assets: {
        currentAssets,
        nonCurrentAssets,
        totalAssets,
      },
      liabilities: {
        currentLiabilities,
        nonCurrentLiabilities,
        totalLiabilities,
      },
      equity: {
        shareCapital,
        retainedEarnings,
        currentYearProfit,
        totalEquity,
      },
      totalLiabilitiesAndEquity,
      isBalanced,
      variance,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // INCOME STATEMENT (P&L)
  // ============================================================================

  async getIncomeStatement(
    companyId: number,
    query: IncomeStatementQueryDto,
  ): Promise<IncomeStatementReport> {
    const endDate = query.endDate || new Date().toISOString().split('T')[0];
    const startDate = query.startDate || `${endDate.substring(0, 4)}-01-01`;

    // Get company info
    const company = await this.tenantPrisma.queryOne<{ id: number; name: string }>(
      `SELECT id, name FROM companies WHERE id = $1`,
      [companyId],
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get fiscal year if specified
    let fiscalYear: { id: number; name: string } | null = null;
    if (query.fiscalYearId) {
      fiscalYear = await this.tenantPrisma.queryOne<{ id: number; name: string }>(
        `SELECT id, name FROM fiscal_years WHERE id = $1 AND "companyId" = $2`,
        [query.fiscalYearId, companyId],
      );
    }

    // Helper to get account totals with GL category info
    const getAccountTotals = async (accountType: string, useDebit: boolean) => {
      const netExpr = useDebit
        ? 'COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0)'
        : 'COALESCE(SUM(jel.credit), 0) - COALESCE(SUM(jel.debit), 0)';
      return this.tenantPrisma.query<{
        id: number;
        code: string;
        name: string;
        total: number;
        categoryType: string | null;
      }>(
        `
        SELECT
          a.id,
          a.code,
          a.name,
          ic."categoryType",
          ${netExpr} as total
        FROM ifrs_accounts a
        LEFT JOIN ifrs_categories ic ON ic.id = a."categoryId"
        LEFT JOIN journal_entry_line_items jel ON jel."accountId" = a.id
        LEFT JOIN journal_entries je ON je.id = jel."journalEntryId"
        WHERE a."companyId" = $1
          AND a."accountType" = $2
          AND a."isPosting" = true
          AND a."isActive" = true
          AND a."deletedAt" IS NULL
          AND (je.id IS NULL OR (
            je."entryDate" >= $3::date
            AND je."entryDate" <= $4::date
            AND je.status = 'posted'
            ${query.fiscalYearId ? `AND je."fiscalYearId" = $5` : ''}
          ))
        GROUP BY a.id, a.code, a.name, ic."categoryType"
        HAVING ABS(${netExpr}) > 0.01
        ORDER BY a.code
        `,
        query.fiscalYearId
          ? [companyId, accountType, startDate, endDate, query.fiscalYearId]
          : [companyId, accountType, startDate, endDate],
      );
    };

    // Revenue (credits) — operating revenue only; non_operating_revenue goes to Other Income
    const revenueAccounts = await getAccountTotals('revenue', false);
    const revenue: IncomeStatementSection = {
      name: 'Revenue',
      items: revenueAccounts
        .filter((acc) => acc.categoryType !== 'non_operating_revenue')
        .map((acc) => ({
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          amount: toMoney(acc.total),
        })),
      total: 0,
    };
    revenue.total = revenue.items.reduce((sum, item) => sum + item.amount, 0);

    // Expenses (debits) — classified by ifrs_categories.categoryType (GL mapping)
    const expenseAccounts = await getAccountTotals('expense', true);

    // COS = direct_expense category (Direct Costs, Cost of Goods Sold)
    const COS_CATEGORY_TYPES = new Set(['direct_expense']);
    // Other Expenses = other_expense category
    const OTHER_EXPENSE_CATEGORY_TYPES = new Set(['other_expense']);

    const costOfSalesAccounts = expenseAccounts.filter((a) => COS_CATEGORY_TYPES.has(a.categoryType ?? ''));
    const costOfSales: IncomeStatementSection = {
      name: 'Cost of Sales',
      items: costOfSalesAccounts.map((acc) => ({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        amount: toMoney(acc.total),
      })),
      total: 0,
    };
    costOfSales.total = costOfSales.items.reduce((sum, item) => sum + item.amount, 0);

    // Operating Expenses = everything that is not COS and not other_expense
    const operatingExpenseAccounts = expenseAccounts.filter(
      (a) => !COS_CATEGORY_TYPES.has(a.categoryType ?? '') && !OTHER_EXPENSE_CATEGORY_TYPES.has(a.categoryType ?? ''),
    );
    const operatingExpenses: IncomeStatementSection = {
      name: 'Operating Expenses',
      items: operatingExpenseAccounts.map((acc) => ({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        amount: toMoney(acc.total),
      })),
      total: 0,
    };
    operatingExpenses.total = operatingExpenses.items.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    // Other Income: non_operating_revenue accounts (already fetched above)
    const otherIncome: IncomeStatementSection = {
      name: 'Other Income',
      items: revenueAccounts
        .filter((a) => a.categoryType === 'non_operating_revenue')
        .map((acc) => ({
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          amount: toMoney(acc.total),
        })),
      total: 0,
    };
    otherIncome.total = otherIncome.items.reduce((sum, item) => sum + item.amount, 0);

    // Other Expenses: other_expense category
    const otherExpenseAccounts = expenseAccounts.filter((a) => OTHER_EXPENSE_CATEGORY_TYPES.has(a.categoryType ?? ''));
    const otherExpenses: IncomeStatementSection = {
      name: 'Other Expenses',
      items: otherExpenseAccounts.map((acc) => ({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        amount: toMoney(acc.total),
      })),
      total: 0,
    };
    otherExpenses.total = otherExpenses.items.reduce((sum, item) => sum + item.amount, 0);

    // Calculate profit metrics
    const grossProfit = revenue.total - costOfSales.total;
    const operatingProfit = grossProfit - operatingExpenses.total;
    const profitBeforeTax = operatingProfit + otherIncome.total - otherExpenses.total;
    // Calculate tax expense from tax-related accounts (91xx, 92xx, or accounts named tax expense/income tax)
    let taxExpense = 0;
    try {
      const taxExpenseResult = await this.tenantPrisma.queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as total
         FROM journal_entry_line_items jel
         JOIN journal_entries je ON je.id = jel."journalEntryId"
         JOIN ifrs_accounts a ON a.id = jel."accountId"
         WHERE je."companyId" = $1
           AND je.status = 'posted'
           AND je."entryDate" BETWEEN $2::date AND $3::date
           AND (a.name ILIKE '%tax expense%' OR a.name ILIKE '%income tax%' OR a."accountType" = 'tax_expense')`,
        [companyId, startDate, endDate],
      );
      taxExpense = toMoney(taxExpenseResult?.total);
    } catch (err) {
      this.logger.warn(`Failed to calculate tax expense for company ${companyId}: ${err.message}`);
      taxExpense = 0;
    }
    const netProfit = profitBeforeTax - taxExpense;

    // Calculate margins
    const grossProfitMargin = revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0;
    const operatingProfitMargin =
      revenue.total > 0 ? (operatingProfit / revenue.total) * 100 : 0;
    const netProfitMargin = revenue.total > 0 ? (netProfit / revenue.total) * 100 : 0;

    return {
      companyId: company.id,
      companyName: company.name,
      startDate,
      endDate,
      fiscalYearId: fiscalYear?.id || null,
      fiscalYearName: fiscalYear?.name || null,
      revenue,
      costOfSales,
      grossProfit,
      grossProfitMargin,
      operatingExpenses,
      operatingProfit,
      operatingProfitMargin,
      otherIncome,
      otherExpenses,
      profitBeforeTax,
      taxExpense,
      netProfit,
      netProfitMargin,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // CASH FLOW STATEMENT
  // ============================================================================

  async getCashFlowStatement(
    companyId: number,
    query: CashFlowQueryDto,
  ): Promise<CashFlowStatement> {
    const endDate = query.endDate || new Date().toISOString().split('T')[0];
    const startDate = query.startDate || `${endDate.substring(0, 4)}-01-01`;

    // Get company info
    const company = await this.tenantPrisma.queryOne<{ id: number; name: string }>(
      `SELECT id, name FROM companies WHERE id = $1`,
      [companyId],
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get fiscal year if specified
    let fiscalYear: { id: number; name: string } | null = null;
    if (query.fiscalYearId) {
      fiscalYear = await this.tenantPrisma.queryOne<{ id: number; name: string }>(
        `SELECT id, name FROM fiscal_years WHERE id = $1 AND "companyId" = $2`,
        [query.fiscalYearId, companyId],
      );
    }

    // Get net profit from income statement
    const incomeStatement = await this.getIncomeStatement(companyId, {
      startDate,
      endDate,
      fiscalYearId: query.fiscalYearId,
    });
    const netProfit = incomeStatement.netProfit;

    // Operating Activities
    const operatingActivities: CashFlowSection = {
      name: 'Cash Flow from Operating Activities',
      items: [
        {
          description: 'Net Profit',
          amount: netProfit,
        },
      ],
      total: 0,
    };

    // Non-cash adjustments (depreciation & amortization)
    try {
      const depreciation = await this.getDepreciationExpense(companyId, startDate, endDate);
      if (depreciation > 0) {
        operatingActivities.items.push({
          description: 'Depreciation & Amortization',
          amount: depreciation,
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to calculate depreciation for company ${companyId}: ${err.message}`);
    }

    // Working capital changes
    try {
      const workingCapitalChanges = await this.getWorkingCapitalChanges(companyId, startDate, endDate);
      operatingActivities.items.push(...workingCapitalChanges);
    } catch (err) {
      this.logger.warn(`Failed to calculate working capital changes for company ${companyId}: ${err.message}`);
    }

    operatingActivities.total = operatingActivities.items.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    // Investing Activities
    const investingActivities: CashFlowSection = {
      name: 'Cash Flow from Investing Activities',
      items: [],
      total: 0,
    };

    try {
      const investingItems = await this.getInvestingActivities(companyId, startDate, endDate);
      investingActivities.items = investingItems;
      investingActivities.total = investingItems.reduce((sum, item) => sum + item.amount, 0);
    } catch (err) {
      this.logger.warn(`Failed to calculate investing activities for company ${companyId}: ${err.message}`);
    }

    // Financing Activities
    const financingActivities: CashFlowSection = {
      name: 'Cash Flow from Financing Activities',
      items: [],
      total: 0,
    };

    try {
      const financingItems = await this.getFinancingActivities(companyId, startDate, endDate);
      financingActivities.items = financingItems;
      financingActivities.total = financingItems.reduce((sum, item) => sum + item.amount, 0);
    } catch (err) {
      this.logger.warn(`Failed to calculate financing activities for company ${companyId}: ${err.message}`);
    }

    // Calculate net cash flow
    const netCashFlow =
      operatingActivities.total +
      investingActivities.total +
      financingActivities.total;

    // Get opening and closing cash balances
    // This requires identifying cash/bank accounts
    const openingCashBalance = await this.getCashBalance(companyId, startDate, true);
    const closingCashBalance = await this.getCashBalance(companyId, endDate, false);

    return {
      companyId: company.id,
      companyName: company.name,
      startDate,
      endDate,
      fiscalYearId: fiscalYear?.id || null,
      fiscalYearName: fiscalYear?.name || null,
      operatingActivities,
      investingActivities,
      financingActivities,
      netCashFlow,
      openingCashBalance,
      closingCashBalance,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // ACCOUNT STATEMENT (LEDGER)
  // ============================================================================

  async getAccountStatement(
    companyId: number,
    accountId: number,
    query: AccountStatementQueryDto,
  ): Promise<AccountStatementReport> {
    const endDate = query.endDate || new Date().toISOString().split('T')[0];
    const startDate = query.startDate || `${endDate.substring(0, 4)}-01-01`;

    // Get company info
    const company = await this.tenantPrisma.queryOne<{ id: number; name: string }>(
      `SELECT id, name FROM companies WHERE id = $1`,
      [companyId],
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get account info
    const account = await this.tenantPrisma.queryOne<{
      id: number;
      code: string;
      name: string;
      accountType: string;
    }>(
      `SELECT id, code, name, "accountType" FROM ifrs_accounts WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [accountId, companyId],
    );

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Get opening balance
    const openingBalanceData = await this.tenantPrisma.queryOne<{ debit: any; credit: any }>(
      `
      SELECT
        COALESCE(SUM(jel.debit), 0) as debit,
        COALESCE(SUM(jel.credit), 0) as credit
      FROM journal_entry_line_items jel
      JOIN journal_entries je ON je.id = jel."journalEntryId"
      WHERE jel."accountId" = $1
        AND je."companyId" = $2
        AND je."entryDate" < $3::date
        AND je.status = 'posted'
        AND je."deletedAt" IS NULL
      `,
      [accountId, companyId, startDate],
    );

    // Include opening balance from ifrs_balances
    const obData = await this.tenantPrisma.queryOne<{
      balance: string;
      balanceType: string;
    }>(
      `SELECT balance, "balanceType"
       FROM ifrs_balances
       WHERE "entityId" = $1
         AND "accountId" = $2
         AND "deletedAt" IS NULL
       LIMIT 1`,
      [companyId, accountId],
    );

    const obAmount = obData ? toMoney(obData.balance) : 0;
    const obDebit = obData?.balanceType === 'debit' ? obAmount : 0;
    const obCredit = obData?.balanceType === 'credit' ? obAmount : 0;

    const openingDebit = toMoney(openingBalanceData?.debit) + obDebit;
    const openingCredit = toMoney(openingBalanceData?.credit) + obCredit;
    const openingBalance = openingDebit - openingCredit;

    // Get journal entries
    const entriesData = await this.tenantPrisma.query<{
      entryDate: Date;
      entryNumber: string;
      reference: string | null;
      narration: string;
      debit: any;
      credit: any;
    }>(
      `
      SELECT
        je."entryDate",
        je."entryNumber",
        je.reference,
        COALESCE(jel.narration, je.narration) as narration,
        jel.debit,
        jel.credit
      FROM journal_entry_line_items jel
      JOIN journal_entries je ON je.id = jel."journalEntryId"
      WHERE jel."accountId" = $1
        AND je."companyId" = $2
        AND je."entryDate" >= $3::date
        AND je."entryDate" <= $4::date
        AND je.status = 'posted'
        AND je."deletedAt" IS NULL
      ORDER BY je."entryDate", je.id, jel.id
      `,
      [accountId, companyId, startDate, endDate],
    );

    // Build entries with running balance
    let runningBalance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const entries: AccountStatementEntry[] = entriesData.map((entry) => {
      const debit = entry.debit ? toMoney(entry.debit) : null;
      const credit = entry.credit ? toMoney(entry.credit) : null;

      if (debit) {
        runningBalance += debit;
        totalDebit += debit;
      }
      if (credit) {
        runningBalance -= credit;
        totalCredit += credit;
      }

      return {
        date: entry.entryDate,
        entryNumber: entry.entryNumber,
        reference: entry.reference,
        narration: entry.narration || '',
        debit,
        credit,
        balance: runningBalance,
      };
    });

    return {
      companyId: company.id,
      companyName: company.name,
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.accountType,
      startDate,
      endDate,
      openingBalance,
      entries,
      closingBalance: runningBalance,
      totalDebit,
      totalCredit,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate profit/loss and retained earnings
   */
  private async calculateProfitLoss(
    companyId: number,
    asOfDate: string,
    fiscalYearId?: number,
  ): Promise<{ currentYearProfit: number; retainedEarnings: number }> {
    // Get fiscal year start date
    let yearStartDate = `${asOfDate.substring(0, 4)}-01-01`;
    if (fiscalYearId) {
      const fiscalYear = await this.tenantPrisma.queryOne<{ startDate: Date }>(
        `SELECT "startDate" FROM fiscal_years WHERE id = $1`,
        [fiscalYearId],
      );
      if (fiscalYear) {
        yearStartDate = new Date(fiscalYear.startDate).toISOString().split('T')[0];
      }
    }

    // Calculate current year profit (revenue - expenses for current period)
    const incomeStatement = await this.getIncomeStatement(companyId, {
      startDate: yearStartDate,
      endDate: asOfDate,
      fiscalYearId,
    });

    const currentYearProfit = incomeStatement.netProfit;

    // Retained earnings would be profit from previous periods
    // For now, we'll return 0 (this should be calculated from closing entries)
    const retainedEarnings = 0;

    return {
      currentYearProfit,
      retainedEarnings,
    };
  }

  /**
   * Get cash balance at a specific date
   */
  private async getCashBalance(
    companyId: number,
    date: string,
    beforeDate: boolean,
  ): Promise<number> {
    // Get cash accounts (typically code starts with 100x or 101x)
    const operator = beforeDate ? '<' : '<=';
    const cashBalanceData = await this.tenantPrisma.queryOne<{ balance: any }>(
      `
      SELECT
        COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0) as balance
      FROM ifrs_accounts a
      JOIN ifrs_categories c ON c.id = a."categoryId"
      LEFT JOIN journal_entry_line_items jel ON jel."accountId" = a.id
      LEFT JOIN journal_entries je ON je.id = jel."journalEntryId"
      WHERE a."companyId" = $1
        AND a."accountType" = 'asset'
        AND c.name IN ('Cash', 'Bank')
        AND a."isActive" = true
        AND a."isPosting" = true
        AND a."deletedAt" IS NULL
        AND (je.id IS NULL OR (
          je."entryDate" ${operator} $2::date
          AND je.status = 'posted'
        ))
      `,
      [companyId, date],
    );

    // Add opening balances for cash accounts from ifrs_balances
    const cashOpeningBalance = await this.tenantPrisma.queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(
         CASE WHEN b."balanceType" = 'debit' THEN b.balance
              WHEN b."balanceType" = 'credit' THEN -b.balance
              ELSE 0 END
       ), 0) as total
       FROM ifrs_balances b
       JOIN ifrs_accounts a ON a.id = b."accountId"
       WHERE b."entityId" = $1
         AND a."accountType" = 'asset'
         AND a."categoryId" IN (SELECT id FROM ifrs_categories WHERE name IN ('Cash', 'Bank'))
         AND b."deletedAt" IS NULL`,
      [companyId],
    );

    return toMoney(cashBalanceData?.balance) + toMoney(cashOpeningBalance?.total);
  }

  /**
   * Load opening balances from ifrs_balances into a map keyed by accountId
   */
  private async loadOpeningBalanceMap(
    companyId: number,
  ): Promise<Map<number, { debit: number; credit: number }>> {
    const openingBalances = await this.tenantPrisma.query<{
      accountId: number;
      balance: string;
      balanceType: string;
    }>(
      `SELECT "accountId", balance, "balanceType"
       FROM ifrs_balances
       WHERE "entityId" = $1
         AND "deletedAt" IS NULL`,
      [companyId],
    );
    const map = new Map<number, { debit: number; credit: number }>();
    for (const ob of openingBalances) {
      const amount = toMoney(ob.balance);
      map.set(ob.accountId, {
        debit: ob.balanceType === 'debit' ? amount : 0,
        credit: ob.balanceType === 'credit' ? amount : 0,
      });
    }
    return map;
  }

  /**
   * Format account type for display
   */
  private formatAccountType(type: string): string {
    const typeMap: Record<string, string> = {
      asset: 'Assets',
      liability: 'Liabilities',
      equity: 'Equity',
      revenue: 'Revenue',
      expense: 'Expenses',
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  /**
   * Get depreciation & amortization expense for the period.
   * Looks for accounts with codes 66xx-68xx or names containing 'depreciation' or 'amortization'.
   */
  private async getDepreciationExpense(
    companyId: number,
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const result = await this.tenantPrisma.queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(jel.debit - jel.credit), 0) as total
       FROM journal_entry_line_items jel
       JOIN journal_entries je ON je.id = jel."journalEntryId"
       JOIN ifrs_accounts a ON a.id = jel."accountId"
       WHERE je."companyId" = $1
         AND je.status = 'posted'
         AND je."entryDate" BETWEEN $2::date AND $3::date
         AND (a."categoryId" IN (SELECT id FROM ifrs_categories WHERE name = 'Depreciation')
              OR a.name ILIKE '%depreciation%' OR a.name ILIKE '%amortization%')`,
      [companyId, startDate, endDate],
    );
    return toMoney(result?.total);
  }

  /**
   * Calculate working capital changes by comparing opening and closing balances
   * for current asset (excluding cash) and current liability accounts.
   */
  private async getWorkingCapitalChanges(
    companyId: number,
    startDate: string,
    endDate: string,
  ): Promise<{ description: string; amount: number }[]> {
    const items: { description: string; amount: number }[] = [];

    // Define working capital account categories
    // For assets: increase in balance = cash outflow (negative for cash flow)
    // For liabilities: increase in balance = cash inflow (positive for cash flow)
    const categories = [
      { label: 'Change in Receivables', categoryName: 'Receivable', accountType: 'asset', isAsset: true },
      { label: 'Change in Inventory', categoryName: 'Inventory', accountType: 'asset', isAsset: true },
      { label: 'Change in Prepaid Expenses', categoryName: 'Prepayment', accountType: 'asset', isAsset: true },
      { label: 'Change in Payables', categoryName: 'Payable', accountType: 'liability', isAsset: false },
      { label: 'Change in Accrued Liabilities', categoryName: 'Current Liabilities', accountType: 'liability', isAsset: false },
    ];

    for (const category of categories) {
      const result = await this.tenantPrisma.queryOne<{
        openingBalance: string;
        closingBalance: string;
      }>(
        `SELECT
          COALESCE(SUM(CASE WHEN je."entryDate" < $2::date THEN jel.debit - jel.credit ELSE 0 END), 0) as "openingBalance",
          COALESCE(SUM(CASE WHEN je."entryDate" <= $3::date THEN jel.debit - jel.credit ELSE 0 END), 0) as "closingBalance"
         FROM journal_entry_line_items jel
         JOIN journal_entries je ON je.id = jel."journalEntryId"
         JOIN ifrs_accounts a ON a.id = jel."accountId"
         JOIN ifrs_categories c ON c.id = a."categoryId"
         WHERE je."companyId" = $1
           AND je.status = 'posted'
           AND c.name = $4
           AND a."accountType" = $5
           AND a."isActive" = true
           AND a."deletedAt" IS NULL`,
        [companyId, startDate, endDate, category.categoryName, category.accountType],
      );

      const opening = toMoney(result?.openingBalance);
      const closing = toMoney(result?.closingBalance);
      const change = closing - opening;

      // Skip if no material change
      if (Math.abs(change) < 0.01) continue;

      // For assets: increase in asset = cash used (negative effect on cash)
      // For liabilities: increase in liability = cash received (positive effect on cash)
      const cashEffect = category.isAsset ? -change : change;

      items.push({
        description: category.label,
        amount: cashEffect,
      });
    }

    return items;
  }

  /**
   * Calculate investing activities from changes in fixed asset accounts (16xx-19xx).
   * An increase in fixed assets represents a purchase (cash outflow),
   * a decrease represents a sale/disposal (cash inflow).
   */
  private async getInvestingActivities(
    companyId: number,
    startDate: string,
    endDate: string,
  ): Promise<{ description: string; amount: number }[]> {
    const items: { description: string; amount: number }[] = [];

    const accountChanges = await this.tenantPrisma.query<{
      accountName: string;
      openingBalance: string;
      closingBalance: string;
    }>(
      `SELECT
        a.name as "accountName",
        COALESCE(SUM(CASE WHEN je."entryDate" < $2::date THEN jel.debit - jel.credit ELSE 0 END), 0) as "openingBalance",
        COALESCE(SUM(CASE WHEN je."entryDate" <= $3::date THEN jel.debit - jel.credit ELSE 0 END), 0) as "closingBalance"
       FROM journal_entry_line_items jel
       JOIN journal_entries je ON je.id = jel."journalEntryId"
       JOIN ifrs_accounts a ON a.id = jel."accountId"
       WHERE je."companyId" = $1
         AND je.status = 'posted'
         AND a."categoryId" IN (SELECT id FROM ifrs_categories WHERE name IN ('Fixed Assets', 'Non-Current Assets'))
         AND a."accountType" = 'asset'
         AND a."isActive" = true
         AND a."deletedAt" IS NULL
       GROUP BY a.id, a.name
       HAVING ABS(
         COALESCE(SUM(CASE WHEN je."entryDate" <= $3::date THEN jel.debit - jel.credit ELSE 0 END), 0)
         - COALESCE(SUM(CASE WHEN je."entryDate" < $2::date THEN jel.debit - jel.credit ELSE 0 END), 0)
       ) > 0.01`,
      [companyId, startDate, endDate],
    );

    for (const row of accountChanges) {
      const opening = toMoney(row.openingBalance);
      const closing = toMoney(row.closingBalance);
      const change = closing - opening;

      // Increase in fixed assets = purchase = cash outflow (negative)
      // Decrease in fixed assets = sale/disposal = cash inflow (positive)
      items.push({
        description: change > 0
          ? `Purchase of ${row.accountName}`
          : `Proceeds from sale of ${row.accountName}`,
        amount: -change,
      });
    }

    return items;
  }

  /**
   * Calculate financing activities from changes in long-term liability accounts (30xx-39xx)
   * and equity accounts (40xx-49xx, excluding retained earnings/revenue/expense).
   * An increase in liabilities/equity represents a cash inflow,
   * a decrease represents a cash outflow (repayment/buyback).
   */
  private async getFinancingActivities(
    companyId: number,
    startDate: string,
    endDate: string,
  ): Promise<{ description: string; amount: number }[]> {
    const items: { description: string; amount: number }[] = [];

    // Long-term liabilities (loans, bonds: 30xx-39xx)
    const liabilityChanges = await this.tenantPrisma.query<{
      accountName: string;
      openingBalance: string;
      closingBalance: string;
    }>(
      `SELECT
        a.name as "accountName",
        COALESCE(SUM(CASE WHEN je."entryDate" < $2::date THEN jel.credit - jel.debit ELSE 0 END), 0) as "openingBalance",
        COALESCE(SUM(CASE WHEN je."entryDate" <= $3::date THEN jel.credit - jel.debit ELSE 0 END), 0) as "closingBalance"
       FROM journal_entry_line_items jel
       JOIN journal_entries je ON je.id = jel."journalEntryId"
       JOIN ifrs_accounts a ON a.id = jel."accountId"
       WHERE je."companyId" = $1
         AND je.status = 'posted'
         AND a."categoryId" IN (SELECT id FROM ifrs_categories WHERE name IN ('Non-Current Liabilities', 'Long Term Liability'))
         AND a."accountType" = 'liability'
         AND a."isActive" = true
         AND a."deletedAt" IS NULL
       GROUP BY a.id, a.name
       HAVING ABS(
         COALESCE(SUM(CASE WHEN je."entryDate" <= $3::date THEN jel.credit - jel.debit ELSE 0 END), 0)
         - COALESCE(SUM(CASE WHEN je."entryDate" < $2::date THEN jel.credit - jel.debit ELSE 0 END), 0)
       ) > 0.01`,
      [companyId, startDate, endDate],
    );

    for (const row of liabilityChanges) {
      const opening = toMoney(row.openingBalance);
      const closing = toMoney(row.closingBalance);
      const change = closing - opening;

      items.push({
        description: change > 0
          ? `Proceeds from ${row.accountName}`
          : `Repayment of ${row.accountName}`,
        amount: change,
      });
    }

    // Equity accounts (share capital, dividends: 40xx-49xx)
    const equityChanges = await this.tenantPrisma.query<{
      accountName: string;
      openingBalance: string;
      closingBalance: string;
    }>(
      `SELECT
        a.name as "accountName",
        COALESCE(SUM(CASE WHEN je."entryDate" < $2::date THEN jel.credit - jel.debit ELSE 0 END), 0) as "openingBalance",
        COALESCE(SUM(CASE WHEN je."entryDate" <= $3::date THEN jel.credit - jel.debit ELSE 0 END), 0) as "closingBalance"
       FROM journal_entry_line_items jel
       JOIN journal_entries je ON je.id = jel."journalEntryId"
       JOIN ifrs_accounts a ON a.id = jel."accountId"
       WHERE je."companyId" = $1
         AND je.status = 'posted'
         AND a."categoryId" IN (SELECT id FROM ifrs_categories WHERE name IN ('Share Capital', 'Equity', 'Retained Earnings'))
         AND a."accountType" = 'equity'
         AND a."isActive" = true
         AND a."deletedAt" IS NULL
       GROUP BY a.id, a.name
       HAVING ABS(
         COALESCE(SUM(CASE WHEN je."entryDate" <= $3::date THEN jel.credit - jel.debit ELSE 0 END), 0)
         - COALESCE(SUM(CASE WHEN je."entryDate" < $2::date THEN jel.credit - jel.debit ELSE 0 END), 0)
       ) > 0.01`,
      [companyId, startDate, endDate],
    );

    for (const row of equityChanges) {
      const opening = toMoney(row.openingBalance);
      const closing = toMoney(row.closingBalance);
      const change = closing - opening;

      items.push({
        description: change > 0
          ? `${row.accountName} issued`
          : `${row.accountName} reduction`,
        amount: change,
      });
    }

    return items;
  }

  // ==========================================================================
  // BANK / CASH ACCOUNT STATEMENT
  // ==========================================================================

  async getBankCashStatement(
    companyId: number,
    query: { startDate?: string; endDate?: string; bankId?: number },
  ) {
    const endDate = query.endDate || new Date().toISOString().split('T')[0];
    const startDate = query.startDate || `${endDate.substring(0, 4)}-01-01`;

    // Get all banks with their GL accounts
    let bankFilter = '';
    const params: (number | string)[] = [companyId, startDate, endDate];
    if (query.bankId) {
      bankFilter = `AND b.id = $4`;
      params.push(query.bankId);
    }

    const banks = await this.tenantPrisma.query<{
      id: number;
      name: string;
      accountNumber: string;
      bankName: string;
      currencyCode: string;
      glAccountId: number | null;
      openingBalance: number;
      glCode: string | null;
      glName: string | null;
    }>(
      `SELECT b.id, b.name, b."accountNumber", b."bankName", b."currencyCode",
              b."glAccountId", b."openingBalance",
              a.code as "glCode", a.name as "glName"
       FROM banks b
       LEFT JOIN ifrs_accounts a ON a.id = b."glAccountId"
       WHERE b."companyId" = $1 AND b."deletedAt" IS NULL AND b."isActive" = true
       ${bankFilter}
       ORDER BY b.name`,
      params.slice(0, query.bankId ? 4 : 1),
    );

    const company = await this.tenantPrisma.queryOne<{ currency: string; name: string }>(
      `SELECT currency, name FROM companies WHERE id = $1 AND "deletedAt" IS NULL`,
      [companyId],
    );
    const baseCurrency = company?.currency || 'NGN';

    // Use ifrs_balances as the single source of truth for opening balances,
    // consistent with balance sheet / trial balance. bank.openingBalance is
    // redundant and causes double-counting when both fields are populated.
    const openingBalanceMap = await this.loadOpeningBalanceMap(companyId);

    const bankStatements: Array<{
      bankId: number; bankName: string; accountNumber: string; institutionName: string;
      currencyCode: string; glCode: string | null; glName: string | null;
      openingBalance: number; closingBalance: number; totalDebit: number; totalCredit: number;
      transactions: Array<Record<string, unknown>>;
    }> = [];

    for (const bank of banks) {
      if (!bank.glAccountId) continue;

      // Get transactions for this GL account in the date range
      const transactions = await this.tenantPrisma.query<{
        id: number;
        entryDate: Date;
        entryNumber: string;
        narration: string;
        reference: string | null;
        debit: number;
        credit: number;
        foreignDebit: number | null;
        foreignCredit: number | null;
        currencyCode: string | null;
        exchangeRate: number | null;
        lineNarration: string | null;
      }>(
        `SELECT je.id, je."entryDate", je."entryNumber", je.narration, je.reference,
                COALESCE(jel.debit, 0) as debit,
                COALESCE(jel.credit, 0) as credit,
                jel."foreignDebit", jel."foreignCredit",
                jel."currencyCode", jel."exchangeRate",
                jel.narration as "lineNarration"
         FROM journal_entry_line_items jel
         JOIN journal_entries je ON je.id = jel."journalEntryId"
         WHERE jel."accountId" = $1
           AND je."companyId" = $2
           AND je.status = 'posted'
           AND je."entryDate" BETWEEN $3::date AND $4::date
         ORDER BY je."entryDate" ASC, je.id ASC`,
        [bank.glAccountId, companyId, startDate, endDate],
      );

      // Calculate opening balance (transactions before startDate)
      const obResult = await this.tenantPrisma.queryOne<{ debit: string; credit: string }>(
        `SELECT COALESCE(SUM(jel.debit), 0) as debit, COALESCE(SUM(jel.credit), 0) as credit
         FROM journal_entry_line_items jel
         JOIN journal_entries je ON je.id = jel."journalEntryId"
         WHERE jel."accountId" = $1
           AND je."companyId" = $2
           AND je.status = 'posted'
           AND je."entryDate" < $3::date`,
        [bank.glAccountId, companyId, startDate],
      );

      const obDebit = toMoney(obResult?.debit);
      const obCredit = toMoney(obResult?.credit);
      const ifrsOb = openingBalanceMap.get(bank.glAccountId);
      const ifrsObAmount = ifrsOb ? (ifrsOb.debit - ifrsOb.credit) : 0;
      const periodOpeningBalance = obDebit - obCredit + ifrsObAmount;

      // Build transaction list with running balance
      let runningBalance = periodOpeningBalance;
      const txns = transactions.map((t) => {
        const debit = toMoney(t.debit);
        const credit = toMoney(t.credit);
        runningBalance += debit - credit;
        return {
          date: t.entryDate,
          entryNumber: t.entryNumber,
          reference: t.reference,
          narration: t.lineNarration || t.narration,
          debit,
          credit,
          balance: toMoney(runningBalance),
          foreignDebit: t.foreignDebit ? toMoney(t.foreignDebit) : null,
          foreignCredit: t.foreignCredit ? toMoney(t.foreignCredit) : null,
          foreignCurrency: t.currencyCode || null,
          exchangeRate: t.exchangeRate ? Number(t.exchangeRate) : null,
        };
      });

      const totalDebit = txns.reduce((s, t) => s + t.debit, 0);
      const totalCredit = txns.reduce((s, t) => s + t.credit, 0);

      bankStatements.push({
        bankId: bank.id,
        bankName: bank.name,
        accountNumber: bank.accountNumber,
        institutionName: bank.bankName,
        currencyCode: bank.currencyCode,
        glCode: bank.glCode,
        glName: bank.glName,
        openingBalance: toMoney(periodOpeningBalance),
        closingBalance: toMoney(runningBalance),
        totalDebit: toMoney(totalDebit),
        totalCredit: toMoney(totalCredit),
        transactions: txns,
      });
    }

    // Calculate total cash position in base currency
    let totalCashBase = 0;
    for (const stmt of bankStatements) {
      if (stmt.currencyCode === baseCurrency) {
        totalCashBase += stmt.closingBalance;
      } else {
        // Get latest exchange rate for this currency
        const rate = await this.tenantPrisma.queryOne<{ rate: number }>(
          `SELECT er.rate FROM ifrs_exchange_rates er
           JOIN ifrs_currencies fc ON fc.id = er."fromCurrencyId"
           JOIN ifrs_currencies tc ON tc.id = er."toCurrencyId"
           WHERE fc.code = $1 AND tc.code = $2 AND er."isActive" = true
           ORDER BY er."validFrom" DESC LIMIT 1`,
          [stmt.currencyCode, baseCurrency],
        );
        const exchangeRate = Number(rate?.rate) || 1;
        totalCashBase += toMoney(Number(stmt.closingBalance) * exchangeRate);
      }
    }

    return {
      companyName: company?.name || '',
      baseCurrency,
      startDate,
      endDate,
      totalCashPositionBase: toMoney(totalCashBase),
      banks: bankStatements,
    };
  }

  // ==========================================================================
  // VAT REGISTER
  // ==========================================================================

  async getVatRegister(companyId: number, query: { startDate?: string; endDate?: string }) {
    const endDate = query.endDate || new Date().toISOString().split('T')[0];
    const startDate = query.startDate || `${endDate.substring(0, 4)}-01-01`;

    // Output VAT (Sales)
    const outputVat = await this.tenantPrisma.query<{
      invoiceNumber: string; invoiceDate: Date; customerName: string;
      subtotal: number; vatRate: number; vatAmount: number; total: number; vatCode: string;
    }>(
      `SELECT si."invoiceNumber", si."invoiceDate", c.name as "customerName",
              sil.amount as subtotal, sil."taxPercent" as "vatRate",
              sil."taxAmount" as "vatAmount",
              (sil.amount + COALESCE(sil."taxAmount", 0)) as total,
              COALESCE(v.code, '') as "vatCode"
       FROM sales_invoice_lines sil
       JOIN sales_invoices si ON si.id = sil."salesInvoiceId"
       LEFT JOIN customers c ON c.id = si."customerId"
       LEFT JOIN ifrs_vats v ON v.id = sil."vatId"
       WHERE si."companyId" = $1 AND si."invoiceDate" BETWEEN $2::date AND $3::date
         AND si.status IN ('posted', 'paid', 'partial')
         AND COALESCE(sil."taxAmount", 0) > 0
       ORDER BY si."invoiceDate" ASC`,
      [companyId, startDate, endDate],
    );

    // Input VAT (Purchases)
    const inputVat = await this.tenantPrisma.query<{
      invoiceNumber: string; invoiceDate: Date; supplierName: string;
      subtotal: number; vatRate: number; vatAmount: number; total: number; vatCode: string;
    }>(
      `SELECT pi."invoiceNumber", pi."invoiceDate", s.name as "supplierName",
              pil.amount as subtotal, COALESCE(pil."taxAmount", 0) / NULLIF(pil.amount, 0) * 100 as "vatRate",
              COALESCE(pil."taxAmount", 0) as "vatAmount",
              (pil.amount + COALESCE(pil."taxAmount", 0)) as total,
              COALESCE(v.code, '') as "vatCode"
       FROM purchase_invoice_lines pil
       JOIN purchase_invoices pi ON pi.id = pil."purchaseInvoiceId"
       LEFT JOIN suppliers s ON s.id = pi."supplierId"
       LEFT JOIN ifrs_vats v ON v.id = pil."vatId"
       WHERE pi."companyId" = $1 AND pi."invoiceDate" BETWEEN $2::date AND $3::date
         AND pi.status IN ('posted', 'approved', 'paid', 'partial')
         AND COALESCE(pil."taxAmount", 0) > 0
       ORDER BY pi."invoiceDate" ASC`,
      [companyId, startDate, endDate],
    );

    const totalOutputVat = outputVat.reduce((s, r) => s + toMoney(r.vatAmount), 0);
    const totalInputVat = inputVat.reduce((s, r) => s + toMoney(r.vatAmount), 0);
    const netVatPayable = toMoney(totalOutputVat - totalInputVat);

    return {
      startDate, endDate,
      outputVat: { items: outputVat, total: toMoney(totalOutputVat) },
      inputVat: { items: inputVat, total: toMoney(totalInputVat) },
      netVatPayable,
      summary: {
        totalOutputVat: toMoney(totalOutputVat),
        totalInputVat: toMoney(totalInputVat),
        netPayable: netVatPayable,
        status: netVatPayable > 0 ? 'payable' : netVatPayable < 0 ? 'refundable' : 'nil',
      },
    };
  }

  // ==========================================================================
  // WHT REMITTANCE REPORT
  // ==========================================================================

  async getWhtRemittanceReport(companyId: number, query: { startDate?: string; endDate?: string }) {
    const endDate = query.endDate || new Date().toISOString().split('T')[0];
    const startDate = query.startDate || `${endDate.substring(0, 4)}-01-01`;

    // WHT deducted on purchases
    const purchaseWht = await this.tenantPrisma.query<{
      invoiceNumber: string; invoiceDate: Date; supplierName: string;
      grossAmount: number; whtRate: number; whtAmount: number; netAmount: number;
      whtCategory: string; whtCode: string;
    }>(
      `SELECT pi."invoiceNumber", pi."invoiceDate", s.name as "supplierName",
              pil.amount as "grossAmount",
              COALESCE(pil."withholdingTaxAmount", 0) / NULLIF(pil.amount, 0) * 100 as "whtRate",
              COALESCE(pil."withholdingTaxAmount", 0) as "whtAmount",
              pil.amount - COALESCE(pil."withholdingTaxAmount", 0) as "netAmount",
              COALESCE(w.category, '') as "whtCategory",
              COALESCE(w.code, '') as "whtCode"
       FROM purchase_invoice_lines pil
       JOIN purchase_invoices pi ON pi.id = pil."purchaseInvoiceId"
       LEFT JOIN suppliers s ON s.id = pi."supplierId"
       LEFT JOIN withholding_taxes w ON w.id = pil."withholdingTaxId"
       WHERE pi."companyId" = $1 AND pi."invoiceDate" BETWEEN $2::date AND $3::date
         AND pi.status IN ('posted', 'approved', 'paid', 'partial')
         AND COALESCE(pil."withholdingTaxAmount", 0) > 0
       ORDER BY pi."invoiceDate" ASC`,
      [companyId, startDate, endDate],
    );

    // WHT on expense requests
    const expenseWht = await this.tenantPrisma.query<{
      requestNumber: string; requestDate: Date; beneficiaryName: string;
      grossAmount: number; whtRate: number; whtAmount: number; netAmount: number;
    }>(
      `SELECT er."requestNumber", er."requestDate", er."beneficiaryName",
              er.amount as "grossAmount",
              COALESCE(er."whtRate", 0) as "whtRate",
              COALESCE(er."whtAmount", 0) as "whtAmount",
              er.amount - COALESCE(er."whtAmount", 0) as "netAmount"
       FROM expense_requests er
       WHERE er."companyId" = $1 AND er."requestDate" BETWEEN $2::date AND $3::date
         AND er.status IN ('approved', 'paid', 'posted')
         AND COALESCE(er."whtAmount", 0) > 0
       ORDER BY er."requestDate" ASC`,
      [companyId, startDate, endDate],
    );

    const totalPurchaseWht = purchaseWht.reduce((s, r) => s + toMoney(r.whtAmount), 0);
    const totalExpenseWht = expenseWht.reduce((s, r) => s + toMoney(r.whtAmount), 0);
    const totalWhtDeducted = toMoney(totalPurchaseWht + totalExpenseWht);

    // Summary by WHT category
    const categoryMap = new Map<string, number>();
    for (const r of purchaseWht) {
      const cat = r.whtCategory || 'Uncategorized';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + toMoney(r.whtAmount));
    }
    const byCategory = Array.from(categoryMap.entries()).map(([category, amount]) => ({ category, amount: toMoney(amount) }));

    return {
      startDate, endDate,
      purchaseWht: { items: purchaseWht, total: toMoney(totalPurchaseWht) },
      expenseWht: { items: expenseWht, total: toMoney(totalExpenseWht) },
      totalWhtDeducted,
      byCategory,
    };
  }

  // ==========================================================================
  // AGED TRIAL BALANCE (RECEIVABLES & PAYABLES)
  // ==========================================================================

  async getAgedReceivables(companyId: number, query: { asOfDate?: string; agingPeriods?: number[] }) {
    const asOfDate = query.asOfDate || new Date().toISOString().split('T')[0];
    const periods = query.agingPeriods || [30, 60, 90, 120];

    const invoices = await this.tenantPrisma.query<{
      id: number; invoiceNumber: string; invoiceDate: Date; dueDate: Date;
      customerName: string; customerId: number;
      totalAmount: number; paidAmount: number; balanceDue: number;
    }>(
      `SELECT si.id, si."invoiceNumber", si."invoiceDate", si."dueDate",
              c.name as "customerName", c.id as "customerId",
              si."totalAmount", COALESCE(si."paidAmount", 0) as "paidAmount",
              si."totalAmount" - COALESCE(si."paidAmount", 0) as "balanceDue"
       FROM sales_invoices si
       LEFT JOIN customers c ON c.id = si."customerId"
       WHERE si."companyId" = $1
         AND si."invoiceDate" <= $2::date
         AND si.status NOT IN ('draft', 'cancelled', 'void')
         AND si."totalAmount" - COALESCE(si."paidAmount", 0) > 0.01
         AND si."deletedAt" IS NULL
       ORDER BY c.name ASC, si."dueDate" ASC`,
      [companyId, asOfDate],
    );

    // Calculate aging buckets
    const asOf = new Date(asOfDate);
    const customers = new Map<number, {
      customerId: number; customerName: string;
      current: number; buckets: number[]; total: number;
      invoices: Array<Record<string, unknown>>;
    }>();

    for (const inv of invoices) {
      const due = new Date(inv.dueDate || inv.invoiceDate);
      const daysOverdue = Math.floor((asOf.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const balance = toMoney(inv.balanceDue);

      if (!customers.has(inv.customerId)) {
        customers.set(inv.customerId, {
          customerId: inv.customerId,
          customerName: inv.customerName,
          current: 0,
          buckets: periods.map(() => 0),
          total: 0,
          invoices: [],
        });
      }
      const cust = customers.get(inv.customerId)!;

      // Assign to bucket
      if (daysOverdue <= 0) {
        cust.current += balance;
      } else {
        let assigned = false;
        for (let i = 0; i < periods.length; i++) {
          const prevLimit = i === 0 ? 0 : periods[i - 1];
          if (daysOverdue > prevLimit && daysOverdue <= periods[i]) {
            cust.buckets[i] += balance;
            assigned = true;
            break;
          }
        }
        if (!assigned) {
          cust.buckets[cust.buckets.length - 1] += balance; // Over last bucket
        }
      }
      cust.total += balance;
      cust.invoices.push({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        totalAmount: toMoney(inv.totalAmount),
        paidAmount: toMoney(inv.paidAmount),
        balanceDue: balance,
        daysOverdue: Math.max(0, daysOverdue),
      });
    }

    const items = Array.from(customers.values());
    const totals = {
      current: toMoney(items.reduce((s, c) => s + c.current, 0)),
      buckets: periods.map((_, i) => toMoney(items.reduce((s, c) => s + c.buckets[i], 0))),
      total: toMoney(items.reduce((s, c) => s + c.total, 0)),
    };

    return {
      asOfDate,
      agingPeriods: periods,
      agingLabels: ['Current', ...periods.map((p, i) => i === 0 ? `1-${p} days` : `${periods[i - 1] + 1}-${p} days`), `Over ${periods[periods.length - 1]} days`],
      items,
      totals,
      customerCount: items.length,
      invoiceCount: invoices.length,
    };
  }

  async getAgedPayables(companyId: number, query: { asOfDate?: string; agingPeriods?: number[] }) {
    const asOfDate = query.asOfDate || new Date().toISOString().split('T')[0];
    const periods = query.agingPeriods || [30, 60, 90, 120];

    const invoices = await this.tenantPrisma.query<{
      id: number; invoiceNumber: string; invoiceDate: Date; dueDate: Date;
      supplierName: string; supplierId: number;
      totalAmount: number; paidAmount: number; balanceDue: number;
    }>(
      `SELECT pi.id, pi."invoiceNumber", pi."invoiceDate", pi."dueDate",
              s.name as "supplierName", s.id as "supplierId",
              pi."totalAmount", COALESCE(pi."amountPaid", 0) as "paidAmount",
              pi."totalAmount" - COALESCE(pi."amountPaid", 0) as "balanceDue"
       FROM purchase_invoices pi
       LEFT JOIN suppliers s ON s.id = pi."supplierId"
       WHERE pi."companyId" = $1
         AND pi."invoiceDate" <= $2::date
         AND pi.status NOT IN ('draft', 'cancelled', 'void')
         AND pi."totalAmount" - COALESCE(pi."amountPaid", 0) > 0.01
         AND pi."deletedAt" IS NULL
       ORDER BY s.name ASC, pi."dueDate" ASC`,
      [companyId, asOfDate],
    );

    const asOf = new Date(asOfDate);
    const suppliers = new Map<number, {
      supplierId: number; supplierName: string;
      current: number; buckets: number[]; total: number;
      invoices: Array<Record<string, unknown>>;
    }>();

    for (const inv of invoices) {
      const due = new Date(inv.dueDate || inv.invoiceDate);
      const daysOverdue = Math.floor((asOf.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const balance = toMoney(inv.balanceDue);

      if (!suppliers.has(inv.supplierId)) {
        suppliers.set(inv.supplierId, {
          supplierId: inv.supplierId,
          supplierName: inv.supplierName,
          current: 0,
          buckets: periods.map(() => 0),
          total: 0,
          invoices: [],
        });
      }
      const supp = suppliers.get(inv.supplierId)!;

      if (daysOverdue <= 0) {
        supp.current += balance;
      } else {
        let assigned = false;
        for (let i = 0; i < periods.length; i++) {
          const prevLimit = i === 0 ? 0 : periods[i - 1];
          if (daysOverdue > prevLimit && daysOverdue <= periods[i]) {
            supp.buckets[i] += balance;
            assigned = true;
            break;
          }
        }
        if (!assigned) {
          supp.buckets[supp.buckets.length - 1] += balance;
        }
      }
      supp.total += balance;
      supp.invoices.push({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        totalAmount: toMoney(inv.totalAmount),
        paidAmount: toMoney(inv.paidAmount),
        balanceDue: balance,
        daysOverdue: Math.max(0, daysOverdue),
      });
    }

    const items = Array.from(suppliers.values());
    const totals = {
      current: toMoney(items.reduce((s, c) => s + c.current, 0)),
      buckets: periods.map((_, i) => toMoney(items.reduce((s, c) => s + c.buckets[i], 0))),
      total: toMoney(items.reduce((s, c) => s + c.total, 0)),
    };

    return {
      asOfDate,
      agingPeriods: periods,
      agingLabels: ['Current', ...periods.map((p, i) => i === 0 ? `1-${p} days` : `${periods[i - 1] + 1}-${p} days`), `Over ${periods[periods.length - 1]} days`],
      items,
      totals,
      supplierCount: items.length,
      invoiceCount: invoices.length,
    };
  }
}
