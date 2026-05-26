import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { DepreciationMethod } from './asset-class.dto';
import { Type } from 'class-transformer';

// ============================================================================
// ENUMS
// ============================================================================

export enum DepreciationFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
}

// ============================================================================
// UPDATE DTO
// ============================================================================

export class UpdateAssetSettingsDto {
  // Depreciation Settings
  @ApiPropertyOptional({ enum: DepreciationMethod, description: 'Default depreciation method' })
  @IsOptional()
  @IsEnum(DepreciationMethod)
  defaultDepreciationMethod?: DepreciationMethod;

  @ApiPropertyOptional({ description: 'Auto calculate depreciation' })
  @IsOptional()
  @IsBoolean()
  autoCalculateDepreciation?: boolean;

  @ApiPropertyOptional({ enum: DepreciationFrequency, description: 'Depreciation frequency' })
  @IsOptional()
  @IsEnum(DepreciationFrequency)
  depreciationFrequency?: DepreciationFrequency;

  @ApiPropertyOptional({ description: 'Proration in first year' })
  @IsOptional()
  @IsBoolean()
  prorationFirstYear?: boolean;

  @ApiPropertyOptional({ description: 'Proration in disposal year' })
  @IsOptional()
  @IsBoolean()
  prorationDisposalYear?: boolean;

  @ApiPropertyOptional({ description: 'Mid-month convention' })
  @IsOptional()
  @IsBoolean()
  midMonthConvention?: boolean;

  // Lifecycle Settings
  @ApiPropertyOptional({ description: 'Require asset approval' })
  @IsOptional()
  @IsBoolean()
  requireAssetApproval?: boolean;

  @ApiPropertyOptional({ description: 'Require disposal approval' })
  @IsOptional()
  @IsBoolean()
  requireDisposalApproval?: boolean;

  @ApiPropertyOptional({ description: 'Require transfer approval' })
  @IsOptional()
  @IsBoolean()
  requireTransferApproval?: boolean;

  @ApiPropertyOptional({ description: 'Require maintenance approval' })
  @IsOptional()
  @IsBoolean()
  requireMaintenanceApproval?: boolean;

  @ApiPropertyOptional({ description: 'Auto generate asset code' })
  @IsOptional()
  @IsBoolean()
  autoGenerateCode?: boolean;

  @ApiPropertyOptional({ description: 'Asset code prefix' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codePrefix?: string;

  @ApiPropertyOptional({ description: 'Asset code padding' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  codePadding?: number;

  // Valuation Settings
  @ApiPropertyOptional({ description: 'Allow revaluation' })
  @IsOptional()
  @IsBoolean()
  allowRevaluation?: boolean;

  @ApiPropertyOptional({ description: 'Require revaluation approval' })
  @IsOptional()
  @IsBoolean()
  requireRevaluationApproval?: boolean;

  @ApiPropertyOptional({ description: 'Track impairment' })
  @IsOptional()
  @IsBoolean()
  trackImpairment?: boolean;

  @ApiPropertyOptional({ description: 'Calculate fair value' })
  @IsOptional()
  @IsBoolean()
  calculateFairValue?: boolean;

  // Maintenance Settings
  @ApiPropertyOptional({ description: 'Track maintenance costs' })
  @IsOptional()
  @IsBoolean()
  trackMaintenanceCosts?: boolean;

  @ApiPropertyOptional({ description: 'Maintenance reminder days' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  maintenanceReminderDays?: number;

  @ApiPropertyOptional({ description: 'Allow maintenance scheduling' })
  @IsOptional()
  @IsBoolean()
  allowMaintenanceScheduling?: boolean;

  @ApiPropertyOptional({ description: 'Capitalization threshold' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capitalizationThreshold?: number;

  // Transfer Settings
  @ApiPropertyOptional({ description: 'Allow inter-company transfer' })
  @IsOptional()
  @IsBoolean()
  allowInterCompanyTransfer?: boolean;

  @ApiPropertyOptional({ description: 'Allow inter-branch transfer' })
  @IsOptional()
  @IsBoolean()
  allowInterBranchTransfer?: boolean;

  @ApiPropertyOptional({ description: 'Require physical verification' })
  @IsOptional()
  @IsBoolean()
  requirePhysicalVerification?: boolean;

  // Notification Settings
  @ApiPropertyOptional({ description: 'Notify on depreciation' })
  @IsOptional()
  @IsBoolean()
  notifyOnDepreciation?: boolean;

  @ApiPropertyOptional({ description: 'Notify on maintenance due' })
  @IsOptional()
  @IsBoolean()
  notifyOnMaintenanceDue?: boolean;

  @ApiPropertyOptional({ description: 'Notify on warranty expiry' })
  @IsOptional()
  @IsBoolean()
  notifyOnWarrantyExpiry?: boolean;

  @ApiPropertyOptional({ description: 'Notify on disposal' })
  @IsOptional()
  @IsBoolean()
  notifyOnDisposal?: boolean;

  @ApiPropertyOptional({ description: 'Warranty expiry reminder days' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  warrantyExpiryReminderDays?: number;

  // Barcode & Tracking
  @ApiPropertyOptional({ description: 'Enable barcode' })
  @IsOptional()
  @IsBoolean()
  enableBarcode?: boolean;

  @ApiPropertyOptional({ description: 'Enable QR code' })
  @IsOptional()
  @IsBoolean()
  enableQrCode?: boolean;

  @ApiPropertyOptional({ description: 'Barcode format' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcodeFormat?: string;
}
