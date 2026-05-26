import { api } from '../api';

const BASE = '/hotel';

// ============================================================================
// TYPES
// ============================================================================

export type RoomStatus =
  | 'vacant_clean'
  | 'vacant_dirty'
  | 'occupied'
  | 'reserved'
  | 'maintenance'
  | 'out_of_order';

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  vacant_clean: 'Vacant — Clean',
  vacant_dirty: 'Vacant — Dirty',
  occupied: 'Occupied',
  reserved: 'Reserved',
  maintenance: 'Maintenance',
  out_of_order: 'Out of Order',
};

export const ROOM_STATUS_COLORS: Record<RoomStatus, string> = {
  vacant_clean: 'bg-green-100 text-green-800 border-green-200',
  vacant_dirty: 'bg-orange-100 text-orange-800 border-orange-200',
  occupied: 'bg-blue-100 text-blue-800 border-blue-200',
  reserved: 'bg-purple-100 text-purple-800 border-purple-200',
  maintenance: 'bg-amber-100 text-amber-800 border-amber-200',
  out_of_order: 'bg-red-100 text-red-800 border-red-200',
};

export type ReservationStatus =
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show';

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export type ReservationSource =
  | 'walk_in'
  | 'direct'
  | 'website'
  | 'booking_com'
  | 'expedia'
  | 'jumia'
  | 'corporate'
  | 'phone'
  | 'other';

export interface HotelRoomType {
  id: number;
  companyId: number;
  branchId: number;
  code: string;
  name: string;
  description: string | null;
  baseRate: number;
  maxOccupancy: number;
  bedConfig: string | null;
  amenities: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HotelRoom {
  id: number;
  companyId: number;
  branchId: number;
  roomTypeId: number;
  roomNumber: string;
  floor: string | null;
  view: string | null;
  status: RoomStatus;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HotelRoomWithType extends HotelRoom {
  typeCode: string;
  typeName: string;
  baseRate: number;
  maxOccupancy: number;
  guestName: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
}

export interface HotelReservation {
  id: number;
  companyId: number;
  branchId: number;
  customerId: number;
  reservationCode: string;
  status: ReservationStatus;
  source: ReservationSource;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  adults: number;
  children: number;
  roomTypeId: number | null;
  roomId: number | null;
  ratePerNight: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  balanceAmount: number;
  cautionDepositAmount: number;
  cautionRefundedAmount: number;
  cautionReleaseReason: string | null;
  kycVerificationId: number | null;
  specialRequests: string | null;
  internalNotes: string | null;
  blacklistFlag: boolean;
  flagReason: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  customerName?: string;
  customerPhone?: string;
  roomTypeCode?: string;
  roomTypeName?: string;
  roomNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotelBranchSettings {
  id: number;
  companyId: number;
  branchId: number;
  consumptionTaxRate: number;
  taxLabel: string;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  defaultCautionAmount: number;
  invoiceFooterNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertBranchSettingsDto {
  branchId: number;
  consumptionTaxRate?: number;
  taxLabel?: string;
  defaultCheckInTime?: string;
  defaultCheckOutTime?: string;
  defaultCautionAmount?: number;
  invoiceFooterNote?: string;
}

export type HotelPaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'pos' | 'other';

export const HOTEL_PAYMENT_METHOD_LABELS: Record<HotelPaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  pos: 'POS Terminal',
  other: 'Other',
};

export interface HotelReservationPayment {
  id: number;
  companyId: number;
  reservationId: number;
  posSessionId: number | null;
  amount: number;
  paymentMethod: HotelPaymentMethod;
  bankAccountId: number | null;
  referenceNumber: string | null;
  description: string | null;
  paidAt: string;
  voidedAt: string | null;
  voidedById: number | null;
  voidReason: string | null;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
  bankName?: string;
  posSessionNumber?: string;
}

export interface RecordReservationPaymentDto {
  amount: number;
  paymentMethod: HotelPaymentMethod;
  bankAccountId?: number;
  referenceNumber?: string;
  description?: string;
  paidAt?: string;
}

export interface VoidReservationPaymentDto {
  voidReason: string;
}

export interface HotelNightAuditRun {
  id: number;
  companyId: number;
  branchId: number;
  runDate: string;
  totalRooms: number;
  vacantRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  dirtyRooms: number;
  oooRooms: number;
  arrivalsExpected: number;
  arrivalsCompleted: number;
  noShowsMarked: number;
  occupancyRate: number;
  revenue: number;
  notes: string | null;
  createdAt: string;
}

export interface NightAuditOutcome {
  branchId: number;
  totalRooms: number;
  vacantRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  dirtyRooms: number;
  oooRooms: number;
  arrivalsExpected: number;
  arrivalsCompleted: number;
  noShowsMarked: number;
  occupancyRate: number;
  revenue: number;
}

export interface NightAuditListQuery {
  branchId?: number;
  from?: string;
  to?: string;
  skip?: number;
  take?: number;
}

export interface CreateRoomTypeDto {
  branchId: number;
  code: string;
  name: string;
  description?: string;
  baseRate: number;
  maxOccupancy?: number;
  bedConfig?: string;
  amenities?: string[];
}

export interface UpdateRoomTypeDto {
  name?: string;
  description?: string;
  baseRate?: number;
  maxOccupancy?: number;
  bedConfig?: string;
  amenities?: string[];
  isActive?: boolean;
}

export interface CreateRoomDto {
  branchId: number;
  roomTypeId: number;
  roomNumber: string;
  floor?: string;
  view?: string;
  notes?: string;
}

export interface UpdateRoomStatusDto {
  status: RoomStatus;
  reason?: string;
}

export interface CreateReservationDto {
  branchId: number;
  customerId: number;
  roomTypeId?: number;
  roomId?: number;
  arrivalDate: string;
  departureDate: string;
  adults?: number;
  children?: number;
  ratePerNight: number;
  depositAmount?: number;
  cautionDepositAmount?: number;
  source?: ReservationSource;
  kycVerificationId?: number;
  specialRequests?: string;
  internalNotes?: string;
}

export interface CheckInDto {
  roomId?: number;
}

export interface CancelReservationDto {
  cancellationReason?: string;
}

export interface CheckOutDto {
  cautionRefundedAmount?: number;
  cautionReleaseReason?: string;
  roomStatusAfter?: RoomStatus;
}

export interface ReservationListQuery {
  branchId?: number;
  status?: string;
  customerId?: number;
  from?: string;
  to?: string;
  skip?: number;
  take?: number;
}

// ============================================================================
// ROOM TYPES API
// ============================================================================

export const hotelRoomTypesApi = {
  list: async (branchId?: number): Promise<{ data: HotelRoomType[]; total: number }> => {
    const response = await api.get(`${BASE}/room-types`, {
      params: branchId ? { branchId } : undefined,
    });
    return response.data;
  },

  get: async (id: number): Promise<HotelRoomType> => {
    const response = await api.get(`${BASE}/room-types/${id}`);
    return response.data;
  },

  create: async (data: CreateRoomTypeDto): Promise<HotelRoomType> => {
    const response = await api.post(`${BASE}/room-types`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateRoomTypeDto): Promise<HotelRoomType> => {
    const response = await api.patch(`${BASE}/room-types/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/room-types/${id}`);
  },
};

// ============================================================================
// ROOMS API
// ============================================================================

export const hotelRoomsApi = {
  list: async (params?: { branchId?: number; status?: string }): Promise<{ data: HotelRoomWithType[]; total: number }> => {
    const response = await api.get(`${BASE}/rooms`, { params });
    return response.data;
  },

  get: async (id: number): Promise<HotelRoom> => {
    const response = await api.get(`${BASE}/rooms/${id}`);
    return response.data;
  },

  create: async (data: CreateRoomDto): Promise<HotelRoom> => {
    const response = await api.post(`${BASE}/rooms`, data);
    return response.data;
  },

  updateStatus: async (id: number, data: UpdateRoomStatusDto): Promise<HotelRoom> => {
    const response = await api.patch(`${BASE}/rooms/${id}/status`, data);
    return response.data;
  },
};

// ============================================================================
// RESERVATIONS API
// ============================================================================

export const hotelReservationsApi = {
  list: async (query?: ReservationListQuery): Promise<{ data: HotelReservation[]; total: number }> => {
    const response = await api.get(`${BASE}/reservations`, { params: query });
    return response.data;
  },

  get: async (id: number): Promise<HotelReservation> => {
    const response = await api.get(`${BASE}/reservations/${id}`);
    return response.data;
  },

  create: async (data: CreateReservationDto): Promise<HotelReservation> => {
    const response = await api.post(`${BASE}/reservations`, data);
    return response.data;
  },

  checkIn: async (id: number, data: CheckInDto): Promise<HotelReservation> => {
    const response = await api.post(`${BASE}/reservations/${id}/check-in`, data);
    return response.data;
  },

  cancel: async (id: number, data: CancelReservationDto): Promise<HotelReservation> => {
    const response = await api.post(`${BASE}/reservations/${id}/cancel`, data);
    return response.data;
  },

  checkOut: async (id: number, data: CheckOutDto): Promise<HotelReservation> => {
    const response = await api.post(`${BASE}/reservations/${id}/check-out`, data);
    return response.data;
  },
};

// ============================================================================
// PAYMENTS API
// ============================================================================

export const hotelPaymentsApi = {
  list: async (
    reservationId: number,
  ): Promise<{ data: HotelReservationPayment[]; total: number }> => {
    const response = await api.get(`${BASE}/reservations/${reservationId}/payments`);
    return response.data;
  },

  record: async (
    reservationId: number,
    data: RecordReservationPaymentDto,
  ): Promise<{ payment: HotelReservationPayment; reservation: HotelReservation }> => {
    const response = await api.post(
      `${BASE}/reservations/${reservationId}/payments`,
      data,
    );
    return response.data;
  },

  void: async (
    paymentId: number,
    data: VoidReservationPaymentDto,
  ): Promise<HotelReservationPayment> => {
    const response = await api.post(`${BASE}/payments/${paymentId}/void`, data);
    return response.data;
  },
};

// ============================================================================
// NIGHT AUDIT API
// ============================================================================

export const hotelNightAuditApi = {
  list: async (
    query?: NightAuditListQuery,
  ): Promise<{ data: HotelNightAuditRun[]; total: number }> => {
    const response = await api.get(`${BASE}/night-audit`, { params: query });
    return response.data;
  },

  latest: async (branchId: number): Promise<HotelNightAuditRun | null> => {
    const response = await api.get(`${BASE}/night-audit/${branchId}/latest`);
    return response.data;
  },

  run: async (data: {
    runDate?: string;
    branchId?: number;
  }): Promise<{ data: NightAuditOutcome[]; total: number }> => {
    const response = await api.post(`${BASE}/night-audit/run`, data);
    return response.data;
  },
};

// ============================================================================
// SETTINGS API
// ============================================================================

export const hotelSettingsApi = {
  list: async (): Promise<{ data: HotelBranchSettings[]; total: number }> => {
    const response = await api.get(`${BASE}/settings`);
    return response.data;
  },

  get: async (branchId: number): Promise<HotelBranchSettings> => {
    const response = await api.get(`${BASE}/settings/${branchId}`);
    return response.data;
  },

  upsert: async (data: UpsertBranchSettingsDto): Promise<HotelBranchSettings> => {
    const response = await api.post(`${BASE}/settings`, data);
    return response.data;
  },
};
