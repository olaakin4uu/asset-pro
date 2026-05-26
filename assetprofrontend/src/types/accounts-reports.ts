/**
 * Financial Reports Types
 * Types for all financial reports in the Accounts module
 */

// Balance Sheet Types
export interface BalanceSheetItem {
  accountId: number;
  accountCode: string;
  accountName: string;
  balance: number;
}

export interface BalanceSheetSection {
  title: string;
  items: BalanceSheetItem[];
  subtotal: number;
}

export interface BalanceSheet {
  asOfDate: string;
  companyId: number;
  companyName: string;
  currency: string;

  currentAssets: BalanceSheetSection;
  nonCurrentAssets: BalanceSheetSection;
  totalAssets: number;

  currentLiabilities: BalanceSheetSection;
  nonCurrentLiabilities: BalanceSheetSection;
  totalLiabilities: number;

  equity: BalanceSheetSection;
  totalEquity: number;

  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

// Income Statement Types
export interface IncomeStatementItem {
  accountId: number;
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface IncomeStatementSection {
  title: string;
  items: IncomeStatementItem[];
  subtotal: number;
}

export interface IncomeStatement {
  startDate: string;
  endDate: string;
  companyId: number;
  companyName: string;
  currency: string;

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
}

// Trial Balance Types
export interface TrialBalanceItem {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceGroup {
  category: string;
  items: TrialBalanceItem[];
  debitTotal: number;
  creditTotal: number;
}

export interface TrialBalance {
  asOfDate: string;
  companyId: number;
  companyName: string;
  currency: string;

  groups: TrialBalanceGroup[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

// Grouped Trial Balance Types
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

export interface GroupedTrialBalance {
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

// Cash Flow Statement Types
export interface CashFlowItem {
  description: string;
  amount: number;
}

export interface CashFlowSection {
  title: string;
  items: CashFlowItem[];
  total: number;
}

export interface CashFlowStatement {
  startDate: string;
  endDate: string;
  companyId: number;
  companyName: string;
  currency?: string;

  operatingActivities: CashFlowSection;
  investingActivities: CashFlowSection;
  financingActivities: CashFlowSection;

  netCashFlow: number;
  openingCashBalance: number;
  closingCashBalance: number;
}

// Financial Summary Types
export interface FinancialSummary {
  period: string;
  companyId: number;
  companyName: string;
  currency: string;

  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;

  assets: number;
  liabilities: number;
  equity: number;

  cash: number;
  cashChange: number;
  cashChangePercentage: number;
}

// Key Metrics Types
export interface KeyMetrics {
  period: string;
  companyId: number;
  companyName: string;

  // Liquidity Ratios
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;

  // Profitability Ratios
  grossProfitMargin: number;
  operatingProfitMargin: number;
  netProfitMargin: number;
  returnOnAssets: number;
  returnOnEquity: number;

  // Leverage Ratios
  debtToEquity: number;
  debtToAssets: number;
  equityRatio: number;

  // Efficiency Ratios
  assetTurnover: number;
  inventoryTurnover: number;
  receivablesTurnover: number;
}

// Report Parameters
export interface ReportDateParams {
  asOfDate?: string;
  startDate?: string;
  endDate?: string;
  companyId?: number;
  branchId?: number;
}

export interface TrialBalanceParams extends ReportDateParams {
  hideZeroBalances?: boolean;
  accountType?: string;
}

export interface GroupedTrialBalanceParams extends ReportDateParams {
  includeZeroBalances?: boolean;
  groupBy?: 'category' | 'type';
  fiscalYearId?: number;
}

// Export Format
export type ExportFormat = 'pdf' | 'excel' | 'csv';

// Report Status
export interface ReportStatus {
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}
