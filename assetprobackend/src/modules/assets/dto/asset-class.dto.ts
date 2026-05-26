import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsEnum,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// ENUMS
// ============================================================================

// Values MUST match the Postgres "DepreciationMethod" enum (defined in
// prisma/schema.tenant.prisma). Historically the values here were
// lowercase, which caused every asset/asset-class insert to fail with
// 'invalid input value for enum "DepreciationMethod"'. Fixed 2026-04-23.
export enum DepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',
  DECLINING_BALANCE = 'DECLINING_BALANCE',
  UNITS_OF_PRODUCTION = 'UNITS_OF_PRODUCTION',
  SUM_OF_YEARS_DIGITS = 'SUM_OF_YEARS_DIGITS',
}

// ============================================================================
// CREATE DTO
// ============================================================================

export class CreateAssetClassDto {
  @ApiProperty({ description: 'Asset class code' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Asset class name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DepreciationMethod, description: 'Depreciation method' })
  @IsOptional()
  @IsEnum(DepreciationMethod)
  depreciationMethod?: DepreciationMethod;

  @ApiPropertyOptional({ description: 'Useful life in years' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  usefulLifeYears?: number;

  @ApiPropertyOptional({ description: 'Residual value percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  residualValuePercent?: number;

  @ApiPropertyOptional({ description: 'Asset GL account ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assetAccountId?: number;

  @ApiPropertyOptional({ description: 'Accumulated depreciation GL account ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  accumulatedDepreciationAccountId?: number;

  @ApiPropertyOptional({ description: 'Depreciation expense GL account ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  depreciationExpenseAccountId?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// UPDATE DTO
// ============================================================================

export class UpdateAssetClassDto {
  @ApiPropertyOptional({ description: 'Asset class name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DepreciationMethod, description: 'Depreciation method' })
  @IsOptional()
  @IsEnum(DepreciationMethod)
  depreciationMethod?: DepreciationMethod;

  @ApiPropertyOptional({ description: 'Useful life in years' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  usefulLifeYears?: number;

  @ApiPropertyOptional({ description: 'Residual value percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  residualValuePercent?: number;

  @ApiPropertyOptional({ description: 'Asset GL account ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assetAccountId?: number;

  @ApiPropertyOptional({ description: 'Accumulated depreciation GL account ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  accumulatedDepreciationAccountId?: number;

  @ApiPropertyOptional({ description: 'Depreciation expense GL account ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  depreciationExpenseAccountId?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// QUERY DTO
// ============================================================================

export class AssetClassQueryDto {
  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
