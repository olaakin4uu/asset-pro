import { api } from '../api';
import type { PaginatedResponse } from '@/types/core';
import type {
  Customer,
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerListQuery,
  CustomerStats,
} from '@/types/customers';

// ============================================================================
// IMPORT TYPES
// ============================================================================

export interface ImportCustomerRow {
  code?: string;
  name: string;
  email: string;
  phone?: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  taxId?: string;
  creditLimit?: string;
  paymentTerms?: string;
  customerType?: string;
  isActive?: string;
  isWalkInCustomer?: string;
  deliveryAddress?: string;
  deliveryContactPerson?: string;
  deliveryPhone?: string;
  salesRepCode?: string;
  accountsReceivableCode?: string;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; code: string; message: string }[];
}

// ============================================================================
// CUSTOMERS API
// ============================================================================

export const customersApi = {
  list: async (query?: CustomerListQuery): Promise<PaginatedResponse<Customer>> => {
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
    const response = await api.patch(`/sales/customers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/customers/${id}`);
  },

  getStats: async (): Promise<CustomerStats> => {
    const response = await api.get('/sales/customers/stats');
    return response.data;
  },

  // Get active customers for dropdowns
  getActive: async (): Promise<Customer[]> => {
    const response = await api.get('/sales/customers', {
      params: { isActive: true, limit: 5000 },
    });
    return response.data.data || response.data;
  },

  // Import template
  getImportTemplate: async (): Promise<{ headers: string[]; sampleRows: string[][]; notes: Record<string, string> }> => {
    const response = await api.get('/sales/customers/import/template');
    return response.data;
  },

  // Bulk import customers
  importCustomers: async (
    items: ImportCustomerRow[],
    importMode?: 'skip' | 'update' | 'overwrite',
  ): Promise<ImportResult> => {
    const response = await api.post('/sales/customers/import', { items, importMode });
    return response.data;
  },

  // Update customer status
  updateStatus: async (id: number, status: string): Promise<Customer> => {
    const response = await api.patch(`/sales/customers/${id}/status`, { status });
    return response.data;
  },

  // Put customer on hold
  putOnHold: async (id: number, reason?: string): Promise<Customer> => {
    const response = await api.post(`/sales/customers/${id}/hold`, { reason });
    return response.data;
  },

  // Remove hold from customer
  removeHold: async (id: number): Promise<Customer> => {
    const response = await api.post(`/sales/customers/${id}/unhold`);
    return response.data;
  },

  // Get customer credit info
  getCreditInfo: async (id: number): Promise<{
    creditLimit: number;
    currentBalance: number;
    availableCredit: number;
    overdueAmount: number;
    overdueInvoicesCount: number;
  }> => {
    const response = await api.get(`/sales/customers/${id}/credit`);
    return response.data;
  },
};
