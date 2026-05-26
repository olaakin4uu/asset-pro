import { api } from '../api';
import type { PaginatedResponse } from '@/types/core';
import type {
  Item,
  CreateItemDto,
  UpdateItemDto,
  ItemQueryParams,
  ItemStats,
  ItemCategory,
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryParams,
  CategoryStats,
  Brand,
  CreateBrandDto,
  UpdateBrandDto,
  BrandQueryParams,
  UnitOfMeasure,
  CreateUomDto,
  UpdateUomDto,
  UomQueryParams,
  UnitConversion,
  CreateConversionDto,
  Warehouse,
  CreateWarehouseDto,
  UpdateWarehouseDto,
  WarehouseQueryParams,
  WarehouseStats,
  BinLocation,
  CreateBinLocationDto,
  UpdateBinLocationDto,
  BinLocationQueryParams,
  StockLevel,
  StockLevelQueryParams,
  StockMovement,
  CreateStockMovementDto,
  UpdateStockMovementDto,
  StockMovementQueryParams,
  StockMovementStats,
  StockRequest,
  CreateIsrDto,
  UpdateIsrDto,
  IsrQueryParams,
  IsrStats,
  InventorySettings,
  UpdateInventorySettingsDto,
  CycleCountSchedule,
  CreateCycleCountScheduleDto,
  UpdateCycleCountScheduleDto,
  CycleCountAssignment,
  WarehouseAuthorization,
  CreateWarehouseAuthorizationDto,
  WarehouseAuthorizationDetail,
  CreateWarehouseAuthorizationData,
  UpdateWarehouseAuthorizationData,
  AuthorizedWarehouse,
  WarehouseAuthorizationStats,
  WarehouseOperation,
  ItemPrice,
  CreateItemPriceDto,
  UpdateItemPriceDto,
  ItemPriceQueryParams,
  ItemPriceStats,
  ItemBeginningBalance,
  BeginningBalanceStats,
  BeginningBalanceQueryParams,
  BeginningBalanceGridItem,
  BulkSaveBeginningBalancesDto,
} from '@/types/inventory';

// ============================================================================
// ITEMS API
// ============================================================================

export const itemsApi = {
  list: async (query?: ItemQueryParams): Promise<PaginatedResponse<Item>> => {
    const response = await api.get('/inventory/items', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Item> => {
    const response = await api.get(`/inventory/items/${id}`);
    return response.data;
  },

  create: async (data: CreateItemDto): Promise<Item> => {
    const response = await api.post('/inventory/items', data);
    return response.data;
  },

  update: async (id: number, data: UpdateItemDto): Promise<Item> => {
    const response = await api.put(`/inventory/items/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/items/${id}`);
  },

  getStats: async (): Promise<ItemStats> => {
    const response = await api.get('/inventory/items/stats');
    return response.data;
  },

  submit: async (id: number): Promise<Item> => {
    const response = await api.post(`/inventory/items/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, notes?: string): Promise<Item> => {
    const response = await api.post(`/inventory/items/${id}/approve`, { approvalNotes: notes });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<Item> => {
    const response = await api.post(`/inventory/items/${id}/reject`, { rejectionReason: reason });
    return response.data;
  },

  getActive: async (): Promise<Item[]> => {
    const response = await api.get('/inventory/items', {
      params: { isActive: true, isSellable: true, limit: 1000 },
    });
    return response.data.data || response.data;
  },

  getPurchasable: async (): Promise<Item[]> => {
    const response = await api.get('/inventory/items', {
      params: { isActive: true, isPurchasable: true, limit: 1000 },
    });
    return response.data.data || response.data;
  },

  search: async (query: string, assemblyType?: string): Promise<Item[]> => {
    const response = await api.get('/inventory/items/search', {
      params: { search: query, assemblyType, limit: 50 },
    });
    return response.data;
  },

  generateCode: async (categoryId?: number): Promise<string> => {
    const response = await api.get('/inventory/items/generate-code', {
      params: { categoryId },
    });
    return response.data.itemCode;
  },

  duplicate: async (id: number, itemCode: string): Promise<Item> => {
    const response = await api.post(`/inventory/items/${id}/duplicate`, { itemCode });
    return response.data;
  },

  lookupByBarcode: async (barcode: string): Promise<Item | null> => {
    try {
      const response = await api.get(`/inventory/items/by-barcode/${encodeURIComponent(barcode)}`);
      return response.data;
    } catch {
      return null;
    }
  },

  getImportTemplate: async (): Promise<{ headers: string[]; sampleRows: string[][]; notes: Record<string, string> }> => {
    const response = await api.get('/inventory/items/import/template');
    return response.data;
  },

  exportExcel: async (params?: { search?: string; status?: string; categoryId?: number }): Promise<void> => {
    try {
      const response = await api.get('/inventory/items/export', {
        params,
        responseType: 'blob',
        timeout: 60000,
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const filename = response.headers['content-disposition']
        ?.split('filename="')[1]?.replace('"', '') || `inventory_items_${new Date().toISOString().split('T')[0]}.xlsx`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      // Blob responses wrap errors as Blob — try to extract the message
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as { response?: { data?: Blob } }).response;
        if (resp?.data instanceof Blob) {
          const text = await resp.data.text();
          try {
            const json = JSON.parse(text);
            throw new Error(json.message || 'Export failed');
          } catch (e) {
            if (e instanceof Error && e.message !== 'Export failed') throw e;
            throw new Error(text || 'Export failed');
          }
        }
      }
      throw err;
    }
  },

  importItems: async (
    items: import('@/types/inventory').ImportItemRow[],
    importMode?: 'skip' | 'update' | 'overwrite',
    branchId?: number | null,
  ): Promise<import('@/types/inventory').ImportItemsResult> => {
    const response = await api.post('/inventory/items/import', { items, importMode, branchId: branchId ?? undefined });
    return response.data;
  },
};

// ============================================================================
// CATEGORIES API
// ============================================================================

export const categoriesApi = {
  list: async (query?: CategoryQueryParams): Promise<PaginatedResponse<ItemCategory>> => {
    const response = await api.get('/inventory/categories', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ItemCategory> => {
    const response = await api.get(`/inventory/categories/${id}`);
    return response.data;
  },

  create: async (data: CreateCategoryDto): Promise<ItemCategory> => {
    const response = await api.post('/inventory/categories', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCategoryDto): Promise<ItemCategory> => {
    const response = await api.patch(`/inventory/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/categories/${id}`);
  },

  getStats: async (): Promise<CategoryStats> => {
    const response = await api.get('/inventory/categories/stats');
    return response.data;
  },

  getActive: async (): Promise<ItemCategory[]> => {
    const response = await api.get('/inventory/categories', { params: { isActive: true, limit: 500 } });
    return response.data.data || response.data;
  },

  getTree: async (): Promise<ItemCategory[]> => {
    const response = await api.get('/inventory/categories/tree');
    return response.data;
  },

  search: async (query: string, inventoryType?: string): Promise<ItemCategory[]> => {
    const response = await api.get('/inventory/categories/search', {
      params: { search: query, inventoryType, limit: 50 },
    });
    return response.data;
  },

  getImportTemplate: async (): Promise<{ headers: string[]; sampleRows: string[][]; notes: Record<string, string> }> => {
    const response = await api.get('/inventory/categories/import/template');
    return response.data;
  },

  importCategories: async (
    categories: import('@/types/inventory').ImportCategoryItem[],
    importMode?: 'skip' | 'update' | 'overwrite',
  ): Promise<import('@/types/inventory').ImportCategoriesResult> => {
    const response = await api.post('/inventory/categories/import', { categories, importMode });
    return response.data;
  },

  exportGlMappings: async (): Promise<void> => {
    try {
      const response = await api.get('/inventory/categories/export-gl-mappings', { responseType: 'blob', timeout: 60000 });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const filename = response.headers['content-disposition']
        ?.split('filename="')[1]?.replace('"', '') || `category_gl_mappings_${new Date().toISOString().split('T')[0]}.xlsx`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as { response?: { data?: Blob } }).response;
        if (resp?.data instanceof Blob) {
          const text = await resp.data.text();
          try { throw new Error(JSON.parse(text).message); } catch { throw new Error(text || 'Export failed'); }
        }
      }
      throw err;
    }
  },
};

// ============================================================================
// BRANDS API
// ============================================================================

export const brandsApi = {
  list: async (query?: BrandQueryParams): Promise<PaginatedResponse<Brand>> => {
    const response = await api.get('/inventory/brands', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Brand> => {
    const response = await api.get(`/inventory/brands/${id}`);
    return response.data;
  },

  create: async (data: CreateBrandDto): Promise<Brand> => {
    const response = await api.post('/inventory/brands', data);
    return response.data;
  },

  update: async (id: number, data: UpdateBrandDto): Promise<Brand> => {
    const response = await api.patch(`/inventory/brands/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/brands/${id}`);
  },

  getActive: async (): Promise<Brand[]> => {
    const response = await api.get('/inventory/brands', { params: { isActive: true, limit: 500 } });
    return response.data.data || response.data;
  },

  getStats: async (): Promise<{ total: number; active: number; inactive: number }> => {
    const response = await api.get('/inventory/brands/stats');
    return response.data;
  },

  uploadLogo: async (id: number, file: File): Promise<Brand> => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.post(`/inventory/brands/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteLogo: async (id: number): Promise<Brand> => {
    const response = await api.delete(`/inventory/brands/${id}/logo`);
    return response.data;
  },
};

// ============================================================================
// UNITS OF MEASURE API
// ============================================================================

export const uomsApi = {
  list: async (query?: UomQueryParams): Promise<PaginatedResponse<UnitOfMeasure>> => {
    const response = await api.get('/inventory/uoms', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<UnitOfMeasure> => {
    const response = await api.get(`/inventory/uoms/${id}`);
    return response.data;
  },

  create: async (data: CreateUomDto): Promise<UnitOfMeasure> => {
    const response = await api.post('/inventory/uoms', data);
    return response.data;
  },

  update: async (id: number, data: UpdateUomDto): Promise<UnitOfMeasure> => {
    const response = await api.patch(`/inventory/uoms/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/uoms/${id}`);
  },

  getActive: async (): Promise<UnitOfMeasure[]> => {
    const response = await api.get('/inventory/uoms', { params: { isActive: true, limit: 500 } });
    return response.data.data || response.data;
  },

  getStats: async (): Promise<{ total: number; active: number; inactive: number; conversions: number }> => {
    const response = await api.get('/inventory/uoms/stats');
    return response.data;
  },

  // Conversion endpoints (merged from unit-conversions)
  getConversionsForUom: async (uomId: number): Promise<UnitConversion[]> => {
    const response = await api.get(`/inventory/uoms/conversions/by-uom/${uomId}`);
    return response.data;
  },

  listConversions: async (query?: { fromUomId?: number; toUomId?: number; itemId?: number; page?: number; limit?: number }): Promise<PaginatedResponse<UnitConversion>> => {
    const response = await api.get('/inventory/uoms/conversions', { params: query });
    return response.data;
  },

  createConversion: async (data: CreateConversionDto): Promise<UnitConversion> => {
    const response = await api.post('/inventory/uoms/conversions', data);
    return response.data;
  },

  updateConversion: async (id: number, data: { conversionFactor?: number; isDefault?: boolean }): Promise<UnitConversion> => {
    const response = await api.put(`/inventory/uoms/conversions/${id}`, data);
    return response.data;
  },

  deleteConversion: async (id: number): Promise<void> => {
    await api.delete(`/inventory/uoms/conversions/${id}`);
  },
};

// ============================================================================
// WAREHOUSES API
// ============================================================================

export const warehousesApi = {
  list: async (query?: WarehouseQueryParams): Promise<PaginatedResponse<Warehouse>> => {
    const response = await api.get('/inventory/warehouses', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Warehouse> => {
    const response = await api.get(`/inventory/warehouses/${id}`);
    return response.data;
  },

  create: async (data: CreateWarehouseDto): Promise<Warehouse> => {
    const response = await api.post('/inventory/warehouses', data);
    return response.data;
  },

  update: async (id: number, data: UpdateWarehouseDto): Promise<Warehouse> => {
    const response = await api.put(`/inventory/warehouses/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/warehouses/${id}`);
  },

  getStats: async (): Promise<WarehouseStats> => {
    const response = await api.get('/inventory/warehouses/stats');
    return response.data;
  },

  approve: async (id: number, notes?: string): Promise<Warehouse> => {
    const response = await api.post(`/inventory/warehouses/${id}/approve`, { approvalNotes: notes });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<Warehouse> => {
    const response = await api.post(`/inventory/warehouses/${id}/reject`, { rejectionReason: reason });
    return response.data;
  },

  getActive: async (): Promise<Warehouse[]> => {
    const response = await api.get('/inventory/warehouses', { params: { status: 'approved', limit: 500 } });
    return response.data.data || response.data;
  },

  getStockLevels: async (id: number, query?: StockLevelQueryParams): Promise<PaginatedResponse<StockLevel>> => {
    const response = await api.get(`/inventory/warehouses/${id}/stock-levels`, { params: query });
    return response.data;
  },

  getAuthorizedUsers: async (id: number): Promise<WarehouseAuthorization[]> => {
    const response = await api.get(`/inventory/warehouses/${id}/authorized-users`);
    return response.data;
  },

  authorize: async (id: number, data: CreateWarehouseAuthorizationDto): Promise<WarehouseAuthorization> => {
    const response = await api.post(`/inventory/warehouses/${id}/authorize`, data);
    return response.data;
  },

  removeAuthorization: async (id: number, userId: number): Promise<void> => {
    await api.delete(`/inventory/warehouses/${id}/authorize/${userId}`);
  },
};

// ============================================================================
// BIN LOCATIONS API
// ============================================================================

export const binLocationsApi = {
  list: async (query?: BinLocationQueryParams): Promise<PaginatedResponse<BinLocation>> => {
    const response = await api.get('/inventory/bin-locations', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<BinLocation> => {
    const response = await api.get(`/inventory/bin-locations/${id}`);
    return response.data;
  },

  create: async (data: CreateBinLocationDto): Promise<BinLocation> => {
    const response = await api.post('/inventory/bin-locations', data);
    return response.data;
  },

  update: async (id: number, data: UpdateBinLocationDto): Promise<BinLocation> => {
    const response = await api.patch(`/inventory/bin-locations/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/bin-locations/${id}`);
  },

  getByWarehouse: async (warehouseId: number): Promise<BinLocation[]> => {
    const response = await api.get('/inventory/bin-locations', { params: { warehouseId, isActive: true, limit: 500 } });
    return response.data.data || response.data;
  },
};

// ============================================================================
// STOCK LEVELS API
// ============================================================================

export const stockLevelsApi = {
  list: async (query?: StockLevelQueryParams): Promise<PaginatedResponse<StockLevel>> => {
    const response = await api.get('/inventory/stock-levels', { params: query });
    return response.data;
  },

  getByItem: async (itemId: number, warehouseId?: number): Promise<StockLevel[]> => {
    const response = await api.get('/inventory/stock-levels', { params: { itemId, warehouseId, limit: 100 } });
    return response.data.data || response.data;
  },

  getByWarehouse: async (warehouseId: number): Promise<StockLevel[]> => {
    const response = await api.get('/inventory/stock-levels', { params: { warehouseId, limit: 1000 } });
    return response.data.data || response.data;
  },

  getLowStock: async (): Promise<StockLevel[]> => {
    const response = await api.get('/inventory/stock-levels', { params: { belowReorderLevel: true, limit: 100 } });
    return response.data.data || response.data;
  },

  getExpiring: async (days: number = 30): Promise<StockLevel[]> => {
    const response = await api.get('/inventory/stock-levels', { params: { expiringWithinDays: days, limit: 100 } });
    return response.data.data || response.data;
  },
};

// ============================================================================
// STOCK MOVEMENTS API
// ============================================================================

export const stockMovementsApi = {
  list: async (query?: StockMovementQueryParams): Promise<PaginatedResponse<StockMovement>> => {
    const response = await api.get('/inventory/stock-movements', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<StockMovement> => {
    const response = await api.get(`/inventory/stock-movements/${id}`);
    return response.data;
  },

  create: async (data: CreateStockMovementDto): Promise<StockMovement> => {
    const response = await api.post('/inventory/stock-movements', data);
    return response.data;
  },

  update: async (id: number, data: UpdateStockMovementDto): Promise<StockMovement> => {
    const response = await api.patch(`/inventory/stock-movements/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/stock-movements/${id}`);
  },

  getStats: async (): Promise<StockMovementStats> => {
    const response = await api.get('/inventory/stock-movements/stats');
    return response.data;
  },

  submit: async (id: number): Promise<StockMovement> => {
    const response = await api.post(`/inventory/stock-movements/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, notes?: string): Promise<StockMovement> => {
    const response = await api.post(`/inventory/stock-movements/${id}/approve`, { approvalNotes: notes });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<StockMovement> => {
    const response = await api.post(`/inventory/stock-movements/${id}/reject`, { rejectionReason: reason });
    return response.data;
  },

  post: async (id: number): Promise<StockMovement> => {
    const response = await api.post(`/inventory/stock-movements/${id}/post`);
    return response.data;
  },

  cancel: async (id: number): Promise<StockMovement> => {
    const response = await api.post(`/inventory/stock-movements/${id}/cancel`);
    return response.data;
  },
};

// ============================================================================
// STOCK REQUESTS (ISR) API
// ============================================================================

export const stockRequestsApi = {
  list: async (query?: IsrQueryParams): Promise<PaginatedResponse<StockRequest>> => {
    const response = await api.get('/inventory/stock-requests', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<StockRequest> => {
    const response = await api.get(`/inventory/stock-requests/${id}`);
    return response.data;
  },

  create: async (data: CreateIsrDto): Promise<StockRequest> => {
    const response = await api.post('/inventory/stock-requests', data);
    return response.data;
  },

  update: async (id: number, data: UpdateIsrDto): Promise<StockRequest> => {
    const response = await api.patch(`/inventory/stock-requests/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/stock-requests/${id}`);
  },

  getStats: async (): Promise<IsrStats> => {
    const response = await api.get('/inventory/stock-requests/stats');
    return response.data;
  },

  // Workflow actions
  submit: async (id: number): Promise<StockRequest> => {
    const response = await api.post(`/inventory/stock-requests/${id}/submit`);
    return response.data;
  },

  hodApprove: async (id: number, notes?: string, approvedQuantities?: Record<number, number>): Promise<StockRequest> => {
    const response = await api.post(`/inventory/stock-requests/${id}/hod-approve`, { approvalNotes: notes, approvedQuantities });
    return response.data;
  },

  auditApprove: async (id: number, notes?: string): Promise<StockRequest> => {
    const response = await api.post(`/inventory/stock-requests/${id}/audit-approve`, { approvalNotes: notes });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<StockRequest> => {
    const response = await api.post(`/inventory/stock-requests/${id}/reject`, { rejectionReason: reason });
    return response.data;
  },

  issue: async (id: number, warehouseId: number, lines: { lineId: number; quantityToIssue: number; batchId?: number; serialNumber?: string }[], notes?: string): Promise<StockRequest> => {
    const response = await api.post(`/inventory/stock-requests/${id}/issue`, { warehouseId, lines, issueNotes: notes });
    return response.data;
  },

  cancel: async (id: number): Promise<StockRequest> => {
    const response = await api.post(`/inventory/stock-requests/${id}/cancel`);
    return response.data;
  },

  // My requests
  getMyRequests: async (query?: IsrQueryParams): Promise<PaginatedResponse<StockRequest>> => {
    const response = await api.get('/inventory/stock-requests/my-requests', { params: query });
    return response.data;
  },

  // Pending approvals
  getPendingApprovals: async (approvalType?: 'hod' | 'audit' | 'store_issue'): Promise<PaginatedResponse<StockRequest>> => {
    const response = await api.get('/inventory/stock-requests/pending-approvals', { params: { approvalType } });
    return response.data;
  },
};

// ============================================================================
// INVENTORY REPORTS API
// ============================================================================

export const inventoryReportsApi = {
  getStockValuation: async (warehouseId?: number, categoryId?: number): Promise<Record<string, unknown>> => {
    const response = await api.get('/inventory/reports/stock-valuation', { params: { warehouseId, categoryId } });
    return response.data;
  },

  getMovementSummary: async (dateFrom: string, dateTo: string, warehouseId?: number): Promise<Record<string, unknown>> => {
    const response = await api.get('/inventory/reports/movement-summary', { params: { dateFrom, dateTo, warehouseId } });
    return response.data;
  },

  getSlowMovingItems: async (daysWithoutMovement?: number, warehouseId?: number): Promise<Record<string, unknown>> => {
    const response = await api.get('/inventory/reports/slow-moving', { params: { daysWithoutMovement, warehouseId } });
    return response.data;
  },

  getExpiringStock: async (daysUntilExpiry?: number, warehouseId?: number): Promise<Record<string, unknown>> => {
    const response = await api.get('/inventory/reports/expiring-stock', { params: { daysUntilExpiry, warehouseId } });
    return response.data;
  },

  getReorderReport: async (warehouseId?: number): Promise<Record<string, unknown>> => {
    const response = await api.get('/inventory/reports/reorder', { params: { warehouseId } });
    return response.data;
  },

  getStockLedger: async (params: { itemId: number; dateFrom?: string; dateTo?: string; warehouseId?: number; limit?: number; page?: number }): Promise<{ data: Record<string, unknown>[]; total: number; openingBalance: number; openingUnitCost: number; openingTotalValue: number }> => {
    const response = await api.get('/inventory/reports/stock-ledger', { params });
    return response.data;
  },
};

// ============================================================================
// ITEM BARCODES API
// ============================================================================

export const itemBarcodesApi = {
  list: async (query?: { itemId?: number; barcodeType?: string; search?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/inventory/item-barcodes', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/inventory/item-barcodes/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/inventory/item-barcodes', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`/inventory/item-barcodes/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/item-barcodes/${id}`);
  },

  getByItem: async (itemId: number): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/inventory/item-barcodes', { params: { itemId, limit: 500 } });
    return response.data.data || response.data;
  },
};

// ============================================================================
// PRICE GROUPS API
// ============================================================================

export const priceGroupsApi = {
  list: async (query?: { isActive?: boolean; search?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/inventory/price-groups', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/inventory/price-groups/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/inventory/price-groups', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`/inventory/price-groups/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/price-groups/${id}`);
  },

  getActive: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/inventory/price-groups', { params: { isActive: true, limit: 500 } });
    return response.data.data || response.data;
  },
};

// ============================================================================
// STOCK BATCHES API
// ============================================================================

export const stockBatchesApi = {
  list: async (query?: { itemId?: number; warehouseId?: number; status?: string; search?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/inventory/stock-batches', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/inventory/stock-batches/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/inventory/stock-batches', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`/inventory/stock-batches/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/stock-batches/${id}`);
  },

  getByItem: async (itemId: number): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/inventory/stock-batches', { params: { itemId, limit: 500 } });
    return response.data.data || response.data;
  },

  getByWarehouse: async (warehouseId: number): Promise<Record<string, unknown>[]> => {
    const response = await api.get('/inventory/stock-batches', { params: { warehouseId, limit: 500 } });
    return response.data.data || response.data;
  },
};

// ============================================================================
// STOCK COUNTS API
// ============================================================================

export const stockCountsApi = {
  list: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/inventory/stock-counts', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/inventory/stock-counts/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/inventory/stock-counts', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.put(`/inventory/stock-counts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/stock-counts/${id}`);
  },

  startCount: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.post(`/inventory/stock-counts/${id}/start`);
    return response.data;
  },

  submitCount: async (id: number, data: { lines: Record<string, unknown>[]; autoAdjust?: boolean; adjustmentReason?: string }): Promise<Record<string, unknown>> => {
    const response = await api.post(`/inventory/stock-counts/${id}/submit`, data);
    return response.data;
  },

  completeCount: async (id: number, data: { notes?: string; autoAdjust: boolean; varianceThreshold?: number }): Promise<Record<string, unknown>> => {
    const response = await api.post(`/inventory/stock-counts/${id}/complete`, data);
    return response.data;
  },

  cancelCount: async (id: number, reason: string): Promise<Record<string, unknown>> => {
    const response = await api.post(`/inventory/stock-counts/${id}/cancel`, { reason });
    return response.data;
  },

  getStats: async (companyId?: number, warehouseId?: number): Promise<Record<string, unknown>> => {
    const response = await api.get('/inventory/stock-counts/stats', { params: { companyId, warehouseId } });
    return response.data;
  },

  getVarianceAnalysis: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/inventory/stock-counts/${id}/variance-analysis`);
    return response.data;
  },
};

// ============================================================================
// VALUATION API
// ============================================================================

export const valuationApi = {
  getReport: async (query?: {
    companyId?: number;
    warehouseId?: number;
    itemCategoryId?: number;
    itemId?: number;
    method?: 'FIFO' | 'LIFO' | 'WEIGHTED_AVERAGE' | 'STANDARD_COST';
    asOfDate?: string;
  }): Promise<Record<string, unknown>> => {
    const response = await api.get('/inventory/valuation/report', { params: query });
    return response.data;
  },

  compareByMethod: async (query?: {
    companyId?: number;
    warehouseId?: number;
    itemId?: number;
    asOfDate?: string;
  }): Promise<Record<string, unknown>> => {
    const response = await api.get('/inventory/valuation/compare', { params: query });
    return response.data;
  },

  updateStandardCost: async (data: {
    itemId: number;
    standardCost: number;
    reason?: string;
    effectiveDate?: string;
  }): Promise<Record<string, unknown>> => {
    const response = await api.post('/inventory/valuation/update-cost', data);
    return response.data;
  },
};

// ============================================================================
// CYCLE COUNT API
// ============================================================================

export const cycleCountApi = {
  getABCAnalysis: async (query?: {
    companyId?: number;
    warehouseId?: number;
    startDate?: string;
    endDate?: string;
    aThreshold?: number;
    bThreshold?: number;
  }): Promise<Record<string, unknown>> => {
    const response = await api.get('/inventory/cycle-counts/abc-analysis', { params: query });
    return response.data;
  },
};

// ============================================================================
// CYCLE COUNTS (SCHEDULES) API
// ============================================================================

export const cycleCountsApi = {
  // ABC Analysis
  getABCAnalysis: async (query?: {
    companyId?: number;
    warehouseId?: number;
    startDate?: string;
    endDate?: string;
    aThreshold?: number;
    bThreshold?: number;
  }): Promise<Record<string, unknown>> => {
    const response = await api.get('/inventory/cycle-counts/abc-analysis', { params: query });
    return response.data;
  },

  // Schedule CRUD
  list: async (query?: Record<string, unknown>): Promise<CycleCountSchedule[]> => {
    const response = await api.get('/inventory/cycle-counts/schedules', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<CycleCountSchedule> => {
    const response = await api.get(`/inventory/cycle-counts/schedules/${id}`);
    return response.data;
  },

  create: async (data: CreateCycleCountScheduleDto): Promise<CycleCountSchedule> => {
    const response = await api.post('/inventory/cycle-counts/schedules', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCycleCountScheduleDto): Promise<CycleCountSchedule> => {
    const response = await api.put(`/inventory/cycle-counts/schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/cycle-counts/schedules/${id}`);
  },

  // Assignments
  generateAssignments: async (data: { scheduleId: number; scheduledDate: string; limit?: number }): Promise<CycleCountAssignment[]> => {
    const response = await api.post('/inventory/cycle-counts/assignments/generate', data);
    return response.data;
  },

  getAssignments: async (scheduleId: number): Promise<CycleCountAssignment[]> => {
    const response = await api.get(`/inventory/cycle-counts/schedules/${scheduleId}/assignments`);
    return response.data;
  },

  completeAssignment: async (id: number, data: { stockCountId: number; notes?: string }): Promise<CycleCountAssignment> => {
    const response = await api.post(`/inventory/cycle-counts/assignments/${id}/complete`, data);
    return response.data;
  },

  skipAssignment: async (id: number, data: { reason: string }): Promise<CycleCountAssignment> => {
    const response = await api.post(`/inventory/cycle-counts/assignments/${id}/skip`, data);
    return response.data;
  },
};

// ============================================================================
// INVENTORY SETTINGS API
// ============================================================================

export const inventorySettingsApi = {
  get: async (): Promise<InventorySettings> => {
    const response = await api.get('/inventory/settings');
    return response.data;
  },

  update: async (data: UpdateInventorySettingsDto): Promise<InventorySettings> => {
    const response = await api.put('/inventory/settings', data);
    return response.data;
  },
};

// ============================================================================
// ITEM PRICES API
// ============================================================================

export const itemPricesApi = {
  list: async (query?: ItemPriceQueryParams): Promise<PaginatedResponse<ItemPrice>> => {
    const response = await api.get('/inventory/item-prices', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ItemPrice> => {
    const response = await api.get(`/inventory/item-prices/${id}`);
    return response.data;
  },

  create: async (data: CreateItemPriceDto): Promise<ItemPrice> => {
    const response = await api.post('/inventory/item-prices', data);
    return response.data;
  },

  update: async (id: number, data: UpdateItemPriceDto): Promise<ItemPrice> => {
    const response = await api.put(`/inventory/item-prices/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/item-prices/${id}`);
  },

  getStats: async (): Promise<ItemPriceStats> => {
    const items = await api.get('/inventory/item-prices', { params: { limit: 1000 } });
    const data: ItemPrice[] = items.data?.data || items.data || [];
    const active = data.filter((p: ItemPrice) => p.isActive).length;
    return {
      total: data.length,
      active,
      inactive: data.length - active,
      standard: data.filter((p: ItemPrice) => p.priceType === 'standard').length,
      promotional: data.filter((p: ItemPrice) => p.priceType === 'promotional').length,
      contract: data.filter((p: ItemPrice) => p.priceType === 'contract').length,
      volume: data.filter((p: ItemPrice) => p.priceType === 'volume').length,
      special: data.filter((p: ItemPrice) => p.priceType === 'special').length,
    };
  },
};

// ============================================================================
// BEGINNING BALANCES API
// ============================================================================

export const beginningBalancesApi = {
  list: async (query?: BeginningBalanceQueryParams): Promise<PaginatedResponse<ItemBeginningBalance>> => {
    const response = await api.get('/inventory/beginning-balances', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<ItemBeginningBalance> => {
    const response = await api.get(`/inventory/beginning-balances/${id}`);
    return response.data;
  },

  create: async (data: {
    itemId: number;
    warehouseId?: number;
    financialYearId?: number;
    balanceDate: string;
    openingQuantity: number;
    unitCost: number;
    uomId?: number;
    valuationMethod?: string;
    batchNumber?: string;
    expiryDate?: string;
    manufactureDate?: string;
    notes?: string;
  }): Promise<ItemBeginningBalance> => {
    const response = await api.post('/inventory/beginning-balances', data);
    return response.data;
  },

  getStats: async (financialYearId?: number): Promise<BeginningBalanceStats> => {
    const response = await api.get('/inventory/beginning-balances/stats', {
      params: financialYearId ? { financialYearId } : undefined,
    });
    return response.data;
  },

  getItemsGrid: async (params?: {
    branchId?: number;
    warehouseId?: number;
    financialYearId?: number;
    search?: string;
  }): Promise<BeginningBalanceGridItem[]> => {
    const response = await api.get('/inventory/beginning-balances/items-grid', { params });
    return response.data;
  },

  bulkSave: async (data: BulkSaveBeginningBalancesDto): Promise<{ saved: number; skipped: number; errors: string[] }> => {
    const response = await api.post('/inventory/beginning-balances/bulk-save', data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/inventory/beginning-balances/${id}`);
  },

  submit: async (id: number): Promise<ItemBeginningBalance> => {
    const response = await api.post(`/inventory/beginning-balances/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<ItemBeginningBalance> => {
    const response = await api.post(`/inventory/beginning-balances/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<ItemBeginningBalance> => {
    const response = await api.post(`/inventory/beginning-balances/${id}/reject`, { reason });
    return response.data;
  },

  post: async (id: number): Promise<ItemBeginningBalance> => {
    const response = await api.post(`/inventory/beginning-balances/${id}/post`);
    return response.data;
  },

  // Super Admin only. Reverts a POSTED balance back to DRAFT (stock level
  // rolled back + journal entry deleted) so qty/cost can be corrected.
  // Returns 409 DOWNSTREAM_ACTIVITY if any stock movement has already used
  // this item/warehouse — caller should offer a stock adjustment instead.
  unpost: async (id: number): Promise<ItemBeginningBalance> => {
    const response = await api.post(`/inventory/beginning-balances/${id}/unpost`);
    return response.data;
  },

  // List posted BBs with qty>0 + cost=0 (off-balance-sheet inventory).
  // Used by the BB list page banner so admins can repair legacy rows.
  listZeroValue: async (): Promise<Array<{
    id: number;
    itemId: number;
    itemCode: string | null;
    itemName: string | null;
    warehouseId: number | null;
    warehouseName: string | null;
    openingQuantity: number;
    suggestedCost: number | null;
    postedAt: string | null;
    balanceDate: string | null;
  }>> => {
    const response = await api.get('/inventory/beginning-balances/zero-value');
    return response.data;
  },

  // Super Admin: surgical repair — set unitCost on a posted zero-cost BB,
  // create the missing JE, refresh stock value. No unpost required.
  repairZeroValue: async (id: number, unitCost: number): Promise<ItemBeginningBalance> => {
    const response = await api.post(`/inventory/beginning-balances/${id}/repair-zero-value`, { unitCost });
    return response.data;
  },

  bulkSubmit: async (ids: number[]): Promise<{ submitted: number; errors: string[] }> => {
    const response = await api.post('/inventory/beginning-balances/bulk-submit', { ids });
    return response.data;
  },

  bulkApprove: async (ids: number[]): Promise<{ approved: number; errors: string[] }> => {
    const response = await api.post('/inventory/beginning-balances/bulk-approve', { ids });
    return response.data;
  },

  bulkPost: async (ids: number[]): Promise<{ posted: number; errors: string[] }> => {
    const response = await api.post('/inventory/beginning-balances/bulk-post', { ids });
    return response.data;
  },

  getImportTemplate: async (): Promise<{
    headers: string[];
    instructions: string[];
    sampleRows: Record<string, unknown>[];
    warehouses: { code: string; name: string }[];
  }> => {
    const response = await api.get('/inventory/beginning-balances/import/template');
    return response.data;
  },

  importBalances: async (data: {
    rows: { itemCode: string; warehouseCode: string; openingQuantity: number; unitCost: number }[];
    financialYearId?: number;
    balanceDate?: string;
  }): Promise<{ imported: number; skipped: number; total: number; errors: string[] }> => {
    const response = await api.post('/inventory/beginning-balances/import', data);
    return response.data;
  },
};

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const inventoryApi = {
  items: itemsApi,
  categories: categoriesApi,
  brands: brandsApi,
  uoms: uomsApi,
  warehouses: warehousesApi,
  binLocations: binLocationsApi,
  stockLevels: stockLevelsApi,
  stockMovements: stockMovementsApi,
  stockRequests: stockRequestsApi,
  reports: inventoryReportsApi,
  itemBarcodes: itemBarcodesApi,
  priceGroups: priceGroupsApi,
  itemPrices: itemPricesApi,
  stockBatches: stockBatchesApi,
  stockCounts: stockCountsApi,
  valuation: valuationApi,
  cycleCounts: cycleCountsApi,
  settings: inventorySettingsApi,
  beginningBalances: beginningBalancesApi,
};

// ============================================================================
// WAREHOUSE AUTHORIZATIONS API
// ============================================================================

export const warehouseAuthorizationsApi = {
  list: async (params?: {
    search?: string;
    warehouseId?: number;
    employeeId?: number;
    page?: number;
    limit?: number;
  }): Promise<{ data: WarehouseAuthorizationDetail[]; total: number }> => {
    const response = await api.get('/inventory/warehouse-authorizations', { params });
    return response.data;
  },

  getStats: async (): Promise<WarehouseAuthorizationStats> => {
    const response = await api.get('/inventory/warehouse-authorizations/stats');
    return response.data;
  },

  upsert: async (data: CreateWarehouseAuthorizationData): Promise<WarehouseAuthorizationDetail> => {
    const response = await api.post('/inventory/warehouse-authorizations', data);
    return response.data;
  },

  update: async (
    warehouseId: number,
    employeeId: number,
    data: UpdateWarehouseAuthorizationData,
  ): Promise<WarehouseAuthorizationDetail> => {
    const response = await api.put(`/inventory/warehouse-authorizations/${warehouseId}/${employeeId}`, data);
    return response.data;
  },

  delete: async (warehouseId: number, employeeId: number): Promise<void> => {
    await api.delete(`/inventory/warehouse-authorizations/${warehouseId}/${employeeId}`);
  },

  getForEmployee: async (employeeId: number): Promise<WarehouseAuthorizationDetail[]> => {
    const response = await api.get(`/inventory/warehouse-authorizations/employee/${employeeId}`);
    return response.data;
  },

  getMyWarehouses: async (operation: WarehouseOperation): Promise<AuthorizedWarehouse[]> => {
    const response = await api.get('/inventory/warehouse-authorizations/my-warehouses', {
      params: { operation },
    });
    return response.data;
  },

  getEmployeeWarehouses: async (
    employeeId: number,
    operation: WarehouseOperation,
  ): Promise<AuthorizedWarehouse[]> => {
    const response = await api.get(`/inventory/warehouse-authorizations/employee/${employeeId}/warehouses`, {
      params: { operation },
    });
    return response.data;
  },
};

// ============================================================================
// INVENTORY ALERTS — read-only lists (Sprint 1.2)
// ============================================================================

export interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  reorderLevel: number | string;
  reorderQuantity: number | string;
  minimumStockLevel: number | string;
  currentStock: number | string;
}

export interface ExpiringBatch {
  id: number;
  batchNumber: string;
  expiryDate: string;
  quantity: number | string;
  itemId: number;
  itemName: string;
  itemSku: string;
  warehouseName: string;
}

export const inventoryAlertsApi = {
  listLowStock: async (): Promise<{ data: LowStockItem[]; total: number }> => {
    const r = await api.get('/inventory/alerts/low-stock');
    return r.data;
  },
  listExpiring: async (days = 60): Promise<{ data: ExpiringBatch[]; total: number; windowDays: number }> => {
    const r = await api.get('/inventory/alerts/expiring', { params: { days } });
    return r.data;
  },
  runChecksNow: async (): Promise<{ lowStockAlerts: number; expiryAlerts: number; total: number }> => {
    const r = await api.post('/inventory/alerts/check-all');
    return r.data;
  },
};
