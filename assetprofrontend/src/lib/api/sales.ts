import { api } from '../api';
import type { PaginatedResponse } from '@/types/core';
import type {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '@/app/sales/customers/components/CustomerForm';
import type {
  SalesOrder,
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  SalesOrderListQuery,
  LoadingOrder,
  CreateLoadingOrderDto,
  UpdateLoadingOrderDto,
  LoadingOrderListQuery,
  SalesDelivery,
  CreateSalesDeliveryDto,
  UpdateSalesDeliveryDto,
  SalesDeliveryListQuery,
  SalesInvoice,
  CreateSalesInvoiceDto,
  UpdateSalesInvoiceDto,
  SalesInvoiceListQuery,
  InvoicePayment,
  CreateInvoicePaymentDto,
  UpdateInvoicePaymentDto,
  SalesArea,
  CreateSalesAreaDto,
  UpdateSalesAreaDto,
  SalesAreaListQuery,
  CustomerBranch,
  CreateCustomerBranchDto,
  UpdateCustomerBranchDto,
  CustomerBranchListQuery,
  SalesSettings,
  UpdateSalesSettingsDto,
  SalesStats,
  SalesDashboard,
} from '@/types/sales';

// ============================================================================
// SALES ORDERS API
// ============================================================================

export const salesOrdersApi = {
  list: async (query?: SalesOrderListQuery): Promise<PaginatedResponse<SalesOrder>> => {
    const response = await api.get('/sales/orders', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<SalesOrder> => {
    const response = await api.get(`/sales/orders/${id}`);
    return response.data;
  },

  create: async (data: CreateSalesOrderDto): Promise<SalesOrder> => {
    const response = await api.post('/sales/orders', data);
    return response.data;
  },

  update: async (id: number, data: UpdateSalesOrderDto): Promise<SalesOrder> => {
    const response = await api.put(`/sales/orders/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/orders/${id}`);
  },

  submit: async (id: number): Promise<SalesOrder> => {
    const response = await api.post(`/sales/orders/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, comment?: string): Promise<SalesOrder> => {
    const response = await api.post(`/sales/orders/${id}/approve`, { comment });
    return response.data;
  },

  reject: async (id: number, comment: string): Promise<SalesOrder> => {
    const response = await api.post(`/sales/orders/${id}/reject`, { comment });
    return response.data;
  },

  return: async (id: number, comment: string): Promise<SalesOrder> => {
    const response = await api.post(`/sales/orders/${id}/return`, { comment });
    return response.data;
  },

  amend: async (id: number, reason: string): Promise<SalesOrder> => {
    const response = await api.post(`/sales/orders/${id}/amend`, { reason });
    return response.data;
  },

  cancel: async (id: number, reason?: string): Promise<SalesOrder> => {
    const response = await api.post(`/sales/orders/${id}/cancel`, { reason });
    return response.data;
  },

  getStats: async (): Promise<SalesStats> => {
    const response = await api.get('/sales/orders/stats');
    return response.data;
  },

  // Get orders for a specific customer
  getByCustomer: async (customerId: number): Promise<SalesOrder[]> => {
    const response = await api.get('/sales/orders', { params: { customerId, limit: 100 } });
    return response.data?.data ?? response.data ?? [];
  },

  getForPrint: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/sales/orders/${id}/print`);
    return response.data;
  },
};

// ============================================================================
// SALES PRINT API
// ============================================================================

export const salesPrintApi = {
  deliveryNotePdf: async (deliveryId: number): Promise<Blob> => {
    const response = await api.get(`/sales/print/delivery/${deliveryId}`, { responseType: 'blob' });
    return response.data;
  },
  invoicePdf: async (invoiceId: number): Promise<Blob> => {
    const response = await api.get(`/sales/print/invoice/${invoiceId}`, { responseType: 'blob' });
    return response.data;
  },
};

// ============================================================================
// LOADING ORDERS API
// ============================================================================

export interface LoadingOrderPipelineCard {
  id: number;
  loadingNumber: string;
  customer: string | null;
  /** Hours since the LO entered its current stage. Frontend uses this for SLA colour. */
  ageHours: number;
  ownerName: string | null;
}

export interface LoadingOrderPipelineBoard {
  pendingInspection: LoadingOrderPipelineCard[];
  awaitingDispatch: LoadingOrderPipelineCard[];
  inTransit: LoadingOrderPipelineCard[];
  awaitingInvoice: LoadingOrderPipelineCard[];
  closed: LoadingOrderPipelineCard[];
}

export interface LoadingOrderTimelineEntry {
  at: string;
  kind:
    | 'created'
    | 'inspection_started'
    | 'inspection_approved'
    | 'inspection_rejected'
    | 'inspection_passed'
    | 'inspection_failed'
    | 'approval'
    | 'loaded'
    | 'dispatched'
    | 'delivered'
    | 'completed'
    | 'invoiced';
  label: string;
  actor: string | null;
  detail: string | null;
}

export const loadingOrdersApi = {
  list: async (query?: LoadingOrderListQuery): Promise<PaginatedResponse<LoadingOrder>> => {
    const response = await api.get('/sales/loading-orders', { params: query });
    return response.data;
  },

  getTimeline: async (id: number): Promise<LoadingOrderTimelineEntry[]> => {
    const response = await api.get(`/sales/loading-orders/${id}/timeline`);
    return response.data;
  },

  getPipeline: async (): Promise<LoadingOrderPipelineBoard> => {
    const response = await api.get('/sales/loading-orders/pipeline');
    return response.data;
  },

  get: async (id: number): Promise<LoadingOrder> => {
    const response = await api.get(`/sales/loading-orders/${id}`);
    return response.data;
  },

  create: async (data: CreateLoadingOrderDto): Promise<LoadingOrder> => {
    const response = await api.post('/sales/loading-orders', data);
    return response.data;
  },

  update: async (id: number, data: UpdateLoadingOrderDto): Promise<LoadingOrder> => {
    const response = await api.put(`/sales/loading-orders/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/loading-orders/${id}`);
  },

  complete: async (id: number): Promise<LoadingOrder> => {
    const response = await api.post(`/sales/loading-orders/${id}/complete`);
    return response.data;
  },

  dispatch: async (id: number, data?: { notes?: string }): Promise<LoadingOrder> => {
    const response = await api.post(`/sales/loading-orders/${id}/dispatch`, data || {});
    return response.data;
  },

  markDelivered: async (id: number): Promise<LoadingOrder> => {
    const response = await api.post(`/sales/loading-orders/${id}/delivered`);
    return response.data;
  },

  processAfterInspection: async (id: number): Promise<{ dispatch: boolean; delivery: { id: number; number: string }; invoice: { id: number; number: string }; glPosted: boolean }> => {
    const response = await api.post(`/sales/loading-orders/${id}/process`);
    return response.data;
  },

  // Get loading orders for a sales order
  getBySalesOrder: async (salesOrderId: number): Promise<LoadingOrder[]> => {
    const response = await api.get(`/sales/orders/${salesOrderId}/loading-orders`);
    return response.data;
  },
};

// ============================================================================
// SALES DELIVERIES API
// ============================================================================

export const salesDeliveriesApi = {
  list: async (query?: SalesDeliveryListQuery): Promise<PaginatedResponse<SalesDelivery>> => {
    const response = await api.get('/sales/deliveries', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<SalesDelivery> => {
    const response = await api.get(`/sales/deliveries/${id}`);
    return response.data;
  },

  create: async (data: CreateSalesDeliveryDto): Promise<SalesDelivery> => {
    const response = await api.post('/sales/deliveries', data);
    return response.data;
  },

  update: async (id: number, data: UpdateSalesDeliveryDto): Promise<SalesDelivery> => {
    const response = await api.patch(`/sales/deliveries/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/deliveries/${id}`);
  },

  submit: async (id: number): Promise<SalesDelivery> => {
    const response = await api.post(`/sales/deliveries/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, comment?: string): Promise<SalesDelivery> => {
    const response = await api.post(`/sales/deliveries/${id}/approve`, { comment });
    return response.data;
  },

  reject: async (id: number, comment: string): Promise<SalesDelivery> => {
    const response = await api.post(`/sales/deliveries/${id}/reject`, { comment });
    return response.data;
  },

  markDelivered: async (id: number): Promise<SalesDelivery> => {
    const response = await api.post(`/sales/deliveries/${id}/delivered`);
    return response.data;
  },

  // Get deliveries for a sales order
  getBySalesOrder: async (salesOrderId: number): Promise<SalesDelivery[]> => {
    const response = await api.get(`/sales/orders/${salesOrderId}/deliveries`);
    return response.data;
  },

  retryAutoInvoice: async (id: number): Promise<{ invoiceId: number; invoiceNumber: string }> => {
    const response = await api.post(`/sales/deliveries/${id}/retry-auto-invoice`);
    return response.data;
  },

  repairStockAndCogs: async (id: number): Promise<{
    deliveryNumber: string;
    stockMovementsCreated: number;
    cogsJournalCreated: boolean;
    cogsAmount: number;
    skippedReason: string | null;
  }> => {
    const response = await api.post(`/sales/deliveries/${id}/repair-stock-and-cogs`);
    return response.data;
  },
};

// ============================================================================
// SALES INVOICES API
// ============================================================================

export const salesInvoicesApi = {
  list: async (query?: SalesInvoiceListQuery): Promise<PaginatedResponse<SalesInvoice>> => {
    const response = await api.get('/sales/invoices', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<SalesInvoice> => {
    const response = await api.get(`/sales/invoices/${id}`);
    return response.data;
  },

  create: async (data: CreateSalesInvoiceDto): Promise<SalesInvoice> => {
    const response = await api.post('/sales/invoices', data);
    return response.data;
  },

  createProforma: async (data: CreateSalesInvoiceDto): Promise<SalesInvoice> => {
    const response = await api.post('/sales/invoices/proforma', data);
    return response.data;
  },

  voidProforma: async (id: number): Promise<void> => {
    await api.post(`/sales/invoices/${id}/void-proforma`);
  },

  update: async (id: number, data: UpdateSalesInvoiceDto): Promise<SalesInvoice> => {
    const response = await api.patch(`/sales/invoices/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/invoices/${id}`);
  },

  submit: async (id: number): Promise<SalesInvoice> => {
    const response = await api.post(`/sales/invoices/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, comment?: string): Promise<SalesInvoice> => {
    const response = await api.post(`/sales/invoices/${id}/approve`, { comment });
    return response.data;
  },

  reject: async (id: number, comment: string): Promise<SalesInvoice> => {
    const response = await api.post(`/sales/invoices/${id}/reject`, { comment });
    return response.data;
  },

  void: async (id: number, reason: string, voidDate?: string): Promise<SalesInvoice> => {
    const response = await api.post(`/sales/invoices/${id}/void`, { reason, voidDate });
    return response.data;
  },

  sendToCustomer: async (id: number): Promise<void> => {
    await api.post(`/sales/invoices/${id}/send`);
  },

  // Get invoices for a customer
  getByCustomer: async (customerId: number): Promise<SalesInvoice[]> => {
    const response = await api.get(`/sales/invoices`, { params: { customerId, limit: 200 } });
    return response.data?.data ?? response.data ?? [];
  },

  // Get unpaid invoices for a customer
  getUnpaidByCustomer: async (customerId: number): Promise<SalesInvoice[]> => {
    const response = await api.get(`/sales/invoices/customer/${customerId}/unpaid`);
    return response.data;
  },

  getStats: async (): Promise<Record<string, number>> => {
    const response = await api.get('/sales/invoices/stats');
    return response.data;
  },

  createFromDelivery: async (data: { salesDeliveryId: number; invoiceDate: string; dueDate: string; notes?: string }): Promise<SalesInvoice> => {
    const response = await api.post('/sales/invoices/from-delivery', data);
    return response.data;
  },

  convertToOrder: async (id: number): Promise<{ orderId: number; orderNumber: string }> => {
    const response = await api.post(`/sales/invoices/${id}/convert-to-order`);
    return response.data;
  },
};

// ============================================================================
// INVOICE PAYMENTS API
// ============================================================================

export const invoicePaymentsApi = {
  list: async (invoiceId: number): Promise<InvoicePayment[]> => {
    const response = await api.get(`/sales/invoices/${invoiceId}/payments`);
    return response.data;
  },

  get: async (id: number): Promise<InvoicePayment> => {
    const response = await api.get(`/sales/payments/${id}`);
    return response.data;
  },

  create: async (data: CreateInvoicePaymentDto): Promise<InvoicePayment> => {
    const response = await api.post('/sales/payments', data);
    return response.data;
  },

  update: async (id: number, data: UpdateInvoicePaymentDto): Promise<InvoicePayment> => {
    const response = await api.patch(`/sales/payments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/payments/${id}`);
  },

  approve: async (id: number): Promise<InvoicePayment> => {
    const response = await api.post(`/sales/payments/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<InvoicePayment> => {
    const response = await api.post(`/sales/payments/${id}/reject`, { reason });
    return response.data;
  },
};

// ============================================================================
// SALES AREAS API
// ============================================================================

export const salesAreasApi = {
  list: async (query?: SalesAreaListQuery): Promise<PaginatedResponse<SalesArea>> => {
    const response = await api.get('/sales/areas', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<SalesArea> => {
    const response = await api.get(`/sales/areas/${id}`);
    return response.data;
  },

  create: async (data: CreateSalesAreaDto): Promise<SalesArea> => {
    const response = await api.post('/sales/areas', data);
    return response.data;
  },

  update: async (id: number, data: UpdateSalesAreaDto): Promise<SalesArea> => {
    const response = await api.put(`/sales/areas/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/areas/${id}`);
  },

  getActive: async (): Promise<SalesArea[]> => {
    const response = await api.get('/sales/areas', { params: { isActive: true, limit: 100 } });
    return response.data.data;
  },
};

// ============================================================================
// CUSTOMER BRANCHES API
// ============================================================================

export const customerBranchesApi = {
  list: async (query?: CustomerBranchListQuery): Promise<PaginatedResponse<CustomerBranch>> => {
    const response = await api.get('/sales/customer-branches', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<CustomerBranch> => {
    const response = await api.get(`/sales/customer-branches/${id}`);
    return response.data;
  },

  create: async (data: CreateCustomerBranchDto): Promise<CustomerBranch> => {
    const response = await api.post('/sales/customer-branches', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCustomerBranchDto): Promise<CustomerBranch> => {
    const response = await api.patch(`/sales/customer-branches/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/customer-branches/${id}`);
  },

  // Get branches for a specific customer
  getByCustomer: async (customerId: number): Promise<CustomerBranch[]> => {
    const response = await api.get('/sales/customer-branches', { params: { customerId, limit: 100 } });
    return response.data?.data || response.data || [];
  },
};

// ============================================================================
// SALES SETTINGS API
// ============================================================================

export const salesSettingsApi = {
  get: async (): Promise<SalesSettings> => {
    const response = await api.get('/sales/settings');
    return response.data;
  },

  update: async (data: UpdateSalesSettingsDto): Promise<SalesSettings> => {
    const response = await api.patch('/sales/settings', data);
    return response.data;
  },

  reset: async (): Promise<SalesSettings> => {
    const response = await api.post('/sales/settings/reset');
    return response.data;
  },
};

// ============================================================================
// SALES DASHBOARD API
// ============================================================================

// ============================================================================
// SALES REPORTS API
// ============================================================================

export const salesReportsApi = {
  grossProfitByCustomer: async (dateFrom: string, dateTo: string): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/sales/reports/gross-profit-by-customer', { params: { dateFrom, dateTo } });
    return response.data;
  },
  grossProfitByProduct: async (dateFrom: string, dateTo: string): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/sales/reports/gross-profit-by-product', { params: { dateFrom, dateTo } });
    return response.data;
  },
  salesVsCollection: async (dateFrom: string, dateTo: string): Promise<Record<string, unknown>> => {
    const response = await api.get('/sales/reports/sales-vs-collection', { params: { dateFrom, dateTo } });
    return response.data;
  },
  creditLimitUtilization: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/sales/reports/credit-limit-utilization');
    return response.data;
  },
  taxLiability: async (dateFrom: string, dateTo: string): Promise<Record<string, unknown>> => {
    const response = await api.get('/sales/reports/tax-liability', { params: { dateFrom, dateTo } });
    return response.data;
  },
  revenueByRep: async (dateFrom: string, dateTo: string): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/sales/reports/revenue-by-rep', { params: { dateFrom, dateTo } });
    return response.data;
  },
  revenueByBranch: async (dateFrom: string, dateTo: string): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/sales/reports/revenue-by-branch', { params: { dateFrom, dateTo } });
    return response.data;
  },
  profitabilityReport: async (params: {
    dateFrom: string;
    dateTo: string;
    salesAreaId?: number;
    salesRepId?: number;
    categoryId?: number;
  }): Promise<ProfitabilityReportData> => {
    const response = await api.get('/sales/reports/profitability', { params });
    return response.data;
  },

  invoiceAging: async (asOfDate?: string): Promise<Record<string, unknown>> => {
    const response = await api.get('/sales/reports/aging', { params: asOfDate ? { asOfDate } : {} });
    return response.data;
  },

  soInvoiceStatus: async (params: {
    dateFrom: string;
    dateTo: string;
    customerId?: number;
    status?: string;
  }): Promise<Record<string, unknown>> => {
    const response = await api.get('/sales/reports/so-invoice-status', { params });
    return response.data;
  },

  fulfillmentQty: async (params: {
    dateFrom: string;
    dateTo: string;
    groupBy: 'order' | 'item';
    customerId?: number;
    itemId?: number;
  }): Promise<{
    rows: Record<string, unknown>[];
    summary: {
      orderedQty: number;
      fulfilledQty: number;
      balanceQty: number;
      orderedValue: number;
      fulfilledValue: number;
      balanceValue: number;
      fulfillmentPct: number;
    };
    groupBy: 'order' | 'item';
  }> => {
    const response = await api.get('/sales/reports/fulfillment-qty', { params });
    return response.data;
  },

  summary: async (dateFrom: string, dateTo: string): Promise<Record<string, unknown>> => {
    const response = await api.get('/sales/reports/summary', { params: { dateFrom, dateTo } });
    return response.data;
  },

  productSales: async (params: { dateFrom: string; dateTo: string; categoryId?: number }): Promise<Record<string, unknown>> => {
    const response = await api.get('/sales/reports/product-sales', { params });
    return response.data;
  },

  weeklyReport: async (dateFrom: string, dateTo: string): Promise<Record<string, unknown>> => {
    const response = await api.get('/sales/reports/weekly', { params: { dateFrom, dateTo } });
    return response.data;
  },
};

export const salesDashboardApi = {
  get: async (): Promise<SalesDashboard> => {
    const response = await api.get('/sales/dashboard');
    return response.data;
  },

  getStats: async (): Promise<SalesStats> => {
    const response = await api.get('/sales/stats');
    return response.data;
  },
};

// ============================================================================
// CUSTOMERS API
// ============================================================================

export const customersApi = {
  list: async (query?: { search?: string; customerType?: string; isActive?: boolean; page?: number; limit?: number }): Promise<PaginatedResponse<Customer>> => {
    const response = await api.get('/sales/customers', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Customer> => {
    const response = await api.get(`/sales/customers/${id}`);
    return response.data;
  },

  create: async (data: CreateCustomerDto): Promise<Customer> => {
    const response = await api.post('/sales/customers', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCustomerDto): Promise<Customer> => {
    const response = await api.put(`/sales/customers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/customers/${id}`);
  },

  getActive: async (): Promise<Customer[]> => {
    const response = await api.get('/sales/customers', { params: { isActive: true, limit: 500 } });
    return response.data.data;
  },

  importOpeningBalances: async (data: { items: Array<{ customerCodeOrEmail: string; openingBalance: number; openingBalanceDate?: string }>; postToGL?: boolean }): Promise<Record<string, unknown>> => {
    const response = await api.post('/sales/customers/import-opening-balances', data);
    return response.data;
  },
};

// ============================================================================
// CUSTOMERS API (Sales-specific endpoints)
// ============================================================================

export const salesCustomersApi = {
  getDetails: async (customerId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/sales/customers/${customerId}/details`);
    return response.data;
  },

  getCreditInfo: async (customerId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/sales/customers/${customerId}/credit-info`);
    return response.data;
  },

  getUnpaidInvoices: async (customerId: number): Promise<Record<string, unknown>[]> => {
    const response = await api.get(`/sales/customers/${customerId}/unpaid-invoices`);
    return response.data;
  },
};

// ============================================================================
// CREDIT NOTES API
// ============================================================================

export const creditNotesApi = {
  list: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/sales/credit-notes', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/sales/credit-notes/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/sales/credit-notes', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.put(`/sales/credit-notes/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/credit-notes/${id}`);
  },

  submit: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.post(`/sales/credit-notes/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, notes?: string): Promise<Record<string, unknown>> => {
    const response = await api.post(`/sales/credit-notes/${id}/approve`, { notes });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<Record<string, unknown>> => {
    const response = await api.post(`/sales/credit-notes/${id}/reject`, { reason });
    return response.data;
  },

  post: async (id: number, postingDate?: Date, notes?: string): Promise<Record<string, unknown>> => {
    const response = await api.post(`/sales/credit-notes/${id}/post`, { postingDate, notes });
    return response.data;
  },

  void: async (id: number, reason: string, voidDate?: string): Promise<Record<string, unknown>> => {
    const response = await api.post(`/sales/credit-notes/${id}/void`, { reason, voidDate });
    return response.data;
  },

  allocate: async (data: { creditNoteId: number; invoiceId: number; allocatedAmount: number; allocationDate?: Date; notes?: string }): Promise<Record<string, unknown>> => {
    const response = await api.post('/sales/credit-notes/allocate', data);
    return response.data;
  },

  getStats: async (companyId?: number, customerId?: number): Promise<Record<string, unknown>> => {
    const response = await api.get('/sales/credit-notes/stats', { params: { companyId, customerId } });
    return response.data;
  },
};

// ============================================================================
// COMMISSIONS API
// ============================================================================

export const commissionsApi = {
  // Commission Rules
  createRule: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/sales/commissions/rules', data);
    return response.data;
  },

  getRules: async (companyId: number): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/sales/commissions/rules', { params: { companyId } });
    return response.data;
  },

  getRule: async (companyId: number, id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/sales/commissions/rules/${id}`, { params: { companyId } });
    return response.data;
  },

  updateRule: async (companyId: number, id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.put(`/sales/commissions/rules/${id}`, data, { params: { companyId } });
    return response.data;
  },

  deleteRule: async (companyId: number, id: number): Promise<void> => {
    await api.delete(`/sales/commissions/rules/${id}`, { params: { companyId } });
  },

  // Commission Calculations
  calculate: async (data: { companyId: number; salesRepId?: number; startDate: Date; endDate: Date; autoApprove?: boolean }): Promise<Record<string, unknown>> => {
    const response = await api.post('/sales/commissions/calculate', data);
    return response.data;
  },

  createCalculation: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/sales/commissions/calculations', data);
    return response.data;
  },

  getCalculations: async (query?: Record<string, unknown>): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/sales/commissions/calculations', { params: query });
    return response.data;
  },

  getCalculation: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/sales/commissions/calculations/${id}`);
    return response.data;
  },

  deleteCalculation: async (id: number): Promise<void> => {
    await api.delete(`/sales/commissions/calculations/${id}`);
  },

  // Reports
  getReport: async (companyId: number, startDate?: Date, endDate?: Date): Promise<Record<string, unknown>[]> => {
    const params = { companyId, startDate: startDate?.toISOString(), endDate: endDate?.toISOString() };
    const response = await api.get('/sales/commissions/report', { params });
    return response.data;
  },

  getSummary: async (companyId: number, startDate?: Date, endDate?: Date): Promise<Record<string, unknown>> => {
    const params = { companyId, startDate: startDate?.toISOString(), endDate: endDate?.toISOString() };
    const response = await api.get('/sales/commissions/summary', { params });
    return response.data;
  },

  // Approval & Payment
  approve: async (commissionIds: number[], notes?: string): Promise<void> => {
    await api.post('/sales/commissions/approve', { commissionIds, notes });
  },

  pay: async (
    commissionIds: number[],
    paymentDate: Date,
    paymentJournalEntryId?: number,
    notes?: string,
    bankAccountId?: number,
    paymentReference?: string,
  ): Promise<void> => {
    await api.post('/sales/commissions/pay', { commissionIds, paymentDate, paymentJournalEntryId, notes, bankAccountId, paymentReference });
  },

  settleCustomerCredit: async (
    commissionIds: number[],
    paymentDate: Date,
    notes?: string,
  ): Promise<{ message: string; creditNotes: Array<{ creditNoteId: number; creditNoteNumber: string; customerId: number; amount: number }> }> => {
    const response = await api.post('/sales/commissions/settle-customer-credit', { commissionIds, paymentDate, notes });
    return response.data;
  },

  settleCustomerCash: async (
    commissionIds: number[],
    paymentDate: Date,
    expenseAccountId?: number,
    notes?: string,
  ): Promise<{ message: string; expenseRequests: Array<{ customerId: number; customerName: string; requestId: number; requestNumber: string; amount: number }> }> => {
    const response = await api.post('/sales/commissions/settle-customer-cash', { commissionIds, paymentDate, expenseAccountId, notes });
    return response.data;
  },
};

// ============================================================================
// SALES FORECASTS API
// ============================================================================

export const salesForecastsApi = {
  list: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/sales/forecasts', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/sales/forecasts/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/sales/forecasts', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.put(`/sales/forecasts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/forecasts/${id}`);
  },

  generate: async (data: {
    companyId: number;
    itemIds: number[];
    startDate: Date;
    endDate: Date;
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    method: 'manual' | 'moving_average' | 'exponential_smoothing' | 'seasonal';
    confidenceLevel?: number;
    historicalPeriods?: number;
    overwriteExisting?: boolean;
  }): Promise<Record<string, unknown>> => {
    const response = await api.post('/sales/forecasts/generate', data);
    return response.data;
  },

  updateActuals: async (data: {
    companyId: number;
    startDate: Date;
    endDate: Date;
    calculateFromSales?: boolean;
  }): Promise<Record<string, unknown>> => {
    const response = await api.post('/sales/forecasts/update-actuals', data);
    return response.data;
  },

  getAccuracyByItem: async (companyId: number, startDate?: Date, endDate?: Date): Promise<Record<string, unknown>[]> => {
    const params = { companyId, startDate: startDate?.toISOString(), endDate: endDate?.toISOString() };
    const response = await api.get('/sales/forecasts/accuracy/by-item', { params });
    return response.data;
  },

  getAccuracySummary: async (companyId: number, startDate?: Date, endDate?: Date): Promise<Record<string, unknown>> => {
    const params = { companyId, startDate: startDate?.toISOString(), endDate: endDate?.toISOString() };
    const response = await api.get('/sales/forecasts/accuracy/summary', { params });
    return response.data;
  },

  getVarianceAnalysis: async (companyId: number, itemId?: number, startDate?: Date, endDate?: Date): Promise<Record<string, unknown>> => {
    const params = { companyId, itemId, startDate: startDate?.toISOString(), endDate: endDate?.toISOString() };
    const response = await api.get('/sales/forecasts/variance/analysis', { params });
    return response.data;
  },
};

// ============================================================================
// COMBINED EXPORT
// ============================================================================

// ============================================================================
// SALES REPS
// ============================================================================

export const salesRepsApi = {
  getAll: async (params?: Record<string, unknown>) => {
    const response = await api.get('/sales/reps', { params: { limit: 500, ...params } });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/sales/reps/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/sales/reps', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.put(`/sales/reps/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/sales/reps/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/sales/reps/stats');
    return response.data;
  },

  importReps: async (
    items: import('@/types/sales').ImportSalesRepRow[],
    importMode?: 'skip' | 'update' | 'overwrite',
    branchId?: number | null,
  ): Promise<import('@/types/sales').ImportSalesRepsResult> => {
    const response = await api.post('/sales/reps/import', {
      items,
      importMode,
      branchId: branchId ?? undefined,
    });
    return response.data;
  },
};

// ============================================================================
// ============================================================================
// LOADING INSPECTION API
// ============================================================================

export const loadingInspectionApi = {
  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/sales/loading-inspections/${id}`);
    return response.data;
  },

  getByLoadingOrder: async (loadingOrderId: number): Promise<Record<string, unknown> | null> => {
    try {
      const response = await api.get(`/sales/loading-inspections/by-loading-order/${loadingOrderId}`);
      return response.data;
    } catch { return null; }
  },

  submit: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`/sales/loading-inspections/${id}/submit`, data);
    return response.data;
  },

  officerSignOff: async (id: number, data: { result: 'approved' | 'rejected'; comments?: string; signature?: string }): Promise<Record<string, unknown>> => {
    const response = await api.post(`/sales/loading-inspections/${id}/officer-signoff`, data);
    return response.data;
  },

  superAdminOverride: async (id: number, data: { reason: string }): Promise<Record<string, unknown>> => {
    const response = await api.post(`/sales/loading-inspections/${id}/super-admin-override`, data);
    return response.data;
  },
};

// ============================================================================
// SALES BATCH IMPORT (receipt batch + historical sales bundle)
// ============================================================================

export interface ReceiptBatchImportRow {
  externalRef: string;
  receiptDate: string;
  customerCode: string;
  customerBranchCode?: string;
  bankCode: string;
  paymentMethodCode?: string;
  reference?: string;
  notes?: string;
  invoiceNumber: string;
  amount: number;
  whtCode?: string;
}

export type SalesBundleRowType = 'INVOICE_LINE' | 'RECEIPT' | 'MISC_ADJUSTMENT';

export interface SalesBundleRow {
  externalRef: string;
  rowType: SalesBundleRowType;
  // Invoice header (INVOICE_LINE, first row wins)
  customerCode?: string;
  customerBranchCode?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  customerPoNumber?: string;
  notes?: string;
  // Invoice line (INVOICE_LINE)
  lineDescription?: string;
  quantity?: number;
  unitPrice?: number;
  itemCode?: string;
  warehouseCode?: string;
  // Receipt (RECEIPT)
  receiptDate?: string;
  receiptAmount?: number;
  bankCode?: string;
  paymentMethodCode?: string;
  receiptReference?: string;
  // Misc adjustment (MISC_ADJUSTMENT)
  miscDate?: string;
  miscAmount?: number;
  miscAccountCode?: string;
  // Shared
  whtCode?: string;
}

export interface SalesBatchValidationResult {
  externalRef: string;
  rowCount: number;
  customerName?: string;
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

export interface SalesBatchDryRunResponse {
  batchRef: string;
  results: SalesBatchValidationResult[];
  validCount: number;
  invalidCount: number;
}

export interface SalesBatchCommitResponse {
  batchRef: string;
  createdReceiptIds: number[];
  createdInvoiceIds?: number[];
  failedRefs: Array<{ externalRef: string; error: string }>;
}

export interface ProfitabilityLine {
  lineId: number;
  itemId: number;
  productDescription: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  averageCost: number;
  standardCostPerUnit: number;
  totalStdCost: number;
  transportation: number;
  commission: number;
  netProfit: number;
  profitPct: number;
}

export interface ProfitabilityTotals {
  quantity: number;
  amount: number;
  totalAvgCost: number;
  totalStdCost: number;
  transportation: number;
  commission: number;
  netProfit: number;
  profitPct: number;
}

export interface ProfitabilityInvoice {
  invoiceId: number;
  invoiceNumber: string;
  invoiceDate: string;
  totals: ProfitabilityTotals;
  lines: ProfitabilityLine[];
}

export interface ProfitabilityCustomer {
  customerId: number;
  customerName: string;
  customerNumber: string | null;
  totals: ProfitabilityTotals;
  invoices: ProfitabilityInvoice[];
}

export interface ProfitabilitySalesRep {
  salesRepId: number | null;
  salesRepName: string;
  totals: ProfitabilityTotals;
  customers: ProfitabilityCustomer[];
}

export interface ProfitabilityRegion {
  region: string;
  totals: ProfitabilityTotals;
  salesReps: ProfitabilitySalesRep[];
}

export interface ProfitabilityReportData {
  regions: ProfitabilityRegion[];
  grandTotals: ProfitabilityTotals;
  filters: { dateFrom: string; dateTo: string; salesAreaId?: number; salesRepId?: number; categoryId?: number };
}

export const salesBatchImportApi = {
  receiptBatchDryRun: async (rows: ReceiptBatchImportRow[], batchLabel?: string): Promise<SalesBatchDryRunResponse> => {
    const res = await api.post('/sales/batch-import/receipts/dry-run', { rows, batchLabel });
    return res.data;
  },
  receiptBatchCommit: async (rows: ReceiptBatchImportRow[], batchLabel?: string): Promise<SalesBatchCommitResponse> => {
    const res = await api.post('/sales/batch-import/receipts/commit', { rows, batchLabel });
    return res.data;
  },
  historicalBundleDryRun: async (rows: SalesBundleRow[], batchLabel?: string): Promise<SalesBatchDryRunResponse> => {
    const res = await api.post('/sales/batch-import/historical-bundle/dry-run', { rows, batchLabel });
    return res.data;
  },
  historicalBundleCommit: async (rows: SalesBundleRow[], batchLabel?: string): Promise<SalesBatchCommitResponse> => {
    const res = await api.post('/sales/batch-import/historical-bundle/commit', { rows, batchLabel });
    return res.data;
  },
};

// ============================================================================
// COMBINED EXPORT
// ============================================================================

// ============================================================================
// SALES INSPECTION OFFICERS
// ============================================================================

export interface SalesInspectionOfficer {
  id: number;
  companyId: number;
  employeeId: number;
  role: 'quality_control' | 'inspection_officer';
  branchIds: number[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employeeName?: string;
  employeeEmail?: string;
  employeeNumber?: string;
}

export interface InspectionOfficerScope {
  isOfficer: boolean;
  branchIds: number[] | null;
}

export const salesInspectionOfficersApi = {
  list: async (): Promise<SalesInspectionOfficer[]> => {
    const res = await api.get('/sales/inspection-officers');
    return res.data;
  },
  myScope: async (): Promise<InspectionOfficerScope> => {
    const res = await api.get('/sales/inspection-officers/my-scope');
    return res.data;
  },
  create: async (dto: { employeeId: number; role: string; branchIds?: number[] | null }): Promise<SalesInspectionOfficer> => {
    const res = await api.post('/sales/inspection-officers', dto);
    return res.data;
  },
  update: async (id: number, dto: { role?: string; branchIds?: number[] | null; isActive?: boolean }): Promise<SalesInspectionOfficer> => {
    const res = await api.patch(`/sales/inspection-officers/${id}`, dto);
    return res.data;
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/sales/inspection-officers/${id}`);
  },
};

export const salesApi = {
  orders: salesOrdersApi,
  loadingOrders: loadingOrdersApi,
  deliveries: salesDeliveriesApi,
  invoices: salesInvoicesApi,
  payments: invoicePaymentsApi,
  areas: salesAreasApi,
  customers: customersApi,
  customerBranches: customerBranchesApi,
  settings: salesSettingsApi,
  dashboard: salesDashboardApi,
  salesCustomers: salesCustomersApi,
  creditNotes: creditNotesApi,
  commissions: commissionsApi,
  forecasts: salesForecastsApi,
  salesReps: salesRepsApi,
  batchImport: salesBatchImportApi,
  inspectionOfficers: salesInspectionOfficersApi,
};
