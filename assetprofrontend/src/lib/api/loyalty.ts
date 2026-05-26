import { api } from '../api';

// ============================================================================
// ENUMS
// ============================================================================

export type LoyaltyMemberStatus = 'active' | 'suspended' | 'closed';
export const LOYALTY_MEMBER_STATUSES: LoyaltyMemberStatus[] = [
  'active',
  'suspended',
  'closed',
];
export const LOYALTY_MEMBER_STATUS_LABELS: Record<LoyaltyMemberStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  closed: 'Closed',
};
export const LOYALTY_MEMBER_STATUS_BADGE_CLASS: Record<LoyaltyMemberStatus, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  closed: 'bg-gray-100 text-gray-600',
};

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'adjust' | 'expire';
export const LOYALTY_TRANSACTION_TYPES: LoyaltyTransactionType[] = [
  'earn',
  'redeem',
  'adjust',
  'expire',
];
export const LOYALTY_TRANSACTION_TYPE_LABELS: Record<LoyaltyTransactionType, string> = {
  earn: 'Earn',
  redeem: 'Redeem',
  adjust: 'Adjust',
  expire: 'Expire',
};

export type LoyaltyTransactionSource =
  | 'reservation'
  | 'fnb_order'
  | 'banquet'
  | 'manual_adjust'
  | 'reward_redemption'
  | 'redemption_cancel';
export const LOYALTY_TRANSACTION_SOURCES: LoyaltyTransactionSource[] = [
  'reservation',
  'fnb_order',
  'banquet',
  'manual_adjust',
  'reward_redemption',
  'redemption_cancel',
];
export const LOYALTY_TRANSACTION_SOURCE_LABELS: Record<LoyaltyTransactionSource, string> = {
  reservation: 'Reservation',
  fnb_order: 'F&B Order',
  banquet: 'Banquet',
  manual_adjust: 'Manual Adjustment',
  reward_redemption: 'Reward Claim',
  redemption_cancel: 'Redemption Refund',
};
export const LOYALTY_TRANSACTION_SOURCE_BADGE_CLASS: Record<
  LoyaltyTransactionSource,
  string
> = {
  reservation: 'bg-blue-100 text-blue-700',
  fnb_order: 'bg-emerald-100 text-emerald-700',
  banquet: 'bg-purple-100 text-purple-700',
  manual_adjust: 'bg-amber-100 text-amber-700',
  reward_redemption: 'bg-pink-100 text-pink-700',
  redemption_cancel: 'bg-gray-100 text-gray-700',
};

export type LoyaltyRewardType =
  | 'free_night'
  | 'fnb_discount'
  | 'banquet_upgrade'
  | 'voucher'
  | 'other';
export const LOYALTY_REWARD_TYPES: LoyaltyRewardType[] = [
  'free_night',
  'fnb_discount',
  'banquet_upgrade',
  'voucher',
  'other',
];
export const LOYALTY_REWARD_TYPE_LABELS: Record<LoyaltyRewardType, string> = {
  free_night: 'Free Night',
  fnb_discount: 'F&B Discount',
  banquet_upgrade: 'Banquet Upgrade',
  voucher: 'Voucher',
  other: 'Other',
};

export type LoyaltyRedemptionStatus = 'issued' | 'used' | 'expired' | 'cancelled';
export const LOYALTY_REDEMPTION_STATUSES: LoyaltyRedemptionStatus[] = [
  'issued',
  'used',
  'expired',
  'cancelled',
];
export const LOYALTY_REDEMPTION_STATUS_LABELS: Record<LoyaltyRedemptionStatus, string> = {
  issued: 'Issued',
  used: 'Used',
  expired: 'Expired',
  cancelled: 'Cancelled',
};
export const LOYALTY_REDEMPTION_STATUS_BADGE_CLASS: Record<
  LoyaltyRedemptionStatus,
  string
> = {
  issued: 'bg-blue-100 text-blue-700',
  used: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

export type LoyaltyRedemptionUseSource = 'reservation' | 'fnb_order' | 'banquet';
export const LOYALTY_REDEMPTION_USE_SOURCES: LoyaltyRedemptionUseSource[] = [
  'reservation',
  'fnb_order',
  'banquet',
];

// ============================================================================
// ENTITIES
// ============================================================================

export interface LoyaltyTier {
  id: number;
  companyId: number;
  name: string;
  minPoints: number;
  pointsMultiplier: number;
  benefits: string[];
  iconColor: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LoyaltyMember {
  id: number;
  companyId: number;
  membershipNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  preferredCurrency: string;
  preferredRoomType: string | null;
  dietaryNotes: string | null;
  marketingConsent: boolean;
  status: LoyaltyMemberStatus;
  enrolledAt: string;
  lifetimePoints: number;
  currentPoints: number;
  currentTierId: number | null;
  totalStays: number;
  totalFnbOrders: number;
  totalBanquets: number;
  lastVisitAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LoyaltyMemberWithTier extends LoyaltyMember {
  tierName: string | null;
  tierIconColor: string | null;
  tierMultiplier: number | null;
}

export interface LoyaltyTransaction {
  id: number;
  companyId: number;
  memberId: number;
  transactionType: LoyaltyTransactionType;
  source: LoyaltyTransactionSource;
  sourceId: number | null;
  points: number;
  cashEquivalent: number | null;
  description: string | null;
  expiresAt: string | null;
  recordedById: number | null;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyRedemption {
  id: number;
  companyId: number;
  memberId: number;
  rewardId: number;
  redemptionCode: string;
  pointsSpent: number;
  status: LoyaltyRedemptionStatus;
  issuedAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedAtSource: LoyaltyRedemptionUseSource | null;
  usedAtSourceId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyRedemptionWithDetails extends LoyaltyRedemption {
  memberName: string;
  membershipNumber: string;
  rewardName: string;
  rewardType: LoyaltyRewardType;
}

export interface LoyaltyMemberDetail extends LoyaltyMemberWithTier {
  recentTransactions: LoyaltyTransaction[];
  activeRedemptions: LoyaltyRedemption[];
}

export interface LoyaltyReward {
  id: number;
  companyId: number;
  name: string;
  description: string | null;
  pointsCost: number;
  rewardType: LoyaltyRewardType;
  cashValue: number | null;
  validityDays: number;
  isActive: boolean;
  imageUrl: string | null;
  termsAndConditions: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateLoyaltyTierDto {
  name: string;
  minPoints: number;
  pointsMultiplier?: number;
  benefits?: string[];
  iconColor?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateLoyaltyTierDto {
  name?: string;
  minPoints?: number;
  pointsMultiplier?: number;
  benefits?: string[];
  iconColor?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface EnrollLoyaltyMemberDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  preferredCurrency?: string;
  preferredRoomType?: string;
  dietaryNotes?: string;
  marketingConsent?: boolean;
  notes?: string;
}

export interface UpdateLoyaltyMemberDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  preferredCurrency?: string;
  preferredRoomType?: string;
  dietaryNotes?: string;
  marketingConsent?: boolean;
  notes?: string;
}

export interface SuspendMemberDto {
  reason: string;
}

export interface CloseMemberDto {
  reason: string;
}

export interface EarnPointsDto {
  points: number;
  source: LoyaltyTransactionSource;
  sourceId?: number;
  cashEquivalent?: number;
  description?: string;
  expiresAt?: string;
}

export interface RedeemPointsDto {
  points: number;
  source: LoyaltyTransactionSource;
  sourceId?: number;
  cashEquivalent?: number;
  description?: string;
}

export interface AdjustPointsDto {
  points: number;
  description: string;
}

export interface CreateLoyaltyRewardDto {
  name: string;
  description?: string;
  pointsCost: number;
  rewardType: LoyaltyRewardType;
  cashValue?: number;
  validityDays?: number;
  isActive?: boolean;
  imageUrl?: string;
  termsAndConditions?: string;
}

export interface UpdateLoyaltyRewardDto {
  name?: string;
  description?: string;
  pointsCost?: number;
  rewardType?: LoyaltyRewardType;
  cashValue?: number;
  validityDays?: number;
  isActive?: boolean;
  imageUrl?: string;
  termsAndConditions?: string;
}

export interface ClaimRewardDto {
  rewardId: number;
  notes?: string;
}

export interface MarkRedemptionUsedDto {
  source: LoyaltyRedemptionUseSource;
  sourceId: number;
  notes?: string;
}

export interface CancelRedemptionDto {
  reason: string;
}

// ============================================================================
// QUERY PARAM TYPES
// ============================================================================

export interface LoyaltyTierListQuery {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LoyaltyMemberListQuery {
  status?: LoyaltyMemberStatus;
  tierId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LoyaltyTransactionListQuery {
  memberId?: number;
  source?: LoyaltyTransactionSource;
  transactionType?: LoyaltyTransactionType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface LoyaltyRewardListQuery {
  isActive?: boolean;
  rewardType?: LoyaltyRewardType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LoyaltyRedemptionListQuery {
  memberId?: number;
  status?: LoyaltyRedemptionStatus;
  expiringSoon?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// API CLIENTS
// ============================================================================

export const loyaltyTiersApi = {
  list: async (query?: LoyaltyTierListQuery): Promise<PaginatedResponse<LoyaltyTier>> => {
    const response = await api.get('/loyalty/tiers', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LoyaltyTier> => {
    const response = await api.get(`/loyalty/tiers/${id}`);
    return response.data;
  },
  create: async (data: CreateLoyaltyTierDto): Promise<LoyaltyTier> => {
    const response = await api.post('/loyalty/tiers', data);
    return response.data;
  },
  update: async (id: number, data: UpdateLoyaltyTierDto): Promise<LoyaltyTier> => {
    const response = await api.patch(`/loyalty/tiers/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/loyalty/tiers/${id}`);
  },
};

export const loyaltyMembersApi = {
  list: async (
    query?: LoyaltyMemberListQuery,
  ): Promise<PaginatedResponse<LoyaltyMemberWithTier>> => {
    const response = await api.get('/loyalty/members', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LoyaltyMemberDetail> => {
    const response = await api.get(`/loyalty/members/${id}`);
    return response.data;
  },
  enroll: async (data: EnrollLoyaltyMemberDto): Promise<LoyaltyMemberWithTier> => {
    const response = await api.post('/loyalty/members', data);
    return response.data;
  },
  update: async (
    id: number,
    data: UpdateLoyaltyMemberDto,
  ): Promise<LoyaltyMemberWithTier> => {
    const response = await api.patch(`/loyalty/members/${id}`, data);
    return response.data;
  },
  lookup: async (identifier: string): Promise<LoyaltyMemberWithTier | null> => {
    try {
      const response = await api.get('/loyalty/members/lookup', {
        params: { identifier },
      });
      return response.data;
    } catch {
      return null;
    }
  },
  suspend: async (
    id: number,
    data: SuspendMemberDto,
  ): Promise<LoyaltyMemberWithTier> => {
    const response = await api.post(`/loyalty/members/${id}/suspend`, data);
    return response.data;
  },
  reactivate: async (id: number): Promise<LoyaltyMemberWithTier> => {
    const response = await api.post(`/loyalty/members/${id}/reactivate`);
    return response.data;
  },
  close: async (id: number, data: CloseMemberDto): Promise<LoyaltyMemberWithTier> => {
    const response = await api.post(`/loyalty/members/${id}/close`, data);
    return response.data;
  },
  listMemberTransactions: async (
    id: number,
    query?: Omit<LoyaltyTransactionListQuery, 'memberId'>,
  ): Promise<PaginatedResponse<LoyaltyTransaction>> => {
    const response = await api.get(`/loyalty/members/${id}/transactions`, {
      params: query,
    });
    return response.data;
  },
  listAllTransactions: async (
    query?: LoyaltyTransactionListQuery,
  ): Promise<PaginatedResponse<LoyaltyTransaction>> => {
    const response = await api.get('/loyalty/members/transactions', { params: query });
    return response.data;
  },
  earn: async (id: number, data: EarnPointsDto): Promise<LoyaltyTransaction> => {
    const response = await api.post(`/loyalty/members/${id}/earn`, data);
    return response.data;
  },
  redeem: async (id: number, data: RedeemPointsDto): Promise<LoyaltyTransaction> => {
    const response = await api.post(`/loyalty/members/${id}/redeem`, data);
    return response.data;
  },
  adjust: async (id: number, data: AdjustPointsDto): Promise<LoyaltyTransaction> => {
    const response = await api.post(`/loyalty/members/${id}/adjust`, data);
    return response.data;
  },
};

export const loyaltyRewardsApi = {
  list: async (
    query?: LoyaltyRewardListQuery,
  ): Promise<PaginatedResponse<LoyaltyReward>> => {
    const response = await api.get('/loyalty/rewards', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LoyaltyReward> => {
    const response = await api.get(`/loyalty/rewards/${id}`);
    return response.data;
  },
  create: async (data: CreateLoyaltyRewardDto): Promise<LoyaltyReward> => {
    const response = await api.post('/loyalty/rewards', data);
    return response.data;
  },
  update: async (id: number, data: UpdateLoyaltyRewardDto): Promise<LoyaltyReward> => {
    const response = await api.patch(`/loyalty/rewards/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/loyalty/rewards/${id}`);
  },
};

export const loyaltyRedemptionsApi = {
  list: async (
    query?: LoyaltyRedemptionListQuery,
  ): Promise<PaginatedResponse<LoyaltyRedemptionWithDetails>> => {
    const response = await api.get('/loyalty/redemptions', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LoyaltyRedemptionWithDetails> => {
    const response = await api.get(`/loyalty/redemptions/${id}`);
    return response.data;
  },
  getByCode: async (code: string): Promise<LoyaltyRedemptionWithDetails> => {
    const response = await api.get(`/loyalty/redemptions/code/${encodeURIComponent(code)}`);
    return response.data;
  },
  claim: async (
    memberId: number,
    data: ClaimRewardDto,
  ): Promise<LoyaltyRedemptionWithDetails> => {
    const response = await api.post(
      `/loyalty/redemptions/member/${memberId}/claim`,
      data,
    );
    return response.data;
  },
  markUsed: async (
    code: string,
    data: MarkRedemptionUsedDto,
  ): Promise<LoyaltyRedemptionWithDetails> => {
    const response = await api.post(
      `/loyalty/redemptions/code/${encodeURIComponent(code)}/use`,
      data,
    );
    return response.data;
  },
  cancel: async (
    id: number,
    data: CancelRedemptionDto,
  ): Promise<LoyaltyRedemptionWithDetails> => {
    const response = await api.post(`/loyalty/redemptions/${id}/cancel`, data);
    return response.data;
  },
};
