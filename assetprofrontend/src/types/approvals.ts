// ============================================================================
// APPROVAL SYSTEM TYPES
// Based on RingleSoft Laravel Process Approval pattern
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export type ApprovalStatus = 'draft' | 'submitted' | 'pending' | 'approved' | 'rejected' | 'returned' | 'completed';

export type ApproverType = 'employee' | 'role' | 'department_head' | 'any_of_role';

export type ApprovalActionType = 'APPROVE' | 'VERIFY' | 'CHECK';

export type ApprovalMode = 'any' | 'all'; // any = first approver, all = all must approve

// ============================================================================
// APPROVAL FLOW CONFIGURATION
// ============================================================================

export interface ApprovalFlowCondition {
  id: number;
  flowId: number;
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains';
  value: string | number | string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalFlowStep {
  id: number;
  flowId: number;
  stepNumber: number;
  name: string;
  description?: string;
  approverType: ApproverType;
  approverIds: number[]; // employee IDs or role IDs depending on approverType
  approverNames?: string[]; // resolved approver names for display
  approvalMode: ApprovalMode;
  action: ApprovalActionType;
  isRequired: boolean;
  conditions?: Record<string, unknown>;
  timeoutHours?: number;
  escalationUserId?: number;
  isActive: boolean;
  role?: { id: number; name: string; description?: string }; // populated for role-based steps
  // Branch scope
  branchScope?: string; // 'all' | 'specific'
  branchId?: number;
  branchName?: string;
  // Protected flags
  isLocked?: boolean;
  isFinalStep?: boolean;
  stepType?: string; // 'approve' | 'accountant' | 'payment'
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalFlow {
  id: number;
  companyId: number;
  name: string;
  description?: string;
  entityType: string; // e.g., 'Payment', 'PurchaseOrder', 'ExpenseRequest'
  entitySlug: string; // e.g., 'payables.payments', 'purchase.orders'
  isActive: boolean;
  isDefault: boolean;
  priority: number; // lower = higher priority when multiple flows match
  autoSubmit: boolean;
  parallelApproval: boolean;
  notificationSettings?: Record<string, unknown>;
  stepCount?: number; // returned by list query as a COUNT subquery
  steps: ApprovalFlowStep[];
  conditions: ApprovalFlowCondition[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalFlowDto {
  name: string;
  description?: string;
  entityType: string;
  entitySlug: string;
  isActive?: boolean;
  isDefault?: boolean;
  priority?: number;
  autoSubmit?: boolean;
  parallelApproval?: boolean;
  conditions?: Record<string, unknown>;
  notificationSettings?: Record<string, unknown>;
}

export interface UpdateApprovalFlowDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  priority?: number;
  autoSubmit?: boolean;
  parallelApproval?: boolean;
  conditions?: Record<string, unknown>;
  notificationSettings?: Record<string, unknown>;
}

export interface CreateApprovalFlowStepDto {
  stepNumber: number;
  name: string;
  description?: string;
  approverType: ApproverType;
  approverIds: number[];
  approvalMode?: ApprovalMode;
  action?: ApprovalActionType;
  isRequired?: boolean;
  timeoutHours?: number;
  escalationUserId?: number;
  isActive?: boolean;
  branchScope?: string;
  branchId?: number;
  isLocked?: boolean;
  isFinalStep?: boolean;
}

export interface UpdateApprovalFlowStepDto {
  stepNumber?: number;
  name?: string;
  description?: string;
  approverType?: ApproverType;
  approverIds?: number[];
  approvalMode?: ApprovalMode;
  action?: ApprovalActionType;
  isRequired?: boolean;
  timeoutHours?: number;
  escalationUserId?: number;
  isActive?: boolean;
  branchScope?: string;
  branchId?: number;
}

export interface CreateApprovalFlowConditionDto {
  field: string;
  operator: ApprovalFlowCondition['operator'];
  value: string | number | string[];
}

// ============================================================================
// APPROVAL STATUS (Per Entity Instance)
// ============================================================================

export interface ApprovalAction {
  id: number;
  statusId: number;
  userId: number;
  userName: string;
  action: 'submit' | 'approve' | 'reject' | 'return' | 'escalate';
  comment?: string;
  signaturePath?: string | null;
  stepName?: string;
  stepNumber: number;
  createdAt: string;
}

export interface ApprovalStatusRecord {
  id: number;
  companyId: number;
  flowId: number;
  flow?: ApprovalFlow;
  entityType: string;
  entityId: number;
  status: ApprovalStatus;
  currentStepNumber: number;
  currentStep?: ApprovalFlowStep;
  submittedById: number;
  submittedByName: string;
  submittedAt?: string;
  completedAt?: string;
  actions: ApprovalAction[];
  canCurrentUserApprove?: boolean;
  /** Steps JSON from process_approval_statuses — has APPROVED/OVERRIDDEN/PENDING/WAITING status per step */
  steps?: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PENDING APPROVAL (For Dashboard/List)
// ============================================================================

export interface PendingApproval {
  id: number;
  statusId: number;
  entityType: string;
  entitySlug: string;
  entityId: number;
  entityReference: string; // e.g., "PAY-2024-001", "PO-2024-123"
  entityDescription: string;
  entityAmount?: number;
  currency?: string;
  submittedById: number;
  submittedByName: string;
  submittedAt: string;
  currentStepNumber: number;
  currentStepName: string;
  flowName: string;
  daysWaiting: number;
  isUrgent: boolean;
  // For quick preview
  supplierName?: string;
  customerName?: string;
  department?: string;
}

// ============================================================================
// APPROVABLE ENTITY TYPE (For Auto-Discovery)
// ============================================================================

export interface ApprovableEntityType {
  entityType: string; // e.g., 'Payment'
  entitySlug: string; // e.g., 'payables.payments'
  moduleName: string; // e.g., 'Payables'
  displayName: string; // e.g., 'Supplier Payment'
  pluralName: string; // e.g., 'Supplier Payments'
  hasActiveFlow: boolean;
  flowCount: number;
}

// ============================================================================
// API QUERY TYPES
// ============================================================================

export interface ApprovalFlowListQuery {
  page?: number;
  limit?: number;
  search?: string;
  entityType?: string;
  isActive?: boolean;
}

export interface PendingApprovalListQuery {
  page?: number;
  limit?: number;
  entityType?: string;
  search?: string;
  sortBy?: 'submittedAt' | 'entityAmount' | 'daysWaiting';
  sortOrder?: 'asc' | 'desc';
  /**
   * 'mine' (default) — only items the current user can approve.
   * 'all' — every pending approval in the company. Useful for admins / managers
   * monitoring the queue.
   */
  scope?: 'mine' | 'all';
}

export interface ApprovalHistoryQuery {
  page?: number;
  limit?: number;
  entityType?: string;
  status?: ApprovalStatus;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// ACTION PAYLOADS
// ============================================================================

export interface SubmitForApprovalDto {
  entityType: string;
  entityId: number;
}

export interface ApprovalActionDto {
  action: 'approve' | 'reject' | 'return';
  comment?: string;
  signaturePath?: string;
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface ApprovalStatsByFlow {
  approvableType: string;
  flowName: string;
  entitySlug: string | null;
  count: number;
}

export interface ApprovalStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  avgApprovalTimeHours: number;
  urgentCount: number;
  overdueCount: number;
  byFlow?: ApprovalStatsByFlow[];
}

export interface ApprovalFlowStats {
  totalFlows: number;
  activeFlows: number;
  entityTypes: number;
  avgStepsPerFlow: number;
}
