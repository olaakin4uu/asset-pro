import { api } from '../api';
import type { Account, Vat, Currency, PaymentMethod, Wht, Bank, FiscalYear } from './accounts';

// Re-export types for convenience
export type { Account, Vat, Currency, PaymentMethod, Wht, Bank, FiscalYear };

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AccountLookupQuery {
  accountType?: string;
  isPosting?: boolean;
  isActive?: boolean;
  search?: string;
  categoryId?: number;
  categoryName?: string;
  limit?: number;
  page?: number;
}

/**
 * Shared lookups API for cross-module reference data.
 *
 * Use these endpoints instead of accountsApi/vatApi/etc. when calling from
 * non-accounts modules (inventory, sales, POS, budget, assets, etc.).
 * These endpoints bypass the accounts module feature guard.
 */
export const lookupsApi = {
  // GL Accounts
  accounts: async (query?: AccountLookupQuery): Promise<PaginatedResponse<Account>> => {
    const response = await api.get('/lookups/accounts', { params: query });
    return response.data;
  },

  // Active VAT rates
  vat: async (): Promise<Vat[]> => {
    const response = await api.get('/lookups/vat');
    return response.data;
  },

  // Active currencies
  currencies: async (): Promise<Currency[]> => {
    const response = await api.get('/lookups/currencies');
    return response.data;
  },

  // Active payment methods
  paymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await api.get('/lookups/payment-methods');
    return response.data;
  },

  // Active WHT rates
  wht: async (): Promise<Wht[]> => {
    const response = await api.get('/lookups/wht');
    return response.data;
  },

  // Active banks
  banks: async (): Promise<Bank[]> => {
    const response = await api.get('/lookups/banks');
    return response.data;
  },

  // Fiscal years
  fiscalYears: async (): Promise<FiscalYear[]> => {
    const response = await api.get('/lookups/fiscal-years');
    return response.data;
  },

  // Active warehouses
  warehouses: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/lookups/warehouses');
    return response.data;
  },

  // Active units of measure
  uoms: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/lookups/uoms');
    return response.data;
  },

  // Active employees (for sales rep selection, etc.)
  employees: async (query?: { search?: string; limit?: number }): Promise<{ data: Array<{ id: number; employeeCode: string; firstName: string; lastName: string; email?: string; departmentName?: string; positionName?: string }>; total: number }> => {
    const response = await api.get('/lookups/employees', { params: query });
    return response.data;
  },

  // Active price groups
  priceGroups: async (): Promise<Array<{ id: number; code: string; name: string; description?: string; isDefault?: boolean }>> => {
    const response = await api.get('/lookups/price-groups');
    return response.data;
  },
};
