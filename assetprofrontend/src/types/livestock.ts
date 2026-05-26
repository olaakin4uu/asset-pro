// ============================================================================
// LIVESTOCK MODULE TYPES — Phase 1: Foundation & Master Data
// ============================================================================

// --- Enums as const arrays ---

export const LSK_SITE_STATUSES = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DECOMMISSIONED'] as const;
export type LskSiteStatus = typeof LSK_SITE_STATUSES[number];

export const LSK_UNIT_TYPES = ['POND', 'TANK', 'HOUSE', 'SHED', 'PEN', 'PADDOCK', 'PARLOR', 'STORE', 'PROCESSING', 'HATCHERY', 'NURSERY', 'FARROWING_CRATE', 'OTHER'] as const;
export type LskUnitType = typeof LSK_UNIT_TYPES[number];

export const LSK_UNIT_STATUSES = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'CLEANING', 'QUARANTINE', 'DECOMMISSIONED'] as const;
export type LskUnitStatus = typeof LSK_UNIT_STATUSES[number];

export const LSK_SPECIES_CATEGORIES = ['FISH', 'POULTRY', 'CATTLE', 'GOAT', 'SHEEP', 'PIG', 'OTHER'] as const;
export type LskSpeciesCategory = typeof LSK_SPECIES_CATEGORIES[number];

export const LSK_PRODUCTION_TYPES = ['MEAT', 'EGGS', 'MILK', 'BREEDING', 'DUAL_PURPOSE', 'FINGERLINGS', 'TABLE_FISH', 'OTHER'] as const;
export type LskProductionType = typeof LSK_PRODUCTION_TYPES[number];

export const LSK_FEED_CATEGORIES = ['STARTER', 'GROWER', 'FINISHER', 'LAYER_MASH', 'BROILER_STARTER', 'BROILER_FINISHER', 'CREEP_FEED', 'SOW_FEED', 'BOAR_FEED', 'TMR', 'CONCENTRATE', 'SUPPLEMENT', 'PREMIX', 'RAW_INGREDIENT', 'OTHER'] as const;
export type LskFeedCategory = typeof LSK_FEED_CATEGORIES[number];

export const LSK_MORTALITY_CATEGORIES = ['DISEASE', 'PREDATOR', 'ENVIRONMENTAL', 'HANDLING', 'UNKNOWN', 'CULLING', 'NATURAL', 'ACCIDENT', 'OTHER'] as const;
export type LskMortalityCategory = typeof LSK_MORTALITY_CATEGORIES[number];

export const LSK_DISEASE_CATEGORIES = ['BACTERIAL', 'VIRAL', 'PARASITIC', 'FUNGAL', 'NUTRITIONAL', 'METABOLIC', 'ENVIRONMENTAL', 'GENETIC', 'UNKNOWN', 'OTHER'] as const;
export type LskDiseaseCategory = typeof LSK_DISEASE_CATEGORIES[number];

export const LSK_MEDICATION_ROUTES = ['ORAL', 'INJECTION_IM', 'INJECTION_IV', 'INJECTION_SC', 'TOPICAL', 'IN_WATER', 'IN_FEED', 'SPRAY', 'POUR_ON', 'INTRAMAMMARY', 'OTHER'] as const;
export type LskMedicationRoute = typeof LSK_MEDICATION_ROUTES[number];

export const LSK_VACCINE_ROUTES = ['ORAL', 'INJECTION_IM', 'INJECTION_SC', 'EYE_DROP', 'SPRAY', 'IN_WATER', 'WING_WEB', 'OTHER'] as const;
export type LskVaccineRoute = typeof LSK_VACCINE_ROUTES[number];

// --- Interfaces ---

// Settings
export interface LskSettings {
  id: number;
  companyId: number;
  defaultCurrencyCode: string | null;
  weightUnit: string;
  temperatureUnit: string;
  volumeUnit: string;
  enableIotIntegration: boolean;
  enableBiosecurity: boolean;
  mortalityAlertThreshold: number | null;
  fcrAlertThreshold: number | null;
  autoNumberPrefix: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateLskSettingsDto {
  defaultCurrencyCode?: string;
  weightUnit?: string;
  temperatureUnit?: string;
  volumeUnit?: string;
  enableIotIntegration?: boolean;
  enableBiosecurity?: boolean;
  mortalityAlertThreshold?: number;
  fcrAlertThreshold?: number;
  autoNumberPrefix?: string;
}

// Sites
export interface LskSite {
  id: number;
  companyId: number;
  siteCode: string;
  name: string;
  siteType: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  status: LskSiteStatus;
  isActive: boolean;
  createdById: number | null;
  updatedById: number | null;
  createdByName?: string;
  updatedByName?: string;
  unitCount?: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskSiteDto {
  siteCode: string;
  name: string;
  siteType: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: LskSiteStatus;
  isActive?: boolean;
}

export interface UpdateLskSiteDto extends Partial<CreateLskSiteDto> {}

export interface LskSiteQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: LskSiteStatus;
  isActive?: boolean;
}

// Site Units
export interface LskSiteUnit {
  id: number;
  companyId: number;
  siteId: number;
  siteName?: string;
  unitCode: string;
  name: string;
  unitType: LskUnitType;
  status: LskUnitStatus;
  capacity: number | null;
  capacityUnit: string | null;
  areaSize: number | null;
  areaSizeUnit: string | null;
  volumeCapacity: number | null;
  volumeUnit: string | null;
  description: string | null;
  notes: string | null;
  isActive: boolean;
  createdById: number | null;
  updatedById: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskSiteUnitDto {
  siteId: number;
  unitCode: string;
  name: string;
  unitType: LskUnitType;
  status?: LskUnitStatus;
  capacity?: number;
  capacityUnit?: string;
  areaSize?: number;
  areaSizeUnit?: string;
  volumeCapacity?: number;
  volumeUnit?: string;
  description?: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateLskSiteUnitDto extends Partial<CreateLskSiteUnitDto> {}

export interface LskSiteUnitQuery {
  page?: number;
  limit?: number;
  search?: string;
  siteId?: number;
  unitType?: LskUnitType;
  status?: LskUnitStatus;
  isActive?: boolean;
}

// Species
export interface LskSpecies {
  id: number;
  companyId: number;
  speciesCode: string;
  name: string;
  scientificName: string | null;
  category: LskSpeciesCategory;
  description: string | null;
  defaultProductionType: LskProductionType | null;
  iconUrl: string | null;
  isActive: boolean;
  breedCount?: number;
  createdById: number | null;
  updatedById: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskSpeciesDto {
  speciesCode: string;
  name: string;
  scientificName?: string;
  category: LskSpeciesCategory;
  description?: string;
  defaultProductionType?: LskProductionType;
  iconUrl?: string;
  isActive?: boolean;
}

export interface UpdateLskSpeciesDto extends Partial<CreateLskSpeciesDto> {}

export interface LskSpeciesQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: LskSpeciesCategory;
  isActive?: boolean;
}

// Breeds
export interface LskBreed {
  id: number;
  companyId: number;
  speciesId: number;
  speciesName?: string;
  breedCode: string;
  name: string;
  origin: string | null;
  description: string | null;
  traits: Record<string, unknown> | null;
  avgMatureWeight: number | null;
  avgDailyGain: number | null;
  avgFcr: number | null;
  gestationDays: number | null;
  maturityDays: number | null;
  isActive: boolean;
  createdById: number | null;
  updatedById: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskBreedDto {
  speciesId: number;
  breedCode: string;
  name: string;
  origin?: string;
  description?: string;
  traits?: Record<string, unknown>;
  avgMatureWeight?: number;
  avgDailyGain?: number;
  avgFcr?: number;
  gestationDays?: number;
  maturityDays?: number;
  isActive?: boolean;
}

export interface UpdateLskBreedDto extends Partial<CreateLskBreedDto> {}

export interface LskBreedQuery {
  page?: number;
  limit?: number;
  search?: string;
  speciesId?: number;
  isActive?: boolean;
}

// Mortality Reasons
export interface LskMortalityReason {
  id: number;
  companyId: number;
  code: string;
  name: string;
  category: LskMortalityCategory;
  speciesCategory: LskSpeciesCategory | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskMortalityReasonDto {
  code: string;
  name: string;
  category: LskMortalityCategory;
  speciesCategory?: LskSpeciesCategory;
  description?: string;
  isActive?: boolean;
}

export interface UpdateLskMortalityReasonDto extends Partial<CreateLskMortalityReasonDto> {}

export interface LskMortalityReasonQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: LskMortalityCategory;
  speciesCategory?: LskSpeciesCategory;
}

// Cull Reasons
export interface LskCullReason {
  id: number;
  companyId: number;
  code: string;
  name: string;
  speciesCategory: LskSpeciesCategory | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskCullReasonDto {
  code: string;
  name: string;
  speciesCategory?: LskSpeciesCategory;
  description?: string;
  isActive?: boolean;
}

export interface UpdateLskCullReasonDto extends Partial<CreateLskCullReasonDto> {}

export interface LskCullReasonQuery {
  page?: number;
  limit?: number;
  search?: string;
  speciesCategory?: LskSpeciesCategory;
}

// Disease Codes
export interface LskDiseaseCode {
  id: number;
  companyId: number;
  code: string;
  name: string;
  category: LskDiseaseCategory;
  speciesCategory: LskSpeciesCategory | null;
  symptoms: string | null;
  prevention: string | null;
  commonTreatment: string | null;
  isNotifiable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskDiseaseCodeDto {
  code: string;
  name: string;
  category: LskDiseaseCategory;
  speciesCategory?: LskSpeciesCategory;
  symptoms?: string;
  prevention?: string;
  commonTreatment?: string;
  isNotifiable?: boolean;
  isActive?: boolean;
}

export interface UpdateLskDiseaseCodeDto extends Partial<CreateLskDiseaseCodeDto> {}

export interface LskDiseaseCodeQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: LskDiseaseCategory;
  speciesCategory?: LskSpeciesCategory;
  isNotifiable?: boolean;
}

// Medication Catalog
export interface LskMedication {
  id: number;
  companyId: number;
  code: string;
  name: string;
  genericName: string | null;
  category: string;
  route: LskMedicationRoute;
  dosageUnit: string;
  defaultDosage: string | null;
  withdrawalDaysMeat: number | null;
  withdrawalDaysMilk: number | null;
  withdrawalDaysEggs: number | null;
  withdrawalDaysFish: number | null;
  storageConditions: string | null;
  requiresVetApproval: boolean;
  speciesCategories: LskSpeciesCategory[] | null;
  isActive: boolean;
  createdById: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskMedicationDto {
  code: string;
  name: string;
  genericName?: string;
  category: string;
  route: LskMedicationRoute;
  dosageUnit: string;
  defaultDosage?: string;
  withdrawalDaysMeat?: number;
  withdrawalDaysMilk?: number;
  withdrawalDaysEggs?: number;
  withdrawalDaysFish?: number;
  storageConditions?: string;
  requiresVetApproval?: boolean;
  speciesCategories?: LskSpeciesCategory[];
  isActive?: boolean;
}

export interface UpdateLskMedicationDto extends Partial<CreateLskMedicationDto> {}

export interface LskMedicationQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  route?: LskMedicationRoute;
  requiresVetApproval?: boolean;
  isActive?: boolean;
}

// Vaccine Schedules
export interface LskVaccineSchedule {
  id: number;
  companyId: number;
  speciesId: number;
  speciesName?: string;
  name: string;
  vaccineName: string;
  diseaseTarget: string;
  route: LskVaccineRoute;
  flockPurpose: LskFlockPurpose | null;
  ageAtAdminDays: number | null;
  repeatIntervalDays: number | null;
  dosage: string | null;
  dosageUnit: string | null;
  withdrawalDaysMeat: number | null;
  withdrawalDaysMilk: number | null;
  withdrawalDaysEggs: number | null;
  notes: string | null;
  isMandatory: boolean;
  isActive: boolean;
  createdById: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskVaccineScheduleDto {
  speciesId: number;
  name: string;
  vaccineName: string;
  diseaseTarget: string;
  route: LskVaccineRoute;
  flockPurpose?: LskFlockPurpose | null;
  ageAtAdminDays?: number;
  repeatIntervalDays?: number;
  dosage?: string;
  dosageUnit?: string;
  withdrawalDaysMeat?: number;
  withdrawalDaysMilk?: number;
  withdrawalDaysEggs?: number;
  notes?: string;
  isMandatory?: boolean;
  isActive?: boolean;
}

export interface UpdateLskVaccineScheduleDto extends Partial<CreateLskVaccineScheduleDto> {}

export interface LskVaccineScheduleQuery {
  page?: number;
  limit?: number;
  search?: string;
  speciesId?: number;
  isMandatory?: boolean;
  isActive?: boolean;
}

// Feed Types
export interface LskFeedType {
  id: number;
  companyId: number;
  code: string;
  name: string;
  category: LskFeedCategory;
  speciesCategory: LskSpeciesCategory | null;
  proteinPercent: number | null;
  energyKcalPerKg: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskFeedTypeDto {
  code: string;
  name: string;
  category: LskFeedCategory;
  speciesCategory?: LskSpeciesCategory;
  proteinPercent?: number;
  energyKcalPerKg?: number;
  description?: string;
  isActive?: boolean;
}

export interface UpdateLskFeedTypeDto extends Partial<CreateLskFeedTypeDto> {}

export interface LskFeedTypeQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: LskFeedCategory;
  speciesCategory?: LskSpeciesCategory;
  isActive?: boolean;
}

// Feed Programs
export interface LskFeedProgramPhase {
  id: number;
  companyId: number;
  feedProgramId: number;
  phaseName: string;
  phaseOrder: number;
  startDay: number;
  endDay: number;
  feedTypeId: number | null;
  feedTypeName?: string;
  targetIntakePerDay: number | null;
  targetIntakeUnit: string | null;
  proteinTarget: number | null;
  energyTarget: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LskFeedProgram {
  id: number;
  companyId: number;
  speciesId: number;
  speciesName?: string;
  breedId: number | null;
  breedName?: string;
  productionType: LskProductionType | null;
  name: string;
  description: string | null;
  totalDays: number | null;
  isDefault: boolean;
  isActive: boolean;
  phases?: LskFeedProgramPhase[];
  createdById: number | null;
  updatedById: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskFeedProgramPhaseDto {
  phaseName: string;
  phaseOrder: number;
  startDay: number;
  endDay: number;
  feedTypeId?: number;
  targetIntakePerDay?: number;
  targetIntakeUnit?: string;
  proteinTarget?: number;
  energyTarget?: number;
  notes?: string;
}

export interface CreateLskFeedProgramDto {
  speciesId: number;
  breedId?: number;
  productionType?: LskProductionType;
  name: string;
  description?: string;
  totalDays?: number;
  isDefault?: boolean;
  isActive?: boolean;
  phases?: CreateLskFeedProgramPhaseDto[];
}

export interface UpdateLskFeedProgramDto extends Partial<CreateLskFeedProgramDto> {}

export interface LskFeedProgramQuery {
  page?: number;
  limit?: number;
  search?: string;
  speciesId?: number;
  productionType?: LskProductionType;
  isDefault?: boolean;
  isActive?: boolean;
}

// --- Pagination Response ---

export interface LskPaginatedResponse<T> {
  data: T[];
  total: number;
}

// --- Stats ---

export interface LskBasicStats {
  total: number;
  active: number;
  inactive: number;
}

// ============================================================================
// Phase 2: Fish (Aquaculture) Types
// ============================================================================

export const LSK_COHORT_STATUSES = ['PLANNED', 'STOCKING', 'GROWING', 'HARVESTING', 'CLOSED', 'CANCELLED'] as const;
export type LskCohortStatus = typeof LSK_COHORT_STATUSES[number];

export const LSK_WATER_PARAM_TYPES = ['DISSOLVED_OXYGEN', 'PH', 'TEMPERATURE', 'AMMONIA', 'NITRITE', 'NITRATE', 'TURBIDITY', 'SALINITY', 'ALKALINITY', 'HARDNESS', 'OTHER'] as const;
export type LskWaterParamType = typeof LSK_WATER_PARAM_TYPES[number];

export const LSK_HARVEST_METHODS = ['SEINE_NET', 'DRAIN_HARVEST', 'PARTIAL_HARVEST', 'CAST_NET', 'TRAP', 'OTHER'] as const;
export type LskHarvestMethod = typeof LSK_HARVEST_METHODS[number];

export const LSK_FISH_GRADE_CATEGORIES = ['JUMBO', 'LARGE', 'MEDIUM', 'SMALL', 'UNDERSIZED', 'REJECT'] as const;
export type LskFishGradeCategory = typeof LSK_FISH_GRADE_CATEGORIES[number];

// Fish Cohort
export interface LskFishCohort {
  id: number;
  companyId: number;
  siteId: number;
  siteName?: string;
  siteUnitId: number;
  siteUnitName?: string;
  cohortCode: string;
  speciesId: number;
  speciesName?: string;
  breedId: number | null;
  breedName?: string;
  status: LskCohortStatus;
  stockingDate: string | null;
  stockingQty: number | null;
  avgStockingWeightG: number | null;
  initialBiomassKg: number | null;
  targetHarvestDate: string | null;
  targetHarvestWeightG: number | null;
  feedProgramId: number | null;
  feedProgramName?: string;
  currentEstBiomassKg: number | null;
  currentEstAliveQty: number | null;
  currentAvgWeightG: number | null;
  totalFeedIssuedKg: number;
  totalMortalities: number;
  totalHarvestedQty: number;
  totalHarvestedKg: number;
  closedAt: string | null;
  closureNotes: string | null;
  notes: string | null;
  createdById: number | null;
  updatedById: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskFishCohortDto {
  siteId: number;
  siteUnitId: number;
  cohortCode: string;
  speciesId: number;
  breedId?: number;
  stockingDate?: string;
  stockingQty?: number;
  avgStockingWeightG?: number;
  targetHarvestDate?: string;
  targetHarvestWeightG?: number;
  feedProgramId?: number;
  notes?: string;
}

export interface UpdateLskFishCohortDto extends Partial<CreateLskFishCohortDto> {}

export interface LskFishCohortQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: LskCohortStatus;
  siteId?: number;
  speciesId?: number;
}

export interface LskFishCohortStats {
  total: number;
  planned: number;
  growing: number;
  harvesting: number;
  closed: number;
}

// Water Quality
export interface LskFishWaterReading {
  id: number;
  companyId: number;
  cohortId: number | null;
  siteUnitId: number;
  siteUnitName?: string;
  paramType: LskWaterParamType;
  value: number;
  unit: string;
  readingTime: string;
  isIotReading: boolean;
  deviceId: string | null;
  isAlert: boolean;
  alertMessage: string | null;
  recordedById: number | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateLskWaterReadingDto {
  cohortId?: number;
  siteUnitId: number;
  paramType: LskWaterParamType;
  value: number;
  unit: string;
  readingTime: string;
  isIotReading?: boolean;
  deviceId?: string;
  notes?: string;
}

export interface LskWaterReadingQuery {
  page?: number;
  limit?: number;
  siteUnitId?: number;
  cohortId?: number;
  paramType?: LskWaterParamType;
  startDate?: string;
  endDate?: string;
  isAlert?: boolean;
}

export interface LskFishWaterThreshold {
  id: number;
  companyId: number;
  speciesId: number | null;
  paramType: LskWaterParamType;
  minValue: number | null;
  maxValue: number | null;
  unit: string;
  alertEnabled: boolean;
  isActive: boolean;
}

// Feeding
export interface LskFishFeedingEvent {
  id: number;
  companyId: number;
  cohortId: number;
  cohortCode?: string;
  feedDate: string;
  feedTypeId: number | null;
  feedTypeName?: string;
  feedItemName: string | null;
  quantityKg: number;
  costPerKg: number | null;
  totalCost: number | null;
  estBiomassAtFeedKg: number | null;
  feedingRate: number | null;
  notes: string | null;
  recordedById: number | null;
  createdAt: string;
}

export interface CreateLskFishFeedingDto {
  cohortId: number;
  feedDate: string;
  feedTypeId?: number;
  feedItemName?: string;
  quantityKg: number;
  costPerKg?: number;
  notes?: string;
}

export interface LskFishFeedingQuery {
  page?: number;
  limit?: number;
  cohortId?: number;
  startDate?: string;
  endDate?: string;
}

// Sampling
export interface LskFishSampling {
  id: number;
  companyId: number;
  cohortId: number;
  cohortCode?: string;
  samplingDate: string;
  sampleCount: number;
  avgWeightG: number;
  minWeightG: number | null;
  maxWeightG: number | null;
  stdDevWeightG: number | null;
  estimatedAliveQty: number | null;
  estimatedBiomassKg: number | null;
  sgr: number | null;
  cumulativeFcr: number | null;
  notes: string | null;
  sampledById: number | null;
  createdAt: string;
}

export interface CreateLskFishSamplingDto {
  cohortId: number;
  samplingDate: string;
  sampleCount: number;
  avgWeightG: number;
  minWeightG?: number;
  maxWeightG?: number;
  stdDevWeightG?: number;
  estimatedAliveQty?: number;
  notes?: string;
}

export interface LskFishSamplingQuery {
  page?: number;
  limit?: number;
  cohortId?: number;
  startDate?: string;
  endDate?: string;
}

// Mortality
export interface LskFishMortality {
  id: number;
  companyId: number;
  cohortId: number;
  cohortCode?: string;
  mortalityDate: string;
  quantity: number;
  estimatedWeightLostKg: number | null;
  reasonId: number | null;
  reasonName?: string;
  reasonNotes: string | null;
  recordedById: number | null;
  createdAt: string;
}

export interface CreateLskFishMortalityDto {
  cohortId: number;
  mortalityDate: string;
  quantity: number;
  estimatedWeightLostKg?: number;
  reasonId?: number;
  reasonNotes?: string;
}

export interface LskFishMortalityQuery {
  page?: number;
  limit?: number;
  cohortId?: number;
  startDate?: string;
  endDate?: string;
  reasonId?: number;
}

// Harvest
export interface LskFishHarvestGrade {
  id: number;
  companyId: number;
  harvestId: number;
  gradeCategory: LskFishGradeCategory;
  quantity: number;
  weightKg: number;
  pricePerKg: number | null;
  totalValue: number | null;
  notes: string | null;
}

export interface LskFishHarvest {
  id: number;
  companyId: number;
  cohortId: number;
  cohortCode?: string;
  harvestCode: string;
  harvestDate: string;
  harvestMethod: LskHarvestMethod;
  totalQuantity: number;
  totalWeightKg: number;
  avgWeightG: number | null;
  yieldPercent: number | null;
  lossQuantity: number | null;
  lossWeightKg: number | null;
  isPartialHarvest: boolean;
  notes: string | null;
  grades?: LskFishHarvestGrade[];
  harvestedById: number | null;
  createdAt: string;
}

export interface CreateLskFishHarvestGradeDto {
  gradeCategory: LskFishGradeCategory;
  quantity: number;
  weightKg: number;
  pricePerKg?: number;
}

export interface CreateLskFishHarvestDto {
  cohortId: number;
  harvestCode: string;
  harvestDate: string;
  harvestMethod: LskHarvestMethod;
  totalQuantity: number;
  totalWeightKg: number;
  lossQuantity?: number;
  lossWeightKg?: number;
  isPartialHarvest?: boolean;
  notes?: string;
  grades?: CreateLskFishHarvestGradeDto[];
}

export interface LskFishHarvestQuery {
  page?: number;
  limit?: number;
  cohortId?: number;
  startDate?: string;
  endDate?: string;
  harvestMethod?: LskHarvestMethod;
}

// Transfer
export interface LskFishTransfer {
  id: number;
  companyId: number;
  fromCohortId: number;
  fromCohortCode?: string;
  toCohortId: number | null;
  toCohortCode?: string;
  fromSiteUnitId: number;
  fromUnitName?: string;
  toSiteUnitId: number;
  toUnitName?: string;
  transferDate: string;
  quantity: number;
  avgWeightG: number | null;
  reason: string | null;
  notes: string | null;
  transferredById: number | null;
  createdAt: string;
}

export interface CreateLskFishTransferDto {
  fromCohortId: number;
  toCohortId?: number;
  fromSiteUnitId: number;
  toSiteUnitId: number;
  transferDate: string;
  quantity: number;
  avgWeightG?: number;
  reason?: string;
  notes?: string;
}

// Cohort Summary (aggregated KPIs)
export interface LskFishCohortSummary {
  cohort: LskFishCohort;
  cycleDays: number | null;
  survivalPercent: number | null;
  fcr: number | null;
  avgSgr: number | null;
  totalCost: number | null;
  costPerKg: number | null;
}

// ============================================================================
// Phase 3: Poultry Types
// ============================================================================

export const LSK_FLOCK_STATUSES = ['PLANNED', 'BROODING', 'GROWING', 'LAYING', 'CULLING', 'CLOSED', 'CANCELLED'] as const;
export type LskFlockStatus = typeof LSK_FLOCK_STATUSES[number];

export const LSK_FLOCK_PURPOSES = ['BROILER', 'LAYER', 'BREEDER', 'DUAL_PURPOSE'] as const;
export type LskFlockPurpose = typeof LSK_FLOCK_PURPOSES[number];

export const LSK_EGG_GRADES = ['A', 'B', 'DIRTY', 'CRACKED', 'BROKEN', 'REJECT'] as const;
export type LskEggGrade = typeof LSK_EGG_GRADES[number];

export const LSK_VACCINATION_STATUSES = ['SCHEDULED', 'COMPLETED', 'MISSED', 'PARTIAL', 'CANCELLED'] as const;
export type LskVaccinationStatus = typeof LSK_VACCINATION_STATUSES[number];

export interface LskFlock {
  id: number;
  companyId: number;
  siteId: number;
  siteName?: string;
  siteUnitId: number;
  siteUnitName?: string;
  flockCode: string;
  speciesId: number;
  speciesName?: string;
  breedId: number | null;
  breedName?: string;
  hatcherySourceId: number | null;
  hatcherySourceName?: string;
  hatcheryBatchRef: string | null;
  purpose: LskFlockPurpose;
  status: LskFlockStatus;
  placementDate: string | null;
  placementQty: number | null;
  avgPlacementWeightG: number | null;
  targetMarketDate: string | null;
  targetMarketWeightG: number | null;
  feedProgramId: number | null;
  currentEstAliveQty: number | null;
  currentAvgWeightG: number | null;
  totalFeedIssuedKg: number;
  totalMortalities: number;
  totalCulls: number;
  totalEggsCollected: number;
  closedAt: string | null;
  closureNotes: string | null;
  notes: string | null;
  createdById: number | null;
  updatedById: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskFlockDto {
  siteId: number;
  siteUnitId: number;
  flockCode: string;
  speciesId: number;
  breedId?: number;
  hatcherySourceId?: number;
  hatcheryBatchRef?: string;
  purpose: LskFlockPurpose;
  placementDate?: string;
  placementQty?: number;
  avgPlacementWeightG?: number;
  targetMarketDate?: string;
  targetMarketWeightG?: number;
  feedProgramId?: number;
  notes?: string;
}

export interface UpdateLskFlockDto extends Partial<CreateLskFlockDto> {}

export interface LskFlockQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: LskFlockStatus;
  purpose?: LskFlockPurpose;
  siteId?: number;
  speciesId?: number;
}

export interface LskFlockStats {
  total: number;
  planned: number;
  brooding: number;
  growing: number;
  laying: number;
  closed: number;
  byPurpose: { broiler: number; layer: number; breeder: number };
}

export interface LskFlockBrooding {
  id: number;
  companyId: number;
  flockId: number;
  recordDate: string;
  temperatureC: number | null;
  humidityPercent: number | null;
  ventilationRate: string | null;
  lighthours: number | null;
  ammoniaPpm: number | null;
  co2Ppm: number | null;
  isWithinSpec: boolean;
  notes: string | null;
  recordedById: number | null;
  createdAt: string;
}

export interface CreateLskFlockBroodingDto {
  flockId: number;
  recordDate: string;
  temperatureC?: number;
  humidityPercent?: number;
  ventilationRate?: string;
  lighthours?: number;
  ammoniaPpm?: number;
  co2Ppm?: number;
  notes?: string;
}

export interface LskFlockEnvironment {
  id: number;
  companyId: number;
  flockId: number | null;
  siteUnitId: number;
  siteUnitName?: string;
  recordTime: string;
  temperatureC: number | null;
  humidityPercent: number | null;
  ammoniaPpm: number | null;
  co2Ppm: number | null;
  lightLux: number | null;
  ventilationRate: string | null;
  isIotReading: boolean;
  deviceId: string | null;
  isAlert: boolean;
  alertMessage: string | null;
  recordedById: number | null;
  createdAt: string;
}

export interface CreateLskFlockEnvironmentDto {
  flockId?: number;
  siteUnitId: number;
  recordTime: string;
  temperatureC?: number;
  humidityPercent?: number;
  ammoniaPpm?: number;
  co2Ppm?: number;
  lightLux?: number;
  ventilationRate?: string;
  isIotReading?: boolean;
  deviceId?: string;
  notes?: string;
}

export interface LskFlockFeedingEvent {
  id: number;
  companyId: number;
  flockId: number;
  flockCode?: string;
  feedDate: string;
  feedTypeId: number | null;
  feedTypeName?: string;
  feedItemName: string | null;
  feedPhase: string | null;
  quantityKg: number;
  costPerKg: number | null;
  totalCost: number | null;
  notes: string | null;
  recordedById: number | null;
  fedById: number | null;
  fedByUserName?: string | null;
  fedByName: string | null;
  witnessedById: number | null;
  witnessedByUserName?: string | null;
  witnessedAt: string | null;
  createdAt: string;
}

export interface CreateLskFlockFeedingDto {
  flockId: number;
  feedDate: string;
  feedTypeId?: number;
  feedItemName?: string;
  feedPhase?: string;
  quantityKg: number;
  costPerKg?: number;
  notes?: string;
  fedById?: number;
  fedByName?: string;
  witnessedById?: number;
}

export interface LskFlockWeightSample {
  id: number;
  companyId: number;
  flockId: number;
  flockCode?: string;
  sampleDate: string;
  sampleCount: number;
  avgWeightG: number;
  minWeightG: number | null;
  maxWeightG: number | null;
  uniformityPercent: number | null;
  targetWeightG: number | null;
  deviationPercent: number | null;
  cumulativeFcr: number | null;
  notes: string | null;
  sampledById: number | null;
  createdAt: string;
}

export interface CreateLskFlockWeightDto {
  flockId: number;
  sampleDate: string;
  sampleCount: number;
  avgWeightG: number;
  minWeightG?: number;
  maxWeightG?: number;
  uniformityPercent?: number;
  notes?: string;
}

export interface LskFlockMortality {
  id: number;
  companyId: number;
  flockId: number;
  flockCode?: string;
  mortalityDate: string;
  deadQty: number;
  cullQty: number;
  reasonId: number | null;
  reasonName?: string;
  cullReasonId: number | null;
  cullReasonName?: string;
  reasonNotes: string | null;
  recordedById: number | null;
  createdAt: string;
}

export interface CreateLskFlockMortalityDto {
  flockId: number;
  mortalityDate: string;
  deadQty?: number;
  cullQty?: number;
  reasonId?: number;
  cullReasonId?: number;
  reasonNotes?: string;
}

export interface LskFlockVaccination {
  id: number;
  companyId: number;
  flockId: number;
  flockCode?: string;
  vaccineScheduleId: number | null;
  vaccineName: string;
  diseaseTarget: string | null;
  route: string | null;
  batchNumber: string | null;
  scheduledDate: string | null;
  administeredDate: string | null;
  dosage: string | null;
  dosageUnit: string | null;
  birdsVaccinated: number | null;
  status: LskVaccinationStatus;
  withdrawalDaysMeat: number | null;
  withdrawalDaysEggs: number | null;
  clearanceDate: string | null;
  administeredById: number | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateLskFlockVaccinationDto {
  flockId: number;
  vaccineScheduleId?: number;
  vaccineName: string;
  diseaseTarget?: string;
  route?: string;
  batchNumber?: string;
  scheduledDate?: string;
  administeredDate?: string;
  dosage?: string;
  dosageUnit?: string;
  birdsVaccinated?: number;
  status?: LskVaccinationStatus;
  withdrawalDaysMeat?: number;
  withdrawalDaysEggs?: number;
  notes?: string;
}

export interface UpdateLskFlockVaccinationDto extends Partial<CreateLskFlockVaccinationDto> {}

export interface LskFlockEggCollection {
  id: number;
  companyId: number;
  flockId: number;
  flockCode?: string;
  collectionDate: string;
  totalEggs: number;
  gradeA: number;
  gradeB: number;
  dirty: number;
  cracked: number;
  broken: number;
  reject: number;
  henCount: number | null;
  henDayPercent: number | null;
  feedPerDozen: number | null;
  notes: string | null;
  collectedById: number | null;
  createdAt: string;
}

export interface CreateLskFlockEggCollectionDto {
  flockId: number;
  collectionDate: string;
  totalEggs: number;
  gradeA?: number;
  gradeB?: number;
  dirty?: number;
  cracked?: number;
  broken?: number;
  reject?: number;
  henCount?: number;
  notes?: string;
}

export interface LskFlockSummary {
  flock: LskFlock;
  cycleDays: number | null;
  mortalityPercent: number | null;
  fcr: number | null;
  avgHenDayPercent: number | null;
  totalCost: number | null;
  costPerKg: number | null;
  costPerDozen: number | null;
}

// ============================================================================
// Phase 4: Large Animals (Cattle & Small Ruminants) Types
// ============================================================================

export const LSK_ANIMAL_STATUSES = ['ACTIVE', 'DRY', 'PREGNANT', 'LACTATING', 'GROWING', 'FATTENING', 'SOLD', 'DECEASED', 'CULLED', 'TRANSFERRED'] as const;
export type LskAnimalStatus = typeof LSK_ANIMAL_STATUSES[number];

export const LSK_ANIMAL_SEXES = ['MALE', 'FEMALE', 'CASTRATED', 'UNKNOWN'] as const;
export type LskAnimalSex = typeof LSK_ANIMAL_SEXES[number];

export const LSK_BREEDING_METHODS = ['NATURAL', 'ARTIFICIAL_INSEMINATION', 'EMBRYO_TRANSFER'] as const;
export type LskBreedingMethod = typeof LSK_BREEDING_METHODS[number];

export const LSK_BREEDING_RESULTS = ['PENDING', 'CONFIRMED_PREGNANT', 'NOT_PREGNANT', 'ABORTED', 'UNKNOWN'] as const;
export type LskBreedingResult = typeof LSK_BREEDING_RESULTS[number];

export const LSK_CALVING_EASES = ['UNASSISTED', 'EASY_PULL', 'HARD_PULL', 'SURGICAL', 'UNKNOWN'] as const;
export type LskCalvingEase = typeof LSK_CALVING_EASES[number];

export const LSK_MILK_SESSIONS = ['AM', 'PM', 'MIDDAY'] as const;
export type LskMilkSession = typeof LSK_MILK_SESSIONS[number];

export const LSK_CONDITION_SCORES = ['SCORE_1', 'SCORE_2', 'SCORE_3', 'SCORE_4', 'SCORE_5'] as const;
export type LskConditionScore = typeof LSK_CONDITION_SCORES[number];

// Animal
export interface LskAnimal {
  id: number;
  companyId: number;
  siteId: number;
  siteName?: string;
  siteUnitId: number | null;
  siteUnitName?: string;
  animalTag: string;
  name: string | null;
  speciesId: number;
  speciesName?: string;
  breedId: number | null;
  breedName?: string;
  sex: LskAnimalSex;
  dateOfBirth: string | null;
  status: LskAnimalStatus;
  productionType: LskProductionType | null;
  sireId: number | null;
  sireTag?: string;
  damId: number | null;
  damTag?: string;
  registrationNumber: string | null;
  rfidTag: string | null;
  colorMarkings: string | null;
  birthWeight: number | null;
  currentWeight: number | null;
  lastWeighDate: string | null;
  parity: number;
  isBreeder: boolean;
  acquisitionDate: string | null;
  acquisitionType: string | null;
  acquisitionCost: number | null;
  disposalDate: string | null;
  disposalType: string | null;
  disposalAmount: number | null;
  notes: string | null;
  photoPath: string | null;
  createdById: number | null;
  updatedById: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskAnimalDto {
  siteId: number;
  siteUnitId?: number;
  animalTag: string;
  name?: string;
  speciesId: number;
  breedId?: number;
  sex: LskAnimalSex;
  dateOfBirth?: string;
  productionType?: LskProductionType;
  sireId?: number;
  damId?: number;
  registrationNumber?: string;
  rfidTag?: string;
  colorMarkings?: string;
  birthWeight?: number;
  isBreeder?: boolean;
  acquisitionDate?: string;
  acquisitionType?: string;
  acquisitionCost?: number;
  notes?: string;
}

export interface UpdateLskAnimalDto extends Partial<CreateLskAnimalDto> {}

export interface LskAnimalQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: LskAnimalStatus;
  speciesId?: number;
  siteId?: number;
  sex?: LskAnimalSex;
  isBreeder?: boolean;
  groupId?: number;
}

export interface LskAnimalStats {
  total: number;
  active: number;
  pregnant: number;
  lactating: number;
  bySpecies: Record<string, number>;
  bySex: { male: number; female: number; castrated: number };
}

// Animal Group
export interface LskAnimalGroup {
  id: number;
  companyId: number;
  groupCode: string;
  name: string;
  groupType: string;
  siteId: number | null;
  siteName?: string;
  siteUnitId: number | null;
  speciesId: number | null;
  speciesName?: string;
  description: string | null;
  memberCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskAnimalGroupDto {
  groupCode: string;
  name: string;
  groupType: string;
  siteId?: number;
  siteUnitId?: number;
  speciesId?: number;
  description?: string;
  isActive?: boolean;
}

export interface UpdateLskAnimalGroupDto extends Partial<CreateLskAnimalGroupDto> {}

// Animal Weight
export interface LskAnimalWeight {
  id: number;
  companyId: number;
  animalId: number;
  animalTag?: string;
  weighDate: string;
  weightKg: number;
  method: string | null;
  conditionScore: LskConditionScore | null;
  adg: number | null;
  notes: string | null;
  recordedById: number | null;
  createdAt: string;
}

export interface CreateLskAnimalWeightDto {
  animalId: number;
  weighDate: string;
  weightKg: number;
  method?: string;
  conditionScore?: LskConditionScore;
  notes?: string;
}

// Breeding
export interface LskBreedingEvent {
  id: number;
  companyId: number;
  animalId: number;
  animalTag?: string;
  sireId: number | null;
  sireTag?: string;
  breedingMethod: LskBreedingMethod;
  breedingDate: string;
  semenBatchNumber: string | null;
  technicianId: number | null;
  heatDetectedDate: string | null;
  heatDetectionMethod: string | null;
  result: LskBreedingResult;
  resultDate: string | null;
  expectedDueDate: string | null;
  notes: string | null;
  recordedById: number | null;
  createdAt: string;
}

export interface CreateLskBreedingEventDto {
  animalId: number;
  sireId?: number;
  breedingMethod: LskBreedingMethod;
  breedingDate: string;
  semenBatchNumber?: string;
  technicianId?: number;
  heatDetectedDate?: string;
  heatDetectionMethod?: string;
  notes?: string;
}

export interface UpdateLskBreedingResultDto {
  result: LskBreedingResult;
  resultDate?: string;
  expectedDueDate?: string;
}

// Pregnancy Check
export interface LskPregnancyCheck {
  id: number;
  companyId: number;
  animalId: number;
  animalTag?: string;
  breedingEventId: number | null;
  checkDate: string;
  checkMethod: string;
  result: LskBreedingResult;
  estimatedDueDate: string | null;
  daysPregnant: number | null;
  notes: string | null;
  checkedById: number | null;
  createdAt: string;
}

export interface CreateLskPregnancyCheckDto {
  animalId: number;
  breedingEventId?: number;
  checkDate: string;
  checkMethod: string;
  result: LskBreedingResult;
  estimatedDueDate?: string;
  daysPregnant?: number;
  notes?: string;
}

// Calving
export interface LskCalvingEvent {
  id: number;
  companyId: number;
  animalId: number;
  animalTag?: string;
  breedingEventId: number | null;
  calvingDate: string;
  calvingEase: LskCalvingEase;
  offspringCount: number;
  aliveCount: number;
  stillbornCount: number;
  offspringIds: number[] | null;
  offspringSex: string[] | null;
  offspringWeightsKg: number[] | null;
  complications: string | null;
  notes: string | null;
  assistedById: number | null;
  createdAt: string;
}

export interface CreateLskCalvingEventDto {
  animalId: number;
  breedingEventId?: number;
  calvingDate: string;
  calvingEase?: LskCalvingEase;
  offspringCount?: number;
  aliveCount?: number;
  stillbornCount?: number;
  offspringSex?: string[];
  offspringWeightsKg?: number[];
  complications?: string;
  notes?: string;
}

// Milk Collection
export interface LskMilkCollection {
  id: number;
  companyId: number;
  animalId: number | null;
  animalTag?: string;
  groupId: number | null;
  groupName?: string;
  siteUnitId: number | null;
  collectionDate: string;
  session: LskMilkSession;
  volumeLiters: number;
  fatPercent: number | null;
  snfPercent: number | null;
  proteinPercent: number | null;
  scc: number | null;
  temperature: number | null;
  notes: string | null;
  collectedById: number | null;
  createdAt: string;
}

export interface CreateLskMilkCollectionDto {
  animalId?: number;
  groupId?: number;
  siteUnitId?: number;
  collectionDate: string;
  session: LskMilkSession;
  volumeLiters: number;
  fatPercent?: number;
  snfPercent?: number;
  proteinPercent?: number;
  scc?: number;
  temperature?: number;
  notes?: string;
}

// Grazing
export interface LskGrazingRotation {
  id: number;
  companyId: number;
  siteUnitId: number;
  siteUnitName?: string;
  groupId: number | null;
  groupName?: string;
  entryDate: string;
  exitDate: string | null;
  stockingDensity: number | null;
  stockingUnit: string | null;
  pastureConditionEntry: string | null;
  pastureConditionExit: string | null;
  notes: string | null;
  recordedById: number | null;
  createdAt: string;
}

export interface CreateLskGrazingRotationDto {
  siteUnitId: number;
  groupId?: number;
  entryDate: string;
  exitDate?: string;
  stockingDensity?: number;
  stockingUnit?: string;
  pastureConditionEntry?: string;
  notes?: string;
}

// Animal Feeding
export interface LskAnimalFeedingEvent {
  id: number;
  companyId: number;
  animalId: number | null;
  animalTag?: string;
  groupId: number | null;
  groupName?: string;
  feedDate: string;
  feedTypeId: number | null;
  feedTypeName?: string;
  feedItemName: string | null;
  rationName: string | null;
  quantityKg: number;
  costPerKg: number | null;
  totalCost: number | null;
  notes: string | null;
  recordedById: number | null;
  createdAt: string;
}

export interface CreateLskAnimalFeedingDto {
  animalId?: number;
  groupId?: number;
  feedDate: string;
  feedTypeId?: number;
  feedItemName?: string;
  rationName?: string;
  quantityKg: number;
  costPerKg?: number;
  notes?: string;
}

// Animal Health
export interface LskAnimalHealthEvent {
  id: number;
  companyId: number;
  animalId: number;
  animalTag?: string;
  eventDate: string;
  diseaseCodeId: number | null;
  diseaseName?: string;
  severity: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  treatment: string | null;
  medicationId: number | null;
  medicationName?: string;
  dosage: string | null;
  withdrawalDays: number | null;
  withdrawalEndDate: string | null;
  resolvedDate: string | null;
  vetId: number | null;
  notes: string | null;
  reportedById: number | null;
  createdAt: string;
}

export interface CreateLskAnimalHealthDto {
  animalId: number;
  eventDate: string;
  diseaseCodeId?: number;
  severity?: string;
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  medicationId?: number;
  dosage?: string;
  withdrawalDays?: number;
  resolvedDate?: string;
  vetId?: number;
  notes?: string;
}

// Animal Vaccination
export interface LskAnimalVaccination {
  id: number;
  companyId: number;
  animalId: number;
  animalTag?: string;
  vaccineScheduleId: number | null;
  vaccineName: string;
  diseaseTarget: string | null;
  route: string | null;
  batchNumber: string | null;
  administeredDate: string;
  dosage: string | null;
  dosageUnit: string | null;
  nextDueDate: string | null;
  withdrawalDaysMeat: number | null;
  withdrawalDaysMilk: number | null;
  administeredById: number | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateLskAnimalVaccinationDto {
  animalId: number;
  vaccineScheduleId?: number;
  vaccineName: string;
  diseaseTarget?: string;
  route?: string;
  batchNumber?: string;
  administeredDate: string;
  dosage?: string;
  dosageUnit?: string;
  nextDueDate?: string;
  withdrawalDaysMeat?: number;
  withdrawalDaysMilk?: number;
  notes?: string;
}

// ============================================================================
// Phase 5: Piggery Types
// ============================================================================

export const LSK_PIG_STATUSES = ['ACTIVE', 'GESTATING', 'LACTATING', 'DRY', 'GROWING', 'FINISHING', 'SOLD', 'DECEASED', 'CULLED'] as const;
export type LskPigStatus = typeof LSK_PIG_STATUSES[number];

export const LSK_PIG_SEXES = ['BOAR', 'SOW', 'GILT', 'BARROW', 'PIGLET_MALE', 'PIGLET_FEMALE'] as const;
export type LskPigSex = typeof LSK_PIG_SEXES[number];

export const LSK_FARROWING_EASES = ['UNASSISTED', 'MINOR_ASSIST', 'MAJOR_ASSIST', 'CAESAREAN'] as const;
export type LskFarrowingEase = typeof LSK_FARROWING_EASES[number];

export const LSK_PIG_BATCH_STATUSES = ['ACTIVE', 'GROWING', 'FINISHING', 'MARKETING', 'CLOSED', 'CANCELLED'] as const;
export type LskPigBatchStatus = typeof LSK_PIG_BATCH_STATUSES[number];

export interface LskPig {
  id: number;
  companyId: number;
  siteId: number;
  siteName?: string;
  siteUnitId: number | null;
  siteUnitName?: string;
  pigTag: string;
  name: string | null;
  speciesId: number;
  speciesName?: string;
  breedId: number | null;
  breedName?: string;
  sex: LskPigSex;
  dateOfBirth: string | null;
  status: LskPigStatus;
  sireId: number | null;
  sireTag?: string;
  damId: number | null;
  damTag?: string;
  litterNumber: number | null;
  earNotch: string | null;
  tattoo: string | null;
  rfidTag: string | null;
  birthWeight: number | null;
  currentWeight: number | null;
  lastWeighDate: string | null;
  parity: number;
  acquisitionDate: string | null;
  acquisitionType: string | null;
  acquisitionCost: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskPigDto {
  siteId: number;
  siteUnitId?: number;
  pigTag: string;
  name?: string;
  speciesId: number;
  breedId?: number;
  sex: LskPigSex;
  dateOfBirth?: string;
  sireId?: number;
  damId?: number;
  litterNumber?: number;
  earNotch?: string;
  tattoo?: string;
  rfidTag?: string;
  birthWeight?: number;
  acquisitionDate?: string;
  acquisitionType?: string;
  acquisitionCost?: number;
  notes?: string;
}

export interface UpdateLskPigDto extends Partial<CreateLskPigDto> {}

export interface LskPigQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: LskPigStatus;
  sex?: LskPigSex;
  siteId?: number;
}

export interface LskPigStats {
  total: number;
  active: number;
  gestating: number;
  lactating: number;
  bySex: Record<string, number>;
}

export interface LskSowCard {
  id: number;
  companyId: number;
  pigId: number;
  pigTag?: string;
  pigName?: string;
  breedName?: string;
  firstServiceDate: string | null;
  totalLitters: number;
  totalBornAlive: number;
  totalStillborn: number;
  totalMummified: number;
  totalWeaned: number;
  avgBornAlivePerLitter: number | null;
  avgWeanedPerLitter: number | null;
  avgPreWeaningMortality: number | null;
  pigletIndex: number | null;
  lastFarrowingDate: string | null;
  lastWeaningDate: string | null;
  nextExpectedHeat: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface LskBoarStud {
  id: number;
  companyId: number;
  pigId: number;
  pigTag?: string;
  pigName?: string;
  breedName?: string;
  studEntryDate: string | null;
  totalMatings: number;
  successfulMatings: number;
  conceptionRate: number | null;
  semenQualityScore: string | null;
  lastCollectionDate: string | null;
  lastSemenVolumeMl: number | null;
  lastSpermConcentration: number | null;
  lastMotilityPercent: number | null;
  isActive: boolean;
  notes: string | null;
}

export interface LskPigBreedingEvent {
  id: number;
  companyId: number;
  sowId: number;
  sowTag?: string;
  boarId: number | null;
  boarTag?: string;
  breedingMethod: LskBreedingMethod;
  breedingDate: string;
  semenBatchNumber: string | null;
  heatDetectedDate: string | null;
  heatNumber: number | null;
  result: LskBreedingResult;
  resultDate: string | null;
  expectedFarrowDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateLskPigBreedingDto {
  sowId: number;
  boarId?: number;
  breedingMethod: LskBreedingMethod;
  breedingDate: string;
  semenBatchNumber?: string;
  heatDetectedDate?: string;
  heatNumber?: number;
  notes?: string;
}

export interface LskPigFarrowingEvent {
  id: number;
  companyId: number;
  sowId: number;
  sowTag?: string;
  breedingEventId: number | null;
  farrowingDate: string;
  farrowingEase: LskFarrowingEase;
  parityNumber: number;
  bornAlive: number;
  stillborn: number;
  mummified: number;
  totalBorn: number;
  avgBirthWeightKg: number | null;
  lightest: number | null;
  heaviest: number | null;
  crossFosteredIn: number;
  crossFosteredOut: number;
  nursingCount: number | null;
  farrowingDurationMin: number | null;
  complications: string | null;
  notes: string | null;
  piglets?: LskPigPigletRecord[];
  createdAt: string;
}

export interface CreateLskPigFarrowingDto {
  sowId: number;
  breedingEventId?: number;
  farrowingDate: string;
  farrowingEase?: LskFarrowingEase;
  bornAlive: number;
  stillborn?: number;
  mummified?: number;
  avgBirthWeightKg?: number;
  lightest?: number;
  heaviest?: number;
  crossFosteredIn?: number;
  crossFosteredOut?: number;
  farrowingDurationMin?: number;
  complications?: string;
  notes?: string;
  piglets?: { pigletTag?: string; sex?: LskPigSex; birthWeightKg?: number }[];
}

export interface LskPigPigletRecord {
  id: number;
  farrowingEventId: number;
  sowId: number;
  pigletTag: string | null;
  sex: LskPigSex | null;
  birthWeightKg: number | null;
  isAlive: boolean;
  deathDate: string | null;
  deathReason: string | null;
  weaningDate: string | null;
  weaningWeightKg: number | null;
  crossFosteredToSowId: number | null;
  notes: string | null;
}

export interface LskPigNurseryBatch {
  id: number;
  companyId: number;
  batchCode: string;
  siteUnitId: number | null;
  siteUnitName?: string;
  status: LskPigBatchStatus;
  entryDate: string;
  exitDate: string | null;
  entryCount: number;
  entryAvgWeightKg: number | null;
  exitCount: number | null;
  exitAvgWeightKg: number | null;
  mortalities: number;
  totalFeedKg: number;
  fcr: number | null;
  adg: number | null;
  feedProgramId: number | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateLskNurseryBatchDto {
  batchCode: string;
  siteUnitId?: number;
  entryDate: string;
  entryCount: number;
  entryAvgWeightKg?: number;
  feedProgramId?: number;
  notes?: string;
}

export interface LskPigGrowFinishBatch {
  id: number;
  companyId: number;
  batchCode: string;
  siteUnitId: number | null;
  siteUnitName?: string;
  status: LskPigBatchStatus;
  entryDate: string;
  exitDate: string | null;
  entryCount: number;
  entryAvgWeightKg: number | null;
  targetMarketWeightKg: number | null;
  exitCount: number | null;
  exitAvgWeightKg: number | null;
  mortalities: number;
  totalFeedKg: number;
  fcr: number | null;
  adg: number | null;
  daysToMarket: number | null;
  feedProgramId: number | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateLskGrowFinishBatchDto {
  batchCode: string;
  siteUnitId?: number;
  entryDate: string;
  entryCount: number;
  entryAvgWeightKg?: number;
  targetMarketWeightKg?: number;
  feedProgramId?: number;
  notes?: string;
}

export interface LskPigWeight {
  id: number;
  companyId: number;
  pigId: number | null;
  pigTag?: string;
  batchId: number | null;
  batchCode?: string;
  batchType: string | null;
  weighDate: string;
  weightKg: number;
  isGroupAvg: boolean;
  sampleCount: number | null;
  adg: number | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateLskPigWeightDto {
  pigId?: number;
  batchId?: number;
  batchType?: string;
  weighDate: string;
  weightKg: number;
  isGroupAvg?: boolean;
  sampleCount?: number;
  notes?: string;
}

export interface LskPigMortality {
  id: number;
  companyId: number;
  pigId: number | null;
  pigTag?: string;
  batchId: number | null;
  batchCode?: string;
  batchType: string | null;
  mortalityDate: string;
  quantity: number;
  reasonId: number | null;
  reasonName?: string;
  category: string | null;
  estimatedWeightKg: number | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateLskPigMortalityDto {
  pigId?: number;
  batchId?: number;
  batchType?: string;
  mortalityDate: string;
  quantity?: number;
  reasonId?: number;
  category?: string;
  estimatedWeightKg?: number;
  notes?: string;
}

export interface LskPigBatchStats {
  nursery: { total: number; active: number; closed: number };
  growFinish: { total: number; active: number; closed: number };
}

// ============================================================================
// LIVESTOCK MODULE TYPES — Phase 6: Feed & Nutrition (Cross-Species)
// ============================================================================

export const LSK_FEED_ENTITY_TYPES = ['cohort', 'flock', 'animal_group', 'pig_batch'] as const;
export type LskFeedEntityType = typeof LSK_FEED_ENTITY_TYPES[number];

// --- Feed Formulation ---

export interface LskFeedFormulation {
  id: number;
  companyId: number;
  formulationCode: string;
  name: string;
  speciesId: number | null;
  targetFeedCategory: string | null;
  totalCostPerKg: number | null;
  proteinPercent: number | null;
  energyKcalPerKg: number | null;
  fatPercent: number | null;
  fiberPercent: number | null;
  moisturePercent: number | null;
  description: string | null;
  isActive: boolean;
  createdById: number | null;
  updatedById: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  speciesName?: string;
  items?: LskFeedFormulationItem[];
}

export interface LskFeedFormulationItem {
  id: number;
  companyId: number;
  formulationId: number;
  ingredientName: string;
  inventoryItemId: number | null;
  percentageInMix: number;
  costPerKg: number | null;
  costContribution: number | null;
  proteinContrib: number | null;
  energyContrib: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskFeedFormulationItemDto {
  ingredientName: string;
  inventoryItemId?: number;
  percentageInMix: number;
  costPerKg?: number;
  proteinContrib?: number;
  energyContrib?: number;
  notes?: string;
}

export interface CreateLskFeedFormulationDto {
  formulationCode: string;
  name: string;
  speciesId?: number;
  targetFeedCategory?: string;
  proteinPercent?: number;
  energyKcalPerKg?: number;
  fatPercent?: number;
  fiberPercent?: number;
  moisturePercent?: number;
  description?: string;
  isActive?: boolean;
  items?: CreateLskFeedFormulationItemDto[];
}

export interface UpdateLskFeedFormulationDto extends Partial<CreateLskFeedFormulationDto> {}

export interface LskFeedFormulationQuery {
  page?: number;
  limit?: number;
  search?: string;
  speciesId?: number;
  isActive?: boolean;
}

// --- Feed Inventory ---

export interface LskFeedInventory {
  id: number;
  companyId: number;
  siteId: number;
  feedTypeId: number | null;
  feedName: string;
  inventoryItemId: number | null;
  currentStockKg: number;
  minStockKg: number | null;
  maxStockKg: number | null;
  unitCost: number | null;
  expiryDate: string | null;
  batchNumber: string | null;
  notes: string | null;
  updatedById: number | null;
  createdAt: string;
  updatedAt: string;
  siteName?: string;
  feedTypeName?: string;
  isLowStock?: boolean;
}

export interface CreateLskFeedInventoryDto {
  siteId: number;
  feedTypeId?: number;
  feedName: string;
  inventoryItemId?: number;
  currentStockKg?: number;
  minStockKg?: number;
  maxStockKg?: number;
  unitCost?: number;
  expiryDate?: string;
  batchNumber?: string;
  notes?: string;
}

export interface UpdateLskFeedInventoryDto extends Partial<Omit<CreateLskFeedInventoryDto, 'currentStockKg'>> {}

export interface LskFeedInventoryQuery {
  page?: number;
  limit?: number;
  search?: string;
  siteId?: number;
  feedTypeId?: number;
  lowStock?: boolean;
}

export interface LskFeedInventoryStats {
  total: number;
  lowStock: number;
  totalValueKg: number;
}

// --- Feed Receipt ---

export interface LskFeedReceipt {
  id: number;
  companyId: number;
  siteId: number;
  receiptCode: string;
  receiptDate: string;
  supplierName: string | null;
  feedTypeId: number | null;
  feedName: string;
  quantityKg: number;
  costPerKg: number | null;
  totalCost: number | null;
  batchNumber: string | null;
  expiryDate: string | null;
  purchaseOrderId: number | null;
  notes: string | null;
  receivedById: number | null;
  createdAt: string;
  updatedAt: string;
  siteName?: string;
  feedTypeName?: string;
}

export interface CreateLskFeedReceiptDto {
  siteId: number;
  receiptCode: string;
  receiptDate: string;
  supplierName?: string;
  feedTypeId?: number;
  feedName: string;
  quantityKg: number;
  costPerKg?: number;
  batchNumber?: string;
  expiryDate?: string;
  purchaseOrderId?: number;
  updateInventory?: boolean;
  notes?: string;
}

export interface LskFeedReceiptQuery {
  page?: number;
  limit?: number;
  search?: string;
  siteId?: number;
  startDate?: string;
  endDate?: string;
}

// --- Feed Issue ---

export interface LskFeedIssue {
  id: number;
  companyId: number;
  entityType: string;
  entityId: number;
  issueDate: string;
  feedTypeId: number | null;
  feedName: string;
  formulationId: number | null;
  quantityKg: number;
  costPerKg: number | null;
  totalCost: number | null;
  siteId: number | null;
  notes: string | null;
  issuedById: number | null;
  createdAt: string;
  updatedAt: string;
  entityName?: string;
  siteName?: string;
  feedTypeName?: string;
  formulationName?: string;
}

export interface CreateLskFeedIssueDto {
  entityType: string;
  entityId: number;
  issueDate: string;
  feedTypeId?: number;
  feedName: string;
  formulationId?: number;
  quantityKg: number;
  costPerKg?: number;
  siteId?: number;
  notes?: string;
}

export interface LskFeedIssueQuery {
  page?: number;
  limit?: number;
  search?: string;
  entityType?: string;
  entityId?: number;
  siteId?: number;
  startDate?: string;
  endDate?: string;
}

// --- Feed Consumption Summary ---

export interface LskFeedConsumptionSummary {
  id: number;
  companyId: number;
  entityType: string;
  entityId: number;
  periodStart: string;
  periodEnd: string;
  totalFeedKg: number;
  totalGainKg: number | null;
  fcr: number | null;
  costPerKgGain: number | null;
  computedAt: string;
  createdAt: string;
  updatedAt: string;
}

// --- Feed Waste Log ---

export interface LskFeedWasteLog {
  id: number;
  companyId: number;
  siteId: number;
  wasteDate: string;
  feedTypeId: number | null;
  feedName: string;
  quantityKg: number;
  reason: string;
  estimatedCost: number | null;
  notes: string | null;
  recordedById: number | null;
  createdAt: string;
}

// --- Feed Mill Production ---

export interface LskFeedMillProduction {
  id: number;
  companyId: number;
  siteId: number;
  batchCode: string;
  productionDate: string;
  formulationId: number | null;
  outputFeedName: string;
  outputQuantityKg: number;
  totalInputCost: number | null;
  costPerKg: number | null;
  laborCost: number | null;
  overheadCost: number | null;
  notes: string | null;
  producedById: number | null;
  createdAt: string;
  updatedAt: string;
}

// --- Feeding Summary (from API) ---

export interface LskFeedingSummary {
  totalFeedKg: number;
  totalCost: number;
  avgDailyFeedKg: number;
  issueCount: number;
  fcr: number | null;
}

export interface LskFcrResult {
  fcr: number | null;
  totalFeedKg: number;
  totalGainKg: number | null;
}

// ============================================================================
// LIVESTOCK MODULE TYPES — Phase 7: Health & Biosecurity (Cross-Species)
// ============================================================================

// --- Enums ---

export const LSK_HEALTH_EVENT_SEVERITIES = ['MILD', 'MODERATE', 'SEVERE', 'CRITICAL'] as const;
export type LskHealthEventSeverity = typeof LSK_HEALTH_EVENT_SEVERITIES[number];

export const LSK_TREATMENT_STATUSES = ['ACTIVE', 'COMPLETED', 'IN_WITHDRAWAL', 'CLEARED', 'CANCELLED'] as const;
export type LskTreatmentStatus = typeof LSK_TREATMENT_STATUSES[number];

export const LSK_QUARANTINE_STATUSES = ['ACTIVE', 'RELEASED', 'EXTENDED', 'CANCELLED'] as const;
export type LskQuarantineStatus = typeof LSK_QUARANTINE_STATUSES[number];

export const LSK_MOVEMENT_PERMIT_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'USED'] as const;
export type LskMovementPermitStatus = typeof LSK_MOVEMENT_PERMIT_STATUSES[number];

// --- Health Events ---

export interface LskHealthEvent {
  id: number;
  companyId: number;
  entityType: string;
  entityId: number;
  eventDate: string;
  diseaseCodeId: number | null;
  diseaseName: string | null;
  diseaseCodeName?: string;
  diseaseCode?: string;
  severity: LskHealthEventSeverity | null;
  affectedCount: number | null;
  symptoms: string | null;
  diagnosis: string | null;
  labResultId: number | null;
  reportedById: number | null;
  reportedByName?: string;
  resolvedDate: string | null;
  resolutionNotes: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskHealthEventDto {
  entityType: string;
  entityId: number;
  eventDate: string;
  diseaseCodeId?: number;
  diseaseName?: string;
  severity?: LskHealthEventSeverity;
  affectedCount?: number;
  symptoms?: string;
  diagnosis?: string;
  notes?: string;
}

export interface UpdateLskHealthEventDto {
  eventDate?: string;
  diseaseCodeId?: number;
  diseaseName?: string;
  severity?: LskHealthEventSeverity;
  affectedCount?: number;
  symptoms?: string;
  diagnosis?: string;
  resolvedDate?: string;
  resolutionNotes?: string;
  notes?: string;
}

export interface LskHealthEventQuery {
  page?: number;
  limit?: number;
  search?: string;
  entityType?: string;
  entityId?: number;
  severity?: LskHealthEventSeverity;
  startDate?: string;
  endDate?: string;
}

export interface LskHealthEventStats {
  total: number;
  active: number;
  resolved: number;
  critical: number;
  severe: number;
}

// --- Treatments ---

export interface LskTreatment {
  id: number;
  companyId: number;
  healthEventId: number | null;
  entityType: string;
  entityId: number;
  treatmentDate: string;
  medicationId: number | null;
  medicationName: string;
  dosage: string | null;
  dosageUnit: string | null;
  route: string | null;
  durationDays: number | null;
  endDate: string | null;
  administeredById: number | null;
  administeredByName?: string;
  approvedByVetId: number | null;
  approvedByVetName?: string;
  status: LskTreatmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskTreatmentDto {
  healthEventId?: number;
  entityType: string;
  entityId: number;
  treatmentDate: string;
  medicationId?: number;
  medicationName: string;
  dosage?: string;
  dosageUnit?: string;
  route?: string;
  durationDays?: number;
  endDate?: string;
  administeredById?: number;
  approvedByVetId?: number;
  notes?: string;
}

export interface UpdateLskTreatmentStatusDto {
  status: LskTreatmentStatus;
  notes?: string;
}

export interface LskTreatmentQuery {
  page?: number;
  limit?: number;
  search?: string;
  entityType?: string;
  entityId?: number;
  status?: LskTreatmentStatus;
  startDate?: string;
  endDate?: string;
}

export interface LskTreatmentWithdrawal {
  id: number;
  companyId: number;
  treatmentId: number;
  entityType: string;
  entityId: number;
  medicationId: number | null;
  medicationName: string;
  withdrawalType: string;
  withdrawalDays: number;
  withdrawalStartDate: string;
  withdrawalEndDate: string;
  isCleared: boolean;
  clearedDate: string | null;
  clearedById: number | null;
  notes: string | null;
}

export interface LskWithdrawalCheck {
  hasActiveWithdrawals: boolean;
  withdrawals: LskTreatmentWithdrawal[];
}

export interface LskTreatmentStats {
  total: number;
  active: number;
  completed: number;
  inWithdrawal: number;
  cleared: number;
}

// --- Biosecurity ---

export interface LskBiosecuritySop {
  id: number;
  companyId: number;
  sopCode: string;
  name: string;
  category: string;
  description: string | null;
  checklistItems: Record<string, unknown>[] | null;
  frequency: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskBiosecuritySopDto {
  sopCode: string;
  name: string;
  category: string;
  description?: string;
  checklistItems?: Record<string, unknown>[];
  frequency?: string;
  isActive?: boolean;
}

export interface UpdateLskBiosecuritySopDto {
  sopCode?: string;
  name?: string;
  category?: string;
  description?: string;
  checklistItems?: Record<string, unknown>[];
  frequency?: string;
  isActive?: boolean;
}

export interface LskBiosecurityCheck {
  id: number;
  companyId: number;
  sopId: number | null;
  sopName?: string;
  siteId: number;
  siteName?: string;
  checkDate: string;
  inspectorId: number | null;
  inspectorName: string | null;
  checklistResults: Record<string, unknown>[] | null;
  totalItems: number | null;
  passedItems: number | null;
  score: number | null;
  overallResult: string | null;
  correctiveActions: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskBiosecurityCheckDto {
  sopId?: number;
  siteId: number;
  checkDate: string;
  inspectorId?: number;
  inspectorName?: string;
  checklistResults?: Record<string, unknown>[];
  totalItems?: number;
  passedItems?: number;
  correctiveActions?: string;
  notes?: string;
}

export interface LskBiosecurityCheckQuery {
  page?: number;
  limit?: number;
  siteId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface LskBiosecurityViolation {
  id: number;
  companyId: number;
  checkId: number | null;
  siteId: number;
  siteName?: string;
  violationDate: string;
  category: string;
  description: string;
  severity: string;
  correctiveAction: string | null;
  dueDate: string | null;
  resolvedDate: string | null;
  resolvedById: number | null;
  notes: string | null;
  reportedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskBiosecurityViolationDto {
  checkId?: number;
  siteId: number;
  violationDate: string;
  category: string;
  description: string;
  severity: string;
  correctiveAction?: string;
  dueDate?: string;
  notes?: string;
}

export interface LskBiosecurityViolationQuery {
  page?: number;
  limit?: number;
  siteId?: number;
  resolved?: boolean;
  search?: string;
}

export interface LskComplianceScore {
  avgScore: number;
  totalChecks: number;
  passCount: number;
  failCount: number;
  lastCheckDate: string | null;
}

export interface LskBiosecurityStats {
  totalSops: number;
  totalChecks: number;
  avgScore: number;
  openViolations: number;
  resolvedViolations: number;
}

// --- Quarantine ---

export interface LskQuarantineZone {
  id: number;
  companyId: number;
  siteId: number;
  siteName?: string;
  siteUnitId: number | null;
  siteUnitName?: string;
  reason: string;
  diseaseCodeId: number | null;
  diseaseCodeName?: string;
  status: LskQuarantineStatus;
  startDate: string;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  affectedCount: number | null;
  restrictions: string | null;
  releasedById: number | null;
  releasedByName?: string;
  notes: string | null;
  createdById: number | null;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskQuarantineDto {
  siteId: number;
  siteUnitId?: number;
  reason: string;
  diseaseCodeId?: number;
  startDate: string;
  expectedEndDate?: string;
  affectedCount?: number;
  restrictions?: string;
  notes?: string;
}

export interface UpdateLskQuarantineDto {
  reason?: string;
  expectedEndDate?: string;
  affectedCount?: number;
  restrictions?: string;
  status?: LskQuarantineStatus;
  notes?: string;
}

export interface LskQuarantineQuery {
  page?: number;
  limit?: number;
  status?: LskQuarantineStatus;
  siteId?: number;
  search?: string;
}

export interface LskQuarantineStats {
  total: number;
  active: number;
  released: number;
  cancelled: number;
}

// --- Movement Permits ---

export interface LskMovementPermit {
  id: number;
  companyId: number;
  permitCode: string;
  entityType: string;
  entityId: number | null;
  animalCount: number | null;
  fromSiteId: number;
  fromSiteName?: string;
  toSiteId: number | null;
  toSiteName?: string;
  toExternalDest: string | null;
  movementDate: string | null;
  purpose: string | null;
  healthCertRef: string | null;
  status: LskMovementPermitStatus;
  requestedById: number | null;
  requestedByName?: string;
  approvedById: number | null;
  approvedByName?: string;
  approvedDate: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskMovementPermitDto {
  entityType: string;
  entityId?: number;
  animalCount?: number;
  fromSiteId: number;
  toSiteId?: number;
  toExternalDest?: string;
  movementDate?: string;
  purpose?: string;
  healthCertRef?: string;
  notes?: string;
}

export interface UpdateLskMovementPermitStatusDto {
  status: LskMovementPermitStatus;
  rejectionReason?: string;
}

export interface LskMovementPermitQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: LskMovementPermitStatus;
  startDate?: string;
  endDate?: string;
}

export interface LskMovementPermitStats {
  total: number;
  requested: number;
  approved: number;
  rejected: number;
  used: number;
}

// --- Visitor Logs ---

export interface LskVisitorLog {
  id: number;
  companyId: number;
  siteId: number;
  siteName?: string;
  visitorName: string;
  visitorCompany: string | null;
  visitorPhone: string | null;
  purpose: string;
  visitDate: string;
  arrivalTime: string | null;
  departureTime: string | null;
  biosecurityCompliant: boolean;
  footbathUsed: boolean;
  ppeWorn: boolean;
  vehicleDisinfected: boolean | null;
  previousFarmVisit: boolean | null;
  previousFarmName: string | null;
  notes: string | null;
  loggedById: number | null;
  loggedByName?: string;
  createdAt: string;
}

export interface CreateLskVisitorLogDto {
  siteId: number;
  visitorName: string;
  visitorCompany?: string;
  visitorPhone?: string;
  purpose: string;
  visitDate: string;
  arrivalTime?: string;
  departureTime?: string;
  biosecurityCompliant?: boolean;
  footbathUsed?: boolean;
  ppeWorn?: boolean;
  vehicleDisinfected?: boolean;
  previousFarmVisit?: boolean;
  previousFarmName?: string;
  notes?: string;
}

export interface LskVisitorLogQuery {
  page?: number;
  limit?: number;
  search?: string;
  siteId?: number;
  startDate?: string;
  endDate?: string;
}

export interface LskVisitorLogStats {
  total: number;
  compliant: number;
  nonCompliant: number;
  todayCount: number;
}

// ============================================================================
// LIVESTOCK MODULE TYPES — Phase 9: Finance & Costing
// ============================================================================

// --- Cost Centers ---

export const LSK_ENTITY_TYPES = ['COHORT', 'FLOCK', 'HERD', 'BATCH'] as const;
export type LskEntityType = typeof LSK_ENTITY_TYPES[number];

export const LSK_ASSET_CLASSES = ['Bearer', 'Consumable', 'Produce'] as const;
export type LskAssetClass = typeof LSK_ASSET_CLASSES[number];

export const LSK_VALUATION_METHODS = ['FairValue', 'Cost', 'NetRealizableValue'] as const;
export type LskValuationMethod = typeof LSK_VALUATION_METHODS[number];

export interface LskCostCenter {
  id: number;
  companyId: number;
  costCenterCode: string;
  name: string;
  entityType: string | null;
  speciesCategory: string | null;
  siteId: number | null;
  siteName?: string;
  parentId: number | null;
  parentName?: string;
  description: string | null;
  isActive: boolean;
  createdById: number | null;
  createdByName?: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskCostCenterDto {
  costCenterCode: string;
  name: string;
  entityType?: string;
  speciesCategory?: string;
  siteId?: number;
  parentId?: number;
  description?: string;
  isActive?: boolean;
}

export type UpdateLskCostCenterDto = Partial<CreateLskCostCenterDto>;

export interface LskCostCenterQuery {
  page?: number;
  limit?: number;
  search?: string;
  entityType?: string;
  speciesCategory?: string;
  isActive?: boolean;
}

export interface LskCostCenterStats {
  total: number;
  active: number;
  inactive: number;
  byEntityType: Record<string, number>;
}

// --- Cost Allocations ---

export interface LskCostAllocation {
  id: number;
  companyId: number;
  allocationCode: string;
  name: string;
  sourceType: string;
  sourceCostCenterId: number | null;
  allocationMethod: string;
  allocationBasis: string | null;
  targetEntityTypes: string[] | null;
  isActive: boolean;
  description: string | null;
  createdById: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Biological Assets ---

export interface LskBiologicalAsset {
  id: number;
  companyId: number;
  entityType: string;
  entityId: number;
  assetClass: string;
  valuationDate: string;
  fairValuePerUnit: number | null;
  unitCount: number | null;
  totalFairValue: number | null;
  costToSell: number | null;
  fairValueLessCosts: number | null;
  accumulatedCost: number | null;
  gainLossOnValuation: number | null;
  valuationMethod: string | null;
  notes: string | null;
  valuedById: number | null;
  valuedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskBiologicalAssetDto {
  entityType: string;
  entityId: number;
  assetClass: string;
  valuationDate: string;
  fairValuePerUnit?: number;
  unitCount?: number;
  totalFairValue?: number;
  costToSell?: number;
  fairValueLessCosts?: number;
  accumulatedCost?: number;
  gainLossOnValuation?: number;
  valuationMethod?: string;
  notes?: string;
}

export interface LskBiologicalAssetQuery {
  page?: number;
  limit?: number;
  search?: string;
  entityType?: string;
  assetClass?: string;
  startDate?: string;
  endDate?: string;
}

export interface LskAssetSummary {
  assetClass: string;
  count: number;
  totalFairValue: number;
  totalAccumulatedCost: number;
  totalGainLoss: number;
}

// --- Biological Asset Movements ---

export interface LskBiologicalAssetMovement {
  id: number;
  companyId: number;
  assetId: number;
  movementDate: string;
  movementType: string;
  description: string;
  quantity: number | null;
  amount: number;
  notes: string | null;
  createdAt: string;
}

// --- Cost Variance Analysis ---

export interface LskCostVarianceAnalysis {
  id: number;
  companyId: number;
  entityType: string;
  entityId: number;
  periodStart: string;
  periodEnd: string;
  standardCostPerUnit: number | null;
  actualCostPerUnit: number | null;
  variancePerUnit: number | null;
  variancePercent: number | null;
  totalStandardCost: number | null;
  totalActualCost: number | null;
  totalVariance: number | null;
  varianceType: string | null;
  notes: string | null;
  computedAt: string;
  createdAt: string;
}

// --- Profitability Reports ---

export interface LskProfitabilityReport {
  id: number;
  companyId: number;
  entityType: string;
  entityId: number;
  periodStart: string;
  periodEnd: string;
  totalRevenue: number | null;
  totalCostOfProduction: number | null;
  feedCost: number | null;
  healthCost: number | null;
  laborCost: number | null;
  overheadCost: number | null;
  otherCost: number | null;
  grossProfit: number | null;
  grossMarginPercent: number | null;
  netProfit: number | null;
  netMarginPercent: number | null;
  costPerUnit: number | null;
  unitType: string | null;
  computedAt: string;
  createdAt: string;
}

export interface LskProfitabilityQuery {
  entityType?: string;
  entityId?: number;
  periodStart?: string;
  periodEnd?: string;
  page?: number;
  limit?: number;
}

export interface LskProfitabilityOverview {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  grossMarginPercent: number;
  entityCount: number;
  byEntityType: {
    entityType: string;
    revenue: number;
    costs: number;
    profit: number;
    marginPercent: number;
    count: number;
  }[];
}

// ============================================================================
// LIVESTOCK MODULE TYPES — Phase 8: Processing & Cold Chain
// ============================================================================

// --- Enums ---

export const LSK_PROCESSING_BATCH_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type LskProcessingBatchStatus = typeof LSK_PROCESSING_BATCH_STATUSES[number];

export const LSK_COLD_CHAIN_ZONE_TYPES = ['CHILLER', 'FREEZER', 'BLAST_FREEZER', 'TRANSPORT', 'AMBIENT', 'OTHER'] as const;
export type LskColdChainZoneType = typeof LSK_COLD_CHAIN_ZONE_TYPES[number];

export const LSK_PROCESSING_TYPES = ['SLAUGHTER', 'FILLETING', 'PORTIONING', 'SMOKING', 'DRYING', 'CANNING', 'PACKAGING', 'OTHER'] as const;
export type LskProcessingType = typeof LSK_PROCESSING_TYPES[number];

// --- Processing Batch ---

export interface LskProcessingInput {
  id: number;
  companyId: number;
  batchId: number;
  description: string;
  quantity: number | null;
  liveWeightKg: number | null;
  notes: string | null;
  createdAt: string;
}

export interface LskProcessingOutput {
  id: number;
  companyId: number;
  batchId: number;
  productName: string;
  productType: string;
  grade: string | null;
  quantity: number | null;
  weightKg: number | null;
  pricePerKg: number | null;
  totalValue: number | null;
  lotNumber: string | null;
  expiryDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface LskProcessingByproduct {
  id: number;
  companyId: number;
  batchId: number;
  byproductName: string;
  byproductType: string;
  quantityKg: number | null;
  disposition: string | null;
  value: number | null;
  notes: string | null;
  createdAt: string;
}

export interface LskProcessingYield {
  id: number;
  companyId: number;
  batchId: number;
  totalInputKg: number;
  totalOutputKg: number;
  totalByproductKg: number | null;
  totalWasteKg: number | null;
  dressPercent: number | null;
  usablePercent: number | null;
  wastePercent: number | null;
  computedAt: string;
  createdAt: string;
}

export interface LskProcessingBatch {
  id: number;
  companyId: number;
  batchCode: string;
  sourceEntityType: string;
  sourceEntityId: number;
  processingType: string;
  status: LskProcessingBatchStatus;
  processingDate: string;
  siteId: number | null;
  siteName?: string;
  notes: string | null;
  processedById: number | null;
  processedByName?: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  inputs?: LskProcessingInput[];
  outputs?: LskProcessingOutput[];
  byproducts?: LskProcessingByproduct[];
  yield?: LskProcessingYield | null;
}

export interface CreateLskProcessingBatchDto {
  batchCode: string;
  sourceEntityType: string;
  sourceEntityId: number;
  processingType: string;
  processingDate: string;
  siteId?: number;
  notes?: string;
  inputs?: {
    description: string;
    quantity?: number;
    liveWeightKg?: number;
    notes?: string;
  }[];
  outputs?: {
    productName: string;
    productType: string;
    grade?: string;
    quantity?: number;
    weightKg?: number;
    pricePerKg?: number;
    totalValue?: number;
    lotNumber?: string;
    expiryDate?: string;
    notes?: string;
  }[];
  byproducts?: {
    byproductName: string;
    byproductType: string;
    quantityKg?: number;
    disposition?: string;
    value?: number;
    notes?: string;
  }[];
}

export interface LskProcessingBatchQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: LskProcessingBatchStatus;
  startDate?: string;
  endDate?: string;
}

export interface LskProcessingBatchStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

// --- Cold Chain Zone ---

export interface LskColdChainZone {
  id: number;
  companyId: number;
  zoneCode: string;
  name: string;
  zoneType: LskColdChainZoneType;
  siteId: number | null;
  siteName?: string;
  targetTempMin: number | null;
  targetTempMax: number | null;
  targetHumidityMin: number | null;
  targetHumidityMax: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLskColdChainZoneDto {
  zoneCode: string;
  name: string;
  zoneType: LskColdChainZoneType;
  siteId?: number;
  targetTempMin?: number;
  targetTempMax?: number;
  targetHumidityMin?: number;
  targetHumidityMax?: number;
}

export interface UpdateLskColdChainZoneDto {
  zoneCode?: string;
  name?: string;
  zoneType?: LskColdChainZoneType;
  siteId?: number;
  targetTempMin?: number;
  targetTempMax?: number;
  targetHumidityMin?: number;
  targetHumidityMax?: number;
  isActive?: boolean;
}

export interface LskColdChainZoneQuery {
  page?: number;
  limit?: number;
  search?: string;
  zoneType?: LskColdChainZoneType;
  isActive?: boolean;
}

// --- Cold Chain Reading ---

export interface LskColdChainReading {
  id: number;
  companyId: number;
  zoneId: number;
  readingTime: string;
  temperatureC: number;
  humidityPercent: number | null;
  isIotReading: boolean;
  deviceId: string | null;
  isAlert: boolean;
  alertMessage: string | null;
  recordedById: number | null;
  createdAt: string;
  zoneName?: string;
  zoneCode?: string;
}

export interface CreateLskColdChainReadingDto {
  zoneId: number;
  readingTime: string;
  temperatureC: number;
  humidityPercent?: number;
  isIotReading?: boolean;
  deviceId?: string;
}

export interface LskColdChainReadingQuery {
  page?: number;
  limit?: number;
  zoneId?: number;
  alertsOnly?: boolean;
  startDate?: string;
  endDate?: string;
}

// --- Cold Chain Excursion ---

export interface LskColdChainExcursion {
  id: number;
  companyId: number;
  zoneId: number;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  maxTempC: number | null;
  minTempC: number | null;
  correctiveAction: string | null;
  resolvedById: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  zoneName?: string;
  zoneCode?: string;
}

export interface CreateLskColdChainExcursionDto {
  zoneId: number;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  maxTempC?: number;
  minTempC?: number;
  correctiveAction?: string;
  notes?: string;
}

export interface LskColdChainExcursionQuery {
  page?: number;
  limit?: number;
  zoneId?: number;
  startDate?: string;
  endDate?: string;
}

export interface LskColdChainStats {
  totalZones: number;
  activeZones: number;
  totalReadings: number;
  alertReadings: number;
  totalExcursions: number;
  unresolvedExcursions: number;
}

// --- Product Traceability ---

export interface LskProductTraceability {
  id: number;
  companyId: number;
  lotNumber: string;
  productName: string;
  processingBatchId: number | null;
  sourceEntityType: string | null;
  sourceEntityId: number | null;
  harvestDate: string | null;
  processingDate: string | null;
  packagingDate: string | null;
  expiryDate: string | null;
  coldChainZoneId: number | null;
  dispatchDate: string | null;
  customerName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  batchCode?: string;
  zoneName?: string;
}

export interface CreateLskProductTraceabilityDto {
  lotNumber: string;
  productName: string;
  processingBatchId?: number;
  sourceEntityType?: string;
  sourceEntityId?: number;
  harvestDate?: string;
  processingDate?: string;
  packagingDate?: string;
  expiryDate?: string;
  coldChainZoneId?: number;
  dispatchDate?: string;
  customerName?: string;
  notes?: string;
}

export interface LskTraceabilityQuery {
  page?: number;
  limit?: number;
  search?: string;
  sourceEntityType?: string;
  startDate?: string;
  endDate?: string;
}

export interface LskTraceabilityStats {
  total: number;
  withBatch: number;
  withColdChain: number;
  dispatched: number;
}

export interface LskTraceabilityChain {
  product: LskProductTraceability;
  processingBatch: Record<string, unknown> | null;
  coldChainZone: Record<string, unknown> | null;
  coldChainReadings: Record<string, unknown>[];
}

// ============================================================================
// Phase 10: Analytics & KPIs Types
// ============================================================================

export interface LskFishKpis {
  activeCohorts: number;
  avgSurvivalPercent: number | null;
  avgFcr: number | null;
  avgSgr: number | null;
  totalBiomassHarvestedKg: number;
  avgCostPerKg: number | null;
  totalCohorts: number;
}

export interface LskPoultryKpis {
  activeFlocks: number;
  avgFcr: number | null;
  avgMortalityPercent: number | null;
  avgHenDayPercent: number | null;
  avgMarketWeightG: number | null;
  totalEggsCollected: number;
  totalFlocks: number;
}

export interface LskCattleKpis {
  totalAnimals: number;
  activeAnimals: number;
  avgAdg: number | null;
  avgMilkYieldPerDay: number | null;
  pregnancyRate: number | null;
  avgCalvingInterval: number | null;
}

export interface LskPiggeryKpis {
  totalPigs: number;
  activeSows: number;
  avgPwsy: number | null;
  avgBornAlive: number | null;
  avgPreWeaningMortality: number | null;
  avgGrowFinishFcr: number | null;
  avgDaysToMarket: number | null;
}

export interface LskCrossFarmKpis {
  biosecurityScore: number | null;
  feedInventoryTurns: number | null;
  mortalityTrendDirection: 'up' | 'down' | 'stable';
  coldChainExcursions: number;
  activeWithdrawals: number;
  activeQuarantineZones: number;
}

export interface LskDashboardOverview {
  totalSites: number;
  activeCohorts: number;
  activeFlocks: number;
  activeAnimals: number;
  activePigs: number;
  totalLivestock: number;
  recentActivities: LskRecentActivity[];
}

export interface LskRecentActivity {
  type: string;
  entityType: string;
  entityId: number;
  description: string;
  date: string;
}

export interface LskTrendDataPoint {
  period: string;
  value: number;
  label?: string;
}
