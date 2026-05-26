import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum JournalEntryStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  POSTED = 'posted',
  REVERSED = 'reversed',
}

export enum JournalType {
  GENERAL = 'general',
  ADJUSTING = 'adjusting',
  CLOSING = 'closing',
  OPENING = 'opening',
}

export class JournalEntryLineDto {
  @ApiProperty({ description: 'Account ID' })
  @IsInt()
  @Type(() => Number)
  accountId: number;

  @ApiPropertyOptional({ description: 'Debit amount' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  debit?: number;

  @ApiPropertyOptional({ description: 'Credit amount' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  credit?: number;

  @ApiPropertyOptional({ description: 'Line narration' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  narration?: string;

  @ApiPropertyOptional({ description: 'Line reference' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string;
}

export class CreateJournalEntryDto {
  @ApiProperty({ description: 'Entry date' })
  @IsDateString()
  entryDate: string;

  @ApiPropertyOptional({ description: 'Reference number' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ description: 'Journal narration' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  narration?: string;

  @ApiPropertyOptional({ enum: JournalType, description: 'Journal type' })
  @IsEnum(JournalType)
  @IsOptional()
  journalType?: JournalType;

  @ApiPropertyOptional({ description: 'Source type (manual, sales, purchase, etc.)' })
  @IsString()
  @IsOptional()
  sourceType?: string;

  @ApiPropertyOptional({ description: 'Source ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  sourceId?: number;

  @ApiPropertyOptional({ description: 'Fiscal year ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYearId?: number;

  @ApiProperty({ description: 'Journal entry lines', type: [JournalEntryLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines: JournalEntryLineDto[];
}

export class UpdateJournalEntryDto {
  @ApiPropertyOptional({ description: 'Entry date' })
  @IsDateString()
  @IsOptional()
  entryDate?: string;

  @ApiPropertyOptional({ description: 'Reference number' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ description: 'Journal narration' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  narration?: string;

  @ApiPropertyOptional({ enum: JournalType, description: 'Journal type' })
  @IsEnum(JournalType)
  @IsOptional()
  journalType?: JournalType;

  @ApiPropertyOptional({ description: 'Fiscal year ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYearId?: number;

  @ApiPropertyOptional({ description: 'Journal entry lines', type: [JournalEntryLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  @IsOptional()
  lines?: JournalEntryLineDto[];
}

export class PostJournalEntryDto {
  @ApiPropertyOptional({ description: 'Optional posting notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReverseJournalEntryDto {
  @ApiProperty({ description: 'Reversal date' })
  @IsDateString()
  reversalDate: string;

  @ApiProperty({ description: 'Reason for reversal (required, minimum 5 characters)' })
  @IsString()
  @IsNotEmpty({ message: 'Reversal reason is required' })
  @MaxLength(500)
  reason: string;
}

export class JournalEntryQueryDto {
  @ApiPropertyOptional({ enum: JournalEntryStatus, description: 'Filter by status' })
  @IsEnum(JournalEntryStatus)
  @IsOptional()
  status?: JournalEntryStatus;

  @ApiPropertyOptional({ enum: JournalType, description: 'Filter by journal type' })
  @IsEnum(JournalType)
  @IsOptional()
  journalType?: JournalType;

  @ApiPropertyOptional({ description: 'Filter by fiscal year ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fiscalYearId?: number;

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  search?: string;

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

  @ApiPropertyOptional({ description: 'Filter by source type (manual, sales_invoice, etc.)' })
  @IsString()
  @IsOptional()
  sourceType?: string;
}
