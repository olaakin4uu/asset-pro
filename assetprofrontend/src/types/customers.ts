// ============================================================================
// CUSTOMER TYPES
// ============================================================================

export type CustomerStatus = 'active' | 'inactive' | 'on_hold' | 'blocked';

export interface Customer {
  id: number;
  companyId: number;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxId?: string;
  status: CustomerStatus;

  // Credit management
  creditLimit?: number;
  currentBalance?: number;
  overdueInvoicesCount?: number;

  // Payment terms
  paymentTerms?: string;
  defaultCurrencyId?: number;
  defaultCurrencyCode?: string;

  // GL Account
  accountsReceivableId?: number;

  // Contact person
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Metadata
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDto {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxId?: string;
  creditLimit?: number;
  paymentTerms?: string;
  defaultCurrencyId?: number;
  accountsReceivableId?: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateCustomerDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxId?: string;
  status?: CustomerStatus;
  creditLimit?: number;
  paymentTerms?: string;
  defaultCurrencyId?: number;
  accountsReceivableId?: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  isActive?: boolean;
}

export interface CustomerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus;
  isActive?: boolean;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  onHold: number;
  totalCreditLimit: number;
  totalOutstanding: number;
}
