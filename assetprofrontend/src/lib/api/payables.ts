import { api } from '../api';

// ============================================================================
// PAYABLES SETTINGS TYPES
// ============================================================================

export interface PayablesSettings {
  id: number;
  companyId: number;
  paymentPrefix: string;
  paymentNextNumber: number;
  requirePaymentApproval: boolean;
  paymentApprovalThreshold: number;
  defaultPaymentTerms: string | null;
  autoAllocatePayments: boolean;
  allowPartialPayments: boolean;
  allowOverPayments: boolean;
  enableWhtDeduction: boolean;
  defaultWhtRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePayablesSettingsDto {
  paymentPrefix?: string;
  requirePaymentApproval?: boolean;
  paymentApprovalThreshold?: number;
  defaultPaymentTerms?: string;
  autoAllocatePayments?: boolean;
  allowPartialPayments?: boolean;
  allowOverPayments?: boolean;
  enableWhtDeduction?: boolean;
  defaultWhtRate?: number;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface PaymentAllocation {
  id: number;
  paymentId: number;
  purchaseInvoiceId: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  invoiceBalance?: number;
  amount: number;
  vatAmount: number;
  whtBase: number;
  whtId: number | null;
  whtRate: number;
  whtAmount: number;
  netAmount: number;
  allocationDate: string;
  notes: string | null;
}

export interface PaymentMethod {
  id: number;
  paymentId: number;
  paymentMethodId: number;
  paymentMethodName?: string;
  bankId: number;
  bankName?: string;
  amount: number;
  reference: string | null;
}

export interface Payment {
  id: number;
  companyId: number;
  branchId: number | null;
  branchName?: string;
  userId: number;
  createdBy: number;
  createdByName?: string;
  approvedBy: number | null;
  approvedByName?: string;
  paymentNumber: string;
  paymentDate: string;
  supplierId: number;
  supplierName?: string;
  supplierCode?: string;
  amountPaid: number;
  totalAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  whtAmount: number;
  netAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected' | 'returned';
  reference: string | null;
  notes: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  allocations?: PaymentAllocation[];
  paymentMethods?: PaymentMethod[];
}

export interface PaymentStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  cancelled: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
}

export interface CreatePaymentAllocationDto {
  purchaseInvoiceId: number;
  amount: number;
  whtId?: number;
}

export interface CreatePaymentMethodDto {
  paymentMethodId: number;
  bankId: number;
  amount: number;
  reference?: string;
}

export interface CreatePaymentDto {
  branchId?: number;
  supplierId: number;
  paymentDate: string;
  totalAmount: number;
  reference?: string;
  notes?: string;
  paymentMethods: CreatePaymentMethodDto[];
  allocations?: CreatePaymentAllocationDto[];
}

export interface UpdatePaymentDto {
  paymentDate?: string;
  totalAmount?: number;
  reference?: string;
  notes?: string;
  paymentMethods?: CreatePaymentMethodDto[];
  allocations?: CreatePaymentAllocationDto[];
}

export interface PaymentQuery {
  search?: string;
  approvalStatus?: string;
  status?: string;
  supplierId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// SUPPLIER OUTSTANDING INVOICES
// ============================================================================

export interface OutstandingInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  vatAmount: number;
  status: string;
}

// ============================================================================
// SUPPLIER STATEMENT TYPES
// ============================================================================

export interface SupplierStatementParams {
  supplierId: number;
  fromDate: string;
  toDate: string;
  currencyId?: number;
  showRunningBalance?: boolean;
  includePaidInvoices?: boolean;
}

export interface SupplierStatementTransaction {
  id: number;
  date: string;
  type: 'invoice' | 'payment' | 'credit_note' | 'debit_note' | 'import_payment' | 'adjustment';
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  foreignAmount?: number;
  localAmount?: number;
  currencyCode?: string;
}

export interface SupplierStatement {
  supplier: {
    id: number;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  period: {
    from: string;
    to: string;
  };
  openingBalance: number;
  transactions: SupplierStatementTransaction[];
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  aging: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
  };
}

// ============================================================================
// PAYABLES SETTINGS API
// ============================================================================

export const payablesSettingsApi = {
  get: async (): Promise<PayablesSettings> => {
    const response = await api.get('/payables/settings');
    return response.data;
  },

  update: async (data: UpdatePayablesSettingsDto): Promise<PayablesSettings> => {
    const response = await api.put('/payables/settings', data);
    return response.data;
  },
};

// ============================================================================
// PAYMENTS API
// ============================================================================

export const paymentsApi = {
  list: async (query?: PaymentQuery): Promise<{ data: Payment[]; total: number; page: number; limit: number }> => {
    const response = await api.get('/payables/payments', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Payment> => {
    const response = await api.get(`/payables/payments/${id}`);
    return response.data;
  },

  getStats: async (): Promise<PaymentStats> => {
    const response = await api.get('/payables/payments/stats');
    return response.data;
  },

  create: async (data: CreatePaymentDto, options?: { force?: boolean }): Promise<Payment> => {
    const response = await api.post('/payables/payments', data, {
      params: options?.force ? { force: 'true' } : undefined,
    });
    return response.data;
  },

  update: async (id: number, data: UpdatePaymentDto): Promise<Payment> => {
    const response = await api.put(`/payables/payments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/payables/payments/${id}`);
  },

  submit: async (id: number): Promise<Payment> => {
    const response = await api.post(`/payables/payments/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<Payment> => {
    const response = await api.post(`/payables/payments/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, reason?: string): Promise<Payment> => {
    const response = await api.post(`/payables/payments/${id}/reject`, { reason });
    return response.data;
  },

  return: async (id: number, reason?: string): Promise<Payment> => {
    const response = await api.post(`/payables/payments/${id}/return`, { reason });
    return response.data;
  },

  processPayment: async (id: number, data: {
    paymentDate: string;
    paymentMethods: Array<{ paymentMethodId: number; bankId: number; amount: number; reference?: string }>;
  }): Promise<Payment> => {
    const response = await api.post(`/payables/payments/${id}/process`, data);
    return response.data;
  },

  void: async (id: number, reason: string, voidDate?: string): Promise<Payment> => {
    const response = await api.post(`/payables/payments/${id}/void`, { reason, voidDate });
    return response.data;
  },

  getOutstandingInvoices: async (supplierId: number): Promise<OutstandingInvoice[]> => {
    const response = await api.get(`/payables/payments/outstanding-invoices/${supplierId}`);
    return response.data;
  },

  // ----- Batch CSV upload: payment batch (against existing invoices) -----
  batchDryRun: async (rows: PaymentBatchImportRow[], batchLabel?: string): Promise<PaymentBatchDryRunResponse> => {
    const res = await api.post('/payables/payments/batch/dry-run', { rows, batchLabel });
    return res.data;
  },
  batchCommit: async (rows: PaymentBatchImportRow[], batchLabel?: string): Promise<PaymentBatchCommitResponse> => {
    const res = await api.post('/payables/payments/batch/commit', { rows, batchLabel });
    return res.data;
  },

  // ----- Batch CSV upload: historical invoice+payment bundle (Super Admin) -----
  historicalBundleDryRun: async (rows: HistoricalBundleRow[], batchLabel?: string): Promise<PaymentBatchDryRunResponse> => {
    const res = await api.post('/payables/payments/historical-bundle/dry-run', { rows, batchLabel });
    return res.data;
  },
  historicalBundleCommit: async (rows: HistoricalBundleRow[], batchLabel?: string): Promise<PaymentBatchCommitResponse> => {
    const res = await api.post('/payables/payments/historical-bundle/commit', { rows, batchLabel });
    return res.data;
  },
};

// ============================================================================
// PAYMENT BATCH IMPORT TYPES
// ============================================================================

export interface PaymentBatchImportRow {
  externalRef: string;
  paymentDate: string;
  supplierCode: string;
  bankCode: string;
  paymentMethodCode?: string;
  reference?: string;
  notes?: string;
  invoiceNumber: string;
  amount: number;
  whtCode?: string;
}

/**
 * Historical bundle row — one of three shapes discriminated by rowType:
 *
 *   INVOICE_LINE  — one line of the invoice. First row also carries header
 *                   (supplierCode, invoiceNumber, invoiceDate).
 *   PAYMENT       — one cash payment event against the invoice.
 *   MISC_CHARGE   — one non-cash adjustment (reduces AP, credits a GL
 *                   account chosen by the user — Other Income, Discount,
 *                   Write-off, etc).
 *
 * All three group by externalRef. Σ payments + Σ misc ≤ invoice total.
 */
export type HistoricalBundleRowType = 'INVOICE_LINE' | 'PAYMENT' | 'MISC_CHARGE';

export interface HistoricalBundleRow {
  externalRef: string;
  rowType: HistoricalBundleRowType;
  // Invoice header fields (INVOICE_LINE only; first row of group wins)
  supplierCode?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  notes?: string;
  // Invoice line fields (INVOICE_LINE only)
  lineDescription?: string;
  quantity?: number;
  unitPrice?: number;
  itemCode?: string;
  warehouseCode?: string;
  // Payment fields (PAYMENT only)
  paymentDate?: string;
  paymentAmount?: number;
  bankCode?: string;
  paymentMethodCode?: string;
  paymentReference?: string;
  // Misc charge fields (MISC_CHARGE only)
  miscDate?: string;
  miscAmount?: number;
  miscAccountCode?: string;
  // Shared (PAYMENT mostly)
  whtCode?: string;
}

export interface PaymentBatchValidationResult {
  externalRef: string;
  rowCount: number;
  supplierName?: string;
  bankName?: string;
  totalAmount: number;
  errors: string[];
  warnings: string[];
  allocations?: Array<{
    invoiceNumber: string;
    invoiceBalance: number;
    amount: number;
    resultingBalance: number;
  }>;
}

export interface PaymentBatchDryRunResponse {
  batchRef: string;
  results: PaymentBatchValidationResult[];
  validCount: number;
  invalidCount: number;
}

export interface PaymentBatchCommitResponse {
  batchRef: string;
  createdPaymentIds: number[];
  createdInvoiceIds?: number[];
  failedRefs: Array<{ externalRef: string; error: string }>;
}

// ============================================================================
// SUPPLIER STATEMENT API
// ============================================================================

export const supplierStatementApi = {
  generate: async (params: SupplierStatementParams): Promise<SupplierStatement> => {
    const response = await api.post('/payables/reports/supplier-statement/generate', params);
    return response.data;
  },

  exportPdf: async (params: SupplierStatementParams): Promise<Blob> => {
    const response = await api.post('/payables/reports/supplier-statement/export-pdf', params, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportExcel: async (params: SupplierStatementParams): Promise<Blob> => {
    const response = await api.post('/payables/reports/supplier-statement/export-excel', params, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// ============================================================================
// PAYABLES DASHBOARD API
// ============================================================================

export interface PayablesDashboard {
  summary: {
    totalPayables: number;
    totalOutstanding: number;
    overdueAmount: number;
    paidThisMonth: number;
  };
  aging: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
  };
  topSuppliers: Array<{
    id: number;
    name: string;
    outstanding: number;
    percentage: number;
  }>;
  recentPayments: Payment[];
  upcomingPayments: Array<{
    id: number;
    invoiceNumber: string;
    supplierName: string;
    dueDate: string;
    amount: number;
    daysUntilDue: number;
  }>;
}

export const payablesDashboardApi = {
  get: async (): Promise<PayablesDashboard> => {
    const response = await api.get('/payables/dashboard');
    return response.data;
  },
};
