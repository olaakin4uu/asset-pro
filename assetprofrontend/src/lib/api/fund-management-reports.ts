import { api } from '@/lib/api';

// ============================================================================
// Types (kept loose — each report returns its own shape)
// ============================================================================

export interface PaginatedReport<T = Record<string, unknown>> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary?: Record<string, number>;
}

export interface RoleDistribution {
  total: number;
  byRole: Record<string, number>;
  byKyc: Record<string, number>;
}

export interface KycCompliance {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  expiringIn30: number;
  expiringIn31to60: number;
  expiringIn61to90: number;
}

// ============================================================================
// API
// ============================================================================

const base = '/fund-management/reports';

export const fmReportsApi = {
  // Cross-role
  customerRegister: async (params?: Record<string, string | number>) =>
    (await api.get<PaginatedReport>(`${base}/customer-register`, { params })).data,
  roleDistribution: async () =>
    (await api.get<RoleDistribution>(`${base}/role-distribution`)).data,
  kycCompliance: async () =>
    (await api.get<KycCompliance>(`${base}/kyc-compliance`)).data,

  // Investor
  investorRegister: async (params?: Record<string, string | number>) =>
    (await api.get<PaginatedReport>(`${base}/investor-register`, { params })).data,
  topInvestors: async (params?: Record<string, string | number>) =>
    (await api.get<{ data: Record<string, unknown>[]; totalAum: number; count: number }>(`${base}/top-investors`, { params })).data,
  subscriptionActivity: async (params?: Record<string, string | number>) =>
    (await api.get<PaginatedReport>(`${base}/subscription-activity`, { params })).data,
  redemptionActivity: async (params?: Record<string, string | number>) =>
    (await api.get<PaginatedReport>(`${base}/redemption-activity`, { params })).data,
  distributionsPaid: async (params?: Record<string, string | number>) =>
    (await api.get<PaginatedReport>(`${base}/distributions-paid`, { params })).data,
  dormantInvestors: async (params?: Record<string, string | number>) =>
    (await api.get<{ data: Record<string, unknown>[]; thresholdDays: number; count: number }>(`${base}/dormant-investors`, { params })).data,
  kycExpiryWatch: async (params?: Record<string, string | number>) =>
    (await api.get<{ data: Record<string, unknown>[]; withinDays: number; count: number }>(`${base}/kyc-expiry-watch`, { params })).data,

  // Investee
  investeeRegister: async (params?: Record<string, string | number>) =>
    (await api.get<PaginatedReport>(`${base}/investee-register`, { params })).data,
  facilityAging: async () =>
    (await api.get<{ data: Record<string, unknown>[]; buckets: Record<string, { count: number; amount: number }>; count: number }>(`${base}/facility-aging`)).data,
  repaymentSchedule: async (params?: Record<string, string | number>) =>
    (await api.get<{ data: Record<string, unknown>[]; withinDays: number; count: number; totalDue: number }>(`${base}/repayment-schedule`, { params })).data,
  defaultWatch: async (params?: Record<string, string | number>) =>
    (await api.get<{ data: Record<string, unknown>[]; thresholdDays: number; count: number; totalArrears: number }>(`${base}/default-watch`, { params })).data,
  sectorConcentration: async () =>
    (await api.get<{ bySector: Record<string, unknown>[]; byType: Record<string, unknown>[] }>(`${base}/sector-concentration`)).data,

  // As-at-date snapshots
  investorBalances: async (params?: Record<string, string | number>) =>
    (await api.get<{
      data: Record<string, unknown>[];
      asAtDate: string;
      summary: { investorCount: number; accountCount: number; totalBalance: number };
    }>(`${base}/investor-balances`, { params })).data,

  investeeOutstanding: async (params?: Record<string, string | number>) =>
    (await api.get<{
      data: Record<string, unknown>[];
      asAtDate: string;
      summary: { investeeCount: number; totalHistoricalOutstanding: number; totalFacilityOutstanding: number; totalOutstanding: number };
    }>(`${base}/investee-outstanding`, { params })).data,

  investeeLedger: async (params?: Record<string, string | number>) =>
    (await api.get<{
      data: Record<string, unknown>[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      summary: { totalDebit: number; totalCredit: number; netBalance: number };
    }>(`${base}/investee-ledger`, { params })).data,
};
