import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// ENUMS
// ============================================================================

export enum DisposalType {
  SALE = 'sale',
  SCRAP = 'scrap',
  DONATION = 'donation',
  TRADE_IN = 'trade_in',
  THEFT = 'theft',
  LOSS = 'loss',
  WRITE_OFF = 'write_off',
  INSURANCE_CLAIM = 'insurance_claim',
  OTHER = 'other',
}

export enum DisposalStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// ============================================================================
// CREATE DTO
// ============================================================================

export class CreateAssetDisposalDto {
  @ApiProperty({ description: 'Asset ID' })
  @IsInt()
  @Type(() => Number)
  assetId: number;

  @ApiProperty({ description: 'Disposal date' })
  @IsDateString()
  disposalDate: string;

  @ApiProperty({ enum: DisposalType, description: 'Disposal type' })
  @IsEnum(DisposalType)
  disposalType: DisposalType;

  @ApiPropertyOptional({ description: 'Disposal proceeds amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  disposalProceeds?: number;

  @ApiPropertyOptional({ description: 'Disposal costs' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  disposalCosts?: number;

  @ApiPropertyOptional({ description: 'Buyer name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  buyerName?: string;

  @ApiPropertyOptional({ description: 'Buyer contact' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buyerContact?: string;

  @ApiPropertyOptional({ description: 'Buyer address' })
  @IsOptional()
  @IsString()
  buyerAddress?: string;

  @ApiPropertyOptional({ description: 'Sale agreement number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  saleAgreementNumber?: string;

  @ApiPropertyOptional({ description: 'Invoice number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Payment received date' })
  @IsOptional()
  @IsDateString()
  paymentReceivedDate?: string;

  @ApiPropertyOptional({ description: 'Payment method' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Reason for disposal' })
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

export class UpdateAssetDisposalDto {
  @ApiPropertyOptional({ description: 'Disposal date' })
  @IsOptional()
  @IsDateString()
  disposalDate?: string;

  @ApiPropertyOptional({ enum: DisposalType, description: 'Disposal type' })
  @IsOptional()
  @IsEnum(DisposalType)
  disposalType?: DisposalType;

  @ApiPropertyOptional({ description: 'Disposal proceeds amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  disposalProceeds?: number;

  @ApiPropertyOptional({ description: 'Disposal costs' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  disposalCosts?: number;

  @ApiPropertyOptional({ description: 'Buyer name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  buyerName?: string;

  @ApiPropertyOptional({ description: 'Buyer contact' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buyerContact?: string;

  @ApiPropertyOptional({ description: 'Buyer address' })
  @IsOptional()
  @IsString()
  buyerAddress?: string;

  @ApiPropertyOptional({ description: 'Sale agreement number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  saleAgreementNumber?: string;

  @ApiPropertyOptional({ description: 'Invoice number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Payment received date' })
  @IsOptional()
  @IsDateString()
  paymentReceivedDate?: string;

  @ApiPropertyOptional({ description: 'Payment method' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Reason for disposal' })
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

export class AssetDisposalQueryDto {
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

  @ApiPropertyOptional({ enum: DisposalType, description: 'Filter by disposal type' })
  @IsOptional()
  @IsEnum(DisposalType)
  disposalType?: DisposalType;

  @ApiPropertyOptional({ enum: DisposalStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(DisposalStatus)
  status?: DisposalStatus;

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

export class RejectDisposalDto {
  @ApiPropertyOptional({ description: 'Rejection reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CalculateGainLossDto {
  @ApiProperty({ description: 'Asset ID' })
  @IsInt()
  @Type(() => Number)
  assetId: number;

  @ApiProperty({ description: 'Disposal proceeds' })
  @IsNumber()
  @Min(0)
  disposalProceeds: number;

  @ApiProperty({ description: 'Disposal costs' })
  @IsNumber()
  @Min(0)
  disposalCosts: number;
}
