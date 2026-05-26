import { api } from '../api';
import type { PaginatedResponse } from '@/types/core';
import type {
  Receipt,
  CreateReceiptDto,
  UpdateReceiptDto,
  ReceiptQueryParams,
  ReceiptStats,
  CreateReceiptAllocationDto,
  CreditNote,
  CreateCreditNoteDto,
  UpdateCreditNoteDto,
  CreditNoteQueryParams,
  CreditNoteStats,
  CustomerAging,
  ReceivablesAgingSummary,
  CustomerStatement,
} from '@/types/receivables';

// ============================================================================
// RECEIPTS API
// ============================================================================

export const receiptsApi = {
  list: async (params?: ReceiptQueryParams): Promise<PaginatedResponse<Receipt>> => {
    const response = await api.get<PaginatedResponse<Receipt>>('/receivables/receipts', { params });
    return response.data;
  },

  get: async (id: number): Promise<Receipt> => {
    const response = await api.get<Receipt>(`/receivables/receipts/${id}`);
    return response.data;
  },

  create: async (data: CreateReceiptDto): Promise<Receipt> => {
    const response = await api.post<Receipt>('/receivables/receipts', data);
    return response.data;
  },

  update: async (id: number, data: UpdateReceiptDto): Promise<Receipt> => {
    const response = await api.put<Receipt>(`/receivables/receipts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/receivables/receipts/${id}`);
  },

  getStats: async (): Promise<ReceiptStats> => {
    const response = await api.get<ReceiptStats>('/receivables/receipts/stats');
    return response.data;
  },

  getUnallocated: async (customerId: number): Promise<Receipt[]> => {
    const response = await api.get<Receipt[]>(`/receivables/receipts/unallocated/${customerId}`);
    return response.data;
  },

  allocate: async (id: number, allocations: CreateReceiptAllocationDto[]): Promise<Receipt> => {
    const response = await api.post<Receipt>(`/receivables/receipts/${id}/allocate`, { allocations });
    return response.data;
  },

  post: async (id: number): Promise<Receipt> => {
    const response = await api.post<Receipt>(`/receivables/receipts/${id}/post`);
    return response.data;
  },

  void: async (id: number, voidReason: string, voidDate?: string): Promise<Receipt> => {
    const response = await api.post<Receipt>(`/receivables/receipts/${id}/void`, { voidReason, voidDate });
    return response.data;
  },
};

// ============================================================================
// RECEIVABLE SETTINGS API
// ============================================================================

export const receivableSettingsApi = {
  get: async (): Promise<Record<string, unknown>> => {
    const response = await api.get('/receivables/receipts/module/settings');
    return response.data;
  },
  update: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.put('/receivables/receipts/module/settings', data);
    return response.data;
  },
};

// ============================================================================
// CREDIT NOTES API
// ============================================================================

export const creditNotesApi = {
  list: async (params?: CreditNoteQueryParams): Promise<PaginatedResponse<CreditNote>> => {
    const response = await api.get<PaginatedResponse<CreditNote>>('/receivables/credit-notes', { params });
    return response.data;
  },

  get: async (id: number): Promise<CreditNote> => {
    const response = await api.get<CreditNote>(`/receivables/credit-notes/${id}`);
    return response.data;
  },

  create: async (data: CreateCreditNoteDto): Promise<CreditNote> => {
    const response = await api.post<CreditNote>('/receivables/credit-notes', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCreditNoteDto): Promise<CreditNote> => {
    const response = await api.put<CreditNote>(`/receivables/credit-notes/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/receivables/credit-notes/${id}`);
  },

  getStats: async (): Promise<CreditNoteStats> => {
    const response = await api.get<CreditNoteStats>('/receivables/credit-notes/stats');
    return response.data;
  },

  getUnallocated: async (customerId: number): Promise<CreditNote[]> => {
    const response = await api.get<CreditNote[]>(`/receivables/credit-notes/unallocated/${customerId}`);
    return response.data;
  },

  allocate: async (id: number, allocations: { invoiceId: number; allocatedAmount: number; notes?: string }[]): Promise<CreditNote> => {
    const response = await api.post<CreditNote>(`/receivables/credit-notes/${id}/allocate`, { allocations });
    return response.data;
  },

  post: async (id: number): Promise<CreditNote> => {
    const response = await api.post<CreditNote>(`/receivables/credit-notes/${id}/post`);
    return response.data;
  },

  void: async (id: number, voidReason: string, voidDate?: string): Promise<CreditNote> => {
    const response = await api.post<CreditNote>(`/receivables/credit-notes/${id}/void`, { voidReason, voidDate });
    return response.data;
  },

  submit: async (id: number): Promise<CreditNote> => {
    const response = await api.post<CreditNote>(`/receivables/credit-notes/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, comment?: string): Promise<CreditNote> => {
    const response = await api.post<CreditNote>(`/receivables/credit-notes/${id}/approve`, { comment });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<CreditNote> => {
    const response = await api.post<CreditNote>(`/receivables/credit-notes/${id}/reject`, { reason });
    return response.data;
  },
};

// ============================================================================
// RECEIVABLES REPORTS API
// ============================================================================

export interface AgedBalancesParams {
  asOfDate: string;
  agingPeriods?: number[];
  includeZeroBalances?: boolean;
  salesRepId?: number;
  customerType?: string;
  branchId?: number;
  customerId?: number;
}

export interface AgedBalancesReport {
  customers: CustomerAging[];
  summary: ReceivablesAgingSummary;
  asOfDate: string;
  agingPeriods: number[];
}

export interface CustomerLedgerParams {
  customerId: number;
  fromDate: string;
  toDate: string;
  includeZeroTransactions?: boolean;
  showRunningBalance?: boolean;
  transactionTypes?: string[];
}

export interface CustomerStatementLine {
  date: string;
  documentType: string;
  documentNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  branchName?: string;
}

export interface CustomerLedgerReport {
  customer: {
    id: number;
    name: string;
    code: string;
    email?: string;
  };
  transactions: CustomerStatementLine[];
  openingBalance: number;
  closingBalance: number;
  totals: {
    totalDebits: number;
    totalCredits: number;
  };
  fromDate: string;
  toDate: string;
}

export interface DailyTransactionsParams {
  date: string;
  branchId?: number;
  transactionType?: string;
}

export interface DailyTransactionsReport {
  date: string;
  transactions: {
    id: number;
    type: 'RECEIPT' | 'CREDIT_NOTE';
    documentNumber: string;
    customerId: number;
    customerName: string;
    description: string;
    amount: number;
    createdAt: string;
    createdByName: string;
  }[];
  summary: {
    totalReceipts: number;
    totalReceiptsAmount: number;
    totalCreditNotes: number;
    totalCreditNotesAmount: number;
    netAmount: number;
  };
}

export interface CollectionsReportParams {
  fromDate: string;
  toDate: string;
  branchId?: number;
  salesRepId?: number;
  groupBy?: 'day' | 'week' | 'month' | 'customer' | 'salesRep';
}

export interface CollectionsReport {
  data: {
    period: string;
    receiptsCount: number;
    receiptsAmount: number;
    creditNotesCount: number;
    creditNotesAmount: number;
    netAmount: number;
  }[];
  summary: {
    totalReceipts: number;
    totalReceiptsAmount: number;
    totalCreditNotes: number;
    totalCreditNotesAmount: number;
    netCollections: number;
  };
  fromDate: string;
  toDate: string;
}

// ============================================================================
// DEPOSITS API
// ============================================================================

export interface ReceivableDeposit {
  id: number;
  customerId: number;
  customerName?: string;
  depositNumber?: string;
  amount: number;
  appliedAmount: number;
  balance: number;
  status: string;
  depositDate: string;
  paymentMethodId?: number;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReceivableDepositDto {
  customerId: number;
  amount: number;
  depositDate: string;
  paymentMethodId?: number;
  reference?: string;
  notes?: string;
}

export interface UpdateReceivableDepositDto {
  amount?: number;
  depositDate?: string;
  paymentMethodId?: number;
  reference?: string;
  notes?: string;
}

export const depositsApi = {
  list: async (params?: { page?: number; limit?: number; search?: string; status?: string; customerId?: number }): Promise<PaginatedResponse<ReceivableDeposit>> => {
    const response = await api.get<PaginatedResponse<ReceivableDeposit>>('/receivables/deposits', { params });
    return response.data;
  },

  get: async (id: number): Promise<ReceivableDeposit> => {
    const response = await api.get(`/receivables/deposits/${id}`);
    return response.data;
  },

  create: async (data: CreateReceivableDepositDto): Promise<ReceivableDeposit> => {
    const response = await api.post('/receivables/deposits', data);
    return response.data;
  },

  update: async (id: number, data: UpdateReceivableDepositDto): Promise<ReceivableDeposit> => {
    const response = await api.put(`/receivables/deposits/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/receivables/deposits/${id}`);
  },

  post: async (id: number): Promise<ReceivableDeposit> => {
    const response = await api.post(`/receivables/deposits/${id}/post`);
    return response.data;
  },

  apply: async (id: number, allocations: { invoiceId: number; amount: number }[]): Promise<ReceivableDeposit> => {
    const response = await api.post(`/receivables/deposits/${id}/apply`, { allocations });
    return response.data;
  },

  refund: async (id: number, amount: number, reason?: string): Promise<ReceivableDeposit> => {
    const response = await api.post(`/receivables/deposits/${id}/refund`, { amount, reason });
    return response.data;
  },

  void: async (id: number, reason: string): Promise<ReceivableDeposit> => {
    const response = await api.post(`/receivables/deposits/${id}/void`, { reason });
    return response.data;
  },
};

export const receivablesReportsApi = {
  getAgingSummary: async (asOfDate?: string): Promise<ReceivablesAgingSummary> => {
    const response = await api.post('/receivables/reports/aged-balances', {
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      includeZeroBalances: false,
    });
    const s = response.data?.summary || {};
    const dataRows = response.data?.data || [];
    return {
      current: Number(s.totalCurrent || 0),
      days1to30: Number(s.total30Days || 0),
      days31to60: Number(s.total60Days || 0),
      days61to90: Number(s.total90Days || 0),
      over90Days: Number(s.total120Plus || 0),
      total: Number(s.grandTotal || 0),
      customerCount: dataRows.length,
    } as ReceivablesAgingSummary;
  },

  getAgingDetail: async (asOfDate?: string): Promise<CustomerAging[]> => {
    const response = await api.post('/receivables/reports/aged-balances', {
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      includeZeroBalances: false,
    });
    return (response.data?.data || []).map((r: Record<string, unknown>) => ({
      customerId: r.customerId,
      customerName: r.customerName,
      customerCode: r.customerCode,
      creditLimit: Number(r.creditLimit || 0),
      current: Number(r.current || 0),
      days1to30: Number(r.days30 || 0),
      days31to60: Number(r.days60 || 0),
      days61to90: Number(r.days90 || 0),
      over90Days: Number(r.days120Plus || 0),
      totalOutstanding: Number(r.totalBalance || 0),
    }));
  },

  /**
   * One customer's aging buckets — used by the Vet Client Billing tab and
   * any other detail view that wants a focused outstanding-balance breakdown.
   * Returns null if the customer has no AR rows (zero balance).
   */
  getCustomerAging: async (
    customerId: number,
    asOfDate?: string,
  ): Promise<CustomerAging | null> => {
    const response = await api.post('/receivables/reports/aged-balances', {
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      customerId,
      includeZeroBalances: true,
    });
    const row = (response.data?.data || [])[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      customerId: Number(row.customerId),
      customerName: String(row.customerName ?? ''),
      customerCode: String(row.customerCode ?? ''),
      creditLimit: Number(row.creditLimit || 0),
      current: Number(row.current || 0),
      days1to30: Number(row.days30 || 0),
      days31to60: Number(row.days60 || 0),
      days61to90: Number(row.days90 || 0),
      over90Days: Number(row.days120Plus || 0),
      totalOutstanding: Number(row.totalBalance || 0),
    };
  },

  getAgedBalances: async (params: AgedBalancesParams): Promise<AgedBalancesReport> => {
    const response = await api.get<AgedBalancesReport>('/receivables/reports/aged-balances', { params });
    return response.data;
  },

  getCustomerStatement: async (
    customerId: number,
    fromDate: string,
    toDate: string,
  ): Promise<CustomerStatement> => {
    const response = await api.post<CustomerStatement>('/receivables/reports/customer-statement', {
      customerId, dateFrom: fromDate, dateTo: toDate,
    });
    return response.data;
  },

  getCustomerLedger: async (params: CustomerLedgerParams): Promise<CustomerLedgerReport> => {
    const response = await api.post('/receivables/reports/customer-ledger', {
      ...params,
      includeRunningBalance: params.showRunningBalance ?? true,
    });
    const raw = response.data as Record<string, unknown>;
    const transactions = ((raw.data || raw.transactions || []) as Record<string, unknown>[]).map((t) => ({
      date: (t.transactionDate || t.date) as string,
      type: (t.transactionType || t.type) as string,
      reference: (t.documentNumber || t.reference) as string,
      description: (t.description || '') as string,
      debit: Number(t.debit || 0),
      credit: Number(t.credit || 0),
      balance: Number(t.runningBalance || t.balance || 0),
      branchName: (t.branchName || undefined) as string | undefined,
    }));
    const totalDebits = transactions.reduce((s, t) => s + t.debit, 0);
    const totalCredits = transactions.reduce((s, t) => s + t.credit, 0);
    return {
      customer: raw.customer,
      transactions,
      openingBalance: Number(raw.openingBalance || 0),
      closingBalance: Number(raw.closingBalance || 0),
      totals: { totalDebits, totalCredits },
    } as CustomerLedgerReport;
  },

  getDailyTransactions: async (params: DailyTransactionsParams): Promise<DailyTransactionsReport> => {
    const response = await api.post('/receivables/reports/daily-transactions', {
      transactionDate: params.date,
      transactionType: params.transactionType,
    });
    const raw = response.data as Record<string, unknown>;

    // Backend returns { invoices, receipts, creditNotes, summary } — transform to flat transactions list
    const invoices = (raw.invoices || []) as Record<string, unknown>[];
    const receipts = (raw.receipts || []) as Record<string, unknown>[];
    const creditNotes = (raw.creditNotes || []) as Record<string, unknown>[];
    const summary = (raw.summary || {}) as Record<string, unknown>;

    const transactions = [
      ...receipts.map((r, i) => ({
        id: Number(r.id || i + 1),
        type: 'RECEIPT' as const,
        documentNumber: (r.documentNumber || '') as string,
        customerId: Number(r.customerId || 0),
        customerName: (r.customerName || '') as string,
        description: (r.description || r.status || '') as string,
        amount: Number(r.amount || 0),
        createdAt: (r.createdAt || '') as string,
        createdByName: (r.createdByName || '') as string,
      })),
      ...creditNotes.map((cn, i) => ({
        id: Number(cn.id || receipts.length + i + 1),
        type: 'CREDIT_NOTE' as const,
        documentNumber: (cn.documentNumber || '') as string,
        customerId: Number(cn.customerId || 0),
        customerName: (cn.customerName || '') as string,
        description: (cn.description || cn.status || '') as string,
        amount: Number(cn.amount || 0),
        createdAt: (cn.createdAt || '') as string,
        createdByName: (cn.createdByName || '') as string,
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      date: params.date,
      transactions,
      summary: {
        totalReceipts: receipts.length,
        totalReceiptsAmount: Number(summary.totalReceipts || 0),
        totalCreditNotes: creditNotes.length,
        totalCreditNotesAmount: Number(summary.totalCreditNotes || 0),
        netAmount: Number(summary.totalReceipts || 0) - Number(summary.totalCreditNotes || 0),
      },
    };
  },

  getCollections: async (params: CollectionsReportParams): Promise<CollectionsReport> => {
    const response = await api.get<CollectionsReport>('/receivables/reports/collections', { params });
    return response.data;
  },

  exportReport: async (reportType: string, params: Record<string, unknown>, format: 'pdf' | 'excel' | 'csv'): Promise<Blob> => {
    const response = await api.get(`/receivables/reports/${reportType}/export/${format}`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
