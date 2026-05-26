// ============================================================================
// VETERINARY MODULE TYPES
// ============================================================================

import type { PaginatedResponse, ListQueryParams } from './core';

// ============================================================================
// CONSTANTS / ENUMS
// ============================================================================

export const VET_SPECIES_CODES = ['CAN', 'FEL', 'BOV', 'OVI', 'CAP', 'EQU', 'AVI', 'POR', 'OTH'] as const;
export type VetSpeciesCode = typeof VET_SPECIES_CODES[number];

export const VET_APPOINTMENT_TYPES = ['CONSULTATION', 'VACCINATION', 'SURGERY', 'FARM_VISIT', 'FOLLOW_UP'] as const;
export type VetAppointmentType = typeof VET_APPOINTMENT_TYPES[number];

export const VET_APPOINTMENT_STATUSES = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'RESCHEDULED'] as const;
export type VetAppointmentStatus = typeof VET_APPOINTMENT_STATUSES[number];

export const VET_VISIT_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'DISCHARGED', 'CANCELLED'] as const;
export type VetVisitStatus = typeof VET_VISIT_STATUSES[number];

export const VET_TRIAGE_CATEGORIES = ['EMERGENCY', 'URGENT', 'NON_URGENT'] as const;
export type VetTriageCategory = typeof VET_TRIAGE_CATEGORIES[number];

export const VET_PRESCRIPTION_STATUSES = ['PENDING', 'DISPENSED', 'PARTIALLY_DISPENSED', 'CANCELLED'] as const;
export type VetPrescriptionStatus = typeof VET_PRESCRIPTION_STATUSES[number];

export const VET_LAB_ORDER_STATUSES = ['ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'] as const;
export type VetLabOrderStatus = typeof VET_LAB_ORDER_STATUSES[number];

export const VET_PROCEDURE_STATUSES = ['PLANNED', 'PRE_OP', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type VetProcedureStatus = typeof VET_PROCEDURE_STATUSES[number];

export const VET_ANIMAL_SEX = ['MALE', 'FEMALE', 'NEUTERED_MALE', 'SPAYED_FEMALE', 'UNKNOWN'] as const;
export type VetAnimalSex = typeof VET_ANIMAL_SEX[number];

// ============================================================================
// SPECIES & BREEDS
// ============================================================================

export interface VetSpecies {
  id: number;
  name: string;
  code: VetSpeciesCode;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  breeds?: VetBreed[];
}

export interface VetBreed {
  id: number;
  speciesId: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  species?: VetSpecies;
}

export interface CreateVetSpeciesDto {
  name: string;
  code: VetSpeciesCode;
  description?: string;
}

export interface CreateVetBreedDto {
  name: string;
  description?: string;
}

// ============================================================================
// CLIENTS
// ============================================================================

export interface VetClient {
  id: number;
  title: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  notes: string | null;
  isActive: boolean;
  companyId: number;
  branchId: number;
  // GPS for ambulatory routing + zone billing (Sprint 2). PostgreSQL Decimal
  // serialises to string — coerce with Number() when reading.
  latitude: number | string | null;
  longitude: number | string | null;
  // Bridge to standard AR (Sprint 1.4). Null when the tenant hasn't
  // configured a Receivable account yet — the Billing tab offers a retry.
  customerId: number | null;
  createdAt: string;
  updatedAt: string;
  animals?: VetAnimal[];
  animalCount?: number;
}

export interface CreateVetClientDto {
  title?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateVetClientDto extends Partial<CreateVetClientDto> {
  isActive?: boolean;
}

export interface VetClientListQuery extends ListQueryParams {}

// ============================================================================
// ANIMALS
// ============================================================================

export interface VetAnimal {
  id: number;
  clientId: number;
  name: string;
  speciesId: number;
  breedId: number | null;
  sex: VetAnimalSex;
  dateOfBirth: string | null;
  estimatedAge: string | null;
  color: string | null;
  markings: string | null;
  microchipNumber: string | null;
  tagNumber: string | null;
  weight: number | null;
  weightUnit: string;
  isDeceased: boolean;
  deceasedDate: string | null;
  notes: string | null;
  photoUrl: string | null;
  isActive: boolean;
  companyId: number;
  branchId: number;
  createdAt: string;
  updatedAt: string;
  client?: VetClient;
  species?: VetSpecies;
  breed?: VetBreed;
}

export interface CreateVetAnimalDto {
  clientId: number;
  name: string;
  speciesId: number;
  breedId?: number;
  sex: VetAnimalSex;
  dateOfBirth?: string;
  estimatedAge?: string;
  color?: string;
  markings?: string;
  microchipNumber?: string;
  tagNumber?: string;
  weight?: number;
  weightUnit?: string;
  notes?: string;
}

export interface UpdateVetAnimalDto extends Partial<CreateVetAnimalDto> {
  isActive?: boolean;
  isDeceased?: boolean;
  deceasedDate?: string;
}

export interface VetAnimalListQuery extends ListQueryParams {
  clientId?: number;
  speciesId?: number;
  breedId?: number;
}

// ============================================================================
// ANIMAL WEIGHT HISTORY
// ============================================================================

export interface VetAnimalWeightHistory {
  id: number;
  animalId: number;
  weight: number;
  weightUnit: string;
  recordedDate: string;
  notes: string | null;
  recordedById: number | null;
  createdAt: string;
}

export interface CreateVetAnimalWeightDto {
  weight: number;
  weightUnit?: string;
  recordedDate?: string;
  notes?: string;
}

// ============================================================================
// ANIMAL VACCINATIONS
// ============================================================================

export interface VetAnimalVaccination {
  id: number;
  animalId: number;
  vaccineName: string;
  manufacturer: string | null;
  batchNumber: string | null;
  administeredDate: string;
  nextDueDate: string | null;
  administeredById: number | null;
  administeredByName: string | null;
  site: string | null;
  dosage: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVetAnimalVaccinationDto {
  vaccineName: string;
  manufacturer?: string;
  batchNumber?: string;
  administeredDate: string;
  nextDueDate?: string;
  site?: string;
  dosage?: string;
  notes?: string;
}

// ============================================================================
// ANIMAL ATTACHMENTS
// ============================================================================

export interface VetAnimalAttachment {
  id: number;
  animalId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  fileUrl: string;
  description: string | null;
  uploadedById: number | null;
  createdAt: string;
}

export interface UploadVetAnimalAttachmentDto {
  file: File;
  description?: string;
}

// ============================================================================
// APPOINTMENTS
// ============================================================================

export interface VetAppointment {
  id: number;
  appointmentNumber: string;
  clientId: number;
  animalId: number;
  providerId: number;
  appointmentType: VetAppointmentType;
  status: VetAppointmentStatus;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  reason: string | null;
  notes: string | null;
  checkedInAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  rescheduledFrom: number | null;
  companyId: number;
  branchId: number;
  createdAt: string;
  updatedAt: string;
  client?: VetClient;
  animal?: VetAnimal;
  providerName?: string;
  visit?: VetVisit;
}

export interface CreateVetAppointmentDto {
  clientId: number;
  animalId: number;
  providerId: number;
  appointmentType: VetAppointmentType;
  scheduledDate: string;
  scheduledTime: string;
  duration?: number;
  reason?: string;
  notes?: string;
}

export interface UpdateVetAppointmentDto extends Partial<CreateVetAppointmentDto> {}

export interface VetAppointmentListQuery extends ListQueryParams {
  date?: string;
  providerId?: number;
  status?: VetAppointmentStatus;
  clientId?: number;
  animalId?: number;
  appointmentType?: VetAppointmentType;
}

export interface RescheduleVetAppointmentDto {
  scheduledDate: string;
  scheduledTime: string;
  reason?: string;
}

export interface CancelVetAppointmentDto {
  reason?: string;
}

export interface VetAppointmentCalendarEntry {
  id: number;
  appointmentNumber: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  appointmentType: VetAppointmentType;
  status: VetAppointmentStatus;
  clientName: string;
  animalName: string;
  providerName: string;
}

// ============================================================================
// VISITS
// ============================================================================

export interface VetVisit {
  id: number;
  visitNumber: string;
  appointmentId: number | null;
  clientId: number;
  animalId: number;
  providerId: number;
  status: VetVisitStatus;
  visitDate: string;
  checkedInAt: string;
  completedAt: string | null;
  dischargedAt: string | null;
  chiefComplaint: string | null;
  notes: string | null;
  totalCharges: number;
  companyId: number;
  branchId: number;
  createdAt: string;
  updatedAt: string;
  client?: VetClient;
  animal?: VetAnimal;
  providerName?: string;
  appointment?: VetAppointment;
  triageRecord?: VetTriageRecord;
  soapNote?: VetSoapNote;
  prescriptions?: VetPrescription[];
  labOrders?: VetLabOrder[];
  procedures?: VetProcedure[];
  charges?: VetVisitCharge[];
}

export interface CreateVetWalkInVisitDto {
  clientId: number;
  animalId: number;
  providerId: number;
  chiefComplaint?: string;
  notes?: string;
}

export interface VetVisitListQuery extends ListQueryParams {
  date?: string;
  status?: VetVisitStatus;
  animalId?: number;
  clientId?: number;
  providerId?: number;
}

// ============================================================================
// TRIAGE RECORDS
// ============================================================================

export interface VetTriageRecord {
  id: number;
  visitId: number;
  triageCategory: VetTriageCategory;
  temperature: number | null;
  temperatureUnit: string;
  heartRate: number | null;
  respiratoryRate: number | null;
  weight: number | null;
  weightUnit: string;
  bodyConditionScore: number | null;
  painScore: number | null;
  mucousMembraneColor: string | null;
  capillaryRefillTime: number | null;
  hydrationStatus: string | null;
  mentalStatus: string | null;
  ambulatoryStatus: string | null;
  chiefComplaint: string | null;
  triageNotes: string | null;
  triagedById: number | null;
  triagedByName: string | null;
  triagedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVetTriageRecordDto {
  triageCategory: VetTriageCategory;
  temperature?: number;
  temperatureUnit?: string;
  heartRate?: number;
  respiratoryRate?: number;
  weight?: number;
  weightUnit?: string;
  bodyConditionScore?: number;
  painScore?: number;
  mucousMembraneColor?: string;
  capillaryRefillTime?: number;
  hydrationStatus?: string;
  mentalStatus?: string;
  ambulatoryStatus?: string;
  chiefComplaint?: string;
  triageNotes?: string;
}

// ============================================================================
// SOAP NOTES
// ============================================================================

export interface VetSoapNote {
  id: number;
  visitId: number;
  templateId: number | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  diagnosisCodes: VetDiagnosisCodeEntry[];
  differentialDiagnoses: string[];
  prognosis: string | null;
  followUpInstructions: string | null;
  followUpDate: string | null;
  createdById: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VetDiagnosisCodeEntry {
  codeId: number;
  code: string;
  description: string;
  isPrimary: boolean;
}

export interface CreateVetSoapNoteDto {
  templateId?: number;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  diagnosisCodes?: VetDiagnosisCodeEntry[];
  differentialDiagnoses?: string[];
  prognosis?: string;
  followUpInstructions?: string;
  followUpDate?: string;
}

// ============================================================================
// SOAP TEMPLATES
// ============================================================================

export interface VetSoapTemplate {
  id: number;
  name: string;
  speciesId: number | null;
  appointmentType: VetAppointmentType | null;
  subjectiveTemplate: string | null;
  objectiveTemplate: string | null;
  assessmentTemplate: string | null;
  planTemplate: string | null;
  isActive: boolean;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  species?: VetSpecies;
}

export interface CreateVetSoapTemplateDto {
  name: string;
  speciesId?: number;
  appointmentType?: VetAppointmentType;
  subjectiveTemplate?: string;
  objectiveTemplate?: string;
  assessmentTemplate?: string;
  planTemplate?: string;
}

export interface UpdateVetSoapTemplateDto extends Partial<CreateVetSoapTemplateDto> {
  isActive?: boolean;
}

export interface VetSoapTemplateListQuery extends ListQueryParams {
  speciesId?: number;
}

// ============================================================================
// DIAGNOSIS CODES
// ============================================================================

export interface VetDiagnosisCode {
  id: number;
  code: string;
  description: string;
  category: string | null;
  speciesIds: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVetDiagnosisCodeDto {
  code: string;
  description: string;
  category?: string;
  speciesIds?: number[];
}

export interface VetDiagnosisCodeListQuery extends ListQueryParams {
  speciesId?: number;
}

// ============================================================================
// PRESCRIPTIONS
// ============================================================================

export interface VetPrescription {
  id: number;
  visitId: number;
  itemId: number | null;
  formularyId: number | null;
  medicationName: string;
  dosage: string;
  dosageUnit: string;
  frequency: string;
  route: string;
  duration: string | null;
  quantity: number;
  quantityUnit: string;
  instructions: string | null;
  refillsAllowed: number;
  refillsUsed: number;
  status: VetPrescriptionStatus;
  prescribedById: number | null;
  prescribedByName: string | null;
  dispensedAt: string | null;
  dispensedById: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVetPrescriptionDto {
  itemId?: number;
  formularyId?: number;
  medicationName: string;
  dosage: string;
  dosageUnit: string;
  frequency: string;
  route: string;
  duration?: string;
  quantity: number;
  quantityUnit?: string;
  instructions?: string;
  refillsAllowed?: number;
  notes?: string;
}

// ============================================================================
// DISPENSING RECORDS
// ============================================================================

export interface VetDispensingRecord {
  id: number;
  prescriptionId: number;
  itemId: number;
  quantityDispensed: number;
  batchNumber: string | null;
  expiryDate: string | null;
  dispensedById: number | null;
  dispensedByName: string | null;
  dispensedAt: string;
  notes: string | null;
  createdAt: string;
}

export interface CreateVetDispensingRecordDto {
  itemId: number;
  quantityDispensed: number;
  batchNumber?: string;
  expiryDate?: string;
  notes?: string;
}

// ============================================================================
// FORMULARY
// ============================================================================

export interface VetFormulary {
  id: number;
  itemId: number;
  itemName: string | null;
  speciesId: number | null;
  defaultDosage: string | null;
  defaultDosageUnit: string | null;
  defaultFrequency: string | null;
  defaultRoute: string | null;
  defaultDuration: string | null;
  contraindications: string | null;
  sideEffects: string | null;
  notes: string | null;
  isActive: boolean;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  species?: VetSpecies;
}

export interface CreateVetFormularyDto {
  itemId: number;
  speciesId?: number;
  defaultDosage?: string;
  defaultDosageUnit?: string;
  defaultFrequency?: string;
  defaultRoute?: string;
  defaultDuration?: string;
  contraindications?: string;
  sideEffects?: string;
  notes?: string;
}

export interface UpdateVetFormularyDto extends Partial<CreateVetFormularyDto> {
  isActive?: boolean;
}

export interface VetFormularyListQuery extends ListQueryParams {
  speciesId?: number;
  itemId?: number;
}

// ============================================================================
// LAB ORDERS
// ============================================================================

export interface VetLabOrder {
  id: number;
  orderNumber: string;
  visitId: number;
  testName: string;
  testCode: string | null;
  category: string | null;
  status: VetLabOrderStatus;
  priority: string;
  orderedById: number | null;
  orderedByName: string | null;
  orderedAt: string;
  sampleCollectedAt: string | null;
  sampleType: string | null;
  completedAt: string | null;
  notes: string | null;
  externalLabName: string | null;
  externalLabRefId: string | null;
  createdAt: string;
  updatedAt: string;
  results?: VetLabResult[];
}

export interface CreateVetLabOrderDto {
  testName: string;
  testCode?: string;
  category?: string;
  priority?: string;
  sampleType?: string;
  notes?: string;
  externalLabName?: string;
}

export interface UpdateVetLabOrderStatusDto {
  status: VetLabOrderStatus;
  notes?: string;
}

// ============================================================================
// LAB RESULTS
// ============================================================================

export interface VetLabResult {
  id: number;
  labOrderId: number;
  parameterName: string;
  value: string;
  unit: string | null;
  referenceMin: number | null;
  referenceMax: number | null;
  referenceRange: string | null;
  isAbnormal: boolean;
  flag: string | null;
  notes: string | null;
  enteredById: number | null;
  enteredAt: string;
  createdAt: string;
}

export interface CreateVetLabResultDto {
  parameterName: string;
  value: string;
  unit?: string;
  referenceMin?: number;
  referenceMax?: number;
  referenceRange?: string;
  isAbnormal?: boolean;
  flag?: string;
  notes?: string;
}

export interface EnterVetLabResultsDto {
  results: CreateVetLabResultDto[];
  notes?: string;
}

// ============================================================================
// LAB REFERENCE RANGES
// ============================================================================

export interface VetLabReferenceRange {
  id: number;
  speciesId: number;
  testCode: string;
  parameterName: string;
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
  displayRange: string | null;
  notes: string | null;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  species?: VetSpecies;
}

export interface CreateVetLabReferenceRangeDto {
  speciesId: number;
  testCode: string;
  parameterName: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  displayRange?: string;
  notes?: string;
}

export interface VetLabReferenceRangeListQuery extends ListQueryParams {
  speciesId?: number;
}

// ============================================================================
// PROCEDURES
// ============================================================================

export interface VetProcedure {
  id: number;
  visitId: number;
  procedureName: string;
  procedureCode: string | null;
  status: VetProcedureStatus;
  category: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  startedAt: string | null;
  completedAt: string | null;
  performedById: number | null;
  performedByName: string | null;
  assistedById: number | null;
  assistedByName: string | null;
  estimatedDuration: number | null;
  actualDuration: number | null;
  preOpNotes: string | null;
  procedureNotes: string | null;
  postOpNotes: string | null;
  complications: string | null;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
  checklist?: VetSurgeryChecklist;
  anesthesia?: VetAnesthesiaRecord;
  consumables?: VetProcedureConsumable[];
}

export interface CreateVetProcedureDto {
  procedureName: string;
  procedureCode?: string;
  category?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedDuration?: number;
  preOpNotes?: string;
}

export interface UpdateVetProcedureDto extends Partial<CreateVetProcedureDto> {
  status?: VetProcedureStatus;
  procedureNotes?: string;
  postOpNotes?: string;
  complications?: string;
  outcome?: string;
}

// ============================================================================
// SURGERY CHECKLIST
// ============================================================================

export interface VetSurgeryChecklist {
  id: number;
  procedureId: number;
  preOpFasting: boolean | null;
  preOpFastingHours: number | null;
  consentSigned: boolean;
  consentSignedAt: string | null;
  preOpBloodwork: boolean | null;
  preOpBloodworkNormal: boolean | null;
  ivCatheterPlaced: boolean | null;
  preMedAdministered: boolean | null;
  preMedDetails: string | null;
  surgicalSitePrepped: boolean | null;
  antibioticGiven: boolean | null;
  antibioticDetails: string | null;
  postOpPainManagement: string | null;
  postOpInstructions: string | null;
  dischargeInstructions: string | null;
  followUpDate: string | null;
  completedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateVetSurgeryChecklistDto {
  preOpFasting?: boolean;
  preOpFastingHours?: number;
  consentSigned?: boolean;
  consentSignedAt?: string;
  preOpBloodwork?: boolean;
  preOpBloodworkNormal?: boolean;
  ivCatheterPlaced?: boolean;
  preMedAdministered?: boolean;
  preMedDetails?: string;
  surgicalSitePrepped?: boolean;
  antibioticGiven?: boolean;
  antibioticDetails?: string;
  postOpPainManagement?: string;
  postOpInstructions?: string;
  dischargeInstructions?: string;
  followUpDate?: string;
}

// ============================================================================
// ANESTHESIA RECORDS
// ============================================================================

export interface VetAnesthesiaRecord {
  id: number;
  procedureId: number;
  anesthetistId: number | null;
  anesthetistName: string | null;
  anesthesiaType: string;
  inductionAgent: string | null;
  inductionDose: string | null;
  maintenanceAgent: string | null;
  maintenanceRate: string | null;
  intubationSize: string | null;
  oxygenFlowRate: string | null;
  preAnestheticRisk: string | null;
  startedAt: string | null;
  endedAt: string | null;
  totalDuration: number | null;
  monitoringLog: VetAnesthesiaMonitoringEntry[];
  complications: string | null;
  recoveryNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VetAnesthesiaMonitoringEntry {
  timestamp: string;
  heartRate: number | null;
  respiratoryRate: number | null;
  spo2: number | null;
  etco2: number | null;
  bloodPressure: string | null;
  temperature: number | null;
  notes: string | null;
}

export interface UpdateVetAnesthesiaRecordDto {
  anesthesiaType?: string;
  inductionAgent?: string;
  inductionDose?: string;
  maintenanceAgent?: string;
  maintenanceRate?: string;
  intubationSize?: string;
  oxygenFlowRate?: string;
  preAnestheticRisk?: string;
  startedAt?: string;
  endedAt?: string;
  monitoringLog?: VetAnesthesiaMonitoringEntry[];
  complications?: string;
  recoveryNotes?: string;
}

// ============================================================================
// PROCEDURE CONSUMABLES
// ============================================================================

export interface VetProcedureConsumable {
  id: number;
  procedureId: number;
  itemId: number;
  itemName: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes: string | null;
  createdAt: string;
}

export interface CreateVetProcedureConsumableDto {
  itemId: number;
  quantity: number;
  unitCost?: number;
  notes?: string;
}

// ============================================================================
// PRICE LISTS
// ============================================================================

export interface VetPriceList {
  id: number;
  name: string;
  description: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isDefault: boolean;
  isActive: boolean;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  items?: VetPriceListItem[];
  itemCount?: number;
}

export interface VetPriceListItem {
  id: number;
  priceListId: number;
  serviceType: string;
  serviceCode: string | null;
  serviceName: string;
  description: string | null;
  unitPrice: number;
  currency: string;
  taxable: boolean;
  taxRate: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVetPriceListDto {
  name: string;
  description?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isDefault?: boolean;
}

export interface UpdateVetPriceListDto extends Partial<CreateVetPriceListDto> {
  isActive?: boolean;
}

export interface CreateVetPriceListItemDto {
  serviceType: string;
  serviceCode?: string;
  serviceName: string;
  description?: string;
  unitPrice: number;
  currency?: string;
  taxable?: boolean;
  taxRate?: number;
}

export interface VetPriceListListQuery extends ListQueryParams {}

// ============================================================================
// VISIT CHARGES
// ============================================================================

export interface VetVisitCharge {
  id: number;
  visitId: number;
  priceListItemId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  notes: string | null;
  chargedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVetVisitChargeDto {
  priceListItemId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  notes?: string;
}

// ============================================================================
// SETTINGS
// ============================================================================

export interface VetSettings {
  id: number;
  companyId: number;
  defaultPriceListId: number | null;
  appointmentDuration: number;
  appointmentSlotInterval: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: number[];
  enableOnlineBooking: boolean;
  enableSmsReminders: boolean;
  reminderHoursBefore: number;
  visitNumberPrefix: string;
  appointmentNumberPrefix: string;
  labOrderNumberPrefix: string;
  defaultTemperatureUnit: string;
  defaultWeightUnit: string;
  enableAutoCharging: boolean;
  enableDispensingIntegration: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateVetSettingsDto {
  defaultPriceListId?: number;
  appointmentDuration?: number;
  appointmentSlotInterval?: number;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: number[];
  enableOnlineBooking?: boolean;
  enableSmsReminders?: boolean;
  reminderHoursBefore?: number;
  visitNumberPrefix?: string;
  appointmentNumberPrefix?: string;
  labOrderNumberPrefix?: string;
  defaultTemperatureUnit?: string;
  defaultWeightUnit?: string;
  enableAutoCharging?: boolean;
  enableDispensingIntegration?: boolean;
}

// ============================================================================
// DASHBOARD
// ============================================================================

export interface VetDashboardStats {
  appointmentsToday: number;
  appointmentsThisWeek: number;
  visitsToday: number;
  activeVisits: number;
  pendingLabOrders: number;
  pendingPrescriptions: number;
  totalClients: number;
  totalAnimals: number;
  revenueToday: number;
  revenueThisMonth: number;
  topSpecies: VetSpeciesCount[];
  appointmentsByType: VetAppointmentTypeCount[];
}

export interface VetSpeciesCount {
  speciesId: number;
  speciesName: string;
  count: number;
}

export interface VetAppointmentTypeCount {
  type: VetAppointmentType;
  count: number;
}

export interface VetAppointmentTodayEntry {
  id: number;
  appointmentNumber: string;
  scheduledTime: string;
  appointmentType: VetAppointmentType;
  status: VetAppointmentStatus;
  clientName: string;
  animalName: string;
  species: string;
  providerName: string;
  reason: string | null;
}

export interface VetRevenueSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  lastMonth: number;
  byCategory: VetRevenueCategoryEntry[];
}

export interface VetRevenueCategoryEntry {
  category: string;
  amount: number;
}

export interface VetStockAlert {
  itemId: number;
  itemName: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
}

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

export type { PaginatedResponse, ListQueryParams };
