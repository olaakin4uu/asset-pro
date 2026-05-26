/**
 * Portal API Client — Investor/Investee self-service endpoints.
 * All endpoints are scoped to the authenticated investor via JWT.
 */
import { api } from '../api';

// ============================================================================
// TYPES
// ============================================================================

export interface PortalDashboard {
  investor: PortalInvestorProfile;
  totalInvested: number;
  totalCurrentValue: number;
  totalUnrealizedGain: number;
  totalDistributions: number;
  accountCount: number;
  pendingSubscriptions: number;
  pendingRedemptions: number;
  activeFacilities: number;
  recentActivity: PortalActivity[];
}

export interface PortalInvestorProfile {
  id: number;
  investorCode: string;
  investorType: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string;
  kycStatus: string;
  customerRole: string | null;
  kycExpiryDate: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  bankCode: string | null;
}

export interface PortalHolding {
  accountId: number;
  accountNumber: string;
  fundName: string;
  fundCode: string;
  unitsHeld: number;
  averageCost: number;
  currentValue: number;
  unrealizedGain: number;
  totalInvested: number;
  totalRedeemed: number;
  totalDistributions: number;
  status: string;
}

export interface PortalTransaction {
  type: 'subscription' | 'redemption' | 'distribution';
  id: number;
  date: string;
  amount: number;
  units: number;
  status: string;
  createdAt: string;
}

export interface PortalActivity {
  type: string;
  id: number;
  amount: number;
  status: string;
  createdAt: string;
  fundName: string | null;
}

export interface PortalFacility {
  id: number;
  facilityNumber: string;
  facilityTypeName: string;
  facilityStructure: string;
  fundName: string;
  costPrice: number;
  profitAmount: number;
  totalFacilityAmount: number;
  profitRate: number;
  tenureMonths: number;
  installmentAmount: number;
  totalRepaid: number;
  outstandingBalance: number;
  status: string;
  applicationDate: string;
  disbursementDate: string | null;
  maturityDate: string | null;
}

export interface PortalScheduleItem {
  id: number;
  installmentNumber: number;
  dueDate: string;
  principalPortion: number;
  profitPortion: number;
  totalAmount: number;
  balanceAfter: number;
  status: string;
  paidAmount: number;
  paidDate: string | null;
}

export interface PortalNotification {
  id: string;
  type: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

// ============================================================================
// API CLIENT
// ============================================================================

export const portalApi = {
  // Dashboard
  getDashboard: async (): Promise<PortalDashboard> => {
    const response = await api.get('/portal/dashboard');
    return response.data;
  },

  getHoldings: async (): Promise<PortalHolding[]> => {
    const response = await api.get('/portal/dashboard/holdings');
    return response.data;
  },

  // Investments
  getInvestments: async (): Promise<PortalHolding[]> => {
    const response = await api.get('/portal/investments');
    return response.data;
  },

  getInvestmentDetail: async (accountId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/portal/investments/${accountId}`);
    return response.data;
  },

  getAccountTransactions: async (accountId: number, page = 1, limit = 20): Promise<{ data: PortalTransaction[]; total: number }> => {
    const response = await api.get(`/portal/investments/${accountId}/transactions`, { params: { page, limit } });
    return response.data;
  },

  // Subscriptions
  getMySubscriptions: async (page = 1, limit = 20): Promise<{ data: Record<string, unknown>[]; total: number }> => {
    const response = await api.get('/portal/subscriptions', { params: { page, limit } });
    return response.data;
  },

  // Redemptions
  getMyRedemptions: async (page = 1, limit = 20): Promise<{ data: Record<string, unknown>[]; total: number }> => {
    const response = await api.get('/portal/redemptions', { params: { page, limit } });
    return response.data;
  },

  // Facilities (investee)
  getMyFacilities: async (): Promise<PortalFacility[]> => {
    const response = await api.get('/portal/facilities');
    return response.data;
  },

  getMyFacilityDetail: async (id: number): Promise<PortalFacility> => {
    const response = await api.get(`/portal/facilities/${id}`);
    return response.data;
  },

  getMyFacilitySchedule: async (id: number): Promise<PortalScheduleItem[]> => {
    const response = await api.get(`/portal/facilities/${id}/schedule`);
    return response.data;
  },

  getMyFacilityRepayments: async (id: number): Promise<Record<string, unknown>[]> => {
    const response = await api.get(`/portal/facilities/${id}/repayments`);
    return response.data;
  },

  // Distributions
  getMyDistributions: async (page = 1, limit = 20): Promise<{ data: Record<string, unknown>[]; total: number }> => {
    const response = await api.get('/portal/distributions', { params: { page, limit } });
    return response.data;
  },

  // Documents
  getMyDocuments: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/portal/documents');
    return response.data;
  },

  // Notifications
  getNotifications: async (page = 1, limit = 20): Promise<{ data: PortalNotification[]; total: number }> => {
    const response = await api.get('/portal/notifications', { params: { page, limit } });
    return response.data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/portal/notifications/unread-count');
    return response.data;
  },

  markNotificationRead: async (id: string): Promise<void> => {
    await api.patch(`/portal/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.post('/portal/notifications/mark-all-read');
  },

  // Profile
  getProfile: async (): Promise<PortalInvestorProfile> => {
    const response = await api.get('/portal/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<PortalInvestorProfile>): Promise<PortalInvestorProfile> => {
    const response = await api.put('/portal/profile', data);
    return response.data;
  },

  updateBankDetails: async (data: { bankName?: string; bankAccountNumber?: string; bankAccountName?: string; bankCode?: string }): Promise<PortalInvestorProfile> => {
    const response = await api.put('/portal/profile/bank-details', data);
    return response.data;
  },
};
