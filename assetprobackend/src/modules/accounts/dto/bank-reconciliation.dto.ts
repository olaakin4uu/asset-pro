import {
  IsInt,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsArray,
  IsIn,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============================================================================
// BANK RECONCILIATION DTOs
// ============================================================================

export class CreateBankReconciliationDto {
  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiProperty({ description: 'Bank ID to reconcile', example: 1 })
  @IsInt()
  @Type(() => Number)
  bankId: number;

  @ApiProperty({ description: 'Reconciliation date', example: '2026-01-31' })
  @IsDateString()
  reconciliationDate: string;

  @ApiProperty({ description: 'Bank statement date', example: '2026-01-31' })
  @IsDateString()
  statementDate: string;

  @ApiProperty({ description: 'Statement closing balance from bank', example: 150000.00 })
  @IsNumber()
  @Type(() => Number)
  statementBalance: number;

  @ApiProperty({ description: 'Book balance from general ledger', example: 148500.00 })
  @IsNumber()
  @Type(() => Number)
  bookBalance: number;

  @ApiPropertyOptional({ description: 'Notes or remarks' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateBankReconciliationDto {
  @ApiPropertyOptional({ description: 'Reconciliation date' })
  @IsDateString()
  @IsOptional()
  reconciliationDate?: string;

  @ApiPropertyOptional({ description: 'Bank statement date' })
  @IsDateString()
  @IsOptional()
  statementDate?: string;

  @ApiPropertyOptional({ description: 'Statement closing balance from bank' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  statementBalance?: number;

  @ApiPropertyOptional({ description: 'Book balance from general ledger' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  bookBalance?: number;

  @ApiPropertyOptional({ description: 'Notes or remarks' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}

export class BankReconciliationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by bank ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  bankId?: number;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['draft', 'in_progress', 'completed'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['draft', 'in_progress', 'completed'])
  status?: string;

  @ApiPropertyOptional({ description: 'Search by notes' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'From date filter' })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date filter' })
  @IsDateString()
  @IsOptional()
  toDate?: string;

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

// ============================================================================
// BANK RECONCILIATION ITEM DTOs
// ============================================================================

export class CreateBankReconciliationItemDto {
  @ApiProperty({
    description: 'Transaction type',
    enum: ['deposit', 'withdrawal', 'transfer', 'charge', 'interest'],
    example: 'deposit',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['deposit', 'withdrawal', 'transfer', 'charge', 'interest'])
  transactionType: string;

  @ApiPropertyOptional({
    description: 'Reference type (payment, receipt, journal, etc.)',
    example: 'receipt',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Reference ID (links to source document)' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  referenceId?: number;

  @ApiProperty({ description: 'Transaction date', example: '2026-01-15' })
  @IsDateString()
  transactionDate: string;

  @ApiPropertyOptional({ description: 'Transaction description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Transaction amount', example: 5000.00 })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ description: 'Whether the item has been cleared', default: false })
  @IsBoolean()
  @IsOptional()
  isCleared?: boolean;
}

export class UpdateBankReconciliationItemDto {
  @ApiPropertyOptional({
    description: 'Transaction type',
    enum: ['deposit', 'withdrawal', 'transfer', 'charge', 'interest'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['deposit', 'withdrawal', 'transfer', 'charge', 'interest'])
  transactionType?: string;

  @ApiPropertyOptional({ description: 'Reference type' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Reference ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  referenceId?: number;

  @ApiPropertyOptional({ description: 'Transaction date' })
  @IsDateString()
  @IsOptional()
  transactionDate?: string;

  @ApiPropertyOptional({ description: 'Transaction description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Transaction amount' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ description: 'Whether the item has been cleared' })
  @IsBoolean()
  @IsOptional()
  isCleared?: boolean;
}

export class BulkClearItemsDto {
  @ApiProperty({ description: 'Array of item IDs to mark as cleared', example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  itemIds: number[];
}
