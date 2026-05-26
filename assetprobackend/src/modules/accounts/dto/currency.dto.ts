import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  MaxLength,
  Length,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============================================================================
// CURRENCY DTOs
// ============================================================================

export class CreateCurrencyDto {
  @ApiProperty({ description: 'Currency name', example: 'Nigerian Naira' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'ISO 4217 currency code', example: 'NGN' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  code: string;

  @ApiPropertyOptional({ description: 'Currency symbol', example: '₦' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  symbol?: string;

  @ApiPropertyOptional({ description: 'Decimal places', default: 2 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  decimalPlaces?: number;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCurrencyDto {
  @ApiPropertyOptional({ description: 'Currency name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Currency symbol' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  symbol?: string;

  @ApiPropertyOptional({ description: 'Decimal places' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  decimalPlaces?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CurrencyQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

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
// EXCHANGE RATE DTOs
// ============================================================================

export class CreateExchangeRateDto {
  @ApiProperty({ description: 'Source currency ID' })
  @IsInt()
  @Type(() => Number)
  fromCurrencyId: number;

  @ApiProperty({ description: 'Target currency ID' })
  @IsInt()
  @Type(() => Number)
  toCurrencyId: number;

  @ApiProperty({ description: 'Exchange rate' })
  @IsNumber()
  @Type(() => Number)
  rate: number;

  @ApiProperty({ description: 'Valid from date' })
  @IsDateString()
  validFrom: string;

  @ApiPropertyOptional({ description: 'Valid to date' })
  @IsDateString()
  @IsOptional()
  validTo?: string;

  @ApiPropertyOptional({ description: 'Rate source' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  source?: string;
}

export class UpdateExchangeRateDto {
  @ApiPropertyOptional({ description: 'Exchange rate' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  rate?: number;

  @ApiPropertyOptional({ description: 'Valid to date' })
  @IsDateString()
  @IsOptional()
  validTo?: string;

  @ApiPropertyOptional({ description: 'Rate source' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  source?: string;
}

export class ExchangeRateQueryDto {
  @ApiPropertyOptional({ description: 'Source currency ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fromCurrencyId?: number;

  @ApiPropertyOptional({ description: 'Target currency ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  toCurrencyId?: number;

  @ApiPropertyOptional({ description: 'As of date' })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;

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
// VAT DTOs
// ============================================================================

export class CreateVatDto {
  @ApiProperty({ description: 'VAT name', example: 'Standard VAT' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'VAT code', example: 'VAT-STD' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'VAT rate percentage', example: 7.5 })
  @IsNumber()
  @Type(() => Number)
  rate: number;

  @ApiPropertyOptional({ description: 'Output VAT GL Account ID (VAT Payable — liability)' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  accountId?: number;

  @ApiPropertyOptional({ description: 'Input VAT GL Account ID (VAT Recoverable — asset)' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  inputAccountId?: number;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateVatDto {
  @ApiPropertyOptional({ description: 'VAT name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'VAT rate percentage' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  rate?: number;

  @ApiPropertyOptional({ description: 'Output VAT GL Account ID (VAT Payable — liability)' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  accountId?: number;

  @ApiPropertyOptional({ description: 'Input VAT GL Account ID (VAT Recoverable — asset)' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  inputAccountId?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class VatQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

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
// PAYMENT METHOD DTOs
// ============================================================================

export class CreatePaymentMethodDto {
  @ApiProperty({ description: 'Payment method name', example: 'Cash' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Payment method code', example: 'CASH' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Payment type',
    enum: ['cash', 'bank_transfer', 'card', 'mobile_money', 'cheque'],
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Requires reference number', default: false })
  @IsBoolean()
  @IsOptional()
  requiresRef?: boolean;
}

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional({ description: 'Payment method name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Payment type' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Requires reference number' })
  @IsBoolean()
  @IsOptional()
  requiresRef?: boolean;
}

export class PaymentMethodQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by type' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

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
// WHT (WITHHOLDING TAX) DTOs
// ============================================================================

export class CreateWhtDto {
  @ApiProperty({ description: 'WHT name', example: 'Services WHT' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'WHT code', example: 'WHT-SRVCS' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'WHT rate percentage', example: 5.0 })
  @IsNumber()
  @Type(() => Number)
  rate: number;

  @ApiPropertyOptional({ description: 'GL Account ID for WHT Payable' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  accountId?: number;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateWhtDto {
  @ApiPropertyOptional({ description: 'WHT name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'WHT rate percentage' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  rate?: number;

  @ApiPropertyOptional({ description: 'GL Account ID for WHT Payable' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  accountId?: number;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class WhtQueryDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

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

export class CalculateWhtDto {
  @ApiProperty({ description: 'Base amount to calculate WHT on' })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: 'WHT ID' })
  @IsInt()
  @Type(() => Number)
  whtId: number;
}
