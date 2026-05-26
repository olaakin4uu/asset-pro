import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// APPROVAL STATUS ENUM
// ============================================================================

export enum ApprovalStatus {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  WAITING = 'WAITING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

// ============================================================================
// CREATE PROCESS APPROVAL DTO
// ============================================================================

export class CreateProcessApprovalDto {
  @ApiProperty({ example: 'purchase_requisitions', description: 'Entity type being approved' })
  @IsString()
  @MaxLength(100)
  approvableType: string;

  @ApiProperty({ example: 123, description: 'Entity ID being approved' })
  @IsInt()
  @Type(() => Number)
  approvableId: number;

  @ApiPropertyOptional({ example: 5, description: 'Process approval flow step ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  processApprovalFlowStepId?: number;

  @ApiPropertyOptional({ example: 'Approved', description: 'Approval action taken' })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  approvalAction?: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Name of approver' })
  @IsOptional()
  @IsString()
  approverName?: string;

  @ApiPropertyOptional({ example: 'Looks good to me', description: 'Approval comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ example: '/signatures/sig123.png', description: 'Path to signature file' })
  @IsOptional()
  @IsString()
  signaturePath?: string;

  @ApiProperty({ example: 10, description: 'User ID of approver' })
  @IsInt()
  @Type(() => Number)
  userId: number;

  @ApiPropertyOptional({ example: 25, description: 'Employee ID of approver' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  employeeId?: number;

  @ApiProperty({ example: 1, description: 'Company ID' })
  @IsInt()
  @Type(() => Number)
  companyId: number;
}

// ============================================================================
// INITIATE APPROVAL DTO
// ============================================================================

export class InitiateApprovalDto {
  @ApiProperty({ example: 'purchase_requisitions', description: 'Entity type to approve' })
  @IsString()
  @MaxLength(100)
  processType: string;

  @ApiProperty({ example: 123, description: 'Entity ID to approve' })
  @IsInt()
  @Type(() => Number)
  recordId: number;

  @ApiProperty({ example: 1, description: 'Company ID' })
  @IsInt()
  @Type(() => Number)
  companyId: number;

  @ApiPropertyOptional({ example: 'Initial submission for approval', description: 'Initial comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}

// ============================================================================
// APPROVAL ACTION DTO
// ============================================================================

export class ApprovalActionDto {
  @ApiPropertyOptional({ example: 'Approved - Budget verified', description: 'Comment for this approval' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ example: '/signatures/sig123.png', description: 'Path to signature file' })
  @IsOptional()
  @IsString()
  signaturePath?: string;
}

// ============================================================================
// REJECT APPROVAL DTO
// ============================================================================

export class RejectApprovalDto extends ApprovalActionDto {
  @ApiProperty({ example: 'Budget exceeded', description: 'Reason for rejection' })
  @IsString()
  @MaxLength(500)
  reason: string;
}

// ============================================================================
// PROCESS APPROVAL RESPONSE DTO
// ============================================================================

export class ProcessApprovalResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  approvableType: string;

  @ApiProperty()
  approvableId: number;

  @ApiPropertyOptional()
  processApprovalFlowStepId?: number;

  @ApiProperty()
  approvalAction: string;

  @ApiPropertyOptional()
  approverName?: string;

  @ApiPropertyOptional()
  comment?: string;

  @ApiPropertyOptional()
  signaturePath?: string;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiProperty()
  userId: number;

  @ApiPropertyOptional()
  employeeId?: number;

  @ApiPropertyOptional()
  companyId?: number;

  @ApiPropertyOptional()
  tenantId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'User details' })
  user?: {
    id: number;
    name: string;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Employee details' })
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };

  @ApiPropertyOptional({ description: 'Flow step details' })
  processApprovalFlowStep?: {
    id: number;
    name?: string;
    stepOrder: number;
    action: string;
  };
}

// ============================================================================
// PROCESS APPROVAL QUERY DTO
// ============================================================================

export class ProcessApprovalQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 'purchase_requisitions', description: 'Filter by approvable type' })
  @IsOptional()
  @IsString()
  approvableType?: string;

  @ApiPropertyOptional({ example: 123, description: 'Filter by approvable ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  approvableId?: number;

  @ApiPropertyOptional({ example: 10, description: 'Filter by user ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  userId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by company ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  companyId?: number;
}

// ============================================================================
// PROCESS APPROVAL LIST RESPONSE DTO
// ============================================================================

export class ProcessApprovalListResponseDto {
  @ApiProperty({ type: [ProcessApprovalResponseDto] })
  data: ProcessApprovalResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

// ============================================================================
// PROCESS APPROVAL STATUS RESPONSE DTO
// ============================================================================

export class ProcessApprovalStatusResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  approvableType: string;

  @ApiProperty()
  approvableId: number;

  @ApiPropertyOptional({ description: 'Step details (JSON)' })
  steps?: Record<string, any>;

  @ApiProperty({ enum: ApprovalStatus })
  status: ApprovalStatus;

  @ApiPropertyOptional()
  creatorId?: number;

  @ApiPropertyOptional()
  companyId?: number;

  @ApiPropertyOptional()
  tenantId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [ProcessApprovalResponseDto], description: 'All approvals for this record' })
  approvals?: ProcessApprovalResponseDto[];

  @ApiPropertyOptional({ description: 'Current pending step' })
  currentStep?: {
    stepOrder: number;
    stepNumber?: number;
    name?: string;
    action: string;
    approvers: string[];
    approverType?: string;
    approverEmployeeIds?: number[];
    stepType?: string;
  };

  @ApiPropertyOptional({ description: 'Whether the current user can approve the pending step' })
  canCurrentUserApprove?: boolean;

  @ApiPropertyOptional({ description: 'Overall progress' })
  progress?: {
    completed: number;
    total: number;
    percentage: number;
  };
}

// ============================================================================
// PENDING APPROVALS RESPONSE DTO
// ============================================================================

export class PendingApprovalItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  approvableType: string;

  @ApiProperty()
  approvableId: number;

  @ApiProperty({ enum: ApprovalStatus })
  status: ApprovalStatus;

  @ApiProperty({ description: 'Current step details' })
  currentStep: {
    id: number;
    stepOrder: number;
    name?: string;
    action: string;
    stepType?: string;
  };

  @ApiPropertyOptional({ description: 'Entity details (if available)' })
  entityDetails?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Days pending' })
  daysPending?: number;

  @ApiPropertyOptional({ description: 'Is overdue' })
  isOverdue?: boolean;
}

export class PendingApprovalsResponseDto {
  @ApiProperty({ type: [PendingApprovalItemDto] })
  data: PendingApprovalItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

// ============================================================================
// OVERRIDE APPROVAL DTO
// ============================================================================

export enum OverrideCategory {
  EMERGENCY = 'emergency',
  APPROVER_ABSENT = 'approver_absent',
  TIME_SENSITIVE = 'time_sensitive',
  DELEGATED_AUTHORITY = 'delegated_authority',
  MANAGEMENT_DECISION = 'management_decision',
}

export class OverrideApprovalDto {
  @ApiPropertyOptional({
    enum: OverrideCategory,
    example: OverrideCategory.EMERGENCY,
    description: 'Reason category for the override (optional)',
  })
  @IsOptional()
  @IsEnum(OverrideCategory)
  category?: OverrideCategory;

  @ApiPropertyOptional({
    example: 'Approver is unavailable and delivery is time-sensitive.',
    description: 'Override justification note',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({
    example: 'Approver is unavailable and delivery is time-sensitive.',
    description: 'Override reason (alias for note)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
