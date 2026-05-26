import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsNotEmpty,
  MaxLength,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBankDto {
  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiProperty({ description: 'Bank name (e.g., "First Bank", "GTBank")' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Account holder name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  accountName?: string;

  @ApiProperty({ description: 'Bank account number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  accountNumber: string;

  @ApiProperty({ description: 'Bank name (institution)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  bankName: string;

  @ApiPropertyOptional({ description: 'Bank branch' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  branch?: string;

  @ApiPropertyOptional({ description: 'SWIFT/BIC code' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  swiftCode?: string;

  @ApiPropertyOptional({ description: 'Routing number' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  routingNumber?: string;

  @ApiPropertyOptional({ description: 'Contact person at the bank' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Contact email address' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactEmail?: string;

  @ApiProperty({ description: 'GL Account ID for this bank' })
  @IsInt()
  @Type(() => Number)
  glAccountId: number;

  @ApiPropertyOptional({ description: 'Opening balance' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  openingBalance?: number;

  @ApiPropertyOptional({ description: 'Opening balance date' })
  @IsDateString()
  @IsOptional()
  openingBalanceDate?: string;

  @ApiPropertyOptional({ description: 'Exchange rate for opening balance (foreign currency to base currency). 1.0 for base currency.' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  openingBalanceExchangeRate?: number;

  @ApiPropertyOptional({ description: 'Currency code (e.g. NGN, USD, GBP). Defaults to company currency', default: 'NGN' })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional({ description: 'Whether bank is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBankDto {
  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Account holder name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  accountName?: string;

  @ApiPropertyOptional({ description: 'Bank account number' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank name (institution)' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank branch' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  branch?: string;

  @ApiPropertyOptional({ description: 'SWIFT/BIC code' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  swiftCode?: string;

  @ApiPropertyOptional({ description: 'Routing number' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  routingNumber?: string;

  @ApiPropertyOptional({ description: 'Contact person at the bank' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Contact email address' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'GL Account ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  glAccountId?: number;

  @ApiPropertyOptional({ description: 'Currency code (e.g. NGN, USD, GBP)' })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  currencyCode?: string;

  @ApiPropertyOptional({ description: 'Opening balance' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  openingBalance?: number;

  @ApiPropertyOptional({ description: 'Opening balance date' })
  @IsDateString()
  @IsOptional()
  openingBalanceDate?: string;

  @ApiPropertyOptional({ description: 'Exchange rate for opening balance (foreign currency to base currency)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  openingBalanceExchangeRate?: number;

  @ApiPropertyOptional({ description: 'Whether bank is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class BankTransferDto {
  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiProperty({ description: 'Source bank ID' })
  @IsInt()
  @Type(() => Number)
  fromBankId: number;

  @ApiProperty({ description: 'Destination bank ID' })
  @IsInt()
  @Type(() => Number)
  toBankId: number;

  @ApiProperty({ description: 'Transfer amount' })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: 'Transfer date' })
  @IsDateString()
  transferDate: string;

  @ApiPropertyOptional({ description: 'Transfer reference' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ description: 'Transfer narration' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  narration?: string;

  @ApiPropertyOptional({ description: 'Exchange rate (for cross-currency transfers)', default: 1 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Transfer type: local or foreign', default: 'local' })
  @IsString()
  @IsOptional()
  transferType?: string;

  @ApiPropertyOptional({ description: 'Bank charges / commission' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  bankCharges?: number;

  @ApiPropertyOptional({ description: 'Destination amount (for foreign transfers)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  destinationAmount?: number;

  @ApiPropertyOptional({ description: 'GL expense account ID for charges posting' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  chargesAccountId?: number;
}

export class BankQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

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
}

// ============================================================================
// ENHANCED BANK TRANSFER DTOs (multi-item workflow)
// ============================================================================

export class BankTransferItemDto {
  @ApiProperty({ description: 'Transfer type', enum: ['cash_to_bank', 'bank_to_bank'] })
  @IsString()
  @IsNotEmpty()
  transferType: string;

  @ApiProperty({ description: 'Source GL Account ID' })
  @IsInt()
  @Type(() => Number)
  sourceAccountId: number;

  @ApiPropertyOptional({ description: 'Source Bank ID (for bank_to_bank)' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  sourceBankId?: number;

  @ApiProperty({ description: 'Destination Bank ID' })
  @IsInt()
  @Type(() => Number)
  destinationBankId: number;

  @ApiProperty({ description: 'Destination GL Account ID' })
  @IsInt()
  @Type(() => Number)
  destinationAccountId: number;

  @ApiProperty({ description: 'Transfer amount' })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ description: 'Line description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class CreateBankTransferDto {
  @ApiProperty({ description: 'Source bank ID' })
  @IsInt()
  @Type(() => Number)
  fromBankId: number;

  @ApiProperty({ description: 'Destination bank ID' })
  @IsInt()
  @Type(() => Number)
  toBankId: number;

  @ApiProperty({ description: 'Transfer date' })
  @IsDateString()
  transferDate: string;

  @ApiPropertyOptional({ description: 'Transfer reference' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ description: 'Transfer description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Currency ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  currencyId?: number;

  @ApiPropertyOptional({ description: 'Exchange rate', default: 1 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  exchangeRate?: number;

  @ApiProperty({ description: 'Transfer line items', type: [BankTransferItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankTransferItemDto)
  items: BankTransferItemDto[];
}

export class UpdateBankTransferDto {
  @ApiPropertyOptional({ description: 'Transfer date' })
  @IsDateString()
  @IsOptional()
  transferDate?: string;

  @ApiPropertyOptional({ description: 'Transfer reference' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ description: 'Transfer description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Currency ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  currencyId?: number;

  @ApiPropertyOptional({ description: 'Exchange rate' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Transfer line items', type: [BankTransferItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankTransferItemDto)
  @IsOptional()
  items?: BankTransferItemDto[];
}

export class BankTransferQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by bank ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  bankId?: number;

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsDateString()
  @IsOptional()
  toDate?: string;

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
}

export class ApproveBankTransferDto {
  @ApiPropertyOptional({ description: 'Approval notes' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class RejectBankTransferDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}
