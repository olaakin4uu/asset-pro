import { api } from '../api';

// ============================================================================
// TYPES - ENUMS
// ============================================================================

export type PcFundStatus = 'active' | 'suspended';
export type PcDisbursementStatus = 'draft' | 'pending_approval' | 'approved' | 'posted' | 'rejected' | 'reversed';
export type PcReplenishmentStatus = 'draft' | 'pending_approval' | 'approved' | 'completed' | 'rejected';

// ============================================================================
// TYPES - ENTITIES
// ============================================================================

export interface PcFund {
  id: number;
  companyId: number;
  branchId: number | null;
  name: string;
  code: string;
  description: string | null;
  custodianId: number | null;
  custodianName: string | null;
  glAccountId: number | null;
  currencyCode: string;
  fundLimit: number;
  currentBalance: number;
  openingBalance: number;
  minimumBalance: number;
  status: PcFundStatus;
  lastReconciledAt: string | null;
  lastReconciledBalance: number | null;
  isActive: boolean;
  createdBy: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PcCategory {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description: string | null;
  expenseAccountId: number | null;
  maxAmount: number | null;
  requiresReceipt: boolean;
  isActive: boolean;
  sortOrder: number;
  createdBy: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PcDisbursementItem {
  id: number;
  disbursementId: number;
  categoryId: number | null;
  expenseAccountId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  taxAmount: number;
  totalAmount: number;
  costCenterId: number | null;
  notes: string | null;
  category?: PcCategory;
  createdAt: string;
  updatedAt: string;
}

export interface PcDisbursement {
  id: number;
  companyId: number;
  branchId: number | null;
  fundId: number;
  disbursementNumber: string;
  disbursementDate: string;
  payeeName: string;
  description: string | null;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  receiptNumber: string | null;
  receiptAttachment: string | null;
  status: PcDisbursementStatus;
  approvalStatus: string;
  journalEntryId: number | null;
  postedAt: string | null;
  postedBy: number | null;
  approvedAt: string | null;
  approvedBy: number | null;
  approvalNotes: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fund?: PcFund;
  items?: PcDisbursementItem[];
}

export interface PcReplenishment {
  id: number;
  companyId: number;
  branchId: number | null;
  fundId: number;
  replenishmentNumber: string;
  requestDate: string;
  amount: number;
  description: string | null;
  sourceBankId: number | null;
  sourceAccountId: number | null;
  referenceNumber: string | null;
  journalEntryId: number | null;
  status: PcReplenishmentStatus;
  requestedBy: number | null;
  requestedAt: string;
  approvedBy: number | null;
  approvedAt: string | null;
  approvalNotes: string | null;
  rejectionReason: string | null;
  processedBy: number | null;
  processedAt: string | null;
  postedAt: string | null;
  postedBy: number | null;
  notes: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fund?: PcFund;
}

export interface PcSettings {
  id: number;
  companyId: number;
  disbursementPrefix: string;
  disbursementNextNumber: number;
  replenishmentPrefix: string;
  replenishmentNextNumber: number;
  requireDisbursementApproval: boolean;
  requireReplenishmentApproval: boolean;
  maxDisbursementAmount: number | null;
  requireReceiptAttachment: boolean;
  defaultExpenseAccountId: number | null;
  autoPostToGL: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// TYPES - DTOs
// ============================================================================

export interface CreateFundDto {
  name: string;
  code: string;
  branchId?: number;
  description?: string;
  custodianId?: number;
  custodianName?: string;
  glAccountId?: number;
  currencyCode?: string;
  fundLimit: number;
  openingBalance?: number;
  minimumBalance?: number;
}

export interface UpdateFundDto {
  name?: string;
  branchId?: number;
  description?: string;
  custodianId?: number;
  custodianName?: string;
  glAccountId?: number;
  currencyCode?: string;
  fundLimit?: number;
  openingBalance?: number;
  minimumBalance?: number;
}

export interface CreateCategoryDto {
  name: string;
  code: string;
  description?: string;
  expenseAccountId?: number;
  maxAmount?: number;
  requiresReceipt?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  code?: string;
  description?: string;
  expenseAccountId?: number;
  maxAmount?: number;
  requiresReceipt?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export interface DisbursementItemDto {
  categoryId?: number;
  expenseAccountId?: number;
  description: string;
  quantity?: number;
  unitPrice: number;
  taxAmount?: number;
  costCenterId?: number;
  notes?: string;
}

export interface CreateDisbursementDto {
  fundId: number;
  disbursementDate: string;
  payeeName: string;
  description?: string;
  receiptNumber?: string;
  notes?: string;
  items: DisbursementItemDto[];
}

export interface UpdateDisbursementDto {
  disbursementDate?: string;
  payeeName?: string;
  description?: string;
  receiptNumber?: string;
  notes?: string;
  items?: DisbursementItemDto[];
}

export interface CreateReplenishmentDto {
  fundId: number;
  requestDate: string;
  amount: number;
  description?: string;
  sourceBankId?: number;
  sourceAccountId?: number;
  referenceNumber?: string;
  notes?: string;
}

export interface UpdateReplenishmentDto {
  fundId?: number;
  requestDate?: string;
  amount?: number;
  description?: string;
  sourceBankId?: number;
  sourceAccountId?: number;
  referenceNumber?: string;
  notes?: string;
}

export interface UpdatePcSettingsDto {
  disbursementPrefix?: string;
  disbursementNextNumber?: number;
  replenishmentPrefix?: string;
  replenishmentNextNumber?: number;
  requireDisbursementApproval?: boolean;
  requireReplenishmentApproval?: boolean;
  maxDisbursementAmount?: number;
  requireReceiptAttachment?: boolean;
  defaultExpenseAccountId?: number;
  autoPostToGL?: boolean;
}

// ============================================================================
// TYPES - RESPONSES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// API - FUNDS
// ============================================================================

export const pcFundsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<PcFund>> => {
    const response = await api.get('/petty-cash/funds', { params });
    return response.data;
  },
  get: async (id: number): Promise<PcFund> => {
    const response = await api.get(`/petty-cash/funds/${id}`);
    return response.data;
  },
  create: async (data: CreateFundDto): Promise<PcFund> => {
    const response = await api.post('/petty-cash/funds', data);
    return response.data;
  },
  update: async (id: number, data: UpdateFundDto): Promise<PcFund> => {
    const response = await api.put(`/petty-cash/funds/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/petty-cash/funds/${id}`);
  },
  suspend: async (id: number): Promise<PcFund> => {
    const response = await api.post(`/petty-cash/funds/${id}/suspend`);
    return response.data;
  },
  activate: async (id: number): Promise<PcFund> => {
    const response = await api.post(`/petty-cash/funds/${id}/activate`);
    return response.data;
  },
};

// ============================================================================
// API - CATEGORIES
// ============================================================================

export const pcCategoriesApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<PcCategory>> => {
    const response = await api.get('/petty-cash/categories', { params });
    return response.data;
  },
  get: async (id: number): Promise<PcCategory> => {
    const response = await api.get(`/petty-cash/categories/${id}`);
    return response.data;
  },
  create: async (data: CreateCategoryDto): Promise<PcCategory> => {
    const response = await api.post('/petty-cash/categories', data);
    return response.data;
  },
  update: async (id: number, data: UpdateCategoryDto): Promise<PcCategory> => {
    const response = await api.put(`/petty-cash/categories/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/petty-cash/categories/${id}`);
  },
};

// ============================================================================
// API - DISBURSEMENTS
// ============================================================================

export const pcDisbursementsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<PcDisbursement>> => {
    const response = await api.get('/petty-cash/disbursements', { params });
    return response.data;
  },
  get: async (id: number): Promise<PcDisbursement> => {
    const response = await api.get(`/petty-cash/disbursements/${id}`);
    return response.data;
  },
  create: async (data: CreateDisbursementDto): Promise<PcDisbursement> => {
    const response = await api.post('/petty-cash/disbursements', data);
    return response.data;
  },
  update: async (id: number, data: UpdateDisbursementDto): Promise<PcDisbursement> => {
    const response = await api.put(`/petty-cash/disbursements/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/petty-cash/disbursements/${id}`);
  },
  submit: async (id: number): Promise<PcDisbursement> => {
    const response = await api.post(`/petty-cash/disbursements/${id}/submit`);
    return response.data;
  },
  approve: async (id: number, notes?: string): Promise<PcDisbursement> => {
    const response = await api.post(`/petty-cash/disbursements/${id}/approve`, { notes });
    return response.data;
  },
  reject: async (id: number, reason: string): Promise<PcDisbursement> => {
    const response = await api.post(`/petty-cash/disbursements/${id}/reject`, { reason });
    return response.data;
  },
  post: async (id: number): Promise<PcDisbursement> => {
    const response = await api.post(`/petty-cash/disbursements/${id}/post`);
    return response.data;
  },
  reverse: async (id: number, reversalDate?: string): Promise<PcDisbursement> => {
    const response = await api.post(`/petty-cash/disbursements/${id}/reverse`, { reversalDate });
    return response.data;
  },
};

// ============================================================================
// API - REPLENISHMENTS
// ============================================================================

export const pcReplenishmentsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<PcReplenishment>> => {
    const response = await api.get('/petty-cash/replenishments', { params });
    return response.data;
  },
  get: async (id: number): Promise<PcReplenishment> => {
    const response = await api.get(`/petty-cash/replenishments/${id}`);
    return response.data;
  },
  create: async (data: CreateReplenishmentDto): Promise<PcReplenishment> => {
    const response = await api.post('/petty-cash/replenishments', data);
    return response.data;
  },
  update: async (id: number, data: UpdateReplenishmentDto): Promise<PcReplenishment> => {
    const response = await api.put(`/petty-cash/replenishments/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/petty-cash/replenishments/${id}`);
  },
  submit: async (id: number): Promise<PcReplenishment> => {
    const response = await api.post(`/petty-cash/replenishments/${id}/submit`);
    return response.data;
  },
  approve: async (id: number, notes?: string): Promise<PcReplenishment> => {
    const response = await api.post(`/petty-cash/replenishments/${id}/approve`, { notes });
    return response.data;
  },
  reject: async (id: number, reason: string): Promise<PcReplenishment> => {
    const response = await api.post(`/petty-cash/replenishments/${id}/reject`, { reason });
    return response.data;
  },
  process: async (id: number): Promise<PcReplenishment> => {
    const response = await api.post(`/petty-cash/replenishments/${id}/process`);
    return response.data;
  },
};

// ============================================================================
// API - SETTINGS
// ============================================================================

export const pcSettingsApi = {
  get: async (): Promise<PcSettings> => {
    const response = await api.get('/petty-cash/settings');
    return response.data;
  },
  update: async (data: UpdatePcSettingsDto): Promise<PcSettings> => {
    const response = await api.put('/petty-cash/settings', data);
    return response.data;
  },
};
