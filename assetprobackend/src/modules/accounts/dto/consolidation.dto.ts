import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ConsolidationMethod {
  FULL = 'full',
  PROPORTIONAL = 'proportional',
  EQUITY = 'equity',
}

export enum EliminationType {
  INTER_COMPANY_SALES = 'inter_company_sales',
  INTER_COMPANY_RECEIVABLES = 'inter_company_receivables',
  INTER_COMPANY_PAYABLES = 'inter_company_payables',
  INTER_COMPANY_PROFIT = 'inter_company_profit',
  DIVIDEND_INCOME = 'dividend_income',
  INVESTMENT_ELIMINATION = 'investment_elimination',
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class ConsolidationQueryDto {
  @ApiProperty({
    description: 'Array of company IDs to consolidate',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  companyIds: number[];

  @ApiPropertyOptional({
    description: 'As of date (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  @ApiPropertyOptional({
    description: 'Start date for P&L consolidation (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for P&L consolidation (YYYY-MM-DD)',
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
    enum: ConsolidationMethod,
    description: 'Consolidation method',
    default: ConsolidationMethod.FULL,
  })
  @IsEnum(ConsolidationMethod)
  @IsOptional()
  method?: ConsolidationMethod;

  @ApiPropertyOptional({
    description: 'Apply elimination entries',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  applyEliminations?: boolean;

  @ApiPropertyOptional({
    description: 'Include consolidation adjustments details',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeAdjustmentDetails?: boolean;
}

export class ConsolidatedBalanceSheetQueryDto extends ConsolidationQueryDto {
  @ApiPropertyOptional({
    description: 'Show comparative period',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  comparative?: boolean;
}

export class ConsolidatedIncomeStatementQueryDto extends ConsolidationQueryDto {
  @ApiPropertyOptional({
    description: 'Group by segment',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  bySegment?: boolean;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class EliminationEntryDto {
  @ApiProperty({
    description: 'Elimination entry ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    enum: EliminationType,
    description: 'Type of elimination',
  })
  type: EliminationType;

  @ApiProperty({
    description: 'Description of elimination',
    example: 'Eliminate inter-company sales between Company A and Company B',
  })
  description: string;

  @ApiProperty({
    description: 'Debit account code',
    example: '4000',
  })
  debitAccountCode: string;

  @ApiProperty({
    description: 'Debit account name',
    example: 'Sales Revenue',
  })
  debitAccountName: string;

  @ApiProperty({
    description: 'Debit amount',
    example: 50000.00,
  })
  debitAmount: number;

  @ApiProperty({
    description: 'Credit account code',
    example: '5000',
  })
  creditAccountCode: string;

  @ApiProperty({
    description: 'Credit account name',
    example: 'Cost of Goods Sold',
  })
  creditAccountName: string;

  @ApiProperty({
    description: 'Credit amount',
    example: 50000.00,
  })
  creditAmount: number;

  @ApiProperty({
    description: 'Source company ID',
    example: 1,
  })
  sourceCompanyId: number;

  @ApiProperty({
    description: 'Source company name',
    example: 'Company A',
  })
  sourceCompanyName: string;

  @ApiProperty({
    description: 'Target company ID',
    example: 2,
  })
  targetCompanyId: number;

  @ApiProperty({
    description: 'Target company name',
    example: 'Company B',
  })
  targetCompanyName: string;
}

export class ConsolidatedAccountLineDto {
  @ApiProperty({
    description: 'Account code',
    example: '1000',
  })
  accountCode: string;

  @ApiProperty({
    description: 'Account name',
    example: 'Cash and Cash Equivalents',
  })
  accountName: string;

  @ApiProperty({
    description: 'Account category',
    example: 'Current Assets',
  })
  category: string;

  @ApiProperty({
    description: 'Individual company balances',
    example: { 'Company A': 100000, 'Company B': 50000 },
  })
  companyBalances: Record<string, number>;

  @ApiProperty({
    description: 'Total before eliminations',
    example: 150000.00,
  })
  totalBeforeEliminations: number;

  @ApiProperty({
    description: 'Elimination adjustments',
    example: 0,
  })
  eliminationAdjustments: number;

  @ApiProperty({
    description: 'Consolidated balance',
    example: 150000.00,
  })
  consolidatedBalance: number;
}

export class ConsolidationReportDto {
  @ApiProperty({
    description: 'Report title',
    example: 'Consolidated Balance Sheet',
  })
  title: string;

  @ApiProperty({
    description: 'Report subtitle',
    example: 'As of December 31, 2026',
  })
  subtitle: string;

  @ApiProperty({
    description: 'Consolidation date',
    example: '2026-12-31',
  })
  asOfDate: string;

  @ApiProperty({
    description: 'Array of consolidated company IDs',
    type: [Number],
    example: [1, 2, 3],
  })
  companyIds: number[];

  @ApiProperty({
    description: 'Map of company names',
    example: { '1': 'Company A', '2': 'Company B', '3': 'Company C' },
  })
  companyNames: Record<number, string>;

  @ApiProperty({
    enum: ConsolidationMethod,
    description: 'Consolidation method used',
  })
  method: ConsolidationMethod;

  @ApiProperty({
    description: 'Consolidated account lines',
    type: [ConsolidatedAccountLineDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedAccountLineDto)
  lines: ConsolidatedAccountLineDto[];

  @ApiProperty({
    description: 'Total before eliminations',
    example: 1500000.00,
  })
  totalBeforeEliminations: number;

  @ApiProperty({
    description: 'Total elimination adjustments',
    example: 50000.00,
  })
  totalEliminationAdjustments: number;

  @ApiProperty({
    description: 'Consolidated total',
    example: 1450000.00,
  })
  consolidatedTotal: number;

  @ApiPropertyOptional({
    description: 'Elimination entries applied',
    type: [EliminationEntryDto],
  })
  @ValidateNested({ each: true })
  @Type(() => EliminationEntryDto)
  @IsOptional()
  eliminationEntries?: EliminationEntryDto[];

  @ApiProperty({
    description: 'Report generation timestamp',
    example: '2026-02-10T14:30:00Z',
  })
  generatedAt: string;
}

export class ConsolidatedBalanceSheetDto extends ConsolidationReportDto {
  @ApiProperty({
    description: 'Assets section',
    type: [ConsolidatedAccountLineDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedAccountLineDto)
  assets: ConsolidatedAccountLineDto[];

  @ApiProperty({
    description: 'Liabilities section',
    type: [ConsolidatedAccountLineDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedAccountLineDto)
  liabilities: ConsolidatedAccountLineDto[];

  @ApiProperty({
    description: 'Equity section',
    type: [ConsolidatedAccountLineDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedAccountLineDto)
  equity: ConsolidatedAccountLineDto[];

  @ApiProperty({
    description: 'Total consolidated assets',
    example: 1000000.00,
  })
  totalAssets: number;

  @ApiProperty({
    description: 'Total consolidated liabilities',
    example: 600000.00,
  })
  totalLiabilities: number;

  @ApiProperty({
    description: 'Total consolidated equity',
    example: 400000.00,
  })
  totalEquity: number;
}

export class ConsolidatedIncomeStatementDto extends ConsolidationReportDto {
  @ApiProperty({
    description: 'Revenue section',
    type: [ConsolidatedAccountLineDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedAccountLineDto)
  revenue: ConsolidatedAccountLineDto[];

  @ApiProperty({
    description: 'Cost of sales section',
    type: [ConsolidatedAccountLineDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedAccountLineDto)
  costOfSales: ConsolidatedAccountLineDto[];

  @ApiProperty({
    description: 'Operating expenses section',
    type: [ConsolidatedAccountLineDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedAccountLineDto)
  operatingExpenses: ConsolidatedAccountLineDto[];

  @ApiProperty({
    description: 'Other income/expenses section',
    type: [ConsolidatedAccountLineDto],
  })
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedAccountLineDto)
  otherIncomeExpenses: ConsolidatedAccountLineDto[];

  @ApiProperty({
    description: 'Consolidated gross profit',
    example: 300000.00,
  })
  grossProfit: number;

  @ApiProperty({
    description: 'Consolidated operating profit',
    example: 150000.00,
  })
  operatingProfit: number;

  @ApiProperty({
    description: 'Consolidated net profit',
    example: 140000.00,
  })
  netProfit: number;
}

// ============================================================================
// ELIMINATION ENTRY CREATION DTO
// ============================================================================

export class CreateEliminationEntryDto {
  @ApiProperty({
    enum: EliminationType,
    description: 'Type of elimination',
  })
  @IsEnum(EliminationType)
  type: EliminationType;

  @ApiProperty({
    description: 'Description of elimination',
    example: 'Eliminate inter-company sales',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Source company ID',
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  sourceCompanyId: number;

  @ApiProperty({
    description: 'Target company ID',
    example: 2,
  })
  @IsInt()
  @Type(() => Number)
  targetCompanyId: number;

  @ApiProperty({
    description: 'Debit account code',
    example: '4000',
  })
  @IsString()
  debitAccountCode: string;

  @ApiProperty({
    description: 'Credit account code',
    example: '5000',
  })
  @IsString()
  creditAccountCode: string;

  @ApiProperty({
    description: 'Amount',
    example: 50000.00,
  })
  @IsNumber()
  amount: number;
}
