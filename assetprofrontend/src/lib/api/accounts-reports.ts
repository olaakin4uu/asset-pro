/**
 * Accounts Reports API Client
 * API endpoints for financial reports
 */

import { api } from '../api';
import type {
  BalanceSheet,
  BalanceSheetItem,
  BalanceSheetSection,
  IncomeStatement,
  IncomeStatementItem,
  IncomeStatementSection,
  TrialBalance,
  TrialBalanceItem,
  TrialBalanceGroup,
  GroupedTrialBalance,
  CashFlowStatement,
  FinancialSummary,
  KeyMetrics,
  ReportDateParams,
  TrialBalanceParams,
  GroupedTrialBalanceParams,
} from '@/types/accounts-reports';

export const accountsReportsApi = {
  /**
   * Get Balance Sheet report
   */
  getBalanceSheet: async (params: ReportDateParams): Promise<BalanceSheet> => {
    const response = await api.get(
      '/accounts/reports/balance-sheet',
      { params }
    );
    const d = response.data;

    const mapBSSection = (section: Record<string, unknown>): BalanceSheetSection => ({
      title: (section?.name as string) ?? '',
      items: (section?.items as BalanceSheetItem[]) ?? [],
      subtotal: (section?.total as number) ?? 0,
    });

    // Backend returns nested: assets.nonCurrentAssets, liabilities.currentLiabilities, etc.
    const assets = (d.assets ?? {}) as Record<string, unknown>;
    const liabilities = (d.liabilities ?? {}) as Record<string, unknown>;
    const equity = (d.equity ?? {}) as Record<string, unknown>;

    const totalAssets = (assets.totalAssets as number) ?? 0;
    const totalLiabilities = (liabilities.totalLiabilities as number) ?? 0;
    const totalEquity = (equity.totalEquity as number) ?? 0;
    const totalLiabilitiesAndEquity = (d.totalLiabilitiesAndEquity as number) ?? 0;

    // Build equity section: combine equity items + retained earnings
    const equitySection = mapBSSection((equity.items ?? {}) as Record<string, unknown>);
    const retainedEarnings = (equity.retainedEarnings as number) ?? 0;
    if (retainedEarnings !== 0) {
      equitySection.items.push({
        accountId: 0,
        accountCode: '',
        accountName: 'Retained Earnings',
        balance: retainedEarnings,
      });
      equitySection.subtotal = totalEquity;
    }

    return {
      asOfDate: d.asOfDate ?? '',
      companyId: d.companyId ?? 0,
      companyName: d.companyName ?? '',
      currency: d.currency ?? 'NGN',
      nonCurrentAssets: mapBSSection((assets.nonCurrentAssets ?? {}) as Record<string, unknown>),
      currentAssets: mapBSSection((assets.currentAssets ?? {}) as Record<string, unknown>),
      totalAssets,
      nonCurrentLiabilities: mapBSSection((liabilities.nonCurrentLiabilities ?? {}) as Record<string, unknown>),
      currentLiabilities: mapBSSection((liabilities.currentLiabilities ?? {}) as Record<string, unknown>),
      totalLiabilities,
      equity: equitySection,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
    };
  },

  /**
   * Get Income Statement report
   */
  getIncomeStatement: async (params: ReportDateParams): Promise<IncomeStatement> => {
    const response = await api.get(
      '/accounts/reports/income-statement',
      { params }
    );
    const d = response.data;

    const mapSection = (section: Record<string, unknown>): IncomeStatementSection => ({
      title: (section?.name as string) ?? '',
      items: (section?.items as IncomeStatementItem[]) ?? [],
      subtotal: (section?.total as number) ?? 0,
    });

    return {
      startDate: d.startDate ?? '',
      endDate: d.endDate ?? '',
      companyId: d.companyId ?? 0,
      companyName: d.companyName ?? '',
      currency: d.currency ?? 'NGN',
      revenue: mapSection(d.revenue ?? {}),
      costOfSales: mapSection(d.costOfSales ?? {}),
      grossProfit: d.grossProfit ?? 0,
      grossProfitMargin: d.grossProfitMargin ?? 0,
      operatingExpenses: mapSection(d.operatingExpenses ?? {}),
      operatingProfit: d.operatingProfit ?? 0,
      operatingProfitMargin: d.operatingProfitMargin ?? 0,
      otherIncome: mapSection(d.otherIncome ?? {}),
      otherExpenses: mapSection(d.otherExpenses ?? {}),
      profitBeforeTax: d.netProfitBeforeTax ?? d.profitBeforeTax ?? 0,
      taxExpense: d.taxExpense ?? 0,
      netProfit: d.netProfit ?? 0,
      netProfitMargin: d.netProfitMargin ?? 0,
    };
  },

  /**
   * Get Trial Balance report
   */
  getTrialBalance: async (params: TrialBalanceParams): Promise<TrialBalance> => {
    const { hideZeroBalances, ...rest } = params;
    const response = await api.get(
      '/accounts/reports/trial-balance',
      { params: { ...rest, includeZeroBalances: hideZeroBalances === true ? false : true } }
    );
    const d = response.data;
    const items = d.items ?? [];

    // Group flat items by accountType
    const groupMap = new Map<string, { items: TrialBalanceItem[]; debitTotal: number; creditTotal: number }>();
    for (const item of items) {
      const cat = item.accountType ?? 'other';
      if (!groupMap.has(cat)) {
        groupMap.set(cat, { items: [], debitTotal: 0, creditTotal: 0 });
      }
      const group = groupMap.get(cat)!;
      const mapped: TrialBalanceItem = {
        accountId: item.accountId,
        accountCode: item.accountCode,
        accountName: item.accountName,
        accountType: item.accountType,
        debit: item.closingDebit ?? 0,
        credit: item.closingCredit ?? 0,
      };
      group.items.push(mapped);
      group.debitTotal += mapped.debit;
      group.creditTotal += mapped.credit;
    }

    const groups: TrialBalanceGroup[] = [];
    for (const [category, group] of groupMap) {
      groups.push({ category, ...group });
    }

    const totalDebit = d.totals?.closingDebit ?? 0;
    const totalCredit = d.totals?.closingCredit ?? 0;

    return {
      asOfDate: d.asOfDate ?? '',
      companyId: 0,
      companyName: '',
      currency: 'NGN',
      groups,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  },

  /**
   * Get Grouped Trial Balance report
   */
  getGroupedTrialBalance: async (params: GroupedTrialBalanceParams) => {
    const response = await api.get<GroupedTrialBalance>(
      '/accounts/reports/trial-balance-grouped',
      { params }
    );
    return response.data;
  },

  /**
   * Get Cash Flow Statement report
   */
  getCashFlow: async (params: ReportDateParams) => {
    const response = await api.get<CashFlowStatement>(
      '/accounts/reports/cash-flow',
      { params }
    );
    return response.data;
  },

  /**
   * Get Financial Summary
   */
  getFinancialSummary: async (params: ReportDateParams): Promise<FinancialSummary> => {
    const response = await api.get('/accounts/reports/financial-summary', { params });
    const d = response.data;
    const revenue = d.revenue ?? 0;
    const expenses = d.expenses ?? 0;
    const profit = d.netProfit ?? 0;
    return {
      period: d.period?.startDate && d.period?.endDate
        ? `${d.period.startDate} to ${d.period.endDate}`
        : '',
      companyId: d.companyId ?? 0,
      companyName: d.companyName ?? '',
      currency: d.currency ?? 'NGN',
      revenue,
      expenses,
      profit,
      profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
      assets: d.totalAssets ?? 0,
      liabilities: d.totalLiabilities ?? 0,
      equity: d.totalEquity ?? 0,
      cash: d.cashBalance ?? 0,
      cashChange: 0,
      cashChangePercentage: 0,
    };
  },

  /**
   * Get Key Financial Metrics
   */
  getKeyMetrics: async (params: ReportDateParams): Promise<KeyMetrics> => {
    const response = await api.get('/accounts/reports/key-metrics', { params });
    const d = response.data;
    const liq = d.liquidityRatios ?? {};
    const prof = d.profitabilityRatios ?? {};
    const lev = d.leverageRatios ?? {};
    return {
      period: d.asOfDate ?? '',
      companyId: d.companyId ?? 0,
      companyName: d.companyName ?? '',
      currentRatio: liq.currentRatio ?? 0,
      quickRatio: liq.quickRatio ?? 0,
      cashRatio: liq.cashRatio ?? 0,
      grossProfitMargin: prof.grossProfitMargin ?? 0,
      operatingProfitMargin: prof.operatingProfitMargin ?? 0,
      netProfitMargin: prof.netProfitMargin ?? 0,
      returnOnAssets: prof.returnOnAssets ?? 0,
      returnOnEquity: prof.returnOnEquity ?? 0,
      debtToEquity: lev.debtToEquity ?? 0,
      debtToAssets: lev.debtToAssets ?? 0,
      equityRatio: lev.equityRatio ?? 0,
      assetTurnover: 0,
      inventoryTurnover: 0,
      receivablesTurnover: 0,
    };
  },

  /**
   * Export report to CSV
   */
  exportToCsv: async (reportType: string, params: ReportDateParams) => {
    const response = await api.get(
      `/accounts/reports/${reportType}/export/csv`,
      {
        params,
        responseType: 'blob',
      }
    );
    return response.data;
  },

  /**
   * Get comparative balance sheet (two periods)
   */
  getComparativeBalanceSheet: async (params: ReportDateParams & { compareDate?: string; comparePrevious?: boolean }) => {
    const response = await api.get(
      '/accounts/reports/balance-sheet/compare',
      { params }
    );
    return response.data;
  },

  /**
   * Get comparative income statement (two periods)
   */
  getComparativeIncomeStatement: async (params: ReportDateParams & {
    startDate?: string;
    endDate?: string;
    compareStartDate?: string;
    compareEndDate?: string;
    comparePrevious?: boolean;
  }) => {
    const response = await api.get(
      '/accounts/reports/income-statement/compare',
      { params }
    );
    return response.data;
  },

  /**
   * Get Bank/Cash Account Statement
   */
  getBankCashStatement: async (params: { startDate?: string; endDate?: string; bankId?: number }): Promise<{
    companyName: string;
    baseCurrency: string;
    startDate: string;
    endDate: string;
    totalCashPositionBase: number;
    banks: Array<{
      bankId: number;
      bankName: string;
      accountNumber: string;
      institutionName: string;
      currencyCode: string;
      glCode: string | null;
      glName: string | null;
      openingBalance: number;
      closingBalance: number;
      totalDebit: number;
      totalCredit: number;
      transactions: Array<{
        date: string;
        entryNumber: string;
        reference: string | null;
        narration: string;
        debit: number;
        credit: number;
        balance: number;
        foreignDebit: number | null;
        foreignCredit: number | null;
        foreignCurrency: string | null;
        exchangeRate: number | null;
      }>;
    }>;
  }> => {
    const response = await api.get('/accounts/reports/bank-cash-statement', { params });
    return response.data;
  },
};
