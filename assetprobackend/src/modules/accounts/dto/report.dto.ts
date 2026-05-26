import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export enum ReportFormat {
  JSON = 'json',
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

export class TrialBalanceQueryDto {
  @ApiPropertyOptional({ description: 'As of date' })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  @ApiPropertyOptional({ description: 'Fiscal year ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYearId?: number;

  @ApiPropertyOptional({ description: 'Include zero balances', default: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeZeroBalances?: boolean;

  @ApiPropertyOptional({ enum: ReportFormat, description: 'Export format' })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class BalanceSheetQueryDto {
  @ApiPropertyOptional({ description: 'As of date' })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  @ApiPropertyOptional({ description: 'Fiscal year ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYearId?: number;

  @ApiPropertyOptional({ description: 'Compare with previous period', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  comparePrevious?: boolean;

  @ApiPropertyOptional({ description: 'Comparison date for period-over-period' })
  @IsDateString()
  @IsOptional()
  compareDate?: string;

  @ApiPropertyOptional({ enum: ReportFormat, description: 'Export format' })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class IncomeStatementQueryDto {
  @ApiPropertyOptional({ description: 'Start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Fiscal year ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYearId?: number;

  @ApiPropertyOptional({ description: 'Compare with previous period', default: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  comparePrevious?: boolean;

  @ApiPropertyOptional({ description: 'Comparison start date' })
  @IsDateString()
  @IsOptional()
  compareStartDate?: string;

  @ApiPropertyOptional({ description: 'Comparison end date' })
  @IsDateString()
  @IsOptional()
  compareEndDate?: string;

  @ApiPropertyOptional({ enum: ReportFormat, description: 'Export format' })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class CashFlowQueryDto {
  @ApiPropertyOptional({ description: 'Start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Fiscal year ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYearId?: number;

  @ApiPropertyOptional({ enum: ReportFormat, description: 'Export format' })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class GeneralLedgerQueryDto {
  @ApiProperty({ description: 'Account ID' })
  @IsInt()
  @Type(() => Number)
  accountId: number;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: ReportFormat, description: 'Export format' })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class AccountStatementQueryDto {
  @ApiPropertyOptional({ description: 'Start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: ReportFormat, description: 'Export format' })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class AgedReceivablesQueryDto {
  @ApiPropertyOptional({ description: 'As of date' })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  @ApiPropertyOptional({ description: 'Aging periods (days)', default: [30, 60, 90, 120] })
  @IsOptional()
  agingPeriods?: number[];

  @ApiPropertyOptional({ enum: ReportFormat, description: 'Export format' })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class AgedPayablesQueryDto {
  @ApiPropertyOptional({ description: 'As of date' })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  @ApiPropertyOptional({ description: 'Aging periods (days)', default: [30, 60, 90, 120] })
  @IsOptional()
  agingPeriods?: number[];

  @ApiPropertyOptional({ enum: ReportFormat, description: 'Export format' })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class VatReportQueryDto {
  @ApiPropertyOptional({ description: 'Start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: ReportFormat, description: 'Export format' })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}

export class WhtReportQueryDto {
  @ApiPropertyOptional({ description: 'Start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: ReportFormat, description: 'Export format' })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;
}
