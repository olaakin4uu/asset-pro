import { api } from '../api';

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface FleetQueryParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  vehicleId?: number;
  driverId?: number;
}

export interface ComplianceItem {
  id: number;
  docType: 'registration' | 'insurance' | 'roadworthiness' | 'license';
  expiryDate: string;
  daysUntilExpiry: number;
  urgency: 'expired' | 'critical' | 'warning' | 'upcoming';
}

export interface VehicleComplianceItem extends ComplianceItem {
  docType: 'registration' | 'insurance' | 'roadworthiness';
  registrationNumber: string;
  make: string;
  model: string;
}

export interface DriverComplianceItem extends ComplianceItem {
  docType: 'license';
  name: string;
  licenseNumber: string | null;
}

export interface ComplianceReport {
  summary: { expired: number; critical: number; warning: number; upcoming: number };
  vehicles: VehicleComplianceItem[];
  drivers: DriverComplianceItem[];
}

// ============================================================================
// VEHICLES API
// ============================================================================

export const vehiclesApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/vehicles', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/vehicles/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/fleet-management/vehicles', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`/fleet-management/vehicles/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/vehicles/${id}`);
  },

  updateStatus: async (id: number, status: string) => {
    const response = await api.patch(`/fleet-management/vehicles/${id}/status`, { status });
    return response.data;
  },

  updateOdometer: async (id: number, odometer: number) => {
    const response = await api.patch(`/fleet-management/vehicles/${id}/odometer`, { odometer });
    return response.data;
  },

  getSummary: async (companyId: number) => {
    const response = await api.get(`/fleet-management/vehicles/summary/${companyId}`);
    return response.data;
  },

  getCompliance: async (companyId: number): Promise<ComplianceReport> => {
    const response = await api.get(`/fleet-management/vehicles/compliance/${companyId}`);
    return response.data;
  },

  importVehicles: async (
    rows: Record<string, unknown>[],
    mode: 'skip' | 'update',
  ) => {
    const response = await api.post('/fleet-management/vehicles/import', { rows, mode });
    return response.data as { imported: number; updated: number; skipped: number; errors: { row: number; registrationNumber: string; message: string }[] };
  },

  // Active vehicles not on an IN_PROGRESS trip — for StartTripModal pickers.
  available: async (vehicleType?: string) => {
    const response = await api.get('/fleet-management/vehicles/available', {
      params: vehicleType ? { vehicleType } : undefined,
    });
    return response.data;
  },
};

// ============================================================================
// VEHICLE GROUPS API
// ============================================================================

export const vehicleGroupsApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/vehicle-groups', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/vehicle-groups/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/fleet-management/vehicle-groups', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`/fleet-management/vehicle-groups/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/vehicle-groups/${id}`);
  },
};

// ============================================================================
// GEOFENCES API
// ============================================================================

export const geofencesApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/geofences', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/geofences/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/fleet-management/geofences', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`/fleet-management/geofences/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/geofences/${id}`);
  },
};

// ============================================================================
// TYRES API
// ============================================================================

export const tyresApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/tyres', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/tyres/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/fleet-management/tyres', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`/fleet-management/tyres/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/tyres/${id}`);
  },
};

// ============================================================================
// TYRE ROTATIONS API
// ============================================================================

export const tyreRotationsApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/tyre-rotations', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/tyre-rotations/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/fleet-management/tyre-rotations', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`/fleet-management/tyre-rotations/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/tyre-rotations/${id}`);
  },

  getStats: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/tyre-rotations/stats', { params });
    return response.data;
  },
};

// ============================================================================
// TYRE INSPECTIONS API
// ============================================================================

export const tyreInspectionsApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/tyre-inspections', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/tyre-inspections/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/fleet-management/tyre-inspections', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`/fleet-management/tyre-inspections/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/tyre-inspections/${id}`);
  },

  getStats: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/tyre-inspections/stats', { params });
    return response.data;
  },
};

// ============================================================================
// VEHICLE MAINTENANCE API
// ============================================================================

export const vehicleMaintenanceApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/vehicle-maintenance', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/vehicle-maintenance/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/fleet-management/vehicle-maintenance', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`/fleet-management/vehicle-maintenance/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/vehicle-maintenance/${id}`);
  },

  // Lifecycle: SCHEDULED|OVERDUE → IN_PROGRESS → COMPLETED + CANCELLED
  start: async (id: number) => {
    const response = await api.patch(`/fleet-management/vehicle-maintenance/${id}/start`);
    return response.data;
  },

  complete: async (id: number, data?: { completionDate?: string; nextServiceDate?: string; nextServiceMileage?: number }) => {
    const response = await api.patch(`/fleet-management/vehicle-maintenance/${id}/complete`, data || {});
    return response.data;
  },

  cancel: async (id: number) => {
    const response = await api.patch(`/fleet-management/vehicle-maintenance/${id}/cancel`);
    return response.data;
  },
};

// ============================================================================
// MAINTENANCE PARTS API
// ============================================================================

export const maintenancePartsApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/maintenance-parts', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/maintenance-parts/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/fleet-management/maintenance-parts', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`/fleet-management/maintenance-parts/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/maintenance-parts/${id}`);
  },
};

// ============================================================================
// MAINTENANCE LABOR API
// ============================================================================

export const maintenanceLaborApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/maintenance-labor', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/maintenance-labor/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/fleet-management/maintenance-labor', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`/fleet-management/maintenance-labor/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/maintenance-labor/${id}`);
  },
};

// ============================================================================
// FUEL RECORD TYPES
// ============================================================================

export type FuelType = 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID' | 'CNG' | 'LPG';

export interface FuelRecord {
  id: number;
  companyId: number;
  vehicleId: number;
  driverId?: number;
  tripId?: number;
  fuelDate: string;
  fuelTime?: string;
  fuelType: FuelType;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalCost: number;
  mileageAtFueling: number;
  previousMileage?: number;
  distanceTraveled?: number;
  fuelEfficiency?: number;
  isFillUp: boolean;
  fuelStation?: string;
  fuelStationLocation?: string;
  receiptNumber?: string;
  paymentMethod?: string;
  fuelCardNumber?: string;
  latitude?: number;
  longitude?: number;
  receiptImage?: string;
  notes?: string;
  verifiedBy?: number;
  verifiedAt?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  vehicle?: {
    id: number;
    registrationNumber: string;
    make?: string;
    model?: string;
  };
  driver?: {
    id: number;
    name: string;
  };
}

export interface CreateFuelRecordDto {
  vehicleId: number;
  driverId?: number;
  tripId?: number;
  fuelDate: string;
  fuelTime?: string;
  fuelType?: FuelType;
  quantity: number;
  unit?: string;
  pricePerUnit: number;
  mileageAtFueling: number;
  previousMileage?: number;
  isFillUp?: boolean;
  fuelStation?: string;
  fuelStationLocation?: string;
  receiptNumber?: string;
  paymentMethod?: string;
  fuelCardNumber?: string;
  notes?: string;
}

export interface UpdateFuelRecordDto {
  vehicleId?: number;
  driverId?: number;
  tripId?: number;
  fuelDate?: string;
  fuelTime?: string;
  fuelType?: FuelType;
  quantity?: number;
  unit?: string;
  pricePerUnit?: number;
  mileageAtFueling?: number;
  previousMileage?: number;
  isFillUp?: boolean;
  fuelStation?: string;
  fuelStationLocation?: string;
  receiptNumber?: string;
  paymentMethod?: string;
  fuelCardNumber?: string;
  notes?: string;
}

export interface FuelRecordQueryParams extends FleetQueryParams {
  vehicleId?: number;
  fuelType?: FuelType;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// FUEL RECORDS API
// ============================================================================

export const fuelRecordsApi = {
  list: async (params?: FuelRecordQueryParams) => {
    const response = await api.get('/fleet-management/fuel-records', { params });
    return response.data;
  },

  get: async (id: number): Promise<FuelRecord> => {
    const response = await api.get(`/fleet-management/fuel-records/${id}`);
    return response.data;
  },

  create: async (data: CreateFuelRecordDto): Promise<FuelRecord> => {
    const response = await api.post('/fleet-management/fuel-records', data);
    return response.data;
  },

  update: async (id: number, data: UpdateFuelRecordDto): Promise<FuelRecord> => {
    const response = await api.patch(`/fleet-management/fuel-records/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/fuel-records/${id}`);
  },

  // Verification — idempotent, returns the row whether or not the call mutated it.
  verify: async (id: number): Promise<FuelRecord> => {
    const response = await api.patch(`/fleet-management/fuel-records/${id}/verify`);
    return response.data;
  },

  unverify: async (id: number): Promise<FuelRecord> => {
    const response = await api.patch(`/fleet-management/fuel-records/${id}/unverify`);
    return response.data;
  },

  uploadReceipt: async (id: number, file: File): Promise<FuelRecord> => {
    const form = new FormData();
    form.append('file', file);
    const response = await api.patch(`/fleet-management/fuel-records/${id}/receipt`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getVehicleHistory: async (id: number): Promise<FuelRecord[]> => {
    const response = await api.get(`/fleet-management/fuel-records/${id}/vehicle-history`);
    return response.data;
  },
};

// ============================================================================
// VEHICLE BOOKINGS API
// ============================================================================

export const vehicleBookingsApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/vehicle-bookings', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/vehicle-bookings/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/fleet-management/vehicle-bookings', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`/fleet-management/vehicle-bookings/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/vehicle-bookings/${id}`);
  },

  // Lifecycle: PENDING → APPROVED → IN_PROGRESS → COMPLETED + REJECTED + CANCELLED
  approve: async (id: number) => {
    const response = await api.patch(`/fleet-management/vehicle-bookings/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, reason: string) => {
    const response = await api.patch(`/fleet-management/vehicle-bookings/${id}/reject`, { reason });
    return response.data;
  },

  cancel: async (id: number, reason?: string) => {
    const response = await api.patch(`/fleet-management/vehicle-bookings/${id}/cancel`, { reason });
    return response.data;
  },

  startTrip: async (
    id: number,
    data?: { vehicleId?: number; driverId?: number; tripType?: string; startOdometer?: number; notes?: string },
  ) => {
    const response = await api.post(`/fleet-management/vehicle-bookings/${id}/start-trip`, data || {});
    return response.data;
  },

  // Pricing + invoicing surface — proforma is an estimate (no GL impact),
  // final is the real invoice generated after the trip closes.
  listInvoices: async (id: number) => {
    const response = await api.get(`/fleet-management/vehicle-bookings/${id}/invoices`);
    return response.data as Array<{
      id: number;
      invoiceNumber: string;
      invoiceType: string;
      status: string;
      invoiceDate: string;
      subtotal: number | string;
      taxAmount: number | string;
      totalAmount: number | string;
      balanceAmount: number | string;
      paymentStatus: string;
    }>;
  },

  generateProforma: async (id: number, force = false) => {
    const response = await api.post(`/fleet-management/vehicle-bookings/${id}/proforma`, { force });
    return response.data;
  },

  generateInvoice: async (id: number, force = false) => {
    const response = await api.post(`/fleet-management/vehicle-bookings/${id}/invoice`, { force });
    return response.data;
  },
};

// ============================================================================
// VEHICLE / SERVICE TYPES API (replaces localStorage catalogue)
// ============================================================================

export interface VehicleServiceType {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  defaultFlatRate: number | string | null;
  defaultHourlyRate: number | string | null;
  defaultDailyRate: number | string | null;
  defaultKmRate: number | string | null;
  defaultChargeModel: 'FLAT' | 'HOURLY' | 'DAILY' | 'PER_KM' | null;
  revenueGlAccountId: number | null;
  revenueGlAccountCode?: string | null;
  revenueGlAccountName?: string | null;
}

export const vehicleServiceTypesApi = {
  list: async (includeInactive = false): Promise<VehicleServiceType[]> => {
    const response = await api.get('/fleet-management/vehicle-service-types', {
      params: includeInactive ? { includeInactive: 'true' } : undefined,
    });
    return response.data;
  },

  get: async (id: number): Promise<VehicleServiceType> => {
    const response = await api.get(`/fleet-management/vehicle-service-types/${id}`);
    return response.data;
  },

  create: async (data: Partial<VehicleServiceType> & { name: string }): Promise<VehicleServiceType> => {
    const response = await api.post('/fleet-management/vehicle-service-types', data);
    return response.data;
  },

  update: async (id: number, data: Partial<VehicleServiceType>): Promise<VehicleServiceType> => {
    const response = await api.patch(`/fleet-management/vehicle-service-types/${id}`, data);
    return response.data;
  },

  remove: async (id: number) => {
    await api.delete(`/fleet-management/vehicle-service-types/${id}`);
  },
};

// ============================================================================
// FLEET TAX CONFIGS API
// ============================================================================

export interface FleetTaxConfig {
  id: number;
  companyId: number;
  name: string;
  taxType: string;
  rate: number | string;
  glAccountId: number | null;
  glAccountCode?: string | null;
  glAccountName?: string | null;
  isDefault: boolean;
  isActive: boolean;
  description: string | null;
}

export const fleetTaxConfigsApi = {
  list: async (includeInactive = false): Promise<FleetTaxConfig[]> => {
    const response = await api.get('/fleet-management/tax-configs', {
      params: includeInactive ? { includeInactive: 'true' } : undefined,
    });
    return response.data;
  },

  listDefaults: async (): Promise<FleetTaxConfig[]> => {
    const response = await api.get('/fleet-management/tax-configs/defaults');
    return response.data;
  },

  get: async (id: number): Promise<FleetTaxConfig> => {
    const response = await api.get(`/fleet-management/tax-configs/${id}`);
    return response.data;
  },

  create: async (data: Partial<FleetTaxConfig> & { name: string; rate: number }): Promise<FleetTaxConfig> => {
    const response = await api.post('/fleet-management/tax-configs', data);
    return response.data;
  },

  update: async (id: number, data: Partial<FleetTaxConfig>): Promise<FleetTaxConfig> => {
    const response = await api.patch(`/fleet-management/tax-configs/${id}`, data);
    return response.data;
  },

  remove: async (id: number) => {
    await api.delete(`/fleet-management/tax-configs/${id}`);
  },
};

// ============================================================================
// VEHICLE INSPECTIONS API
// ============================================================================

export const vehicleInspectionsApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/vehicle-inspections', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/vehicle-inspections/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/fleet-management/vehicle-inspections', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`/fleet-management/vehicle-inspections/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/vehicle-inspections/${id}`);
  },

  approve: async (id: number, data?: { supervisorNotes?: string }) => {
    const response = await api.patch(`/fleet-management/vehicle-inspections/${id}/approve`, data || {});
    return response.data;
  },

  reject: async (id: number, data: { supervisorNotes: string }) => {
    const response = await api.patch(`/fleet-management/vehicle-inspections/${id}/reject`, data);
    return response.data;
  },
};

// ============================================================================
// VEHICLE INCIDENTS API
// ============================================================================

export const vehicleIncidentsApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/vehicle-incidents', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/vehicle-incidents/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/fleet-management/vehicle-incidents', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`/fleet-management/vehicle-incidents/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/vehicle-incidents/${id}`);
  },

  startInvestigation: async (id: number, data?: { notes?: string }) => {
    const response = await api.patch(
      `/fleet-management/vehicle-incidents/${id}/start-investigation`,
      data || {},
    );
    return response.data;
  },

  fileInsuranceClaim: async (id: number, data?: { notes?: string }) => {
    const response = await api.patch(
      `/fleet-management/vehicle-incidents/${id}/file-insurance-claim`,
      data || {},
    );
    return response.data;
  },

  markUnderRepair: async (id: number) => {
    const response = await api.patch(
      `/fleet-management/vehicle-incidents/${id}/mark-under-repair`,
      {},
    );
    return response.data;
  },

  resolve: async (
    id: number,
    data?: { notes?: string; lessonsLearned?: string; preventiveMeasures?: string },
  ) => {
    const response = await api.patch(
      `/fleet-management/vehicle-incidents/${id}/resolve`,
      data || {},
    );
    return response.data;
  },

  close: async (id: number) => {
    const response = await api.patch(`/fleet-management/vehicle-incidents/${id}/close`, {});
    return response.data;
  },
};

// ============================================================================
// TRIP TYPES
// ============================================================================

export type TripType = 'OFFICIAL' | 'PERSONAL' | 'DELIVERY' | 'PICKUP' | 'TRANSFER' | 'SERVICE';
export type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DELAYED';

export interface Trip {
  id: number;
  companyId: number;
  vehicleId: number;
  driverId?: number;
  driverName?: string;
  tripType: TripType;
  purpose: string;
  description?: string;
  startLocation: string;
  endLocation: string;
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  startOdometer?: number;
  endOdometer?: number;
  distance?: number;
  fuelUsed?: number;
  fuelCost?: number;
  tollCost?: number;
  parkingCost?: number;
  otherCosts?: number;
  driverAllowance?: number;
  miscExpenses?: number;
  totalCost?: number;
  status: TripStatus;
  completionNotes?: string;
  cargo?: string;
  driverRating?: number;
  createdBy: number;
  createdAt: string;
  updatedBy?: number;
  updatedAt?: string;
  vehicle?: Record<string, unknown>;
}

export interface CreateTripDto {
  companyId: number;
  vehicleId: number;
  driverId?: number;
  driverName?: string;
  tripType: TripType;
  purpose: string;
  description?: string;
  startLocation: string;
  endLocation: string;
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  startOdometer?: number;
  driverAllowance?: number;
  miscExpenses?: number;
  cargo?: string;
}

export interface UpdateTripDto {
  vehicleId?: number;
  driverId?: number;
  driverName?: string;
  tripType?: TripType;
  purpose?: string;
  description?: string;
  startLocation?: string;
  endLocation?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  startOdometer?: number;
  endOdometer?: number;
  fuelUsed?: number;
  fuelCost?: number;
  tollCost?: number;
  parkingCost?: number;
  otherCosts?: number;
  driverAllowance?: number;
  miscExpenses?: number;
  totalCost?: number;
  completionNotes?: string;
  cargo?: string;
  driverRating?: number;
}

export interface TripSummary {
  totalTrips: number;
  scheduledTrips: number;
  inProgressTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalCost: number;
  totalDistance: number;
  byType: { type: TripType; count: number }[];
}

// ============================================================================
// DRIVER TYPES
// ============================================================================

export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Driver {
  id: number;
  companyId: number;
  name: string;
  employeeId?: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  status: DriverStatus;
  dateOfBirth?: string;
  hireDate?: string;
  terminationDate?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedBy?: number;
  updatedAt?: string;
}

export interface CreateDriverDto {
  companyId: number;
  name: string;
  employeeId?: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  hireDate?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export interface UpdateDriverDto {
  name?: string;
  employeeId?: string;
  licenseNumber?: string;
  licenseType?: string;
  licenseExpiry?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  status?: DriverStatus;
  dateOfBirth?: string;
  hireDate?: string;
  terminationDate?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export interface DriverSummary {
  totalDrivers: number;
  activeDrivers: number;
  inactiveDrivers: number;
  suspendedDrivers: number;
  expiringLicenses: {
    driverId: number;
    name: string;
    licenseNumber: string;
    expiryDate: string;
    daysUntilExpiry: number;
  }[];
}

// ============================================================================
// TRIPS API
// ============================================================================

export const tripsApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/trips', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/trips/${id}`);
    return response.data;
  },

  create: async (data: CreateTripDto) => {
    const response = await api.post('/fleet-management/trips', data);
    return response.data;
  },

  update: async (id: number, data: UpdateTripDto) => {
    const response = await api.patch(`/fleet-management/trips/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/trips/${id}`);
  },

  start: async (id: number) => {
    const response = await api.patch(`/fleet-management/trips/${id}/start`);
    return response.data;
  },

  complete: async (id: number, data?: {
    endOdometer?: number;
    completionNotes?: string;
    driverRating?: number;
    fuelUsed?: number;
    fuelCost?: number;
    tollCost?: number;
    parkingCost?: number;
    otherCosts?: number;
    driverAllowance?: number;
    miscExpenses?: number;
  }) => {
    const response = await api.patch(`/fleet-management/trips/${id}/complete`, data || {});
    return response.data;
  },

  cancel: async (id: number) => {
    const response = await api.patch(`/fleet-management/trips/${id}/cancel`);
    return response.data;
  },

  getSummary: async (companyId: number) => {
    const response = await api.get(`/fleet-management/trips/summary/${companyId}`);
    return response.data;
  },
};

// ============================================================================
// DRIVERS API
// ============================================================================

export const driversApi = {
  list: async (params?: FleetQueryParams) => {
    const response = await api.get('/fleet-management/drivers', { params });
    return response.data;
  },

  get: async (id: number) => {
    const response = await api.get(`/fleet-management/drivers/${id}`);
    return response.data;
  },

  create: async (data: CreateDriverDto) => {
    const response = await api.post('/fleet-management/drivers', data);
    return response.data;
  },

  update: async (id: number, data: UpdateDriverDto) => {
    const response = await api.patch(`/fleet-management/drivers/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/fleet-management/drivers/${id}`);
  },

  updateStatus: async (id: number, status: DriverStatus) => {
    const response = await api.patch(`/fleet-management/drivers/${id}/status`, { status });
    return response.data;
  },

  // Active drivers not currently on an IN_PROGRESS trip.
  available: async () => {
    const response = await api.get('/fleet-management/drivers/available');
    return response.data;
  },

  getSummary: async (companyId: number) => {
    const response = await api.get(`/fleet-management/drivers/summary/${companyId}`);
    return response.data;
  },
};

// ============================================================================
// VEHICLE COST ENTRY TYPES
// ============================================================================

export type VehicleCostTypeFE =
  | 'MAINTENANCE'
  | 'INSURANCE'
  | 'LICENSING'
  | 'ROADWORTHINESS'
  | 'DEPRECIATION'
  | 'TRACKER_SUBSCRIPTION'
  | 'TYRE'
  | 'OVERHAUL'
  | 'PERMIT'
  | 'OTHER';

export type VehicleCostEntrySourceFE =
  | 'MANUAL'
  | 'JOURNAL_ENTRY'
  | 'MAINTENANCE_RECORD'
  | 'DEPRECIATION_POSTING';

export interface VehicleCostEntry {
  id: number;
  companyId: number;
  vehicleId: number;
  costType: VehicleCostTypeFE;
  amount: number;
  costDate: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  source: VehicleCostEntrySourceFE;
  sourceId?: number | null;
  reference?: string | null;
  notes?: string | null;
  createdBy?: number | null;
  createdAt: string;
  updatedBy?: number | null;
  updatedAt: string;
  vehicleRegNumber?: string;
  vehicleName?: string;
}

export interface CreateVehicleCostEntryDto {
  vehicleId: number;
  costType: VehicleCostTypeFE;
  amount: number;
  costDate: string;
  periodStart?: string;
  periodEnd?: string;
  source?: VehicleCostEntrySourceFE;
  sourceId?: number;
  reference?: string;
  notes?: string;
}

export interface UpdateVehicleCostEntryDto {
  costType?: VehicleCostTypeFE;
  amount?: number;
  costDate?: string;
  periodStart?: string;
  periodEnd?: string;
  source?: VehicleCostEntrySourceFE;
  sourceId?: number;
  reference?: string;
  notes?: string;
}

export interface VehicleCostEntryQueryParams {
  vehicleId?: number;
  costType?: VehicleCostTypeFE;
  from?: string;
  to?: string;
  search?: string;
}

// ============================================================================
// VEHICLE COST ENTRIES API
// ============================================================================

export const vehicleCostEntriesApi = {
  list: async (params?: VehicleCostEntryQueryParams): Promise<VehicleCostEntry[]> => {
    const response = await api.get('/fleet-management/vehicle-cost-entries', { params });
    return response.data;
  },
  get: async (id: number): Promise<VehicleCostEntry> => {
    const response = await api.get(`/fleet-management/vehicle-cost-entries/${id}`);
    return response.data;
  },
  create: async (data: CreateVehicleCostEntryDto): Promise<VehicleCostEntry> => {
    const response = await api.post('/fleet-management/vehicle-cost-entries', data);
    return response.data;
  },
  update: async (id: number, data: UpdateVehicleCostEntryDto): Promise<VehicleCostEntry> => {
    const response = await api.patch(`/fleet-management/vehicle-cost-entries/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/fleet-management/vehicle-cost-entries/${id}`);
  },
};

// ============================================================================
// FLEET COST REPORT TYPES
// ============================================================================

export interface TripCostReportRow {
  tripId: number;
  tripNumber: string;
  tripDate: string;
  vehicleId: number;
  vehicleRegNumber: string;
  vehicleMakeModel: string;
  driverId: number | null;
  driverName: string | null;
  tripType: string;
  status: string;
  distance: number | string;
  fuelCost: number | string;
  tollCost: number | string;
  parkingCost: number | string;
  driverAllowance: number | string;
  miscExpenses: number | string;
  otherCosts: number | string;
  totalCost: number | string;
  costPerKm: number | string | null;
}

export interface TripCostReportTotals {
  trips: number;
  distance: number | string;
  fuelCost: number | string;
  tollCost: number | string;
  parkingCost: number | string;
  driverAllowance: number | string;
  miscExpenses: number | string;
  otherCosts: number | string;
  totalCost: number | string;
  costPerKm: number | string | null;
}

export interface TripCostReportResponse {
  rows: TripCostReportRow[];
  totals: TripCostReportTotals;
}

export interface VehicleCostReportRow {
  vehicleId: number;
  regNumber: string;
  makeModel: string;
  trips: number;
  totalDistance: number | string;
  tripFuel: number | string;
  tripTolls: number | string;
  tripParking: number | string;
  tripDriverAllowance: number | string;
  tripMiscExpenses: number | string;
  tripOther: number | string;
  tripDirectTotal: number | string;
  maintenance: number | string;
  insurance: number | string;
  licensing: number | string;
  depreciation: number | string;
  trackerSubscription: number | string;
  tyre: number | string;
  otherEntries: number | string;
  vehicleEntriesTotal: number | string;
  totalCost: number | string;
  costPerKm: number | string | null;
}

export interface VehicleCostReportTotals {
  vehicles: number;
  trips: number;
  totalDistance: number | string;
  tripFuel: number | string;
  tripTolls: number | string;
  tripParking: number | string;
  tripDriverAllowance: number | string;
  tripMiscExpenses: number | string;
  tripOther: number | string;
  tripDirectTotal: number | string;
  maintenance: number | string;
  insurance: number | string;
  licensing: number | string;
  depreciation: number | string;
  trackerSubscription: number | string;
  tyre: number | string;
  otherEntries: number | string;
  vehicleEntriesTotal: number | string;
  totalCost: number | string;
  costPerKm: number | string | null;
}

export interface VehicleCostReportResponse {
  rows: VehicleCostReportRow[];
  totals: VehicleCostReportTotals;
}

// ============================================================================
// FLEET COST REPORTS API
// ============================================================================

export const fleetCostReportsApi = {
  tripCosts: async (params: {
    from: string;
    to: string;
    vehicleId?: number;
    driverId?: number;
    tripType?: string;
  }): Promise<TripCostReportResponse> => {
    const response = await api.get('/fleet-management/reports/trip-costs', { params });
    return response.data;
  },
  vehicleCosts: async (params: {
    from: string;
    to: string;
    vehicleId?: number;
  }): Promise<VehicleCostReportResponse> => {
    const response = await api.get('/fleet-management/reports/vehicle-costs', { params });
    return response.data;
  },
};

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const fleetManagementApi = {
  vehicles: vehiclesApi,
  vehicleGroups: vehicleGroupsApi,
  geofences: geofencesApi,
  tyres: tyresApi,
  tyreRotations: tyreRotationsApi,
  tyreInspections: tyreInspectionsApi,
  vehicleMaintenance: vehicleMaintenanceApi,
  maintenanceParts: maintenancePartsApi,
  maintenanceLabor: maintenanceLaborApi,
  fuelRecords: fuelRecordsApi,
  vehicleBookings: vehicleBookingsApi,
  vehicleInspections: vehicleInspectionsApi,
  vehicleIncidents: vehicleIncidentsApi,
  trips: tripsApi,
  drivers: driversApi,
  vehicleCostEntries: vehicleCostEntriesApi,
  costReports: fleetCostReportsApi,
  vehicleServiceTypes: vehicleServiceTypesApi,
};
