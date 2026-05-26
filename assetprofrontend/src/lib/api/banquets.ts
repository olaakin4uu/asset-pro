import { api } from '../api';

// ============================================================================
// ENUMS
// ============================================================================

export type BqBookingStatus =
  | 'inquiry'
  | 'quoted'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export const BQ_BOOKING_STATUSES: BqBookingStatus[] = [
  'inquiry',
  'quoted',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
];

export const BQ_BOOKING_STATUS_LABELS: Record<BqBookingStatus, string> = {
  inquiry: 'Inquiry',
  quoted: 'Quoted',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export type BqPaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'cheque';
export const BQ_PAYMENT_METHODS: BqPaymentMethod[] = ['cash', 'bank_transfer', 'card', 'cheque'];
export const BQ_PAYMENT_METHOD_LABELS: Record<BqPaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  cheque: 'Cheque',
};

export type BqPaymentType = 'deposit' | 'partial' | 'final' | 'refund';
export const BQ_PAYMENT_TYPES: BqPaymentType[] = ['deposit', 'partial', 'final', 'refund'];
export const BQ_PAYMENT_TYPE_LABELS: Record<BqPaymentType, string> = {
  deposit: 'Deposit',
  partial: 'Partial',
  final: 'Final',
  refund: 'Refund',
};

export type BqCateringCategory = 'starter' | 'main' | 'dessert' | 'drinks' | 'other';
export const BQ_CATERING_CATEGORIES: BqCateringCategory[] = [
  'starter',
  'main',
  'dessert',
  'drinks',
  'other',
];
export const BQ_CATERING_CATEGORY_LABELS: Record<BqCateringCategory, string> = {
  starter: 'Starter',
  main: 'Main',
  dessert: 'Dessert',
  drinks: 'Drinks',
  other: 'Other',
};

// ============================================================================
// ENTITIES
// ============================================================================

export interface BqVenue {
  id: number;
  companyId: number;
  branchId: number;
  name: string;
  description: string | null;
  capacityMin: number;
  capacityMax: number;
  squareMetres: number | null;
  hasStage: boolean;
  hasAv: boolean;
  hasParking: boolean;
  baseHourlyRate: number;
  baseDailyRate: number | null;
  imageUrl: string | null;
  amenities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BqEventType {
  id: number;
  companyId: number;
  name: string;
  description: string | null;
  defaultDurationHours: number;
  packageNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BqPackage {
  id: number;
  companyId: number;
  name: string;
  description: string | null;
  perPersonPrice: number;
  flatPrice: number;
  inclusions: string[];
  minGuests: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BqEventCatering {
  id: number;
  bookingId: number;
  fnbItemId: number | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  category: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BqEventAddon {
  id: number;
  bookingId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  vendorName: string | null;
  vendorPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BqEventPayment {
  id: number;
  companyId: number;
  bookingId: number;
  paymentDate: string;
  amount: number;
  paymentMethod: BqPaymentMethod;
  paymentReference: string | null;
  paymentType: BqPaymentType;
  notes: string | null;
  receivedById: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BqEventBooking {
  id: number;
  companyId: number;
  branchId: number;
  bookingNumber: string;
  eventTypeId: number;
  packageId: number | null;
  venueId: number;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  reservationId: number | null;
  eventTitle: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  expectedGuests: number;
  actualGuests: number | null;
  setupRequirements: string | null;
  specialRequests: string | null;
  status: BqBookingStatus;
  venueRate: number;
  cateringTotal: number;
  addonTotal: number;
  subtotal: number;
  vatAmount: number;
  serviceCharge: number;
  discountAmount: number;
  total: number;
  depositRequired: number;
  depositPaid: number;
  balanceDue: number;
  inquiriedAt: string;
  quotedAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  completedAt: string | null;
  notes: string | null;
  bookedById: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  venueName?: string;
  eventTypeName?: string;
}

export interface BqEventBookingWithDetails extends BqEventBooking {
  packageName?: string | null;
  catering: BqEventCatering[];
  addons: BqEventAddon[];
  payments: BqEventPayment[];
}

export interface BqVenueAvailabilityResult {
  available: boolean;
  conflicts: {
    bookingId: number;
    bookingNumber: string;
    eventTitle: string;
    startTime: string;
    endTime: string;
    status: string;
  }[];
}

export interface BqBookingCalendarItem {
  id: number;
  bookingNumber: string;
  eventTitle: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  status: BqBookingStatus;
  venueId: number;
  venueName: string;
  customerName: string;
  expectedGuests: number;
  total: number;
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

export interface CreateBqVenueDto {
  branchId?: number;
  name: string;
  description?: string;
  capacityMin?: number;
  capacityMax?: number;
  squareMetres?: number;
  hasStage?: boolean;
  hasAv?: boolean;
  hasParking?: boolean;
  baseHourlyRate: number;
  baseDailyRate?: number;
  imageUrl?: string;
  amenities?: string[];
  isActive?: boolean;
}

export interface UpdateBqVenueDto {
  name?: string;
  description?: string;
  capacityMin?: number;
  capacityMax?: number;
  squareMetres?: number;
  hasStage?: boolean;
  hasAv?: boolean;
  hasParking?: boolean;
  baseHourlyRate?: number;
  baseDailyRate?: number;
  imageUrl?: string;
  amenities?: string[];
  isActive?: boolean;
}

export interface CreateBqEventTypeDto {
  name: string;
  description?: string;
  defaultDurationHours?: number;
  packageNotes?: string;
  isActive?: boolean;
}

export interface UpdateBqEventTypeDto {
  name?: string;
  description?: string;
  defaultDurationHours?: number;
  packageNotes?: string;
  isActive?: boolean;
}

export interface CreateBqPackageDto {
  name: string;
  description?: string;
  perPersonPrice: number;
  flatPrice?: number;
  inclusions?: string[];
  minGuests?: number;
  isActive?: boolean;
}

export interface UpdateBqPackageDto {
  name?: string;
  description?: string;
  perPersonPrice?: number;
  flatPrice?: number;
  inclusions?: string[];
  minGuests?: number;
  isActive?: boolean;
}

export interface CreateBqEventBookingDto {
  branchId?: number;
  eventTypeId: number;
  packageId?: number;
  venueId: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  reservationId?: number;
  eventTitle: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  expectedGuests: number;
  setupRequirements?: string;
  specialRequests?: string;
  venueRate?: number;
  vatRate?: number;
  serviceChargeRate?: number;
  depositRequired?: number;
  notes?: string;
}

export interface UpdateBqEventBookingDto {
  eventTypeId?: number;
  packageId?: number;
  venueId?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  reservationId?: number;
  eventTitle?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  expectedGuests?: number;
  setupRequirements?: string;
  specialRequests?: string;
  venueRate?: number;
  depositRequired?: number;
  notes?: string;
}

export interface AddCateringItemDto {
  fnbItemId?: number;
  name: string;
  quantity: number;
  unitPrice: number;
  category?: BqCateringCategory;
  notes?: string;
}

export interface AddAddonDto {
  name: string;
  quantity?: number;
  unitPrice: number;
  vendorName?: string;
  vendorPhone?: string;
  notes?: string;
}

export interface RecordPaymentDto {
  paymentDate: string;
  amount: number;
  paymentMethod: BqPaymentMethod;
  paymentReference?: string;
  paymentType: BqPaymentType;
  notes?: string;
}

export interface VoidPaymentDto {
  reason: string;
}

export interface ApplyBookingDiscountDto {
  discountAmount?: number;
  discountPercent?: number;
  reason?: string;
}

export interface SetVatAndServiceChargeDto {
  vatRate?: number;
  serviceChargeRate?: number;
}

export interface ConfirmBookingDto {
  overrideDeposit?: boolean;
}

export interface CompleteBookingDto {
  actualGuests: number;
}

export interface CancelBookingDto {
  reason: string;
}

// ============================================================================
// QUERY PARAM TYPES
// ============================================================================

export interface BqVenueListQuery {
  branchId?: number;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BqEventTypeListQuery {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BqPackageListQuery {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BqBookingListQuery {
  status?: BqBookingStatus;
  venueId?: number;
  branchId?: number;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BqBookingCalendarQuery {
  from: string;
  to: string;
  venueId?: number;
}

// ============================================================================
// API CLIENTS
// ============================================================================

export const bqVenuesApi = {
  list: async (query?: BqVenueListQuery): Promise<PaginatedResponse<BqVenue>> => {
    const response = await api.get('/banquets/venues', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<BqVenue> => {
    const response = await api.get(`/banquets/venues/${id}`);
    return response.data;
  },
  create: async (data: CreateBqVenueDto): Promise<BqVenue> => {
    const response = await api.post('/banquets/venues', data);
    return response.data;
  },
  update: async (id: number, data: UpdateBqVenueDto): Promise<BqVenue> => {
    const response = await api.patch(`/banquets/venues/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/banquets/venues/${id}`);
  },
  checkAvailability: async (
    id: number,
    eventDate: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: number,
  ): Promise<BqVenueAvailabilityResult> => {
    const response = await api.get(`/banquets/venues/${id}/availability`, {
      params: { eventDate, startTime, endTime, excludeBookingId },
    });
    return response.data;
  },
};

export const bqEventTypesApi = {
  list: async (query?: BqEventTypeListQuery): Promise<PaginatedResponse<BqEventType>> => {
    const response = await api.get('/banquets/event-types', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<BqEventType> => {
    const response = await api.get(`/banquets/event-types/${id}`);
    return response.data;
  },
  create: async (data: CreateBqEventTypeDto): Promise<BqEventType> => {
    const response = await api.post('/banquets/event-types', data);
    return response.data;
  },
  update: async (id: number, data: UpdateBqEventTypeDto): Promise<BqEventType> => {
    const response = await api.patch(`/banquets/event-types/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/banquets/event-types/${id}`);
  },
};

export const bqPackagesApi = {
  list: async (query?: BqPackageListQuery): Promise<PaginatedResponse<BqPackage>> => {
    const response = await api.get('/banquets/packages', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<BqPackage> => {
    const response = await api.get(`/banquets/packages/${id}`);
    return response.data;
  },
  create: async (data: CreateBqPackageDto): Promise<BqPackage> => {
    const response = await api.post('/banquets/packages', data);
    return response.data;
  },
  update: async (id: number, data: UpdateBqPackageDto): Promise<BqPackage> => {
    const response = await api.patch(`/banquets/packages/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/banquets/packages/${id}`);
  },
};

export const bqBookingsApi = {
  list: async (query?: BqBookingListQuery): Promise<PaginatedResponse<BqEventBooking>> => {
    const response = await api.get('/banquets/bookings', { params: query });
    return response.data;
  },
  get: async (id: number): Promise<BqEventBookingWithDetails> => {
    const response = await api.get(`/banquets/bookings/${id}`);
    return response.data;
  },
  calendar: async (query: BqBookingCalendarQuery): Promise<BqBookingCalendarItem[]> => {
    const response = await api.get('/banquets/bookings/calendar', { params: query });
    return response.data;
  },
  create: async (data: CreateBqEventBookingDto): Promise<BqEventBookingWithDetails> => {
    const response = await api.post('/banquets/bookings', data);
    return response.data;
  },
  update: async (
    id: number,
    data: UpdateBqEventBookingDto,
  ): Promise<BqEventBookingWithDetails> => {
    const response = await api.patch(`/banquets/bookings/${id}`, data);
    return response.data;
  },
  // Catering
  addCatering: async (
    id: number,
    data: AddCateringItemDto,
  ): Promise<BqEventBookingWithDetails> => {
    const response = await api.post(`/banquets/bookings/${id}/catering`, data);
    return response.data;
  },
  removeCatering: async (itemId: number): Promise<BqEventBookingWithDetails> => {
    const response = await api.delete(`/banquets/bookings/catering/${itemId}`);
    return response.data;
  },
  // Addons
  addAddon: async (id: number, data: AddAddonDto): Promise<BqEventBookingWithDetails> => {
    const response = await api.post(`/banquets/bookings/${id}/addons`, data);
    return response.data;
  },
  removeAddon: async (itemId: number): Promise<BqEventBookingWithDetails> => {
    const response = await api.delete(`/banquets/bookings/addons/${itemId}`);
    return response.data;
  },
  // Discount + tax
  applyDiscount: async (
    id: number,
    data: ApplyBookingDiscountDto,
  ): Promise<BqEventBookingWithDetails> => {
    const response = await api.post(`/banquets/bookings/${id}/discount`, data);
    return response.data;
  },
  setTax: async (
    id: number,
    data: SetVatAndServiceChargeDto,
  ): Promise<BqEventBookingWithDetails> => {
    const response = await api.post(`/banquets/bookings/${id}/tax`, data);
    return response.data;
  },
  // Payments
  recordPayment: async (
    id: number,
    data: RecordPaymentDto,
  ): Promise<BqEventBookingWithDetails> => {
    const response = await api.post(`/banquets/bookings/${id}/payments`, data);
    return response.data;
  },
  voidPayment: async (
    paymentId: number,
    data: VoidPaymentDto,
  ): Promise<BqEventBookingWithDetails> => {
    const response = await api.post(`/banquets/bookings/payments/${paymentId}/void`, data);
    return response.data;
  },
  // Lifecycle
  quote: async (id: number): Promise<BqEventBookingWithDetails> => {
    const response = await api.post(`/banquets/bookings/${id}/quote`);
    return response.data;
  },
  confirm: async (
    id: number,
    data: ConfirmBookingDto,
  ): Promise<BqEventBookingWithDetails> => {
    const response = await api.post(`/banquets/bookings/${id}/confirm`, data);
    return response.data;
  },
  markInProgress: async (id: number): Promise<BqEventBookingWithDetails> => {
    const response = await api.post(`/banquets/bookings/${id}/in-progress`);
    return response.data;
  },
  complete: async (
    id: number,
    data: CompleteBookingDto,
  ): Promise<BqEventBookingWithDetails> => {
    const response = await api.post(`/banquets/bookings/${id}/complete`, data);
    return response.data;
  },
  cancel: async (
    id: number,
    data: CancelBookingDto,
  ): Promise<BqEventBookingWithDetails> => {
    const response = await api.post(`/banquets/bookings/${id}/cancel`, data);
    return response.data;
  },
};

export const BQ_BOOKING_STATUS_BADGE_CLASS: Record<BqBookingStatus, string> = {
  inquiry: 'bg-gray-100 text-gray-700',
  quoted: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};
