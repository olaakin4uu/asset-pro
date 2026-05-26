import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { toMoney } from '../../../common/utils/decimal';
import {
  TrialBalanceQueryDto,
  BalanceSheetQueryDto,
  IncomeStatementQueryDto,
  GeneralLedgerQueryDto,
} from '../dto';

export interface TrialBalanceItem {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  categoryName: string | null;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceReport {
  asOfDate: string;
  items: TrialBalanceItem[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    periodDebit: number;
    periodCredit: number;
    closingDebit: number;
    closingCredit: number;
  };
}

export interface BalanceSheetSection {
  name: string;
  items: {
    accountId: number;
    accountCode: string;
    accountName: string;
    balance: number;
    previousBalance?: number;
  }[];
  total: number;
  previousTotal?: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: {
    nonCurrentAssets: BalanceSheetSection;
    currentAssets: BalanceSheetSection;
    totalAssets: number;
    previousTotalAssets?: number;
  };
  liabilities: {
    nonCurrentLiabilities: BalanceSheetSection;
    currentLiabilities: BalanceSheetSection;
    totalLiabilities: number;
    previousTotalLiabilities?: number;
  };
  equity: {
    items: BalanceSheetSection;
    retainedEarnings: number;
    totalEquity: number;
    previousTotalEquity?: number;
  };
  totalLiabilitiesAndEquity: number;
  previousTotalLiabilitiesAndEquity?: number;
}

export interface IncomeStatementSection {
  name: string;
  title: string;
  items: {
    accountId: number;
    accountCode: string;
    accountName: string;
    amount: number;
    previousAmount?: number;
  }[];
  total: number;
  subtotal: number;
  previousTotal?: number;
}

export interface IncomeStatementReport {
  startDate: string;
  endDate: string;
  currency: string;
  revenue: IncomeStatementSection;
  costOfSales: IncomeStatementSection;
  grossProfit: number;
  grossProfitMargin: number;
  previousGrossProfit?: number;
  operatingExpenses: IncomeStatementSection;
  operatingProfit: number;
  operatingProfitMargin: number;
  previousOperatingProfit?: number;
  otherIncome: IncomeStatementSection;
  otherExpenses: IncomeStatementSection;
  netProfitBeforeTax: number;
  profitBeforeTax: number;
  previousNetProfitBeforeTax?: number;
  taxExpense: number;
  previousTaxExpense?: number;
  netProfit: number;
  netProfitMargin: number;
  previousNetProfit?: number;
}

export interface GeneralLedgerEntry {
  date: Date;
  transactionNo: string;
  reference: string | null;
  narration: string;
  debit: number | null;
  credit: number | null;
  balance: number;
}

export interface GeneralLedgerReport {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  entries: GeneralLedgerEntry[];
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  async getTrialBalance(companyId: number, query: TrialBalanceQueryDto): Promise<TrialBalanceReport> {
    const asOfDate = query.asOfDate || new Date().toISOString().split('T')[0];

    // Get all posting accounts with their balances
    const accounts = await this.tenantPrisma.query<{
      id: number;
      code: string;
      name: string;
      accountType: string;
      categoryName: string | null;
    }>(
      `SELECT a.id, a.code, a.name, a."accountType", c.name as "categoryName"
       FROM ifrs_accounts a
       LEFT JOIN ifrs_categories c ON c.id = a."categoryId"
       WHERE a."companyId" = $1
         AND a."isPosting" = true
         AND a."isActive" = true
         AND a."deletedAt" IS NULL
       ORDER BY a.code`,
      [companyId],
    );

    // Load opening balances from ifrs_balances for this company
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
    const openingMap = new Map<number, { debit: number; credit: number }>();
    for (const ob of openingBalances) {
      const amount = toMoney(ob.balance);
      openingMap.set(ob.accountId, {
        debit: ob.balanceType === 'debit' ? amount : 0,
        credit: ob.balanceType === 'credit' ? amount : 0,
      });
    }

    const items: TrialBalanceItem[] = [];
    const totals = {
      openingDebit: 0,
      openingCredit: 0,
      periodDebit: 0,
      periodCredit: 0,
      closingDebit: 0,
      closingCredit: 0,
    };

    // Load all period totals in a single query (avoids N+1)
    const periodTotalsRows = await this.tenantPrisma.query<{
      accountId: number;
      period_debit: string;
      period_credit: string;
    }>(
      `SELECT
         li."accountId",
         COALESCE(SUM(COALESCE(li.debit, 0)), 0) as period_debit,
         COALESCE(SUM(COALESCE(li.credit, 0)), 0) as period_credit
       FROM journal_entry_line_items li
       JOIN journal_entries je ON je.id = li."journalEntryId"
       WHERE je."companyId" = $1
         AND je."entryDate"::date <= $2::date
         AND je.status = 'posted'
         AND je."deletedAt" IS NULL
       GROUP BY li."accountId"`,
      [companyId, asOfDate],
    );
    const periodMap = new Map<number, { debit: number; credit: number }>();
    for (const row of periodTotalsRows) {
      periodMap.set(row.accountId, {
        debit: toMoney(row.period_debit),
        credit: toMoney(row.period_credit),
      });
    }

    for (const account of accounts) {
      const pt = periodMap.get(account.id);
      const periodDebit = pt?.debit ?? 0;
      const periodCredit = pt?.credit ?? 0;

      // Get opening balance from ifrs_balances
      const ob = openingMap.get(account.id);
      const openingDebit = ob?.debit ?? 0;
      const openingCredit = ob?.credit ?? 0;

      // Calculate net balances — show on ONE side only
      const openingNet = openingDebit - openingCredit;
      const netOpeningDebit = openingNet > 0 ? openingNet : 0;
      const netOpeningCredit = openingNet < 0 ? Math.abs(openingNet) : 0;

      const closingNet = (openingDebit + periodDebit) - (openingCredit + periodCredit);
      const netClosingDebit = closingNet > 0 ? closingNet : 0;
      const netClosingCredit = closingNet < 0 ? Math.abs(closingNet) : 0;

      // Skip zero balances if not requested
      if (!query.includeZeroBalances && netClosingDebit === 0 && netClosingCredit === 0) {
        continue;
      }

      items.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.accountType,
        categoryName: account.categoryName,
        openingDebit: netOpeningDebit,
        openingCredit: netOpeningCredit,
        periodDebit,
        periodCredit,
        closingDebit: netClosingDebit,
        closingCredit: netClosingCredit,
      });

      totals.openingDebit += netOpeningDebit;
      totals.openingCredit += netOpeningCredit;
      totals.periodDebit += periodDebit;
      totals.periodCredit += periodCredit;
      totals.closingDebit += netClosingDebit;
      totals.closingCredit += netClosingCredit;
    }

    return {
      asOfDate,
      items,
      totals,
    };
  }

  async getBalanceSheet(companyId: number, query: BalanceSheetQueryDto): Promise<BalanceSheetReport> {
    const asOfDate = query.asOfDate || new Date().toISOString().split('T')[0];

    // Load opening balances from ifrs_balances
    const openingBalanceMap = await this.loadOpeningBalanceMap(companyId);

    // Helper to get account balances by type (transactions + opening balances)
    const getAccountsByType = async (accountTypes: string[]) => {
      const accounts = await this.tenantPrisma.query<{
        id: number;
        code: string;
        name: string;
        accountType: string;
        categoryType: string | null;
        debit: string;
        credit: string;
      }>(
        `SELECT
           a.id, a.code, a.name, a."accountType",
           c."categoryType",
           COALESCE(bal.debit, 0) as debit,
           COALESCE(bal.credit, 0) as credit
         FROM ifrs_accounts a
         LEFT JOIN ifrs_categories c ON c.id = a."categoryId"
         LEFT JOIN (
           SELECT li."accountId",
                  SUM(COALESCE(li.debit, 0)) as debit,
                  SUM(COALESCE(li.credit, 0)) as credit
           FROM journal_entry_line_items li
           JOIN journal_entries je ON je.id = li."journalEntryId"
           WHERE je."companyId" = $2
             AND je."entryDate"::date <= $1::date
             AND je.status = 'posted'
             AND je."deletedAt" IS NULL
           GROUP BY li."accountId"
         ) bal ON bal."accountId" = a.id
         WHERE a."companyId" = $2
           AND a."isPosting" = true
           AND a."isActive" = true
           AND a."deletedAt" IS NULL
           AND a."accountType" = ANY($3)
         ORDER BY a.code`,
        [asOfDate, companyId, accountTypes],
      );

      // Add opening balances and filter out zero-balance accounts
      return accounts.filter(acc => {
        const ob = openingBalanceMap.get(acc.id);
        const totalDebit = toMoney(acc.debit) + (ob?.debit ?? 0);
        const totalCredit = toMoney(acc.credit) + (ob?.credit ?? 0);
        return Math.abs(totalDebit - totalCredit) > 0.01;
      });
    };

    // Get accounts by type
    const assetAccounts = await getAccountsByType(['asset']);
    const liabilityAccounts = await getAccountsByType(['liability']);
    const equityAccounts = await getAccountsByType(['equity']);

    const buildSection = (accounts: { id: number; code: string; name: string; debit: string; credit: string }[], isCredit = false): BalanceSheetSection => {
      const items = accounts.map(acc => {
        const ob = openingBalanceMap.get(acc.id);
        const debit = toMoney(acc.debit) + (ob?.debit ?? 0);
        const credit = toMoney(acc.credit) + (ob?.credit ?? 0);
        const balance = isCredit ? credit - debit : debit - credit;
        return {
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          balance,
        };
      });
      return {
        name: '',
        items,
        total: items.reduce((sum, item) => sum + item.balance, 0),
      };
    };

    // Build balance sheet sections using categoryType from ifrs_categories
    // This is the proper IFRS classification — independent of account codes.
    // Tenants can use any numbering scheme they want.

    // Current asset category types
    const CURRENT_ASSET_TYPES = new Set([
      'current_asset', 'cash', 'bank', 'receivable',
      'inventory', 'prepayment', 'other_current_asset',
    ]);

    const currentAssets = buildSection(assetAccounts.filter(a =>
      CURRENT_ASSET_TYPES.has(a.categoryType || '') ||
      // Fallback: if no categoryType, classify by accountType
      (!a.categoryType && a.accountType === 'asset'),
    ));
    currentAssets.name = 'Current Assets';

    const nonCurrentAssets = buildSection(assetAccounts.filter(a =>
      !CURRENT_ASSET_TYPES.has(a.categoryType || '') && a.categoryType != null,
    ));
    nonCurrentAssets.name = 'Non-Current Assets';

    // Current liability category types
    const CURRENT_LIABILITY_TYPES = new Set([
      'current_liability', 'payable', 'accrued_liability',
      'tax_payable', 'other_current_liability', 'control',
    ]);

    const currentLiabilities = buildSection(liabilityAccounts.filter(a =>
      CURRENT_LIABILITY_TYPES.has(a.categoryType || '') ||
      // Fallback: if no categoryType, classify by accountType
      (!a.categoryType && a.accountType === 'liability'),
    ), true);
    currentLiabilities.name = 'Current Liabilities';

    const nonCurrentLiabilities = buildSection(liabilityAccounts.filter(a =>
      !CURRENT_LIABILITY_TYPES.has(a.categoryType || '') && a.categoryType != null,
    ), true);
    nonCurrentLiabilities.name = 'Non-Current Liabilities';

    const equitySection = buildSection(equityAccounts, true);
    equitySection.name = 'Equity';

    // Calculate retained earnings (net revenue - net expenses) from journal entries
    const revenueResult = await this.tenantPrisma.queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(COALESCE(li.credit, 0)), 0) - COALESCE(SUM(COALESCE(li.debit, 0)), 0) as total
       FROM journal_entry_line_items li
       JOIN journal_entries je ON je.id = li."journalEntryId"
       JOIN ifrs_accounts a ON a.id = li."accountId"
       WHERE je."companyId" = $1
         AND a."accountType" = 'revenue'
         AND je."entryDate"::date <= $2::date
         AND je.status = 'posted'
         AND je."deletedAt" IS NULL`,
      [companyId, asOfDate],
    );

    const expenseResult = await this.tenantPrisma.queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(COALESCE(li.debit, 0)), 0) - COALESCE(SUM(COALESCE(li.credit, 0)), 0) as total
       FROM journal_entry_line_items li
       JOIN journal_entries je ON je.id = li."journalEntryId"
       JOIN ifrs_accounts a ON a.id = li."accountId"
       WHERE je."companyId" = $1
         AND a."accountType" = 'expense'
         AND je."entryDate"::date <= $2::date
         AND je.status = 'posted'
         AND je."deletedAt" IS NULL`,
      [companyId, asOfDate],
    );

    // Include opening balances for revenue/expense accounts in retained earnings
    const obRevenueExpense = await this.tenantPrisma.queryOne<{
      revenue_credit: string;
      expense_debit: string;
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN a."accountType" = 'revenue' AND b."balanceType" = 'credit' THEN b.balance ELSE 0 END), 0) as revenue_credit,
         COALESCE(SUM(CASE WHEN a."accountType" = 'expense' AND b."balanceType" = 'debit' THEN b.balance ELSE 0 END), 0) as expense_debit
       FROM ifrs_balances b
       JOIN ifrs_accounts a ON a.id = b."accountId"
       WHERE b."entityId" = $1
         AND a."accountType" IN ('revenue', 'expense')
         AND b."deletedAt" IS NULL`,
      [companyId],
    );

    const retainedEarnings = toMoney(revenueResult?.total) - toMoney(expenseResult?.total)
      + toMoney(obRevenueExpense?.revenue_credit) - toMoney(obRevenueExpense?.expense_debit);

    const totalAssets = nonCurrentAssets.total + currentAssets.total;
    const totalLiabilities = nonCurrentLiabilities.total + currentLiabilities.total;
    const totalEquity = equitySection.total + retainedEarnings;

    return {
      asOfDate,
      assets: {
        nonCurrentAssets,
        currentAssets,
        totalAssets,
      },
      liabilities: {
        nonCurrentLiabilities,
        currentLiabilities,
        totalLiabilities,
      },
      equity: {
        items: equitySection,
        retainedEarnings,
        totalEquity,
      },
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    };
  }

  async getIncomeStatement(companyId: number, query: IncomeStatementQueryDto): Promise<IncomeStatementReport> {
    const endDate = query.endDate || new Date().toISOString().split('T')[0];
    const startDate = query.startDate || `${endDate.substring(0, 4)}-01-01`;

    const getAccountTotals = async (accountType: string, isCredit: boolean) => {
      // Net calculation: revenue = credit-debit, expense = debit-credit
      const netExpr = isCredit
        ? 'COALESCE(SUM(li.credit), 0) - COALESCE(SUM(li.debit), 0)'
        : 'COALESCE(SUM(li.debit), 0) - COALESCE(SUM(li.credit), 0)';
      return this.tenantPrisma.query<{
        id: number;
        code: string;
        name: string;
        amount: string;
        categoryType: string | null;
      }>(
        `SELECT
           a.id, a.code, a.name,
           ic."categoryType",
           ${netExpr} as amount
         FROM ifrs_accounts a
         LEFT JOIN ifrs_categories ic ON ic.id = a."categoryId"
         LEFT JOIN journal_entry_line_items li ON li."accountId" = a.id
         LEFT JOIN journal_entries je ON je.id = li."journalEntryId"
         WHERE a."companyId" = $3
           AND a."isPosting" = true
           AND a."isActive" = true
           AND a."accountType" = $4
           AND a."deletedAt" IS NULL
           AND (je.id IS NULL OR (
             je."companyId" = $3
             AND je."entryDate"::date >= $1::date
             AND je."entryDate"::date <= $2::date
             AND je.status = 'posted'
             AND je."deletedAt" IS NULL
           ))
         GROUP BY a.id, a.code, a.name, ic."categoryType"
         HAVING ABS(${netExpr}) > 0.01
         ORDER BY a.code`,
        [startDate, endDate, companyId, accountType],
      );
    };

    type AccountRow = { id: number; code: string; name: string; amount: string; categoryType: string | null };
    const buildSection = (accounts: AccountRow[]): IncomeStatementSection => {
      const items = accounts.map(acc => ({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        amount: toMoney(acc.amount),
      }));
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      return {
        name: '',
        title: '',
        items,
        total: subtotal,
        subtotal,
      };
    };

    // Revenue (credits to revenue accounts)
    const revenueAccounts = await getAccountTotals('revenue', true);
    // Non-operating revenue goes to Other Income
    const revenue = buildSection(revenueAccounts.filter(a => a.categoryType !== 'non_operating_revenue'));
    revenue.name = 'Revenue'; revenue.title = 'Revenue';

    // Expense classification by ifrs_categories.categoryType (code-agnostic — works for any account numbering scheme)
    const expenseAccounts = await getAccountTotals('expense', false);
    const COS_TYPES = new Set(['direct_expense']);
    const OTHER_EXPENSE_TYPES = new Set(['other_expense']);

    const costOfSales = buildSection(expenseAccounts.filter(a => COS_TYPES.has(a.categoryType ?? '')));
    costOfSales.name = 'Cost of Sales'; costOfSales.title = 'Cost of Sales';

    const operatingExpenses = buildSection(
      expenseAccounts.filter(a => !COS_TYPES.has(a.categoryType ?? '') && !OTHER_EXPENSE_TYPES.has(a.categoryType ?? '')),
    );
    operatingExpenses.name = 'Operating Expenses'; operatingExpenses.title = 'Operating Expenses';

    const otherIncome = buildSection(revenueAccounts.filter(a => a.categoryType === 'non_operating_revenue'));
    otherIncome.name = 'Other Income'; otherIncome.title = 'Other Income';
    const otherExpenses = buildSection(expenseAccounts.filter(a => OTHER_EXPENSE_TYPES.has(a.categoryType ?? '')));
    otherExpenses.name = 'Other Expenses'; otherExpenses.title = 'Other Expenses';

    const grossProfit = revenue.total - costOfSales.total;
    const operatingProfit = grossProfit - operatingExpenses.total;
    const netProfitBeforeTax = operatingProfit + otherIncome.total - otherExpenses.total;
    const taxExpense = 0; // Would calculate from tax accounts
    const netProfit = netProfitBeforeTax - taxExpense;

    const grossProfitMargin = revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0;
    const operatingProfitMargin = revenue.total > 0 ? (operatingProfit / revenue.total) * 100 : 0;
    const netProfitMargin = revenue.total > 0 ? (netProfit / revenue.total) * 100 : 0;

    return {
      startDate,
      endDate,
      currency: 'NGN',
      revenue,
      costOfSales,
      grossProfit,
      grossProfitMargin,
      operatingExpenses,
      operatingProfit,
      operatingProfitMargin,
      otherIncome,
      otherExpenses,
      netProfitBeforeTax,
      profitBeforeTax: netProfitBeforeTax,
      taxExpense,
      netProfit,
      netProfitMargin,
    };
  }

  async getGeneralLedger(companyId: number, query: GeneralLedgerQueryDto): Promise<GeneralLedgerReport> {
    const endDate = query.endDate || new Date().toISOString().split('T')[0];
    const startDate = query.startDate || `${endDate.substring(0, 4)}-01-01`;

    // Get account info
    const account = await this.tenantPrisma.queryOne<{
      id: number;
      code: string;
      name: string;
      accountType: string;
    }>(
      `SELECT id, code, name, "accountType"
       FROM ifrs_accounts
       WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [query.accountId, companyId],
    );

    if (!account) {
      throw new Error('Account not found');
    }

    // Revenue and expense accounts are temporary (income statement) — their
    // opening balance at the start of any period is always zero. Only balance
    // sheet accounts (asset, liability, equity) carry forward prior balances.
    const isPnL = account.accountType === 'revenue' || account.accountType === 'expense';

    let openingDebit = 0;
    let openingCredit = 0;

    if (!isPnL) {
      // Get opening balance (journal entries before start date)
      const openingResult = await this.tenantPrisma.queryOne<{
        debit: string;
        credit: string;
      }>(
        `SELECT
           COALESCE(SUM(COALESCE(li.debit, 0)), 0) as debit,
           COALESCE(SUM(COALESCE(li.credit, 0)), 0) as credit
         FROM journal_entry_line_items li
         JOIN journal_entries je ON je.id = li."journalEntryId"
         WHERE li."accountId" = $1
           AND je."companyId" = $3
           AND je."entryDate"::date < $2::date
           AND je.status = 'posted'
           AND je."deletedAt" IS NULL`,
        [query.accountId, startDate, companyId],
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
        [companyId, query.accountId],
      );

      const obAmount = obData ? toMoney(obData.balance) : 0;
      const obDebit = obData?.balanceType === 'debit' ? obAmount : 0;
      const obCredit = obData?.balanceType === 'credit' ? obAmount : 0;

      openingDebit = toMoney(openingResult?.debit) + obDebit;
      openingCredit = toMoney(openingResult?.credit) + obCredit;
    }

    const openingBalance = openingDebit - openingCredit;

    // Get transactions from journal entries
    const transactions = await this.tenantPrisma.query<{
      transactionDate: Date;
      transactionNo: string;
      reference: string | null;
      narration: string;
      debit_amount: string;
      credit_amount: string;
    }>(
      `SELECT
         je."entryDate" as "transactionDate",
         je."entryNumber" as "transactionNo",
         je.reference,
         COALESCE(li.narration, je.narration) as narration,
         COALESCE(li.debit, 0) as debit_amount,
         COALESCE(li.credit, 0) as credit_amount
       FROM journal_entry_line_items li
       JOIN journal_entries je ON je.id = li."journalEntryId"
       WHERE li."accountId" = $1
         AND je."companyId" = $4
         AND je."entryDate"::date >= $2::date
         AND je."entryDate"::date <= $3::date
         AND je.status = 'posted'
         AND je."deletedAt" IS NULL
       ORDER BY je."entryDate", je.id, li.id`,
      [query.accountId, startDate, endDate, companyId],
    );

    // Build entries with running balance
    let runningBalance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const entries: GeneralLedgerEntry[] = transactions.map(t => {
      const debit = toMoney(t.debit_amount) || null;
      const credit = toMoney(t.credit_amount) || null;

      if (debit) {
        runningBalance += debit;
        totalDebit += debit;
      }
      if (credit) {
        runningBalance -= credit;
        totalCredit += credit;
      }

      return {
        date: t.transactionDate,
        transactionNo: t.transactionNo,
        reference: t.reference,
        narration: t.narration,
        debit,
        credit,
        balance: runningBalance,
      };
    });

    return {
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
    };
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
}
