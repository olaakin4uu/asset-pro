import { api } from '../api';

// ============================================================================
// TYPES
// ============================================================================

export interface Plan {
  id: number;
  name: string;
  slug: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  maxUsers: number;
  maxCompanies: number;
  maxBranches: number;
  maxStorageGb: number;
  trialDays: number;
  isActive: boolean;
  isEnterprise: boolean;
  isPopular: boolean;
  badgeText?: string;
  modules?: PlanModuleDetail[];
}

export interface PlanModuleDetail {
  id: number;
  moduleId: number;
  isIncluded: boolean;
  isAvailableAddon: boolean;
  addonPriceMonthly?: number;
  addonPriceYearly?: number;
  module: {
    id: number;
    name: string;
    slug: string;
    description?: string;
    category: string;
    icon?: string;
  };
  planModuleFeatures?: {
    id: number;
    featureId: number;
    isEnabled: boolean;
    feature: {
      id: number;
      slug: string;
      name: string;
      description?: string;
    };
  }[];
}

export interface Subscription {
  id: number;
  tenantId: string;
  planId: number;
  status: string;
  billingCycle: string;
  usersCount: number;
  trialEndsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  amount?: number;
  currency: string;
  autoRenew: boolean;
  endsAt?: string;
  scheduledPlanId?: number;
  cardLastFour?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  cancelledAt?: string;
  plan: Plan;
  modules: SubscriptionModuleDetail[];
}

export interface SubscriptionModuleDetail {
  id: number;
  moduleId: number;
  status: string;
  enabledAt?: string;
  amount: number;
  isIncluded: boolean;
  enabledFeatures: string[];
  module: {
    id: number;
    name: string;
    slug: string;
    category: string;
  };
}

export interface SubscriptionInvoice {
  id: number;
  invoiceNumber: string;
  type: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  paidAt?: string;
  lineItems?: Record<string, unknown>[];
  notes?: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: number;
  brand?: string;
  lastFour?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

export interface ChangeHistoryEntry {
  id: number;
  fromPlanId?: number;
  toPlanId?: number;
  changeType: string;
  reason?: string;
  initiatedSource?: string;
  effectiveAt: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaystackInitResult {
  authorizationUrl: string;
  accessCode?: string;
  reference: string;
}

export interface UpgradeResult {
  requiresPayment?: boolean;
  authorizationUrl?: string;
  reference?: string;
  chargeAmount?: number;
  prorationCredit?: number;
  // or direct subscription when no payment needed
  id?: number;
  plan?: Plan;
}

export interface DowngradeResult {
  message: string;
  effectiveDate: string;
  currentPlan: string;
  newPlan: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

export const billingApi = {
  // Subscription
  getSubscription: async (): Promise<Subscription> => {
    const { data } = await api.get('/billing/subscription');
    return data;
  },

  // Plans
  getPlans: async (): Promise<Plan[]> => {
    const { data } = await api.get('/billing/plans');
    return data;
  },

  getPlan: async (id: number): Promise<Plan> => {
    const { data } = await api.get(`/billing/plans/${id}`);
    return data;
  },

  // Subscribe
  subscribe: async (params: {
    planId: number;
    billingCycle: 'monthly' | 'yearly';
    callbackUrl?: string;
  }): Promise<PaystackInitResult | Subscription> => {
    const { data } = await api.post('/billing/subscribe', params);
    return data;
  },

  // Upgrade
  upgrade: async (params: {
    planId: number;
    billingCycle?: 'monthly' | 'yearly';
  }): Promise<UpgradeResult> => {
    const { data } = await api.post('/billing/upgrade', params);
    return data;
  },

  // Downgrade
  downgrade: async (planId: number): Promise<DowngradeResult> => {
    const { data } = await api.post('/billing/downgrade', { planId });
    return data;
  },

  // Cancel
  cancel: async (reason?: string): Promise<{ message: string; endsAt: string }> => {
    const { data } = await api.post('/billing/cancel', { reason });
    return data;
  },

  // Reactivate
  reactivate: async (): Promise<Subscription> => {
    const { data } = await api.post('/billing/reactivate');
    return data;
  },

  // Modules
  addModule: async (moduleId: number): Promise<Subscription> => {
    const { data } = await api.post('/billing/modules/add', { moduleId });
    return data;
  },

  // Payment Methods
  getPaymentMethods: async (): Promise<{ cards: PaymentMethod[] }> => {
    const { data } = await api.get('/billing/payment-methods');
    return data;
  },

  updatePaymentMethod: async (callbackUrl?: string): Promise<PaystackInitResult> => {
    const { data } = await api.post('/billing/payment-methods/update', { callbackUrl });
    return data;
  },

  // Invoices
  getInvoices: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }): Promise<{ data: SubscriptionInvoice[]; total: number; page: number; limit: number }> => {
    const { data } = await api.get('/billing/invoices', { params });
    return data;
  },

  getInvoice: async (id: number): Promise<SubscriptionInvoice> => {
    const { data } = await api.get(`/billing/invoices/${id}`);
    return data;
  },

  downloadInvoicePdf: async (id: number, invoiceNumber?: string): Promise<void> => {
    const response = await api.get(`/billing/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoiceNumber || `invoice-${id}`}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // History
  getChangeHistory: async (): Promise<ChangeHistoryEntry[]> => {
    const { data } = await api.get('/billing/history');
    return data;
  },
};
