import { isAxiosError } from 'axios';
import { api } from '../api';
import type { PaginatedResponse } from '@/types/core';
import type {
  ApprovalFlow,
  ApprovalFlowStep,
  ApprovalFlowCondition,
  CreateApprovalFlowDto,
  UpdateApprovalFlowDto,
  CreateApprovalFlowStepDto,
  UpdateApprovalFlowStepDto,
  CreateApprovalFlowConditionDto,
  ApprovalFlowListQuery,
  ApprovalStatusRecord,
  ApprovalStatus,
  ApprovalAction,
  PendingApproval,
  PendingApprovalListQuery,
  ApprovalHistoryQuery,
  SubmitForApprovalDto,
  ApprovalActionDto,
  ApprovalStats,
  ApprovalFlowStats,
  ApprovableEntityType,
} from '@/types/approvals';

// ============================================================================
// RESPONSE TRANSFORMERS
// Backend uses different field names and UPPERCASE statuses.
// These functions map backend responses → frontend types.
// ============================================================================

/**
 * Map backend status (UPPERCASE) to frontend status (lowercase)
 */
function mapStatus(backendStatus: string): ApprovalStatus {
  const statusMap: Record<string, ApprovalStatus> = {
    CREATED: 'draft',
    PENDING: 'pending',
    WAITING: 'submitted',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'draft',
  };
  return statusMap[backendStatus] || (backendStatus?.toLowerCase() as ApprovalStatus) || 'draft';
}

/**
 * Map backend ProcessApprovalStatusResponseDto → frontend ApprovalStatusRecord
 */
function mapStatusRecord(backend: Record<string, unknown>): ApprovalStatusRecord {
  const approvals = (backend.approvals as Record<string, unknown>[]) || [];
  const currentStep = backend.currentStep as Record<string, unknown> | undefined;

  // Map backend approvals → frontend actions
  const actions: ApprovalAction[] = approvals.map((a) => {
    const actionStr = (a.approvalAction as string) || 'Pending';
    let mappedAction: ApprovalAction['action'] = 'submit';
    if (actionStr === 'Approved') mappedAction = 'approve';
    else if (actionStr === 'Rejected') mappedAction = 'reject';
    else if (actionStr === 'Pending') mappedAction = 'submit';

    const user = a.user as Record<string, unknown> | undefined;
    const step = a.processApprovalFlowStep as Record<string, unknown> | undefined;

    return {
      id: a.id as number,
      statusId: backend.id as number,
      userId: a.userId as number,
      userName: (a.approverName as string) || (user?.name as string) || 'Unknown',
      action: mappedAction,
      comment: (a.comment as string) || undefined,
      signaturePath: (a.signaturePath as string) || null,
      stepName: (step?.name as string) || (step?.action as string) || undefined,
      stepNumber: (step?.stepOrder as number) || 0,
      createdAt: (a.approvedAt as string) || (a.createdAt as string) || '',
    };
  });

  return {
    id: backend.id as number,
    companyId: (backend.companyId as number) || 0,
    flowId: 0, // Not returned by backend
    entityType: (backend.approvableType as string) || '',
    entityId: (backend.approvableId as number) || 0,
    status: mapStatus((backend.status as string) || 'CREATED'),
    currentStepNumber: (currentStep?.stepOrder as number) || 0,
    currentStep: currentStep
      ? {
          id: 0,
          flowId: 0,
          stepNumber: (currentStep.stepOrder as number) || (currentStep.stepNumber as number) || 0,
          name: (currentStep.name as string) || '',
          approverType: ((currentStep.approverType as string) || 'role') as 'role' | 'employee' | 'any_of_role',
          approverIds: (currentStep.approverEmployeeIds as number[]) || [],
          approverNames: (currentStep.approvers as string[]) || [],
          approvalMode: 'any',
          action: ((currentStep.action as string) || 'APPROVE') as 'APPROVE' | 'VERIFY' | 'CHECK',
          isRequired: true,
          isActive: true,
          stepType: (currentStep.stepType as string) || 'approve',
          createdAt: '',
          updatedAt: '',
        }
      : undefined,
    submittedById: (backend.creatorId as number) || 0,
    submittedByName: '', // Not returned by backend
    submittedAt: backend.createdAt as string,
    completedAt: undefined,
    actions,
    canCurrentUserApprove: (backend.canCurrentUserApprove as boolean) ?? false,
    steps: backend.steps as Record<string, unknown>[] | undefined,
    createdAt: backend.createdAt as string,
    updatedAt: backend.updatedAt as string,
  };
}

/**
 * Map entityType to entitySlug for navigation
 */
const ENTITY_TYPE_TO_SLUG: Record<string, string> = {
  Payment: 'payables.payments',
  PurchaseOrder: 'purchase.orders',
  PurchaseRequisition: 'purchase.requisitions',
  ExpenseRequest: 'accounts.expense-requests',
  SalesOrder: 'sales.orders',
  SalesInvoice: 'sales.invoices',
  JournalEntry: 'accounts.journal-entries',
  BankTransfer: 'accounts.bank-transfers',
  InventoryTransfer: 'inventory.transfers',
  InventoryAdjustment: 'inventory.adjustments',
  LeaveRequest: 'hrpayroll.leave-requests',
  PayrollRun: 'hrpayroll.payroll-runs',
  // Snake_case variants (from backend approvableType)
  purchase_orders: 'purchase.orders',
  purchase_requisitions: 'purchase.requisitions',
  payments: 'payables.payments',
  expense_requests: 'accounts.expense-requests',
  sales_orders: 'sales.orders',
  sales_invoices: 'sales.invoices',
  journal_entries: 'accounts.journal-entries',
  bank_transfers: 'accounts.bank-transfers',
  inventory_transfers: 'inventory.transfers',
  inventory_adjustments: 'inventory.adjustments',
  leave_requests: 'hrpayroll.leave-requests',
  payroll_runs: 'hrpayroll.payroll-runs',
};

/**
 * Map backend PendingApprovalItemDto → frontend PendingApproval
 */
function mapPendingApproval(backend: Record<string, unknown>): PendingApproval {
  const currentStep = backend.currentStep as Record<string, unknown> | undefined;
  const entityType = (backend.approvableType as string) || '';
  const entitySlug = ENTITY_TYPE_TO_SLUG[entityType] || entityType.toLowerCase().replace(/_/g, '-');

  return {
    id: backend.id as number,
    statusId: backend.id as number,
    entityType,
    entitySlug,
    entityId: (backend.approvableId as number) || 0,
    entityReference: `${entityType}-${backend.approvableId}`,
    entityDescription: '',
    submittedById: 0,
    submittedByName: '',
    submittedAt: backend.createdAt as string,
    currentStepNumber: (currentStep?.stepOrder as number) || 0,
    currentStepName: (currentStep?.name as string) || '',
    flowName: '',
    daysWaiting: (backend.daysPending as number) || 0,
    isUrgent: (backend.isOverdue as boolean) || false,
  };
}

/**
 * Map backend flow response → frontend ApprovalFlow
 */
function mapFlow(backend: Record<string, unknown>): ApprovalFlow {
  const steps = (backend.steps as Record<string, unknown>[]) || [];

  return {
    id: backend.id as number,
    companyId: (backend.companyId as number) || 0,
    name: (backend.name as string) || '',
    description: backend.description as string | undefined,
    entityType: (backend.entityType as string) || (backend.approvableType as string) || '',
    entitySlug: (backend.entitySlug as string) || '',
    isActive: (backend.isActive as boolean) ?? true,
    isDefault: (backend.isDefault as boolean) ?? false,
    priority: (backend.priority as number) || 10,
    autoSubmit: (backend.autoSubmit as boolean) ?? false,
    parallelApproval: (backend.parallelApproval as boolean) ?? false,
    notificationSettings: backend.notificationSettings as Record<string, unknown> | undefined,
    stepCount: backend.stepCount != null ? (backend.stepCount as number) : undefined,
    steps: steps.map(mapFlowStep),
    conditions: [],
    createdAt: backend.createdAt as string,
    updatedAt: backend.updatedAt as string,
  };
}

/**
 * Map backend flow step response → frontend ApprovalFlowStep
 */
function mapFlowStep(backend: Record<string, unknown>): ApprovalFlowStep {
  let approverIds: number[] = [];
  if (backend.approverIds) {
    const raw = backend.approverIds;
    if (typeof raw === 'string') {
      try { approverIds = JSON.parse(raw); } catch { approverIds = []; }
    } else if (Array.isArray(raw)) {
      approverIds = raw as number[];
    }
  }

  const roleRaw = backend.role as { id: number; name: string; description?: string } | undefined;

  return {
    id: backend.id as number,
    flowId: (backend.flowId as number) || (backend.processApprovalFlowId as number) || 0,
    stepNumber: (backend.stepNumber as number) || (backend.stepOrder as number) || 0,
    name: (backend.name as string) || '',
    description: backend.description as string | undefined,
    approverType: ((backend.approverType as string) || 'role') as ApprovalFlowStep['approverType'],
    approverIds,
    approvalMode: ((backend.approvalMode as string) || 'any') as ApprovalFlowStep['approvalMode'],
    action: ((backend.action as string) || 'APPROVE') as ApprovalFlowStep['action'],
    isRequired: (backend.isRequired as boolean) ?? true,
    conditions: backend.conditions as Record<string, unknown> | undefined,
    timeoutHours: backend.timeoutHours as number | undefined,
    escalationUserId: backend.escalationUserId as number | undefined,
    isActive: (backend.isActive as boolean) ?? true,
    role: roleRaw ?? undefined,
    branchScope: (backend.branchScope as string) || 'all',
    branchId: backend.branchId as number | undefined,
    branchName: backend.branchName as string | undefined,
    isLocked: (backend.isLocked as boolean) ?? false,
    isFinalStep: (backend.isFinalStep as boolean) ?? false,
    createdAt: backend.createdAt as string,
    updatedAt: backend.updatedAt as string,
  };
}

// ============================================================================
// APPROVAL FLOWS API
// ============================================================================

export const approvalFlowsApi = {
  /**
   * List all approval flows
   */
  list: async (query?: ApprovalFlowListQuery): Promise<PaginatedResponse<ApprovalFlow>> => {
    const response = await api.get('/core/approval-flows', { params: query });
    const data = response.data;
    return {
      ...data,
      data: (data.data || []).map(mapFlow),
    };
  },

  /**
   * Get a single approval flow by ID
   */
  get: async (id: number): Promise<ApprovalFlow> => {
    const response = await api.get(`/core/approval-flows/${id}`);
    return mapFlow(response.data);
  },

  /**
   * Create a new approval flow
   */
  create: async (data: CreateApprovalFlowDto): Promise<ApprovalFlow> => {
    // Map frontend field names to backend
    const payload = {
      name: data.name,
      description: data.description,
      approvableType: data.entityType,
      entityType: data.entityType,
      entitySlug: data.entitySlug,
      isActive: data.isActive,
      isDefault: data.isDefault,
      priority: data.priority,
      autoSubmit: data.autoSubmit,
      parallelApproval: data.parallelApproval,
      conditions: data.conditions,
      notificationSettings: data.notificationSettings,
    };
    const response = await api.post('/core/approval-flows', payload);
    return mapFlow(response.data);
  },

  /**
   * Update an approval flow
   */
  update: async (id: number, data: UpdateApprovalFlowDto): Promise<ApprovalFlow> => {
    const response = await api.patch(`/core/approval-flows/${id}`, data);
    return mapFlow(response.data);
  },

  /**
   * Delete an approval flow
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/core/approval-flows/${id}`);
  },

  /**
   * Duplicate an approval flow
   */
  duplicate: async (id: number, name: string): Promise<ApprovalFlow> => {
    const response = await api.post(`/core/approval-flows/${id}/duplicate`, { name });
    return mapFlow(response.data);
  },

  /**
   * Set a flow as default for its entity type
   */
  setDefault: async (id: number): Promise<ApprovalFlow> => {
    const response = await api.post(`/core/approval-flows/${id}/set-default`);
    return mapFlow(response.data);
  },

  /**
   * Get flow statistics
   */
  getStats: async (): Promise<ApprovalFlowStats> => {
    const response = await api.get('/core/approval-flows/stats');
    return response.data;
  },

  // -------------------------------------------------------------------------
  // STEPS
  // -------------------------------------------------------------------------

  /**
   * Add a step to a flow
   */
  addStep: async (flowId: number, data: CreateApprovalFlowStepDto): Promise<ApprovalFlowStep> => {
    // Map frontend field names to backend
    const payload = {
      name: data.name,
      description: data.description,
      approverType: data.approverType,
      approverIds: data.approverIds,
      approvalMode: data.approvalMode,
      action: data.action,
      isRequired: data.isRequired,
      stepOrder: data.stepNumber,
      stepNumber: data.stepNumber,
      timeoutHours: data.timeoutHours,
      escalationUserId: data.escalationUserId,
      isActive: data.isActive,
    };
    const response = await api.post(`/core/approval-flows/${flowId}/steps`, payload);
    return mapFlowStep(response.data);
  },

  /**
   * Update a step
   */
  updateStep: async (flowId: number, stepId: number, data: UpdateApprovalFlowStepDto): Promise<ApprovalFlowStep> => {
    const payload: Record<string, unknown> = { ...data };
    if (data.stepNumber !== undefined) {
      payload.stepOrder = data.stepNumber;
    }
    const response = await api.patch(`/core/approval-flows/${flowId}/steps/${stepId}`, payload);
    return mapFlowStep(response.data);
  },

  /**
   * Delete a step
   */
  deleteStep: async (flowId: number, stepId: number): Promise<void> => {
    await api.delete(`/core/approval-flows/${flowId}/steps/${stepId}`);
  },

  /**
   * Reorder steps - maps frontend stepIds array to backend {id, stepOrder} format
   */
  reorderSteps: async (flowId: number, stepIds: number[]): Promise<ApprovalFlowStep[]> => {
    // Backend expects: { steps: [{id, stepOrder}] }
    const steps = stepIds.map((id, index) => ({ id, stepOrder: index }));
    const response = await api.post(`/core/approval-flows/${flowId}/steps/reorder`, { steps });
    return (response.data || []).map(mapFlowStep);
  },

  // -------------------------------------------------------------------------
  // CONDITIONS
  // -------------------------------------------------------------------------

  /**
   * Add a condition to a flow
   */
  addCondition: async (flowId: number, data: CreateApprovalFlowConditionDto): Promise<ApprovalFlowCondition> => {
    const response = await api.post(`/core/approval-flows/${flowId}/conditions`, data);
    return response.data;
  },

  /**
   * Delete a condition
   */
  deleteCondition: async (flowId: number, conditionId: number): Promise<void> => {
    await api.delete(`/core/approval-flows/${flowId}/conditions/${conditionId}`);
  },
};

// ============================================================================
// APPROVABLE ENTITY TYPES API
// ============================================================================

export const approvableEntitiesApi = {
  /**
   * Get all discoverable approvable entity types
   */
  list: async (): Promise<ApprovableEntityType[]> => {
    const response = await api.get('/core/approvable-entities');
    return response.data;
  },

  /**
   * Scan and register new approvable entities
   */
  scan: async (): Promise<{ discovered: number; registered: ApprovableEntityType[] }> => {
    const response = await api.post('/core/approvable-entities/scan');
    return response.data;
  },
};

// ============================================================================
// PENDING APPROVALS API
// ============================================================================

export const pendingApprovalsApi = {
  /**
   * Get pending approvals for the current user
   */
  list: async (query?: PendingApprovalListQuery): Promise<PaginatedResponse<PendingApproval>> => {
    const response = await api.get('/core/approvals/pending', { params: query });
    const data = response.data;
    return {
      ...data,
      data: (data.data || []).map(mapPendingApproval),
    };
  },

  /**
   * Get count of pending approvals
   */
  getCount: async (): Promise<number> => {
    const response = await api.get('/core/approvals/pending/count');
    return response.data.count;
  },

  /**
   * Get approval statistics
   */
  getStats: async (): Promise<ApprovalStats> => {
    const response = await api.get('/core/approvals/stats');
    return response.data;
  },
};

// ============================================================================
// APPROVAL ACTIONS API
// ============================================================================

export const approvalActionsApi = {
  /**
   * Submit an entity for approval
   */
  submit: async (data: SubmitForApprovalDto): Promise<ApprovalStatusRecord> => {
    const response = await api.post('/core/approvals/submit', data);
    return mapStatusRecord(response.data);
  },

  /**
   * Perform an approval action (approve/reject/return)
   */
  action: async (statusId: number, data: ApprovalActionDto): Promise<ApprovalStatusRecord> => {
    const response = await api.post(`/core/approvals/${statusId}/action`, data);
    return mapStatusRecord(response.data);
  },

  /**
   * Get approval status for an entity
   */
  getStatus: async (entityType: string, entityId: number): Promise<ApprovalStatusRecord | null> => {
    try {
      const response = await api.get(`/core/approvals/status/${entityType}/${entityId}`);
      return mapStatusRecord(response.data);
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },

  /**
   * Get approval history for an entity
   */
  getHistory: async (entityType: string, entityId: number): Promise<ApprovalStatusRecord[]> => {
    const response = await api.get(`/core/approvals/history/${entityType}/${entityId}`);
    return (response.data || []).map(mapStatusRecord);
  },

  /**
   * Get all approval history (for reports)
   */
  getAllHistory: async (query?: ApprovalHistoryQuery): Promise<PaginatedResponse<ApprovalStatusRecord>> => {
    const response = await api.get('/core/approvals/history', { params: query });
    const data = response.data;
    return {
      ...data,
      data: (data.data || []).map(mapStatusRecord),
    };
  },

  /**
   * Cancel a pending approval
   */
  cancel: async (statusId: number, reason?: string): Promise<void> => {
    await api.post(`/core/approvals/${statusId}/cancel`, { reason });
  },

  /**
   * Super Admin: approve the current step only and advance to next step.
   * Logs as "Approved by Super Admin (override)".
   */
  superAdminApproveStep: async (statusId: number): Promise<ApprovalStatusRecord> => {
    const response = await api.post(`/core/approvals/${statusId}/super-admin-approve`);
    return mapStatusRecord(response.data);
  },

  /**
   * Super Admin: override all remaining approval steps.
   * Reason is required.
   */
  superAdminOverride: async (statusId: number, reason: string): Promise<ApprovalStatusRecord> => {
    const response = await api.post(`/core/approvals/${statusId}/override`, { reason });
    return mapStatusRecord(response.data);
  },

  /**
   * Super Admin: reset approval flow back to step 1
   */
  resetToStep1: async (statusId: number): Promise<ApprovalStatusRecord> => {
    const response = await api.post(`/core/approvals/${statusId}/reset-to-step-1`);
    return mapStatusRecord(response.data);
  },

};

// ============================================================================
// INBOX API (enriched, grouped by flow type)
// ============================================================================

export interface InboxItem {
  approvalStatusId: number;
  approvableId: number;
  reference: string;
  description: string;
  amount: number | null;
  currency: string | null;
  requester: string | null;
  submittedAt: string;
  currentStep: { id: number; name: string; stepOrder: number; stepType: string };
  daysPending: number;
  isOverdue: boolean;
  entityUrl: string;
}

export interface InboxGroup {
  approvableType: string;
  flowName: string;
  entitySlug: string;
  count: number;
  items: InboxItem[];
}

export interface InboxResponse {
  totalPending: number;
  groups: InboxGroup[];
}

export const inboxApi = {
  getMyPending: async (): Promise<InboxResponse> => {
    const response = await api.get('/core/approvals/my-pending');
    return response.data as InboxResponse;
  },
};

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const approvalsApi = {
  flows: approvalFlowsApi,
  entities: approvableEntitiesApi,
  pending: pendingApprovalsApi,
  actions: approvalActionsApi,
  inbox: inboxApi,
};
