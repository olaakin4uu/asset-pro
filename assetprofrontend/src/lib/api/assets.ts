import { api } from '../api';
import type { PaginatedResponse } from '@/types/core';
import type {
  AssetClass,
  CreateAssetClassDto,
  UpdateAssetClassDto,
  AssetClassQuery,
  AssetClassStats,
  Asset,
  CreateAssetDto,
  UpdateAssetDto,
  AssetQuery,
  AssetStats,
  AssetDepreciation,
  CreateAssetDepreciationDto,
  UpdateAssetDepreciationDto,
  AssetDepreciationQuery,
  AssetDepreciationStats,
  AssetDisposal,
  CreateAssetDisposalDto,
  UpdateAssetDisposalDto,
  AssetDisposalQuery,
  AssetDisposalStats,
  AssetTransfer,
  CreateAssetTransferDto,
  UpdateAssetTransferDto,
  AssetTransferQuery,
  AssetTransferStats,
  AssetMaintenance,
  CreateAssetMaintenanceDto,
  UpdateAssetMaintenanceDto,
  AssetMaintenanceQuery,
  AssetMaintenanceStats,
  AssetSettings,
  UpdateAssetSettingsDto,
} from '@/types/assets';

// ============================================================================
// ASSET CLASSES API
// ============================================================================

export const assetClassesApi = {
  list: async (query?: AssetClassQuery): Promise<PaginatedResponse<AssetClass>> => {
    const response = await api.get('/assets/asset-classes', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<AssetClass> => {
    const response = await api.get(`/assets/asset-classes/${id}`);
    return response.data;
  },

  create: async (data: CreateAssetClassDto): Promise<AssetClass> => {
    const response = await api.post('/assets/asset-classes', data);
    return response.data;
  },

  update: async (id: number, data: UpdateAssetClassDto): Promise<AssetClass> => {
    const response = await api.put(`/assets/asset-classes/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/assets/asset-classes/${id}`);
  },

  getStats: async (): Promise<AssetClassStats> => {
    const response = await api.get('/assets/asset-classes/stats');
    return response.data;
  },

  getActive: async (): Promise<AssetClass[]> => {
    const response = await api.get('/assets/asset-classes', {
      params: { isActive: true, limit: 1000 },
    });
    return response.data.data || response.data;
  },
};

// ============================================================================
// ASSETS API
// ============================================================================

export const assetsApi = {
  list: async (query?: AssetQuery): Promise<PaginatedResponse<Asset>> => {
    const response = await api.get('/assets', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Asset> => {
    const response = await api.get(`/assets/${id}`);
    return response.data;
  },

  create: async (data: CreateAssetDto): Promise<Asset> => {
    const response = await api.post('/assets', data);
    return response.data;
  },

  update: async (id: number, data: UpdateAssetDto): Promise<Asset> => {
    const response = await api.put(`/assets/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/assets/${id}`);
  },

  getStats: async (): Promise<AssetStats> => {
    const response = await api.get('/assets/stats');
    return response.data;
  },

  getActive: async (): Promise<Asset[]> => {
    const response = await api.get('/assets', {
      params: { status: 'active', limit: 1000 },
    });
    return response.data.data || response.data;
  },

  // Get assets by class
  getByClass: async (assetClassId: number): Promise<Asset[]> => {
    const response = await api.get('/assets', {
      params: { assetClassId, limit: 1000 },
    });
    return response.data.data || response.data;
  },

  // Get depreciation history for an asset
  getDepreciations: async (id: number): Promise<AssetDepreciation[]> => {
    const response = await api.get(`/assets/${id}/depreciations`);
    return response.data.data || response.data;
  },

  // Get maintenance history for an asset
  getMaintenances: async (id: number): Promise<AssetMaintenance[]> => {
    const response = await api.get(`/assets/${id}/maintenances`);
    return response.data.data || response.data;
  },

  // Get transfer history for an asset
  getTransfers: async (id: number): Promise<AssetTransfer[]> => {
    const response = await api.get(`/assets/${id}/transfers`);
    return response.data.data || response.data;
  },

  // Get disposal history for an asset
  getDisposals: async (id: number): Promise<AssetDisposal[]> => {
    const response = await api.get(`/assets/${id}/disposals`);
    return response.data.data || response.data;
  },
};

// ============================================================================
// ASSET DEPRECIATION API
// ============================================================================

export const assetDepreciationsApi = {
  list: async (query?: AssetDepreciationQuery): Promise<PaginatedResponse<AssetDepreciation>> => {
    const response = await api.get('/assets/depreciations', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<AssetDepreciation> => {
    const response = await api.get(`/assets/depreciations/${id}`);
    return response.data;
  },

  create: async (data: CreateAssetDepreciationDto): Promise<AssetDepreciation> => {
    const response = await api.post('/assets/depreciations', data);
    return response.data;
  },

  update: async (id: number, data: UpdateAssetDepreciationDto): Promise<AssetDepreciation> => {
    const response = await api.put(`/assets/depreciations/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/assets/depreciations/${id}`);
  },

  getStats: async (): Promise<AssetDepreciationStats> => {
    const response = await api.get('/assets/depreciations/stats');
    return response.data;
  },

  // Post depreciation to GL
  post: async (id: number): Promise<AssetDepreciation> => {
    const response = await api.post(`/assets/depreciations/${id}/post`);
    return response.data;
  },

  // Bulk post depreciations
  bulkPost: async (ids: number[]): Promise<{ posted: number; failed: number }> => {
    const response = await api.post('/assets/depreciations/bulk-post', { ids });
    return response.data;
  },

  // Calculate depreciation for an asset
  calculate: async (assetId: number, date: string): Promise<{ amount: number; method: string }> => {
    const response = await api.post('/assets/depreciations/calculate', { assetId, date });
    return response.data;
  },

  // Run depreciation for period
  runForPeriod: async (fiscalYear: number, fiscalPeriod: number): Promise<{ created: number; total: number }> => {
    const response = await api.post('/assets/depreciations/run', { fiscalYear, fiscalPeriod });
    return response.data;
  },
};

// ============================================================================
// ASSET DISPOSAL API
// ============================================================================

export const assetDisposalsApi = {
  list: async (query?: AssetDisposalQuery): Promise<PaginatedResponse<AssetDisposal>> => {
    const response = await api.get('/assets/disposals', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<AssetDisposal> => {
    const response = await api.get(`/assets/disposals/${id}`);
    return response.data;
  },

  create: async (data: CreateAssetDisposalDto): Promise<AssetDisposal> => {
    const response = await api.post('/assets/disposals', data);
    return response.data;
  },

  update: async (id: number, data: UpdateAssetDisposalDto): Promise<AssetDisposal> => {
    const response = await api.put(`/assets/disposals/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/assets/disposals/${id}`);
  },

  getStats: async (): Promise<AssetDisposalStats> => {
    const response = await api.get('/assets/disposals/stats');
    return response.data;
  },

  // Workflow actions
  submit: async (id: number): Promise<AssetDisposal> => {
    const response = await api.post(`/assets/disposals/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<AssetDisposal> => {
    const response = await api.post(`/assets/disposals/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, reason?: string): Promise<AssetDisposal> => {
    const response = await api.post(`/assets/disposals/${id}/reject`, { reason });
    return response.data;
  },

  complete: async (id: number): Promise<AssetDisposal> => {
    const response = await api.post(`/assets/disposals/${id}/complete`);
    return response.data;
  },

  // Calculate gain/loss
  calculateGainLoss: async (assetId: number, disposalProceeds: number, disposalCosts: number): Promise<{ gainLoss: number; bookValue: number }> => {
    const response = await api.post('/assets/disposals/calculate-gain-loss', {
      assetId,
      disposalProceeds,
      disposalCosts,
    });
    return response.data;
  },
};

// ============================================================================
// ASSET TRANSFER API
// ============================================================================

export const assetTransfersApi = {
  list: async (query?: AssetTransferQuery): Promise<PaginatedResponse<AssetTransfer>> => {
    const response = await api.get('/assets/transfers', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<AssetTransfer> => {
    const response = await api.get(`/assets/transfers/${id}`);
    return response.data;
  },

  create: async (data: CreateAssetTransferDto): Promise<AssetTransfer> => {
    const response = await api.post('/assets/transfers', data);
    return response.data;
  },

  update: async (id: number, data: UpdateAssetTransferDto): Promise<AssetTransfer> => {
    const response = await api.put(`/assets/transfers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/assets/transfers/${id}`);
  },

  getStats: async (): Promise<AssetTransferStats> => {
    const response = await api.get('/assets/transfers/stats');
    return response.data;
  },

  // Workflow actions
  submit: async (id: number): Promise<AssetTransfer> => {
    const response = await api.post(`/assets/transfers/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<AssetTransfer> => {
    const response = await api.post(`/assets/transfers/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, reason?: string): Promise<AssetTransfer> => {
    const response = await api.post(`/assets/transfers/${id}/reject`, { reason });
    return response.data;
  },

  dispatch: async (id: number): Promise<AssetTransfer> => {
    const response = await api.post(`/assets/transfers/${id}/dispatch`);
    return response.data;
  },

  complete: async (id: number): Promise<AssetTransfer> => {
    const response = await api.post(`/assets/transfers/${id}/complete`);
    return response.data;
  },
};

// ============================================================================
// ASSET MAINTENANCE API
// ============================================================================

export const assetMaintenancesApi = {
  list: async (query?: AssetMaintenanceQuery): Promise<PaginatedResponse<AssetMaintenance>> => {
    const response = await api.get('/assets/maintenances', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<AssetMaintenance> => {
    const response = await api.get(`/assets/maintenances/${id}`);
    return response.data;
  },

  create: async (data: CreateAssetMaintenanceDto): Promise<AssetMaintenance> => {
    const response = await api.post('/assets/maintenances', data);
    return response.data;
  },

  update: async (id: number, data: UpdateAssetMaintenanceDto): Promise<AssetMaintenance> => {
    const response = await api.put(`/assets/maintenances/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/assets/maintenances/${id}`);
  },

  getStats: async (): Promise<AssetMaintenanceStats> => {
    const response = await api.get('/assets/maintenances/stats');
    return response.data;
  },

  // Workflow actions
  start: async (id: number): Promise<AssetMaintenance> => {
    const response = await api.post(`/assets/maintenances/${id}/start`);
    return response.data;
  },

  hold: async (id: number, reason?: string): Promise<AssetMaintenance> => {
    const response = await api.post(`/assets/maintenances/${id}/hold`, { reason });
    return response.data;
  },

  resume: async (id: number): Promise<AssetMaintenance> => {
    const response = await api.post(`/assets/maintenances/${id}/resume`);
    return response.data;
  },

  complete: async (id: number, data?: UpdateAssetMaintenanceDto): Promise<AssetMaintenance> => {
    const response = await api.post(`/assets/maintenances/${id}/complete`, data);
    return response.data;
  },

  // Post maintenance cost to GL
  post: async (id: number): Promise<AssetMaintenance> => {
    const response = await api.post(`/assets/maintenances/${id}/post`);
    return response.data;
  },

  // Get upcoming maintenance
  getUpcoming: async (days?: number): Promise<AssetMaintenance[]> => {
    const response = await api.get('/assets/maintenances/upcoming', {
      params: { days: days || 30 },
    });
    return response.data.data || response.data;
  },

  // Get overdue maintenance
  getOverdue: async (): Promise<AssetMaintenance[]> => {
    const response = await api.get('/assets/maintenances/overdue');
    return response.data.data || response.data;
  },
};

// ============================================================================
// ASSET SETTINGS API
// ============================================================================

export const assetSettingsApi = {
  get: async (): Promise<AssetSettings> => {
    const response = await api.get('/assets/settings');
    return response.data;
  },

  update: async (data: UpdateAssetSettingsDto): Promise<AssetSettings> => {
    const response = await api.put('/assets/settings', data);
    return response.data;
  },

  reset: async (): Promise<AssetSettings> => {
    const response = await api.post('/assets/settings/reset');
    return response.data;
  },
};
