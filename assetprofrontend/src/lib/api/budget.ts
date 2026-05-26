import { api } from '../api';

// ============================================================================
// TYPES
// ============================================================================

export type BudgetControlType = 'HARD_STOP' | 'WARN' | 'OVERRIDE' | 'LOG_ONLY';
export type BudgetPhasingMethod = 'EVEN' | 'MANUAL' | 'PRIOR_YEAR';
export type BudgetType = 'OPERATING' | 'CAPITAL' | 'PROJECT' | 'GRANTS' | 'CONSOLIDATED';
export type BudgetStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type BudgetTransferStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'CANCELLED';
export type BudgetOverrideStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface BudgetSetting {
  id: number;
  companyId: number;
  useBranchDimension: boolean;
  useDepartmentDimension: boolean;
  useProjectDimension: boolean;
  useCostCenterDimension: boolean;
  defaultControlType: BudgetControlType;
  warningThresholdPercent: number;
  criticalThresholdPercent: number;
  defaultPhasingMethod: BudgetPhasingMethod;
  allowManualPhasing: boolean;
  allowPriorYearPhasing: boolean;
  checkOnPurchaseRequisition: boolean;
  checkOnPurchaseOrder: boolean;
  checkOnApInvoice: boolean;
  checkOnJournalEntry: boolean;
  checkOnExpenseRequest: boolean;
  approvalLevels: number;
  requireOverrideSignature: boolean;
  requireBudgetApproval: boolean;
  requireTransferApproval: boolean;
  requireOverrideApproval: boolean;
  autoApproveBelowAmount?: number;
  notifyBudgetApprover: boolean;
  notifyTransferApprover: boolean;
  notifyOverrideApprover: boolean;
  budgetNumberFormat: string;
  transferNumberFormat: string;
  overrideNumberFormat: string;
  sequencePadding: number;
  fiscalYearStartMonth: number;
  periodsPerYear: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: number;
  companyId: number;
  branchId?: number;
  fiscalYearId: number;
  settingId?: number;
  createdBy?: number;
  budgetNumber: string;
  name: string;
  description?: string;
  budgetType: BudgetType;
  status: BudgetStatus;
  version: number;
  parentBudgetId?: number;
  isRevision: boolean;
  totalBudgetAmount: number;
  totalCommittedAmount: number;
  totalActualAmount: number;
  totalAvailableAmount: number;
  effectiveDate: string;
  expiryDate?: string;
  submittedAt?: string;
  submittedBy?: number;
  approvedAt?: string;
  approvedBy?: number;
  rejectionReason?: string;
  returnedReason?: string;
  currency: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  utilizationPercent?: number;
  displayStatus?: string;
  statusColor?: string;
  company?: { id: number; name: string };
  fiscalYear?: { id: number; name: string; startDate: string; endDate: string };
  lines?: BudgetLine[];
}

export interface BudgetLine {
  id: number;
  budgetId: number;
  companyId: number;
  branchId?: number;
  departmentId?: number;
  accountId: number;
  projectId?: number;
  costCenterId?: number;
  lineDescription?: string;
  controlType?: BudgetControlType;
  warningThresholdPercent?: number;
  annualBudgetAmount: number;
  committedAmount: number;
  actualAmount: number;
  availableAmount: number;
  phasingMethod: BudgetPhasingMethod;
  priorYearLineId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  utilizationPercent?: number;
  isOverBudget?: boolean;
  isWarning?: boolean;
  isCritical?: boolean;
  effectiveControlType?: BudgetControlType;
  account?: { id: number; code: string; name: string };
  budget?: { id: number; budgetNumber: string; name: string };
  periodAllocations?: BudgetPeriodAllocation[];
}

export interface BudgetPeriodAllocation {
  id: number;
  budgetLineId: number;
  periodNumber: number;
  periodName: string;
  startDate: string;
  endDate: string;
  budgetAmount: number;
  committedAmount: number;
  actualAmount: number;
  availableAmount: number;
  allocationPercent: number;
  isClosed: boolean;
  closedAt?: string;
  closedBy?: number;
}

export interface BudgetTransfer {
  id: number;
  transferNumber: string;
  fromBudgetLineId: number;
  fromPeriodAllocationId?: number;
  toBudgetLineId: number;
  toPeriodAllocationId?: number;
  transferAmount: number;
  reason: string;
  justification?: string;
  status: BudgetTransferStatus;
  requestedBy: number;
  requestedAt: string;
  submittedAt?: string;
  approvedBy?: number;
  approvedAt?: string;
  rejectionReason?: string;
  postedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  fromBudgetLine?: BudgetLine;
  toBudgetLine?: BudgetLine;
}

export interface BudgetOverride {
  id: number;
  overrideNumber: string;
  budgetLineId: number;
  sourceType?: string;
  sourceId?: number;
  sourceNumber?: string;
  overrideAmount: number;
  budgetAvailable: number;
  overAmount: number;
  overBudgetPercent: number;
  reason: string;
  justification: string;
  businessImpact?: string;
  status: BudgetOverrideStatus;
  requestedBy: number;
  requestedAt: string;
  submittedAt?: string;
  approvedBy?: number;
  approvedAt?: string;
  approverComments?: string;
  rejectionReason?: string;
  requesterSignaturePath?: string;
  approverSignaturePath?: string;
  expiresAt?: string;
  isOneTimeUse: boolean;
  isUsed: boolean;
  usedAt?: string;
  createdAt: string;
  updatedAt: string;
  budgetLine?: BudgetLine;
}

export interface BudgetStats {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  active: number;
  rejected: number;
  closed: number;
  totalBudgetAmount: number;
  totalCommittedAmount: number;
  totalActualAmount: number;
  totalAvailableAmount: number;
  overallUtilization: number;
}

export interface BudgetTransferStats {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  posted: number;
  rejected: number;
  totalTransferAmount: number;
}

export interface BudgetOverrideStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  totalOverrideAmount: number;
}

export interface BudgetCheckResult {
  allowed: boolean;
  status: 'ok' | 'warning' | 'blocked' | 'override_required' | 'no_budget';
  budgetLineId?: number;
  availableAmount: number;
  requestedAmount: number;
  overAmount?: number;
  utilizationPercent: number;
  projectedUtilization?: number;
  controlType: BudgetControlType;
  message?: string;
  exceptionId?: number;
}

// ============================================================================
// BUDGET SETTINGS API
// ============================================================================

export const budgetSettingsApi = {
  getByCompany: async (companyId: number): Promise<BudgetSetting | null> => {
    const response = await api.get(`/budget/settings/company/${companyId}`);
    return response.data;
  },

  getOrCreate: async (companyId: number): Promise<BudgetSetting> => {
    const response = await api.get(`/budget/settings/company/${companyId}/or-create`);
    return response.data;
  },

  create: async (data: Partial<BudgetSetting>): Promise<BudgetSetting> => {
    const response = await api.post('/budget/settings', data);
    return response.data;
  },

  update: async (companyId: number, data: Partial<BudgetSetting>): Promise<BudgetSetting> => {
    const response = await api.put(`/budget/settings/company/${companyId}`, data);
    return response.data;
  },

  delete: async (companyId: number): Promise<void> => {
    await api.delete(`/budget/settings/company/${companyId}`);
  },

  getDefaults: async (): Promise<Partial<BudgetSetting>> => {
    const response = await api.get('/budget/settings/defaults');
    return response.data;
  },

  getActiveDimensions: async (companyId: number): Promise<string[]> => {
    const response = await api.get(`/budget/settings/company/${companyId}/dimensions`);
    return response.data;
  },
};

// ============================================================================
// BUDGETS API
// ============================================================================

export const budgetsApi = {
  list: async (params?: {
    companyId?: number;
    branchId?: number;
    fiscalYearId?: number;
    budgetType?: BudgetType;
    status?: BudgetStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Budget[]; total: number; page: number; limit: number; totalPages: number }> => {
    const response = await api.get('/budget/budgets', { params });
    return response.data;
  },

  get: async (id: number): Promise<Budget> => {
    const response = await api.get(`/budget/budgets/${id}`);
    return response.data;
  },

  create: async (data: Partial<Budget>): Promise<Budget> => {
    const response = await api.post('/budget/budgets', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Budget>): Promise<Budget> => {
    const response = await api.put(`/budget/budgets/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/budget/budgets/${id}`);
  },

  getStats: async (companyId?: number, fiscalYearId?: number): Promise<BudgetStats> => {
    const response = await api.get('/budget/budgets/stats', {
      params: { companyId, fiscalYearId },
    });
    return response.data;
  },

  // Workflow actions
  submit: async (id: number, notes?: string): Promise<Budget> => {
    const response = await api.post(`/budget/budgets/${id}/submit`, { notes });
    return response.data;
  },

  approve: async (id: number, notes?: string): Promise<Budget> => {
    const response = await api.post(`/budget/budgets/${id}/approve`, { notes });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<Budget> => {
    const response = await api.post(`/budget/budgets/${id}/reject`, { reason });
    return response.data;
  },

  return: async (id: number, reason: string): Promise<Budget> => {
    const response = await api.post(`/budget/budgets/${id}/return`, { reason });
    return response.data;
  },

  activate: async (id: number): Promise<Budget> => {
    const response = await api.post(`/budget/budgets/${id}/activate`);
    return response.data;
  },

  revise: async (id: number): Promise<Budget> => {
    const response = await api.post(`/budget/budgets/${id}/revise`);
    return response.data;
  },

  close: async (id: number): Promise<Budget> => {
    const response = await api.post(`/budget/budgets/${id}/close`);
    return response.data;
  },
};

// ============================================================================
// BUDGET LINES API
// ============================================================================

export const budgetLinesApi = {
  list: async (params?: {
    budgetId?: number;
    accountId?: number;
    departmentId?: number;
    projectId?: number;
    branchId?: number;
    filterStatus?: 'active' | 'over_budget' | 'warning' | 'critical';
    page?: number;
    limit?: number;
  }): Promise<{ data: BudgetLine[]; total: number; page: number; limit: number; totalPages: number }> => {
    const response = await api.get('/budget/lines', { params });
    return response.data;
  },

  get: async (id: number): Promise<BudgetLine> => {
    const response = await api.get(`/budget/lines/${id}`);
    return response.data;
  },

  create: async (data: Partial<BudgetLine>): Promise<BudgetLine> => {
    const response = await api.post('/budget/lines', data);
    return response.data;
  },

  update: async (id: number, data: Partial<BudgetLine>): Promise<BudgetLine> => {
    const response = await api.put(`/budget/lines/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/budget/lines/${id}`);
  },

  getControlType: async (id: number): Promise<{ controlType: string }> => {
    const response = await api.get(`/budget/lines/${id}/control-type`);
    return response.data;
  },
};

// ============================================================================
// Budget Line Stats (computed client-side from list data)
// ============================================================================

export interface BudgetLineStats {
  totalLines: number;
  activeLines: number;
  overBudgetLines: number;
  warningLines: number;
  totalBudgetAmount: number;
  totalCommittedAmount: number;
  totalActualAmount: number;
  totalAvailableAmount: number;
}

export function computeBudgetLineStats(lines: BudgetLine[]): BudgetLineStats {
  return {
    totalLines: lines.length,
    activeLines: lines.filter((l) => l.isActive).length,
    overBudgetLines: lines.filter((l) => l.isOverBudget).length,
    warningLines: lines.filter((l) => l.isWarning).length,
    totalBudgetAmount: lines.reduce((s, l) => s + (Number(l.annualBudgetAmount) || 0), 0),
    totalCommittedAmount: lines.reduce((s, l) => s + (Number(l.committedAmount) || 0), 0),
    totalActualAmount: lines.reduce((s, l) => s + (Number(l.actualAmount) || 0), 0),
    totalAvailableAmount: lines.reduce((s, l) => s + (Number(l.availableAmount) || 0), 0),
  };
}

// ============================================================================
// BUDGET TRANSFERS API
// ============================================================================

export const budgetTransfersApi = {
  list: async (params?: {
    fromBudgetLineId?: number;
    toBudgetLineId?: number;
    status?: BudgetTransferStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: BudgetTransfer[]; total: number; page: number; limit: number; totalPages: number }> => {
    const response = await api.get('/budget/transfers', { params });
    return response.data;
  },

  get: async (id: number): Promise<BudgetTransfer> => {
    const response = await api.get(`/budget/transfers/${id}`);
    return response.data;
  },

  create: async (data: Partial<BudgetTransfer>): Promise<BudgetTransfer> => {
    const response = await api.post('/budget/transfers', data);
    return response.data;
  },

  update: async (id: number, data: Partial<BudgetTransfer>): Promise<BudgetTransfer> => {
    const response = await api.put(`/budget/transfers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/budget/transfers/${id}`);
  },

  getStats: async (companyId?: number): Promise<BudgetTransferStats> => {
    const response = await api.get('/budget/transfers/stats', { params: { companyId } });
    return response.data;
  },

  // Workflow actions
  submit: async (id: number, notes?: string): Promise<BudgetTransfer> => {
    const response = await api.post(`/budget/transfers/${id}/submit`, { notes });
    return response.data;
  },

  approve: async (id: number, notes?: string): Promise<BudgetTransfer> => {
    const response = await api.post(`/budget/transfers/${id}/approve`, { notes });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<BudgetTransfer> => {
    const response = await api.post(`/budget/transfers/${id}/reject`, { reason });
    return response.data;
  },

  post: async (id: number): Promise<BudgetTransfer> => {
    const response = await api.post(`/budget/transfers/${id}/post`);
    return response.data;
  },
};

// ============================================================================
// BUDGET OVERRIDES API
// ============================================================================

export const budgetOverridesApi = {
  list: async (params?: {
    budgetLineId?: number;
    sourceType?: string;
    sourceId?: number;
    status?: BudgetOverrideStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: BudgetOverride[]; total: number; page: number; limit: number; totalPages: number }> => {
    const response = await api.get('/budget/overrides', { params });
    return response.data;
  },

  get: async (id: number): Promise<BudgetOverride> => {
    const response = await api.get(`/budget/overrides/${id}`);
    return response.data;
  },

  create: async (data: Partial<BudgetOverride>): Promise<BudgetOverride> => {
    const response = await api.post('/budget/overrides', data);
    return response.data;
  },

  update: async (id: number, data: Partial<BudgetOverride>): Promise<BudgetOverride> => {
    const response = await api.put(`/budget/overrides/${id}`, data);
    return response.data;
  },

  getStats: async (companyId?: number): Promise<BudgetOverrideStats> => {
    const response = await api.get('/budget/overrides/stats', { params: { companyId } });
    return response.data;
  },

  findValid: async (sourceType: string, sourceId: number): Promise<BudgetOverride | null> => {
    const response = await api.get(`/budget/overrides/valid/${sourceType}/${sourceId}`);
    return response.data;
  },

  // Workflow actions
  submit: async (id: number, data?: { requesterSignaturePath?: string; notes?: string }): Promise<BudgetOverride> => {
    const response = await api.post(`/budget/overrides/${id}/submit`, data);
    return response.data;
  },

  approve: async (id: number, data?: { approverSignaturePath?: string; approverComments?: string }): Promise<BudgetOverride> => {
    const response = await api.post(`/budget/overrides/${id}/approve`, data);
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<BudgetOverride> => {
    const response = await api.post(`/budget/overrides/${id}/reject`, { reason });
    return response.data;
  },

  markAsUsed: async (id: number): Promise<BudgetOverride> => {
    const response = await api.post(`/budget/overrides/${id}/mark-used`);
    return response.data;
  },
};

// ============================================================================
// BUDGET REPORTS API
// ============================================================================

export const budgetReportsApi = {
  getUtilization: async (params?: {
    companyId?: number;
    branchId?: number;
    departmentId?: number;
    fiscalYearId?: number;
    budgetId?: number;
  }): Promise<Record<string, unknown>> => {
    const response = await api.get('/budget/reports/utilization', { params });
    return response.data;
  },

  getVariance: async (params?: {
    companyId?: number;
    branchId?: number;
    departmentId?: number;
    fiscalYearId?: number;
    budgetId?: number;
  }): Promise<Record<string, unknown>> => {
    const response = await api.get('/budget/reports/variance', { params });
    return response.data;
  },

  getAdvancedVariance: async (params?: {
    companyId?: number;
    branchId?: number;
    departmentId?: number;
    fiscalYearId?: number;
    budgetId?: number;
    includeTrends?: boolean;
    includeDrillDown?: boolean;
  }): Promise<Record<string, unknown>> => {
    const response = await api.get('/budget/reports/variance-advanced', { params });
    return response.data;
  },

  getProjection: async (params?: {
    companyId?: number;
    branchId?: number;
    departmentId?: number;
    fiscalYearId?: number;
    budgetId?: number;
  }): Promise<Record<string, unknown>> => {
    const response = await api.get('/budget/reports/projection', { params });
    return response.data;
  },

  getExceptions: async (params?: {
    companyId?: number;
    budgetId?: number;
    exceptionType?: string;
    actionTaken?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Record<string, unknown>> => {
    const response = await api.get('/budget/reports/exceptions', { params });
    return response.data;
  },

  getPeriodUtilization: async (budgetId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/budget/reports/period-utilization/${budgetId}`);
    return response.data;
  },
};

// ============================================================================
// SCENARIOS API
// ============================================================================

export interface ScenarioAdjustment {
  accountCode: string;
  adjustmentType: 'percentage' | 'fixed';
  value: number;
  notes?: string;
}

export interface Scenario {
  id: number;
  name: string;
  description?: string;
  baseBudgetId: number | null;
  companyId: number;
  fiscalYearId?: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  status: string;
  lineCount?: number;
  lines?: Array<{
    id: number;
    accountCode: string;
    accountName: string;
    accountType: string;
    amount: number;
  }>;
}

export interface ScenarioComparison {
  scenarios: Scenario[];
  summary: {
    totalsByScenario: Record<number, number>;
    varianceToBaseline: Record<number, number>;
    percentageVarianceToBaseline: Record<number, number>;
  };
  lineComparison?: Array<{
    accountCode: string;
    accountName: string;
    accountType: string;
    amounts: Record<number, number>;
    variances: Record<string, number>;
    variancePercentages: Record<string, number>;
  }>;
  metadata: {
    companyId: number;
    companyName: string;
    generatedAt: string;
  };
}

export const scenariosApi = {
  create: async (data: {
    name: string;
    description?: string;
    baseBudgetId: number;
    companyId: number;
    fiscalYearId?: number;
    adjustments?: ScenarioAdjustment[];
  }): Promise<Scenario> => {
    const response = await api.post('/budget/scenarios', data);
    return response.data;
  },

  list: async (params: {
    companyId: number;
    fiscalYearId?: number;
  }): Promise<Scenario[]> => {
    const response = await api.get('/budget/scenarios', { params });
    return response.data;
  },

  get: async (id: number): Promise<Scenario> => {
    const response = await api.get(`/budget/scenarios/${id}`);
    return response.data;
  },

  update: async (id: number, data: {
    name?: string;
    description?: string;
    adjustments?: ScenarioAdjustment[];
  }): Promise<Scenario> => {
    const response = await api.put(`/budget/scenarios/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/budget/scenarios/${id}`);
    return response.data;
  },

  compare: async (params: {
    scenarioIds: number[];
    includeLineDetails?: boolean;
  }): Promise<ScenarioComparison> => {
    const response = await api.get('/budget/scenarios/compare', { params });
    return response.data;
  },
};

// ============================================================================
// BUDGET ALERTS API
// ============================================================================

export type AlertTriggerType =
  | 'UTILIZATION_THRESHOLD'
  | 'OVER_BUDGET'
  | 'VARIANCE_THRESHOLD'
  | 'EXCEPTION_COUNT'
  | 'COMMITMENT_THRESHOLD';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISABLED';
export type AlertNotificationChannel = 'EMAIL' | 'IN_APP' | 'SMS';

export interface BudgetAlertRule {
  id: number;
  name: string;
  description?: string;
  triggerType: AlertTriggerType;
  threshold: number;
  severity: AlertSeverity;
  companyId: number;
  branchId?: number;
  departmentId?: number;
  budgetId?: number;
  accountCodes?: string[];
  notificationChannels: AlertNotificationChannel[];
  emailRecipients?: string[];
  userIds?: number[];
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TriggeredAlert {
  ruleId: number;
  ruleName: string;
  triggerType: AlertTriggerType;
  severity: AlertSeverity;
  message: string;
  context: Record<string, unknown>;
  triggeredAt: string;
}

export interface AlertDashboard {
  summary: {
    totalActive: number;
    totalTriggered: number;
    totalCritical: number;
    totalWarning: number;
    totalInfo: number;
  };
  recentAlerts: TriggeredAlert[];
  byTriggerType: Record<string, number>;
  bySeverity: Record<string, number>;
  generatedAt: string;
}

export const budgetAlertsApi = {
  createRule: async (data: Partial<BudgetAlertRule>): Promise<BudgetAlertRule> => {
    const response = await api.post('/budget/alerts/rules', data);
    return response.data;
  },

  listRules: async (params: {
    companyId: number;
    budgetId?: number;
    isEnabled?: boolean;
  }): Promise<BudgetAlertRule[]> => {
    const response = await api.get('/budget/alerts/rules', { params });
    return response.data;
  },

  getRule: async (id: number): Promise<BudgetAlertRule> => {
    const response = await api.get(`/budget/alerts/rules/${id}`);
    return response.data;
  },

  updateRule: async (id: number, data: Partial<BudgetAlertRule>): Promise<BudgetAlertRule> => {
    const response = await api.put(`/budget/alerts/rules/${id}`, data);
    return response.data;
  },

  deleteRule: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/budget/alerts/rules/${id}`);
    return response.data;
  },

  checkAlerts: async (params: {
    companyId: number;
    budgetId?: number;
  }): Promise<TriggeredAlert[]> => {
    const response = await api.post('/budget/alerts/check', null, { params });
    return response.data;
  },

  getDashboard: async (params: {
    companyId: number;
  }): Promise<AlertDashboard> => {
    const response = await api.get('/budget/alerts/dashboard', { params });
    return response.data;
  },
};

// ============================================================================
// BUDGET CONTROL API (Integration)
// ============================================================================

export const budgetControlApi = {
  check: async (data: {
    companyId: number;
    accountId: number;
    amount: number;
    sourceType: string;
    sourceId: number;
    branchId?: number;
    departmentId?: number;
    projectId?: number;
    costCenterId?: number;
    fiscalYearId?: number;
  }): Promise<BudgetCheckResult> => {
    const response = await api.post('/budget/api/check', data);
    return response.data;
  },

  getAvailable: async (accountId: number, params: {
    companyId: number;
    branchId?: number;
    departmentId?: number;
    projectId?: number;
    fiscalYearId?: number;
  }): Promise<{
    found: boolean;
    budgetLineId?: number;
    annualBudget: number;
    committed: number;
    actual: number;
    available: number;
    utilizationPercent: number;
    controlType?: BudgetControlType;
  }> => {
    const response = await api.get(`/budget/api/available/${accountId}`, { params });
    return response.data;
  },

  recordCommitment: async (data: {
    budgetLineId: number;
    amount: number;
    sourceType: string;
    sourceId: number;
    sourceNumber: string;
    description?: string;
    currencyCode?: string;
    exchangeRate?: number;
  }): Promise<Record<string, unknown>> => {
    const response = await api.post('/budget/api/commit', data);
    return response.data;
  },

  releaseCommitment: async (data: {
    budgetLineId: number;
    amount: number;
    sourceType: string;
    sourceId: number;
    description?: string;
  }): Promise<Record<string, unknown>> => {
    const response = await api.post('/budget/api/release', data);
    return response.data;
  },

  recordActual: async (data: {
    budgetLineId: number;
    amount: number;
    sourceType: string;
    sourceId: number;
    sourceNumber: string;
    description?: string;
    commitmentToRelease?: number;
    currencyCode?: string;
    exchangeRate?: number;
  }): Promise<Record<string, unknown>> => {
    const response = await api.post('/budget/api/actual', data);
    return response.data;
  },
};

// ============================================================================
// COMBINED BUDGET API (convenience wrapper)
// ============================================================================

export const budgetApi = {
  // Scenario methods
  getScenarios: async (params?: { companyId?: number; fiscalYearId?: number }): Promise<Scenario[]> => {
    return scenariosApi.list({ companyId: params?.companyId ?? 0, fiscalYearId: params?.fiscalYearId });
  },
  createScenario: scenariosApi.create,
  deleteScenario: scenariosApi.delete,
  cloneScenario: async (id: number): Promise<Scenario> => {
    const original = await scenariosApi.get(id);
    return scenariosApi.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      baseBudgetId: original.baseBudgetId || 0,
      companyId: original.companyId,
      fiscalYearId: original.fiscalYearId,
    });
  },
  compareScenarios: async (params: { scenarioIds: number[]; includeLineDetails?: boolean }): Promise<ScenarioComparison> => {
    return scenariosApi.compare(params);
  },
  exportScenarioComparison: async (params: { scenarioIds: number[]; format?: string }): Promise<void> => {
    const data = await scenariosApi.compare({ scenarioIds: params.scenarioIds, includeLineDetails: true });
    // Export as CSV download
    const csvRows = ['Account Code,Account Name,Account Type,' + data.scenarios.map(s => s.name).join(',')];
    if (data.lineComparison) {
      for (const line of data.lineComparison) {
        csvRows.push([
          line.accountCode,
          line.accountName,
          line.accountType,
          ...data.scenarios.map(s => String(line.amounts[s.id] || 0)),
        ].join(','));
      }
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scenario-comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  // Variance analysis methods
  getVarianceAnalysis: budgetReportsApi.getAdvancedVariance,
  exportVarianceAnalysis: async (params: Record<string, unknown>): Promise<void> => {
    const data = await budgetReportsApi.getAdvancedVariance(params);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'variance-analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  // Alert methods
  getAlertRules: async (params?: { companyId?: number }): Promise<BudgetAlertRule[]> => {
    return budgetAlertsApi.listRules({ companyId: params?.companyId || 0 });
  },
  createAlertRule: budgetAlertsApi.createRule,
  updateAlertRule: budgetAlertsApi.updateRule,
  deleteAlertRule: budgetAlertsApi.deleteRule,

  // Utility methods
  getFiscalYears: async (): Promise<Array<{ id: number; name: string; startDate: string; endDate: string }>> => {
    const response = await api.get('/accounts/fiscal-years');
    return response.data?.data || response.data || [];
  },
  getBudgetCategories: async (): Promise<Array<{ id: number; code: string; name: string }>> => {
    const response = await api.get('/accounts/chart', { params: { limit: 500 } });
    const accounts = response.data?.data || response.data || [];
    return accounts.map((a: { id: number; code: string; name: string }) => ({ id: a.id, code: a.code, name: a.name }));
  },
};
