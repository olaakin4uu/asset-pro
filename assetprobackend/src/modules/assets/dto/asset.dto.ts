import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DepreciationMethod } from './asset-class.dto';

// ============================================================================
// ENUMS
// ============================================================================

export enum AssetStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UNDER_MAINTENANCE = 'under_maintenance',
  DISPOSED = 'disposed',
  LOST = 'lost',
  STOLEN = 'stolen',
  WRITTEN_OFF = 'written_off',
}

export enum AssetCondition {
  NEW = 'new',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  DAMAGED = 'damaged',
}

export enum AcquisitionMethod {
  PURCHASE = 'purchase',
  DONATION = 'donation',
  LEASE = 'lease',
  CONSTRUCTION = 'construction',
  TRADE_IN = 'trade_in',
  OTHER = 'other',
}

// ============================================================================
// CREATE DTO
// ============================================================================

export class CreateAssetDto {
  @ApiPropertyOptional({ description: 'Branch ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  @ApiProperty({ description: 'Asset class ID' })
  @IsInt()
  @Type(() => Number)
  assetClassId: number;

  @ApiPropertyOptional({ description: 'Asset code (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  assetCode?: string;

  @ApiProperty({ description: 'Asset name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Barcode' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ description: 'Custodian user ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  custodianUserId?: number;

  @ApiPropertyOptional({ description: 'Acquisition date' })
  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @ApiProperty({ description: 'Acquisition cost' })
  @IsNumber()
  @Min(0)
  acquisitionCost: number;

  @ApiPropertyOptional({ enum: AcquisitionMethod, description: 'Acquisition method' })
  @IsOptional()
  @IsEnum(AcquisitionMethod)
  acquisitionMethod?: AcquisitionMethod;

  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  supplierId?: number;

  @ApiPropertyOptional({ description: 'Purchase order number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  purchaseOrderNumber?: string;

  @ApiPropertyOptional({ description: 'Invoice number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string;

  @ApiPropertyOptional({ enum: DepreciationMethod, description: 'Depreciation method (overrides class)' })
  @IsOptional()
  @IsEnum(DepreciationMethod)
  depreciationMethod?: DepreciationMethod;

  @ApiPropertyOptional({ description: 'Useful life in years (overrides class)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  usefulLifeYears?: number;

  @ApiPropertyOptional({ description: 'Residual value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  residualValue?: number;

  @ApiPropertyOptional({ description: 'Residual value percentage (overrides class)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  residualValuePercent?: number;

  @ApiPropertyOptional({ description: 'Depreciation start date' })
  @IsOptional()
  @IsDateString()
  depreciationStartDate?: string;

  @ApiPropertyOptional({ enum: AssetStatus, description: 'Asset status' })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ enum: AssetCondition, description: 'Asset condition' })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @ApiPropertyOptional({ description: 'Warranty start date' })
  @IsOptional()
  @IsDateString()
  warrantyStartDate?: string;

  @ApiPropertyOptional({ description: 'Warranty expiry date' })
  @IsOptional()
  @IsDateString()
  warrantyExpiryDate?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Custom fields' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}

// ============================================================================
// UPDATE DTO
// ============================================================================

export class UpdateAssetDto {
  @ApiPropertyOptional({ description: 'Asset class ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assetClassId?: number;

  @ApiPropertyOptional({ description: 'Asset name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Barcode' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ description: 'Custodian user ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  custodianUserId?: number;

  @ApiPropertyOptional({ description: 'Acquisition date' })
  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @ApiPropertyOptional({ description: 'Acquisition cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  acquisitionCost?: number;

  @ApiPropertyOptional({ enum: AcquisitionMethod, description: 'Acquisition method' })
  @IsOptional()
  @IsEnum(AcquisitionMethod)
  acquisitionMethod?: AcquisitionMethod;

  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  supplierId?: number;

  @ApiPropertyOptional({ description: 'Purchase order number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  purchaseOrderNumber?: string;

  @ApiPropertyOptional({ description: 'Invoice number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string;

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

  @ApiPropertyOptional({ description: 'Residual value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  residualValue?: number;

  @ApiPropertyOptional({ description: 'Residual value percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  residualValuePercent?: number;

  @ApiPropertyOptional({ description: 'Depreciation start date' })
  @IsOptional()
  @IsDateString()
  depreciationStartDate?: string;

  @ApiPropertyOptional({ enum: AssetStatus, description: 'Asset status' })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ enum: AssetCondition, description: 'Asset condition' })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @ApiPropertyOptional({ description: 'Warranty start date' })
  @IsOptional()
  @IsDateString()
  warrantyStartDate?: string;

  @ApiPropertyOptional({ description: 'Warranty expiry date' })
  @IsOptional()
  @IsDateString()
  warrantyExpiryDate?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Custom fields' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}

// ============================================================================
// QUERY DTO
// ============================================================================

export class AssetQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by asset class ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  assetClassId?: number;

  @ApiPropertyOptional({ enum: AssetStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ enum: AssetCondition, description: 'Filter by condition' })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @ApiPropertyOptional({ description: 'Filter by location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Filter by department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Filter by custodian user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  custodianUserId?: number;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
