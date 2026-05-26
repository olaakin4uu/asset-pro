import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetCondition } from './asset.dto';

// ============================================================================
// ENUMS
// ============================================================================

export enum TransferType {
  LOCATION = 'location',
  DEPARTMENT = 'department',
  CUSTODIAN = 'custodian',
  BRANCH = 'branch',
  COMPANY = 'company',
}

export enum TransferStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  IN_TRANSIT = 'in_transit',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// ============================================================================
// CREATE DTO
// ============================================================================

export class CreateAssetTransferDto {
  @ApiProperty({ description: 'Asset ID' })
  @IsInt()
  @Type(() => Number)
  assetId: number;

  @ApiProperty({ description: 'Transfer date' })
  @IsDateString()
  transferDate: string;

  @ApiPropertyOptional({ description: 'Effective date' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiProperty({ enum: TransferType, description: 'Transfer type' })
  @IsEnum(TransferType)
  transferType: TransferType;

  @ApiPropertyOptional({ description: 'Target location' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  toLocation?: string;

  @ApiPropertyOptional({ description: 'Target department' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  toDepartment?: string;

  @ApiPropertyOptional({ description: 'Target custodian user ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  toCustodianUserId?: number;

  @ApiPropertyOptional({ description: 'Target branch ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  toBranchId?: number;

  @ApiPropertyOptional({ enum: AssetCondition, description: 'Condition at transfer' })
  @IsOptional()
  @IsEnum(AssetCondition)
  conditionAtTransfer?: AssetCondition;

  @ApiPropertyOptional({ description: 'Condition notes' })
  @IsOptional()
  @IsString()
  conditionNotes?: string;

  @ApiPropertyOptional({ description: 'Reason for transfer' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// UPDATE DTO
// ============================================================================

export class UpdateAssetTransferDto {
  @ApiPropertyOptional({ description: 'Transfer date' })
  @IsOptional()
  @IsDateString()
  transferDate?: string;

  @ApiPropertyOptional({ description: 'Effective date' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({ enum: TransferType, description: 'Transfer type' })
  @IsOptional()
  @IsEnum(TransferType)
  transferType?: TransferType;

  @ApiPropertyOptional({ description: 'Target location' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  toLocation?: string;

  @ApiPropertyOptional({ description: 'Target department' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  toDepartment?: string;

  @ApiPropertyOptional({ description: 'Target custodian user ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  toCustodianUserId?: number;

  @ApiPropertyOptional({ description: 'Target branch ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  toBranchId?: number;

  @ApiPropertyOptional({ enum: AssetCondition, description: 'Condition at transfer' })
  @IsOptional()
  @IsEnum(AssetCondition)
  conditionAtTransfer?: AssetCondition;

  @ApiPropertyOptional({ description: 'Condition notes' })
  @IsOptional()
  @IsString()
  conditionNotes?: string;

  @ApiPropertyOptional({ description: 'Reason for transfer' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// QUERY DTO
// ============================================================================

export class AssetTransferQueryDto {
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

  @ApiPropertyOptional({ enum: TransferType, description: 'Filter by transfer type' })
  @IsOptional()
  @IsEnum(TransferType)
  transferType?: TransferType;

  @ApiPropertyOptional({ enum: TransferStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(TransferStatus)
  status?: TransferStatus;

  @ApiPropertyOptional({ description: 'Date from filter' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to filter' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

// ============================================================================
// SPECIAL ACTION DTOs
// ============================================================================

export class RejectTransferDto {
  @ApiPropertyOptional({ description: 'Rejection reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}
