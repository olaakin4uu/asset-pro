import { api } from '../api';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum RePropertyType { RESIDENTIAL = 'RESIDENTIAL', COMMERCIAL = 'COMMERCIAL', MIXED = 'MIXED', INDUSTRIAL = 'INDUSTRIAL' }
export enum RePropertyStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE' }
export enum ReUnitType { APARTMENT = 'APARTMENT', STUDIO = 'STUDIO', DUPLEX = 'DUPLEX', OFFICE = 'OFFICE', SHOP = 'SHOP', WAREHOUSE = 'WAREHOUSE', LAND = 'LAND', OTHER = 'OTHER' }
export enum ReUnitStatus { VACANT = 'VACANT', OCCUPIED = 'OCCUPIED', UNDER_MAINTENANCE = 'UNDER_MAINTENANCE', RESERVED = 'RESERVED' }
export enum ReLeaseType { FIXED_TERM = 'FIXED_TERM', PERIODIC = 'PERIODIC', SUBLEASE = 'SUBLEASE' }
export enum ReTenancyFrequency { WEEKLY = 'WEEKLY', MONTHLY = 'MONTHLY', QUARTERLY = 'QUARTERLY', YEARLY = 'YEARLY' }
export enum ReLeaseStatus { DRAFT = 'DRAFT', PENDING_APPROVAL = 'PENDING_APPROVAL', ACTIVE = 'ACTIVE', EXPIRED = 'EXPIRED', TERMINATED = 'TERMINATED', RENEWED = 'RENEWED' }
export enum ReLeaseChargeType { RENT = 'RENT', SERVICE_CHARGE = 'SERVICE_CHARGE', GROUND_RENT = 'GROUND_RENT', PARKING = 'PARKING', OTHER = 'OTHER' }
export enum ReLeaseChargeFrequency { MONTHLY = 'MONTHLY', QUARTERLY = 'QUARTERLY', YEARLY = 'YEARLY', ONE_OFF = 'ONE_OFF' }
export enum ReDepositStatus { HELD = 'HELD', RELEASED = 'RELEASED', FORFEITED = 'FORFEITED', PARTIALLY_FORFEITED = 'PARTIALLY_FORFEITED' }
export enum ReNigerianState { LAGOS = 'LAGOS', FCT = 'FCT', RIVERS = 'RIVERS', KANO = 'KANO', OGUN = 'OGUN', OYO = 'OYO', KWARA = 'KWARA', ANAMBRA = 'ANAMBRA', ENUGU = 'ENUGU', DELTA = 'DELTA', OTHER = 'OTHER' }

// ─── Entity Interfaces ────────────────────────────────────────────────────────

export interface ReProperty {
  id: number; companyId: number; code: string; name: string;
  propertyType: RePropertyType; address: string | null; city: string | null;
  state: ReNigerianState; lga: string | null;
  landRegistryRef: string | null; coONumber: string | null; rightOfOccupancyRef: string | null;
  totalUnits: number; landAreaSqm: string | null;
  glRevenueAccountId: number | null; glDepositLiabilityAccountId: number | null; glMaintenanceExpenseAccountId: number | null;
  managerId: number | null; managerName: string | null;
  status: RePropertyStatus; notes: string | null;
  vacantUnits: number; occupiedUnits: number;
  createdAt: string; updatedAt: string;
}

export interface ReUnit {
  id: number; companyId: number; propertyId: number; propertyName: string | null; propertyCode: string | null;
  unitNumber: string; floor: string | null; unitType: ReUnitType;
  areaSqm: string | null; bedroomCount: number | null; bathroomCount: number | null;
  furnished: boolean; marketRent: string | null; currency: string;
  status: ReUnitStatus; glRevenueAccountId: number | null; notes: string | null;
  amenities: Array<{ id: number; name: string; icon: string | null }>;
  createdAt: string; updatedAt: string;
}

export interface ReLease {
  id: number; companyId: number; leaseCode: string;
  unitId: number; unitNumber: string | null; propertyName: string | null; propertyCode: string | null;
  customerId: number; customerName: string | null; customerCode: string | null;
  leaseType: ReLeaseType; tenancyFrequency: ReTenancyFrequency;
  startDate: string; endDate: string | null;
  rentAmount: string; rentCurrency: string; rentCurrencyRate: string; rentDueDayOfMonth: number;
  advanceMonthsCollected: number; advanceAmountCollected: string | null;
  serviceCharge: string | null; serviceChargeCurrency: string;
  noticePeriodDays: number; stampDutyAmount: string;
  nigerianState: ReNigerianState | null;
  status: ReLeaseStatus;
  terminationDate: string | null; terminationReason: string | null; terminationNoticedAt: string | null;
  notes: string | null;
  charges: ReLeaseCharge[];
  createdAt: string; updatedAt: string;
}

export interface ReLeaseCharge {
  id: number; leaseId: number; chargeType: ReLeaseChargeType;
  description: string; amount: string; currency: string; exchangeRate: string;
  frequency: ReLeaseChargeFrequency; startDate: string; endDate: string | null;
  glRevenueAccountId: number | null; isActive: boolean;
}

export interface ReSecurityDeposit {
  id: number; companyId: number; leaseId: number;
  unitNumber: string | null; propertyName: string | null; tenantName: string | null;
  depositAmount: string; currency: string; exchangeRate: string; depositAmountNgn: string;
  interestRate: string | null; accruedInterest: string | null;
  status: ReDepositStatus;
  receivedDate: string; returnDueDate: string | null; releaseDate: string | null;
  releaseAmount: string | null; forfeitureAmount: string | null; forfeitureReason: string | null;
  receiptReference: string | null; notes: string | null;
  createdAt: string; updatedAt: string;
}

export interface RePropertyStats {
  totalProperties: string; totalUnits: string; vacantUnits: string; occupiedUnits: string;
}

export interface ReLeaseStats {
  draft: string; active: string; expired: string; terminated: string; expiringSoon: string;
}

export interface ReDepositStats {
  held: string; released: string; forfeited: string; totalHeldNgn: string; overdueCount: string;
}

// ─── Paginated Response ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]; total: number; page: number; limit: number; totalPages: number;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreatePropertyDto {
  code?: string; name: string; propertyType?: RePropertyType;
  address?: string; city?: string; state?: ReNigerianState; lga?: string;
  landRegistryRef?: string; coONumber?: string; rightOfOccupancyRef?: string;
  landAreaSqm?: number; glRevenueAccountId?: number;
  glDepositLiabilityAccountId?: number; glMaintenanceExpenseAccountId?: number;
  managerId?: number; notes?: string;
}

export interface UpdatePropertyDto extends Partial<Omit<CreatePropertyDto, 'code'>> {
  status?: RePropertyStatus;
}

export interface CreateUnitDto {
  propertyId: number; unitNumber: string; floor?: string; unitType?: ReUnitType;
  areaSqm?: number; bedroomCount?: number; bathroomCount?: number;
  furnished?: boolean; marketRent?: number; currency?: string;
  glRevenueAccountId?: number; notes?: string; amenityIds?: number[];
}

export interface UpdateUnitDto extends Partial<Omit<CreateUnitDto, 'propertyId'>> {
  status?: ReUnitStatus;
}

export interface LeaseChargeDto {
  chargeType: ReLeaseChargeType; description: string; amount: number;
  currency?: string; exchangeRate?: number; frequency: ReLeaseChargeFrequency;
  startDate: string; endDate?: string; glRevenueAccountId?: number;
}

export interface CreateLeaseDto {
  unitId: number; customerId: number; leaseType?: ReLeaseType;
  tenancyFrequency: ReTenancyFrequency; startDate: string; endDate?: string;
  rentAmount: number; rentCurrency?: string; rentCurrencyRate?: number;
  rentDueDayOfMonth?: number; advanceMonthsCollected?: number; advanceAmountCollected?: number;
  serviceCharge?: number; serviceChargeCurrency?: string;
  nigerianState?: ReNigerianState; charges?: LeaseChargeDto[]; notes?: string;
}

export interface UpdateLeaseDto {
  endDate?: string; rentAmount?: number; rentCurrencyRate?: number;
  rentDueDayOfMonth?: number; serviceCharge?: number;
  nigerianState?: ReNigerianState; notes?: string;
}

export interface TerminateLeaseDto {
  terminationDate: string; terminationReason: string;
}

export interface CreateSecurityDepositDto {
  leaseId: number; depositAmount: number; currency?: string; exchangeRate?: number;
  receivedDate: string; interestRate?: number; glLiabilityAccountId?: number;
  receiptReference?: string; notes?: string;
}

export interface ReleaseDepositDto {
  releaseDate: string; releaseAmount: number; forfeitureAmount?: number;
  forfeitureReason?: string; notes?: string;
}

// ─── Query Interfaces ─────────────────────────────────────────────────────────

export interface PropertyQueryDto {
  page?: number; limit?: number; search?: string;
  propertyType?: RePropertyType; status?: RePropertyStatus; state?: ReNigerianState;
}

export interface UnitQueryDto {
  page?: number; limit?: number; propertyId?: number;
  unitType?: ReUnitType; status?: ReUnitStatus; search?: string;
}

export interface LeaseQueryDto {
  page?: number; limit?: number; search?: string; status?: ReLeaseStatus;
  propertyId?: number; unitId?: number; customerId?: number; expiringWithinDays?: number;
}

export interface DepositQueryDto {
  page?: number; limit?: number; status?: ReDepositStatus; leaseId?: number; overduOnly?: boolean;
}

// ─── API Objects ──────────────────────────────────────────────────────────────

export const rePropertiesApi = {
  list: (params: PropertyQueryDto = {}): Promise<PaginatedResponse<ReProperty>> =>
    api.get('/real-estate/properties', { params }).then((r) => r.data),
  get: (id: number): Promise<ReProperty> =>
    api.get(`/real-estate/properties/${id}`).then((r) => r.data),
  create: (dto: CreatePropertyDto): Promise<ReProperty> =>
    api.post('/real-estate/properties', dto).then((r) => r.data),
  update: (id: number, dto: UpdatePropertyDto): Promise<ReProperty> =>
    api.put(`/real-estate/properties/${id}`, dto).then((r) => r.data),
  delete: (id: number): Promise<void> =>
    api.delete(`/real-estate/properties/${id}`).then((r) => r.data),
  stats: (): Promise<RePropertyStats> =>
    api.get('/real-estate/properties/stats').then((r) => r.data),
};

export const reUnitsApi = {
  list: (params: UnitQueryDto = {}): Promise<PaginatedResponse<ReUnit>> =>
    api.get('/real-estate/units', { params }).then((r) => r.data),
  get: (id: number): Promise<ReUnit> =>
    api.get(`/real-estate/units/${id}`).then((r) => r.data),
  byProperty: (propertyId: number): Promise<ReUnit[]> =>
    api.get(`/real-estate/units/by-property/${propertyId}`).then((r) => r.data),
  create: (dto: CreateUnitDto): Promise<ReUnit> =>
    api.post('/real-estate/units', dto).then((r) => r.data),
  update: (id: number, dto: UpdateUnitDto): Promise<ReUnit> =>
    api.put(`/real-estate/units/${id}`, dto).then((r) => r.data),
  delete: (id: number): Promise<void> =>
    api.delete(`/real-estate/units/${id}`).then((r) => r.data),
};

export const reLeasesApi = {
  list: (params: LeaseQueryDto = {}): Promise<PaginatedResponse<ReLease>> =>
    api.get('/real-estate/leases', { params }).then((r) => r.data),
  get: (id: number): Promise<ReLease> =>
    api.get(`/real-estate/leases/${id}`).then((r) => r.data),
  create: (dto: CreateLeaseDto): Promise<ReLease> =>
    api.post('/real-estate/leases', dto).then((r) => r.data),
  update: (id: number, dto: UpdateLeaseDto): Promise<ReLease> =>
    api.put(`/real-estate/leases/${id}`, dto).then((r) => r.data),
  activate: (id: number): Promise<ReLease> =>
    api.post(`/real-estate/leases/${id}/activate`).then((r) => r.data),
  serveNotice: (id: number): Promise<ReLease> =>
    api.post(`/real-estate/leases/${id}/serve-notice`).then((r) => r.data),
  terminate: (id: number, dto: TerminateLeaseDto): Promise<ReLease> =>
    api.post(`/real-estate/leases/${id}/terminate`, dto).then((r) => r.data),
  delete: (id: number): Promise<void> =>
    api.delete(`/real-estate/leases/${id}`).then((r) => r.data),
  stats: (): Promise<ReLeaseStats> =>
    api.get('/real-estate/leases/stats').then((r) => r.data),
};

export const reDepositsApi = {
  list: (params: DepositQueryDto = {}): Promise<PaginatedResponse<ReSecurityDeposit>> =>
    api.get('/real-estate/deposits', { params }).then((r) => r.data),
  get: (id: number): Promise<ReSecurityDeposit> =>
    api.get(`/real-estate/deposits/${id}`).then((r) => r.data),
  create: (dto: CreateSecurityDepositDto): Promise<ReSecurityDeposit> =>
    api.post('/real-estate/deposits', dto).then((r) => r.data),
  release: (id: number, dto: ReleaseDepositDto): Promise<ReSecurityDeposit> =>
    api.post(`/real-estate/deposits/${id}/release`, dto).then((r) => r.data),
  stats: (): Promise<ReDepositStats> =>
    api.get('/real-estate/deposits/stats').then((r) => r.data),
};
