import { api } from '../api';

// ============================================================================
// TYPES
// ============================================================================

export type HatcheryMachineType = 'SETTER' | 'HATCHER' | 'COMBO';
export type HatcheryMachineStatus = 'ACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';
export type HatcheryEggSourceType = 'IMPORT' | 'LOCAL_PURCHASE' | 'BREEDER_FARM';
export type HatcheryEggBatchStatus = 'QUARANTINE' | 'AVAILABLE' | 'IN_INCUBATION' | 'EXHAUSTED' | 'REJECTED';
export type HatcheryRunStatus = 'PENDING' | 'SETTING' | 'CANDLING' | 'HATCHING' | 'COMPLETE' | 'FAILED' | 'CANCELLED';
export type HatcheryChickType = 'BROILER_DOC' | 'LAYER_DOC' | 'BROILER_PULLET' | 'LAYER_PULLET' | 'BREEDER_DOC' | 'TURKEY_DOC' | 'OTHER';
export type HatcheryChickGrade = 'FIRST' | 'SECOND' | 'CULL';
export type HatcheryChickBatchStatus = 'HOLDING' | 'PARTIALLY_SOLD' | 'FULLY_SOLD' | 'CULLED';

export interface HatcheryMachine {
  id: number; companyId: number; machineCode: string; name: string;
  machineType: HatcheryMachineType; capacity: number; brand: string | null;
  model: string | null; serialNumber: string | null; siteId: number | null;
  status: HatcheryMachineStatus; notes: string | null;
  createdAt: string; updatedAt: string;
}

export interface HatcheryEggBatch {
  id: number; companyId: number; batchCode: string;
  sourceType: HatcheryEggSourceType; sourceDocumentId: number | null;
  sourceDocumentType: string | null; flockEggCollectionId: number | null;
  supplierId: number | null; supplierName?: string | null;
  breedId: number | null; breedName?: string | null;
  eggType: string; quantityReceived: number; quantitySettable: number | null;
  quantityRejected: number; unitCost: string | null; totalCost: string | null;
  currency: string; receivedDate: string; expiryDate: string | null;
  status: HatcheryEggBatchStatus; notes: string | null;
  createdAt: string; updatedAt: string;
}

export interface HatcheryRunBatch {
  id: number; incubationRunId: number; eggBatchId: number;
  batchCode?: string; eggType?: string; sourceType?: string; quantitySet: number;
}

export interface HatcheryCandlingResult {
  id: number; incubationRunId: number; candlingDate: string; candlingDay: number;
  fertile: number; infertile: number; deadInShell: number; cracked: number;
  totalInspected: number; fertilityRate: string | null; notes: string | null;
}

export interface HatcheryHatchResult {
  id: number; incubationRunId: number; hatchDate: string;
  eggsSet: number; eggsTransferred: number | null;
  chicksHatched: number; deadInShell: number; unhatched: number; cripples: number;
  hatchRate: string | null; hatchability: string | null; fertilityRate: string | null;
}

export interface HatcheryIncubationRun {
  id: number; companyId: number; runCode: string;
  setterId: number | null; setterName?: string | null;
  hatcherId: number | null; hatcherName?: string | null;
  setDate: string; expectedCandleDate: string | null; transferDate: string | null;
  expectedHatchDate: string | null; actualHatchDate: string | null;
  totalEggsSet: number; status: HatcheryRunStatus; notes: string | null;
  createdAt: string; updatedAt: string;
  batches?: HatcheryRunBatch[];
  candling?: HatcheryCandlingResult[];
  hatchResult?: HatcheryHatchResult | null;
  chicksHatched?: number | null; hatchRate?: string | null;
}

export interface HatcheryChickBatch {
  id: number; companyId: number; batchCode: string;
  incubationRunId: number; runCode?: string;
  hatchResultId: number | null;
  chickType: HatcheryChickType; chickGrade: HatcheryChickGrade;
  chicksCount: number; chicksAvailable: number;
  vaccinationDone: boolean; vaccinationDate: string | null; vaccinationNotes: string | null;
  inventoryItemId: number | null; inventoryItemName?: string | null;
  warehouseId: number | null; warehouseName?: string | null;
  postedToInventory: boolean; postedAt: string | null;
  status: HatcheryChickBatchStatus; notes: string | null;
  createdAt: string; updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[]; total: number; page: number; limit: number; totalPages: number;
}

// ============================================================================
// API
// ============================================================================

export const hatcheryMachinesApi = {
  list: (params?: Record<string, unknown>) => api.get('/hatchery/machines', { params }).then(r => r.data as PaginatedResponse<HatcheryMachine>),
  get: (id: number) => api.get(`/hatchery/machines/${id}`).then(r => r.data as HatcheryMachine),
  getStats: () => api.get('/hatchery/machines/stats').then(r => r.data),
  create: (dto: Record<string, unknown>) => api.post('/hatchery/machines', dto).then(r => r.data as HatcheryMachine),
  update: (id: number, dto: Record<string, unknown>) => api.put(`/hatchery/machines/${id}`, dto).then(r => r.data as HatcheryMachine),
  delete: (id: number) => api.delete(`/hatchery/machines/${id}`).then(r => r.data),
};

export const hatcheryEggBatchesApi = {
  list: (params?: Record<string, unknown>) => api.get('/hatchery/egg-batches', { params }).then(r => r.data as PaginatedResponse<HatcheryEggBatch>),
  get: (id: number) => api.get(`/hatchery/egg-batches/${id}`).then(r => r.data as HatcheryEggBatch),
  getStats: () => api.get('/hatchery/egg-batches/stats').then(r => r.data),
  create: (dto: Record<string, unknown>) => api.post('/hatchery/egg-batches', dto).then(r => r.data as HatcheryEggBatch),
  update: (id: number, dto: Record<string, unknown>) => api.put(`/hatchery/egg-batches/${id}`, dto).then(r => r.data as HatcheryEggBatch),
  createFromFlockCollection: (collectionId: number) => api.post(`/hatchery/egg-batches/from-flock-collection/${collectionId}`).then(r => r.data as HatcheryEggBatch),
};

export const hatcheryRunsApi = {
  list: (params?: Record<string, unknown>) => api.get('/hatchery/incubation-runs', { params }).then(r => r.data as PaginatedResponse<HatcheryIncubationRun>),
  get: (id: number) => api.get(`/hatchery/incubation-runs/${id}`).then(r => r.data as HatcheryIncubationRun),
  getStats: () => api.get('/hatchery/incubation-runs/stats').then(r => r.data),
  create: (dto: Record<string, unknown>) => api.post('/hatchery/incubation-runs', dto).then(r => r.data as HatcheryIncubationRun),
  update: (id: number, dto: Record<string, unknown>) => api.put(`/hatchery/incubation-runs/${id}`, dto).then(r => r.data as HatcheryIncubationRun),
  recordCandling: (id: number, dto: Record<string, unknown>) => api.post(`/hatchery/incubation-runs/${id}/candling`, dto).then(r => r.data),
  recordHatchResult: (id: number, dto: Record<string, unknown>) => api.post(`/hatchery/incubation-runs/${id}/hatch-result`, dto).then(r => r.data as HatcheryIncubationRun),
  cancel: (id: number, notes?: string) => api.post(`/hatchery/incubation-runs/${id}/cancel`, { notes }).then(r => r.data as HatcheryIncubationRun),
};

export const hatcheryChickBatchesApi = {
  list: (params?: Record<string, unknown>) => api.get('/hatchery/chick-batches', { params }).then(r => r.data as PaginatedResponse<HatcheryChickBatch>),
  get: (id: number) => api.get(`/hatchery/chick-batches/${id}`).then(r => r.data as HatcheryChickBatch),
  getStats: () => api.get('/hatchery/chick-batches/stats').then(r => r.data),
  update: (id: number, dto: Record<string, unknown>) => api.put(`/hatchery/chick-batches/${id}`, dto).then(r => r.data as HatcheryChickBatch),
  postToInventory: (id: number, dto: { inventoryItemId: number; warehouseId: number }) => api.post(`/hatchery/chick-batches/${id}/post-to-inventory`, dto).then(r => r.data as HatcheryChickBatch),
};

export const hatcheryReportsApi = {
  getDashboard: () => api.get('/hatchery/reports/dashboard').then(r => r.data),
  getHatchabilityTrend: (months?: number) => api.get('/hatchery/reports/hatchability-trend', { params: { months } }).then(r => r.data),
  getSourceBreakdown: (fromDate?: string, toDate?: string) => api.get('/hatchery/reports/source-breakdown', { params: { fromDate, toDate } }).then(r => r.data),
  getMachineUtilisation: () => api.get('/hatchery/reports/machine-utilisation').then(r => r.data),
};

// ============================================================================
// NEW: Power Logs, Biosecurity, Batch Consumptions, Vaccination Records
// ============================================================================

export type HatcheryBiosecurityCheckType =
  | 'DISINFECTION' | 'VISITOR_LOG' | 'PEST_CONTROL' | 'EQUIPMENT_SANITIZATION'
  | 'WATER_QUALITY' | 'INCIDENT_REPORT';

export type HatcheryConsumptionType =
  | 'VACCINE' | 'FEED' | 'MEDICATION' | 'DISINFECTANT' | 'FUEL' | 'PACKAGING' | 'OTHER';

export interface HatcheryPowerLog {
  id: number; companyId: number; runId: number | null; runCode?: string | null;
  logDate: string;
  powerOutageStart: string | null; powerOutageEnd: string | null;
  outageDurationMins: number | null;
  generatorStarted: boolean; generatorRunMins: number | null;
  dieselUsedLitres: string | null; impact: string | null;
  loggedById: number | null; notes: string | null;
  createdAt: string; updatedAt: string;
}

export interface HatcheryBiosecurityCheck {
  id: number; companyId: number;
  checkType: HatcheryBiosecurityCheckType; checkDate: string;
  checkedById: number | null; checkedByName: string | null;
  area: string | null; chemicalUsed: string | null; dilutionRate: string | null;
  passed: boolean; failureReason: string | null;
  visitorName: string | null; visitorOrganisation: string | null; visitorPurpose: string | null;
  incidentDescription: string | null; actionTaken: string | null; notes: string | null;
  createdAt: string; updatedAt: string;
}

export interface HatcheryBatchConsumption {
  id: number; companyId: number; runId: number; runCode?: string | null;
  consumptionType: HatcheryConsumptionType;
  inventoryItemId: number | null; itemName: string;
  quantity: string; unitOfMeasure: string | null;
  unitCost: string | null; totalCost: string | null;
  consumptionDate: string; recordedById: number | null; notes: string | null;
  createdAt: string; updatedAt: string;
}

export interface HatcheryVaccinationRecord {
  id: number; companyId: number; chickBatchId: number; batchCode?: string | null;
  vaccineName: string; vaccineType: string | null; manufacturer: string | null;
  batchNumber: string | null; expiryDate: string | null; vaccinationDate: string;
  dosagePerChick: string | null; routeOfAdmin: string | null;
  chicksVaccinated: number | null;
  administeredById: number | null; administeredByName: string | null;
  inventoryItemId: number | null; inventoryItemLabel?: string | null;
  notes: string | null; createdAt: string; updatedAt: string;
}

export const hatcheryPowerLogsApi = {
  list: (params?: Record<string, unknown>) => api.get('/hatchery/power-logs', { params }).then(r => r.data as PaginatedResponse<HatcheryPowerLog>),
  get: (id: number) => api.get(`/hatchery/power-logs/${id}`).then(r => r.data as HatcheryPowerLog),
  getRunSummary: (runId: number) => api.get(`/hatchery/power-logs/run/${runId}/summary`).then(r => r.data),
  create: (dto: Record<string, unknown>) => api.post('/hatchery/power-logs', dto).then(r => r.data as HatcheryPowerLog),
  delete: (id: number) => api.delete(`/hatchery/power-logs/${id}`).then(r => r.data),
};

export const hatcheryBiosecurityApi = {
  list: (params?: Record<string, unknown>) => api.get('/hatchery/biosecurity', { params }).then(r => r.data as PaginatedResponse<HatcheryBiosecurityCheck>),
  get: (id: number) => api.get(`/hatchery/biosecurity/${id}`).then(r => r.data as HatcheryBiosecurityCheck),
  getStats: () => api.get('/hatchery/biosecurity/stats').then(r => r.data),
  create: (dto: Record<string, unknown>) => api.post('/hatchery/biosecurity', dto).then(r => r.data as HatcheryBiosecurityCheck),
  delete: (id: number) => api.delete(`/hatchery/biosecurity/${id}`).then(r => r.data),
};

export const hatcheryConsumptionsApi = {
  list: (params?: Record<string, unknown>) => api.get('/hatchery/batch-consumptions', { params }).then(r => r.data as PaginatedResponse<HatcheryBatchConsumption>),
  get: (id: number) => api.get(`/hatchery/batch-consumptions/${id}`).then(r => r.data as HatcheryBatchConsumption),
  getByRun: (runId: number) => api.get(`/hatchery/batch-consumptions/run/${runId}`).then(r => r.data as HatcheryBatchConsumption[]),
  getCostSummary: (runId: number) => api.get(`/hatchery/batch-consumptions/run/${runId}/cost-summary`).then(r => r.data),
  create: (dto: Record<string, unknown>) => api.post('/hatchery/batch-consumptions', dto).then(r => r.data as HatcheryBatchConsumption),
  delete: (id: number) => api.delete(`/hatchery/batch-consumptions/${id}`).then(r => r.data),
};

export const hatcheryVaccinationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/hatchery/vaccination-records', { params }).then(r => r.data as PaginatedResponse<HatcheryVaccinationRecord>),
  get: (id: number) => api.get(`/hatchery/vaccination-records/${id}`).then(r => r.data as HatcheryVaccinationRecord),
  getByChickBatch: (chickBatchId: number) => api.get(`/hatchery/vaccination-records/chick-batch/${chickBatchId}`).then(r => r.data as HatcheryVaccinationRecord[]),
  create: (dto: Record<string, unknown>) => api.post('/hatchery/vaccination-records', dto).then(r => r.data as HatcheryVaccinationRecord),
  delete: (id: number) => api.delete(`/hatchery/vaccination-records/${id}`).then(r => r.data),
};
