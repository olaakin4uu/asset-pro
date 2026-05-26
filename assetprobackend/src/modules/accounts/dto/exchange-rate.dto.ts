import {
  IsInt,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  IsString,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============================================================================
// EXCHANGE RATE DTOs
// ============================================================================

export class CreateExchangeRateStandaloneDto {
  @ApiProperty({ description: 'Source currency ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  fromCurrencyId: number;

  @ApiProperty({ description: 'Target currency ID', example: 2 })
  @IsInt()
  @Type(() => Number)
  toCurrencyId: number;

  @ApiProperty({ description: 'Exchange rate value', example: 1.234567 })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  rate: number;

  @ApiProperty({ description: 'Valid from date', example: '2026-01-01' })
  @IsDateString()
  validFrom: string;

  @ApiPropertyOptional({ description: 'Valid to date', example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  validTo?: string;

  @ApiPropertyOptional({ description: 'Rate source (e.g. CBN, ECB, Manual)', example: 'CBN' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateExchangeRateStandaloneDto {
  @ApiPropertyOptional({ description: 'Exchange rate value' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  rate?: number;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid to date' })
  @IsDateString()
  @IsOptional()
  validTo?: string;

  @ApiPropertyOptional({ description: 'Rate source' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ExchangeRateStandaloneQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'As of date for filtering current rates' })
  @IsDateString()
  @IsOptional()
  asOfDate?: string;

  @ApiPropertyOptional({ description: 'Search by source' })
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
