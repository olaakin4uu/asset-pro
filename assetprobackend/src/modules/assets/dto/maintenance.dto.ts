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
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssetCondition } from './asset.dto';

// ============================================================================
// ENUMS
// ============================================================================

export enum MaintenanceType {
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
  PREDICTIVE = 'predictive',
  CONDITION_BASED = 'condition_based',
  EMERGENCY = 'emergency',
  ROUTINE = 'routine',
}

export enum MaintenancePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BI_WEEKLY = 'bi_weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUALLY = 'semi_annually',
  ANNUALLY = 'annually',
}

// ============================================================================
// CREATE DTO
// ============================================================================

export class CreateAssetMaintenanceDto {
  @ApiProperty({ description: 'Asset ID' })
  @IsInt()
  @Type(() => Number)
  assetId: number;

  @ApiProperty({ description: 'Maintenance title' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: MaintenanceType, description: 'Maintenance type' })
  @IsEnum(MaintenanceType)
  maintenanceType: MaintenanceType;

  @ApiPropertyOptional({ enum: MaintenancePriority, description: 'Priority level' })
  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @ApiPropertyOptional({ description: 'Scheduled date' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in hours' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDurationHours?: number;

  @ApiPropertyOptional({ description: 'Is recurring maintenance' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ enum: RecurrenceFrequency, description: 'Recurrence frequency' })
  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  recurrenceFrequency?: RecurrenceFrequency;

  @ApiPropertyOptional({ description: 'Recurrence interval' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  recurrenceInterval?: number;

  @ApiPropertyOptional({ description: 'Vendor name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  vendorName?: string;

  @ApiPropertyOptional({ description: 'Vendor contact' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendorContact?: string;

  @ApiPropertyOptional({ description: 'Technician name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  technicianName?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assignedToUserId?: number;

  @ApiPropertyOptional({ description: 'Estimated cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// UPDATE DTO
// ============================================================================

export class UpdateAssetMaintenanceDto {
  @ApiPropertyOptional({ description: 'Maintenance title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: MaintenanceType, description: 'Maintenance type' })
  @IsOptional()
  @IsEnum(MaintenanceType)
  maintenanceType?: MaintenanceType;

  @ApiPropertyOptional({ enum: MaintenancePriority, description: 'Priority level' })
  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @ApiPropertyOptional({ description: 'Scheduled date' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in hours' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDurationHours?: number;

  @ApiPropertyOptional({ description: 'Actual duration in hours' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualDurationHours?: number;

  @ApiPropertyOptional({ description: 'Is recurring maintenance' })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ enum: RecurrenceFrequency, description: 'Recurrence frequency' })
  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  recurrenceFrequency?: RecurrenceFrequency;

  @ApiPropertyOptional({ description: 'Recurrence interval' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  recurrenceInterval?: number;

  @ApiPropertyOptional({ description: 'Vendor name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  vendorName?: string;

  @ApiPropertyOptional({ description: 'Vendor contact' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendorContact?: string;

  @ApiPropertyOptional({ description: 'Technician name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  technicianName?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assignedToUserId?: number;

  @ApiPropertyOptional({ description: 'Estimated cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional({ description: 'Actual cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualCost?: number;

  @ApiPropertyOptional({ description: 'Labor cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  laborCost?: number;

  @ApiPropertyOptional({ description: 'Parts cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  partsCost?: number;

  @ApiPropertyOptional({ description: 'Cost breakdown' })
  @IsOptional()
  @IsString()
  costBreakdown?: string;

  @ApiPropertyOptional({ description: 'Parts used' })
  @IsOptional()
  @IsString()
  partsUsed?: string;

  @ApiPropertyOptional({ description: 'Materials used' })
  @IsOptional()
  @IsString()
  materialsUsed?: string;

  @ApiPropertyOptional({ enum: AssetCondition, description: 'Condition before maintenance' })
  @IsOptional()
  @IsEnum(AssetCondition)
  conditionBefore?: AssetCondition;

  @ApiPropertyOptional({ enum: AssetCondition, description: 'Condition after maintenance' })
  @IsOptional()
  @IsEnum(AssetCondition)
  conditionAfter?: AssetCondition;

  @ApiPropertyOptional({ description: 'Meter reading before' })
  @IsOptional()
  @IsNumber()
  meterReadingBefore?: number;

  @ApiPropertyOptional({ description: 'Meter reading after' })
  @IsOptional()
  @IsNumber()
  meterReadingAfter?: number;

  @ApiPropertyOptional({ description: 'Meter unit' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  meterUnit?: string;

  @ApiPropertyOptional({ description: 'Work performed' })
  @IsOptional()
  @IsString()
  workPerformed?: string;

  @ApiPropertyOptional({ description: 'Findings' })
  @IsOptional()
  @IsString()
  findings?: string;

  @ApiPropertyOptional({ description: 'Recommendations' })
  @IsOptional()
  @IsString()
  recommendations?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Requires follow up' })
  @IsOptional()
  @IsBoolean()
  requiresFollowUp?: boolean;

  @ApiPropertyOptional({ description: 'Follow up notes' })
  @IsOptional()
  @IsString()
  followUpNotes?: string;
}

// ============================================================================
// QUERY DTO
// ============================================================================

export class AssetMaintenanceQueryDto {
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

  @ApiPropertyOptional({ enum: MaintenanceType, description: 'Filter by maintenance type' })
  @IsOptional()
  @IsEnum(MaintenanceType)
  maintenanceType?: MaintenanceType;

  @ApiPropertyOptional({ enum: MaintenancePriority, description: 'Filter by priority' })
  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;

  @ApiPropertyOptional({ enum: MaintenanceStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiPropertyOptional({ description: 'Filter by recurring status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRecurring?: boolean;

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

export class HoldMaintenanceDto {
  @ApiPropertyOptional({ description: 'Hold reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpcomingMaintenanceQueryDto {
  @ApiPropertyOptional({ description: 'Number of days to look ahead' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  days?: number;
}
