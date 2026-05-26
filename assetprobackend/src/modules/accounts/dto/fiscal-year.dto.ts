import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum FiscalYearStatus {
  OPEN = 'open',
  ADJUSTING = 'adjusting',
  CLOSED = 'closed',
}

export class CreateFiscalYearDto {
  @ApiProperty({ description: 'Fiscal year name (e.g., "FY 2026")' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Start date of fiscal year' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date of fiscal year' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Set as current fiscal year', default: false })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}

export class UpdateFiscalYearDto {
  @ApiPropertyOptional({ description: 'Fiscal year name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Start date of fiscal year' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date of fiscal year' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class SetCurrentFiscalYearDto {
  @ApiProperty({ description: 'Fiscal year ID to set as current' })
  @IsInt()
  @Type(() => Number)
  fiscalYearId: number;
}

export class CloseFiscalYearDto {
  @ApiPropertyOptional({ description: 'Optional closing notes' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Create opening balances for next year', default: true })
  @IsBoolean()
  @IsOptional()
  createOpeningBalances?: boolean;
}

export class FiscalYearQueryDto {
  @ApiPropertyOptional({ enum: FiscalYearStatus, description: 'Filter by status' })
  @IsEnum(FiscalYearStatus)
  @IsOptional()
  status?: FiscalYearStatus;

  @ApiPropertyOptional({ description: 'Filter by current status' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isCurrent?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 25 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
