import { api } from '../api';
import type {
  AcademicSession,
  Term,
  ClassLevel,
  ClassSection,
  Subject,
  ClassSubject,
  GradingScale,
  Student,
  Guardian,
  MedicalRecord,
  Enrolment,
  EnrolmentWithDetails,
  StudentDocument,
  SmStaff,
  SectionOccupancy,
  StudentStats,
  CurrentContext,
  PaginatedResponse,
  FeeCategory,
  FeeStructure,
  FeeInvoice,
  FeePayment,
  FeeDiscount,
  StudentFeeStatus,
  Assessment,
  ScoreGrid,
  ClassResultOverview,
  BroadsheetData,
  ReportCardData,
  PsychomotorClassData,
  PsychomotorTraits,
  PromotionPreviewRow,
  PromotionHistoryRow,
} from '@/types/school-management';

// ============================================================================
// SESSIONS API
// ============================================================================

export const sessionsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<AcademicSession>> => {
    const response = await api.get('/school-management/sessions', { params });
    return response.data;
  },

  get: async (id: number): Promise<AcademicSession> => {
    const response = await api.get(`/school-management/sessions/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<AcademicSession> => {
    const response = await api.post('/school-management/sessions', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<AcademicSession> => {
    const response = await api.put(`/school-management/sessions/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/school-management/sessions/${id}`);
  },

  setCurrent: async (id: number): Promise<AcademicSession> => {
    const response = await api.post(`/school-management/sessions/${id}/set-current`);
    return response.data;
  },

  getCurrentContext: async (): Promise<CurrentContext> => {
    const response = await api.get('/school-management/sessions/current-context');
    return response.data;
  },

  // Terms
  listTerms: async (sessionId: number): Promise<Term[]> => {
    const response = await api.get(`/school-management/sessions/${sessionId}/terms`);
    return response.data;
  },

  createTerm: async (sessionId: number, data: Record<string, unknown>): Promise<Term> => {
    const response = await api.post(`/school-management/sessions/${sessionId}/terms`, data);
    return response.data;
  },

  updateTerm: async (termId: number, data: Record<string, unknown>): Promise<Term> => {
    const response = await api.put(`/school-management/sessions/terms/${termId}`, data);
    return response.data;
  },

  deleteTerm: async (termId: number): Promise<void> => {
    await api.delete(`/school-management/sessions/terms/${termId}`);
  },

  setCurrentTerm: async (termId: number): Promise<Term> => {
    const response = await api.post(`/school-management/sessions/terms/${termId}/set-current`);
    return response.data;
  },
};

// ============================================================================
// CLASSES API
// ============================================================================

export const classLevelsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<ClassLevel>> => {
    const response = await api.get('/school-management/classes', { params });
    return response.data;
  },

  get: async (id: number): Promise<ClassLevel> => {
    const response = await api.get(`/school-management/classes/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<ClassLevel> => {
    const response = await api.post('/school-management/classes', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<ClassLevel> => {
    const response = await api.put(`/school-management/classes/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/school-management/classes/${id}`);
  },

  // Sections
  listSections: async (classLevelId: number): Promise<ClassSection[]> => {
    const response = await api.get(`/school-management/classes/${classLevelId}/sections`);
    return response.data;
  },

  createSection: async (classLevelId: number, data: Record<string, unknown>): Promise<ClassSection> => {
    const response = await api.post(`/school-management/classes/${classLevelId}/sections`, data);
    return response.data;
  },

  updateSection: async (sectionId: number, data: Record<string, unknown>): Promise<ClassSection> => {
    const response = await api.put(`/school-management/classes/sections/${sectionId}`, data);
    return response.data;
  },

  deleteSection: async (sectionId: number): Promise<void> => {
    await api.delete(`/school-management/classes/sections/${sectionId}`);
  },
};

// ============================================================================
// SUBJECTS API
// ============================================================================

export const subjectsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Subject>> => {
    const response = await api.get('/school-management/subjects', { params });
    return response.data;
  },

  get: async (id: number): Promise<Subject> => {
    const response = await api.get(`/school-management/subjects/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Subject> => {
    const response = await api.post('/school-management/subjects', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Subject> => {
    const response = await api.put(`/school-management/subjects/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/school-management/subjects/${id}`);
  },

  assignToClass: async (data: Record<string, unknown>): Promise<ClassSubject> => {
    const response = await api.post('/school-management/subjects/assign', data);
    return response.data;
  },

  removeFromClass: async (classLevelId: number, subjectId: number): Promise<void> => {
    await api.delete(`/school-management/subjects/assign/${classLevelId}/${subjectId}`);
  },

  getClassCurriculum: async (classLevelId: number): Promise<ClassSubject[]> => {
    const response = await api.get(`/school-management/subjects/curriculum/${classLevelId}`);
    return response.data;
  },
};

// ============================================================================
// GRADING SCALES API
// ============================================================================

export const gradingScalesApi = {
  list: async (): Promise<GradingScale[]> => {
    const response = await api.get('/school-management/grading-scales');
    return response.data;
  },

  get: async (id: number): Promise<GradingScale> => {
    const response = await api.get(`/school-management/grading-scales/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<GradingScale> => {
    const response = await api.post('/school-management/grading-scales', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<GradingScale> => {
    const response = await api.put(`/school-management/grading-scales/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/school-management/grading-scales/${id}`);
  },
};

// ============================================================================
// STUDENTS API
// ============================================================================

export const studentsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Student>> => {
    const response = await api.get('/school-management/students', { params });
    return response.data;
  },

  get: async (id: number): Promise<Student> => {
    const response = await api.get(`/school-management/students/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Student> => {
    const response = await api.post('/school-management/students', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Student> => {
    const response = await api.put(`/school-management/students/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/school-management/students/${id}`);
  },

  getStats: async (): Promise<StudentStats> => {
    const response = await api.get('/school-management/students/stats');
    return response.data;
  },

  updateMedical: async (studentId: number, data: Record<string, unknown>): Promise<MedicalRecord> => {
    const response = await api.put(`/school-management/students/${studentId}/medical`, data);
    return response.data;
  },

  getDocuments: async (studentId: number): Promise<StudentDocument[]> => {
    const response = await api.get(`/school-management/students/${studentId}/documents`);
    return response.data;
  },
};

// ============================================================================
// GUARDIANS API
// ============================================================================

export const guardiansApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Guardian>> => {
    const response = await api.get('/school-management/guardians', { params });
    return response.data;
  },

  get: async (id: number): Promise<Guardian> => {
    const response = await api.get(`/school-management/guardians/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Guardian> => {
    const response = await api.post('/school-management/guardians', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Guardian> => {
    const response = await api.put(`/school-management/guardians/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/school-management/guardians/${id}`);
  },

  getWards: async (guardianId: number): Promise<Student[]> => {
    const response = await api.get(`/school-management/guardians/${guardianId}/wards`);
    return response.data;
  },
};

// ============================================================================
// ENROLMENTS API
// ============================================================================

export const enrolmentsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<EnrolmentWithDetails>> => {
    const response = await api.get('/school-management/enrolments', { params });
    return response.data;
  },

  enrol: async (data: Record<string, unknown>): Promise<Enrolment> => {
    const response = await api.post('/school-management/enrolments', data);
    return response.data;
  },

  bulkEnrol: async (data: Record<string, unknown>) => {
    const response = await api.post('/school-management/enrolments/bulk', data);
    return response.data;
  },

  getClassRoster: async (sessionId: number, classLevelId: number): Promise<EnrolmentWithDetails[]> => {
    const response = await api.get(`/school-management/enrolments/by-class/${sessionId}/${classLevelId}`);
    return response.data;
  },

  getSectionOccupancy: async (sessionId: number, classLevelId: number): Promise<SectionOccupancy[]> => {
    const response = await api.get(`/school-management/enrolments/occupancy/${sessionId}/${classLevelId}`);
    return response.data;
  },
};

// ============================================================================
// STAFF API
// ============================================================================

export const staffApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<SmStaff>> => {
    const response = await api.get('/school-management/staff', { params });
    return response.data;
  },

  get: async (id: number): Promise<SmStaff> => {
    const response = await api.get(`/school-management/staff/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<SmStaff> => {
    const response = await api.post('/school-management/staff', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<SmStaff> => {
    const response = await api.put(`/school-management/staff/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/school-management/staff/${id}`);
  },
};

// ============================================================================
// FEE CATEGORIES API
// ============================================================================

export const feeCategoriesApi = {
  list: async (): Promise<FeeCategory[]> => {
    const response = await api.get('/school-management/fee-categories');
    return response.data;
  },

  get: async (id: number): Promise<FeeCategory> => {
    const response = await api.get(`/school-management/fee-categories/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<FeeCategory> => {
    const response = await api.post('/school-management/fee-categories', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<FeeCategory> => {
    const response = await api.put(`/school-management/fee-categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/school-management/fee-categories/${id}`);
  },

  seedDefaults: async (): Promise<void> => {
    await api.post('/school-management/fee-categories/seed-defaults');
  },
};

// ============================================================================
// FEE STRUCTURES API
// ============================================================================

export const feeStructuresApi = {
  list: async (params?: Record<string, unknown>): Promise<FeeStructure[]> => {
    const response = await api.get('/school-management/fee-structures', { params });
    return response.data;
  },

  get: async (id: number): Promise<FeeStructure> => {
    const response = await api.get(`/school-management/fee-structures/${id}`);
    return response.data;
  },

  getByClass: async (sessionId: number, termId: number, classLevelId: number): Promise<FeeStructure[]> => {
    const response = await api.get(`/school-management/fee-structures/by-class/${sessionId}/${termId}/${classLevelId}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<FeeStructure> => {
    const response = await api.post('/school-management/fee-structures', data);
    return response.data;
  },

  bulkCreate: async (data: Record<string, unknown>): Promise<FeeStructure[]> => {
    const response = await api.post('/school-management/fee-structures/bulk', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<FeeStructure> => {
    const response = await api.put(`/school-management/fee-structures/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/school-management/fee-structures/${id}`);
  },

  rollover: async (data: Record<string, unknown>) => {
    const response = await api.post('/school-management/fee-structures/rollover', data);
    return response.data;
  },
};

// ============================================================================
// FEE INVOICES API
// ============================================================================

export const feeInvoicesApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<FeeInvoice>> => {
    const response = await api.get('/school-management/fee-invoices', { params });
    return response.data;
  },

  get: async (id: number): Promise<FeeInvoice> => {
    const response = await api.get(`/school-management/fee-invoices/${id}`);
    return response.data;
  },

  generate: async (data: Record<string, unknown>) => {
    const response = await api.post('/school-management/fee-invoices/generate', data);
    return response.data;
  },

  cancel: async (id: number): Promise<FeeInvoice> => {
    const response = await api.put(`/school-management/fee-invoices/${id}/cancel`);
    return response.data;
  },

  getStudentStatus: async (studentId: number): Promise<StudentFeeStatus> => {
    const response = await api.get(`/school-management/fee-invoices/student/${studentId}`);
    return response.data;
  },

  markOverdue: async (): Promise<{ updated: number }> => {
    const response = await api.put('/school-management/fee-invoices/mark-overdue');
    return response.data;
  },
};

// ============================================================================
// FEE PAYMENTS API
// ============================================================================

export const feePaymentsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<FeePayment>> => {
    const response = await api.get('/school-management/fee-payments', { params });
    return response.data;
  },

  get: async (id: number): Promise<FeePayment> => {
    const response = await api.get(`/school-management/fee-payments/${id}`);
    return response.data;
  },

  record: async (data: Record<string, unknown>): Promise<FeePayment> => {
    const response = await api.post('/school-management/fee-payments', data);
    return response.data;
  },

  refund: async (id: number): Promise<FeePayment> => {
    const response = await api.post(`/school-management/fee-payments/${id}/refund`);
    return response.data;
  },
};

// ============================================================================
// FEE DISCOUNTS API
// ============================================================================

export const feeDiscountsApi = {
  list: async (): Promise<FeeDiscount[]> => {
    const response = await api.get('/school-management/fee-discounts');
    return response.data;
  },

  get: async (id: number): Promise<FeeDiscount> => {
    const response = await api.get(`/school-management/fee-discounts/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<FeeDiscount> => {
    const response = await api.post('/school-management/fee-discounts', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<FeeDiscount> => {
    const response = await api.put(`/school-management/fee-discounts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/school-management/fee-discounts/${id}`);
  },

  apply: async (data: Record<string, unknown>) => {
    const response = await api.post('/school-management/fee-discounts/apply', data);
    return response.data;
  },
};

// ============================================================================
// ASSESSMENTS API
// ============================================================================

export const assessmentsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Assessment>> => {
    const response = await api.get('/school-management/assessments', { params });
    return response.data;
  },

  get: async (id: number): Promise<Assessment> => {
    const response = await api.get(`/school-management/assessments/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Assessment> => {
    const response = await api.post('/school-management/assessments', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Assessment> => {
    const response = await api.put(`/school-management/assessments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/school-management/assessments/${id}`);
  },

  byClass: async (sessionId: number, termId: number, classLevelId: number, subjectId: number): Promise<Assessment[]> => {
    const response = await api.get('/school-management/assessments/by-class', {
      params: { sessionId, termId, classLevelId, subjectId },
    });
    return response.data;
  },
};

// ============================================================================
// SCORES API
// ============================================================================

export const scoresApi = {
  enterScores: async (data: Record<string, unknown>) => {
    const response = await api.post('/school-management/scores/enter', data);
    return response.data;
  },

  getGrid: async (sessionId: number, termId: number, classLevelId: number, subjectId: number): Promise<ScoreGrid> => {
    const response = await api.get('/school-management/scores/grid', {
      params: { sessionId, termId, classLevelId, subjectId },
    });
    return response.data;
  },

  getStudentScores: async (studentId: number, sessionId: number, termId: number) => {
    const response = await api.get(`/school-management/scores/student/${studentId}`, {
      params: { sessionId, termId },
    });
    return response.data;
  },
};

// ============================================================================
// RESULTS API
// ============================================================================

export const resultsApi = {
  compute: async (data: Record<string, unknown>) => {
    const response = await api.post('/school-management/results/compute', data);
    return response.data;
  },

  getBroadsheet: async (sessionId: number, termId: number, classLevelId: number): Promise<BroadsheetData> => {
    const response = await api.get('/school-management/results/broadsheet', {
      params: { sessionId, termId, classLevelId },
    });
    return response.data;
  },

  getReportCard: async (studentId: number, sessionId: number, termId: number): Promise<ReportCardData> => {
    const response = await api.get(`/school-management/results/report-card/${studentId}`, {
      params: { sessionId, termId },
    });
    return response.data;
  },

  getClassOverview: async (sessionId: number, termId: number, classLevelId: number): Promise<ClassResultOverview> => {
    const response = await api.get('/school-management/results/class-overview', {
      params: { sessionId, termId, classLevelId },
    });
    return response.data;
  },

  approve: async (sessionId: number, termId: number, classLevelId: number) => {
    const response = await api.put('/school-management/results/approve', { sessionId, termId, classLevelId });
    return response.data;
  },

  publish: async (sessionId: number, termId: number, classLevelId: number) => {
    const response = await api.put('/school-management/results/publish', { sessionId, termId, classLevelId });
    return response.data;
  },

  updateComments: async (summaryId: number, data: Record<string, unknown>) => {
    const response = await api.put(`/school-management/results/comments/${summaryId}`, data);
    return response.data;
  },
};

// ============================================================================
// PSYCHOMOTOR API
// ============================================================================

export const psychomotorApi = {
  saveRatings: async (data: Record<string, unknown>) => {
    const response = await api.post('/school-management/psychomotor/save', data);
    return response.data;
  },

  bulkSave: async (data: Record<string, unknown>) => {
    const response = await api.post('/school-management/psychomotor/bulk-save', data);
    return response.data;
  },

  getStudentRatings: async (studentId: number, sessionId: number, termId: number) => {
    const response = await api.get(`/school-management/psychomotor/student/${studentId}`, {
      params: { sessionId, termId },
    });
    return response.data;
  },

  getClassRatings: async (sessionId: number, termId: number, classLevelId: number): Promise<PsychomotorClassData> => {
    const response = await api.get('/school-management/psychomotor/class', {
      params: { sessionId, termId, classLevelId },
    });
    return response.data;
  },

  getDefaultTraits: async (): Promise<PsychomotorTraits> => {
    const response = await api.get('/school-management/psychomotor/traits');
    return response.data;
  },
};

// ============================================================================
// PROMOTIONS API
// ============================================================================

export const promotionsApi = {
  getPreview: async (sessionId: number, termId: number, classLevelId: number): Promise<PromotionPreviewRow[]> => {
    const response = await api.get('/school-management/promotions/preview', {
      params: { sessionId, termId, classLevelId },
    });
    return response.data;
  },

  batchPromote: async (data: Record<string, unknown>) => {
    const response = await api.post('/school-management/promotions/batch', data);
    return response.data;
  },

  getHistory: async (sessionId: number): Promise<PromotionHistoryRow[]> => {
    const response = await api.get('/school-management/promotions/history', {
      params: { sessionId },
    });
    return response.data;
  },
};

// ============================================================================
// ATTENDANCE API
// ============================================================================

export const attendanceApi = {
  takeAttendance: async (data: Record<string, unknown>) => {
    const response = await api.post('/school-management/attendance/take', data);
    return response.data;
  },

  getClassAttendance: async (sessionId: number, termId: number, classLevelId: number, date: string) => {
    const response = await api.get('/school-management/attendance/class', {
      params: { sessionId, termId, classLevelId, date },
    });
    return response.data;
  },

  getSummary: async (sessionId: number, termId: number, classLevelId: number) => {
    const response = await api.get('/school-management/attendance/summary', {
      params: { sessionId, termId, classLevelId },
    });
    return response.data;
  },

  getStudentAttendance: async (studentId: number, sessionId: number, termId: number) => {
    const response = await api.get('/school-management/attendance/student', {
      params: { studentId, sessionId, termId },
    });
    return response.data;
  },
};
