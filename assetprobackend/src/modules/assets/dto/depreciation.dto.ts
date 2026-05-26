import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DepreciationMethod } from './asset-class.dto';

// ============================================================================
// ENUMS
// ============================================================================

export enum DepreciationStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  POSTED = 'posted',
  REVERSED = 'reversed',
}

// ============================================================================
// CREATE DTO
// ============================================================================

export class CreateAssetDepreciationDto {
  @ApiProperty({ description: 'Asset ID' })
  @IsInt()
  @Type(() => Number)
  assetId: number;

  @ApiProperty({ description: 'Depreciation date' })
  @IsDateString()
  depreciationDate: string;

  @ApiProperty({ description: 'Fiscal year' })
  @IsInt()
  @Type(() => Number)
  fiscalYear: number;

  @ApiProperty({ description: 'Fiscal period' })
  @IsInt()
  @Type(() => Number)
  @Min(1)
  fiscalPeriod: number;

  @ApiPropertyOptional({ description: 'Period name' })
  @IsOptional()
  @IsString()
  periodName?: string;

  @ApiPropertyOptional({ enum: DepreciationMethod, description: 'Depreciation method' })
  @IsOptional()
  @IsEnum(DepreciationMethod)
  depreciationMethod?: DepreciationMethod;

  @ApiPropertyOptional({ description: 'Manual depreciation amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depreciationAmount?: number;

  @ApiPropertyOptional({ description: 'Batch number' })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'Is adjustment entry' })
  @IsOptional()
  @IsBoolean()
  isAdjustment?: boolean;

  @ApiPropertyOptional({ description: 'Adjustment reason' })
  @IsOptional()
  @IsString()
  adjustmentReason?: string;
}

// ============================================================================
// UPDATE DTO
// ============================================================================

export class UpdateAssetDepreciationDto {
  @ApiPropertyOptional({ description: 'Depreciation date' })
  @IsOptional()
  @IsDateString()
  depreciationDate?: string;

  @ApiPropertyOptional({ description: 'Fiscal year' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  fiscalYear?: number;

  @ApiPropertyOptional({ description: 'Fiscal period' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  fiscalPeriod?: number;

  @ApiPropertyOptional({ description: 'Period name' })
  @IsOptional()
  @IsString()
  periodName?: string;

  @ApiPropertyOptional({ description: 'Depreciation amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depreciationAmount?: number;

  @ApiPropertyOptional({ description: 'Is adjustment entry' })
  @IsOptional()
  @IsBoolean()
  isAdjustment?: boolean;

  @ApiPropertyOptional({ description: 'Adjustment reason' })
  @IsOptional()
  @IsString()
  adjustmentReason?: string;
}

// ============================================================================
// QUERY DTO
// ============================================================================

export class AssetDepreciationQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by asset ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  assetId?: number;

  @ApiPropertyOptional({ description: 'Filter by fiscal year' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  fiscalYear?: number;

  @ApiPropertyOptional({ description: 'Filter by fiscal period' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  fiscalPeriod?: number;

  @ApiPropertyOptional({ enum: DepreciationStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(DepreciationStatus)
  status?: DepreciationStatus;

  @ApiPropertyOptional({ description: 'Filter by posted status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPosted?: boolean;

  @ApiPropertyOptional({ description: 'Filter by batch number' })
  @IsOptional()
  @IsString()
  batchNumber?: string;
}

// ============================================================================
// SPECIAL ACTION DTOs
// ============================================================================

export class BulkPostDepreciationDto {
  @ApiProperty({ description: 'List of depreciation IDs to post', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  ids: number[];
}

export class CalculateDepreciationDto {
  @ApiProperty({ description: 'Asset ID' })
  @IsInt()
  @Type(() => Number)
  assetId: number;

  @ApiProperty({ description: 'Calculation date' })
  @IsDateString()
  date: string;
}

export class RunDepreciationDto {
  @ApiProperty({ description: 'Fiscal year' })
  @IsInt()
  @Type(() => Number)
  fiscalYear: number;

  @ApiProperty({ description: 'Fiscal period' })
  @IsInt()
  @Type(() => Number)
  @Min(1)
  fiscalPeriod: number;
}
