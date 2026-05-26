import { api } from '../api';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// BOM Types
export interface BomLine {
  id: number;
  productId: number;
  productName?: string;
  productCode?: string;
  quantity: number;
  uomId: number | null;
  uomName?: string;
  issueMethod: string;
  scrapPercent: number;
  warehouseId: number | null;
  locationId: number | null;
  componentType: string | null;
  isCritical: boolean;
  operationOffsetDays: number;
  fixedScrapQty: number;
  allowSubstitutes: boolean;
  unitCost: number;
  extendedCost: number;
  itemAverageCost?: number;
  itemStandardCost?: number;
  itemLastPurchasePrice?: number;
  qtyOnHand?: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  notes: string | null;
}

export interface BomByProduct {
  id: number;
  productId: number;
  productName?: string;
  quantity: number;
  costAllocationPercent: number;
  byProductType: string | null;
  costAllocationMethod: string | null;
  costAllocationAmount: number;
  operationId: number | null;
}

export interface Bom {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description: string | null;
  productId: number;
  productName?: string;
  bomType: string;
  manufacturingType: string;
  quantity: number;
  uomId: number | null;
  parentBomId: number | null;
  routingId: number | null;
  version: number;
  isCurrentVersion: boolean;
  status: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  overheadPercent: number;
  laborCostPercent: number;
  scrapPercent: number;
  expectedYieldPercent: number;
  minimumBatchSize: number | null;
  maximumBatchSize: number | null;
  batchSizeMultiple: number | null;
  standardMaterialCost: number;
  standardLaborCost: number;
  standardOverheadCost: number;
  standardTotalCost: number;
  costLastCalculatedAt: string | null;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  totalCost: number;
  approvalNotes: string | null;
  notes: string | null;
  changeDescription?: string | null;
  approvedById: number | null;
  approvedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lines?: BomLine[];
  byProducts?: BomByProduct[];
}

export interface CreateBomDto {
  code: string;
  name: string;
  description?: string;
  productId: number;
  manufacturingType?: string;
  quantity?: number;
  uomId?: number;
  parentBomId?: number;
  routingId?: number;
  overheadPercent?: number;
  laborCostPercent?: number;
  scrapPercent?: number;
  expectedYieldPercent?: number;
  minimumBatchSize?: number;
  maximumBatchSize?: number;
  batchSizeMultiple?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
  isActive?: boolean;
  lines?: Omit<BomLine, 'id'>[];
  byProducts?: Omit<BomByProduct, 'id'>[];
}

export interface UpdateBomDto extends Partial<CreateBomDto> {}

export interface BomQuery {
  page?: number;
  limit?: number;
  search?: string;
  productId?: number;
  status?: string;
  bomType?: string;
  isCurrentVersion?: boolean;
  isActive?: boolean;
}

export interface BomStats {
  total: number;
  active: number;
  draft: number;
  approved: number;
  pending: number;
}

// Work Center Types
export interface WorkCenter {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description: string | null;
  workCenterType: string;
  departmentId: number | null;
  warehouseId: number | null;
  locationId: number | null;
  capacity: number;
  capacityUom: string;
  efficiencyPercent: number;
  costPerHour: number;
  overheadPerHour: number;
  setupCostPerHour: number;
  shiftPatternId: number | null;
  oeeTarget: number;
  utilizationPercent: number;
  hourlyLaborRate: number;
  hourlyMachineRate: number;
  costCenterId: number | null;
  concurrentOperations: number;
  queueTimeHours: number;
  moveTimeHours: number;
  availabilityTargetPercent: number;
  performanceTargetPercent: number;
  qualityTargetPercent: number;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkCenterDto {
  code: string;
  name: string;
  description?: string;
  workCenterType?: string;
  departmentId?: number;
  warehouseId?: number;
  locationId?: number;
  capacity?: number;
  capacityUom?: string;
  efficiencyPercent?: number;
  costPerHour?: number;
  overheadPerHour?: number;
  setupCostPerHour?: number;
  shiftPatternId?: number;
  oeeTarget?: number;
  utilizationPercent?: number;
  hourlyLaborRate?: number;
  hourlyMachineRate?: number;
  costCenterId?: number;
  concurrentOperations?: number;
  queueTimeHours?: number;
  moveTimeHours?: number;
  availabilityTargetPercent?: number;
  performanceTargetPercent?: number;
  qualityTargetPercent?: number;
  isActive?: boolean;
}

export interface UpdateWorkCenterDto extends Partial<CreateWorkCenterDto> {
  status?: string;
}

export interface WorkCenterQuery {
  page?: number;
  limit?: number;
  search?: string;
  workCenterType?: string;
  status?: string;
  departmentId?: number;
  isActive?: boolean;
}

export interface WorkCenterStats {
  total: number;
  active: number;
  operational: number;
  maintenance: number;
  inactive: number;
}

// Routing Types
export interface RoutingOperation {
  id: number;
  routingId: number;
  operationNumber: number;
  name: string;
  description: string | null;
  workCenterId: number;
  workCenterName?: string;
  setupTime: number;
  runTimePerUnit: number;
  waitTime: number;
  moveTime: number;
  queueTime: number;
  minimumTransferQuantity: number;
  overlapPercent: number;
  costBasis: string;
  costPerUnit: number;
  overheadPerUnit: number;
  subcontractorId: number | null;
  subcontractCost: number;
  qualityInspectionRequired: boolean;
  isMilestone: boolean;
  operationCode: string | null;
  alternateWorkCenterId: number | null;
  operationType: string;
  isReportingPoint: boolean;
  runTimePerBatch: number;
  unitsPerHour: number;
  batchSize: number;
  overlapAllowed: boolean;
  schedulingMethod: string;
  isCritical: boolean;
  laborRatePerHour: number;
  overheadRatePerHour: number;
  isSubcontracted: boolean;
  subcontractLeadDays: number;
  timeUom: string | null;
  fixedCost: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  notes: string | null;
}

export interface OperationResource {
  id: number;
  routingOperationId: number;
  resourceType: string;
  resourceId: number | null;
  resourceName: string | null;
  quantity: number;
  uomId: number | null;
  usageType: string;
  notes: string | null;
  resourceCode: string | null;
  description: string | null;
  usagePercentage: number;
  setupTime: number;
  runTimePerUnit: number;
  isConcurrent: boolean;
  isPrimaryResource: boolean;
  isConstraining: boolean;
  offsetTime: number;
  fixedCost: number;
  costBasis: string | null;
  skillRequired: string | null;
  skillLevel: string | null;
}

export interface Routing {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description: string | null;
  productId: number;
  productName?: string;
  routingType: string;
  version: number;
  isCurrentVersion: boolean;
  status: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  parentRoutingId: number | null;
  totalSetupTime: number;
  totalRunTime: number;
  totalWaitTime: number;
  totalMoveTime: number;
  totalQueueTime: number;
  totalLeadTime: number;
  timeUom: string;
  totalCostPerUnit: number;
  standardLaborCost: number;
  standardOverheadCost: number;
  standardTotalCost: number;
  costLastCalculatedAt: string | null;
  approvalNotes: string | null;
  notes: string | null;
  approvedById: number | null;
  approvedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  operations?: RoutingOperation[];
}

export interface CreateRoutingDto {
  code: string;
  name: string;
  description?: string;
  productId: number;
  routingType?: string;
  parentRoutingId?: number;
  timeUom?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
  isActive?: boolean;
  operations?: Omit<RoutingOperation, 'id' | 'routingId'>[];
}

export interface UpdateRoutingDto extends Partial<CreateRoutingDto> {}

export interface RoutingQuery {
  page?: number;
  limit?: number;
  search?: string;
  productId?: number;
  routingType?: string;
  status?: string;
  isCurrentVersion?: boolean;
  isActive?: boolean;
}

export interface RoutingStats {
  total: number;
  active: number;
  draft: number;
  approved: number;
}

// Production Order Types
export interface ProductionOrderLine {
  id: number;
  productionOrderId: number;
  productId: number;
  productName?: string;
  productCode?: string;
  bomLineId: number | null;
  quantity: number;
  uomId: number | null;
  issuedQuantity: number;
  returnedQuantity: number;
  consumedQuantity: number;
  issueMethod: string;
  warehouseId: number | null;
  locationId: number | null;
  status: string;
  lineNumber: number | null;
  componentType: string | null;
  operationId: number | null;
  isIssued: boolean;
  unitCost: number;
  plannedCost: number;
  actualCost: number;
  batchNumber: string | null;
}

export interface ProductionOrderOperation {
  id: number;
  productionOrderId: number;
  routingOperationId: number | null;
  operationNumber: number;
  name: string;
  workCenterId: number;
  workCenterName?: string;
  plannedSetupTime: number;
  plannedRunTime: number;
  actualSetupTime: number;
  actualRunTime: number;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  completedQuantity: number;
  scrapQuantity: number;
  status: string;
  plannedQueueTime: number;
  plannedMoveTime: number;
  actualQueueTime: number;
  actualMoveTime: number;
  plannedStartDatetime: string | null;
  plannedEndDatetime: string | null;
  actualStartDatetime: string | null;
  actualEndDatetime: string | null;
  plannedLaborCost: number;
  plannedOverheadCost: number;
  actualLaborCost: number;
  actualOverheadCost: number;
  operationCode: string | null;
  plannedQuantity: number;
  startedQuantity: number;
  progressPercentage: number;
}

export interface ProductionOrder {
  id: number;
  companyId: number;
  orderNumber: string;
  description: string | null;
  productId: number;
  productName?: string;
  productCode?: string;
  bomId: number | null;
  bomName?: string;
  routingId: number | null;
  routingName?: string;
  warehouseId: number | null;
  quantity: number;
  uomId: number | null;
  completedQuantity: number;
  scrapQuantity: number;
  orderType: string;
  priority: string;
  sourceType: string | null;
  sourceId: number | null;
  parentOrderId: number | null;
  status: string;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  dueDate: string | null;
  releasedById: number | null;
  releasedAt: string | null;
  closedById: number | null;
  closedAt: string | null;
  notes: string | null;
  estimatedCost: number;
  actualCost: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  orderDate: string | null;
  sourceDocument: string | null;
  salesOrderId: number | null;
  salesOrderLineId: number | null;
  startedQuantity: number;
  actualStartDatetime: string | null;
  actualEndDatetime: string | null;
  sourceWarehouseId: number | null;
  wipWarehouseId: number | null;
  plannedMaterialCost: number;
  plannedLaborCost: number;
  plannedOverheadCost: number;
  plannedTotalCost: number;
  plannedSetupTime: number;
  plannedRunTime: number;
  actualSetupTime: number;
  actualRunTime: number;
  batchNumber: string | null;
  expiryDate: string | null;
  productionNotes: string | null;
  progressPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lines?: ProductionOrderLine[];
  operations?: ProductionOrderOperation[];
  // Step tracker fields
  materialRequiredQty?: number;
  materialIssuedQty?: number;
  receiptCount?: number;
  pendingQcCount?: number;
  passedQcCount?: number;
  failedQcCount?: number;
}

export interface CreateProductionOrderDto {
  productId: number;
  quantity: number;
  description?: string;
  bomId?: number;
  routingId?: number;
  uomId?: number;
  warehouseId?: number;
  orderType?: string;
  priority?: string;
  sourceType?: string;
  sourceId?: number;
  parentOrderId?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  dueDate?: string;
  orderDate?: string;
  sourceDocument?: string;
  salesOrderId?: number;
  salesOrderLineId?: number;
  sourceWarehouseId?: number;
  wipWarehouseId?: number;
  plannedMaterialCost?: number;
  plannedLaborCost?: number;
  plannedOverheadCost?: number;
  plannedTotalCost?: number;
  plannedSetupTime?: number;
  plannedRunTime?: number;
  batchNumber?: string;
  expiryDate?: string;
  productionNotes?: string;
  notes?: string;
}

export interface UpdateProductionOrderDto {
  quantity?: number;
  warehouseId?: number;
  priority?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface ProductionOrderQuery {
  page?: number;
  limit?: number;
  search?: string;
  productId?: number;
  status?: string;
  orderType?: string;
  priority?: string;
  warehouseId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface ProductionOrderStats {
  total: number;
  draft: number;
  planned: number;
  confirmed: number;
  released: number;
  inProgress: number;
  completed: number;
  closed: number;
}

// ============================================================================
// BOM API
// ============================================================================

export const bomsApi = {
  list: async (query?: BomQuery): Promise<PaginatedResponse<Bom>> => {
    const response = await api.get('/manufacturing/boms', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Bom> => {
    const response = await api.get(`/manufacturing/boms/${id}`);
    return response.data;
  },

  create: async (data: CreateBomDto): Promise<Bom> => {
    const response = await api.post('/manufacturing/boms', data);
    return response.data;
  },

  update: async (id: number, data: UpdateBomDto): Promise<Bom> => {
    const response = await api.patch(`/manufacturing/boms/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/boms/${id}`);
  },

  getStats: async (): Promise<BomStats> => {
    const response = await api.get('/manufacturing/boms/stats');
    return response.data;
  },

  getByProduct: async (productId: number): Promise<Bom | null> => {
    try {
      const response = await api.get(`/manufacturing/boms/product/${productId}`);
      return response.data;
    } catch {
      return null;
    }
  },

  submitForApproval: async (id: number): Promise<Bom> => {
    const response = await api.post(`/manufacturing/boms/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, notes?: string): Promise<Bom> => {
    const response = await api.post(`/manufacturing/boms/${id}/approve`, { approvalNotes: notes });
    return response.data;
  },

  lock: async (id: number): Promise<Bom> => {
    const response = await api.post(`/manufacturing/boms/${id}/lock`);
    return response.data;
  },

  obsolete: async (id: number): Promise<Bom> => {
    const response = await api.post(`/manufacturing/boms/${id}/obsolete`);
    return response.data;
  },

  createVersion: async (id: number, changeDescription?: string): Promise<Bom> => {
    const response = await api.post(`/manufacturing/boms/${id}/versions`, { changeDescription });
    return response.data;
  },

  getVersions: async (code: string): Promise<Bom[]> => {
    const response = await api.get(`/manufacturing/boms/versions/${code}`);
    return response.data;
  },

  calculateCost: async (id: number, quantity?: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/manufacturing/boms/${id}/cost`, { params: { quantity } });
    return response.data;
  },

  explode: async (id: number, quantity?: number, levels?: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/manufacturing/boms/${id}/explode`, { params: { quantity, levels } });
    return response.data;
  },
};

// ============================================================================
// WORK CENTER API
// ============================================================================

export const workCentersApi = {
  list: async (query?: WorkCenterQuery): Promise<PaginatedResponse<WorkCenter>> => {
    const response = await api.get('/manufacturing/work-centers', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<WorkCenter> => {
    const response = await api.get(`/manufacturing/work-centers/${id}`);
    return response.data;
  },

  create: async (data: CreateWorkCenterDto): Promise<WorkCenter> => {
    const response = await api.post('/manufacturing/work-centers', data);
    return response.data;
  },

  update: async (id: number, data: UpdateWorkCenterDto): Promise<WorkCenter> => {
    const response = await api.patch(`/manufacturing/work-centers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/work-centers/${id}`);
  },

  getStats: async (): Promise<WorkCenterStats> => {
    const response = await api.get('/manufacturing/work-centers/stats');
    return response.data;
  },

  getCapacity: async (id: number, startDate: string, endDate: string): Promise<Record<string, unknown>> => {
    const response = await api.get(`/manufacturing/work-centers/${id}/capacity`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getOeeHistory: async (id: number, startDate: string, endDate: string): Promise<Record<string, unknown>> => {
    const response = await api.get(`/manufacturing/work-centers/${id}/oee`, {
      params: { startDate, endDate },
    });
    return response.data;
  },
};

// ============================================================================
// ROUTING API
// ============================================================================

export const routingsApi = {
  list: async (query?: RoutingQuery): Promise<PaginatedResponse<Routing>> => {
    const response = await api.get('/manufacturing/routings', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Routing> => {
    const response = await api.get(`/manufacturing/routings/${id}`);
    return response.data;
  },

  create: async (data: CreateRoutingDto): Promise<Routing> => {
    const response = await api.post('/manufacturing/routings', data);
    return response.data;
  },

  update: async (id: number, data: UpdateRoutingDto): Promise<Routing> => {
    const response = await api.patch(`/manufacturing/routings/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/routings/${id}`);
  },

  getStats: async (): Promise<RoutingStats> => {
    const response = await api.get('/manufacturing/routings/stats');
    return response.data;
  },

  submitForApproval: async (id: number): Promise<Routing> => {
    const response = await api.post(`/manufacturing/routings/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, notes?: string): Promise<Routing> => {
    const response = await api.post(`/manufacturing/routings/${id}/approve`, { approvalNotes: notes });
    return response.data;
  },

  lock: async (id: number): Promise<Routing> => {
    const response = await api.post(`/manufacturing/routings/${id}/lock`);
    return response.data;
  },

  obsolete: async (id: number): Promise<Routing> => {
    const response = await api.post(`/manufacturing/routings/${id}/obsolete`);
    return response.data;
  },

  createVersion: async (id: number, changeDescription?: string, effectiveFrom?: string): Promise<Routing> => {
    const response = await api.post(`/manufacturing/routings/${id}/versions`, { changeDescription, effectiveFrom });
    return response.data;
  },

  getVersions: async (code: string): Promise<Routing[]> => {
    const response = await api.get(`/manufacturing/routings/versions/${code}`);
    return response.data;
  },

  calculateLeadTime: async (id: number, quantity?: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/manufacturing/routings/${id}/lead-time`, { params: { quantity } });
    return response.data;
  },
};

// ============================================================================
// PRODUCTION ORDER API
// ============================================================================

export const productionOrdersApi = {
  list: async (query?: ProductionOrderQuery): Promise<PaginatedResponse<ProductionOrder>> => {
    const response = await api.get('/manufacturing/production-orders', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ProductionOrder> => {
    const response = await api.get(`/manufacturing/production-orders/${id}`);
    return response.data;
  },

  create: async (data: CreateProductionOrderDto): Promise<ProductionOrder> => {
    const response = await api.post('/manufacturing/production-orders', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProductionOrderDto): Promise<ProductionOrder> => {
    const response = await api.patch(`/manufacturing/production-orders/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/production-orders/${id}`);
  },

  getStats: async (): Promise<ProductionOrderStats> => {
    const response = await api.get('/manufacturing/production-orders/stats');
    return response.data;
  },

  // Workflow actions
  plan: async (id: number): Promise<ProductionOrder> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/plan`);
    return response.data;
  },

  confirm: async (id: number): Promise<ProductionOrder> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/confirm`);
    return response.data;
  },

  release: async (id: number): Promise<ProductionOrder> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/release`);
    return response.data;
  },

  start: async (id: number): Promise<ProductionOrder> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/start`);
    return response.data;
  },

  complete: async (id: number): Promise<ProductionOrder> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/complete`);
    return response.data;
  },

  close: async (id: number): Promise<ProductionOrder> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/close`);
    return response.data;
  },

  cancel: async (id: number, reason: string): Promise<ProductionOrder> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/cancel`, { reason });
    return response.data;
  },

  hold: async (id: number, reason: string): Promise<ProductionOrder> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/hold`, { reason });
    return response.data;
  },

  resume: async (id: number): Promise<ProductionOrder> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/resume`);
    return response.data;
  },

  // Print
  getForPrint: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/manufacturing/production-orders/${id}/print`);
    return response.data;
  },

  // Material management
  issueMaterial: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/issue-material`, data);
    return response.data;
  },

  returnMaterial: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/return-material`, data);
    return response.data;
  },

  // Production receipt
  receiveProduction: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/receive`, data);
    return response.data;
  },

  // QC Validation
  getQcQueue: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/manufacturing/production-orders/receipts/qc-queue');
    return response.data;
  },

  getQcReport: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/manufacturing/production-orders/receipts/qc-report');
    return response.data;
  },

  qcDecision: async (orderId: number, data: { result: 'pass' | 'fail'; comments?: string }): Promise<Record<string, unknown>> => {
    const response = await api.post(`/manufacturing/production-orders/receipts/${orderId}/qc-decision`, data);
    return response.data;
  },

  // Scrap and labor
  recordScrap: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/scrap`, data);
    return response.data;
  },

  recordLabor: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/labor`, data);
    return response.data;
  },

  // Operation management
  startOperation: async (id: number, operationId: number): Promise<Record<string, unknown>> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/operations/${operationId}/start`);
    return response.data;
  },

  completeOperation: async (id: number, operationId: number, completedQty: number, scrapQty?: number): Promise<Record<string, unknown>> => {
    const response = await api.post(`/manufacturing/production-orders/${id}/operations/${operationId}/complete`, {
      completedQty,
      scrapQty,
    });
    return response.data;
  },
};

// ============================================================================
// SHIFT PATTERN TYPES
// ============================================================================

export interface ShiftPatternShift {
  id: number;
  shiftPatternId: number;
  name: string;
  startTime: string;
  endTime: string;
  breakDurationMinutes: number;
  isOvernight: boolean;
}

export interface ShiftPattern {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description: string | null;
  startTime: string;
  endTime: string;
  breakDuration: number | null;
  daysOfWeek: number[] | null;
  color: string | null;
  isNightShift: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftPatternDto {
  code: string;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  daysOfWeek?: number[];
  color?: string;
  isNightShift?: boolean;
  isActive?: boolean;
}

export interface UpdateShiftPatternDto extends Partial<CreateShiftPatternDto> {}

export interface ShiftPatternQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  isNightShift?: boolean;
}

export interface ShiftPatternStats {
  total: number;
  active: number;
  inactive: number;
}

// ============================================================================
// QUALITY PARAMETER TYPES
// ============================================================================

export interface QualityParameter {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description: string | null;
  parameterType: string;
  measurementUnit: string | null;
  minValue: number | null;
  maxValue: number | null;
  targetValue: number | null;
  tolerance: number | null;
  isCritical: boolean;
  decimalPlaces: number | null;
  samplingType: string | null;
  defaultSampleSizePercent: number | null;
  defaultSampleSizeQty: number | null;
  isMandatory: boolean;
  createdBy: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQualityParameterDto {
  code: string;
  name: string;
  description?: string;
  dataType: string;
  parameterType?: string;
  measurementUnit?: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  tolerance?: number;
  isCritical?: boolean;
  decimalPlaces?: number;
  samplingType?: string;
  defaultSampleSizePercent?: number;
  defaultSampleSizeQty?: number;
  isMandatory?: boolean;
  isActive?: boolean;
}

export interface UpdateQualityParameterDto extends Partial<CreateQualityParameterDto> {}

export interface QualityParameterQuery {
  page?: number;
  limit?: number;
  search?: string;
  parameterType?: string;
  isCritical?: boolean;
  isActive?: boolean;
}

export interface QualityParameterStats {
  total: number;
  active: number;
  critical: number;
  inactive: number;
}

// ============================================================================
// QUALITY STANDARD TYPES
// ============================================================================

export interface QualityStandardParameter {
  id: number;
  qualityStandardId: number;
  qualityParameterId: number;
  qualityParameterName?: string;
  minValue: number | null;
  maxValue: number | null;
  targetValue: number | null;
  isMandatory: boolean;
}

export interface QualityStandard {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description: string | null;
  standardType: string;
  productId: number | null;
  productName?: string;
  categoryId: number | null;
  version: number;
  status: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  parameters?: QualityStandardParameter[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQualityStandardDto {
  code: string;
  name: string;
  description?: string;
  standardType?: string;
  productId?: number;
  categoryId?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  parameters?: Omit<QualityStandardParameter, 'id' | 'qualityStandardId'>[];
  isActive?: boolean;
}

export interface UpdateQualityStandardDto extends Partial<CreateQualityStandardDto> {}

export interface QualityStandardQuery {
  page?: number;
  limit?: number;
  search?: string;
  standardType?: string;
  status?: string;
  productId?: number;
  isActive?: boolean;
}

export interface QualityStandardStats {
  total: number;
  active: number;
  draft: number;
  approved: number;
}

// ============================================================================
// QUALITY DEFECT TYPES
// ============================================================================

export interface QualityDefect {
  id: number;
  companyId: number;
  defectNumber: string;
  description: string;
  defectType: string;
  severity: string;
  defectCategory: string | null;
  productionOrderId: number | null;
  productionOrderNumber?: string;
  workCenterId: number | null;
  workCenterName?: string;
  quantityAffected: number | null;
  detectionDate: string | null;
  detectionPoint: string | null;
  rootCause: string | null;
  correctiveAction: string | null;
  status: string;
  resolvedAt: string | null;
  resolvedBy: number | null;
  qualityInspectionLineId: number | null;
  sourceType: string | null;
  sourceId: number | null;
  sourceNumber: string | null;
  itemCode: string | null;
  itemName: string | null;
  batchNumber: string | null;
  defectCode: string | null;
  uomId: number | null;
  defectLocation: string | null;
  warehouseId: number | null;
  rootCauseCategory: string | null;
  responsibility: string | null;
  responsibleUserId: number | null;
  supplierId: number | null;
  disposition: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  actionDueDate: string | null;
  actionCompletedDate: string | null;
  nonConformanceId: number | null;
  reportedAt: string | null;
  createdBy: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQualityDefectDto {
  code: string;
  name: string;
  description?: string;
  defectType?: string;
  severity?: string;
  category?: string;
  productId?: number;
  productionOrderId?: number;
  workCenterId?: number;
  quantity?: number;
  detectedAt?: string;
  detectedBy?: string;
  rootCause?: string;
  correctiveAction?: string;
  qualityInspectionLineId?: number;
  sourceType?: string;
  sourceId?: number;
  sourceNumber?: string;
  itemCode?: string;
  itemName?: string;
  batchNumber?: string;
  defectCode?: string;
  defectCategory?: string;
  uomId?: number;
  defectLocation?: string;
  warehouseId?: number;
  detectionDate?: string;
  detectionPoint?: string;
  rootCauseCategory?: string;
  responsibility?: string;
  responsibleUserId?: number;
  supplierId?: number;
  disposition?: string;
  estimatedCost?: number;
  actualCost?: number;
  actionDueDate?: string;
  actionCompletedDate?: string;
  nonConformanceId?: number;
  reportedAt?: string;
}

export interface UpdateQualityDefectDto extends Partial<CreateQualityDefectDto> {
  status?: string;
}

export interface QualityDefectQuery {
  page?: number;
  limit?: number;
  search?: string;
  defectType?: string;
  severity?: string;
  status?: string;
  productId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface QualityDefectStats {
  total: number;
  open: number;
  investigating: number;
  resolved: number;
  closed: number;
}

// ============================================================================
// NON-CONFORMANCE TYPES
// ============================================================================

export interface NonConformance {
  id: number;
  companyId: number;
  ncNumber: string;
  title: string;
  description: string | null;
  type: string;
  severity: string;
  sourceType: string;
  productId: number | null;
  productName?: string;
  productionOrderId: number | null;
  productionOrderNumber?: string;
  workCenterId: number | null;
  workCenterName?: string;
  quantityAffected: number;
  quantityRejected: number;
  disposition: string | null;
  rootCause: string | null;
  rootCauseCategory: string | null;
  correctiveAction: string | null;
  preventiveAction: string | null;
  containmentAction: string | null;
  costOfNonConformance: number;
  costOfCorrection: number;
  status: string;
  reportedById: number | null;
  reportedByName?: string;
  assignedToId: number | null;
  assignedToName?: string;
  detectedDate: string | null;
  dueDate: string | null;
  closedDate: string | null;
  category: string | null;
  occurrenceDate: string | null;
  discoveryDate: string | null;
  targetCloseDate: string | null;
  containmentCompleted: boolean;
  containmentCompletedAt: string | null;
  rootCauseMethod: string | null;
  rootCauseCompleted: boolean;
  rootCauseCompletedAt: string | null;
  correctiveActionCompleted: boolean;
  correctiveActionCompletedAt: string | null;
  preventiveActionCompleted: boolean;
  preventiveActionCompletedAt: string | null;
  verificationNotes: string | null;
  verificationCompleted: boolean;
  verificationCompletedAt: string | null;
  customerId: number | null;
  customerName: string | null;
  responsibleDepartmentId: number | null;
  effectivenessVerified: boolean;
  effectivenessReviewDate: string | null;
  effectivenessNotes: string | null;
  closureNotes: string | null;
  sourceId: number | null;
  sourceNumber: string | null;
  batchNumber: string | null;
  uomId: number | null;
  priority: string | null;
  supplierId: number | null;
  supplierName: string | null;
  responsibleUserId: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNonConformanceDto {
  title: string;
  description?: string;
  /** Backend field name: 'type' */
  type?: string;
  severity?: string;
  /** Backend field name: 'itemId' */
  itemId?: number;
  productionOrderId?: number;
  qualityCheckId?: number;
  qualityDefectId?: number;
  quantityAffected?: number;
  disposition?: string;
  costImpact?: number;
  rootCause?: string;
  correctiveAction?: string;
  containmentAction?: string;
  /** Backend field name: 'assignedTo' */
  assignedTo?: number;
  dueDate?: string;
  category?: string;
  occurrenceDate?: string;
  discoveryDate?: string;
  notes?: string;
}

export interface UpdateNonConformanceDto extends Partial<CreateNonConformanceDto> {
  status?: string;
}

export interface NonConformanceQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  severity?: string;
  status?: string;
  sourceType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface NonConformanceStats {
  total: number;
  open: number;
  investigating: number;
  resolved: number;
  closed: number;
  totalCost: number;
}

// ============================================================================
// FORECAST TYPES
// ============================================================================

export interface Forecast {
  id: number;
  companyId: number;
  itemId: number;
  warehouseId: number | null;
  forecastDate: string;
  forecastQuantity: number;
  actualQuantity: number | null;
  variance: number | null;
  variancePercent: number | null;
  period: string;
  method: string;
  confidenceLevel: number | null;
  notes: string | null;
  description: string | null;
  forecastType: string | null;
  numberOfPeriods: number | null;
  itemCategoryId: number | null;
  version: string | null;
  status: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  forecastAccuracy: number | null;
  mape: number | null;
  bias: number | null;
  isLocked: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateForecastDto {
  itemId: number;
  warehouseId?: number;
  forecastDate: string;
  forecastQuantity: number;
  actualQuantity?: number;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  method?: 'manual' | 'moving_average' | 'exponential_smoothing' | 'seasonal';
  confidenceLevel?: number;
  forecastType?: string;
  description?: string;
  notes?: string;
  numberOfPeriods?: number;
  itemCategoryId?: number;
}

export interface UpdateForecastDto extends Partial<CreateForecastDto> {}

export interface ForecastQuery {
  page?: number;
  limit?: number;
  search?: string;
  itemId?: number;
  warehouseId?: number;
  period?: string;
  method?: string;
  status?: string;
  isLocked?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface ForecastStats {
  total: number;
  draft: number;
  approved: number;
  active: number;
  totalForecastValue: number;
}

// ============================================================================
// MATERIAL ISSUE TYPES
// ============================================================================

export interface MaterialIssueLine {
  id: number;
  materialIssueId: number;
  productId: number;
  productName?: string;
  productCode?: string;
  requestedQuantity: number;
  issuedQuantity: number;
  uomId: number | null;
  uomName?: string;
  warehouseId: number | null;
  locationId: number | null;
  batchNumber: string | null;
  unitCost: number;
  totalCost: number;
  notes: string | null;
}

export interface MaterialIssue {
  id: number;
  companyId: number;
  issueNumber: string;
  productionOrderId: number;
  productionOrderNumber?: string;
  warehouseId: number | null;
  warehouseName?: string;
  issueType: string;
  status: string;
  issueDate: string;
  totalCost: number;
  lines?: MaterialIssueLine[];
  notes: string | null;
  issuedById: number | null;
  issuedByName?: string;
  approvedById: number | null;
  approvedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialIssueDto {
  productionOrderId: number;
  warehouseId?: number;
  issueType?: string;
  issueDate?: string;
  notes?: string;
  lines?: Omit<MaterialIssueLine, 'id' | 'materialIssueId' | 'issuedQuantity' | 'unitCost' | 'totalCost'>[];
}

export interface UpdateMaterialIssueDto extends Partial<CreateMaterialIssueDto> {}

export interface MaterialIssueQuery {
  page?: number;
  limit?: number;
  search?: string;
  productionOrderId?: number;
  issueType?: string;
  status?: string;
  warehouseId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface MaterialIssueStats {
  total: number;
  draft: number;
  issued: number;
  partiallyIssued: number;
  returned: number;
  totalCost: number;
}

// ============================================================================
// SHIFT PATTERN API
// ============================================================================

export const shiftPatternsApi = {
  list: async (query?: ShiftPatternQuery): Promise<PaginatedResponse<ShiftPattern>> => {
    const response = await api.get('/manufacturing/shift-patterns', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ShiftPattern> => {
    const response = await api.get(`/manufacturing/shift-patterns/${id}`);
    return response.data;
  },

  create: async (data: CreateShiftPatternDto): Promise<ShiftPattern> => {
    const response = await api.post('/manufacturing/shift-patterns', data);
    return response.data;
  },

  update: async (id: number, data: UpdateShiftPatternDto): Promise<ShiftPattern> => {
    const response = await api.patch(`/manufacturing/shift-patterns/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/shift-patterns/${id}`);
  },

  getStats: async (): Promise<ShiftPatternStats> => {
    const response = await api.get('/manufacturing/shift-patterns/stats');
    return response.data;
  },

  activate: async (id: number): Promise<ShiftPattern> => {
    const response = await api.post(`/manufacturing/shift-patterns/${id}/activate`);
    return response.data;
  },

  deactivate: async (id: number): Promise<ShiftPattern> => {
    const response = await api.post(`/manufacturing/shift-patterns/${id}/deactivate`);
    return response.data;
  },
};

// ============================================================================
// QUALITY PARAMETER API
// ============================================================================

export const qualityParametersApi = {
  list: async (query?: QualityParameterQuery): Promise<PaginatedResponse<QualityParameter>> => {
    const response = await api.get('/manufacturing/quality-parameters', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<QualityParameter> => {
    const response = await api.get(`/manufacturing/quality-parameters/${id}`);
    return response.data;
  },

  create: async (data: CreateQualityParameterDto): Promise<QualityParameter> => {
    const response = await api.post('/manufacturing/quality-parameters', data);
    return response.data;
  },

  update: async (id: number, data: UpdateQualityParameterDto): Promise<QualityParameter> => {
    const response = await api.patch(`/manufacturing/quality-parameters/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/quality-parameters/${id}`);
  },

  getStats: async (): Promise<QualityParameterStats> => {
    const response = await api.get('/manufacturing/quality-parameters/stats');
    return response.data;
  },
};

// ============================================================================
// QUALITY STANDARD API
// ============================================================================

export const qualityStandardsApi = {
  list: async (query?: QualityStandardQuery): Promise<PaginatedResponse<QualityStandard>> => {
    const response = await api.get('/manufacturing/quality-standards', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<QualityStandard> => {
    const response = await api.get(`/manufacturing/quality-standards/${id}`);
    return response.data;
  },

  create: async (data: CreateQualityStandardDto): Promise<QualityStandard> => {
    const response = await api.post('/manufacturing/quality-standards', data);
    return response.data;
  },

  update: async (id: number, data: UpdateQualityStandardDto): Promise<QualityStandard> => {
    const response = await api.patch(`/manufacturing/quality-standards/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/quality-standards/${id}`);
  },

  getStats: async (): Promise<QualityStandardStats> => {
    const response = await api.get('/manufacturing/quality-standards/stats');
    return response.data;
  },

  submitForApproval: async (id: number): Promise<QualityStandard> => {
    const response = await api.post(`/manufacturing/quality-standards/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, notes?: string): Promise<QualityStandard> => {
    const response = await api.post(`/manufacturing/quality-standards/${id}/approve`, { approvalNotes: notes });
    return response.data;
  },

  obsolete: async (id: number): Promise<QualityStandard> => {
    const response = await api.post(`/manufacturing/quality-standards/${id}/obsolete`);
    return response.data;
  },
};

// ============================================================================
// QUALITY DEFECT API
// ============================================================================

export const qualityDefectsApi = {
  list: async (query?: QualityDefectQuery): Promise<PaginatedResponse<QualityDefect>> => {
    const response = await api.get('/manufacturing/quality-defects', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<QualityDefect> => {
    const response = await api.get(`/manufacturing/quality-defects/${id}`);
    return response.data;
  },

  create: async (data: CreateQualityDefectDto): Promise<QualityDefect> => {
    const response = await api.post('/manufacturing/quality-defects', data);
    return response.data;
  },

  update: async (id: number, data: UpdateQualityDefectDto): Promise<QualityDefect> => {
    const response = await api.patch(`/manufacturing/quality-defects/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/quality-defects/${id}`);
  },

  getStats: async (): Promise<QualityDefectStats> => {
    const response = await api.get('/manufacturing/quality-defects/stats');
    return response.data;
  },

  investigate: async (id: number): Promise<QualityDefect> => {
    const response = await api.post(`/manufacturing/quality-defects/${id}/investigate`);
    return response.data;
  },

  resolve: async (id: number, data: { rootCause: string; correctiveAction: string }): Promise<QualityDefect> => {
    const response = await api.post(`/manufacturing/quality-defects/${id}/resolve`, data);
    return response.data;
  },

  close: async (id: number): Promise<QualityDefect> => {
    const response = await api.post(`/manufacturing/quality-defects/${id}/close`);
    return response.data;
  },

  reopen: async (id: number): Promise<QualityDefect> => {
    const response = await api.post(`/manufacturing/quality-defects/${id}/reopen`);
    return response.data;
  },
};

// ============================================================================
// NON-CONFORMANCE API
// ============================================================================

export const nonConformancesApi = {
  list: async (query?: NonConformanceQuery): Promise<PaginatedResponse<NonConformance>> => {
    const response = await api.get('/manufacturing/non-conformances', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<NonConformance> => {
    const response = await api.get(`/manufacturing/non-conformances/${id}`);
    return response.data;
  },

  create: async (data: CreateNonConformanceDto): Promise<NonConformance> => {
    const response = await api.post('/manufacturing/non-conformances', data);
    return response.data;
  },

  update: async (id: number, data: UpdateNonConformanceDto): Promise<NonConformance> => {
    const response = await api.patch(`/manufacturing/non-conformances/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/non-conformances/${id}`);
  },

  getStats: async (): Promise<NonConformanceStats> => {
    const response = await api.get('/manufacturing/non-conformances/stats');
    return response.data;
  },

  investigate: async (id: number): Promise<NonConformance> => {
    const response = await api.post(`/manufacturing/non-conformances/${id}/investigate`);
    return response.data;
  },

  resolve: async (id: number, data: { rootCause: string; correctiveAction: string; preventiveAction?: string }): Promise<NonConformance> => {
    const response = await api.post(`/manufacturing/non-conformances/${id}/resolve`, data);
    return response.data;
  },

  close: async (id: number): Promise<NonConformance> => {
    const response = await api.post(`/manufacturing/non-conformances/${id}/close`);
    return response.data;
  },

  reopen: async (id: number): Promise<NonConformance> => {
    const response = await api.post(`/manufacturing/non-conformances/${id}/reopen`);
    return response.data;
  },
};

// ============================================================================
// FORECAST API
// ============================================================================

export const forecastsApi = {
  list: async (query?: ForecastQuery): Promise<PaginatedResponse<Forecast>> => {
    const response = await api.get('/manufacturing/forecasts', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Forecast> => {
    const response = await api.get(`/manufacturing/forecasts/${id}`);
    return response.data;
  },

  create: async (data: CreateForecastDto): Promise<Forecast> => {
    const response = await api.post('/manufacturing/forecasts', data);
    return response.data;
  },

  update: async (id: number, data: UpdateForecastDto): Promise<Forecast> => {
    const response = await api.patch(`/manufacturing/forecasts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/forecasts/${id}`);
  },

  getStats: async (): Promise<ForecastStats> => {
    const response = await api.get('/manufacturing/forecasts/stats');
    return response.data;
  },

  submitForApproval: async (id: number): Promise<Forecast> => {
    const response = await api.post(`/manufacturing/forecasts/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<Forecast> => {
    const response = await api.post(`/manufacturing/forecasts/${id}/approve`);
    return response.data;
  },

  activate: async (id: number): Promise<Forecast> => {
    const response = await api.post(`/manufacturing/forecasts/${id}/activate`);
    return response.data;
  },

  archive: async (id: number): Promise<Forecast> => {
    const response = await api.post(`/manufacturing/forecasts/${id}/archive`);
    return response.data;
  },

  generateFromHistory: async (data: { productIds: number[]; periods: number; periodType: string }): Promise<Forecast> => {
    const response = await api.post('/manufacturing/forecasts/generate', data);
    return response.data;
  },
};

// ============================================================================
// MATERIAL ISSUE API
// ============================================================================

export const materialIssuesApi = {
  list: async (query?: MaterialIssueQuery): Promise<PaginatedResponse<MaterialIssue>> => {
    const response = await api.get('/manufacturing/material-issues', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<MaterialIssue> => {
    const response = await api.get(`/manufacturing/material-issues/${id}`);
    return response.data;
  },

  create: async (data: CreateMaterialIssueDto): Promise<MaterialIssue> => {
    const response = await api.post('/manufacturing/material-issues', data);
    return response.data;
  },

  update: async (id: number, data: UpdateMaterialIssueDto): Promise<MaterialIssue> => {
    const response = await api.patch(`/manufacturing/material-issues/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/material-issues/${id}`);
  },

  getStats: async (): Promise<MaterialIssueStats> => {
    const response = await api.get('/manufacturing/material-issues/stats');
    return response.data;
  },

  issue: async (id: number): Promise<MaterialIssue> => {
    const response = await api.post(`/manufacturing/material-issues/${id}/issue`);
    return response.data;
  },

  returnMaterial: async (id: number, data: { lines: { lineId: number; returnQuantity: number }[] }): Promise<MaterialIssue> => {
    const response = await api.post(`/manufacturing/material-issues/${id}/return`, data);
    return response.data;
  },

  approve: async (id: number): Promise<MaterialIssue> => {
    const response = await api.post(`/manufacturing/material-issues/${id}/approve`);
    return response.data;
  },

  cancel: async (id: number, reason: string): Promise<MaterialIssue> => {
    const response = await api.post(`/manufacturing/material-issues/${id}/cancel`, { reason });
    return response.data;
  },
};

// ============================================================================
// BATCH 7: Manufacturing Cost, Allocation, Work Instructions, Shift Patterns
// ============================================================================

// Manufacturing Cost Types
export enum CostCategory {
  MATERIAL = 'MATERIAL',
  LABOR = 'LABOR',
  OVERHEAD = 'OVERHEAD',
  SUBCONTRACT = 'SUBCONTRACT',
  OTHER = 'OTHER',
}

export enum CostType {
  STANDARD = 'STANDARD',
  ACTUAL = 'ACTUAL',
}

export enum VarianceType {
  FAVORABLE = 'FAVORABLE',
  UNFAVORABLE = 'UNFAVORABLE',
  NONE = 'NONE',
}

export interface ManufacturingCost {
  id: number;
  workOrderId: number;
  category: CostCategory;
  type: CostType;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  costCenterId?: number;
  accountCode?: string;
  referenceNumber?: string;
  costDate: string;
  notes?: string;
  productionOrderOperationId: number | null;
  costCategory: string | null;
  costCode: string | null;
  referenceId: number | null;
  uomId: number | null;
  standardCost: number | null;
  variance: number | null;
  variancePercentage: number | null;
  costAllocationRuleId: number | null;
  allocationPercentage: number | null;
  isAllocated: boolean;
  period: string | null;
  status: string | null;
  isPosted: boolean;
  journalEntryId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CostVariance {
  workOrderId: number;
  productCode: string;
  productName: string;
  quantity: number;
  totalStandardCost: number;
  totalActualCost: number;
  totalVariance: number;
  variancePercent: number;
  varianceType: VarianceType;
  materialStandardCost: number;
  materialActualCost: number;
  materialVariance: number;
  laborStandardCost: number;
  laborActualCost: number;
  laborVariance: number;
  overheadStandardCost: number;
  overheadActualCost: number;
  overheadVariance: number;
}

export interface CostRollup {
  workOrderId: number;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  standardCosts: {
    material: number;
    labor: number;
    overhead: number;
    total: number;
  };
  actualCosts: {
    material: number;
    labor: number;
    overhead: number;
    total: number;
  };
  variance: {
    material: number;
    labor: number;
    overhead: number;
    total: number;
  };
}

// Cost Allocation Types
export enum AllocationDriver {
  MACHINE_HOURS = 'MACHINE_HOURS',
  LABOR_HOURS = 'LABOR_HOURS',
  LABOR_COST = 'LABOR_COST',
  MATERIAL_COST = 'MATERIAL_COST',
  UNITS_PRODUCED = 'UNITS_PRODUCED',
  SQUARE_FOOTAGE = 'SQUARE_FOOTAGE',
  HEADCOUNT = 'HEADCOUNT',
}

export enum AllocationMethod {
  DIRECT = 'DIRECT',
  STEP_DOWN = 'STEP_DOWN',
  RECIPROCAL = 'RECIPROCAL',
  ACTIVITY_BASED = 'ACTIVITY_BASED',
}

export interface CostAllocationRule {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description?: string;
  allocationMethod: AllocationMethod;
  driver: AllocationDriver;
  sourceCostCenterId: number;
  targetCostCenterIds: number[];
  allocationPercent?: number;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  rateUom: string | null;
  costCenterId: number | null;
  targetType: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AllocationResult {
  ruleId: number;
  ruleName: string;
  totalAmountAllocated: number;
  allocations: {
    costCenterId: number;
    costCenterName: string;
    driverValue: number;
    allocationPercent: number;
    allocatedAmount: number;
  }[];
}

// Work Instruction Types
export enum InstructionType {
  STANDARD = 'STANDARD',
  SAFETY = 'SAFETY',
  QUALITY = 'QUALITY',
  SETUP = 'SETUP',
  CHANGEOVER = 'CHANGEOVER',
  MAINTENANCE = 'MAINTENANCE',
  TROUBLESHOOTING = 'TROUBLESHOOTING',
}

export enum InstructionStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  REVISED = 'REVISED',
  OBSOLETE = 'OBSOLETE',
}

export interface WorkInstruction {
  id: number;
  companyId: number;
  code: string;
  title: string;
  description?: string;
  type: InstructionType;
  status: InstructionStatus;
  version: string;
  productId?: number;
  operationId?: number;
  workCenterId?: number;
  steps: InstructionStep[];
  estimatedTime?: number;
  skillLevel?: string;
  safetyRequirements?: string;
  toolsRequired?: string[];
  attachments?: Attachment[];
  reviewedById?: number;
  reviewedAt?: string;
  approvedById?: number;
  approvedAt?: string;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstructionStep {
  stepNumber: number;
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  estimatedDuration?: number;
  safetyNotes?: string;
}

export interface Attachment {
  filename: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

// Shift Pattern Types (already exists in Prisma but no frontend)
// NOTE: ShiftPattern interface is defined above (line ~733) with full shift pattern details.
// Using the existing ShiftPattern interface for the batch 7 API below.

// ============================================================================
// MANUFACTURING COST API
// ============================================================================

export const manufacturingCostsApi = {
  list: async (query?: { workOrderId?: number; category?: CostCategory; type?: CostType }): Promise<ManufacturingCost[]> => {
    const response = await api.get('/manufacturing/manufacturing-costs', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ManufacturingCost> => {
    const response = await api.get(`/manufacturing/manufacturing-costs/${id}`);
    return response.data;
  },

  create: async (data: Omit<ManufacturingCost, 'id' | 'createdAt' | 'updatedAt'>): Promise<ManufacturingCost> => {
    const response = await api.post('/manufacturing/manufacturing-costs', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Omit<ManufacturingCost, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ManufacturingCost> => {
    const response = await api.patch(`/manufacturing/manufacturing-costs/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/manufacturing-costs/${id}`);
  },

  getCostRollup: async (workOrderId: number): Promise<CostRollup> => {
    const response = await api.get(`/manufacturing/manufacturing-costs/work-orders/${workOrderId}/cost-rollup`);
    return response.data;
  },

  getVarianceAnalysis: async (workOrderId: number): Promise<CostVariance> => {
    const response = await api.get(`/manufacturing/manufacturing-costs/work-orders/${workOrderId}/variance-analysis`);
    return response.data;
  },

  getMaterialVariance: async (workOrderId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/manufacturing/manufacturing-costs/work-orders/${workOrderId}/material-variance`);
    return response.data;
  },

  getLaborVariance: async (workOrderId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/manufacturing/manufacturing-costs/work-orders/${workOrderId}/labor-variance`);
    return response.data;
  },

  getOverheadVariance: async (workOrderId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/manufacturing/manufacturing-costs/work-orders/${workOrderId}/overhead-variance`);
    return response.data;
  },
};

// ============================================================================
// COST ALLOCATION API
// ============================================================================

export const costAllocationApi = {
  list: async (query?: { companyId?: number; isActive?: boolean }): Promise<CostAllocationRule[]> => {
    const response = await api.get('/manufacturing/cost-allocation', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<CostAllocationRule> => {
    const response = await api.get(`/manufacturing/cost-allocation/${id}`);
    return response.data;
  },

  create: async (data: Omit<CostAllocationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<CostAllocationRule> => {
    const response = await api.post('/manufacturing/cost-allocation', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Omit<CostAllocationRule, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CostAllocationRule> => {
    const response = await api.patch(`/manufacturing/cost-allocation/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/cost-allocation/${id}`);
  },

  runAllocation: async (ruleId: number, periodStart: string, periodEnd: string): Promise<AllocationResult> => {
    const response = await api.post(`/manufacturing/cost-allocation/${ruleId}/run`, {
      periodStart,
      periodEnd,
    });
    return response.data;
  },

  validateRules: async (companyId: number): Promise<{ valid: boolean; errors: string[] }> => {
    const response = await api.get(`/manufacturing/cost-allocation/validate/${companyId}`);
    return response.data;
  },
};

// ============================================================================
// WORK INSTRUCTIONS API
// ============================================================================

export const workInstructionsApi = {
  list: async (query?: { type?: InstructionType; status?: InstructionStatus; productId?: number }): Promise<WorkInstruction[]> => {
    const response = await api.get('/manufacturing/work-instructions', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<WorkInstruction> => {
    const response = await api.get(`/manufacturing/work-instructions/${id}`);
    return response.data;
  },

  create: async (data: Omit<WorkInstruction, 'id' | 'createdAt' | 'updatedAt' | 'version'> & { version?: string }): Promise<WorkInstruction> => {
    const response = await api.post('/manufacturing/work-instructions', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Omit<WorkInstruction, 'id' | 'createdAt' | 'updatedAt'>>): Promise<WorkInstruction> => {
    const response = await api.patch(`/manufacturing/work-instructions/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/work-instructions/${id}`);
  },

  submitForApproval: async (id: number): Promise<WorkInstruction> => {
    const response = await api.post(`/manufacturing/work-instructions/${id}/submit-for-approval`);
    return response.data;
  },

  approve: async (id: number): Promise<WorkInstruction> => {
    const response = await api.post(`/manufacturing/work-instructions/${id}/approve`);
    return response.data;
  },

  activate: async (id: number): Promise<WorkInstruction> => {
    const response = await api.post(`/manufacturing/work-instructions/${id}/activate`);
    return response.data;
  },

  revise: async (id: number, changes: string): Promise<WorkInstruction> => {
    const response = await api.post(`/manufacturing/work-instructions/${id}/revise`, { changes });
    return response.data;
  },

  markObsolete: async (id: number, reason: string): Promise<WorkInstruction> => {
    const response = await api.post(`/manufacturing/work-instructions/${id}/mark-obsolete`, { reason });
    return response.data;
  },

  logExecution: async (id: number, data: { employeeId: number; duration: number; notes?: string }): Promise<void> => {
    await api.post(`/manufacturing/work-instructions/${id}/execution-log`, data);
  },

  getAnalytics: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/manufacturing/work-instructions/${id}/analytics`);
    return response.data;
  },
};

// NOTE: shiftPatternsApi is defined above (line ~1207) with full CRUD + stats + activate/deactivate.
// The duplicate has been removed.

// ============================================================================
// QUALITY INSPECTION TYPES
// ============================================================================

export type QualityInspectionType = 'incoming' | 'in_process' | 'final' | 'periodic' | 'random';
export type QualityInspectionStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'conditional' | 'on_hold' | 'cancelled';

export interface QualityInspection {
  id: number;
  companyId: number;
  inspectionNumber: string;
  inspectionType: QualityInspectionType;
  qualityStandardId: number | null;
  qualityStandardName?: string;
  productionOrderId: number | null;
  productionOrderNumber?: string;
  workCenterId: number | null;
  workCenterName?: string;
  inspectorId: number | null;
  inspectorName?: string;
  inspectionDate: string;
  totalQuantity: number;
  sampleQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  status: QualityInspectionStatus;
  overallResult: string | null;
  notes: string | null;
  sourceType: string | null;
  sourceId: number | null;
  sourceNumber: string | null;
  priority: string;
  itemCode: string | null;
  itemName: string | null;
  inspectedQuantity: number;
  startedAt: string | null;
  completedAt: string | null;
  result: string | null;
  passRate: number;
  disposition: string | null;
  dispositionNotes: string | null;
  dispositionById: number | null;
  dispositionAt: string | null;
  supplierId: number | null;
  supplierName: string | null;
  equipmentUsed: string | null;
  correctiveActions: string | null;
  batchNumber: string | null;
  uomId: number | null;
  dueDate: string | null;
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQualityInspectionDto {
  inspectionType: QualityInspectionType;
  qualityStandardId?: number;
  productionOrderId?: number;
  workCenterId?: number;
  inspectorId?: number;
  inspectionDate: string;
  totalQuantity: number;
  sampleQuantity: number;
  passedQuantity?: number;
  failedQuantity?: number;
  notes?: string;
  batchNumber?: string;
  uomId?: number;
  dueDate?: string;
}

export interface UpdateQualityInspectionDto extends Partial<CreateQualityInspectionDto> {
  status?: QualityInspectionStatus;
  overallResult?: string;
}

export interface QualityInspectionQuery {
  page?: number;
  limit?: number;
  search?: string;
  inspectionType?: QualityInspectionType;
  status?: QualityInspectionStatus;
  productionOrderId?: number;
  workCenterId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface QualityInspectionStats {
  total: number;
  pending: number;
  passed: number;
  failed: number;
  inProgress: number;
}

// ============================================================================
// QUALITY INSPECTION API
// ============================================================================

export const qualityInspectionsApi = {
  list: async (query?: QualityInspectionQuery): Promise<PaginatedResponse<QualityInspection>> => {
    const response = await api.get('/manufacturing/quality-inspections', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<QualityInspection> => {
    const response = await api.get(`/manufacturing/quality-inspections/${id}`);
    return response.data;
  },

  create: async (data: CreateQualityInspectionDto): Promise<QualityInspection> => {
    const response = await api.post('/manufacturing/quality-inspections', data);
    return response.data;
  },

  update: async (id: number, data: UpdateQualityInspectionDto): Promise<QualityInspection> => {
    const response = await api.put(`/manufacturing/quality-inspections/${id}`, data);
    return response.data;
  },

  recordResults: async (id: number, data: Record<string, unknown>): Promise<QualityInspection> => {
    const response = await api.post(`/manufacturing/quality-inspections/${id}/results`, data);
    return response.data;
  },

  complete: async (id: number, data: { overallResult: string; notes?: string }): Promise<QualityInspection> => {
    const response = await api.post(`/manufacturing/quality-inspections/${id}/complete`, data);
    return response.data;
  },

  // Super Admin only. Reopens a PASSED/FAILED inspection back to IN_PROGRESS so
  // results can be corrected. Backend returns 409 DOWNSTREAM_PRODUCTION_ACTIVITY
  // or DOWNSTREAM_PURCHASE_ACTIVITY if downstream operations have already used
  // this inspection's outcome — the caller should surface the message and tell
  // the user to reverse the production order or GRN first.
  reopen: async (id: number, reason: string): Promise<QualityInspection> => {
    const response = await api.post(`/manufacturing/quality-inspections/${id}/reopen`, { reason });
    return response.data;
  },
};

// ============================================================================
// MRP API TYPES
// ============================================================================

export interface MrpRun {
  id: number;
  companyId: number;
  runNumber: string;
  name: string;
  description: string | null;
  status: string;
  planningHorizonDays: number;
  startDate: string;
  endDate: string;
  executedAt: string | null;
  completedAt: string | null;
  totalPlannedOrders: number;
  totalRequirements: number;
  runName: string | null;
  runType: string;
  isSimulation: boolean;
  frozenPeriodDays: number | null;
  includeReorderPoints: boolean;
  progressPercentage: number;
  errorMessage: string | null;
  executionTimeSeconds: number;
  itemsProcessed: number;
  plannedOrdersCreated: number;
  exceptionsFound: number;
  includePlannedOrders: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlannedOrder {
  id: number;
  companyId: number;
  mrpRunId: number;
  productId: number;
  productName?: string;
  productCode?: string;
  orderType: string;
  quantity: number;
  uomId: number | null;
  plannedStartDate: string;
  plannedEndDate: string;
  dueDate: string;
  status: string;
  priority: string;
  firmedAt: string | null;
  releasedAt: string | null;
  itemCode: string | null;
  itemName: string | null;
  orderedQuantity: number | null;
  openQuantity: number | null;
  leadTimeDays: number | null;
  releaseDate: string | null;
  isInFrozenPeriod: boolean;
  urgency: string | null;
  supplierName: string | null;
  workCenterId: number | null;
  isConverted: boolean;
  convertedOrderType: string | null;
  convertedOrderNumber: string | null;
  convertedAt: string | null;
  convertedBy: number | null;
  hasException: boolean;
  exceptionType: string | null;
  exceptionMessage: string | null;
  parentDemandId: number | null;
  peggedQuantity: number | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MrpRunQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface PlannedOrderQuery {
  page?: number;
  limit?: number;
  search?: string;
  mrpRunId?: number;
  status?: string;
  orderType?: string;
}

// ============================================================================
// MRP API
// ============================================================================

export const mrpApi = {
  runs: {
    list: async (query?: MrpRunQuery): Promise<PaginatedResponse<MrpRun>> => {
      const response = await api.get('/manufacturing/mrp/runs', { params: query });
      return response.data;
    },

    get: async (id: number): Promise<MrpRun> => {
      const response = await api.get(`/manufacturing/mrp/runs/${id}`);
      return response.data;
    },

    create: async (data: Record<string, unknown>): Promise<MrpRun> => {
      const response = await api.post('/manufacturing/mrp/runs', data);
      return response.data;
    },

    execute: async (id: number): Promise<MrpRun> => {
      const response = await api.post(`/manufacturing/mrp/runs/${id}/execute`);
      return response.data;
    },
  },

  plannedOrders: {
    list: async (query?: PlannedOrderQuery): Promise<PaginatedResponse<PlannedOrder>> => {
      const response = await api.get('/manufacturing/mrp/planned-orders', { params: query });
      return response.data;
    },

    get: async (id: number): Promise<PlannedOrder> => {
      const response = await api.get(`/manufacturing/mrp/planned-orders/${id}`);
      return response.data;
    },

    firm: async (id: number, data?: Record<string, unknown>): Promise<PlannedOrder> => {
      const response = await api.post(`/manufacturing/mrp/planned-orders/${id}/firm`, data);
      return response.data;
    },

    release: async (id: number, data?: Record<string, unknown>): Promise<PlannedOrder> => {
      const response = await api.post(`/manufacturing/mrp/planned-orders/${id}/release`, data);
      return response.data;
    },

    bulkRelease: async (data: { plannedOrderIds: number[] }): Promise<Record<string, unknown>> => {
      const response = await api.post('/manufacturing/mrp/planned-orders/bulk-release', data);
      return response.data;
    },
  },
};

// ============================================================================
// MANUFACTURING SETTINGS TYPES
// ============================================================================

export interface ManufacturingSetting {
  id: number;
  companyId: number;
  // BOM
  maxBomLevels: number;
  allowCircularBomCheck: boolean;
  defaultBomStatus: string;
  requireBomApproval: boolean;
  // Production Order
  autoGeneratePoNumber: boolean;
  poNumberPrefix: string;
  poNumberNextSequence: number;
  defaultIssueMethod: string;
  allowOverReceipt: boolean;
  overReceiptTolerancePercent: number;
  allowUnderReceipt: boolean;
  underReceiptTolerancePercent: number;
  autoCloseCompletedOrders: boolean;
  // MRP
  mrpPlanningHorizonDays: number;
  mrpTimeFenceDays: number;
  mrpLotSizingMethod: string;
  mrpDefaultLeadTimeDays: number;
  mrpSafetyStockMethod: string;
  mrpIncludeSafetyStock: boolean;
  mrpAutoFirmWithinFence: boolean;
  // Capacity
  enableFiniteScheduling: boolean;
  schedulingDirection: string;
  considerQueueTime: boolean;
  considerMoveTime: boolean;
  defaultEfficiencyPercent: number;
  defaultUtilizationPercent: number;
  // Quality
  requireFirstArticleInspection: boolean;
  requireInProcessInspection: boolean;
  requireFinalInspection: boolean;
  inspectionSamplingMethod: string;
  defaultAqlLevel: string;
  autoCreateNcrOnFail: boolean;
  ncrRequiresDisposition: boolean;
  capaRequiredForCriticalNcr: boolean;
  // Costing
  costingMethod: string;
  laborRateSource: string;
  overheadAllocationBasis: string;
  // Warehouses
  defaultRawMaterialWarehouseId: number | null;
  defaultWipWarehouseId: number | null;
  defaultFinishedGoodsWarehouseId: number | null;
  defaultScrapWarehouseId: number | null;
  // Traceability
  enforceLotTraceability: boolean;
  autoGenerateProductionBatch: boolean;
  productionBatchFormat: string;
  linkInputLotsToOutput: boolean;
  // Approval
  poApprovalRequired: boolean;
  materialIssueApprovalRequired: boolean;
  receiptApprovalRequired: boolean;
  ncrApprovalRequired: boolean;
  capaApprovalRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateManufacturingSettingDto extends Partial<Omit<ManufacturingSetting, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>> {}

// ============================================================================
// WORK CENTER CALENDAR & EXCEPTION TYPES
// ============================================================================

export interface WorkCenterCalendar {
  id: number;
  workCenterId: number;
  shiftPatternId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  capacityHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkCenterCalendarDto {
  shiftPatternId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  capacityHours?: number;
  isActive?: boolean;
}

export interface WorkCenterException {
  id: number;
  workCenterId: number;
  exceptionDate: string;
  exceptionType: string;
  isWorkingDay: boolean;
  startTime: string | null;
  endTime: string | null;
  capacityHours: number | null;
  reason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkCenterExceptionDto {
  exceptionDate: string;
  exceptionType: string;
  isWorkingDay?: boolean;
  startTime?: string;
  endTime?: string;
  capacityHours?: number;
  reason?: string;
  notes?: string;
}

// ============================================================================
// PRODUCTION SCHEDULE TYPES
// ============================================================================

export interface ProductionSchedule {
  id: number;
  companyId: number;
  scheduleDate: string;
  shiftPatternId: number | null;
  workCenterId: number;
  productionOrderId: number | null;
  productionOrderOperationId: number | null;
  productId: number | null;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledHours: number;
  actualStart: string | null;
  actualEnd: string | null;
  actualHours: number;
  plannedQuantity: number;
  actualQuantity: number;
  sequence: number;
  priority: number;
  status: string;
  plannedHeadcount: number;
  actualHeadcount: number;
  capacityUsedPercent: number;
  isOvertime: boolean;
  notes: string | null;
  hasConflict: boolean;
  conflictReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductionScheduleDto {
  scheduleDate: string;
  workCenterId: number;
  scheduledStart: string;
  scheduledEnd: string;
  shiftPatternId?: number;
  productionOrderId?: number;
  productionOrderOperationId?: number;
  productId?: number;
  scheduledHours?: number;
  plannedQuantity?: number;
  sequence?: number;
  priority?: number;
  plannedHeadcount?: number;
  isOvertime?: boolean;
  notes?: string;
}

export interface UpdateProductionScheduleDto extends Partial<CreateProductionScheduleDto> {
  status?: string;
  actualStart?: string;
  actualEnd?: string;
  actualHours?: number;
  actualQuantity?: number;
  actualHeadcount?: number;
}

export interface ProductionScheduleQuery {
  page?: number;
  limit?: number;
  workCenterId?: number;
  productionOrderId?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// MANUFACTURING SETTINGS API
// ============================================================================

export const manufacturingSettingsApi = {
  get: async (): Promise<ManufacturingSetting> => {
    const response = await api.get('/manufacturing/settings');
    return response.data;
  },

  update: async (data: UpdateManufacturingSettingDto): Promise<ManufacturingSetting> => {
    const response = await api.patch('/manufacturing/settings', data);
    return response.data;
  },
};

// ============================================================================
// WORK CENTER CALENDAR API
// ============================================================================

export const workCenterCalendarsApi = {
  list: async (workCenterId: number): Promise<WorkCenterCalendar[]> => {
    const response = await api.get(`/manufacturing/work-centers/${workCenterId}/calendars`);
    return response.data;
  },

  create: async (workCenterId: number, data: CreateWorkCenterCalendarDto): Promise<WorkCenterCalendar> => {
    const response = await api.post(`/manufacturing/work-centers/${workCenterId}/calendars`, data);
    return response.data;
  },

  delete: async (workCenterId: number, calendarId: number): Promise<void> => {
    await api.delete(`/manufacturing/work-centers/${workCenterId}/calendars/${calendarId}`);
  },

  // Exceptions
  listExceptions: async (workCenterId: number, query?: { dateFrom?: string; dateTo?: string; exceptionType?: string }): Promise<WorkCenterException[]> => {
    const response = await api.get(`/manufacturing/work-centers/${workCenterId}/exceptions`, { params: query });
    return response.data;
  },

  createException: async (workCenterId: number, data: CreateWorkCenterExceptionDto): Promise<WorkCenterException> => {
    const response = await api.post(`/manufacturing/work-centers/${workCenterId}/exceptions`, data);
    return response.data;
  },

  updateException: async (workCenterId: number, exceptionId: number, data: Partial<CreateWorkCenterExceptionDto>): Promise<WorkCenterException> => {
    const response = await api.patch(`/manufacturing/work-centers/${workCenterId}/exceptions/${exceptionId}`, data);
    return response.data;
  },

  deleteException: async (workCenterId: number, exceptionId: number): Promise<void> => {
    await api.delete(`/manufacturing/work-centers/${workCenterId}/exceptions/${exceptionId}`);
  },
};

// ============================================================================
// PRODUCTION SCHEDULE API
// ============================================================================

export const productionSchedulesApi = {
  list: async (query?: ProductionScheduleQuery): Promise<PaginatedResponse<ProductionSchedule>> => {
    const response = await api.get('/manufacturing/schedules', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ProductionSchedule> => {
    const response = await api.get(`/manufacturing/schedules/${id}`);
    return response.data;
  },

  create: async (data: CreateProductionScheduleDto): Promise<ProductionSchedule> => {
    const response = await api.post('/manufacturing/schedules', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProductionScheduleDto): Promise<ProductionSchedule> => {
    const response = await api.patch(`/manufacturing/schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/schedules/${id}`);
  },
};

// ============================================================================
// PRODUCTION SHIFT TYPES
// ============================================================================

export interface ProductionShift {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description: string | null;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  totalHours: number;
  breakHours: number;
  workingHours: number;
  breaks: Record<string, unknown>[] | null;
  daysOfWeek: number[] | null;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  workCenterId: number | null;
  defaultHeadcount: number;
  capacityFactor: number;
  laborRateMultiplier: number;
  isOvertime: boolean;
  isNightShift: boolean;
  color: string | null;
  isActive: boolean;
  createdBy: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductionShiftDto {
  code: string;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  crossesMidnight?: boolean;
  totalHours?: number;
  breakHours?: number;
  workingHours?: number;
  breaks?: Record<string, unknown>[];
  daysOfWeek?: number[];
  monday?: boolean;
  tuesday?: boolean;
  wednesday?: boolean;
  thursday?: boolean;
  friday?: boolean;
  saturday?: boolean;
  sunday?: boolean;
  workCenterId?: number;
  defaultHeadcount?: number;
  capacityFactor?: number;
  laborRateMultiplier?: number;
  isOvertime?: boolean;
  isNightShift?: boolean;
  color?: string;
  isActive?: boolean;
}

export interface UpdateProductionShiftDto extends Partial<CreateProductionShiftDto> {}

export interface ProductionShiftQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  isOvertime?: boolean;
  isNightShift?: boolean;
  workCenterId?: number;
}

export interface ProductionShiftStats {
  total: number;
  active: number;
  inactive: number;
  overtime: number;
  nightShift: number;
}

// ============================================================================
// PRODUCTION SHIFT API
// ============================================================================

export const productionShiftsApi = {
  list: async (query?: ProductionShiftQuery): Promise<PaginatedResponse<ProductionShift>> => {
    const response = await api.get('/manufacturing/production-shifts', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ProductionShift> => {
    const response = await api.get(`/manufacturing/production-shifts/${id}`);
    return response.data;
  },

  create: async (data: CreateProductionShiftDto): Promise<ProductionShift> => {
    const response = await api.post('/manufacturing/production-shifts', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProductionShiftDto): Promise<ProductionShift> => {
    const response = await api.patch(`/manufacturing/production-shifts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/production-shifts/${id}`);
  },

  getStats: async (): Promise<ProductionShiftStats> => {
    const response = await api.get('/manufacturing/production-shifts/stats');
    return response.data;
  },
};

// ============================================================================
// QC AUTHORIZATION API
// ============================================================================

export interface QcAuthorization {
  id: number;
  companyId: number;
  roleId: number | null;
  roleName?: string;
  employeeId: number | null;
  employeeName?: string;
  employeeCode?: string;
  canApprove: boolean;
  canReject: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const qcAuthorizationsApi = {
  list: async (query?: { search?: string }): Promise<{ data: QcAuthorization[]; total: number }> => {
    const response = await api.get('/manufacturing/qc-authorizations', { params: query });
    return response.data;
  },

  create: async (data: {
    type: 'role' | 'employee';
    roleId?: number;
    employeeId?: number;
    canApprove?: boolean;
    canReject?: boolean;
  }): Promise<QcAuthorization> => {
    const response = await api.post('/manufacturing/qc-authorizations', data);
    return response.data;
  },

  update: async (id: number, data: {
    canApprove?: boolean;
    canReject?: boolean;
    isActive?: boolean;
  }): Promise<QcAuthorization> => {
    const response = await api.put(`/manufacturing/qc-authorizations/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/manufacturing/qc-authorizations/${id}`);
  },

  checkAuthorization: async (action: 'approve' | 'reject' = 'approve'): Promise<{ authorized: boolean }> => {
    const response = await api.get('/manufacturing/qc-authorizations/check', { params: { action } });
    return response.data;
  },
};

// ============================================================================
// SHOP FLOOR DASHBOARD
// ============================================================================

export interface WorkCenterOeeSummary {
  workCenterId: number;
  workCenterName: string;
  workCenterCode: string;
  status: string;
  oeeTarget: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  totalCount: number | null;
  goodCount: number | null;
}

export interface ActiveProductionOrder {
  id: number;
  orderNumber: string;
  productName: string;
  status: string;
  quantity: number;
  completedQuantity: number;
  scrapQuantity: number;
  progressPercentage: number;
  priority: string;
  dueDate: string | null;
}

export interface ActiveAlarm {
  id: number;
  alarmName: string;
  severity: string;
  status: string;
  triggerValue: number;
  thresholdValue: number;
  deviceName: string;
  tagName: string;
  triggeredAt: string;
  acknowledgedAt: string | null;
}

export interface DeviceStatusSummary {
  id: number;
  code: string;
  name: string;
  deviceType: string;
  status: string;
  lastSeenAt: string | null;
  lastErrorMessage: string | null;
}

export interface LiveMetric {
  tagId: number;
  tagName: string;
  currentValue: string | null;
  quality: string;
  unit: string | null;
  deviceName: string;
  deviceCode: string;
  metricType: string;
}

export interface ShopFloorDashboardData {
  oee: WorkCenterOeeSummary[];
  production: ActiveProductionOrder[];
  alarms: ActiveAlarm[];
  devices: DeviceStatusSummary[];
  metrics: LiveMetric[];
  generatedAt: string;
}

export interface DispatchableOrder {
  orderId: number;
  orderNumber: string;
  status: string;
  quantity: number;
  completedQuantity: number;
  batchNumber: string;
  productId: number;
  productName: string;
  productCode: string;
  barcode: string;
  workCenterId: number | null;
  workCenterName: string | null;
  deviceId: number | null;
  deviceName: string | null;
  deviceCode: string | null;
  deviceStatus: string | null;
}

export const shopFloorDashboardApi = {
  get: async (): Promise<ShopFloorDashboardData> => {
    const response = await api.get('/manufacturing/shop-floor-dashboard');
    return response.data;
  },
  getDispatchableOrders: async (): Promise<DispatchableOrder[]> => {
    const response = await api.get('/manufacturing/shop-floor-dashboard/dispatchable-orders');
    return response.data;
  },
};

// ============================================================================
// COMBINED MANUFACTURING API (convenience wrapper)
// ============================================================================

export const manufacturingApi = {
  boms: bomsApi,
  workCenters: workCentersApi,
  routings: routingsApi,
  productionOrders: productionOrdersApi,
  shiftPatterns: shiftPatternsApi,
  qualityParameters: qualityParametersApi,
  qualityStandards: qualityStandardsApi,
  qualityInspections: qualityInspectionsApi,
  qualityDefects: qualityDefectsApi,
  nonConformances: nonConformancesApi,
  forecasts: forecastsApi,
  materialIssues: materialIssuesApi,
  costs: manufacturingCostsApi,
  costAllocation: costAllocationApi,
  workInstructions: workInstructionsApi,
  mrp: mrpApi,
  settings: manufacturingSettingsApi,
  calendars: workCenterCalendarsApi,
  schedules: productionSchedulesApi,
  productionShifts: productionShiftsApi,
  shopFloorDashboard: shopFloorDashboardApi,
};

// ============================================================================
// SPC ANALYSIS
// ============================================================================

export interface SpcParameterOption {
  id: number;
  code: string;
  name: string;
  unit: string | null;
  dataPointCount: number;
}

export interface SpcDataPoint {
  inspectionId: number;
  inspectionNumber: string;
  date: string;
  value: number;
  range: number;
  passed: boolean;
  outOfControl: boolean;
  warning: boolean;
}

export interface SpcChartData {
  parameter: {
    id: number;
    code: string;
    name: string;
    unit: string | null;
    targetValue: number | null;
    minValue: number | null;
    maxValue: number | null;
  };
  settings: {
    controlLimitSigma: number;
    warningLimitSigma: number;
    minSamples: number;
  };
  stats: {
    mean: number;
    rangeMean: number;
    stdDev: number;
    ucl: number;
    lcl: number;
    uwl: number;
    lwl: number;
    rUcl: number;
    rLcl: number;
    cp: number | null;
    cpk: number | null;
    totalPoints: number;
    outOfControlCount: number;
    warningCount: number;
  };
  data: SpcDataPoint[];
}

// ============================================================================
// ENERGY MONITORING
// ============================================================================

export interface EnergyCurrentReading {
  workCenterId: number;
  workCenterName: string;
  workCenterCode: string;
  tagId: number;
  tagName: string;
  metricType: string;
  currentValue: number | null;
  unit: string | null;
  deviceName: string;
  quality: string;
  lastUpdated: string | null;
}

export interface EnergyTrendPoint {
  recordedAt: string;
  value: number;
  workCenterName: string;
}

export interface EnergyDailySummary {
  date: string;
  workCenterId: number;
  workCenterName: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  readingCount: number;
}

export interface EnergyDashboardData {
  current: EnergyCurrentReading[];
  trend: EnergyTrendPoint[];
  daily: EnergyDailySummary[];
  stats: {
    totalWorkCenters: number;
    totalReadings: number;
    currentTotalPower: number;
    avgDailyEnergy: number;
    peakTodayValue: number;
    peakTodayWorkCenter: string | null;
  };
  generatedAt: string;
}

export const energyApi = {
  getDashboard: async (days?: number): Promise<EnergyDashboardData> => {
    const response = await api.get('/manufacturing/energy', { params: days ? { days } : {} });
    return response.data;
  },
};

// ============================================================================
// PREDICTIVE MAINTENANCE
// ============================================================================

export interface WorkCenterHealthScore {
  workCenterId: number;
  workCenterName: string;
  workCenterCode: string;
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedMaintenanceDays: number | null;
  lastMaintenanceDate: string | null;
  signals: {
    oeeScore: number;
    oeeTrend: 'stable' | 'declining' | 'improving';
    alarmScore: number;
    alarmCount7d: number;
    alarmCount30d: number;
    energyScore: number;
    energyTrend: 'stable' | 'rising' | 'falling';
    connectivityScore: number;
    errorCount7d: number;
    runHoursScore: number;
    totalRunHours30d: number;
  };
  topIssues: string[];
}

export interface PredictiveMaintenanceDashboard {
  workCenters: WorkCenterHealthScore[];
  summary: {
    totalWorkCenters: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    avgHealthScore: number;
  };
  generatedAt: string;
}

export const predictiveMaintenanceApi = {
  getDashboard: async (): Promise<PredictiveMaintenanceDashboard> => {
    const response = await api.get('/manufacturing/predictive-maintenance');
    return response.data;
  },
};

export const spcApi = {
  getParameters: async (): Promise<SpcParameterOption[]> => {
    const response = await api.get('/manufacturing/spc/parameters');
    return response.data;
  },
  getChartData: async (parameterId: number, filters?: {
    dateFrom?: string; dateTo?: string; productId?: number; workCenterId?: number;
  }): Promise<SpcChartData> => {
    const response = await api.get(`/manufacturing/spc/chart/${parameterId}`, { params: filters });
    return response.data;
  },
};
