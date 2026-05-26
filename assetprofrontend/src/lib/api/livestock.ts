import { api, publicAxios } from '../api';
import type {
  LskSettings,
  UpdateLskSettingsDto,
  LskSite,
  CreateLskSiteDto,
  UpdateLskSiteDto,
  LskSiteQuery,
  LskSiteUnit,
  CreateLskSiteUnitDto,
  UpdateLskSiteUnitDto,
  LskSiteUnitQuery,
  LskSpecies,
  CreateLskSpeciesDto,
  UpdateLskSpeciesDto,
  LskSpeciesQuery,
  LskBreed,
  CreateLskBreedDto,
  UpdateLskBreedDto,
  LskBreedQuery,
  LskMortalityReason,
  CreateLskMortalityReasonDto,
  UpdateLskMortalityReasonDto,
  LskMortalityReasonQuery,
  LskCullReason,
  CreateLskCullReasonDto,
  UpdateLskCullReasonDto,
  LskCullReasonQuery,
  LskDiseaseCode,
  CreateLskDiseaseCodeDto,
  UpdateLskDiseaseCodeDto,
  LskDiseaseCodeQuery,
  LskMedication,
  CreateLskMedicationDto,
  UpdateLskMedicationDto,
  LskMedicationQuery,
  LskVaccineSchedule,
  CreateLskVaccineScheduleDto,
  UpdateLskVaccineScheduleDto,
  LskVaccineScheduleQuery,
  LskFeedType,
  CreateLskFeedTypeDto,
  UpdateLskFeedTypeDto,
  LskFeedTypeQuery,
  LskFeedProgram,
  CreateLskFeedProgramDto,
  UpdateLskFeedProgramDto,
  LskFeedProgramQuery,
  LskPaginatedResponse,
  LskBasicStats,
  // Phase 2: Fish (Aquaculture)
  LskFishCohort,
  CreateLskFishCohortDto,
  UpdateLskFishCohortDto,
  LskFishCohortQuery,
  LskFishCohortStats,
  LskFishCohortSummary,
  LskCohortStatus,
  LskFishWaterReading,
  CreateLskWaterReadingDto,
  LskWaterReadingQuery,
  LskFishWaterThreshold,
  LskWaterParamType,
  LskFishFeedingEvent,
  CreateLskFishFeedingDto,
  LskFishFeedingQuery,
  LskFishSampling,
  CreateLskFishSamplingDto,
  LskFishSamplingQuery,
  LskFishMortality,
  CreateLskFishMortalityDto,
  LskFishMortalityQuery,
  LskFishHarvest,
  CreateLskFishHarvestDto,
  LskFishHarvestQuery,
  LskFishTransfer,
  CreateLskFishTransferDto,
  // Phase 3: Poultry
  LskFlock,
  CreateLskFlockDto,
  UpdateLskFlockDto,
  LskFlockQuery,
  LskFlockStats,
  LskFlockStatus,
  LskFlockSummary,
  LskFlockBrooding,
  CreateLskFlockBroodingDto,
  LskFlockEnvironment,
  CreateLskFlockEnvironmentDto,
  LskFlockFeedingEvent,
  CreateLskFlockFeedingDto,
  LskFlockWeightSample,
  CreateLskFlockWeightDto,
  LskFlockMortality,
  CreateLskFlockMortalityDto,
  LskFlockVaccination,
  CreateLskFlockVaccinationDto,
  UpdateLskFlockVaccinationDto,
  LskVaccinationStatus,
  LskFlockEggCollection,
  CreateLskFlockEggCollectionDto,
  // Phase 4: Large Animals (Cattle & Small Ruminants)
  LskAnimal,
  CreateLskAnimalDto,
  UpdateLskAnimalDto,
  LskAnimalQuery,
  LskAnimalStats,
  LskAnimalStatus,
  LskAnimalGroup,
  CreateLskAnimalGroupDto,
  UpdateLskAnimalGroupDto,
  LskAnimalWeight,
  CreateLskAnimalWeightDto,
  LskBreedingEvent,
  CreateLskBreedingEventDto,
  LskBreedingResult,
  UpdateLskBreedingResultDto,
  LskPregnancyCheck,
  CreateLskPregnancyCheckDto,
  LskCalvingEvent,
  CreateLskCalvingEventDto,
  LskMilkCollection,
  CreateLskMilkCollectionDto,
  LskMilkSession,
  LskGrazingRotation,
  CreateLskGrazingRotationDto,
  LskAnimalFeedingEvent,
  CreateLskAnimalFeedingDto,
  LskAnimalHealthEvent,
  CreateLskAnimalHealthDto,
  LskAnimalVaccination,
  CreateLskAnimalVaccinationDto,
  // Phase 5: Piggery
  LskPig,
  CreateLskPigDto,
  UpdateLskPigDto,
  LskPigQuery,
  LskPigStats,
  LskPigStatus,
  LskSowCard,
  LskBoarStud,
  LskPigBreedingEvent,
  CreateLskPigBreedingDto,
  LskBreedingMethod,
  LskPigFarrowingEvent,
  CreateLskPigFarrowingDto,
  LskPigNurseryBatch,
  CreateLskNurseryBatchDto,
  LskPigGrowFinishBatch,
  CreateLskGrowFinishBatchDto,
  LskPigBatchStatus,
  LskPigBatchStats,
  LskPigWeight,
  CreateLskPigWeightDto,
  LskPigMortality,
  CreateLskPigMortalityDto,
  // Phase 6: Feed & Nutrition
  LskFeedFormulation,
  CreateLskFeedFormulationDto,
  UpdateLskFeedFormulationDto,
  LskFeedFormulationQuery,
  LskFeedInventory,
  CreateLskFeedInventoryDto,
  UpdateLskFeedInventoryDto,
  LskFeedInventoryQuery,
  LskFeedInventoryStats,
  LskFeedReceipt,
  CreateLskFeedReceiptDto,
  LskFeedReceiptQuery,
  LskFeedIssue,
  CreateLskFeedIssueDto,
  LskFeedIssueQuery,
  LskFeedingSummary,
  LskFcrResult,
  // Phase 7: Health & Biosecurity
  LskHealthEvent,
  CreateLskHealthEventDto,
  UpdateLskHealthEventDto,
  LskHealthEventQuery,
  LskHealthEventStats,
  LskTreatment,
  CreateLskTreatmentDto,
  UpdateLskTreatmentStatusDto,
  LskTreatmentQuery,
  LskTreatmentWithdrawal,
  LskWithdrawalCheck,
  LskTreatmentStats,
  LskBiosecuritySop,
  CreateLskBiosecuritySopDto,
  UpdateLskBiosecuritySopDto,
  LskBiosecurityCheck,
  CreateLskBiosecurityCheckDto,
  LskBiosecurityCheckQuery,
  LskBiosecurityViolation,
  CreateLskBiosecurityViolationDto,
  LskBiosecurityViolationQuery,
  LskComplianceScore,
  LskBiosecurityStats,
  LskQuarantineZone,
  CreateLskQuarantineDto,
  UpdateLskQuarantineDto,
  LskQuarantineQuery,
  LskQuarantineStats,
  LskMovementPermit,
  CreateLskMovementPermitDto,
  UpdateLskMovementPermitStatusDto,
  LskMovementPermitQuery,
  LskMovementPermitStats,
  LskVisitorLog,
  CreateLskVisitorLogDto,
  LskVisitorLogQuery,
  LskVisitorLogStats,
  // Phase 9: Finance & Costing
  LskCostCenter,
  CreateLskCostCenterDto,
  UpdateLskCostCenterDto,
  LskCostCenterQuery,
  LskCostCenterStats,
  LskBiologicalAsset,
  CreateLskBiologicalAssetDto,
  LskBiologicalAssetQuery,
  LskAssetSummary,
  LskProfitabilityReport,
  LskProfitabilityQuery,
  LskProfitabilityOverview,
  LskCostVarianceAnalysis,
  // Phase 8: Processing & Cold Chain
  LskProcessingBatch,
  CreateLskProcessingBatchDto,
  LskProcessingBatchQuery,
  LskProcessingBatchStats,
  LskColdChainZone,
  CreateLskColdChainZoneDto,
  UpdateLskColdChainZoneDto,
  LskColdChainZoneQuery,
  LskColdChainReading,
  CreateLskColdChainReadingDto,
  LskColdChainReadingQuery,
  LskColdChainExcursion,
  CreateLskColdChainExcursionDto,
  LskColdChainExcursionQuery,
  LskColdChainStats,
  LskProductTraceability,
  CreateLskProductTraceabilityDto,
  LskTraceabilityQuery,
  LskTraceabilityStats,
  LskTraceabilityChain,
  // Phase 10: Analytics & KPIs
  LskFishKpis,
  LskPoultryKpis,
  LskCattleKpis,
  LskPiggeryKpis,
  LskCrossFarmKpis,
  LskDashboardOverview,
  LskRecentActivity,
  LskTrendDataPoint,
} from '@/types/livestock';

const BASE = '/livestock';

// ============================================================================
// SETTINGS API
// ============================================================================

export const lskSettingsApi = {
  get: async (): Promise<LskSettings> => {
    const response = await api.get(`${BASE}/settings`);
    return response.data;
  },

  update: async (data: UpdateLskSettingsDto): Promise<LskSettings> => {
    const response = await api.put(`${BASE}/settings`, data);
    return response.data;
  },
};

// ============================================================================
// SITES API
// ============================================================================

export const lskSitesApi = {
  list: async (query?: LskSiteQuery): Promise<LskPaginatedResponse<LskSite>> => {
    const response = await api.get(`${BASE}/sites`, { params: query });
    return response.data;
  },

  getAll: async (): Promise<LskSite[]> => {
    const response = await api.get(`${BASE}/sites/all`);
    return response.data;
  },

  getStats: async (): Promise<LskBasicStats> => {
    const response = await api.get(`${BASE}/sites/stats`);
    return response.data;
  },

  get: async (id: number): Promise<LskSite> => {
    const response = await api.get(`${BASE}/sites/${id}`);
    return response.data;
  },

  create: async (data: CreateLskSiteDto): Promise<LskSite> => {
    const response = await api.post(`${BASE}/sites`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateLskSiteDto): Promise<LskSite> => {
    const response = await api.put(`${BASE}/sites/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/sites/${id}`);
  },
};

// ============================================================================
// SITE UNITS API
// ============================================================================

export const lskSiteUnitsApi = {
  list: async (query?: LskSiteUnitQuery): Promise<LskPaginatedResponse<LskSiteUnit>> => {
    const response = await api.get(`${BASE}/site-units`, { params: query });
    return response.data;
  },

  getAll: async (): Promise<LskSiteUnit[]> => {
    const response = await api.get(`${BASE}/site-units/all`);
    return response.data;
  },

  getStats: async (): Promise<LskBasicStats> => {
    const response = await api.get(`${BASE}/site-units/stats`);
    return response.data;
  },

  get: async (id: number): Promise<LskSiteUnit> => {
    const response = await api.get(`${BASE}/site-units/${id}`);
    return response.data;
  },

  create: async (data: CreateLskSiteUnitDto): Promise<LskSiteUnit> => {
    const response = await api.post(`${BASE}/site-units`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateLskSiteUnitDto): Promise<LskSiteUnit> => {
    const response = await api.put(`${BASE}/site-units/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/site-units/${id}`);
  },
};

// ============================================================================
// SPECIES API
// ============================================================================

export const lskSpeciesApi = {
  list: async (query?: LskSpeciesQuery): Promise<LskPaginatedResponse<LskSpecies>> => {
    const response = await api.get(`${BASE}/species`, { params: query });
    return response.data;
  },

  getAll: async (): Promise<LskSpecies[]> => {
    const response = await api.get(`${BASE}/species/all`);
    return response.data;
  },

  getStats: async (): Promise<LskBasicStats> => {
    const response = await api.get(`${BASE}/species/stats`);
    return response.data;
  },

  get: async (id: number): Promise<LskSpecies> => {
    const response = await api.get(`${BASE}/species/${id}`);
    return response.data;
  },

  create: async (data: CreateLskSpeciesDto): Promise<LskSpecies> => {
    const response = await api.post(`${BASE}/species`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateLskSpeciesDto): Promise<LskSpecies> => {
    const response = await api.put(`${BASE}/species/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/species/${id}`);
  },
};

// ============================================================================
// BREEDS API
// ============================================================================

export const lskBreedsApi = {
  list: async (query?: LskBreedQuery): Promise<LskPaginatedResponse<LskBreed>> => {
    const response = await api.get(`${BASE}/breeds`, { params: query });
    return response.data;
  },

  getAll: async (): Promise<LskBreed[]> => {
    const response = await api.get(`${BASE}/breeds/all`);
    return response.data;
  },

  getStats: async (): Promise<LskBasicStats> => {
    const response = await api.get(`${BASE}/breeds/stats`);
    return response.data;
  },

  get: async (id: number): Promise<LskBreed> => {
    const response = await api.get(`${BASE}/breeds/${id}`);
    return response.data;
  },

  create: async (data: CreateLskBreedDto): Promise<LskBreed> => {
    const response = await api.post(`${BASE}/breeds`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateLskBreedDto): Promise<LskBreed> => {
    const response = await api.put(`${BASE}/breeds/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/breeds/${id}`);
  },
};

// ============================================================================
// MORTALITY REASONS API
// ============================================================================

export const lskMortalityReasonsApi = {
  list: async (query?: LskMortalityReasonQuery): Promise<LskPaginatedResponse<LskMortalityReason>> => {
    const response = await api.get(`${BASE}/mortality-reasons`, { params: query });
    return response.data;
  },

  getAll: async (): Promise<LskMortalityReason[]> => {
    const response = await api.get(`${BASE}/mortality-reasons/all`);
    return response.data;
  },

  get: async (id: number): Promise<LskMortalityReason> => {
    const response = await api.get(`${BASE}/mortality-reasons/${id}`);
    return response.data;
  },

  create: async (data: CreateLskMortalityReasonDto): Promise<LskMortalityReason> => {
    const response = await api.post(`${BASE}/mortality-reasons`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateLskMortalityReasonDto): Promise<LskMortalityReason> => {
    const response = await api.put(`${BASE}/mortality-reasons/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/mortality-reasons/${id}`);
  },
};

// ============================================================================
// CULL REASONS API
// ============================================================================

export const lskCullReasonsApi = {
  list: async (query?: LskCullReasonQuery): Promise<LskPaginatedResponse<LskCullReason>> => {
    const response = await api.get(`${BASE}/cull-reasons`, { params: query });
    return response.data;
  },

  getAll: async (): Promise<LskCullReason[]> => {
    const response = await api.get(`${BASE}/cull-reasons/all`);
    return response.data;
  },

  get: async (id: number): Promise<LskCullReason> => {
    const response = await api.get(`${BASE}/cull-reasons/${id}`);
    return response.data;
  },

  create: async (data: CreateLskCullReasonDto): Promise<LskCullReason> => {
    const response = await api.post(`${BASE}/cull-reasons`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateLskCullReasonDto): Promise<LskCullReason> => {
    const response = await api.put(`${BASE}/cull-reasons/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/cull-reasons/${id}`);
  },
};

// ============================================================================
// DISEASE CODES API
// ============================================================================

export const lskDiseaseCodesApi = {
  list: async (query?: LskDiseaseCodeQuery): Promise<LskPaginatedResponse<LskDiseaseCode>> => {
    const response = await api.get(`${BASE}/disease-codes`, { params: query });
    return response.data;
  },

  getAll: async (): Promise<LskDiseaseCode[]> => {
    const response = await api.get(`${BASE}/disease-codes/all`);
    return response.data;
  },

  get: async (id: number): Promise<LskDiseaseCode> => {
    const response = await api.get(`${BASE}/disease-codes/${id}`);
    return response.data;
  },

  create: async (data: CreateLskDiseaseCodeDto): Promise<LskDiseaseCode> => {
    const response = await api.post(`${BASE}/disease-codes`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateLskDiseaseCodeDto): Promise<LskDiseaseCode> => {
    const response = await api.put(`${BASE}/disease-codes/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/disease-codes/${id}`);
  },
};

// ============================================================================
// MEDICATION CATALOG API
// ============================================================================

export const lskMedicationCatalogApi = {
  list: async (query?: LskMedicationQuery): Promise<LskPaginatedResponse<LskMedication>> => {
    const response = await api.get(`${BASE}/medication-catalog`, { params: query });
    return response.data;
  },

  getAll: async (): Promise<LskMedication[]> => {
    const response = await api.get(`${BASE}/medication-catalog/all`);
    return response.data;
  },

  get: async (id: number): Promise<LskMedication> => {
    const response = await api.get(`${BASE}/medication-catalog/${id}`);
    return response.data;
  },

  create: async (data: CreateLskMedicationDto): Promise<LskMedication> => {
    const response = await api.post(`${BASE}/medication-catalog`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateLskMedicationDto): Promise<LskMedication> => {
    const response = await api.put(`${BASE}/medication-catalog/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/medication-catalog/${id}`);
  },
};

// ============================================================================
// VACCINE SCHEDULES API
// ============================================================================

export const lskVaccineSchedulesApi = {
  list: async (query?: LskVaccineScheduleQuery): Promise<LskPaginatedResponse<LskVaccineSchedule>> => {
    const response = await api.get(`${BASE}/vaccine-schedules`, { params: query });
    return response.data;
  },

  getAll: async (): Promise<LskVaccineSchedule[]> => {
    const response = await api.get(`${BASE}/vaccine-schedules/all`);
    return response.data;
  },

  get: async (id: number): Promise<LskVaccineSchedule> => {
    const response = await api.get(`${BASE}/vaccine-schedules/${id}`);
    return response.data;
  },

  create: async (data: CreateLskVaccineScheduleDto): Promise<LskVaccineSchedule> => {
    const response = await api.post(`${BASE}/vaccine-schedules`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateLskVaccineScheduleDto): Promise<LskVaccineSchedule> => {
    const response = await api.put(`${BASE}/vaccine-schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/vaccine-schedules/${id}`);
  },

  seedNigerianDefaults: async (): Promise<{ speciesCount: number; created: number; skipped: number }> => {
    const response = await api.post(`${BASE}/vaccine-schedules/seed-nigerian-defaults`);
    return response.data;
  },
};

// ============================================================================
// FEED TYPES API
// ============================================================================

export const lskFeedTypesApi = {
  list: async (query?: LskFeedTypeQuery): Promise<LskPaginatedResponse<LskFeedType>> => {
    const response = await api.get(`${BASE}/feed-types`, { params: query });
    return response.data;
  },

  getAll: async (): Promise<LskFeedType[]> => {
    const response = await api.get(`${BASE}/feed-types/all`);
    return response.data;
  },

  get: async (id: number): Promise<LskFeedType> => {
    const response = await api.get(`${BASE}/feed-types/${id}`);
    return response.data;
  },

  create: async (data: CreateLskFeedTypeDto): Promise<LskFeedType> => {
    const response = await api.post(`${BASE}/feed-types`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateLskFeedTypeDto): Promise<LskFeedType> => {
    const response = await api.put(`${BASE}/feed-types/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/feed-types/${id}`);
  },
};

// ============================================================================
// FEED PROGRAMS API
// ============================================================================

export const lskFeedProgramsApi = {
  list: async (query?: LskFeedProgramQuery): Promise<LskPaginatedResponse<LskFeedProgram>> => {
    const response = await api.get(`${BASE}/feed-programs`, { params: query });
    return response.data;
  },

  getAll: async (): Promise<LskFeedProgram[]> => {
    const response = await api.get(`${BASE}/feed-programs/all`);
    return response.data;
  },

  get: async (id: number): Promise<LskFeedProgram> => {
    const response = await api.get(`${BASE}/feed-programs/${id}`);
    return response.data;
  },

  create: async (data: CreateLskFeedProgramDto): Promise<LskFeedProgram> => {
    const response = await api.post(`${BASE}/feed-programs`, data);
    return response.data;
  },

  update: async (id: number, data: UpdateLskFeedProgramDto): Promise<LskFeedProgram> => {
    const response = await api.put(`${BASE}/feed-programs/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/feed-programs/${id}`);
  },
};

// ============================================================================
// Phase 2: Fish (Aquaculture) APIs
// ============================================================================

export const lskFishCohortsApi = {
  list: async (query?: LskFishCohortQuery): Promise<LskPaginatedResponse<LskFishCohort>> => {
    const response = await api.get(`${BASE}/fish-cohorts`, { params: query });
    return response.data;
  },
  getAll: async (): Promise<LskFishCohort[]> => {
    const response = await api.get(`${BASE}/fish-cohorts/all`);
    return response.data;
  },
  getStats: async (): Promise<LskFishCohortStats> => {
    const response = await api.get(`${BASE}/fish-cohorts/stats`);
    return response.data;
  },
  get: async (id: number): Promise<LskFishCohort> => {
    const response = await api.get(`${BASE}/fish-cohorts/${id}`);
    return response.data;
  },
  getSummary: async (id: number): Promise<LskFishCohortSummary> => {
    const response = await api.get(`${BASE}/fish-cohorts/${id}/summary`);
    return response.data;
  },
  create: async (data: CreateLskFishCohortDto): Promise<LskFishCohort> => {
    const response = await api.post(`${BASE}/fish-cohorts`, data);
    return response.data;
  },
  update: async (id: number, data: UpdateLskFishCohortDto): Promise<LskFishCohort> => {
    const response = await api.put(`${BASE}/fish-cohorts/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: number, data: { status: LskCohortStatus; notes?: string }): Promise<LskFishCohort> => {
    const response = await api.put(`${BASE}/fish-cohorts/${id}/status`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/fish-cohorts/${id}`);
  },
};

export const lskFishWaterApi = {
  listReadings: async (query?: LskWaterReadingQuery): Promise<LskPaginatedResponse<LskFishWaterReading>> => {
    const response = await api.get(`${BASE}/fish-water/readings`, { params: query });
    return response.data;
  },
  createReading: async (data: CreateLskWaterReadingDto): Promise<LskFishWaterReading> => {
    const response = await api.post(`${BASE}/fish-water/readings`, data);
    return response.data;
  },
  getLatest: async (siteUnitId: number): Promise<LskFishWaterReading[]> => {
    const response = await api.get(`${BASE}/fish-water/readings/latest/${siteUnitId}`);
    return response.data;
  },
  getTrend: async (params: { siteUnitId: number; paramType: LskWaterParamType; startDate: string; endDate: string }): Promise<LskFishWaterReading[]> => {
    const response = await api.get(`${BASE}/fish-water/readings/trend`, { params });
    return response.data;
  },
  getThresholds: async (speciesId?: number): Promise<LskFishWaterThreshold[]> => {
    const response = await api.get(`${BASE}/fish-water/thresholds`, { params: { speciesId } });
    return response.data;
  },
  createThreshold: async (data: Partial<LskFishWaterThreshold>): Promise<LskFishWaterThreshold> => {
    const response = await api.post(`${BASE}/fish-water/thresholds`, data);
    return response.data;
  },
  updateThreshold: async (id: number, data: Partial<LskFishWaterThreshold>): Promise<LskFishWaterThreshold> => {
    const response = await api.put(`${BASE}/fish-water/thresholds/${id}`, data);
    return response.data;
  },
};

export const lskFishFeedingApi = {
  list: async (query?: LskFishFeedingQuery): Promise<LskPaginatedResponse<LskFishFeedingEvent>> => {
    const response = await api.get(`${BASE}/fish-feeding`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskFishFeedingEvent> => {
    const response = await api.get(`${BASE}/fish-feeding/${id}`);
    return response.data;
  },
  create: async (data: CreateLskFishFeedingDto): Promise<LskFishFeedingEvent> => {
    const response = await api.post(`${BASE}/fish-feeding`, data);
    return response.data;
  },
  update: async (id: number, data: Partial<CreateLskFishFeedingDto>): Promise<LskFishFeedingEvent> => {
    const response = await api.put(`${BASE}/fish-feeding/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/fish-feeding/${id}`);
  },
  getSummary: async (cohortId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/fish-feeding/summary/${cohortId}`);
    return response.data;
  },
};

export const lskFishSamplingApi = {
  list: async (query?: LskFishSamplingQuery): Promise<LskPaginatedResponse<LskFishSampling>> => {
    const response = await api.get(`${BASE}/fish-sampling`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskFishSampling> => {
    const response = await api.get(`${BASE}/fish-sampling/${id}`);
    return response.data;
  },
  create: async (data: CreateLskFishSamplingDto): Promise<LskFishSampling> => {
    const response = await api.post(`${BASE}/fish-sampling`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/fish-sampling/${id}`);
  },
};

export const lskFishMortalityApi = {
  list: async (query?: LskFishMortalityQuery): Promise<LskPaginatedResponse<LskFishMortality>> => {
    const response = await api.get(`${BASE}/fish-mortality`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskFishMortality> => {
    const response = await api.get(`${BASE}/fish-mortality/${id}`);
    return response.data;
  },
  create: async (data: CreateLskFishMortalityDto): Promise<LskFishMortality> => {
    const response = await api.post(`${BASE}/fish-mortality`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/fish-mortality/${id}`);
  },
};

export const lskFishHarvestApi = {
  list: async (query?: LskFishHarvestQuery): Promise<LskPaginatedResponse<LskFishHarvest>> => {
    const response = await api.get(`${BASE}/fish-harvest`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskFishHarvest> => {
    const response = await api.get(`${BASE}/fish-harvest/${id}`);
    return response.data;
  },
  create: async (data: CreateLskFishHarvestDto): Promise<LskFishHarvest> => {
    const response = await api.post(`${BASE}/fish-harvest`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/fish-harvest/${id}`);
  },
};

export const lskFishTransferApi = {
  list: async (query?: { page?: number; limit?: number; cohortId?: number }): Promise<LskPaginatedResponse<LskFishTransfer>> => {
    const response = await api.get(`${BASE}/fish-transfers`, { params: query });
    return response.data;
  },
  create: async (data: CreateLskFishTransferDto): Promise<LskFishTransfer> => {
    const response = await api.post(`${BASE}/fish-transfers`, data);
    return response.data;
  },
};

// ============================================================================
// Phase 3: Poultry APIs
// ============================================================================

export const lskFlocksApi = {
  list: async (query?: LskFlockQuery): Promise<LskPaginatedResponse<LskFlock>> => {
    const response = await api.get(`${BASE}/flocks`, { params: query });
    return response.data;
  },
  getAll: async (): Promise<LskFlock[]> => {
    const response = await api.get(`${BASE}/flocks/all`);
    return response.data;
  },
  getStats: async (): Promise<LskFlockStats> => {
    const response = await api.get(`${BASE}/flocks/stats`);
    return response.data;
  },
  get: async (id: number): Promise<LskFlock> => {
    const response = await api.get(`${BASE}/flocks/${id}`);
    return response.data;
  },
  getSummary: async (id: number): Promise<LskFlockSummary> => {
    const response = await api.get(`${BASE}/flocks/${id}/summary`);
    return response.data;
  },
  create: async (data: CreateLskFlockDto): Promise<LskFlock> => {
    const response = await api.post(`${BASE}/flocks`, data);
    return response.data;
  },
  update: async (id: number, data: UpdateLskFlockDto): Promise<LskFlock> => {
    const response = await api.put(`${BASE}/flocks/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: number, data: { status: LskFlockStatus; notes?: string }): Promise<LskFlock> => {
    const response = await api.put(`${BASE}/flocks/${id}/status`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/flocks/${id}`);
  },
  generateVaccineSchedule: async (id: number): Promise<{ created: number; message: string }> => {
    const response = await api.post(`${BASE}/flocks/${id}/generate-vaccine-schedule`);
    return response.data;
  },
  getRecommendation: async (id: number): Promise<LskFlockRecommendation> => {
    const response = await api.get(`${BASE}/flocks/${id}/recommendation`);
    return response.data;
  },
  applyRecommendedStage: async (id: number, notes?: string): Promise<{ applied: boolean; previousStatus?: string; currentStatus: string; message: string }> => {
    const response = await api.post(`${BASE}/flocks/${id}/apply-recommended-stage`, { notes });
    return response.data;
  },
};

export interface LskFlockRecommendation {
  flockId: number;
  flockCode: string;
  purpose: 'BROILER' | 'LAYER' | 'BREEDER' | 'DUAL_PURPOSE' | null;
  currentStatus: 'PLANNED' | 'BROODING' | 'GROWING' | 'LAYING' | 'CULLING' | 'CLOSED' | 'CANCELLED';
  placementDate: string | null;
  ageDays: number | null;
  recommendedStatus: LskFlockRecommendation['currentStatus'] | null;
  stageNeedsTransition: boolean;
  recommendedFeedCategory: string | null;
  recommendedFeedTypeId: number | null;
  recommendedFeedTypeName: string | null;
  currentFeedTypeMatches: boolean | null;
  phaseName: string | null;
  phaseRange: { startDay: number; endDay: number } | null;
  source: 'feed-program' | 'default-broiler' | 'default-layer' | 'none';
  notes: string[];
}

export const lskFlockBroodingApi = {
  list: async (query?: { page?: number; limit?: number; flockId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskFlockBrooding>> => {
    const response = await api.get(`${BASE}/flock-brooding`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskFlockBrooding> => {
    const response = await api.get(`${BASE}/flock-brooding/${id}`);
    return response.data;
  },
  create: async (data: CreateLskFlockBroodingDto): Promise<LskFlockBrooding> => {
    const response = await api.post(`${BASE}/flock-brooding`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/flock-brooding/${id}`);
  },
};

export const lskFlockEnvironmentApi = {
  listReadings: async (query?: { page?: number; limit?: number; siteUnitId?: number; flockId?: number; startDate?: string; endDate?: string; isAlert?: boolean }): Promise<LskPaginatedResponse<LskFlockEnvironment>> => {
    const response = await api.get(`${BASE}/flock-environment/readings`, { params: query });
    return response.data;
  },
  createReading: async (data: CreateLskFlockEnvironmentDto): Promise<LskFlockEnvironment> => {
    const response = await api.post(`${BASE}/flock-environment/readings`, data);
    return response.data;
  },
  getLatest: async (siteUnitId: number): Promise<LskFlockEnvironment[]> => {
    const response = await api.get(`${BASE}/flock-environment/readings/latest/${siteUnitId}`);
    return response.data;
  },
};

export const lskFlockFeedingApi = {
  list: async (query?: { page?: number; limit?: number; flockId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskFlockFeedingEvent>> => {
    const response = await api.get(`${BASE}/flock-feeding`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskFlockFeedingEvent> => {
    const response = await api.get(`${BASE}/flock-feeding/${id}`);
    return response.data;
  },
  create: async (data: CreateLskFlockFeedingDto): Promise<LskFlockFeedingEvent> => {
    const response = await api.post(`${BASE}/flock-feeding`, data);
    return response.data;
  },
  update: async (id: number, data: Partial<CreateLskFlockFeedingDto>): Promise<LskFlockFeedingEvent> => {
    const response = await api.put(`${BASE}/flock-feeding/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/flock-feeding/${id}`);
  },
};

export const lskFlockWeightsApi = {
  list: async (query?: { page?: number; limit?: number; flockId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskFlockWeightSample>> => {
    const response = await api.get(`${BASE}/flock-weights`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskFlockWeightSample> => {
    const response = await api.get(`${BASE}/flock-weights/${id}`);
    return response.data;
  },
  create: async (data: CreateLskFlockWeightDto): Promise<LskFlockWeightSample> => {
    const response = await api.post(`${BASE}/flock-weights`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/flock-weights/${id}`);
  },
};

export const lskFlockMortalityApi = {
  list: async (query?: { page?: number; limit?: number; flockId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskFlockMortality>> => {
    const response = await api.get(`${BASE}/flock-mortality`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskFlockMortality> => {
    const response = await api.get(`${BASE}/flock-mortality/${id}`);
    return response.data;
  },
  create: async (data: CreateLskFlockMortalityDto): Promise<LskFlockMortality> => {
    const response = await api.post(`${BASE}/flock-mortality`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/flock-mortality/${id}`);
  },
};

export const lskFlockVaccinationsApi = {
  list: async (query?: { page?: number; limit?: number; flockId?: number; status?: LskVaccinationStatus; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskFlockVaccination>> => {
    const response = await api.get(`${BASE}/flock-vaccinations`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskFlockVaccination> => {
    const response = await api.get(`${BASE}/flock-vaccinations/${id}`);
    return response.data;
  },
  getSchedule: async (flockId: number): Promise<LskFlockVaccination[]> => {
    const response = await api.get(`${BASE}/flock-vaccinations/schedule/${flockId}`);
    return response.data;
  },
  create: async (data: CreateLskFlockVaccinationDto): Promise<LskFlockVaccination> => {
    const response = await api.post(`${BASE}/flock-vaccinations`, data);
    return response.data;
  },
  update: async (id: number, data: UpdateLskFlockVaccinationDto): Promise<LskFlockVaccination> => {
    const response = await api.put(`${BASE}/flock-vaccinations/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/flock-vaccinations/${id}`);
  },
};

export const lskFlockEggsApi = {
  list: async (query?: { page?: number; limit?: number; flockId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskFlockEggCollection>> => {
    const response = await api.get(`${BASE}/flock-eggs`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskFlockEggCollection> => {
    const response = await api.get(`${BASE}/flock-eggs/${id}`);
    return response.data;
  },
  create: async (data: CreateLskFlockEggCollectionDto): Promise<LskFlockEggCollection> => {
    const response = await api.post(`${BASE}/flock-eggs`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/flock-eggs/${id}`);
  },
  getSummary: async (flockId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/flock-eggs/summary/${flockId}`);
    return response.data;
  },
};

// ============================================================================
// Flock Voice Notes (Sprint 3A)
// ============================================================================

export interface LskFlockVoiceNote {
  id: number;
  companyId: number;
  flockId: number;
  uploadedById: number | null;
  uploadedByName?: string | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  durationSec: number | null;
  sizeBytes: number;
  category: 'general' | 'mortality' | 'health' | 'feeding' | null;
  transcript: string | null;
  url: string;
  createdAt: string;
}

// ============================================================================
// Buyer Marketplace (Sprint 3B)
// ============================================================================

export type LskMarketCategory = 'broiler' | 'layer' | 'eggs' | 'doc' | 'feed' | 'equipment' | 'other';
export type LskMarketUnit = 'bird' | 'crate' | 'kg' | 'bag' | 'tonne' | 'piece';

export interface LskMarketListing {
  id: number;
  companyId: number;
  flockId: number | null;
  title: string;
  category: LskMarketCategory;
  unitOfSale: LskMarketUnit;
  quantityAvailable: number;
  pricePerUnit: string;
  minOrderQty: number;
  readyByDate: string | null;
  locationState: string | null;
  locationCity: string | null;
  description: string | null;
  coverPhotoPath: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  views: number;
  contactName: string | null;
  contactPhone: string | null;
  createdAt: string;
}

export interface LskMarketQuoteRequest {
  id: number;
  companyId: number;
  listingId: number;
  listingTitle?: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  requestedQty: number;
  deliveryLocation: string | null;
  message: string | null;
  status: 'new' | 'responded' | 'converted' | 'declined';
  respondedAt: string | null;
  convertedPreorderId: number | null;
  createdAt: string;
}

export interface CreateLskMarketListingDto {
  flockId?: number;
  title: string;
  category: LskMarketCategory;
  unitOfSale: LskMarketUnit;
  quantityAvailable: number;
  pricePerUnit: number;
  minOrderQty?: number;
  readyByDate?: string;
  locationState?: string;
  locationCity?: string;
  description?: string;
  coverPhotoPath?: string;
  contactName?: string;
  contactPhone?: string;
  isPublished?: boolean;
}

export interface LskMarketListingPhoto {
  id: number;
  companyId: number;
  listingId: number;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  url: string;
  createdAt: string;
}

export const lskMarketListingsApi = {
  list: async (): Promise<LskMarketListing[]> => {
    const r = await api.get(`${BASE}/market-listings`);
    return r.data;
  },
  listPhotos: async (listingId: number): Promise<LskMarketListingPhoto[]> => {
    const r = await api.get(`${BASE}/market-listings/${listingId}/photos`);
    return r.data;
  },
  uploadPhoto: async (listingId: number, file: Blob, fileName: string): Promise<LskMarketListingPhoto> => {
    const form = new FormData();
    form.append('file', file, fileName);
    const r = await api.post(`${BASE}/market-listings/${listingId}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data;
  },
  reorderPhotos: async (listingId: number, photoIds: number[]): Promise<LskMarketListingPhoto[]> => {
    const r = await api.patch(`${BASE}/market-listings/${listingId}/photos/reorder`, { photoIds });
    return r.data;
  },
  deletePhoto: async (listingId: number, photoId: number): Promise<void> => {
    await api.delete(`${BASE}/market-listings/${listingId}/photos/${photoId}`);
  },
  get: async (id: number): Promise<LskMarketListing> => {
    const r = await api.get(`${BASE}/market-listings/${id}`);
    return r.data;
  },
  create: async (data: CreateLskMarketListingDto): Promise<LskMarketListing> => {
    const r = await api.post(`${BASE}/market-listings`, data);
    return r.data;
  },
  update: async (id: number, data: Partial<CreateLskMarketListingDto>): Promise<LskMarketListing> => {
    const r = await api.patch(`${BASE}/market-listings/${id}`, data);
    return r.data;
  },
  publish: async (id: number, isPublished: boolean): Promise<LskMarketListing> => {
    const r = await api.patch(`${BASE}/market-listings/${id}/publish`, { isPublished });
    return r.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/market-listings/${id}`);
  },
  listQuotes: async (opts: { status?: string; listingId?: number } = {}): Promise<LskMarketQuoteRequest[]> => {
    const r = await api.get(`${BASE}/market-listings/quotes`, { params: opts });
    return r.data;
  },
  updateQuoteStatus: async (id: number, status: LskMarketQuoteRequest['status']): Promise<LskMarketQuoteRequest> => {
    const r = await api.patch(`${BASE}/market-listings/quotes/${id}/status`, { status });
    return r.data;
  },
};

export interface PublicMarketListing {
  id: number;
  tenantSlug: string;
  companyName: string;
  title: string;
  category: LskMarketCategory;
  unitOfSale: LskMarketUnit;
  quantityAvailable: number;
  pricePerUnit: string;
  minOrderQty: number;
  readyByDate: string | null;
  locationState: string | null;
  locationCity: string | null;
  description: string | null;
  coverPhotoUrl: string | null;
  galleryUrls?: string[];
  contactName: string | null;
  contactPhone: string | null;
  publishedAt: string;
}

export interface PublicMarketQuoteInput {
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  requestedQty: number;
  deliveryLocation?: string;
  message?: string;
}

export const publicMarketplaceApi = {
  list: async (q: { category?: string; state?: string; search?: string; limit?: number; offset?: number } = {}): Promise<{ items: PublicMarketListing[]; total: number }> => {
    const r = await publicAxios.get('/public/marketplace/listings', { params: q });
    return r.data;
  },
  get: async (tenantSlug: string, id: number): Promise<PublicMarketListing> => {
    const r = await publicAxios.get(`/public/marketplace/listings/${tenantSlug}/${id}`);
    return r.data;
  },
  requestQuote: async (tenantSlug: string, id: number, body: PublicMarketQuoteInput): Promise<{ id: number }> => {
    const r = await publicAxios.post(`/public/marketplace/listings/${tenantSlug}/${id}/quote`, body);
    return r.data;
  },
};

export const lskFlockVoiceNotesApi = {
  list: async (flockId: number): Promise<LskFlockVoiceNote[]> => {
    const response = await api.get(`${BASE}/flock-voice-notes`, { params: { flockId } });
    return response.data;
  },
  upload: async (
    flockId: number,
    file: Blob,
    opts: { fileName: string; category?: string; durationSec?: number },
  ): Promise<LskFlockVoiceNote> => {
    const form = new FormData();
    form.append('file', file, opts.fileName);
    if (opts.category) form.append('category', opts.category);
    if (opts.durationSec != null) form.append('durationSec', String(opts.durationSec));
    const response = await api.post(`${BASE}/flock-voice-notes/flock/${flockId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  updateTranscript: async (id: number, transcript: string): Promise<LskFlockVoiceNote> => {
    const response = await api.patch(`${BASE}/flock-voice-notes/${id}/transcript`, { transcript });
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/flock-voice-notes/${id}`);
  },
};

// ============================================================================
// Phase 4: Large Animals APIs
// ============================================================================

export const lskAnimalsApi = {
  list: async (query?: LskAnimalQuery): Promise<LskPaginatedResponse<LskAnimal>> => {
    const response = await api.get(`${BASE}/animals`, { params: query });
    return response.data;
  },
  getAll: async (): Promise<LskAnimal[]> => {
    const response = await api.get(`${BASE}/animals/all`);
    return response.data;
  },
  getStats: async (): Promise<LskAnimalStats> => {
    const response = await api.get(`${BASE}/animals/stats`);
    return response.data;
  },
  get: async (id: number): Promise<LskAnimal> => {
    const response = await api.get(`${BASE}/animals/${id}`);
    return response.data;
  },
  getTimeline: async (id: number): Promise<Record<string, unknown>[]> => {
    const response = await api.get(`${BASE}/animals/${id}/timeline`);
    return response.data;
  },
  getPedigree: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/animals/${id}/pedigree`);
    return response.data;
  },
  create: async (data: CreateLskAnimalDto): Promise<LskAnimal> => {
    const response = await api.post(`${BASE}/animals`, data);
    return response.data;
  },
  update: async (id: number, data: UpdateLskAnimalDto): Promise<LskAnimal> => {
    const response = await api.put(`${BASE}/animals/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: number, data: { status: LskAnimalStatus; notes?: string }): Promise<LskAnimal> => {
    const response = await api.put(`${BASE}/animals/${id}/status`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/animals/${id}`);
  },
};

export const lskAnimalGroupsApi = {
  list: async (query?: { page?: number; limit?: number; search?: string; groupType?: string; isActive?: boolean }): Promise<LskPaginatedResponse<LskAnimalGroup>> => {
    const response = await api.get(`${BASE}/animal-groups`, { params: query });
    return response.data;
  },
  getAll: async (): Promise<LskAnimalGroup[]> => {
    const response = await api.get(`${BASE}/animal-groups/all`);
    return response.data;
  },
  get: async (id: number): Promise<LskAnimalGroup> => {
    const response = await api.get(`${BASE}/animal-groups/${id}`);
    return response.data;
  },
  getMembers: async (id: number): Promise<LskAnimal[]> => {
    const response = await api.get(`${BASE}/animal-groups/${id}/members`);
    return response.data;
  },
  create: async (data: CreateLskAnimalGroupDto): Promise<LskAnimalGroup> => {
    const response = await api.post(`${BASE}/animal-groups`, data);
    return response.data;
  },
  update: async (id: number, data: UpdateLskAnimalGroupDto): Promise<LskAnimalGroup> => {
    const response = await api.put(`${BASE}/animal-groups/${id}`, data);
    return response.data;
  },
  addMember: async (groupId: number, animalId: number): Promise<void> => {
    await api.post(`${BASE}/animal-groups/${groupId}/members`, { animalId });
  },
  removeMember: async (groupId: number, animalId: number): Promise<void> => {
    await api.delete(`${BASE}/animal-groups/${groupId}/members/${animalId}`);
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/animal-groups/${id}`);
  },
};

export const lskAnimalWeightsApi = {
  list: async (query?: { page?: number; limit?: number; animalId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskAnimalWeight>> => {
    const response = await api.get(`${BASE}/animal-weights`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskAnimalWeight> => {
    const response = await api.get(`${BASE}/animal-weights/${id}`);
    return response.data;
  },
  create: async (data: CreateLskAnimalWeightDto): Promise<LskAnimalWeight> => {
    const response = await api.post(`${BASE}/animal-weights`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/animal-weights/${id}`);
  },
};

export const lskBreedingApi = {
  list: async (query?: { page?: number; limit?: number; animalId?: number; result?: LskBreedingResult; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskBreedingEvent>> => {
    const response = await api.get(`${BASE}/breeding`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskBreedingEvent> => {
    const response = await api.get(`${BASE}/breeding/${id}`);
    return response.data;
  },
  create: async (data: CreateLskBreedingEventDto): Promise<LskBreedingEvent> => {
    const response = await api.post(`${BASE}/breeding`, data);
    return response.data;
  },
  update: async (id: number, data: Partial<CreateLskBreedingEventDto>): Promise<LskBreedingEvent> => {
    const response = await api.put(`${BASE}/breeding/${id}`, data);
    return response.data;
  },
  updateResult: async (id: number, data: UpdateLskBreedingResultDto): Promise<LskBreedingEvent> => {
    const response = await api.put(`${BASE}/breeding/${id}/result`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/breeding/${id}`);
  },
};

export const lskPregnancyChecksApi = {
  list: async (query?: { page?: number; limit?: number; animalId?: number; result?: LskBreedingResult; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskPregnancyCheck>> => {
    const response = await api.get(`${BASE}/pregnancy-checks`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskPregnancyCheck> => {
    const response = await api.get(`${BASE}/pregnancy-checks/${id}`);
    return response.data;
  },
  create: async (data: CreateLskPregnancyCheckDto): Promise<LskPregnancyCheck> => {
    const response = await api.post(`${BASE}/pregnancy-checks`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/pregnancy-checks/${id}`);
  },
};

export const lskCalvingApi = {
  list: async (query?: { page?: number; limit?: number; animalId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskCalvingEvent>> => {
    const response = await api.get(`${BASE}/calving`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskCalvingEvent> => {
    const response = await api.get(`${BASE}/calving/${id}`);
    return response.data;
  },
  create: async (data: CreateLskCalvingEventDto): Promise<LskCalvingEvent> => {
    const response = await api.post(`${BASE}/calving`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/calving/${id}`);
  },
};

export const lskMilkCollectionApi = {
  list: async (query?: { page?: number; limit?: number; animalId?: number; groupId?: number; session?: LskMilkSession; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskMilkCollection>> => {
    const response = await api.get(`${BASE}/milk-collection`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskMilkCollection> => {
    const response = await api.get(`${BASE}/milk-collection/${id}`);
    return response.data;
  },
  create: async (data: CreateLskMilkCollectionDto): Promise<LskMilkCollection> => {
    const response = await api.post(`${BASE}/milk-collection`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/milk-collection/${id}`);
  },
  getAnimalSummary: async (animalId: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`${BASE}/milk-collection/summary/${animalId}`);
    return response.data;
  },
  getDailyTotals: async (params: { startDate: string; endDate: string }): Promise<Record<string, unknown>[]> => {
    const response = await api.get(`${BASE}/milk-collection/daily-totals`, { params });
    return response.data;
  },
};

export const lskGrazingApi = {
  list: async (query?: { page?: number; limit?: number; siteUnitId?: number; groupId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskGrazingRotation>> => {
    const response = await api.get(`${BASE}/grazing`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskGrazingRotation> => {
    const response = await api.get(`${BASE}/grazing/${id}`);
    return response.data;
  },
  create: async (data: CreateLskGrazingRotationDto): Promise<LskGrazingRotation> => {
    const response = await api.post(`${BASE}/grazing`, data);
    return response.data;
  },
  update: async (id: number, data: Partial<CreateLskGrazingRotationDto>): Promise<LskGrazingRotation> => {
    const response = await api.put(`${BASE}/grazing/${id}`, data);
    return response.data;
  },
  getCurrent: async (siteUnitId: number): Promise<LskGrazingRotation | null> => {
    const response = await api.get(`${BASE}/grazing/current/${siteUnitId}`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/grazing/${id}`);
  },
};

export const lskAnimalFeedingApi = {
  list: async (query?: { page?: number; limit?: number; animalId?: number; groupId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskAnimalFeedingEvent>> => {
    const response = await api.get(`${BASE}/animal-feeding`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskAnimalFeedingEvent> => {
    const response = await api.get(`${BASE}/animal-feeding/${id}`);
    return response.data;
  },
  create: async (data: CreateLskAnimalFeedingDto): Promise<LskAnimalFeedingEvent> => {
    const response = await api.post(`${BASE}/animal-feeding`, data);
    return response.data;
  },
  update: async (id: number, data: Partial<CreateLskAnimalFeedingDto>): Promise<LskAnimalFeedingEvent> => {
    const response = await api.put(`${BASE}/animal-feeding/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/animal-feeding/${id}`);
  },
};

export const lskAnimalHealthApi = {
  list: async (query?: { page?: number; limit?: number; animalId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskAnimalHealthEvent>> => {
    const response = await api.get(`${BASE}/animal-health`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskAnimalHealthEvent> => {
    const response = await api.get(`${BASE}/animal-health/${id}`);
    return response.data;
  },
  create: async (data: CreateLskAnimalHealthDto): Promise<LskAnimalHealthEvent> => {
    const response = await api.post(`${BASE}/animal-health`, data);
    return response.data;
  },
  update: async (id: number, data: Partial<CreateLskAnimalHealthDto>): Promise<LskAnimalHealthEvent> => {
    const response = await api.put(`${BASE}/animal-health/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/animal-health/${id}`);
  },
};

export const lskAnimalVaccinationsApi = {
  list: async (query?: { page?: number; limit?: number; animalId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskAnimalVaccination>> => {
    const response = await api.get(`${BASE}/animal-vaccinations`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskAnimalVaccination> => {
    const response = await api.get(`${BASE}/animal-vaccinations/${id}`);
    return response.data;
  },
  create: async (data: CreateLskAnimalVaccinationDto): Promise<LskAnimalVaccination> => {
    const response = await api.post(`${BASE}/animal-vaccinations`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/animal-vaccinations/${id}`);
  },
};

// ============================================================================
// Phase 5: Piggery APIs
// ============================================================================

export const lskPigsApi = {
  list: async (query?: LskPigQuery): Promise<LskPaginatedResponse<LskPig>> => {
    const response = await api.get(`${BASE}/pigs`, { params: query });
    return response.data;
  },
  getAll: async (): Promise<LskPig[]> => {
    const response = await api.get(`${BASE}/pigs/all`);
    return response.data;
  },
  getStats: async (): Promise<LskPigStats> => {
    const response = await api.get(`${BASE}/pigs/stats`);
    return response.data;
  },
  get: async (id: number): Promise<LskPig> => {
    const response = await api.get(`${BASE}/pigs/${id}`);
    return response.data;
  },
  create: async (data: CreateLskPigDto): Promise<LskPig> => {
    const response = await api.post(`${BASE}/pigs`, data);
    return response.data;
  },
  update: async (id: number, data: UpdateLskPigDto): Promise<LskPig> => {
    const response = await api.put(`${BASE}/pigs/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: number, data: { status: LskPigStatus; notes?: string }): Promise<LskPig> => {
    const response = await api.put(`${BASE}/pigs/${id}/status`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/pigs/${id}`);
  },
};

export const lskSowCardsApi = {
  list: async (query?: { page?: number; limit?: number; search?: string; isActive?: boolean }): Promise<LskPaginatedResponse<LskSowCard>> => {
    const response = await api.get(`${BASE}/sow-cards`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskSowCard> => {
    const response = await api.get(`${BASE}/sow-cards/${id}`);
    return response.data;
  },
};

export const lskBoarStudsApi = {
  list: async (query?: { page?: number; limit?: number; search?: string; isActive?: boolean }): Promise<LskPaginatedResponse<LskBoarStud>> => {
    const response = await api.get(`${BASE}/boar-studs`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskBoarStud> => {
    const response = await api.get(`${BASE}/boar-studs/${id}`);
    return response.data;
  },
};

export const lskPigBreedingApi = {
  list: async (query?: { page?: number; limit?: number; sowId?: number; result?: string; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskPigBreedingEvent>> => {
    const response = await api.get(`${BASE}/pig-breeding`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskPigBreedingEvent> => {
    const response = await api.get(`${BASE}/pig-breeding/${id}`);
    return response.data;
  },
  create: async (data: CreateLskPigBreedingDto): Promise<LskPigBreedingEvent> => {
    const response = await api.post(`${BASE}/pig-breeding`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/pig-breeding/${id}`);
  },
};

export const lskPigFarrowingApi = {
  list: async (query?: { page?: number; limit?: number; sowId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskPigFarrowingEvent>> => {
    const response = await api.get(`${BASE}/pig-farrowing`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskPigFarrowingEvent> => {
    const response = await api.get(`${BASE}/pig-farrowing/${id}`);
    return response.data;
  },
  create: async (data: CreateLskPigFarrowingDto): Promise<LskPigFarrowingEvent> => {
    const response = await api.post(`${BASE}/pig-farrowing`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/pig-farrowing/${id}`);
  },
};

export const lskNurseryBatchesApi = {
  list: async (query?: { page?: number; limit?: number; status?: LskPigBatchStatus; search?: string }): Promise<LskPaginatedResponse<LskPigNurseryBatch>> => {
    const response = await api.get(`${BASE}/nursery-batches`, { params: query });
    return response.data;
  },
  getStats: async (): Promise<LskPigBatchStats> => {
    const response = await api.get(`${BASE}/nursery-batches/stats`);
    return response.data;
  },
  get: async (id: number): Promise<LskPigNurseryBatch> => {
    const response = await api.get(`${BASE}/nursery-batches/${id}`);
    return response.data;
  },
  create: async (data: CreateLskNurseryBatchDto): Promise<LskPigNurseryBatch> => {
    const response = await api.post(`${BASE}/nursery-batches`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/nursery-batches/${id}`);
  },
};

export const lskGrowFinishBatchesApi = {
  list: async (query?: { page?: number; limit?: number; status?: LskPigBatchStatus; search?: string }): Promise<LskPaginatedResponse<LskPigGrowFinishBatch>> => {
    const response = await api.get(`${BASE}/grow-finish-batches`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskPigGrowFinishBatch> => {
    const response = await api.get(`${BASE}/grow-finish-batches/${id}`);
    return response.data;
  },
  create: async (data: CreateLskGrowFinishBatchDto): Promise<LskPigGrowFinishBatch> => {
    const response = await api.post(`${BASE}/grow-finish-batches`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/grow-finish-batches/${id}`);
  },
};

export const lskPigWeightsApi = {
  list: async (query?: { page?: number; limit?: number; pigId?: number; batchId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskPigWeight>> => {
    const response = await api.get(`${BASE}/pig-weights`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskPigWeight> => {
    const response = await api.get(`${BASE}/pig-weights/${id}`);
    return response.data;
  },
  create: async (data: CreateLskPigWeightDto): Promise<LskPigWeight> => {
    const response = await api.post(`${BASE}/pig-weights`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/pig-weights/${id}`);
  },
};

export const lskPigMortalityApi = {
  list: async (query?: { page?: number; limit?: number; pigId?: number; batchId?: number; startDate?: string; endDate?: string }): Promise<LskPaginatedResponse<LskPigMortality>> => {
    const response = await api.get(`${BASE}/pig-mortality`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskPigMortality> => {
    const response = await api.get(`${BASE}/pig-mortality/${id}`);
    return response.data;
  },
  create: async (data: CreateLskPigMortalityDto): Promise<LskPigMortality> => {
    const response = await api.post(`${BASE}/pig-mortality`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/pig-mortality/${id}`);
  },
};

// ============================================================================
// Phase 6: Feed & Nutrition (Cross-Species)
// ============================================================================

export const lskFeedFormulationsApi = {
  list: async (query?: LskFeedFormulationQuery): Promise<LskPaginatedResponse<LskFeedFormulation>> => {
    const response = await api.get(`${BASE}/feed-formulations`, { params: query });
    return response.data;
  },
  getAll: async (): Promise<LskFeedFormulation[]> => {
    const response = await api.get(`${BASE}/feed-formulations/all`);
    return response.data;
  },
  get: async (id: number): Promise<LskFeedFormulation> => {
    const response = await api.get(`${BASE}/feed-formulations/${id}`);
    return response.data;
  },
  create: async (data: CreateLskFeedFormulationDto): Promise<LskFeedFormulation> => {
    const response = await api.post(`${BASE}/feed-formulations`, data);
    return response.data;
  },
  update: async (id: number, data: UpdateLskFeedFormulationDto): Promise<LskFeedFormulation> => {
    const response = await api.put(`${BASE}/feed-formulations/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/feed-formulations/${id}`);
  },
};

export const lskFeedInventoryApi = {
  list: async (query?: LskFeedInventoryQuery): Promise<LskPaginatedResponse<LskFeedInventory>> => {
    const response = await api.get(`${BASE}/feed-inventory`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskFeedInventory> => {
    const response = await api.get(`${BASE}/feed-inventory/${id}`);
    return response.data;
  },
  getAlerts: async (): Promise<LskFeedInventory[]> => {
    const response = await api.get(`${BASE}/feed-inventory/alerts`);
    return response.data;
  },
  getStats: async (): Promise<LskFeedInventoryStats> => {
    const response = await api.get(`${BASE}/feed-inventory/stats`);
    return response.data;
  },
  create: async (data: CreateLskFeedInventoryDto): Promise<LskFeedInventory> => {
    const response = await api.post(`${BASE}/feed-inventory`, data);
    return response.data;
  },
  update: async (id: number, data: UpdateLskFeedInventoryDto): Promise<LskFeedInventory> => {
    const response = await api.put(`${BASE}/feed-inventory/${id}`, data);
    return response.data;
  },
  adjustStock: async (id: number, data: { adjustmentKg: number; reason?: string }): Promise<LskFeedInventory> => {
    const response = await api.post(`${BASE}/feed-inventory/${id}/adjust`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/feed-inventory/${id}`);
  },
};

export const lskFeedIssuesApi = {
  list: async (query?: LskFeedIssueQuery): Promise<LskPaginatedResponse<LskFeedIssue>> => {
    const response = await api.get(`${BASE}/feed-issues`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskFeedIssue> => {
    const response = await api.get(`${BASE}/feed-issues/${id}`);
    return response.data;
  },
  getStats: async (): Promise<{ total: number; totalFeedKg: number; totalCost: number }> => {
    const response = await api.get(`${BASE}/feed-issues/stats`);
    return response.data;
  },
  getSummary: async (entityType: string, entityId: number): Promise<LskFeedingSummary> => {
    const response = await api.get(`${BASE}/feed-issues/summary/${entityType}/${entityId}`);
    return response.data;
  },
  getFcr: async (entityType: string, entityId: number): Promise<LskFcrResult> => {
    const response = await api.get(`${BASE}/feed-issues/fcr/${entityType}/${entityId}`);
    return response.data;
  },
  create: async (data: CreateLskFeedIssueDto): Promise<LskFeedIssue> => {
    const response = await api.post(`${BASE}/feed-issues`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/feed-issues/${id}`);
  },
};

// ============================================================================
// Phase 7: Health & Biosecurity APIs
// ============================================================================

export const lskHealthEventsApi = {
  list: async (query?: LskHealthEventQuery): Promise<LskPaginatedResponse<LskHealthEvent>> => {
    const response = await api.get(`${BASE}/health-events`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskHealthEvent> => {
    const response = await api.get(`${BASE}/health-events/${id}`);
    return response.data;
  },
  getStats: async (): Promise<LskHealthEventStats> => {
    const response = await api.get(`${BASE}/health-events/stats`);
    return response.data;
  },
  create: async (data: CreateLskHealthEventDto): Promise<LskHealthEvent> => {
    const response = await api.post(`${BASE}/health-events`, data);
    return response.data;
  },
  update: async (id: number, data: UpdateLskHealthEventDto): Promise<LskHealthEvent> => {
    const response = await api.put(`${BASE}/health-events/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/health-events/${id}`);
  },
};

export const lskTreatmentsApi = {
  list: async (query?: LskTreatmentQuery): Promise<LskPaginatedResponse<LskTreatment>> => {
    const response = await api.get(`${BASE}/treatments`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskTreatment> => {
    const response = await api.get(`${BASE}/treatments/${id}`);
    return response.data;
  },
  getStats: async (): Promise<LskTreatmentStats> => {
    const response = await api.get(`${BASE}/treatments/stats`);
    return response.data;
  },
  getActiveWithdrawals: async (): Promise<LskTreatmentWithdrawal[]> => {
    const response = await api.get(`${BASE}/treatments/active-withdrawals`);
    return response.data;
  },
  checkWithdrawal: async (entityType: string, entityId: number): Promise<LskWithdrawalCheck> => {
    const response = await api.get(`${BASE}/treatments/check-withdrawal/${entityType}/${entityId}`);
    return response.data;
  },
  create: async (data: CreateLskTreatmentDto): Promise<LskTreatment> => {
    const response = await api.post(`${BASE}/treatments`, data);
    return response.data;
  },
  updateStatus: async (id: number, data: UpdateLskTreatmentStatusDto): Promise<LskTreatment> => {
    const response = await api.put(`${BASE}/treatments/${id}/status`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/treatments/${id}`);
  },
};

export const lskBiosecurityApi = {
  // SOPs
  listSops: async (): Promise<LskBiosecuritySop[]> => {
    const response = await api.get(`${BASE}/biosecurity/sops`);
    return response.data;
  },
  getSop: async (id: number): Promise<LskBiosecuritySop> => {
    const response = await api.get(`${BASE}/biosecurity/sops/${id}`);
    return response.data;
  },
  createSop: async (data: CreateLskBiosecuritySopDto): Promise<LskBiosecuritySop> => {
    const response = await api.post(`${BASE}/biosecurity/sops`, data);
    return response.data;
  },
  updateSop: async (id: number, data: UpdateLskBiosecuritySopDto): Promise<LskBiosecuritySop> => {
    const response = await api.put(`${BASE}/biosecurity/sops/${id}`, data);
    return response.data;
  },
  deleteSop: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/biosecurity/sops/${id}`);
  },
  // Checks
  listChecks: async (query?: LskBiosecurityCheckQuery): Promise<LskPaginatedResponse<LskBiosecurityCheck>> => {
    const response = await api.get(`${BASE}/biosecurity/checks`, { params: query });
    return response.data;
  },
  getCheck: async (id: number): Promise<LskBiosecurityCheck> => {
    const response = await api.get(`${BASE}/biosecurity/checks/${id}`);
    return response.data;
  },
  createCheck: async (data: CreateLskBiosecurityCheckDto): Promise<LskBiosecurityCheck> => {
    const response = await api.post(`${BASE}/biosecurity/checks`, data);
    return response.data;
  },
  getComplianceScore: async (siteId: number): Promise<LskComplianceScore> => {
    const response = await api.get(`${BASE}/biosecurity/compliance/${siteId}`);
    return response.data;
  },
  // Violations
  listViolations: async (query?: LskBiosecurityViolationQuery): Promise<LskPaginatedResponse<LskBiosecurityViolation>> => {
    const response = await api.get(`${BASE}/biosecurity/violations`, { params: query });
    return response.data;
  },
  createViolation: async (data: CreateLskBiosecurityViolationDto): Promise<LskBiosecurityViolation> => {
    const response = await api.post(`${BASE}/biosecurity/violations`, data);
    return response.data;
  },
  // Stats
  getStats: async (): Promise<LskBiosecurityStats> => {
    const response = await api.get(`${BASE}/biosecurity/stats`);
    return response.data;
  },
};

export const lskQuarantineApi = {
  list: async (query?: LskQuarantineQuery): Promise<LskPaginatedResponse<LskQuarantineZone>> => {
    const response = await api.get(`${BASE}/quarantine`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskQuarantineZone> => {
    const response = await api.get(`${BASE}/quarantine/${id}`);
    return response.data;
  },
  getActive: async (): Promise<LskQuarantineZone[]> => {
    const response = await api.get(`${BASE}/quarantine/active`);
    return response.data;
  },
  getStats: async (): Promise<LskQuarantineStats> => {
    const response = await api.get(`${BASE}/quarantine/stats`);
    return response.data;
  },
  create: async (data: CreateLskQuarantineDto): Promise<LskQuarantineZone> => {
    const response = await api.post(`${BASE}/quarantine`, data);
    return response.data;
  },
  update: async (id: number, data: UpdateLskQuarantineDto): Promise<LskQuarantineZone> => {
    const response = await api.put(`${BASE}/quarantine/${id}`, data);
    return response.data;
  },
  release: async (id: number): Promise<LskQuarantineZone> => {
    const response = await api.put(`${BASE}/quarantine/${id}/release`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/quarantine/${id}`);
  },
};

export const lskMovementPermitsApi = {
  list: async (query?: LskMovementPermitQuery): Promise<LskPaginatedResponse<LskMovementPermit>> => {
    const response = await api.get(`${BASE}/movement-permits`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskMovementPermit> => {
    const response = await api.get(`${BASE}/movement-permits/${id}`);
    return response.data;
  },
  getStats: async (): Promise<LskMovementPermitStats> => {
    const response = await api.get(`${BASE}/movement-permits/stats`);
    return response.data;
  },
  create: async (data: CreateLskMovementPermitDto): Promise<LskMovementPermit> => {
    const response = await api.post(`${BASE}/movement-permits`, data);
    return response.data;
  },
  approve: async (id: number): Promise<LskMovementPermit> => {
    const response = await api.put(`${BASE}/movement-permits/${id}/approve`);
    return response.data;
  },
  reject: async (id: number, data: UpdateLskMovementPermitStatusDto): Promise<LskMovementPermit> => {
    const response = await api.put(`${BASE}/movement-permits/${id}/reject`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/movement-permits/${id}`);
  },
};

export const lskVisitorLogsApi = {
  list: async (query?: LskVisitorLogQuery): Promise<LskPaginatedResponse<LskVisitorLog>> => {
    const response = await api.get(`${BASE}/visitor-logs`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskVisitorLog> => {
    const response = await api.get(`${BASE}/visitor-logs/${id}`);
    return response.data;
  },
  getStats: async (siteId?: number): Promise<LskVisitorLogStats> => {
    const response = await api.get(`${BASE}/visitor-logs/stats`, { params: siteId ? { siteId } : {} });
    return response.data;
  },
  create: async (data: CreateLskVisitorLogDto): Promise<LskVisitorLog> => {
    const response = await api.post(`${BASE}/visitor-logs`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/visitor-logs/${id}`);
  },
};

export const lskFeedReceiptsApi = {
  list: async (query?: LskFeedReceiptQuery): Promise<LskPaginatedResponse<LskFeedReceipt>> => {
    const response = await api.get(`${BASE}/feed-receipts`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskFeedReceipt> => {
    const response = await api.get(`${BASE}/feed-receipts/${id}`);
    return response.data;
  },
  getStats: async (): Promise<{ total: number; totalQuantityKg: number; totalCost: number }> => {
    const response = await api.get(`${BASE}/feed-receipts/stats`);
    return response.data;
  },
  create: async (data: CreateLskFeedReceiptDto): Promise<LskFeedReceipt> => {
    const response = await api.post(`${BASE}/feed-receipts`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/feed-receipts/${id}`);
  },
};

// ============================================================================
// PHASE 9: FINANCE & COSTING APIs
// ============================================================================

export const lskCostCentersApi = {
  list: async (query?: LskCostCenterQuery): Promise<LskPaginatedResponse<LskCostCenter>> => {
    const response = await api.get(`${BASE}/cost-centers`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskCostCenter> => {
    const response = await api.get(`${BASE}/cost-centers/${id}`);
    return response.data;
  },
  getAll: async (): Promise<LskCostCenter[]> => {
    const response = await api.get(`${BASE}/cost-centers/all`);
    return response.data;
  },
  getStats: async (): Promise<LskCostCenterStats> => {
    const response = await api.get(`${BASE}/cost-centers/stats`);
    return response.data;
  },
  create: async (data: CreateLskCostCenterDto): Promise<LskCostCenter> => {
    const response = await api.post(`${BASE}/cost-centers`, data);
    return response.data;
  },
  update: async (id: number, data: UpdateLskCostCenterDto): Promise<LskCostCenter> => {
    const response = await api.put(`${BASE}/cost-centers/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/cost-centers/${id}`);
  },
};

export const lskBiologicalAssetsApi = {
  list: async (query?: LskBiologicalAssetQuery): Promise<LskPaginatedResponse<LskBiologicalAsset>> => {
    const response = await api.get(`${BASE}/biological-assets`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskBiologicalAsset> => {
    const response = await api.get(`${BASE}/biological-assets/${id}`);
    return response.data;
  },
  getSummary: async (): Promise<LskAssetSummary[]> => {
    const response = await api.get(`${BASE}/biological-assets/summary`);
    return response.data;
  },
  create: async (data: CreateLskBiologicalAssetDto): Promise<LskBiologicalAsset> => {
    const response = await api.post(`${BASE}/biological-assets`, data);
    return response.data;
  },
  valuate: async (entityType: string, entityId: number): Promise<LskBiologicalAsset> => {
    const response = await api.post(`${BASE}/biological-assets/valuate/${entityType}/${entityId}`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/biological-assets/${id}`);
  },
};

export const lskProfitabilityApi = {
  compute: async (entityType: string, entityId: number, periodStart: string, periodEnd: string): Promise<LskProfitabilityReport> => {
    const response = await api.get(`${BASE}/profitability/compute/${entityType}/${entityId}`, {
      params: { periodStart, periodEnd },
    });
    return response.data;
  },
  getVariance: async (entityType: string, entityId: number): Promise<LskCostVarianceAnalysis[]> => {
    const response = await api.get(`${BASE}/profitability/variance/${entityType}/${entityId}`);
    return response.data;
  },
  getOverview: async (): Promise<LskProfitabilityOverview> => {
    const response = await api.get(`${BASE}/profitability/overview`);
    return response.data;
  },
  getReports: async (query?: LskProfitabilityQuery): Promise<LskPaginatedResponse<LskProfitabilityReport>> => {
    const response = await api.get(`${BASE}/profitability/reports`, { params: query });
    return response.data;
  },
  getVarianceReports: async (query?: LskProfitabilityQuery): Promise<LskPaginatedResponse<LskCostVarianceAnalysis>> => {
    const response = await api.get(`${BASE}/profitability/variance-reports`, { params: query });
    return response.data;
  },
};

// ============================================================================
// PHASE 8: PROCESSING & COLD CHAIN APIs
// ============================================================================

export const lskProcessingApi = {
  list: async (query?: LskProcessingBatchQuery): Promise<LskPaginatedResponse<LskProcessingBatch>> => {
    const response = await api.get(`${BASE}/processing`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskProcessingBatch> => {
    const response = await api.get(`${BASE}/processing/${id}`);
    return response.data;
  },
  getStats: async (): Promise<LskProcessingBatchStats> => {
    const response = await api.get(`${BASE}/processing/stats`);
    return response.data;
  },
  create: async (data: CreateLskProcessingBatchDto): Promise<LskProcessingBatch> => {
    const response = await api.post(`${BASE}/processing`, data);
    return response.data;
  },
  updateStatus: async (id: number, status: string): Promise<LskProcessingBatch> => {
    const response = await api.put(`${BASE}/processing/${id}/status`, { status });
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/processing/${id}`);
  },
};

export const lskColdChainApi = {
  // Zones
  listZones: async (query?: LskColdChainZoneQuery): Promise<LskPaginatedResponse<LskColdChainZone>> => {
    const response = await api.get(`${BASE}/cold-chain/zones`, { params: query });
    return response.data;
  },
  getAllZones: async (): Promise<LskColdChainZone[]> => {
    const response = await api.get(`${BASE}/cold-chain/zones/all`);
    return response.data;
  },
  getZone: async (id: number): Promise<LskColdChainZone> => {
    const response = await api.get(`${BASE}/cold-chain/zones/${id}`);
    return response.data;
  },
  createZone: async (data: CreateLskColdChainZoneDto): Promise<LskColdChainZone> => {
    const response = await api.post(`${BASE}/cold-chain/zones`, data);
    return response.data;
  },
  updateZone: async (id: number, data: UpdateLskColdChainZoneDto): Promise<LskColdChainZone> => {
    const response = await api.put(`${BASE}/cold-chain/zones/${id}`, data);
    return response.data;
  },
  deleteZone: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/cold-chain/zones/${id}`);
  },
  // Readings
  listReadings: async (query?: LskColdChainReadingQuery): Promise<LskPaginatedResponse<LskColdChainReading>> => {
    const response = await api.get(`${BASE}/cold-chain/readings`, { params: query });
    return response.data;
  },
  getLatestReadings: async (zoneId: number): Promise<LskColdChainReading[]> => {
    const response = await api.get(`${BASE}/cold-chain/readings/latest/${zoneId}`);
    return response.data;
  },
  createReading: async (data: CreateLskColdChainReadingDto): Promise<LskColdChainReading> => {
    const response = await api.post(`${BASE}/cold-chain/readings`, data);
    return response.data;
  },
  // Excursions
  listExcursions: async (query?: LskColdChainExcursionQuery): Promise<LskPaginatedResponse<LskColdChainExcursion>> => {
    const response = await api.get(`${BASE}/cold-chain/excursions`, { params: query });
    return response.data;
  },
  createExcursion: async (data: CreateLskColdChainExcursionDto): Promise<LskColdChainExcursion> => {
    const response = await api.post(`${BASE}/cold-chain/excursions`, data);
    return response.data;
  },
  // Stats
  getStats: async (): Promise<LskColdChainStats> => {
    const response = await api.get(`${BASE}/cold-chain/stats`);
    return response.data;
  },
};

export const lskTraceabilityApi = {
  list: async (query?: LskTraceabilityQuery): Promise<LskPaginatedResponse<LskProductTraceability>> => {
    const response = await api.get(`${BASE}/traceability`, { params: query });
    return response.data;
  },
  get: async (id: number): Promise<LskProductTraceability> => {
    const response = await api.get(`${BASE}/traceability/${id}`);
    return response.data;
  },
  getStats: async (): Promise<LskTraceabilityStats> => {
    const response = await api.get(`${BASE}/traceability/stats`);
    return response.data;
  },
  trace: async (lotNumber: string): Promise<LskTraceabilityChain> => {
    const response = await api.get(`${BASE}/traceability/trace/${encodeURIComponent(lotNumber)}`);
    return response.data;
  },
  create: async (data: CreateLskProductTraceabilityDto): Promise<LskProductTraceability> => {
    const response = await api.post(`${BASE}/traceability`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/traceability/${id}`);
  },
};

// ============================================================================
// Phase 10: Analytics & KPIs
// ============================================================================

export const lskAnalyticsApi = {
  getFishKpis: async (): Promise<LskFishKpis> => {
    const response = await api.get(`${BASE}/analytics/fish-kpis`);
    return response.data;
  },
  getPoultryKpis: async (): Promise<LskPoultryKpis> => {
    const response = await api.get(`${BASE}/analytics/poultry-kpis`);
    return response.data;
  },
  getCattleKpis: async (): Promise<LskCattleKpis> => {
    const response = await api.get(`${BASE}/analytics/cattle-kpis`);
    return response.data;
  },
  getPiggeryKpis: async (): Promise<LskPiggeryKpis> => {
    const response = await api.get(`${BASE}/analytics/piggery-kpis`);
    return response.data;
  },
  getCrossFarmKpis: async (): Promise<LskCrossFarmKpis> => {
    const response = await api.get(`${BASE}/analytics/cross-farm-kpis`);
    return response.data;
  },
};

export const lskDashboardApi = {
  getOverview: async (): Promise<LskDashboardOverview> => {
    const response = await api.get(`${BASE}/dashboard/overview`);
    return response.data;
  },
  getRecentActivities: async (limit?: number): Promise<LskRecentActivity[]> => {
    const response = await api.get(`${BASE}/dashboard/recent-activities`, { params: { limit } });
    return response.data;
  },
  getMortalityTrends: async (period?: string): Promise<LskTrendDataPoint[]> => {
    const response = await api.get(`${BASE}/dashboard/mortality-trends`, { params: { period } });
    return response.data;
  },
  getFeedTrends: async (period?: string): Promise<LskTrendDataPoint[]> => {
    const response = await api.get(`${BASE}/dashboard/feed-trends`, { params: { period } });
    return response.data;
  },
};

// ============================================================================
// ALERT ENGINE
// ============================================================================

export type LskAlertRuleType =
  | 'MORTALITY_DAILY_PCT'
  | 'MORTALITY_CUMULATIVE_PCT'
  | 'HDP_DROP_3D'
  | 'FCR_HIGH'
  | 'FEED_TO_EGG_HIGH'
  | 'VACCINATION_OVERDUE';

export type LskAlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type LskAlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface LskAlertRule {
  id: number;
  companyId: number;
  ruleType: LskAlertRuleType;
  name: string;
  description: string | null;
  threshold: string | number;
  severity: LskAlertSeverity;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LskAlert {
  id: number;
  companyId: number;
  ruleId: number;
  ruleType: LskAlertRuleType;
  ruleName?: string;
  entityType: string;
  entityId: number;
  severity: LskAlertSeverity;
  status: LskAlertStatus;
  metric: string;
  observedValue: string | number;
  thresholdValue: string | number;
  message: string;
  contextJson: Record<string, unknown> | null;
  triggeredAt: string;
  acknowledgedAt: string | null;
  acknowledgedById: number | null;
  resolvedAt: string | null;
  resolvedById: number | null;
  resolutionNotes: string | null;
}

export interface LskAlertSummary {
  active: number;
  critical: number;
  warning: number;
  info: number;
  acknowledged: number;
}

export interface LskAlertListQuery {
  page?: number;
  limit?: number;
  status?: LskAlertStatus;
  severity?: LskAlertSeverity;
  ruleType?: LskAlertRuleType;
  entityType?: string;
  entityId?: number;
}

export const lskAlertsApi = {
  list: async (query: LskAlertListQuery = {}): Promise<{ data: LskAlert[]; total: number; page: number; limit: number }> => {
    const response = await api.get(`${BASE}/alerts`, { params: query });
    return response.data;
  },
  summary: async (): Promise<LskAlertSummary> => {
    const response = await api.get(`${BASE}/alerts/summary`);
    return response.data;
  },
  get: async (id: number): Promise<LskAlert> => {
    const response = await api.get(`${BASE}/alerts/${id}`);
    return response.data;
  },
  acknowledge: async (id: number, notes?: string): Promise<LskAlert> => {
    const response = await api.patch(`${BASE}/alerts/${id}/acknowledge`, { notes });
    return response.data;
  },
  resolve: async (id: number, resolutionNotes?: string): Promise<LskAlert> => {
    const response = await api.patch(`${BASE}/alerts/${id}/resolve`, { resolutionNotes });
    return response.data;
  },
  listRules: async (): Promise<{ data: LskAlertRule[] }> => {
    const response = await api.get(`${BASE}/alerts/rules`);
    return response.data;
  },
  createRule: async (payload: {
    ruleType: LskAlertRuleType;
    name: string;
    description?: string;
    threshold: number;
    severity?: LskAlertSeverity;
    isActive?: boolean;
  }): Promise<LskAlertRule> => {
    const response = await api.post(`${BASE}/alerts/rules`, payload);
    return response.data;
  },
  updateRule: async (
    id: number,
    payload: Partial<{
      name: string;
      description: string;
      threshold: number;
      severity: LskAlertSeverity;
      isActive: boolean;
    }>,
  ): Promise<LskAlertRule> => {
    const response = await api.put(`${BASE}/alerts/rules/${id}`, payload);
    return response.data;
  },
  deleteRule: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/alerts/rules/${id}`);
  },
  evaluateOverdue: async (): Promise<{ fired: number }> => {
    const response = await api.post(`${BASE}/alerts/evaluate-overdue`);
    return response.data;
  },
};

// ============================================================================
// NOTIFICATION CHANNEL
// ============================================================================

export type LskNotificationChannel = 'SMS' | 'WHATSAPP' | 'EMAIL';
export type LskNotificationStatus = 'QUEUED' | 'SENT' | 'FAILED';

export interface LskNotificationRecipient {
  id: number;
  name: string;
  channel: LskNotificationChannel;
  destination: string;
  minSeverity: LskAlertSeverity;
  ruleTypes: LskAlertRuleType[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LskNotificationLogEntry {
  id: number;
  companyId: number;
  alertId: number;
  recipientId: number;
  channel: LskNotificationChannel;
  destination: string;
  status: LskNotificationStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export const lskNotificationsApi = {
  listRecipients: async (): Promise<{ data: LskNotificationRecipient[] }> => {
    const response = await api.get(`${BASE}/notifications/recipients`);
    return response.data;
  },
  createRecipient: async (payload: {
    name: string;
    channel: LskNotificationChannel;
    destination: string;
    minSeverity?: LskAlertSeverity;
    ruleTypes?: LskAlertRuleType[];
    isActive?: boolean;
  }): Promise<LskNotificationRecipient> => {
    const response = await api.post(`${BASE}/notifications/recipients`, payload);
    return response.data;
  },
  updateRecipient: async (
    id: number,
    payload: Partial<{
      name: string;
      channel: LskNotificationChannel;
      destination: string;
      minSeverity: LskAlertSeverity;
      ruleTypes: LskAlertRuleType[] | null;
      isActive: boolean;
    }>,
  ): Promise<LskNotificationRecipient> => {
    const response = await api.put(`${BASE}/notifications/recipients/${id}`, payload);
    return response.data;
  },
  deleteRecipient: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/notifications/recipients/${id}`);
  },
  testRecipient: async (id: number): Promise<{ status: LskNotificationStatus; message: string }> => {
    const response = await api.post(`${BASE}/notifications/recipients/${id}/test`);
    return response.data;
  },
  listLog: async (params?: { page?: number; limit?: number; status?: LskNotificationStatus; alertId?: number }): Promise<{ data: LskNotificationLogEntry[]; total: number; page: number; limit: number }> => {
    const response = await api.get(`${BASE}/notifications/log`, { params });
    return response.data;
  },
};

// ============================================================================
// LEAKAGE CONTROLS (egg reconciliation + empty-bag ledger)
// ============================================================================

export interface LskEggReconciliation {
  id: number;
  reconciliationDate: string;
  flockId: number | null;
  flockCode?: string | null;
  openingStock: number;
  collectedToday: number;
  damagedToday: number;
  soldToday: number;
  adjustmentsToday: number;
  expectedClosingStock: number;
  actualClosingStock: number;
  variance: number;
  variancePercent: number | null;
  varianceNotes: string | null;
  createdAt: string;
}

export interface LskEmptyBagLog {
  id: number;
  logDate: string;
  feedTypeId: number | null;
  feedTypeName?: string | null;
  expectedEmptyBags: number;
  actualEmptyBags: number;
  bagsSoldForReturn: number;
  variance: number;
  notes: string | null;
  createdAt: string;
}

export const lskLeakageApi = {
  listEggReconciliations: async (params?: { page?: number; limit?: number; flockId?: number; startDate?: string; endDate?: string }): Promise<{ data: LskEggReconciliation[]; total: number; page: number; limit: number }> => {
    const response = await api.get(`${BASE}/leakage/egg-reconciliations`, { params });
    return response.data;
  },
  previewEggReconciliation: async (reconciliationDate: string, flockId?: number): Promise<{ openingStock: number; collectedToday: number; damagedToday: number; suggestedExpectedClosing: number }> => {
    const response = await api.get(`${BASE}/leakage/egg-reconciliations/preview`, { params: { reconciliationDate, flockId } });
    return response.data;
  },
  createEggReconciliation: async (payload: {
    reconciliationDate: string;
    flockId?: number;
    openingStock?: number;
    soldToday?: number;
    adjustmentsToday?: number;
    actualClosingStock: number;
    varianceNotes?: string;
  }): Promise<LskEggReconciliation> => {
    const response = await api.post(`${BASE}/leakage/egg-reconciliations`, payload);
    return response.data;
  },
  deleteEggReconciliation: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/leakage/egg-reconciliations/${id}`);
  },
  listEmptyBagLogs: async (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }): Promise<{ data: LskEmptyBagLog[]; total: number; page: number; limit: number }> => {
    const response = await api.get(`${BASE}/leakage/empty-bags`, { params });
    return response.data;
  },
  createEmptyBagLog: async (payload: {
    logDate: string;
    feedTypeId?: number;
    expectedEmptyBags: number;
    actualEmptyBags: number;
    bagsSoldForReturn?: number;
    notes?: string;
  }): Promise<LskEmptyBagLog> => {
    const response = await api.post(`${BASE}/leakage/empty-bags`, payload);
    return response.data;
  },
  deleteEmptyBagLog: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/leakage/empty-bags/${id}`);
  },
};

// ============================================================================
// VACCINE STOCK (batch tracking + expiry watch)
// ============================================================================

export interface LskVaccineStock {
  id: number;
  companyId: number;
  vaccineScheduleId: number | null;
  vaccineName: string;
  batchNumber: string;
  expiryDate: string;
  manufacturerName: string | null;
  supplierName: string | null;
  receivedDate: string | null;
  storageLocation: string | null;
  initialDoses: number;
  remainingDoses: number;
  unitCost: number | null;
  notes: string | null;
  isActive: boolean;
  daysToExpiry?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LskVaccineStockCreateDto {
  vaccineScheduleId?: number;
  vaccineName: string;
  batchNumber: string;
  expiryDate: string;
  manufacturerName?: string;
  supplierName?: string;
  receivedDate?: string;
  storageLocation?: string;
  initialDoses: number;
  remainingDoses?: number;
  unitCost?: number;
  notes?: string;
  isActive?: boolean;
}

// ============================================================================
// HATCHERY SCORECARD
// ============================================================================

export interface LskHatcheryScorecard {
  hatcheryId: number;
  hatcheryName: string;
  flockCount: number;
  totalBirdsPlaced: number;
  totalBirdsLost: number;
  avgPlacementWeightG: number | null;
  avgCumulativeMortalityPct: number | null;
  avgDay10MortalityPct: number | null;
  avgFcr: number | null;
  qualityScore: number;
  lastPlacementDate: string | null;
}

export const lskHatcheryApi = {
  scorecards: async (): Promise<{ data: LskHatcheryScorecard[] }> => {
    const response = await api.get(`${BASE}/hatcheries/scorecards`);
    return response.data;
  },
  scorecard: async (id: number): Promise<LskHatcheryScorecard | null> => {
    const response = await api.get(`${BASE}/hatcheries/${id}/scorecard`);
    return response.data;
  },
};

// ============================================================================
// MARKET PRICES + PRE-ORDERS
// ============================================================================

export type LskMarketProductType =
  | 'EGG_CRATE'
  | 'LIVE_BROILER_KG'
  | 'LIVE_LAYER_KG'
  | 'POINT_OF_LAY_PULLET'
  | 'DAY_OLD_CHICK'
  | 'SPENT_HEN'
  | 'OTHER';

export type LskPreorderStatus = 'BOOKED' | 'FULFILLED' | 'CANCELLED';

export interface LskMarketPrice {
  id: number;
  productType: LskMarketProductType;
  productLabel: string | null;
  price: number;
  currencyCode: string;
  recordedDate: string;
  source: string | null;
  notes: string | null;
  createdAt: string;
}

export interface LskCurrentMarketPrice {
  productType: LskMarketProductType;
  productLabel: string | null;
  price: number;
  currencyCode: string;
  recordedDate: string;
  priorPrice: number | null;
  priorDate: string | null;
  percentChange: number | null;
}

export interface LskPreorder {
  id: number;
  customerId: number;
  customerName?: string;
  productType: LskMarketProductType;
  productLabel: string | null;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  totalAmount: number | null;
  expectedDeliveryDate: string;
  status: LskPreorderStatus;
  fulfilledAt: string | null;
  depositAmount: number | null;
  salesOrderId: number | null;
  notes: string | null;
  createdAt: string;
}

export const lskMarketPricesApi = {
  list: async (params?: { page?: number; limit?: number; productType?: LskMarketProductType }): Promise<{ data: LskMarketPrice[]; total: number; page: number; limit: number }> => {
    const response = await api.get(`${BASE}/market-prices`, { params });
    return response.data;
  },
  current: async (): Promise<{ data: LskCurrentMarketPrice[] }> => {
    const response = await api.get(`${BASE}/market-prices/current`);
    return response.data;
  },
  create: async (payload: {
    productType: LskMarketProductType;
    productLabel?: string;
    price: number;
    currencyCode?: string;
    recordedDate: string;
    source?: string;
    notes?: string;
  }): Promise<LskMarketPrice> => {
    const response = await api.post(`${BASE}/market-prices`, payload);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/market-prices/${id}`);
  },
};

export const lskPreordersApi = {
  list: async (params?: { page?: number; limit?: number; status?: LskPreorderStatus; customerId?: number; fromDate?: string; toDate?: string }): Promise<{ data: LskPreorder[]; total: number; page: number; limit: number }> => {
    const response = await api.get(`${BASE}/preorders`, { params });
    return response.data;
  },
  create: async (payload: {
    customerId: number;
    productType: LskMarketProductType;
    productLabel?: string;
    quantity: number;
    unit?: string;
    unitPrice?: number;
    expectedDeliveryDate: string;
    depositAmount?: number;
    notes?: string;
  }): Promise<LskPreorder> => {
    const response = await api.post(`${BASE}/preorders`, payload);
    return response.data;
  },
  get: async (id: number): Promise<LskPreorder> => {
    const response = await api.get(`${BASE}/preorders/${id}`);
    return response.data;
  },
  fulfill: async (
    id: number,
    body?: {
      itemId?: number;
      flockId?: number;
      eggCollectionId?: number;
      avgLiveWeightKg?: number;
      eggGrade?: string;
      orderDate?: string;
      warehouseId?: number;
      salesRepId?: number;
      notes?: string;
      paymentMethodId?: number;
    },
  ): Promise<LskPreorder | { preorder: LskPreorder; salesOrderId: number; salesOrderNumber: string; depositCreatedId: number | null }> => {
    const response = await api.patch(`${BASE}/preorders/${id}/fulfill`, body ?? {});
    return response.data;
  },
  cancel: async (id: number): Promise<LskPreorder> => {
    const response = await api.patch(`${BASE}/preorders/${id}/cancel`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/preorders/${id}`);
  },
};

export type LskSaleLinkType =
  | 'PREORDER_FULFILLMENT'
  | 'DIRECT_FLOCK_SALE'
  | 'EGG_SALE'
  | 'SPENT_HEN_SALE';

export const lskSaleLinksApi = {
  create: async (body: {
    salesOrderId?: number;
    salesOrderLineId?: number;
    salesInvoiceId?: number;
    salesInvoiceLineId?: number;
    preorderId?: number;
    flockId?: number;
    eggCollectionId?: number;
    linkType: LskSaleLinkType;
    quantity: number;
    unit?: string;
    avgLiveWeightKg?: number;
    eggGrade?: string;
    notes?: string;
  }): Promise<{ id: number }> => {
    const response = await api.post(`${BASE}/sale-links`, body);
    return response.data;
  },
};

export const lskFlockRevenueApi = {
  get: async (flockId: number): Promise<{ totalQuantity: number; totalRevenue: number; saleCount: number }> => {
    const response = await api.get(`${BASE}/flocks/${flockId}/revenue-summary`);
    return response.data;
  },
};

export const lskVaccineStockApi = {
  list: async (params?: { page?: number; limit?: number; search?: string; expiringWithinDays?: number; includeExpired?: boolean }): Promise<{ data: LskVaccineStock[]; total: number; page: number; limit: number }> => {
    const response = await api.get(`${BASE}/vaccine-stock`, { params });
    return response.data;
  },
  summary: async (): Promise<{ active: number; expiringSoon: number; expired: number; totalRemainingDoses: number }> => {
    const response = await api.get(`${BASE}/vaccine-stock/summary`);
    return response.data;
  },
  get: async (id: number): Promise<LskVaccineStock> => {
    const response = await api.get(`${BASE}/vaccine-stock/${id}`);
    return response.data;
  },
  create: async (payload: LskVaccineStockCreateDto): Promise<LskVaccineStock> => {
    const response = await api.post(`${BASE}/vaccine-stock`, payload);
    return response.data;
  },
  update: async (id: number, payload: Partial<LskVaccineStockCreateDto>): Promise<LskVaccineStock> => {
    const response = await api.put(`${BASE}/vaccine-stock/${id}`, payload);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/vaccine-stock/${id}`);
  },
};

// ----------------------------------------------------------------------------
// Seed Defaults (one-click setup for new tenants)
// ----------------------------------------------------------------------------

export interface PoultrySeedResult {
  speciesAdded: number;
  breedsAdded: number;
  feedTypesAdded: number;
  feedProgramsAdded: number;
  feedPhasesAdded: number;
}

export const lskSeedDefaultsApi = {
  poultry: async (): Promise<PoultrySeedResult> => {
    const r = await api.post(`${BASE}/seed-defaults/poultry`);
    return r.data;
  },
};
