import { api } from '../api';
import type {
  PaginatedResponse,
  VetClient,
  CreateVetClientDto,
  UpdateVetClientDto,
  VetClientListQuery,
  VetAnimal,
  CreateVetAnimalDto,
  UpdateVetAnimalDto,
  VetAnimalWeightHistory,
  CreateVetAnimalWeightDto,
  VetAnimalVaccination,
  CreateVetAnimalVaccinationDto,
  VetAnimalAttachment,
  VetAppointment,
  CreateVetAppointmentDto,
  UpdateVetAppointmentDto,
  VetAppointmentListQuery,
  RescheduleVetAppointmentDto,
  CancelVetAppointmentDto,
  VetAppointmentCalendarEntry,
  VetVisit,
  CreateVetWalkInVisitDto,
  VetVisitListQuery,
  VetTriageRecord,
  CreateVetTriageRecordDto,
  VetSoapNote,
  CreateVetSoapNoteDto,
  VetSoapTemplate,
  CreateVetSoapTemplateDto,
  UpdateVetSoapTemplateDto,
  VetSoapTemplateListQuery,
  VetDiagnosisCode,
  CreateVetDiagnosisCodeDto,
  VetDiagnosisCodeListQuery,
  VetPrescription,
  CreateVetPrescriptionDto,
  VetDispensingRecord,
  CreateVetDispensingRecordDto,
  VetFormulary,
  CreateVetFormularyDto,
  UpdateVetFormularyDto,
  VetFormularyListQuery,
  VetLabOrder,
  CreateVetLabOrderDto,
  UpdateVetLabOrderStatusDto,
  VetLabResult,
  EnterVetLabResultsDto,
  VetLabReferenceRange,
  CreateVetLabReferenceRangeDto,
  VetLabReferenceRangeListQuery,
  VetProcedure,
  CreateVetProcedureDto,
  UpdateVetProcedureDto,
  UpdateVetSurgeryChecklistDto,
  VetAnesthesiaRecord,
  UpdateVetAnesthesiaRecordDto,
  CreateVetProcedureConsumableDto,
  VetPriceList,
  CreateVetPriceListDto,
  UpdateVetPriceListDto,
  VetPriceListListQuery,
  VetPriceListItem,
  CreateVetPriceListItemDto,
  VetSettings,
  UpdateVetSettingsDto,
  VetDashboardStats,
  VetAppointmentTodayEntry,
  VetRevenueSummary,
  VetStockAlert,
  VetSpecies,
  CreateVetSpeciesDto,
  VetBreed,
  CreateVetBreedDto,
} from '@/types/veterinary';

const BASE = '/veterinary';

// ============================================================================
// CLIENTS API
// ============================================================================

export const vetClientsApi = {
  list: async (query?: VetClientListQuery): Promise<PaginatedResponse<VetClient>> => {
    const response = await api.get(`${BASE}/clients`, { params: query });
    return response.data;
  },

  get: async (id: number): Promise<VetClient> => {
    const response = await api.get(`${BASE}/clients/${id}`);
    return response.data;
  },

  create: async (data: CreateVetClientDto): Promise<VetClient> => {
    const response = await api.post(`${BASE}/clients`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateVetClientDto): Promise<VetClient> => {
    const response = await api.patch(`${BASE}/clients/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/clients/${id}`);
  },

  /**
   * Idempotently create + link a Customer for this vet client. Used by the
   * Billing tab when the linkage is missing (e.g., AR account was added
   * after the client was created).
   */
  ensureCustomerLink: async (id: number): Promise<{ customerId: number | null }> => {
    const response = await api.post(`${BASE}/clients/${id}/ensure-customer-link`);
    return response.data;
  },
};

// ============================================================================
// ANIMALS API
// ============================================================================

export interface VetAnimalListRow {
  id: number;
  name: string;
  sex: string | null;
  isActive: boolean;
  dateOfBirth: string | null;
  speciesId: number;
  breedId: number | null;
  clientId: number;
  speciesName: string | null;
  breedName: string | null;
  clientName: string;
  clientPhone: string | null;
}

export const vetAnimalsApi = {
  list: async (params?: { search?: string; skip?: number; take?: number }): Promise<{ data: VetAnimalListRow[]; total: number }> => {
    const response = await api.get(`${BASE}/animals`, { params });
    return response.data;
  },

  create: async (data: CreateVetAnimalDto): Promise<VetAnimal> => {
    const response = await api.post(`${BASE}/animals`, data);
    return response.data;
  },

  get: async (id: number): Promise<VetAnimal> => {
    const response = await api.get(`${BASE}/animals/${id}`);
    return response.data;
  },

  update: async (id: number, data: UpdateVetAnimalDto): Promise<VetAnimal> => {
    const response = await api.patch(`${BASE}/animals/${id}`, data);
    return response.data;
  },

  getWeightHistory: async (id: number): Promise<VetAnimalWeightHistory[]> => {
    const response = await api.get(`${BASE}/animals/${id}/weight-history`);
    return response.data;
  },

  addWeight: async (id: number, data: CreateVetAnimalWeightDto): Promise<VetAnimalWeightHistory> => {
    const response = await api.post(`${BASE}/animals/${id}/weight-history`, data);
    return response.data;
  },

  getVaccinations: async (id: number): Promise<VetAnimalVaccination[]> => {
    const response = await api.get(`${BASE}/animals/${id}/vaccinations`);
    return response.data;
  },

  addVaccination: async (id: number, data: CreateVetAnimalVaccinationDto): Promise<VetAnimalVaccination> => {
    const response = await api.post(`${BASE}/animals/${id}/vaccinations`, data);
    return response.data;
  },

  getAttachments: async (id: number): Promise<VetAnimalAttachment[]> => {
    const response = await api.get(`${BASE}/animals/${id}/attachments`);
    return response.data;
  },

  uploadAttachment: async (id: number, file: File, description?: string): Promise<VetAnimalAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }
    const response = await api.post(`${BASE}/animals/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// ============================================================================
// APPOINTMENTS API
// ============================================================================

export const vetAppointmentsApi = {
  list: async (query?: VetAppointmentListQuery): Promise<PaginatedResponse<VetAppointment>> => {
    const response = await api.get(`${BASE}/appointments`, { params: query });
    return response.data;
  },

  get: async (id: number): Promise<VetAppointment> => {
    const response = await api.get(`${BASE}/appointments/${id}`);
    return response.data;
  },

  create: async (data: CreateVetAppointmentDto): Promise<VetAppointment> => {
    const response = await api.post(`${BASE}/appointments`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateVetAppointmentDto): Promise<VetAppointment> => {
    const response = await api.patch(`${BASE}/appointments/${id}`, data);
    return response.data;
  },

  checkIn: async (id: number): Promise<VetAppointment> => {
    const response = await api.post(`${BASE}/appointments/${id}/check-in`);
    return response.data;
  },

  cancel: async (id: number, data?: CancelVetAppointmentDto): Promise<VetAppointment> => {
    const response = await api.post(`${BASE}/appointments/${id}/cancel`, data);
    return response.data;
  },

  reschedule: async (id: number, data: RescheduleVetAppointmentDto): Promise<VetAppointment> => {
    const response = await api.post(`${BASE}/appointments/${id}/reschedule`, data);
    return response.data;
  },

  getCalendar: async (
    providerId: number,
    startDate: string,
    endDate: string,
  ): Promise<VetAppointmentCalendarEntry[]> => {
    const response = await api.get(`${BASE}/appointments/calendar`, {
      params: { providerId, startDate, endDate },
    });
    return response.data;
  },
};

// ============================================================================
// VISITS API
// ============================================================================

export const vetVisitsApi = {
  list: async (query?: VetVisitListQuery): Promise<PaginatedResponse<VetVisit>> => {
    const response = await api.get(`${BASE}/visits`, { params: query });
    return response.data;
  },

  get: async (id: number): Promise<VetVisit> => {
    const response = await api.get(`${BASE}/visits/${id}`);
    return response.data;
  },

  createWalkIn: async (data: CreateVetWalkInVisitDto): Promise<VetVisit> => {
    const response = await api.post(`${BASE}/visits/walk-in`, data);
    return response.data;
  },

  complete: async (id: number): Promise<VetVisit> => {
    const response = await api.post(`${BASE}/visits/${id}/complete`);
    return response.data;
  },

  generateInvoice: async (id: number): Promise<{ invoiceId: number; invoiceNumber: string }> => {
    const response = await api.post(`${BASE}/visits/${id}/generate-invoice`);
    return response.data;
  },
};

// ============================================================================
// TRIAGE API
// ============================================================================

export const vetTriageApi = {
  get: async (visitId: number): Promise<VetTriageRecord> => {
    const response = await api.get(`${BASE}/visits/${visitId}/triage`);
    return response.data;
  },

  createOrUpdate: async (visitId: number, data: CreateVetTriageRecordDto): Promise<VetTriageRecord> => {
    const response = await api.put(`${BASE}/visits/${visitId}/triage`, data);
    return response.data;
  },
};

// ============================================================================
// SOAP NOTES API
// ============================================================================

export const vetSoapNotesApi = {
  get: async (visitId: number): Promise<VetSoapNote> => {
    const response = await api.get(`${BASE}/visits/${visitId}/soap`);
    return response.data;
  },

  createOrUpdate: async (visitId: number, data: CreateVetSoapNoteDto): Promise<VetSoapNote> => {
    const response = await api.put(`${BASE}/visits/${visitId}/soap`, data);
    return response.data;
  },
};

// ============================================================================
// SOAP TEMPLATES API
// ============================================================================

export const vetSoapTemplatesApi = {
  list: async (query?: VetSoapTemplateListQuery): Promise<PaginatedResponse<VetSoapTemplate>> => {
    const response = await api.get(`${BASE}/soap-templates`, { params: query });
    return response.data;
  },

  get: async (id: number): Promise<VetSoapTemplate> => {
    const response = await api.get(`${BASE}/soap-templates/${id}`);
    return response.data;
  },

  create: async (data: CreateVetSoapTemplateDto): Promise<VetSoapTemplate> => {
    const response = await api.post(`${BASE}/soap-templates`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateVetSoapTemplateDto): Promise<VetSoapTemplate> => {
    const response = await api.patch(`${BASE}/soap-templates/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/soap-templates/${id}`);
  },
};

// ============================================================================
// PRESCRIPTIONS API
// ============================================================================

export const vetPrescriptionsApi = {
  listByVisit: async (visitId: number): Promise<VetPrescription[]> => {
    const response = await api.get(`${BASE}/visits/${visitId}/prescriptions`);
    return response.data;
  },

  create: async (visitId: number, data: CreateVetPrescriptionDto): Promise<VetPrescription> => {
    const response = await api.post(`${BASE}/visits/${visitId}/prescriptions`, data);
    return response.data;
  },

  getQueue: async (): Promise<VetPrescription[]> => {
    const response = await api.get(`${BASE}/prescriptions/queue`);
    return response.data;
  },

  dispense: async (id: number, data: CreateVetDispensingRecordDto): Promise<VetDispensingRecord> => {
    const response = await api.post(`${BASE}/prescriptions/${id}/dispense`, data);
    return response.data;
  },
};

// ============================================================================
// LAB ORDERS API
// ============================================================================

export const vetLabOrdersApi = {
  listByVisit: async (visitId: number): Promise<VetLabOrder[]> => {
    const response = await api.get(`${BASE}/visits/${visitId}/lab-orders`);
    return response.data;
  },

  create: async (visitId: number, data: CreateVetLabOrderDto): Promise<VetLabOrder> => {
    const response = await api.post(`${BASE}/visits/${visitId}/lab-orders`, data);
    return response.data;
  },

  getQueue: async (): Promise<VetLabOrder[]> => {
    const response = await api.get(`${BASE}/lab-orders/queue`);
    return response.data;
  },

  updateStatus: async (id: number, data: UpdateVetLabOrderStatusDto): Promise<VetLabOrder> => {
    const response = await api.patch(`${BASE}/lab-orders/${id}/status`, data);
    return response.data;
  },

  getResults: async (orderId: number): Promise<VetLabResult[]> => {
    const response = await api.get(`${BASE}/lab-orders/${orderId}/results`);
    return response.data;
  },

  enterResults: async (orderId: number, data: EnterVetLabResultsDto): Promise<VetLabResult[]> => {
    const response = await api.post(`${BASE}/lab-orders/${orderId}/results`, data);
    return response.data;
  },
};

// ============================================================================
// PROCEDURES API
// ============================================================================

export const vetProceduresApi = {
  listByVisit: async (visitId: number): Promise<VetProcedure[]> => {
    const response = await api.get(`${BASE}/visits/${visitId}/procedures`);
    return response.data;
  },

  create: async (visitId: number, data: CreateVetProcedureDto): Promise<VetProcedure> => {
    const response = await api.post(`${BASE}/visits/${visitId}/procedures`, data);
    return response.data;
  },

  get: async (id: number): Promise<VetProcedure> => {
    const response = await api.get(`${BASE}/procedures/${id}`);
    return response.data;
  },

  update: async (id: number, data: UpdateVetProcedureDto): Promise<VetProcedure> => {
    const response = await api.patch(`${BASE}/procedures/${id}`, data);
    return response.data;
  },

  updateChecklist: async (id: number, data: UpdateVetSurgeryChecklistDto): Promise<VetProcedure> => {
    const response = await api.put(`${BASE}/procedures/${id}/checklist`, data);
    return response.data;
  },

  getAnesthesia: async (id: number): Promise<VetAnesthesiaRecord> => {
    const response = await api.get(`${BASE}/procedures/${id}/anesthesia`);
    return response.data;
  },

  updateAnesthesia: async (id: number, data: UpdateVetAnesthesiaRecordDto): Promise<VetAnesthesiaRecord> => {
    const response = await api.put(`${BASE}/procedures/${id}/anesthesia`, data);
    return response.data;
  },

  addConsumable: async (id: number, data: CreateVetProcedureConsumableDto): Promise<VetProcedure> => {
    const response = await api.post(`${BASE}/procedures/${id}/consumables`, data);
    return response.data;
  },
};

// ============================================================================
// FORMULARY API
// ============================================================================

export const vetFormularyApi = {
  list: async (query?: VetFormularyListQuery): Promise<PaginatedResponse<VetFormulary>> => {
    const response = await api.get(`${BASE}/formulary`, { params: query });
    return response.data;
  },

  create: async (data: CreateVetFormularyDto): Promise<VetFormulary> => {
    const response = await api.post(`${BASE}/formulary`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateVetFormularyDto): Promise<VetFormulary> => {
    const response = await api.patch(`${BASE}/formulary/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/formulary/${id}`);
  },
};

// ============================================================================
// PRICE LISTS API
// ============================================================================

export const vetPriceListsApi = {
  list: async (query?: VetPriceListListQuery): Promise<PaginatedResponse<VetPriceList>> => {
    const response = await api.get(`${BASE}/price-lists`, { params: query });
    return response.data;
  },

  get: async (id: number): Promise<VetPriceList> => {
    const response = await api.get(`${BASE}/price-lists/${id}`);
    return response.data;
  },

  create: async (data: CreateVetPriceListDto): Promise<VetPriceList> => {
    const response = await api.post(`${BASE}/price-lists`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateVetPriceListDto): Promise<VetPriceList> => {
    const response = await api.patch(`${BASE}/price-lists/${id}`, data);
    return response.data;
  },

  listItems: async (id: number): Promise<PaginatedResponse<VetPriceListItem>> => {
    const response = await api.get(`${BASE}/price-lists/${id}/items`);
    return response.data;
  },

  addItem: async (id: number, data: CreateVetPriceListItemDto): Promise<VetPriceListItem> => {
    const response = await api.post(`${BASE}/price-lists/${id}/items`, data);
    return response.data;
  },
};

// ============================================================================
// SPECIES API
// ============================================================================

export const vetSpeciesApi = {
  list: async (): Promise<VetSpecies[]> => {
    const response = await api.get(`${BASE}/species`);
    return response.data;
  },

  create: async (data: CreateVetSpeciesDto): Promise<VetSpecies> => {
    const response = await api.post(`${BASE}/species`, data);
    return response.data;
  },

  getBreeds: async (speciesId: number): Promise<VetBreed[]> => {
    const response = await api.get(`${BASE}/species/${speciesId}/breeds`);
    return response.data;
  },

  addBreed: async (speciesId: number, data: CreateVetBreedDto): Promise<VetBreed> => {
    const response = await api.post(`${BASE}/species/${speciesId}/breeds`, data);
    return response.data;
  },
};

// ============================================================================
// DIAGNOSIS CODES API
// ============================================================================

export const vetDiagnosisCodesApi = {
  list: async (query?: VetDiagnosisCodeListQuery): Promise<PaginatedResponse<VetDiagnosisCode>> => {
    const response = await api.get(`${BASE}/diagnosis-codes`, { params: query });
    return response.data;
  },

  create: async (data: CreateVetDiagnosisCodeDto): Promise<VetDiagnosisCode> => {
    const response = await api.post(`${BASE}/diagnosis-codes`, data);
    return response.data;
  },
};

// ============================================================================
// DASHBOARD API
// ============================================================================

export const vetDashboardApi = {
  getStats: async (): Promise<VetDashboardStats> => {
    const response = await api.get(`${BASE}/dashboard/stats`);
    return response.data;
  },

  getAppointmentsToday: async (): Promise<VetAppointmentTodayEntry[]> => {
    const response = await api.get(`${BASE}/dashboard/appointments-today`);
    return response.data;
  },

  getRevenueSummary: async (): Promise<VetRevenueSummary> => {
    const response = await api.get(`${BASE}/dashboard/revenue-summary`);
    return response.data;
  },

  getStockAlerts: async (): Promise<VetStockAlert[]> => {
    const response = await api.get(`${BASE}/dashboard/stock-alerts`);
    return response.data;
  },
};

// ============================================================================
// SETTINGS API
// ============================================================================

export const vetSettingsApi = {
  get: async (): Promise<VetSettings> => {
    const response = await api.get(`${BASE}/settings`);
    return response.data;
  },

  update: async (data: UpdateVetSettingsDto): Promise<VetSettings> => {
    const response = await api.patch(`${BASE}/settings`, data);
    return response.data;
  },
};

// ============================================================================
// LAB REFERENCE RANGES API
// ============================================================================

export const vetLabReferenceRangesApi = {
  list: async (query?: VetLabReferenceRangeListQuery): Promise<VetLabReferenceRange[]> => {
    const response = await api.get(`${BASE}/lab-reference-ranges`, { params: query });
    return response.data;
  },

  createOrUpdate: async (data: CreateVetLabReferenceRangeDto): Promise<VetLabReferenceRange> => {
    const response = await api.put(`${BASE}/lab-reference-ranges`, data);
    return response.data;
  },
};

// ============================================================================
// AMBULATORY API (Phase 2)
// ============================================================================

export const vetAmbulatoryApi = {
  list: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/ambulatory`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/ambulatory/${id}`);
    return response.data;
  },
  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ambulatory`, data);
    return response.data;
  },
  assign: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ambulatory/${id}/assign`, data);
    return response.data;
  },
  cancel: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ambulatory/${id}/cancel`);
    return response.data;
  },
  checkIn: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ambulatory/${id}/check-in`, data);
    return response.data;
  },
  checkOut: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ambulatory/${id}/check-out`, data);
    return response.data;
  },
  saveSoap: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.put(`${BASE}/ambulatory/${id}/soap`, data);
    return response.data;
  },
  dispenseStock: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ambulatory/${id}/dispense`, data);
    return response.data;
  },
  collectSample: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ambulatory/${id}/samples`, data);
    return response.data;
  },
  collectPayment: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ambulatory/${id}/payment`, data);
    return response.data;
  },
  saveSignature: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ambulatory/${id}/signature`, data);
    return response.data;
  },
};

// ============================================================================
// VISIT PHOTOS API — Sprint 2/3 Batch 8 (#10)
// Endpoints: POST/GET /veterinary/field-visits/:visitId/photos
// ============================================================================

export interface VetVisitPhoto {
  id: number;
  visitId: number;
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedById: number;
  caption: string | null;
  url: string;
  createdAt: string;
}

export const vetVisitPhotosApi = {
  /** Upload a photo for a field visit (multipart/form-data). */
  upload: async (
    visitId: number,
    file: File,
    caption?: string,
  ): Promise<VetVisitPhoto> => {
    const formData = new FormData();
    formData.append('photo', file);
    const params = caption ? `?caption=${encodeURIComponent(caption)}` : '';
    const response = await api.post(
      `${BASE}/field-visits/${visitId}/photos${params}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  /** List all photos for a visit. */
  list: async (visitId: number): Promise<VetVisitPhoto[]> => {
    const response = await api.get(`${BASE}/field-visits/${visitId}/photos`);
    return response.data;
  },

  /** Delete a photo by ID. */
  delete: async (visitId: number, photoId: number): Promise<void> => {
    await api.delete(`${BASE}/field-visits/${visitId}/photos/${photoId}`);
  },
};

// ============================================================================
// DISPATCH API (Phase 2)
// ============================================================================

export const vetDispatchApi = {
  createRoute: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/dispatch/routes`, data);
    return response.data;
  },
  confirmDispatch: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/dispatch/confirm`, data);
    return response.data;
  },
};

// ============================================================================
// VEHICLES API (Phase 2)
// ============================================================================

export const vetVehiclesApi = {
  list: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/vehicles`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/vehicles/${id}`);
    return response.data;
  },
  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/vehicles`, data);
    return response.data;
  },
  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`${BASE}/vehicles/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/vehicles/${id}`);
  },
};

// ============================================================================
// TRUNK STOCK API (Phase 2)
// ============================================================================

export const vetTrunkStockApi = {
  list: async (vehicleId: number): Promise<Record<string, unknown>[]> => {
    const response = await api.get(`${BASE}/vehicles/${vehicleId}/trunk-stock`);
    return response.data;
  },
  load: async (vehicleId: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/vehicles/${vehicleId}/trunk-stock/load`, data);
    return response.data;
  },
  return: async (vehicleId: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/vehicles/${vehicleId}/trunk-stock/return`, data);
    return response.data;
  },
  reconcile: async (vehicleId: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/vehicles/${vehicleId}/trunk-stock/reconcile`, data);
    return response.data;
  },
  reconciliationHistory: async (vehicleId: number): Promise<Record<string, unknown>[]> => {
    const response = await api.get(`${BASE}/vehicles/${vehicleId}/trunk-stock/reconciliations`);
    return response.data;
  },
};

// ============================================================================
// INSURANCE API (Phase 2)
// ============================================================================

export const vetInsuranceApi = {
  listProfiles: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/insurance/profiles`, { params: query });
    return response.data;
  },
  createProfile: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/insurance/profiles`, data);
    return response.data;
  },
  updateProfile: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`${BASE}/insurance/profiles/${id}`, data);
    return response.data;
  },
  listPreAuth: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/insurance/pre-auth`, { params: query });
    return response.data;
  },
  createPreAuth: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/insurance/pre-auth`, data);
    return response.data;
  },
  listClaims: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/insurance/claims`, { params: query });
    return response.data;
  },
  getClaim: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/insurance/claims/${id}`);
    return response.data;
  },
  createClaim: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/insurance/claims`, data);
    return response.data;
  },
  updateClaimStatus: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`${BASE}/insurance/claims/${id}/status`, data);
    return response.data;
  },
  recordRemittance: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/insurance/claims/${id}/remittance`, data);
    return response.data;
  },
};

// ============================================================================
// DISTANCE ZONES API (Phase 2)
// ============================================================================

export const vetDistanceZonesApi = {
  list: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get(`${BASE}/distance-zones`);
    return response.data;
  },
  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/distance-zones`, data);
    return response.data;
  },
  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`${BASE}/distance-zones/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/distance-zones/${id}`);
  },
  calculate: async (lat: number, lng: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/distance-zones/calculate`, { params: { lat, lng } });
    return response.data;
  },
};

// ============================================================================
// SAMPLES API (Phase 2)
// ============================================================================

export const vetSamplesApi = {
  list: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/samples`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/samples/${id}`);
    return response.data;
  },
  recordHandoff: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/samples/${id}/handoff`, data);
    return response.data;
  },
  labReceive: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/samples/${id}/lab-receive`);
    return response.data;
  },
};

// ============================================================================
// REMINDERS API (Phase 2)
// ============================================================================

export const vetRemindersApi = {
  list: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/reminders`, { params: query });
    return response.data;
  },
  generate: async (): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/reminders/generate`);
    return response.data;
  },
  send: async (ids: number[]): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/reminders/send`, { ids });
    return response.data;
  },
  listCampaigns: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/campaigns`, { params: query });
    return response.data;
  },
  getCampaign: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/campaigns/${id}`);
    return response.data;
  },
  createCampaign: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/campaigns`, data);
    return response.data;
  },
  launchCampaign: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/campaigns/${id}/launch`);
    return response.data;
  },
  listSurveyResponses: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/surveys/responses`, { params: query });
    return response.data;
  },
};

// ============================================================================
// SAFETY API (Phase 2)
// ============================================================================

export const vetSafetyApi = {
  listChecklists: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/safety/checklists`, { params: query });
    return response.data;
  },
  createChecklist: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/safety/checklists`, data);
    return response.data;
  },
  listIncidents: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/safety/incidents`, { params: query });
    return response.data;
  },
  createIncident: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/safety/incidents`, data);
    return response.data;
  },
  updateIncident: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`${BASE}/safety/incidents/${id}`, data);
    return response.data;
  },
  listDisposalLog: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/safety/disposal-log`, { params: query });
    return response.data;
  },
  createDisposalEntry: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/safety/disposal-log`, data);
    return response.data;
  },
};

// ============================================================================
// AI CLINICAL ASSISTANT API (Phase 3)
// ============================================================================

export const vetAiApi = {
  suggestTriage: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ai/triage`, data);
    return response.data;
  },
  suggestDiagnosis: async (visitId: number): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ai/diagnosis`, { visitId });
    return response.data;
  },
  suggestTreatment: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ai/treatment`, data);
    return response.data;
  },
  completeSoap: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ai/soap-complete`, data);
    return response.data;
  },
  feedback: async (suggestionId: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ai/suggestions/${suggestionId}/feedback`, data);
    return response.data;
  },
  history: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/ai/suggestions`, { params: query });
    return response.data;
  },
  checkInteractions: async (medicationIds: number[]): Promise<Record<string, unknown>[]> => {
    const response = await api.post(`${BASE}/ai/drug-interactions/check`, { medicationIds });
    return response.data;
  },
  listInteractions: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/ai/drug-interactions`, { params: query });
    return response.data;
  },
  createInteraction: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/ai/drug-interactions`, data);
    return response.data;
  },
  deleteInteraction: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/ai/drug-interactions/${id}`);
  },
};

// ============================================================================
// FORECASTING API (Phase 3)
// ============================================================================

export const vetForecastingApi = {
  generate: async (): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/forecasting/generate`);
    return response.data;
  },
  list: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/forecasting`, { params: query });
    return response.data;
  },
  generateAutoRequisitions: async (): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/forecasting/auto-requisitions/generate`);
    return response.data;
  },
  listAutoRequisitions: async (query?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get(`${BASE}/forecasting/auto-requisitions`, { params: query });
    return response.data;
  },
  reviewAutoRequisition: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/forecasting/auto-requisitions/${id}/review`, data);
    return response.data;
  },
};

// ============================================================================
// ANALYTICS API (Phase 3) - Vaccination Coverage & Outbreak
// ============================================================================

export const vetAnalyticsApi = {
  computeCoverage: async (): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/analytics/vaccination-coverage/compute`);
    return response.data;
  },
  getCoverage: async (query?: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/analytics/vaccination-coverage`, { params: query });
    return response.data;
  },
  detectOutbreaks: async (): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/analytics/outbreaks/detect`);
    return response.data;
  },
  listAlerts: async (query?: Record<string, unknown>): Promise<Record<string, unknown>[]> => {
    const response = await api.get(`${BASE}/analytics/outbreaks/alerts`, { params: query });
    return response.data;
  },
  acknowledgeAlert: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/analytics/outbreaks/alerts/${id}/acknowledge`);
    return response.data;
  },
  resolveAlert: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/analytics/outbreaks/alerts/${id}/resolve`);
    return response.data;
  },
};

// ============================================================================
// REPORTS API (Phase 3) - BI Reports
// ============================================================================

export interface RetentionRateResult {
  totalClients: number;
  returningClients: number;
  retentionRate: number;
}

export interface AmbulatoryEfficiencyRow {
  requestId: number;
  location: string;
  scheduledDate: string | null;
  totalRevenue: number;
  fuelCost: number;
  tripDistanceKm: number;
  net: number;
  revenuePerKm: number | null;
}

export interface AmbulatoryEfficiencySummary {
  totalTrips: number;
  totalRevenue: number;
  totalFuelCost: number;
  netRevenue: number;
  avgRevenuePerKm: number | null;
  rows: AmbulatoryEfficiencyRow[];
}

export interface CommissionByVetRow {
  repName: string;
  repCode: string;
  visitCount: number;
  revenueGenerated: number;
  commissionAmount: number;
}

export const vetReportsApi = {
  listTemplates: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get(`${BASE}/reports/templates`);
    return response.data;
  },
  createTemplate: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/reports/templates`, data);
    return response.data;
  },
  generate: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/reports/generate`, data);
    return response.data;
  },
  export: async (data: Record<string, unknown>): Promise<Blob> => {
    const response = await api.post(`${BASE}/reports/export`, data, { responseType: 'blob' });
    return response.data;
  },
  listSchedules: async (): Promise<Record<string, unknown>[]> => {
    const response = await api.get(`${BASE}/reports/schedules`);
    return response.data;
  },
  createSchedule: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/reports/schedules`, data);
    return response.data;
  },
  // KPI Reports — Sprint 2 Batch 4
  getRetentionRate: async (params: { fromDate: string; toDate: string }): Promise<RetentionRateResult> => {
    const response = await api.post(`${BASE}/reports/retention-rate`, params);
    return response.data;
  },
  getAmbulatoryEfficiency: async (params: { fromDate: string; toDate: string }): Promise<AmbulatoryEfficiencySummary> => {
    const response = await api.post(`${BASE}/reports/ambulatory-efficiency`, params);
    return response.data;
  },
  getCommissions: async (params: { fromDate: string; toDate: string }): Promise<CommissionByVetRow[]> => {
    const response = await api.post(`${BASE}/reports/commissions`, params);
    return response.data;
  },
};

// ============================================================================
// METRICS API (Phase 3) - Provider & Engagement
// ============================================================================

export const vetMetricsApi = {
  computeProvider: async (query?: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/metrics/provider/compute`, query);
    return response.data;
  },
  getProvider: async (query?: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/metrics/provider`, { params: query });
    return response.data;
  },
  operationalDashboard: async (): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/metrics/operational`);
    return response.data;
  },
  computeEngagement: async (): Promise<Record<string, unknown>> => {
    const response = await api.post(`${BASE}/metrics/engagement/compute`);
    return response.data;
  },
  getEngagement: async (query?: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/metrics/engagement`, { params: query });
    return response.data;
  },
};

// ============================================================================
// PHASE 4: IMAGING
// ============================================================================
export const vetImagingApi = {
  listOrders: async (params?: Record<string, unknown>) => {
    const response = await api.get(`${BASE}/imaging/orders`, { params });
    return response.data;
  },
  getOrder: async (id: number) => {
    const response = await api.get(`${BASE}/imaging/orders/${id}`);
    return response.data;
  },
  createOrder: async (data: Record<string, unknown>) => {
    const response = await api.post(`${BASE}/imaging/orders`, data);
    return response.data;
  },
  updateOrder: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`${BASE}/imaging/orders/${id}`, data);
    return response.data;
  },
  cancelOrder: async (id: number, reason: string) => {
    const response = await api.post(`${BASE}/imaging/orders/${id}/cancel`, { reason });
    return response.data;
  },
  getWorklist: async (params?: Record<string, unknown>) => {
    const response = await api.get(`${BASE}/imaging/worklist`, { params });
    return response.data;
  },
  createStudy: async (data: Record<string, unknown>) => {
    const response = await api.post(`${BASE}/imaging/studies`, data);
    return response.data;
  },
  getStudy: async (id: number) => {
    const response = await api.get(`${BASE}/imaging/studies/${id}`);
    return response.data;
  },
  uploadFile: async (studyId: number, formData: FormData) => {
    const response = await api.post(`${BASE}/imaging/studies/${studyId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  linkPacs: async (studyId: number, studyInstanceUid: string) => {
    const response = await api.post(`${BASE}/imaging/studies/${studyId}/link-pacs`, { studyInstanceUid });
    return response.data;
  },
  createReport: async (data: Record<string, unknown>) => {
    const response = await api.post(`${BASE}/imaging/reports`, data);
    return response.data;
  },
  updateReport: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`${BASE}/imaging/reports/${id}`, data);
    return response.data;
  },
  finalizeReport: async (id: number) => {
    const response = await api.post(`${BASE}/imaging/reports/${id}/finalize`);
    return response.data;
  },
  getAnimalHistory: async (animalId: number) => {
    const response = await api.get(`${BASE}/imaging/animals/${animalId}/history`);
    return response.data;
  },
};

// ============================================================================
// PHASE 4: TELEMEDICINE
// ============================================================================
export const vetTelemedicineApi = {
  listSessions: async (params?: Record<string, unknown>) => {
    const response = await api.get(`${BASE}/telemedicine/sessions`, { params });
    return response.data;
  },
  getSession: async (id: number) => {
    const response = await api.get(`${BASE}/telemedicine/sessions/${id}`);
    return response.data;
  },
  createSession: async (data: Record<string, unknown>) => {
    const response = await api.post(`${BASE}/telemedicine/sessions`, data);
    return response.data;
  },
  joinSession: async (id: number) => {
    const response = await api.post(`${BASE}/telemedicine/sessions/${id}/join`);
    return response.data;
  },
  endSession: async (id: number) => {
    const response = await api.post(`${BASE}/telemedicine/sessions/${id}/end`);
    return response.data;
  },
  inviteParticipant: async (id: number, data: Record<string, unknown>) => {
    const response = await api.post(`${BASE}/telemedicine/sessions/${id}/invite`, data);
    return response.data;
  },
  recordConsent: async (id: number, participantId: number, consented: boolean) => {
    const response = await api.post(`${BASE}/telemedicine/sessions/${id}/consent`, { participantId, consented });
    return response.data;
  },
  startRecording: async (id: number) => {
    const response = await api.post(`${BASE}/telemedicine/sessions/${id}/recording/start`);
    return response.data;
  },
  stopRecording: async (id: number) => {
    const response = await api.post(`${BASE}/telemedicine/sessions/${id}/recording/stop`);
    return response.data;
  },
  uploadRecording: async (id: number, formData: FormData) => {
    const response = await api.post(`${BASE}/telemedicine/sessions/${id}/recording/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  getWaitingRoom: async (token: string) => {
    const response = await api.get(`${BASE}/telemedicine/waiting-room/${token}`);
    return response.data;
  },
  getDashboard: async () => {
    const response = await api.get(`${BASE}/telemedicine/dashboard`);
    return response.data;
  },
};

// ============================================================================
// PHASE 4: IOT DEVICES
// ============================================================================
export const vetIotDevicesApi = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get(`${BASE}/iot/devices`, { params });
    return response.data;
  },
  get: async (id: number) => {
    const response = await api.get(`${BASE}/iot/devices/${id}`);
    return response.data;
  },
  register: async (data: Record<string, unknown>) => {
    const response = await api.post(`${BASE}/iot/devices`, data);
    return response.data;
  },
  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`${BASE}/iot/devices/${id}`, data);
    return response.data;
  },
  assign: async (id: number, animalId: number) => {
    const response = await api.post(`${BASE}/iot/devices/${id}/assign`, { animalId });
    return response.data;
  },
  decommission: async (id: number, reason?: string) => {
    const response = await api.post(`${BASE}/iot/devices/${id}/decommission`, { reason });
    return response.data;
  },
  regenerateKey: async (id: number) => {
    const response = await api.post(`${BASE}/iot/devices/${id}/regenerate-key`);
    return response.data;
  },
};

// ============================================================================
// PHASE 4: IOT TELEMETRY
// ============================================================================
export const vetIotTelemetryApi = {
  getLatest: async (params?: Record<string, unknown>) => {
    const response = await api.get(`${BASE}/iot/telemetry/latest`, { params });
    return response.data;
  },
  getHistory: async (params?: Record<string, unknown>) => {
    const response = await api.get(`${BASE}/iot/telemetry/history`, { params });
    return response.data;
  },
  getDashboard: async () => {
    const response = await api.get(`${BASE}/iot/telemetry/dashboard`);
    return response.data;
  },
};

// ============================================================================
// PHASE 4: IOT ALERTS
// ============================================================================
export const vetIotAlertsApi = {
  listRules: async (params?: Record<string, unknown>) => {
    const response = await api.get(`${BASE}/iot/alerts/rules`, { params });
    return response.data;
  },
  createRule: async (data: Record<string, unknown>) => {
    const response = await api.post(`${BASE}/iot/alerts/rules`, data);
    return response.data;
  },
  updateRule: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`${BASE}/iot/alerts/rules/${id}`, data);
    return response.data;
  },
  deleteRule: async (id: number) => {
    const response = await api.delete(`${BASE}/iot/alerts/rules/${id}`);
    return response.data;
  },
  toggleRule: async (id: number) => {
    const response = await api.post(`${BASE}/iot/alerts/rules/${id}/toggle`);
    return response.data;
  },
  listAlerts: async (params?: Record<string, unknown>) => {
    const response = await api.get(`${BASE}/iot/alerts`, { params });
    return response.data;
  },
  getAlert: async (id: number) => {
    const response = await api.get(`${BASE}/iot/alerts/${id}`);
    return response.data;
  },
  dismissAlert: async (id: number, reason: string) => {
    const response = await api.post(`${BASE}/iot/alerts/${id}/dismiss`, { reason });
    return response.data;
  },
  createVisitFromAlert: async (id: number) => {
    const response = await api.post(`${BASE}/iot/alerts/${id}/create-visit`);
    return response.data;
  },
};

// ============================================================================
// PHASE 4: GEOFENCES
// ============================================================================
export const vetGeofencesApi = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get(`${BASE}/iot/geofences`, { params });
    return response.data;
  },
  get: async (id: number) => {
    const response = await api.get(`${BASE}/iot/geofences/${id}`);
    return response.data;
  },
  create: async (data: Record<string, unknown>) => {
    const response = await api.post(`${BASE}/iot/geofences`, data);
    return response.data;
  },
  update: async (id: number, data: Record<string, unknown>) => {
    const response = await api.patch(`${BASE}/iot/geofences/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`${BASE}/iot/geofences/${id}`);
    return response.data;
  },
  assignAnimals: async (id: number, animalIds: number[]) => {
    const response = await api.post(`${BASE}/iot/geofences/${id}/assign`, { animalIds });
    return response.data;
  },
  listBreaches: async (params?: Record<string, unknown>) => {
    const response = await api.get(`${BASE}/iot/geofences/breaches`, { params });
    return response.data;
  },
  acknowledgeBreach: async (id: number) => {
    const response = await api.post(`${BASE}/iot/geofences/breaches/${id}/acknowledge`);
    return response.data;
  },
};
