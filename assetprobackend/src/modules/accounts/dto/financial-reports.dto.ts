import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ReportFormat {
  JSON = 'json',
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class TrialBalanceQueryDto {
  @ApiPropertyOptional({
    description: 'As of date (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  @ApiPropertyOptional({
    description: 'Fiscal year ID',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYearId?: number;

  @ApiPropertyOptional({
    description: 'Include accounts with zero balances',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeZeroBalances?: boolean;

  @ApiPropertyOptional({
    enum: ReportFormat,
    description: 'Export format',
    default: ReportFormat.JSON,
  })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class BalanceSheetQueryDto {
  @ApiPropertyOptional({
    description: 'As of date (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  @ApiPropertyOptional({
    description: 'Fiscal year ID',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYearId?: number;

  @ApiPropertyOptional({
    description: 'Compare with previous period',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  comparePrevious?: boolean;

  @ApiPropertyOptional({
    enum: ReportFormat,
    description: 'Export format',
    default: ReportFormat.JSON,
  })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class IncomeStatementQueryDto {
  @ApiPropertyOptional({
    description: 'Start date (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Fiscal year ID',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYearId?: number;

  @ApiPropertyOptional({
    description: 'Compare with previous period',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  comparePrevious?: boolean;

  @ApiPropertyOptional({
    enum: ReportFormat,
    description: 'Export format',
    default: ReportFormat.JSON,
  })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class CashFlowQueryDto {
  @ApiPropertyOptional({
    description: 'Start date (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Fiscal year ID',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYearId?: number;

  @ApiPropertyOptional({
    enum: ReportFormat,
    description: 'Export format',
    default: ReportFormat.JSON,
  })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class AccountStatementQueryDto {
  @ApiPropertyOptional({
    description: 'Start date (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    enum: ReportFormat,
    description: 'Export format',
    default: ReportFormat.JSON,
  })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

// ============================================================================
// RESPONSE DTOs (for documentation)
// ============================================================================

export class AccountBalanceDto {
  @ApiProperty({ description: 'Account ID' })
  accountId: number;

  @ApiProperty({ description: 'Account code' })
  accountCode: string;

  @ApiProperty({ description: 'Account name' })
  accountName: string;

  @ApiProperty({ description: 'Account type' })
  accountType: string;

  @ApiProperty({ description: 'Debit amount' })
  debit: number;

  @ApiProperty({ description: 'Credit amount' })
  credit: number;

  @ApiProperty({ description: 'Net balance' })
  balance: number;
}

export class TrialBalanceItemDto {
  @ApiProperty({ description: 'Account ID' })
  accountId: number;

  @ApiProperty({ description: 'Account code' })
  accountCode: string;

  @ApiProperty({ description: 'Account name' })
  accountName: string;

  @ApiProperty({ description: 'Account type (asset, liability, equity, revenue, expense)' })
  accountType: string;

  @ApiProperty({ description: 'Category name', nullable: true })
  categoryName: string | null;

  @ApiProperty({ description: 'Total debit' })
  debit: number;

  @ApiProperty({ description: 'Total credit' })
  credit: number;
}

export class TrialBalanceDto {
  @ApiProperty({ description: 'Company ID' })
  companyId: number;

  @ApiProperty({ description: 'Company name' })
  companyName: string;

  @ApiProperty({ description: 'As of date (YYYY-MM-DD)' })
  asOfDate: string;

  @ApiProperty({ description: 'Fiscal year ID', nullable: true })
  fiscalYearId: number | null;

  @ApiProperty({ description: 'Fiscal year name', nullable: true })
  fiscalYearName: string | null;

  @ApiProperty({ type: [TrialBalanceItemDto], description: 'Trial balance items' })
  items: TrialBalanceItemDto[];

  @ApiProperty({
    description: 'Totals',
    example: { debit: 150000, credit: 150000 },
  })
  totals: {
    debit: number;
    credit: number;
  };

  @ApiProperty({ description: 'Whether debits equal credits' })
  isBalanced: boolean;

  @ApiProperty({ description: 'Report generation timestamp' })
  generatedAt: string;
}

export class BalanceSheetSectionItemDto {
  @ApiProperty({ description: 'Account ID' })
  accountId: number;

  @ApiProperty({ description: 'Account code' })
  accountCode: string;

  @ApiProperty({ description: 'Account name' })
  accountName: string;

  @ApiProperty({ description: 'Balance amount' })
  balance: number;

  @ApiProperty({ description: 'Percentage of section total', required: false })
  percentage?: number;
}

export class BalanceSheetSectionDto {
  @ApiProperty({ description: 'Section name' })
  name: string;

  @ApiProperty({ type: [BalanceSheetSectionItemDto], description: 'Section items' })
  items: BalanceSheetSectionItemDto[];

  @ApiProperty({ description: 'Section total' })
  total: number;

  @ApiProperty({ description: 'Percentage of total assets/liabilities', required: false })
  percentage?: number;
}

export class BalanceSheetDto {
  @ApiProperty({ description: 'Company ID' })
  companyId: number;

  @ApiProperty({ description: 'Company name' })
  companyName: string;

  @ApiProperty({ description: 'As of date (YYYY-MM-DD)' })
  asOfDate: string;

  @ApiProperty({ description: 'Fiscal year ID', nullable: true })
  fiscalYearId: number | null;

  @ApiProperty({ description: 'Fiscal year name', nullable: true })
  fiscalYearName: string | null;

  @ApiProperty({
    description: 'Assets section',
    example: {
      currentAssets: { name: 'Current Assets', items: [], total: 50000 },
      nonCurrentAssets: { name: 'Non-Current Assets', items: [], total: 100000 },
      totalAssets: 150000,
    },
  })
  assets: {
    currentAssets: BalanceSheetSectionDto;
    nonCurrentAssets: BalanceSheetSectionDto;
    totalAssets: number;
  };

  @ApiProperty({
    description: 'Liabilities section',
    example: {
      currentLiabilities: { name: 'Current Liabilities', items: [], total: 30000 },
      nonCurrentLiabilities: { name: 'Non-Current Liabilities', items: [], total: 20000 },
      totalLiabilities: 50000,
    },
  })
  liabilities: {
    currentLiabilities: BalanceSheetSectionDto;
    nonCurrentLiabilities: BalanceSheetSectionDto;
    totalLiabilities: number;
  };

  @ApiProperty({
    description: 'Equity section',
    example: {
      shareCapital: { name: 'Share Capital', items: [], total: 80000 },
      retainedEarnings: 10000,
      currentYearProfit: 10000,
      totalEquity: 100000,
    },
  })
  equity: {
    shareCapital: BalanceSheetSectionDto;
    retainedEarnings: number;
    currentYearProfit: number;
    totalEquity: number;
  };

  @ApiProperty({ description: 'Total liabilities and equity' })
  totalLiabilitiesAndEquity: number;

  @ApiProperty({ description: 'Whether the balance sheet is balanced (Assets = Liabilities + Equity)' })
  isBalanced: boolean;

  @ApiProperty({ description: 'Variance between assets and liabilities+equity' })
  variance: number;

  @ApiProperty({ description: 'Report generation timestamp' })
  generatedAt: string;
}

export class IncomeStatementSectionItemDto {
  @ApiProperty({ description: 'Account ID' })
  accountId: number;

  @ApiProperty({ description: 'Account code' })
  accountCode: string;

  @ApiProperty({ description: 'Account name' })
  accountName: string;

  @ApiProperty({ description: 'Amount' })
  amount: number;

  @ApiProperty({ description: 'Percentage of revenue', required: false })
  percentage?: number;
}

export class IncomeStatementSectionDto {
  @ApiProperty({ description: 'Section name' })
  name: string;

  @ApiProperty({ type: [IncomeStatementSectionItemDto], description: 'Section items' })
  items: IncomeStatementSectionItemDto[];

  @ApiProperty({ description: 'Section total' })
  total: number;

  @ApiProperty({ description: 'Percentage of revenue', required: false })
  percentage?: number;
}

export class IncomeStatementDto {
  @ApiProperty({ description: 'Company ID' })
  companyId: number;

  @ApiProperty({ description: 'Company name' })
  companyName: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  startDate: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)' })
  endDate: string;

  @ApiProperty({ description: 'Fiscal year ID', nullable: true })
  fiscalYearId: number | null;

  @ApiProperty({ description: 'Fiscal year name', nullable: true })
  fiscalYearName: string | null;

  @ApiProperty({ description: 'Revenue section' })
  revenue: IncomeStatementSectionDto;

  @ApiProperty({ description: 'Cost of sales section' })
  costOfSales: IncomeStatementSectionDto;

  @ApiProperty({ description: 'Gross profit (Revenue - Cost of Sales)' })
  grossProfit: number;

  @ApiProperty({ description: 'Gross profit margin (%)' })
  grossProfitMargin: number;

  @ApiProperty({ description: 'Operating expenses section' })
  operatingExpenses: IncomeStatementSectionDto;

  @ApiProperty({ description: 'Operating profit (Gross Profit - Operating Expenses)' })
  operatingProfit: number;

  @ApiProperty({ description: 'Operating profit margin (%)' })
  operatingProfitMargin: number;

  @ApiProperty({ description: 'Other income section' })
  otherIncome: IncomeStatementSectionDto;

  @ApiProperty({ description: 'Other expenses section' })
  otherExpenses: IncomeStatementSectionDto;

  @ApiProperty({ description: 'Profit before tax (PBT)' })
  profitBeforeTax: number;

  @ApiProperty({ description: 'Tax expense' })
  taxExpense: number;

  @ApiProperty({ description: 'Net profit after tax (PAT)' })
  netProfit: number;

  @ApiProperty({ description: 'Net profit margin (%)' })
  netProfitMargin: number;

  @ApiProperty({ description: 'Report generation timestamp' })
  generatedAt: string;
}

export class CashFlowItemDto {
  @ApiProperty({ description: 'Item description' })
  description: string;

  @ApiProperty({ description: 'Amount' })
  amount: number;
}

export class CashFlowSectionDto {
  @ApiProperty({ description: 'Section name' })
  name: string;

  @ApiProperty({ type: [CashFlowItemDto], description: 'Section items' })
  items: CashFlowItemDto[];

  @ApiProperty({ description: 'Section total' })
  total: number;
}

export class CashFlowStatementDto {
  @ApiProperty({ description: 'Company ID' })
  companyId: number;

  @ApiProperty({ description: 'Company name' })
  companyName: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  startDate: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)' })
  endDate: string;

  @ApiProperty({ description: 'Fiscal year ID', nullable: true })
  fiscalYearId: number | null;

  @ApiProperty({ description: 'Fiscal year name', nullable: true })
  fiscalYearName: string | null;

  @ApiProperty({ description: 'Operating activities section' })
  operatingActivities: CashFlowSectionDto;

  @ApiProperty({ description: 'Investing activities section' })
  investingActivities: CashFlowSectionDto;

  @ApiProperty({ description: 'Financing activities section' })
  financingActivities: CashFlowSectionDto;

  @ApiProperty({ description: 'Net cash flow for the period' })
  netCashFlow: number;

  @ApiProperty({ description: 'Opening cash balance' })
  openingCashBalance: number;

  @ApiProperty({ description: 'Closing cash balance' })
  closingCashBalance: number;

  @ApiProperty({ description: 'Report generation timestamp' })
  generatedAt: string;
}

export class AccountStatementEntryDto {
  @ApiProperty({ description: 'Transaction date' })
  date: Date;

  @ApiProperty({ description: 'Journal entry number' })
  entryNumber: string;

  @ApiProperty({ description: 'Reference', nullable: true })
  reference: string | null;

  @ApiProperty({ description: 'Narration/description' })
  narration: string;

  @ApiProperty({ description: 'Debit amount', nullable: true })
  debit: number | null;

  @ApiProperty({ description: 'Credit amount', nullable: true })
  credit: number | null;

  @ApiProperty({ description: 'Running balance' })
  balance: number;
}

export class AccountStatementDto {
  @ApiProperty({ description: 'Company ID' })
  companyId: number;

  @ApiProperty({ description: 'Company name' })
  companyName: string;

  @ApiProperty({ description: 'Account ID' })
  accountId: number;

  @ApiProperty({ description: 'Account code' })
  accountCode: string;

  @ApiProperty({ description: 'Account name' })
  accountName: string;

  @ApiProperty({ description: 'Account type' })
  accountType: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  startDate: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)' })
  endDate: string;

  @ApiProperty({ description: 'Opening balance' })
  openingBalance: number;

  @ApiProperty({ type: [AccountStatementEntryDto], description: 'Statement entries' })
  entries: AccountStatementEntryDto[];

  @ApiProperty({ description: 'Closing balance' })
  closingBalance: number;

  @ApiProperty({ description: 'Total debits' })
  totalDebit: number;

  @ApiProperty({ description: 'Total credits' })
  totalCredit: number;

  @ApiProperty({ description: 'Report generation timestamp' })
  generatedAt: string;
}

// ============================================================================
// GROUPED TRIAL BALANCE DTOs
// ============================================================================

export class GroupedTrialBalanceQueryDto {
  @ApiPropertyOptional({
    description: 'As of date (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  @ApiPropertyOptional({
    description: 'Fiscal year ID',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYearId?: number;

  @ApiPropertyOptional({
    description: 'Include accounts with zero balances',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeZeroBalances?: boolean;

  @ApiPropertyOptional({
    description: 'Group by category or account type',
    enum: ['category', 'type'],
    default: 'category',
  })
  @IsString()
  @IsOptional()
  groupBy?: 'category' | 'type';

  @ApiPropertyOptional({
    enum: ReportFormat,
    description: 'Export format',
    default: ReportFormat.JSON,
  })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class GroupedTrialBalanceAccountDto {
  @ApiProperty({ description: 'Account ID' })
  accountId: number;

  @ApiProperty({ description: 'Account code' })
  accountCode: string;

  @ApiProperty({ description: 'Account name' })
  accountName: string;

  @ApiProperty({ description: 'Debit amount' })
  debit: number;

  @ApiProperty({ description: 'Credit amount' })
  credit: number;

  @ApiProperty({ description: 'Net balance' })
  balance: number;
}

export class GroupedTrialBalanceSectionDto {
  @ApiProperty({ description: 'Group name (category or type)' })
  groupName: string;

  @ApiProperty({ description: 'Account type (asset, liability, equity, revenue, expense)' })
  accountType: string;

  @ApiProperty({ type: [GroupedTrialBalanceAccountDto], description: 'Accounts in this group' })
  accounts: GroupedTrialBalanceAccountDto[];

  @ApiProperty({ description: 'Group total debit' })
  totalDebit: number;

  @ApiProperty({ description: 'Group total credit' })
  totalCredit: number;

  @ApiProperty({ description: 'Group net balance' })
  totalBalance: number;
}

export class GroupedTrialBalanceDto {
  @ApiProperty({ description: 'Company ID' })
  companyId: number;

  @ApiProperty({ description: 'Company name' })
  companyName: string;

  @ApiProperty({ description: 'As of date (YYYY-MM-DD)' })
  asOfDate: string;

  @ApiProperty({ description: 'Fiscal year ID', nullable: true })
  fiscalYearId: number | null;

  @ApiProperty({ description: 'Fiscal year name', nullable: true })
  fiscalYearName: string | null;

  @ApiProperty({ description: 'Grouping method (category or type)' })
  groupedBy: string;

  @ApiProperty({ type: [GroupedTrialBalanceSectionDto], description: 'Grouped sections' })
  sections: GroupedTrialBalanceSectionDto[];

  @ApiProperty({
    description: 'Grand totals',
    example: { debit: 150000, credit: 150000, balance: 0 },
  })
  totals: {
    debit: number;
    credit: number;
    balance: number;
  };

  @ApiProperty({ description: 'Whether debits equal credits' })
  isBalanced: boolean;

  @ApiProperty({ description: 'Report generation timestamp' })
  generatedAt: string;
}
