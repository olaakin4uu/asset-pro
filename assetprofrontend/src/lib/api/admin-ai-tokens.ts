import { api } from '../api';

// ============================================================================
// TYPES
// ============================================================================

export interface AiTokenPackage {
  id: number;
  name: string;
  description: string | null;
  tokenAmount: number;
  price: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantTokenBalance {
  id: number;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  totalPurchased: number;
  totalUsed: number;
  balance: number;
  lastPurchaseAt: string | null;
  lastUsedAt: string | null;
}

export interface CreateTokenPackageDto {
  name: string;
  description?: string;
  tokenAmount: number;
  price: number;
  currency?: string;
  isActive?: boolean;
  sortOrder?: number;
  isPopular?: boolean;
}

export interface UpdateTokenPackageDto {
  name?: string;
  description?: string;
  tokenAmount?: number;
  price?: number;
  currency?: string;
  isActive?: boolean;
  sortOrder?: number;
  isPopular?: boolean;
}

export interface GrantTokensDto {
  tenantId: string;
  amount: number;
  notes?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// API
// ============================================================================

export const adminAiTokensApi = {
  // Packages
  listPackages: async (includeInactive = true): Promise<AiTokenPackage[]> => {
    const { data } = await api.get('/admin/ai-tokens/packages', {
      params: { includeInactive: includeInactive ? 'true' : 'false' },
    });
    return data;
  },

  getPackage: async (id: number): Promise<AiTokenPackage> => {
    const { data } = await api.get(`/admin/ai-tokens/packages/${id}`);
    return data;
  },

  createPackage: async (dto: CreateTokenPackageDto): Promise<AiTokenPackage> => {
    const { data } = await api.post('/admin/ai-tokens/packages', dto);
    return data;
  },

  updatePackage: async (id: number, dto: UpdateTokenPackageDto): Promise<AiTokenPackage> => {
    const { data } = await api.patch(`/admin/ai-tokens/packages/${id}`, dto);
    return data;
  },

  deletePackage: async (id: number): Promise<AiTokenPackage> => {
    const { data } = await api.delete(`/admin/ai-tokens/packages/${id}`);
    return data;
  },

  // Grant
  grantTokens: async (dto: GrantTokensDto): Promise<unknown> => {
    const { data } = await api.post('/admin/ai-tokens/grant', dto);
    return data;
  },

  // Balances
  listBalances: async (page = 1, limit = 25): Promise<PaginatedResponse<TenantTokenBalance>> => {
    const { data } = await api.get('/admin/ai-tokens/balances', {
      params: { page, limit },
    });
    return data;
  },
};
