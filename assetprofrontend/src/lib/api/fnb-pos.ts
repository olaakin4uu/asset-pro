import { api } from '../api';

// ============================================================================
// TYPES — ENUMS
// ============================================================================

export type FnbOutletType = 'restaurant' | 'bar' | 'room_service' | 'cafe';

export const FNB_OUTLET_TYPES: FnbOutletType[] = ['restaurant', 'bar', 'room_service', 'cafe'];
export const FNB_OUTLET_TYPE_LABELS: Record<FnbOutletType, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  room_service: 'Room Service',
  cafe: 'Café',
};

export type FnbTableStatus = 'vacant' | 'occupied' | 'reserved' | 'dirty';

export const FNB_TABLE_STATUSES: FnbTableStatus[] = ['vacant', 'occupied', 'reserved', 'dirty'];
export const FNB_TABLE_STATUS_LABELS: Record<FnbTableStatus, string> = {
  vacant: 'Vacant',
  occupied: 'Occupied',
  reserved: 'Reserved',
  dirty: 'Dirty',
};

export type FnbOrderType = 'dine_in' | 'room_service' | 'takeaway' | 'bar';
export const FNB_ORDER_TYPES: FnbOrderType[] = ['dine_in', 'room_service', 'takeaway', 'bar'];
export const FNB_ORDER_TYPE_LABELS: Record<FnbOrderType, string> = {
  dine_in: 'Dine In',
  room_service: 'Room Service',
  takeaway: 'Takeaway',
  bar: 'Bar',
};

export type FnbOrderStatus =
  | 'open'
  | 'sent'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'settled'
  | 'voided';
export const FNB_ORDER_STATUSES: FnbOrderStatus[] = [
  'open',
  'sent',
  'preparing',
  'ready',
  'served',
  'settled',
  'voided',
];
export const FNB_ORDER_STATUS_LABELS: Record<FnbOrderStatus, string> = {
  open: 'Open',
  sent: 'Sent',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  settled: 'Settled',
  voided: 'Voided',
};

export type FnbOrderItemStatus =
  | 'pending'
  | 'sent_to_kitchen'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'voided';

export type FnbSettlementMethod = 'cash' | 'card' | 'room_charge' | 'transfer' | 'comp';
export const FNB_SETTLEMENT_METHODS: FnbSettlementMethod[] = [
  'cash',
  'card',
  'room_charge',
  'transfer',
  'comp',
];
export const FNB_SETTLEMENT_METHOD_LABELS: Record<FnbSettlementMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  room_charge: 'Room Charge',
  transfer: 'Bank Transfer',
  comp: 'Comp (Free)',
};

// ============================================================================
// TYPES — ENTITIES
// ============================================================================

export interface FnbOutlet {
  id: number;
  companyId: number;
  branchId: number;
  name: string;
  outletType: FnbOutletType;
  description: string | null;
  isActive: boolean;
  vatRate: number;
  serviceCharge: number;
  defaultPrinterId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FnbTable {
  id: number;
  companyId: number;
  outletId: number;
  outletName?: string;
  tableNumber: string;
  capacity: number;
  status: FnbTableStatus;
  zone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FnbMenuCategory {
  id: number;
  companyId: number;
  outletId: number | null;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FnbMenuItem {
  id: number;
  companyId: number;
  categoryId: number;
  categoryName?: string;
  inventoryItemId: number | null;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  preparationMins: number;
  imageUrl: string | null;
  isVegetarian: boolean;
  isHalal: boolean;
  spiceLevel: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FnbModifier {
  id: number;
  companyId: number;
  menuItemId: number;
  name: string;
  priceAdjust: number;
  isRequired: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FnbOrderItemModifier {
  id: number;
  orderItemId: number;
  modifierId: number;
  modifierName: string;
  priceAdjust: number;
}

export interface FnbOrderItem {
  id: number;
  orderId: number;
  menuItemId: number;
  menuItemName?: string;
  quantity: number;
  unitPrice: number;
  modifierAdjust: number;
  lineSubtotal: number;
  status: FnbOrderItemStatus;
  course: number;
  specialInstructions: string | null;
  voidReason: string | null;
  voidedById: number | null;
  voidedAt: string | null;
  sentToKitchenAt: string | null;
  servedAt: string | null;
  createdAt: string;
  updatedAt: string;
  modifiers: FnbOrderItemModifier[];
}

export interface FnbOrder {
  id: number;
  companyId: number;
  outletId: number;
  outletName?: string;
  tableId: number | null;
  tableNumber?: string | null;
  reservationId: number | null;
  reservationCode?: string | null;
  orderNumber: string;
  orderType: FnbOrderType;
  status: FnbOrderStatus;
  guestCount: number;
  subtotal: number;
  serviceCharge: number;
  vatAmount: number;
  discountAmount: number;
  total: number;
  settlementMethod: FnbSettlementMethod | null;
  settledAt: string | null;
  settledById: number | null;
  posSessionId: number | null;
  notes: string | null;
  serverId: number | null;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FnbOrderWithItems extends FnbOrder {
  items: FnbOrderItem[];
}

export interface FnbKitchenItem {
  id: number;
  orderId: number;
  orderNumber: string;
  tableNumber: string | null;
  reservationCode: string | null;
  menuItemId: number;
  menuItemName: string;
  quantity: number;
  course: number;
  specialInstructions: string | null;
  status: FnbOrderItemStatus;
  sentToKitchenAt: string | null;
  modifiers: { modifierName: string }[];
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

export interface CreateFnbOutletDto {
  branchId: number;
  name: string;
  outletType: FnbOutletType;
  description?: string;
  isActive?: boolean;
  vatRate?: number;
  serviceCharge?: number;
  defaultPrinterId?: string;
}

export interface UpdateFnbOutletDto {
  name?: string;
  outletType?: FnbOutletType;
  description?: string;
  isActive?: boolean;
  vatRate?: number;
  serviceCharge?: number;
  defaultPrinterId?: string;
}

export interface CreateFnbTableDto {
  outletId: number;
  tableNumber: string;
  capacity?: number;
  zone?: string;
  notes?: string;
}

export interface UpdateFnbTableDto {
  tableNumber?: string;
  capacity?: number;
  zone?: string;
  notes?: string;
}

export interface CreateFnbCategoryDto {
  outletId?: number;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateFnbCategoryDto {
  outletId?: number | null;
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateFnbMenuItemDto {
  categoryId: number;
  inventoryItemId?: number;
  name: string;
  description?: string;
  price: number;
  isAvailable?: boolean;
  preparationMins?: number;
  imageUrl?: string;
  isVegetarian?: boolean;
  isHalal?: boolean;
  spiceLevel?: number;
  sortOrder?: number;
}

export interface UpdateFnbMenuItemDto {
  categoryId?: number;
  inventoryItemId?: number | null;
  name?: string;
  description?: string;
  price?: number;
  isAvailable?: boolean;
  preparationMins?: number;
  imageUrl?: string;
  isVegetarian?: boolean;
  isHalal?: boolean;
  spiceLevel?: number;
  sortOrder?: number;
}

export interface CreateFnbModifierDto {
  menuItemId: number;
  name: string;
  priceAdjust?: number;
  isRequired?: boolean;
  sortOrder?: number;
}

export interface UpdateFnbModifierDto {
  name?: string;
  priceAdjust?: number;
  isRequired?: boolean;
  sortOrder?: number;
}

export interface CreateFnbOrderDto {
  outletId: number;
  orderType: FnbOrderType;
  tableId?: number;
  reservationId?: number;
  guestCount?: number;
  notes?: string;
}

export interface AddOrderItemModifierDto {
  modifierId: number;
}

export interface AddOrderItemDto {
  menuItemId: number;
  quantity?: number;
  course?: number;
  specialInstructions?: string;
  modifiers?: AddOrderItemModifierDto[];
}

export interface AddOrderItemsDto {
  items: AddOrderItemDto[];
}

export interface VoidOrderItemDto {
  reason: string;
}

export interface OrderItemIdsDto {
  itemIds: number[];
}

export interface ApplyDiscountDto {
  discountAmount?: number;
  discountPercent?: number;
  reason?: string;
}

export interface SettleOrderDto {
  method: FnbSettlementMethod;
  reservationId?: number;
  reference?: string;
  notes?: string;
}

export interface VoidOrderDto {
  reason: string;
}

// ============================================================================
// QUERY PARAM TYPES
// ============================================================================

export interface FnbOutletListQuery {
  branchId?: number;
  isActive?: boolean;
  outletType?: FnbOutletType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FnbTableListQuery {
  outletId?: number;
  status?: FnbTableStatus;
  zone?: string;
}

export interface FnbMenuItemListQuery {
  categoryId?: number;
  outletId?: number;
  isAvailable?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FnbOrderListQuery {
  outletId?: number;
  tableId?: number;
  reservationId?: number;
  status?: FnbOrderStatus;
  orderType?: FnbOrderType;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// API CLIENTS
// ============================================================================

export const fnbOutletsApi = {
  list: async (query?: FnbOutletListQuery): Promise<PaginatedResponse<FnbOutlet>> => {
    const response = await api.get('/fnb-pos/outlets', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<FnbOutlet> => {
    const response = await api.get(`/fnb-pos/outlets/${id}`);
    return response.data;
  },
  create: async (data: CreateFnbOutletDto): Promise<FnbOutlet> => {
    const response = await api.post('/fnb-pos/outlets', data);
    return response.data;
  },
  update: async (id: number, data: UpdateFnbOutletDto): Promise<FnbOutlet> => {
    const response = await api.patch(`/fnb-pos/outlets/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fnb-pos/outlets/${id}`);
  },
};

export const fnbTablesApi = {
  list: async (query?: FnbTableListQuery): Promise<FnbTable[]> => {
    const response = await api.get('/fnb-pos/tables', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<FnbTable> => {
    const response = await api.get(`/fnb-pos/tables/${id}`);
    return response.data;
  },
  create: async (data: CreateFnbTableDto): Promise<FnbTable> => {
    const response = await api.post('/fnb-pos/tables', data);
    return response.data;
  },
  update: async (id: number, data: UpdateFnbTableDto): Promise<FnbTable> => {
    const response = await api.patch(`/fnb-pos/tables/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: number, status: FnbTableStatus): Promise<FnbTable> => {
    const response = await api.patch(`/fnb-pos/tables/${id}/status`, { status });
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fnb-pos/tables/${id}`);
  },
};

export const fnbMenuApi = {
  // Categories
  listCategories: async (outletId?: number): Promise<FnbMenuCategory[]> => {
    const response = await api.get('/fnb-pos/menu/categories', {
      params: outletId ? { outletId } : undefined,
    });
    return response.data;
  },
  getCategory: async (id: number): Promise<FnbMenuCategory> => {
    const response = await api.get(`/fnb-pos/menu/categories/${id}`);
    return response.data;
  },
  createCategory: async (data: CreateFnbCategoryDto): Promise<FnbMenuCategory> => {
    const response = await api.post('/fnb-pos/menu/categories', data);
    return response.data;
  },
  updateCategory: async (id: number, data: UpdateFnbCategoryDto): Promise<FnbMenuCategory> => {
    const response = await api.patch(`/fnb-pos/menu/categories/${id}`, data);
    return response.data;
  },
  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/fnb-pos/menu/categories/${id}`);
  },

  // Items
  listItems: async (query?: FnbMenuItemListQuery): Promise<PaginatedResponse<FnbMenuItem>> => {
    const response = await api.get('/fnb-pos/menu/items', { params: query });
    return response.data;
  },
  getItem: async (id: number): Promise<FnbMenuItem> => {
    const response = await api.get(`/fnb-pos/menu/items/${id}`);
    return response.data;
  },
  createItem: async (data: CreateFnbMenuItemDto): Promise<FnbMenuItem> => {
    const response = await api.post('/fnb-pos/menu/items', data);
    return response.data;
  },
  updateItem: async (id: number, data: UpdateFnbMenuItemDto): Promise<FnbMenuItem> => {
    const response = await api.patch(`/fnb-pos/menu/items/${id}`, data);
    return response.data;
  },
  deleteItem: async (id: number): Promise<void> => {
    await api.delete(`/fnb-pos/menu/items/${id}`);
  },

  // Modifiers
  listModifiers: async (menuItemId: number): Promise<FnbModifier[]> => {
    const response = await api.get(`/fnb-pos/menu/items/${menuItemId}/modifiers`);
    return response.data;
  },
  createModifier: async (data: CreateFnbModifierDto): Promise<FnbModifier> => {
    const response = await api.post('/fnb-pos/menu/modifiers', data);
    return response.data;
  },
  updateModifier: async (id: number, data: UpdateFnbModifierDto): Promise<FnbModifier> => {
    const response = await api.patch(`/fnb-pos/menu/modifiers/${id}`, data);
    return response.data;
  },
  deleteModifier: async (id: number): Promise<void> => {
    await api.delete(`/fnb-pos/menu/modifiers/${id}`);
  },
};

export const fnbOrdersApi = {
  list: async (query?: FnbOrderListQuery): Promise<PaginatedResponse<FnbOrder>> => {
    const response = await api.get('/fnb-pos/orders', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<FnbOrderWithItems> => {
    const response = await api.get(`/fnb-pos/orders/${id}`);
    return response.data;
  },
  create: async (data: CreateFnbOrderDto): Promise<FnbOrderWithItems> => {
    const response = await api.post('/fnb-pos/orders', data);
    return response.data;
  },
  addItems: async (id: number, data: AddOrderItemsDto): Promise<FnbOrderWithItems> => {
    const response = await api.post(`/fnb-pos/orders/${id}/items`, data);
    return response.data;
  },
  voidItem: async (itemId: number, data: VoidOrderItemDto): Promise<FnbOrderWithItems> => {
    const response = await api.post(`/fnb-pos/order-items/${itemId}/void`, data);
    return response.data;
  },
  sendToKitchen: async (id: number): Promise<FnbOrderWithItems> => {
    const response = await api.post(`/fnb-pos/orders/${id}/send-to-kitchen`);
    return response.data;
  },
  markReady: async (data: OrderItemIdsDto): Promise<{ updated: number }> => {
    const response = await api.post('/fnb-pos/orders/mark-ready', data);
    return response.data;
  },
  markServed: async (data: OrderItemIdsDto): Promise<{ updated: number }> => {
    const response = await api.post('/fnb-pos/orders/mark-served', data);
    return response.data;
  },
  applyDiscount: async (id: number, data: ApplyDiscountDto): Promise<FnbOrderWithItems> => {
    const response = await api.post(`/fnb-pos/orders/${id}/discount`, data);
    return response.data;
  },
  settle: async (id: number, data: SettleOrderDto): Promise<FnbOrderWithItems> => {
    const response = await api.post(`/fnb-pos/orders/${id}/settle`, data);
    return response.data;
  },
  void: async (id: number, data: VoidOrderDto): Promise<FnbOrderWithItems> => {
    const response = await api.post(`/fnb-pos/orders/${id}/void`, data);
    return response.data;
  },
  kitchenQueue: async (outletId: number): Promise<FnbKitchenItem[]> => {
    const response = await api.get(`/fnb-pos/kitchen-queue/${outletId}`);
    return response.data;
  },
};
