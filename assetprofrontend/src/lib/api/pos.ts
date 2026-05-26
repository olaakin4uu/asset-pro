import { api } from '../api';
import type { PaginatedResponse } from '@/types/core';
import type {
  CashRegister,
  CreateCashRegisterDto,
  UpdateCashRegisterDto,
  CashRegisterListQuery,
  CashRegisterSession,
  OpenSessionDto,
  CloseSessionDto,
  SessionListQuery,
  SessionClosingSummary,
  CustomerDeposit,
  CreateCustomerDepositDto,
  UpdateCustomerDepositDto,
  DepositRefundDto,
  DepositApplicationDto,
  DepositListQuery,
  DepositStats,
  ExpensePayment,
  CreateExpensePaymentDto,
  UpdateExpensePaymentDto,
  ExpenseListQuery,
  ExpenseStats,
  CreateCashSaleDto,
  CreateCreditSaleDto,
  CreatePaymentReceiptDto,
  PaymentReceipt,
  POSDashboardStats,
  POSRecentTransaction,
  POSSettings,
  UpdatePOSSettingsDto,
  POSCustomer,
  CreatePOSCustomerDto,
  POSCustomerStatement,
  POSCustomerInvoice,
  POSCustomerStats,
  POSProduct,
  POSProductCategory,
  POSProductStock,
  POSProductSearchQuery,
} from '@/types/pos';

// ============================================================================
// CASH REGISTERS API
// ============================================================================

export const cashRegistersApi = {
  list: async (params?: CashRegisterListQuery): Promise<PaginatedResponse<CashRegister>> => {
    const response = await api.get<PaginatedResponse<CashRegister>>('/pos/settings/cash-registers', { params });
    return response.data;
  },

  get: async (id: number): Promise<CashRegister> => {
    const response = await api.get(`/pos/settings/cash-registers/${id}`);
    return response.data.data ?? response.data;
  },

  create: async (data: CreateCashRegisterDto): Promise<CashRegister> => {
    const response = await api.post('/pos/settings/cash-registers', data);
    return response.data.data ?? response.data;
  },

  update: async (id: number, data: UpdateCashRegisterDto): Promise<CashRegister> => {
    const response = await api.put(`/pos/settings/cash-registers/${id}`, data);
    return response.data.data ?? response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/pos/settings/cash-registers/${id}`);
  },

  getActive: async (branchId?: number): Promise<CashRegister[]> => {
    const response = await api.get('/pos/settings/cash-registers/active', {
      params: { branchId },
    });
    return response.data.data ?? response.data;
  },
};

// ============================================================================
// SESSIONS API
// ============================================================================

export const sessionsApi = {
  list: async (params?: SessionListQuery): Promise<PaginatedResponse<CashRegisterSession>> => {
    const response = await api.get('/pos/sessions', { params });
    return response.data;
  },

  get: async (id: number): Promise<CashRegisterSession> => {
    const response = await api.get(`/pos/sessions/${id}`);
    return response.data.data ?? response.data;
  },

  getCurrent: async (registerCode?: string): Promise<CashRegisterSession | null> => {
    const response = await api.get('/pos/sessions/current', {
      params: { registerCode },
    });
    return response.data.data ?? response.data;
  },

  open: async (data: OpenSessionDto): Promise<CashRegisterSession> => {
    const response = await api.post('/pos/sessions/open', data);
    return response.data.data ?? response.data;
  },

  close: async (id: number, data: CloseSessionDto): Promise<CashRegisterSession> => {
    const response = await api.post(`/pos/sessions/${id}/close`, data);
    return response.data.data ?? response.data;
  },

  getClosingSummary: async (id: number): Promise<SessionClosingSummary> => {
    const response = await api.get(`/pos/sessions/${id}/closing-summary`);
    return response.data.data ?? response.data;
  },

  getDetailReport: async (id: number): Promise<{
    session: CashRegisterSession;
    transactions: POSRecentTransaction[];
  }> => {
    const response = await api.get(`/pos/sessions/${id}/detail-report`);
    return response.data.data ?? response.data;
  },

  getHistory: async (limit?: number): Promise<CashRegisterSession[]> => {
    const response = await api.get('/pos/sessions/history', {
      params: { limit },
    });
    return response.data.data ?? response.data;
  },

  printReport: async (id: number, format: 'thermal' | 'a4'): Promise<Blob> => {
    const response = await api.post(`/pos/sessions/${id}/print`, { format }, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Open the printable shift-close report in a new browser tab.
   *
   * The backend serves text/html behind JWT auth, so we can't just
   * `window.open()` a URL — the browser tab wouldn't carry the
   * Authorization header. Instead we fetch the HTML through the authed
   * axios instance, wrap it in a Blob URL, and open that. The user then
   * uses the browser's native print dialog (Ctrl+P) to save as PDF.
   */
  openShiftCloseReport: async (id: number): Promise<void> => {
    const response = await api.get<string>(`/pos/sessions/${id}/shift-close-report`, {
      responseType: 'text',
      transformResponse: [(data: unknown) => (typeof data === 'string' ? data : String(data))],
    });
    const blob = new Blob([response.data], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    // Defer revoke so the new tab has time to load. Long enough for slow
    // browsers, short enough not to leak if the tab is reused.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};

// ============================================================================
// CUSTOMER DEPOSITS API
// ============================================================================

export const customerDepositsApi = {
  list: async (params?: DepositListQuery): Promise<PaginatedResponse<CustomerDeposit>> => {
    const response = await api.get<PaginatedResponse<CustomerDeposit>>('/pos/deposits', { params });
    return response.data;
  },

  get: async (id: number): Promise<CustomerDeposit> => {
    const response = await api.get<CustomerDeposit>(`/pos/deposits/${id}`);
    return response.data;
  },

  create: async (data: CreateCustomerDepositDto): Promise<CustomerDeposit> => {
    const response = await api.post<CustomerDeposit>('/pos/deposits', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCustomerDepositDto): Promise<CustomerDeposit> => {
    const response = await api.patch<CustomerDeposit>(`/pos/deposits/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/pos/deposits/${id}`);
  },

  getStats: async (): Promise<DepositStats> => {
    const response = await api.get<DepositStats>('/pos/deposits/stats');
    return response.data;
  },

  getAvailable: async (customerId: number): Promise<CustomerDeposit[]> => {
    const response = await api.get<CustomerDeposit[]>(`/pos/deposits/available/${customerId}`);
    return response.data;
  },

  refund: async (id: number, data: DepositRefundDto): Promise<CustomerDeposit> => {
    const response = await api.post<CustomerDeposit>(`/pos/deposits/${id}/refund`, data);
    return response.data;
  },

  apply: async (id: number, data: DepositApplicationDto): Promise<CustomerDeposit> => {
    const response = await api.post<CustomerDeposit>(`/pos/deposits/${id}/apply`, data);
    return response.data;
  },
};

// ============================================================================
// EXPENSE PAYMENTS API
// ============================================================================

export const expensePaymentsApi = {
  list: async (params?: ExpenseListQuery): Promise<PaginatedResponse<ExpensePayment>> => {
    const response = await api.get<PaginatedResponse<ExpensePayment>>('/pos/expenses', { params });
    return response.data;
  },

  get: async (id: number): Promise<ExpensePayment> => {
    const response = await api.get<ExpensePayment>(`/pos/expenses/${id}`);
    return response.data;
  },

  create: async (data: CreateExpensePaymentDto): Promise<ExpensePayment> => {
    const response = await api.post<ExpensePayment>('/pos/expenses', data);
    return response.data;
  },

  update: async (id: number, data: UpdateExpensePaymentDto): Promise<ExpensePayment> => {
    const response = await api.patch<ExpensePayment>(`/pos/expenses/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/pos/expenses/${id}`);
  },

  getStats: async (): Promise<ExpenseStats> => {
    const response = await api.get<ExpenseStats>('/pos/expenses/stats');
    return response.data;
  },

  post: async (id: number): Promise<ExpensePayment> => {
    const response = await api.post<ExpensePayment>(`/pos/expenses/${id}/post`);
    return response.data;
  },

  void: async (id: number, reason: string): Promise<ExpensePayment> => {
    const response = await api.post<ExpensePayment>(`/pos/expenses/${id}/void`, { reason });
    return response.data;
  },
};

// ============================================================================
// POS TRANSACTIONS API
// ============================================================================

export const posTransactionsApi = {
  createCashSale: async (data: CreateCashSaleDto): Promise<{ invoice: Record<string, unknown>; receipt: PaymentReceipt }> => {
    const response = await api.post('/pos/transactions/cash-sale', data);
    return response.data;
  },

  createCreditSale: async (data: CreateCreditSaleDto): Promise<{ invoice: Record<string, unknown> }> => {
    const response = await api.post('/pos/transactions/credit-sale', data);
    return response.data;
  },

  recordPayment: async (data: CreatePaymentReceiptDto): Promise<PaymentReceipt> => {
    const response = await api.post<PaymentReceipt>('/pos/transactions/payment', data);
    return response.data;
  },

  getInvoice: async (invoiceNumber: string): Promise<Record<string, unknown>> => {
    const response = await api.get(`/pos/invoices/${invoiceNumber}`);
    return response.data;
  },

  printInvoice: async (invoiceNumber: string, format: 'thermal' | 'a4'): Promise<Blob> => {
    const response = await api.post(`/pos/invoices/${invoiceNumber}/print`, { format }, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// ============================================================================
// POS DASHBOARD API
// ============================================================================

export const posDashboardApi = {
  getStats: async (): Promise<POSDashboardStats> => {
    const response = await api.get<POSDashboardStats>('/pos/dashboard/stats');
    return response.data;
  },

  getRecentTransactions: async (limit?: number): Promise<POSRecentTransaction[]> => {
    const response = await api.get<POSRecentTransaction[]>('/pos/dashboard/recent-transactions', {
      params: { limit },
    });
    return response.data;
  },
};

// ============================================================================
// POS SETTINGS API
// ============================================================================

export const posSettingsApi = {
  get: async (): Promise<POSSettings> => {
    const response = await api.get('/pos/settings');
    return response.data.data ?? response.data;
  },

  update: async (data: UpdatePOSSettingsDto): Promise<POSSettings> => {
    const response = await api.patch('/pos/settings', data);
    return response.data.data ?? response.data;
  },
};

// ============================================================================
// POS PRODUCTS API
// ============================================================================

export const posProductsApi = {
  search: async (params?: POSProductSearchQuery): Promise<{ products: POSProduct[]; count: number }> => {
    const response = await api.get('/pos/products/search', { params: params || {} });
    return response.data.data ?? response.data;
  },

  get: async (id: number): Promise<POSProduct> => {
    const response = await api.get(`/pos/products/${id}`);
    return response.data.data ?? response.data;
  },

  getByBarcode: async (barcode: string): Promise<POSProduct> => {
    const response = await api.get(`/pos/products/barcode/${barcode}`);
    return response.data.data ?? response.data;
  },

  getCategories: async (): Promise<POSProductCategory[]> => {
    const response = await api.get('/pos/products/categories');
    return response.data.data ?? response.data;
  },

  getStock: async (id: number): Promise<POSProductStock[]> => {
    const response = await api.get(`/pos/products/stock/${id}`);
    return response.data.data ?? response.data;
  },
};

// ============================================================================
// POS CUSTOMERS API
// ============================================================================

export const posCustomersApi = {
  list: async (params?: { search?: string; limit?: number }): Promise<{ customers: POSCustomer[]; count: number }> => {
    const response = await api.get('/pos/customers/search', { params: { q: params?.search, limit: params?.limit } });
    return response.data.data ?? response.data;
  },

  get: async (id: number): Promise<POSCustomer> => {
    const response = await api.get(`/pos/customers/${id}`);
    return response.data.data ?? response.data;
  },

  create: async (data: CreatePOSCustomerDto): Promise<POSCustomer> => {
    const response = await api.post('/pos/customers/walk-in', data);
    return response.data.data ?? response.data;
  },

  update: async (id: number, data: Partial<CreatePOSCustomerDto>): Promise<POSCustomer> => {
    // POS customers are updated via the sales customers endpoint
    const response = await api.patch(`/sales/customers/${id}`, data);
    return response.data.data ?? response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/customers/${id}`);
  },

  getStats: async (): Promise<POSCustomerStats> => {
    // Build stats from the search results
    const response = await api.get('/pos/customers/search', { params: { limit: 1000 } });
    const allCustomers: POSCustomer[] = response.data.data?.customers ?? response.data.customers ?? [];
    return {
      total: allCustomers.length,
      active: allCustomers.length,
      withBalance: allCustomers.filter((c) => c.balance > 0).length,
      withDeposits: allCustomers.filter((c) => c.availableDeposit > 0).length,
      totalOutstanding: allCustomers.reduce((sum, c) => sum + c.balance, 0),
      totalDeposits: allCustomers.reduce((sum, c) => sum + c.availableDeposit, 0),
    };
  },

  search: async (query: string, limit?: number): Promise<POSCustomer[]> => {
    const response = await api.get('/pos/customers/search', { params: { q: query, limit } });
    return response.data.data?.customers ?? response.data.customers ?? [];
  },

  getWalkIn: async (): Promise<POSCustomer> => {
    const response = await api.get('/pos/customers/walk-in');
    return response.data.data ?? response.data;
  },

  getStatement: async (id: number): Promise<POSCustomerStatement> => {
    const response = await api.get(`/pos/customers/${id}/statement`);
    return response.data.data ?? response.data;
  },

  getInvoices: async (id: number, unpaidOnly?: boolean): Promise<POSCustomerInvoice[]> => {
    const response = await api.get(`/pos/customers/${id}/invoices`, { params: { unpaidOnly } });
    return response.data.data ?? response.data;
  },
};

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const posApi = {
  registers: cashRegistersApi,
  sessions: sessionsApi,
  deposits: customerDepositsApi,
  expenses: expensePaymentsApi,
  transactions: posTransactionsApi,
  dashboard: posDashboardApi,
  settings: posSettingsApi,
  products: posProductsApi,
  customers: posCustomersApi,
};
