import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  IsEnum,
  IsObject,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================================
// APPROVAL ACTION ENUM
// ============================================================================

export enum ApprovalAction {
  APPROVE = 'APPROVE',
  VERIFY = 'VERIFY',
  CHECK = 'CHECK',
}

// ============================================================================
// CREATE PROCESS APPROVAL FLOW DTO
// ============================================================================

export class CreateProcessApprovalFlowDto {
  @ApiProperty({ example: 'Purchase Requisition Approval', description: 'Approval flow name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'purchase_requisitions', description: 'Entity type this flow applies to (backend name)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  approvableType?: string;

  @ApiPropertyOptional({ example: 'Payment', description: 'Entity type (frontend alias for approvableType)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entityType?: string;

  @ApiPropertyOptional({ example: 'payables.payments', description: 'Entity slug identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  entitySlug?: string;

  @ApiPropertyOptional({ example: 'Multi-level approval for purchase requisitions', description: 'Flow description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: { minAmount: 10000 }, description: 'Conditions for triggering this flow (JSON)' })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ example: { notifyOnApprove: true }, description: 'Notification settings (JSON)' })
  @IsOptional()
  @IsObject()
  notificationSettings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is flow active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is the default flow for this entity type', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Priority (lower = higher priority)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ description: 'Auto-submit for approval', default: false })
  @IsOptional()
  @IsBoolean()
  autoSubmit?: boolean;

  @ApiPropertyOptional({ description: 'Allow parallel approval of steps', default: false })
  @IsOptional()
  @IsBoolean()
  parallelApproval?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Company ID (auto-set from user context if omitted)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  companyId?: number;
}

// ============================================================================
// UPDATE PROCESS APPROVAL FLOW DTO
// ============================================================================

export class UpdateProcessApprovalFlowDto extends PartialType(CreateProcessApprovalFlowDto) {}

// ============================================================================
// PROCESS APPROVAL FLOW RESPONSE DTO
// ============================================================================

export class ProcessApprovalFlowResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  approvableType: string;

  @ApiPropertyOptional({ description: 'Frontend alias for approvableType' })
  entityType?: string;

  @ApiPropertyOptional()
  entitySlug?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional()
  notificationSettings?: Record<string, any>;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  isDefault?: boolean;

  @ApiPropertyOptional()
  priority?: number;

  @ApiProperty()
  autoSubmit: boolean;

  @ApiProperty()
  parallelApproval: boolean;

  @ApiPropertyOptional()
  companyId?: number;

  @ApiPropertyOptional()
  createdById?: number;

  @ApiPropertyOptional()
  stepCount?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [Object], description: 'Approval flow steps' })
  steps?: ProcessApprovalFlowStepResponseDto[];
}

// ============================================================================
// PROCESS APPROVAL FLOW QUERY DTO
// ============================================================================

export class ProcessApprovalFlowQueryDto {
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

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'purchase_requisitions', description: 'Filter by approvable type' })
  @IsOptional()
  @IsString()
  approvableType?: string;

  @ApiPropertyOptional({ example: 'Payment', description: 'Filter by entity type (frontend alias)' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Filter by company ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Type(() => Number)
  companyId?: number;

  @ApiPropertyOptional({ description: 'Include deleted flows' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDeleted?: boolean;
}

// ============================================================================
// PROCESS APPROVAL FLOW LIST RESPONSE DTO
// ============================================================================

export class ProcessApprovalFlowListResponseDto {
  @ApiProperty({ type: [ProcessApprovalFlowResponseDto] })
  data: ProcessApprovalFlowResponseDto[];

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
// CREATE PROCESS APPROVAL FLOW STEP DTO
// ============================================================================

export class CreateProcessApprovalFlowStepDto {
  @ApiPropertyOptional({ example: 1, description: 'Process approval flow ID (auto-set from URL param)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  processApprovalFlowId?: number;

  @ApiPropertyOptional({ example: 'Manager Approval', description: 'Step name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Step description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 3, description: 'Role ID for approvers' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  roleId?: number;

  @ApiPropertyOptional({ example: 'role', description: 'Approver type: user, role, department_head, any_of_role' })
  @IsOptional()
  @IsString()
  approverType?: string;

  @ApiPropertyOptional({ example: [3, 5], description: 'Approver IDs (user or role IDs depending on approverType)' })
  @IsOptional()
  @IsArray()
  approverIds?: number[];

  @ApiPropertyOptional({ example: 'any', description: 'Approval mode: any (first approver) or all (all must approve)' })
  @IsOptional()
  @IsString()
  approvalMode?: string;

  @ApiPropertyOptional({ example: ['approve', 'edit'], description: 'Permissions for this step (JSON)' })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, any>;

  @ApiPropertyOptional({ example: [10, 15], description: 'Specific employee IDs who can approve (JSON)' })
  @IsOptional()
  @IsObject()
  employees?: Record<string, any>;

  @ApiPropertyOptional({ example: [20], description: 'Escalation employee IDs (JSON)' })
  @IsOptional()
  @IsObject()
  escalationEmployees?: Record<string, any>;

  @ApiPropertyOptional({ example: 1, description: 'Step order in the flow' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: 1, description: 'Alternative step order field' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  stepOrder?: number;

  @ApiPropertyOptional({ example: 1, description: 'Step number (frontend alias for stepOrder)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  stepNumber?: number;

  @ApiPropertyOptional({ enum: ApprovalAction, default: ApprovalAction.APPROVE, description: 'Action type' })
  @IsOptional()
  @IsEnum(ApprovalAction)
  action?: ApprovalAction;

  @ApiPropertyOptional({ example: { minAmount: 5000 }, description: 'Conditions for this step (JSON)' })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is step required', default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: 48, description: 'Timeout in hours for this step' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  timeoutHours?: number;

  @ApiPropertyOptional({ example: 5, description: 'Escalation role ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  escalationRoleId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Escalation user ID (frontend alias)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  escalationUserId?: number;

  @ApiPropertyOptional({ description: 'Is step active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Override authority
  @ApiPropertyOptional({ description: 'Allow override of the entire remaining flow from this step', default: false })
  @IsOptional()
  @IsBoolean()
  overrideAllowed?: boolean;

  @ApiPropertyOptional({ example: 'role', description: 'Override approver type: role | employee | department_head' })
  @IsOptional()
  @IsString()
  overrideApproverType?: string;

  @ApiPropertyOptional({ example: [3, 5], description: 'Override approver IDs (role IDs or user IDs)' })
  @IsOptional()
  @IsArray()
  overrideApproverIds?: number[];

  @ApiPropertyOptional({ example: 30, description: 'Minimum note length required for override justification', default: 30 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(10)
  overrideNoteMinLength?: number;

  @ApiPropertyOptional({ description: 'Notify skipped approvers when override is used', default: true })
  @IsOptional()
  @IsBoolean()
  overrideNotifySkipped?: boolean;

  // Branch scope
  @ApiPropertyOptional({ example: 'all', description: 'Branch scope: "all" or "specific"', default: 'all' })
  @IsOptional()
  @IsString()
  branchScope?: string;

  @ApiPropertyOptional({ example: 2, description: 'Branch ID when branchScope is "specific"' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  branchId?: number;

  // Protected step flags (set at creation / seeding, not exposed in UI)
  @ApiPropertyOptional({ description: 'Lock step — only approverType/mode/branchScope are editable', default: false })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({ description: 'This step must always remain the last step in the flow', default: false })
  @IsOptional()
  @IsBoolean()
  isFinalStep?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Company ID (auto-set from user context if omitted)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  companyId?: number;
}

// ============================================================================
// UPDATE PROCESS APPROVAL FLOW STEP DTO
// ============================================================================

export class UpdateProcessApprovalFlowStepDto extends PartialType(CreateProcessApprovalFlowStepDto) {
  @ApiPropertyOptional({ example: 1, description: 'Process approval flow ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  processApprovalFlowId?: number;

  @ApiPropertyOptional({ example: 3, description: 'Role ID for approvers' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  roleId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Company ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  companyId?: number;
}

// ============================================================================
// PROCESS APPROVAL FLOW STEP RESPONSE DTO
// ============================================================================

export class ProcessApprovalFlowStepResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  processApprovalFlowId: number;

  @ApiPropertyOptional({ description: 'Frontend alias for processApprovalFlowId' })
  flowId?: number;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  roleId: number;

  @ApiPropertyOptional({ description: 'Approver type: user, role, department_head, any_of_role' })
  approverType?: string;

  @ApiPropertyOptional({ description: 'Approver IDs' })
  approverIds?: number[];

  @ApiPropertyOptional({ description: 'Approval mode: any or all' })
  approvalMode?: string;

  @ApiPropertyOptional()
  permissions?: Record<string, any>;

  @ApiPropertyOptional()
  employees?: Record<string, any>;

  @ApiPropertyOptional()
  escalationEmployees?: Record<string, any>;

  @ApiPropertyOptional()
  order?: number;

  @ApiProperty()
  stepOrder: number;

  @ApiPropertyOptional({ description: 'Frontend alias for stepOrder' })
  stepNumber?: number;

  @ApiProperty({ enum: ApprovalAction })
  action: ApprovalAction;

  @ApiPropertyOptional()
  conditions?: Record<string, any>;

  @ApiProperty()
  isRequired: boolean;

  @ApiPropertyOptional()
  timeoutHours?: number;

  @ApiPropertyOptional()
  escalationRoleId?: number;

  @ApiPropertyOptional()
  escalationUserId?: number;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  companyId?: number;

  @ApiPropertyOptional()
  tenantId?: string;

  // Override authority
  @ApiProperty({ default: false })
  overrideAllowed: boolean;

  @ApiPropertyOptional()
  overrideApproverType?: string;

  @ApiPropertyOptional()
  overrideApproverIds?: number[];

  @ApiProperty({ default: 30 })
  overrideNoteMinLength: number;

  @ApiProperty({ default: true })
  overrideNotifySkipped: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Role details' })
  role?: {
    id: number;
    name: string;
    description?: string;
  };

  @ApiPropertyOptional({ description: 'Override authority role/user details' })
  overrideRole?: {
    id: number;
    name: string;
  };

  // Branch scope
  @ApiPropertyOptional({ description: 'Branch scope: "all" or "specific"' })
  branchScope?: string;

  @ApiPropertyOptional({ description: 'Branch ID when branchScope is "specific"' })
  branchId?: number;

  @ApiPropertyOptional({ description: 'Branch name (populated from join)' })
  branchName?: string;

  // Protected step flags
  @ApiProperty({ default: false })
  isLocked: boolean;

  @ApiProperty({ default: false })
  isFinalStep: boolean;

  @ApiProperty({ default: 'approve', description: 'Step type: approve, accountant, or payment' })
  stepType?: string;
}

// ============================================================================
// APPROVAL FLOW STATS RESPONSE DTO
// ============================================================================

export class ApprovalFlowStatsResponseDto {
  @ApiProperty()
  totalFlows: number;

  @ApiProperty()
  activeFlows: number;

  @ApiProperty()
  entityTypes: number;

  @ApiProperty()
  avgStepsPerFlow: number;
}

// ============================================================================
// REORDER STEPS DTO
// ============================================================================

export class ReorderStepsDto {
  @ApiProperty({ example: [{ id: 1, stepOrder: 0 }, { id: 2, stepOrder: 1 }], description: 'Step IDs with new order' })
  @IsArray()
  steps: { id: number; stepOrder: number }[];
}
