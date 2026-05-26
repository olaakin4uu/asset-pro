import { api } from '../api';
import type { PaginatedResponse } from '@/types/core';
import type {
  Employee,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryParams,
  EmployeeStats,
  ImportEmployeeItem,
  ImportEmployeesResult,
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentQueryParams,
  Position,
  CreatePositionDto,
  UpdatePositionDto,
  PositionQueryParams,
  Cadre,
  CreateCadreDto,
  UpdateCadreDto,
  CadreQueryParams,
  GradeLevel,
  CreateGradeLevelDto,
  UpdateGradeLevelDto,
  GradeLevelQueryParams,
  SalaryStructure,
  CreateSalaryStructureDto,
  UpdateSalaryStructureDto,
  SalaryStructureQueryParams,
  SalaryStructureStats,
  PayrollItem,
  CreatePayrollItemDto,
  UpdatePayrollItemDto,
  PayrollItemQueryParams,
  PayrollItemStats,
  PayrollCalendar,
  CreatePayrollCalendarDto,
  UpdatePayrollCalendarDto,
  PayrollCalendarQueryParams,
  PayrollCalendarStats,
  PayrollPeriod,
  Payroll,
  CreatePayrollDto,
  UpdatePayrollDto,
  PayrollQueryParams,
  PayrollStats,
  RunPayrollDto,
  Leave,
  CreateLeaveDto,
  UpdateLeaveDto,
  LeaveQueryParams,
  LeaveStats,
  LeaveBalance,
  Loan,
  CreateLoanDto,
  UpdateLoanDto,
  LoanQueryParams,
  LoanStats,
  EmployeeGradeAssignment,
  CreateGradeAssignmentDto,
  UpdateGradeAssignmentDto,
  GradeAssignmentQueryParams,
  ExpenseClaim,
  CreateExpenseClaimDto,
  UpdateExpenseClaimDto,
  ExpenseClaimQueryParams,
  ExpenseClaimStats,
  HRSettings,
  UpdateHRSettingsDto,
  // Loan Types
  LoanTypeEntity,
  CreateLoanTypeDto,
  UpdateLoanTypeDto,
  LoanTypeQueryParams,
  LoanRepayment,
  LoanRepaymentQueryParams,
  // Recruitment
  JobPosting,
  CreateJobPostingDto,
  UpdateJobPostingDto,
  JobPostingQueryParams,
  JobApplication,
  CreateJobApplicationDto,
  UpdateJobApplicationDto,
  JobApplicationQueryParams,
  Interview,
  CreateInterviewDto,
  UpdateInterviewDto,
  InterviewQueryParams,
  JobOffer,
  CreateJobOfferDto,
  UpdateJobOfferDto,
  JobOfferQueryParams,
  // Training
  TrainingProgram,
  CreateTrainingProgramDto,
  UpdateTrainingProgramDto,
  TrainingProgramQueryParams,
  TrainingEnrollment,
  CreateTrainingEnrollmentDto,
  UpdateTrainingEnrollmentDto,
  TrainingEnrollmentQueryParams,
  // Benefits
  Benefit,
  CreateBenefitDto,
  UpdateBenefitDto,
  BenefitQueryParams,
  BenefitEnrollment,
  CreateBenefitEnrollmentDto,
  UpdateBenefitEnrollmentDto,
  BenefitEnrollmentQueryParams,
  Dependent,
  CreateDependentDto,
  UpdateDependentDto,
  DependentQueryParams,
  // Time Scheduling
  WorkSchedule,
  CreateWorkScheduleDto,
  UpdateWorkScheduleDto,
  WorkScheduleQueryParams,
  Shift,
  CreateShiftDto,
  UpdateShiftDto,
  ShiftQueryParams,
  OvertimeRequest,
  CreateOvertimeRequestDto,
  UpdateOvertimeRequestDto,
  OvertimeRequestQueryParams,
  // Onboarding/Offboarding
  OnboardingTemplate,
  CreateOnboardingTemplateDto,
  UpdateOnboardingTemplateDto,
  EmployeeOnboarding,
  StartOnboardingDto,
  OnboardingQueryParams,
  OffboardingTemplate,
  CreateOffboardingTemplateDto,
  UpdateOffboardingTemplateDto,
  EmployeeOffboarding,
  StartOffboardingDto,
  OffboardingQueryParams,
  // Performance
  PerformanceReview,
  CreatePerformanceReviewDto,
  UpdatePerformanceReviewDto,
  PerformanceReviewQueryParams,
  PerformanceGoal,
  CreatePerformanceGoalDto,
  UpdatePerformanceGoalDto,
  PerformanceGoalQueryParams,
  // Documents
  EmployeeDocument,
  CreateEmployeeDocumentDto,
  UpdateEmployeeDocumentDto,
  EmployeeDocumentQueryParams,
  // Expense Categories
  ExpenseCategory,
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  ExpenseCategoryQueryParams,
  // Leave Type Config
  LeaveTypeConfig,
  CreateLeaveTypeConfigDto,
  UpdateLeaveTypeConfigDto,
  LeaveTypeConfigQueryParams,
  // Time Clock Records
  TimeClockRecord,
  CreateTimeClockRecordDto,
  UpdateTimeClockRecordDto,
  TimeClockRecordQueryParams,
  // Probation
  Probation,
  CreateProbationDto,
  UpdateProbationDto,
  ProbationQueryParams,
  // Reimbursement
  Reimbursement,
  CreateReimbursementDto,
  UpdateReimbursementDto,
  ReimbursementQueryParams,
  // Shift Assignment
  ShiftAssignment,
  CreateShiftAssignmentDto,
  UpdateShiftAssignmentDto,
  ShiftAssignmentQueryParams,
  // Roster
  Roster,
  CreateRosterDto,
  UpdateRosterDto,
  RosterQueryParams,
  // Roster Entry
  RosterEntry,
  CreateRosterEntryDto,
  UpdateRosterEntryDto,
  RosterEntryQueryParams,
  // Employee Work Schedule
  EmployeeWorkSchedule,
  CreateEmployeeWorkScheduleDto,
  UpdateEmployeeWorkScheduleDto,
  EmployeeWorkScheduleQueryParams,
  // Job Placement
  JobPlacement,
  CreateJobPlacementDto,
  UpdateJobPlacementDto,
  JobPlacementQueryParams,
  // Interview Schedule
  InterviewSchedule,
  CreateInterviewScheduleDto,
  UpdateInterviewScheduleDto,
  InterviewScheduleQueryParams,
  // Performance Review Template
  PerformanceReviewTemplate,
  CreatePerformanceReviewTemplateDto,
  UpdatePerformanceReviewTemplateDto,
  PerformanceReviewTemplateQueryParams,
  // Payslip Generation
  PayslipGeneration,
  PayslipGenerationQueryParams,
  // Pivot types
  EmployeeSkillRecord,
  CreateEmployeeSkillDto,
  EmployeeCertificationRecord,
  CreateEmployeeCertificationDto,
  EmployeeKpiRecord,
  CreateEmployeeKpiDto,
} from '@/types/hrpayroll';

// ============================================================================
// EMPLOYEES API
// ============================================================================

export const employeesApi = {
  list: async (params?: EmployeeQueryParams): Promise<PaginatedResponse<Employee>> => {
    const response = await api.get('/hrpayroll/employees', { params });
    return response.data;
  },

  get: async (id: number): Promise<Employee> => {
    const response = await api.get(`/hrpayroll/employees/${id}`);
    return response.data;
  },

  create: async (data: CreateEmployeeDto): Promise<Employee> => {
    const response = await api.post('/hrpayroll/employees', data);
    return response.data;
  },

  update: async (id: number, data: UpdateEmployeeDto): Promise<Employee> => {
    const response = await api.patch(`/hrpayroll/employees/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/employees/${id}`);
  },

  getStats: async (): Promise<EmployeeStats> => {
    const response = await api.get('/hrpayroll/employees/stats');
    return response.data;
  },

  me: async (): Promise<Employee | null> => {
    try {
      const response = await api.get('/hrpayroll/employees/me');
      return response.data;
    } catch {
      return null;
    }
  },

  lookup: async (): Promise<{ id: number; fullName: string; employeeCode: string; companyId: number }[]> => {
    // Endpoint lives in core module — no hrpayroll module gate
    const response = await api.get('/core/users/employees/lookup');
    return response.data;
  },

  getLeaveBalance: async (id: number): Promise<LeaveBalance> => {
    const response = await api.get(`/hrpayroll/employees/${id}/leave-balance`);
    return response.data;
  },

  terminate: async (id: number, data: { terminationDate: string; reason: string }): Promise<Employee> => {
    const response = await api.post(`/hrpayroll/employees/${id}/terminate`, data);
    return response.data;
  },

  reactivate: async (id: number): Promise<Employee> => {
    const response = await api.post(`/hrpayroll/employees/${id}/reactivate`);
    return response.data;
  },

  getImportTemplate: async (): Promise<{ headers: string[]; sampleRows: string[][]; notes: Record<string, string> }> => {
    const response = await api.get('/hrpayroll/employees/import/template');
    return response.data;
  },

  importEmployees: async (
    employees: ImportEmployeeItem[],
    importMode?: 'skip' | 'update' | 'overwrite',
  ): Promise<ImportEmployeesResult> => {
    const response = await api.post('/hrpayroll/employees/import', { employees, importMode });
    return response.data;
  },
};

// ============================================================================
// DEPARTMENTS API
// ============================================================================

export const departmentsApi = {
  list: async (params?: DepartmentQueryParams): Promise<PaginatedResponse<Department>> => {
    const response = await api.get('/hrpayroll/departments', { params });
    return response.data;
  },

  get: async (id: number): Promise<Department> => {
    const response = await api.get(`/hrpayroll/departments/${id}`);
    return response.data;
  },

  create: async (data: CreateDepartmentDto): Promise<Department> => {
    const response = await api.post('/hrpayroll/departments', data);
    return response.data;
  },

  update: async (id: number, data: UpdateDepartmentDto): Promise<Department> => {
    const response = await api.patch(`/hrpayroll/departments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/departments/${id}`);
  },
};

// ============================================================================
// POSITIONS API
// ============================================================================

export const positionsApi = {
  list: async (params?: PositionQueryParams): Promise<PaginatedResponse<Position>> => {
    const response = await api.get('/hrpayroll/positions', { params });
    return response.data;
  },

  get: async (id: number): Promise<Position> => {
    const response = await api.get(`/hrpayroll/positions/${id}`);
    return response.data;
  },

  create: async (data: CreatePositionDto): Promise<Position> => {
    const response = await api.post('/hrpayroll/positions', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePositionDto): Promise<Position> => {
    const response = await api.patch(`/hrpayroll/positions/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/positions/${id}`);
  },
};

// ============================================================================
// CADRES API
// ============================================================================

export const cadresApi = {
  list: async (params?: CadreQueryParams): Promise<PaginatedResponse<Cadre>> => {
    const response = await api.get('/hrpayroll/cadres', { params });
    return response.data;
  },

  get: async (id: number): Promise<Cadre> => {
    const response = await api.get(`/hrpayroll/cadres/${id}`);
    return response.data;
  },

  create: async (data: CreateCadreDto): Promise<Cadre> => {
    const response = await api.post('/hrpayroll/cadres', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCadreDto): Promise<Cadre> => {
    const response = await api.patch(`/hrpayroll/cadres/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/cadres/${id}`);
  },

  submit: async (id: number): Promise<Cadre> => {
    const response = await api.post(`/hrpayroll/cadres/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<Cadre> => {
    const response = await api.post(`/hrpayroll/cadres/${id}/approve`);
    return response.data;
  },
};

// ============================================================================
// GRADE LEVELS API
// ============================================================================

export const gradeLevelsApi = {
  list: async (params?: GradeLevelQueryParams): Promise<PaginatedResponse<GradeLevel>> => {
    const response = await api.get('/hrpayroll/grade-levels', { params });
    return response.data;
  },

  get: async (id: number): Promise<GradeLevel> => {
    const response = await api.get(`/hrpayroll/grade-levels/${id}`);
    return response.data;
  },

  create: async (data: CreateGradeLevelDto): Promise<GradeLevel> => {
    const response = await api.post('/hrpayroll/grade-levels', data);
    return response.data;
  },

  update: async (id: number, data: UpdateGradeLevelDto): Promise<GradeLevel> => {
    const response = await api.patch(`/hrpayroll/grade-levels/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/grade-levels/${id}`);
  },

  submit: async (id: number): Promise<GradeLevel> => {
    const response = await api.post(`/hrpayroll/grade-levels/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<GradeLevel> => {
    const response = await api.post(`/hrpayroll/grade-levels/${id}/approve`);
    return response.data;
  },

  getSalaryAtStep: async (id: number, step: number): Promise<{ salary: number; breakdown: Record<string, unknown> }> => {
    const response = await api.get(`/hrpayroll/grade-levels/${id}/salary-at-step/${step}`);
    return response.data;
  },

  attachPayrollItems: async (id: number, items: { payrollItemId: number; amount?: number; percentage?: number }[]): Promise<GradeLevel> => {
    const response = await api.post(`/hrpayroll/grade-levels/${id}/payroll-items`, { items });
    return response.data;
  },
};

// ============================================================================
// SALARY STRUCTURES API
// ============================================================================

export const salaryStructuresApi = {
  list: async (params?: SalaryStructureQueryParams): Promise<PaginatedResponse<SalaryStructure>> => {
    const response = await api.get('/hrpayroll/salary-structures', { params });
    return response.data;
  },

  get: async (id: number): Promise<SalaryStructure> => {
    const response = await api.get(`/hrpayroll/salary-structures/${id}`);
    return response.data;
  },

  create: async (data: CreateSalaryStructureDto): Promise<SalaryStructure> => {
    const response = await api.post('/hrpayroll/salary-structures', data);
    return response.data;
  },

  update: async (id: number, data: UpdateSalaryStructureDto): Promise<SalaryStructure> => {
    const response = await api.patch(`/hrpayroll/salary-structures/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/salary-structures/${id}`);
  },

  submit: async (id: number): Promise<SalaryStructure> => {
    const response = await api.post(`/hrpayroll/salary-structures/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<SalaryStructure> => {
    const response = await api.post(`/hrpayroll/salary-structures/${id}/approve`);
    return response.data;
  },

  getStats: async (): Promise<SalaryStructureStats> => {
    const response = await api.get('/hrpayroll/salary-structures/stats');
    return response.data;
  },
};

// ============================================================================
// PAYROLL ITEMS API
// ============================================================================

export const payrollItemsApi = {
  list: async (params?: PayrollItemQueryParams): Promise<PaginatedResponse<PayrollItem>> => {
    const response = await api.get('/hrpayroll/payroll-items', { params });
    return response.data;
  },

  get: async (id: number): Promise<PayrollItem> => {
    const response = await api.get(`/hrpayroll/payroll-items/${id}`);
    return response.data;
  },

  create: async (data: CreatePayrollItemDto): Promise<PayrollItem> => {
    const response = await api.post('/hrpayroll/payroll-items', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePayrollItemDto): Promise<PayrollItem> => {
    const response = await api.patch(`/hrpayroll/payroll-items/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/payroll-items/${id}`);
  },

  getStats: async (): Promise<PayrollItemStats> => {
    const response = await api.get('/hrpayroll/payroll-items/stats');
    return response.data;
  },
};

// ============================================================================
// PAYROLL CALENDARS API
// ============================================================================

export const payrollCalendarsApi = {
  list: async (params?: PayrollCalendarQueryParams): Promise<PaginatedResponse<PayrollCalendar>> => {
    const response = await api.get('/hrpayroll/payroll-calendars', { params });
    return response.data;
  },

  get: async (id: number): Promise<PayrollCalendar> => {
    const response = await api.get(`/hrpayroll/payroll-calendars/${id}`);
    return response.data;
  },

  create: async (data: CreatePayrollCalendarDto): Promise<PayrollCalendar> => {
    const response = await api.post('/hrpayroll/payroll-calendars', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePayrollCalendarDto): Promise<PayrollCalendar> => {
    const response = await api.patch(`/hrpayroll/payroll-calendars/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/payroll-calendars/${id}`);
  },

  generatePeriods: async (id: number, year: number): Promise<PayrollPeriod[]> => {
    const response = await api.post(`/hrpayroll/payroll-calendars/${id}/generate-periods`, { year });
    return response.data;
  },

  getPeriods: async (id: number): Promise<PayrollPeriod[]> => {
    const response = await api.get(`/hrpayroll/payroll-calendars/${id}/periods`);
    return response.data;
  },

  getStats: async (): Promise<PayrollCalendarStats> => {
    const response = await api.get('/hrpayroll/payroll-calendars/stats');
    return response.data;
  },
};

// ============================================================================
// PAYROLLS API
// ============================================================================

export const payrollsApi = {
  list: async (params?: PayrollQueryParams): Promise<PaginatedResponse<Payroll>> => {
    const response = await api.get('/hrpayroll/payrolls', { params });
    return response.data;
  },

  get: async (id: number): Promise<Payroll> => {
    const response = await api.get(`/hrpayroll/payrolls/${id}`);
    return response.data;
  },

  create: async (data: CreatePayrollDto): Promise<Payroll> => {
    const response = await api.post('/hrpayroll/payrolls', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePayrollDto): Promise<Payroll> => {
    const response = await api.patch(`/hrpayroll/payrolls/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/payrolls/${id}`);
  },

  getStats: async (params?: { payrollPeriod?: string }): Promise<PayrollStats> => {
    const response = await api.get('/hrpayroll/payrolls/stats', { params });
    return response.data;
  },

  runPayroll: async (data: RunPayrollDto): Promise<Payroll[]> => {
    const response = await api.post('/hrpayroll/payrolls/run', data);
    return response.data;
  },

  resetCalendarRun: async (calendarId: number): Promise<{ message: string; deletedCount: number }> => {
    const response = await api.post(`/hrpayroll/payrolls/reset-calendar/${calendarId}`);
    return response.data;
  },

  calculate: async (id: number): Promise<Payroll> => {
    const response = await api.post(`/hrpayroll/payrolls/${id}/calculate`);
    return response.data;
  },

  submit: async (id: number): Promise<Payroll> => {
    const response = await api.post(`/hrpayroll/payrolls/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<Payroll> => {
    const response = await api.post(`/hrpayroll/payrolls/${id}/approve`);
    return response.data;
  },

  markPaid: async (id: number, data: { paymentReference?: string; paymentMethod?: string }): Promise<Payroll> => {
    const response = await api.post(`/hrpayroll/payrolls/${id}/mark-paid`, data);
    return response.data;
  },

  generatePayslip: async (id: number): Promise<{ url: string }> => {
    const response = await api.post(`/hrpayroll/payrolls/${id}/generate-payslip`);
    return response.data;
  },

  bulkApprove: async (ids: number[]): Promise<Payroll[]> => {
    const response = await api.post('/hrpayroll/payrolls/bulk-approve', { ids });
    return response.data;
  },

  bulkMarkPaid: async (ids: number[], data: { paymentReference?: string; paymentMethod?: string }): Promise<Payroll[]> => {
    const response = await api.post('/hrpayroll/payrolls/bulk-mark-paid', { ids, ...data });
    return response.data;
  },

  reverse: async (id: number, reason: string, reversalDate?: string): Promise<Payroll> => {
    const response = await api.post(`/hrpayroll/payrolls/${id}/reverse`, { reason, reversalDate });
    return response.data;
  },
};

// ============================================================================
// LEAVES API
// ============================================================================

export const leavesApi = {
  list: async (params?: LeaveQueryParams): Promise<PaginatedResponse<Leave>> => {
    const response = await api.get('/hrpayroll/leaves', { params });
    return response.data;
  },

  get: async (id: number): Promise<Leave> => {
    const response = await api.get(`/hrpayroll/leaves/${id}`);
    return response.data;
  },

  create: async (data: CreateLeaveDto): Promise<Leave> => {
    const response = await api.post('/hrpayroll/leaves', data);
    return response.data;
  },

  update: async (id: number, data: UpdateLeaveDto): Promise<Leave> => {
    const response = await api.patch(`/hrpayroll/leaves/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/leaves/${id}`);
  },

  getStats: async (): Promise<LeaveStats> => {
    const response = await api.get('/hrpayroll/leaves/stats');
    return response.data;
  },

  submit: async (id: number): Promise<Leave> => {
    const response = await api.post(`/hrpayroll/leaves/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, daysApproved?: number): Promise<Leave> => {
    const response = await api.post(`/hrpayroll/leaves/${id}/approve`, { daysApproved });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<Leave> => {
    const response = await api.post(`/hrpayroll/leaves/${id}/reject`, { reason });
    return response.data;
  },

  cancel: async (id: number): Promise<Leave> => {
    const response = await api.post(`/hrpayroll/leaves/${id}/cancel`);
    return response.data;
  },
};

// ============================================================================
// LOANS API
// ============================================================================

export const loansApi = {
  list: async (params?: LoanQueryParams): Promise<PaginatedResponse<Loan>> => {
    const response = await api.get('/hrpayroll/employee-loans', { params });
    return response.data;
  },

  get: async (id: number): Promise<Loan> => {
    const response = await api.get(`/hrpayroll/employee-loans/${id}`);
    return response.data;
  },

  create: async (data: CreateLoanDto): Promise<Loan> => {
    const response = await api.post('/hrpayroll/employee-loans', data);
    return response.data;
  },

  update: async (id: number, data: UpdateLoanDto): Promise<Loan> => {
    const response = await api.patch(`/hrpayroll/employee-loans/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/employee-loans/${id}`);
  },

  getStats: async (): Promise<LoanStats> => {
    const response = await api.get('/hrpayroll/employee-loans/stats');
    return response.data;
  },

  submit: async (id: number): Promise<Loan> => {
    const response = await api.post(`/hrpayroll/employee-loans/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, amountApproved?: number): Promise<Loan> => {
    const response = await api.post(`/hrpayroll/employee-loans/${id}/approve`, { amountApproved });
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<Loan> => {
    const response = await api.post(`/hrpayroll/employee-loans/${id}/reject`, { reason });
    return response.data;
  },

  disburse: async (id: number, data: { disbursementMethod: string; disbursementReference?: string }): Promise<Loan> => {
    const response = await api.post(`/hrpayroll/employee-loans/${id}/disburse`, data);
    return response.data;
  },

  recordRepayment: async (id: number, data: { amount: number; paymentDate: string; reference?: string }): Promise<Loan> => {
    const response = await api.post(`/hrpayroll/employee-loans/${id}/record-repayment`, data);
    return response.data;
  },
};

// ============================================================================
// GRADE ASSIGNMENTS API
// ============================================================================

export const gradeAssignmentsApi = {
  list: async (params?: GradeAssignmentQueryParams): Promise<PaginatedResponse<EmployeeGradeAssignment>> => {
    const response = await api.get('/hrpayroll/grade-assignments', { params });
    return response.data;
  },

  get: async (id: number): Promise<EmployeeGradeAssignment> => {
    const response = await api.get(`/hrpayroll/grade-assignments/${id}`);
    return response.data;
  },

  create: async (data: CreateGradeAssignmentDto): Promise<EmployeeGradeAssignment> => {
    const response = await api.post('/hrpayroll/grade-assignments', data);
    return response.data;
  },

  update: async (id: number, data: UpdateGradeAssignmentDto): Promise<EmployeeGradeAssignment> => {
    const response = await api.patch(`/hrpayroll/grade-assignments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/grade-assignments/${id}`);
  },

  submit: async (id: number): Promise<EmployeeGradeAssignment> => {
    const response = await api.post(`/hrpayroll/grade-assignments/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<EmployeeGradeAssignment> => {
    const response = await api.post(`/hrpayroll/grade-assignments/${id}/approve`);
    return response.data;
  },

  processStepIncrement: async (id: number): Promise<EmployeeGradeAssignment> => {
    const response = await api.post(`/hrpayroll/grade-assignments/${id}/process-step-increment`);
    return response.data;
  },

  getForEmployee: async (employeeId: number): Promise<EmployeeGradeAssignment[]> => {
    const response = await api.get(`/hrpayroll/employees/${employeeId}/grade-assignments`);
    return response.data;
  },
};

// ============================================================================
// EXPENSE CLAIMS API
// ============================================================================

export const expenseClaimsApi = {
  list: async (params?: ExpenseClaimQueryParams): Promise<PaginatedResponse<ExpenseClaim>> => {
    const response = await api.get('/hrpayroll/expense-claims', { params });
    return response.data;
  },

  get: async (id: number): Promise<ExpenseClaim> => {
    const response = await api.get(`/hrpayroll/expense-claims/${id}`);
    return response.data;
  },

  create: async (data: CreateExpenseClaimDto): Promise<ExpenseClaim> => {
    const response = await api.post('/hrpayroll/expense-claims', data);
    return response.data;
  },

  update: async (id: number, data: UpdateExpenseClaimDto): Promise<ExpenseClaim> => {
    const response = await api.patch(`/hrpayroll/expense-claims/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/expense-claims/${id}`);
  },

  getStats: async (): Promise<ExpenseClaimStats> => {
    const response = await api.get('/hrpayroll/expense-claims/stats');
    return response.data;
  },

  submit: async (id: number): Promise<ExpenseClaim> => {
    const response = await api.post(`/hrpayroll/expense-claims/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<ExpenseClaim> => {
    const response = await api.post(`/hrpayroll/expense-claims/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<ExpenseClaim> => {
    const response = await api.post(`/hrpayroll/expense-claims/${id}/reject`, { reason });
    return response.data;
  },

  markPaid: async (id: number): Promise<ExpenseClaim> => {
    const response = await api.post(`/hrpayroll/expense-claims/${id}/mark-paid`);
    return response.data;
  },
};

// ============================================================================
// HR SETTINGS API
// ============================================================================

export const hrSettingsApi = {
  get: async (): Promise<HRSettings> => {
    const response = await api.get('/hrpayroll/settings');
    return response.data;
  },

  update: async (data: UpdateHRSettingsDto): Promise<HRSettings> => {
    const response = await api.patch('/hrpayroll/settings', data);
    return response.data;
  },
};

// ============================================================================
// LOAN TYPES API
// ============================================================================

export const loanTypesApi = {
  list: async (params?: LoanTypeQueryParams): Promise<PaginatedResponse<LoanTypeEntity>> => {
    const response = await api.get('/hrpayroll/loan-types', { params });
    return response.data;
  },

  get: async (id: number): Promise<LoanTypeEntity> => {
    const response = await api.get(`/hrpayroll/loan-types/${id}`);
    return response.data;
  },

  create: async (data: CreateLoanTypeDto): Promise<LoanTypeEntity> => {
    const response = await api.post('/hrpayroll/loan-types', data);
    return response.data;
  },

  update: async (id: number, data: UpdateLoanTypeDto): Promise<LoanTypeEntity> => {
    const response = await api.patch(`/hrpayroll/loan-types/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/loan-types/${id}`);
  },
};

// ============================================================================
// LOAN REPAYMENTS API
// ============================================================================

export const loanRepaymentsApi = {
  list: async (params?: LoanRepaymentQueryParams): Promise<PaginatedResponse<LoanRepayment>> => {
    const response = await api.get('/hrpayroll/loan-repayments', { params });
    return response.data;
  },

  get: async (id: number): Promise<LoanRepayment> => {
    const response = await api.get(`/hrpayroll/loan-repayments/${id}`);
    return response.data;
  },

  getForLoan: async (loanId: number): Promise<LoanRepayment[]> => {
    const response = await api.get(`/hrpayroll/employee-loans/${loanId}/repayments`);
    return response.data;
  },
};

// ============================================================================
// JOB POSTINGS API
// ============================================================================

export const jobPostingsApi = {
  list: async (params?: JobPostingQueryParams): Promise<PaginatedResponse<JobPosting>> => {
    const response = await api.get('/hrpayroll/job-postings', { params });
    return response.data;
  },

  get: async (id: number): Promise<JobPosting> => {
    const response = await api.get(`/hrpayroll/job-postings/${id}`);
    return response.data;
  },

  create: async (data: CreateJobPostingDto): Promise<JobPosting> => {
    const response = await api.post('/hrpayroll/job-postings', data);
    return response.data;
  },

  update: async (id: number, data: UpdateJobPostingDto): Promise<JobPosting> => {
    const response = await api.patch(`/hrpayroll/job-postings/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/job-postings/${id}`);
  },

  publish: async (id: number): Promise<JobPosting> => {
    const response = await api.post(`/hrpayroll/job-postings/${id}/publish`);
    return response.data;
  },

  close: async (id: number): Promise<JobPosting> => {
    const response = await api.post(`/hrpayroll/job-postings/${id}/close`);
    return response.data;
  },
};

// ============================================================================
// JOB APPLICATIONS API
// ============================================================================

export const jobApplicationsApi = {
  list: async (params?: JobApplicationQueryParams): Promise<PaginatedResponse<JobApplication>> => {
    const response = await api.get('/hrpayroll/job-applications', { params });
    return response.data;
  },

  get: async (id: number): Promise<JobApplication> => {
    const response = await api.get(`/hrpayroll/job-applications/${id}`);
    return response.data;
  },

  create: async (data: CreateJobApplicationDto): Promise<JobApplication> => {
    const response = await api.post('/hrpayroll/job-applications', data);
    return response.data;
  },

  update: async (id: number, data: UpdateJobApplicationDto): Promise<JobApplication> => {
    const response = await api.patch(`/hrpayroll/job-applications/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/job-applications/${id}`);
  },

  shortlist: async (id: number): Promise<JobApplication> => {
    const response = await api.post(`/hrpayroll/job-applications/${id}/shortlist`);
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<JobApplication> => {
    const response = await api.post(`/hrpayroll/job-applications/${id}/reject`, { reason });
    return response.data;
  },
};

// ============================================================================
// INTERVIEWS API
// ============================================================================

export const interviewsApi = {
  list: async (params?: InterviewQueryParams): Promise<PaginatedResponse<Interview>> => {
    const response = await api.get('/hrpayroll/interviews', { params });
    return response.data;
  },

  get: async (id: number): Promise<Interview> => {
    const response = await api.get(`/hrpayroll/interviews/${id}`);
    return response.data;
  },

  create: async (data: CreateInterviewDto): Promise<Interview> => {
    const response = await api.post('/hrpayroll/interviews', data);
    return response.data;
  },

  update: async (id: number, data: UpdateInterviewDto): Promise<Interview> => {
    const response = await api.patch(`/hrpayroll/interviews/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/interviews/${id}`);
  },

  complete: async (id: number, data: UpdateInterviewDto): Promise<Interview> => {
    const response = await api.post(`/hrpayroll/interviews/${id}/complete`, data);
    return response.data;
  },

  cancel: async (id: number): Promise<Interview> => {
    const response = await api.post(`/hrpayroll/interviews/${id}/cancel`);
    return response.data;
  },

  reschedule: async (id: number, scheduledAt: string): Promise<Interview> => {
    const response = await api.post(`/hrpayroll/interviews/${id}/reschedule`, { scheduledAt });
    return response.data;
  },
};

// ============================================================================
// JOB OFFERS API
// ============================================================================

export const jobOffersApi = {
  list: async (params?: JobOfferQueryParams): Promise<PaginatedResponse<JobOffer>> => {
    const response = await api.get('/hrpayroll/job-offers', { params });
    return response.data;
  },

  get: async (id: number): Promise<JobOffer> => {
    const response = await api.get(`/hrpayroll/job-offers/${id}`);
    return response.data;
  },

  create: async (data: CreateJobOfferDto): Promise<JobOffer> => {
    const response = await api.post('/hrpayroll/job-offers', data);
    return response.data;
  },

  update: async (id: number, data: UpdateJobOfferDto): Promise<JobOffer> => {
    const response = await api.patch(`/hrpayroll/job-offers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/job-offers/${id}`);
  },

  submit: async (id: number): Promise<JobOffer> => {
    const response = await api.post(`/hrpayroll/job-offers/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<JobOffer> => {
    const response = await api.post(`/hrpayroll/job-offers/${id}/approve`);
    return response.data;
  },

  send: async (id: number): Promise<JobOffer> => {
    const response = await api.post(`/hrpayroll/job-offers/${id}/send`);
    return response.data;
  },

  accept: async (id: number): Promise<JobOffer> => {
    const response = await api.post(`/hrpayroll/job-offers/${id}/accept`);
    return response.data;
  },

  reject: async (id: number, reason?: string): Promise<JobOffer> => {
    const response = await api.post(`/hrpayroll/job-offers/${id}/reject`, { reason });
    return response.data;
  },

  withdraw: async (id: number): Promise<JobOffer> => {
    const response = await api.post(`/hrpayroll/job-offers/${id}/withdraw`);
    return response.data;
  },
};

// ============================================================================
// TRAINING PROGRAMS API
// ============================================================================

export const trainingProgramsApi = {
  list: async (params?: TrainingProgramQueryParams): Promise<PaginatedResponse<TrainingProgram>> => {
    const response = await api.get('/hrpayroll/training-programs', { params });
    return response.data;
  },

  get: async (id: number): Promise<TrainingProgram> => {
    const response = await api.get(`/hrpayroll/training-programs/${id}`);
    return response.data;
  },

  create: async (data: CreateTrainingProgramDto): Promise<TrainingProgram> => {
    const response = await api.post('/hrpayroll/training-programs', data);
    return response.data;
  },

  update: async (id: number, data: UpdateTrainingProgramDto): Promise<TrainingProgram> => {
    const response = await api.patch(`/hrpayroll/training-programs/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/training-programs/${id}`);
  },

  start: async (id: number): Promise<TrainingProgram> => {
    const response = await api.post(`/hrpayroll/training-programs/${id}/start`);
    return response.data;
  },

  complete: async (id: number): Promise<TrainingProgram> => {
    const response = await api.post(`/hrpayroll/training-programs/${id}/complete`);
    return response.data;
  },

  cancel: async (id: number): Promise<TrainingProgram> => {
    const response = await api.post(`/hrpayroll/training-programs/${id}/cancel`);
    return response.data;
  },
};

// ============================================================================
// TRAINING ENROLLMENTS API
// ============================================================================

export const trainingEnrollmentsApi = {
  list: async (params?: TrainingEnrollmentQueryParams): Promise<PaginatedResponse<TrainingEnrollment>> => {
    const response = await api.get('/hrpayroll/training-enrollments', { params });
    return response.data;
  },

  get: async (id: number): Promise<TrainingEnrollment> => {
    const response = await api.get(`/hrpayroll/training-enrollments/${id}`);
    return response.data;
  },

  create: async (data: CreateTrainingEnrollmentDto): Promise<TrainingEnrollment> => {
    const response = await api.post('/hrpayroll/training-enrollments', data);
    return response.data;
  },

  update: async (id: number, data: UpdateTrainingEnrollmentDto): Promise<TrainingEnrollment> => {
    const response = await api.patch(`/hrpayroll/training-enrollments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/training-enrollments/${id}`);
  },

  complete: async (id: number, score?: number): Promise<TrainingEnrollment> => {
    const response = await api.post(`/hrpayroll/training-enrollments/${id}/complete`, { score });
    return response.data;
  },

  withdraw: async (id: number): Promise<TrainingEnrollment> => {
    const response = await api.post(`/hrpayroll/training-enrollments/${id}/withdraw`);
    return response.data;
  },
};

// ============================================================================
// BENEFITS API
// ============================================================================

export const benefitsApi = {
  list: async (params?: BenefitQueryParams): Promise<PaginatedResponse<Benefit>> => {
    const response = await api.get('/hrpayroll/benefits', { params });
    return response.data;
  },

  get: async (id: number): Promise<Benefit> => {
    const response = await api.get(`/hrpayroll/benefits/${id}`);
    return response.data;
  },

  create: async (data: CreateBenefitDto): Promise<Benefit> => {
    const response = await api.post('/hrpayroll/benefits', data);
    return response.data;
  },

  update: async (id: number, data: UpdateBenefitDto): Promise<Benefit> => {
    const response = await api.patch(`/hrpayroll/benefits/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/benefits/${id}`);
  },
};

// ============================================================================
// BENEFIT ENROLLMENTS API
// ============================================================================

export const benefitEnrollmentsApi = {
  list: async (params?: BenefitEnrollmentQueryParams): Promise<PaginatedResponse<BenefitEnrollment>> => {
    const response = await api.get('/hrpayroll/benefit-enrollments', { params });
    return response.data;
  },

  get: async (id: number): Promise<BenefitEnrollment> => {
    const response = await api.get(`/hrpayroll/benefit-enrollments/${id}`);
    return response.data;
  },

  create: async (data: CreateBenefitEnrollmentDto): Promise<BenefitEnrollment> => {
    const response = await api.post('/hrpayroll/benefit-enrollments', data);
    return response.data;
  },

  update: async (id: number, data: UpdateBenefitEnrollmentDto): Promise<BenefitEnrollment> => {
    const response = await api.patch(`/hrpayroll/benefit-enrollments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/benefit-enrollments/${id}`);
  },

  terminate: async (id: number, terminationDate: string): Promise<BenefitEnrollment> => {
    const response = await api.post(`/hrpayroll/benefit-enrollments/${id}/terminate`, { terminationDate });
    return response.data;
  },
};

// ============================================================================
// DEPENDENTS API
// ============================================================================

export const dependentsApi = {
  list: async (params?: DependentQueryParams): Promise<PaginatedResponse<Dependent>> => {
    const response = await api.get('/hrpayroll/dependents', { params });
    return response.data;
  },

  get: async (id: number): Promise<Dependent> => {
    const response = await api.get(`/hrpayroll/dependents/${id}`);
    return response.data;
  },

  create: async (data: CreateDependentDto): Promise<Dependent> => {
    const response = await api.post('/hrpayroll/dependents', data);
    return response.data;
  },

  update: async (id: number, data: UpdateDependentDto): Promise<Dependent> => {
    const response = await api.patch(`/hrpayroll/dependents/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/dependents/${id}`);
  },

  getForEmployee: async (employeeId: number): Promise<Dependent[]> => {
    const response = await api.get(`/hrpayroll/employees/${employeeId}/dependents`);
    return response.data;
  },
};

// ============================================================================
// WORK SCHEDULES API
// ============================================================================

export const workSchedulesApi = {
  list: async (params?: WorkScheduleQueryParams): Promise<PaginatedResponse<WorkSchedule>> => {
    const response = await api.get('/hrpayroll/work-schedules', { params });
    return response.data;
  },

  get: async (id: number): Promise<WorkSchedule> => {
    const response = await api.get(`/hrpayroll/work-schedules/${id}`);
    return response.data;
  },

  create: async (data: CreateWorkScheduleDto): Promise<WorkSchedule> => {
    const response = await api.post('/hrpayroll/work-schedules', data);
    return response.data;
  },

  update: async (id: number, data: UpdateWorkScheduleDto): Promise<WorkSchedule> => {
    const response = await api.patch(`/hrpayroll/work-schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/work-schedules/${id}`);
  },

  assignToEmployee: async (scheduleId: number, employeeId: number, effectiveFrom: string): Promise<void> => {
    await api.post(`/hrpayroll/work-schedules/${scheduleId}/assign`, { employeeId, effectiveFrom });
  },
};

// ============================================================================
// SHIFTS API
// ============================================================================

export const shiftsApi = {
  list: async (params?: ShiftQueryParams): Promise<PaginatedResponse<Shift>> => {
    const response = await api.get('/hrpayroll/shifts', { params });
    return response.data;
  },

  get: async (id: number): Promise<Shift> => {
    const response = await api.get(`/hrpayroll/shifts/${id}`);
    return response.data;
  },

  create: async (data: CreateShiftDto): Promise<Shift> => {
    const response = await api.post('/hrpayroll/shifts', data);
    return response.data;
  },

  update: async (id: number, data: UpdateShiftDto): Promise<Shift> => {
    const response = await api.patch(`/hrpayroll/shifts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/shifts/${id}`);
  },
};

// ============================================================================
// OVERTIME REQUESTS API
// ============================================================================

export const overtimeRequestsApi = {
  list: async (params?: OvertimeRequestQueryParams): Promise<PaginatedResponse<OvertimeRequest>> => {
    const response = await api.get('/hrpayroll/overtime-requests', { params });
    return response.data;
  },

  get: async (id: number): Promise<OvertimeRequest> => {
    const response = await api.get(`/hrpayroll/overtime-requests/${id}`);
    return response.data;
  },

  create: async (data: CreateOvertimeRequestDto): Promise<OvertimeRequest> => {
    const response = await api.post('/hrpayroll/overtime-requests', data);
    return response.data;
  },

  update: async (id: number, data: UpdateOvertimeRequestDto): Promise<OvertimeRequest> => {
    const response = await api.patch(`/hrpayroll/overtime-requests/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/overtime-requests/${id}`);
  },

  submit: async (id: number): Promise<OvertimeRequest> => {
    const response = await api.post(`/hrpayroll/overtime-requests/${id}/submit`);
    return response.data;
  },

  approve: async (id: number, hoursApproved?: number): Promise<OvertimeRequest> => {
    const response = await api.post(`/hrpayroll/overtime-requests/${id}/approve`, { hoursApproved });
    return response.data;
  },

  reject: async (id: number): Promise<OvertimeRequest> => {
    const response = await api.post(`/hrpayroll/overtime-requests/${id}/reject`);
    return response.data;
  },
};

// ============================================================================
// ONBOARDING TEMPLATES API
// ============================================================================

export const onboardingTemplatesApi = {
  list: async (params?: { search?: string; isActive?: boolean; page?: number; limit?: number }): Promise<PaginatedResponse<OnboardingTemplate>> => {
    const response = await api.get('/hrpayroll/onboarding-templates', { params });
    return response.data;
  },

  get: async (id: number): Promise<OnboardingTemplate> => {
    const response = await api.get(`/hrpayroll/onboarding-templates/${id}`);
    return response.data;
  },

  create: async (data: CreateOnboardingTemplateDto): Promise<OnboardingTemplate> => {
    const response = await api.post('/hrpayroll/onboarding-templates', data);
    return response.data;
  },

  update: async (id: number, data: UpdateOnboardingTemplateDto): Promise<OnboardingTemplate> => {
    const response = await api.patch(`/hrpayroll/onboarding-templates/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/onboarding-templates/${id}`);
  },
};

// ============================================================================
// EMPLOYEE ONBOARDING API
// ============================================================================

export const employeeOnboardingApi = {
  list: async (params?: OnboardingQueryParams): Promise<PaginatedResponse<EmployeeOnboarding>> => {
    const response = await api.get('/hrpayroll/employee-onboarding', { params });
    return response.data;
  },

  get: async (id: number): Promise<EmployeeOnboarding> => {
    const response = await api.get(`/hrpayroll/employee-onboarding/${id}`);
    return response.data;
  },

  start: async (data: StartOnboardingDto): Promise<EmployeeOnboarding> => {
    const response = await api.post('/hrpayroll/employee-onboarding', data);
    return response.data;
  },

  completeTask: async (onboardingId: number, taskId: number, data?: { documentUrl?: string; notes?: string }): Promise<EmployeeOnboarding> => {
    const response = await api.post(`/hrpayroll/employee-onboarding/${onboardingId}/tasks/${taskId}/complete`, data);
    return response.data;
  },

  skipTask: async (onboardingId: number, taskId: number, reason?: string): Promise<EmployeeOnboarding> => {
    const response = await api.post(`/hrpayroll/employee-onboarding/${onboardingId}/tasks/${taskId}/skip`, { reason });
    return response.data;
  },

  complete: async (id: number): Promise<EmployeeOnboarding> => {
    const response = await api.post(`/hrpayroll/employee-onboarding/${id}/complete`);
    return response.data;
  },

  getForEmployee: async (employeeId: number): Promise<EmployeeOnboarding | null> => {
    const response = await api.get(`/hrpayroll/employees/${employeeId}/onboarding`);
    return response.data;
  },
};

// ============================================================================
// OFFBOARDING TEMPLATES API
// ============================================================================

export const offboardingTemplatesApi = {
  list: async (params?: { search?: string; isActive?: boolean; terminationType?: string; page?: number; limit?: number }): Promise<PaginatedResponse<OffboardingTemplate>> => {
    const response = await api.get('/hrpayroll/offboarding-templates', { params });
    return response.data;
  },

  get: async (id: number): Promise<OffboardingTemplate> => {
    const response = await api.get(`/hrpayroll/offboarding-templates/${id}`);
    return response.data;
  },

  create: async (data: CreateOffboardingTemplateDto): Promise<OffboardingTemplate> => {
    const response = await api.post('/hrpayroll/offboarding-templates', data);
    return response.data;
  },

  update: async (id: number, data: UpdateOffboardingTemplateDto): Promise<OffboardingTemplate> => {
    const response = await api.patch(`/hrpayroll/offboarding-templates/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/offboarding-templates/${id}`);
  },
};

// ============================================================================
// EMPLOYEE OFFBOARDING API
// ============================================================================

export const employeeOffboardingApi = {
  list: async (params?: OffboardingQueryParams): Promise<PaginatedResponse<EmployeeOffboarding>> => {
    const response = await api.get('/hrpayroll/employee-offboarding', { params });
    return response.data;
  },

  get: async (id: number): Promise<EmployeeOffboarding> => {
    const response = await api.get(`/hrpayroll/employee-offboarding/${id}`);
    return response.data;
  },

  start: async (data: StartOffboardingDto): Promise<EmployeeOffboarding> => {
    const response = await api.post('/hrpayroll/employee-offboarding', data);
    return response.data;
  },

  completeTask: async (offboardingId: number, taskId: number, data?: { documentUrl?: string; notes?: string }): Promise<EmployeeOffboarding> => {
    const response = await api.post(`/hrpayroll/employee-offboarding/${offboardingId}/tasks/${taskId}/complete`, data);
    return response.data;
  },

  skipTask: async (offboardingId: number, taskId: number, reason?: string): Promise<EmployeeOffboarding> => {
    const response = await api.post(`/hrpayroll/employee-offboarding/${offboardingId}/tasks/${taskId}/skip`, { reason });
    return response.data;
  },

  complete: async (id: number): Promise<EmployeeOffboarding> => {
    const response = await api.post(`/hrpayroll/employee-offboarding/${id}/complete`);
    return response.data;
  },

  getForEmployee: async (employeeId: number): Promise<EmployeeOffboarding | null> => {
    const response = await api.get(`/hrpayroll/employees/${employeeId}/offboarding`);
    return response.data;
  },
};

// ============================================================================
// PERFORMANCE REVIEWS API
// ============================================================================

export const performanceReviewsApi = {
  list: async (params?: PerformanceReviewQueryParams): Promise<PaginatedResponse<PerformanceReview>> => {
    const response = await api.get('/hrpayroll/performance-reviews', { params });
    return response.data;
  },

  get: async (id: number): Promise<PerformanceReview> => {
    const response = await api.get(`/hrpayroll/performance-reviews/${id}`);
    return response.data;
  },

  create: async (data: CreatePerformanceReviewDto): Promise<PerformanceReview> => {
    const response = await api.post('/hrpayroll/performance-reviews', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePerformanceReviewDto): Promise<PerformanceReview> => {
    const response = await api.patch(`/hrpayroll/performance-reviews/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/performance-reviews/${id}`);
  },

  submitSelfReview: async (id: number, data: { selfRating: number; selfComments?: string }): Promise<PerformanceReview> => {
    const response = await api.post(`/hrpayroll/performance-reviews/${id}/self-review`, data);
    return response.data;
  },

  submitManagerReview: async (id: number, data: UpdatePerformanceReviewDto): Promise<PerformanceReview> => {
    const response = await api.post(`/hrpayroll/performance-reviews/${id}/manager-review`, data);
    return response.data;
  },

  complete: async (id: number, finalRating: number): Promise<PerformanceReview> => {
    const response = await api.post(`/hrpayroll/performance-reviews/${id}/complete`, { finalRating });
    return response.data;
  },

  getForEmployee: async (employeeId: number): Promise<PerformanceReview[]> => {
    const response = await api.get(`/hrpayroll/employees/${employeeId}/performance-reviews`);
    return response.data;
  },
};

// ============================================================================
// PERFORMANCE GOALS API
// ============================================================================

export const performanceGoalsApi = {
  list: async (params?: PerformanceGoalQueryParams): Promise<PaginatedResponse<PerformanceGoal>> => {
    const response = await api.get('/hrpayroll/performance-goals', { params });
    return response.data;
  },

  get: async (id: number): Promise<PerformanceGoal> => {
    const response = await api.get(`/hrpayroll/performance-goals/${id}`);
    return response.data;
  },

  create: async (data: CreatePerformanceGoalDto): Promise<PerformanceGoal> => {
    const response = await api.post('/hrpayroll/performance-goals', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePerformanceGoalDto): Promise<PerformanceGoal> => {
    const response = await api.patch(`/hrpayroll/performance-goals/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/performance-goals/${id}`);
  },

  updateProgress: async (id: number, progress: number, actualValue?: number): Promise<PerformanceGoal> => {
    const response = await api.patch(`/hrpayroll/performance-goals/${id}/progress`, { progress, actualValue });
    return response.data;
  },

  getForEmployee: async (employeeId: number): Promise<PerformanceGoal[]> => {
    const response = await api.get(`/hrpayroll/employees/${employeeId}/goals`);
    return response.data;
  },
};

// ============================================================================
// EMPLOYEE CONTRACTS API
// ============================================================================

export const employeeContractsApi = {
  list: async (params?: { employeeId?: number; status?: string; contractType?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/hrpayroll/employee-contracts', { params });
    return response.data;
  },

  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/hrpayroll/employee-contracts/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/hrpayroll/employee-contracts', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`/hrpayroll/employee-contracts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/employee-contracts/${id}`);
  },

  terminate: async (id: number, reason?: string): Promise<Record<string, unknown>> => {
    const response = await api.post(`/hrpayroll/employee-contracts/${id}/terminate`, { reason });
    return response.data;
  },

  renew: async (id: number, data: { endDate: string; terms?: string }): Promise<Record<string, unknown>> => {
    const response = await api.post(`/hrpayroll/employee-contracts/${id}/renew`, data);
    return response.data;
  },

  getForEmployee: async (employeeId: number): Promise<Record<string, unknown>[]> => {
    const response = await api.get(`/hrpayroll/employees/${employeeId}/contracts`);
    return response.data;
  },
};

// ============================================================================
// EMPLOYEE DOCUMENTS API
// ============================================================================

export const employeeDocumentsApi = {
  list: async (params?: EmployeeDocumentQueryParams): Promise<PaginatedResponse<EmployeeDocument>> => {
    const response = await api.get('/hrpayroll/employee-documents', { params });
    return response.data;
  },

  get: async (id: number): Promise<EmployeeDocument> => {
    const response = await api.get(`/hrpayroll/employee-documents/${id}`);
    return response.data;
  },

  create: async (data: CreateEmployeeDocumentDto): Promise<EmployeeDocument> => {
    const response = await api.post('/hrpayroll/employee-documents', data);
    return response.data;
  },

  update: async (id: number, data: UpdateEmployeeDocumentDto): Promise<EmployeeDocument> => {
    const response = await api.patch(`/hrpayroll/employee-documents/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/employee-documents/${id}`);
  },

  verify: async (id: number): Promise<EmployeeDocument> => {
    const response = await api.post(`/hrpayroll/employee-documents/${id}/verify`);
    return response.data;
  },

  getForEmployee: async (employeeId: number): Promise<EmployeeDocument[]> => {
    const response = await api.get(`/hrpayroll/employees/${employeeId}/documents`);
    return response.data;
  },
};

// ============================================================================
// EXPENSE CATEGORIES API
// ============================================================================

export const expenseCategoriesApi = {
  list: async (params?: ExpenseCategoryQueryParams): Promise<PaginatedResponse<ExpenseCategory>> => {
    const response = await api.get('/hrpayroll/expense-categories', { params });
    return response.data;
  },

  get: async (id: number): Promise<ExpenseCategory> => {
    const response = await api.get(`/hrpayroll/expense-categories/${id}`);
    return response.data;
  },

  create: async (data: CreateExpenseCategoryDto): Promise<ExpenseCategory> => {
    const response = await api.post('/hrpayroll/expense-categories', data);
    return response.data;
  },

  update: async (id: number, data: UpdateExpenseCategoryDto): Promise<ExpenseCategory> => {
    const response = await api.patch(`/hrpayroll/expense-categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/expense-categories/${id}`);
  },
};

// ============================================================================
// LEAVE TYPE CONFIGS API
// ============================================================================

export const leaveTypeConfigsApi = {
  list: async (params?: LeaveTypeConfigQueryParams): Promise<PaginatedResponse<LeaveTypeConfig>> => {
    const response = await api.get('/hrpayroll/leave-type-configs', { params });
    return response.data;
  },

  get: async (id: number): Promise<LeaveTypeConfig> => {
    const response = await api.get(`/hrpayroll/leave-type-configs/${id}`);
    return response.data;
  },

  create: async (data: CreateLeaveTypeConfigDto): Promise<LeaveTypeConfig> => {
    const response = await api.post('/hrpayroll/leave-type-configs', data);
    return response.data;
  },

  update: async (id: number, data: UpdateLeaveTypeConfigDto): Promise<LeaveTypeConfig> => {
    const response = await api.patch(`/hrpayroll/leave-type-configs/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/leave-type-configs/${id}`);
  },
};

// ============================================================================
// TIME CLOCK RECORDS API
// ============================================================================

export const timeClockRecordsApi = {
  list: async (params?: TimeClockRecordQueryParams): Promise<PaginatedResponse<TimeClockRecord>> => {
    const response = await api.get('/hrpayroll/time-clock-records', { params });
    return response.data;
  },

  get: async (id: number): Promise<TimeClockRecord> => {
    const response = await api.get(`/hrpayroll/time-clock-records/${id}`);
    return response.data;
  },

  create: async (data: CreateTimeClockRecordDto): Promise<TimeClockRecord> => {
    const response = await api.post('/hrpayroll/time-clock-records', data);
    return response.data;
  },

  update: async (id: number, data: UpdateTimeClockRecordDto): Promise<TimeClockRecord> => {
    const response = await api.patch(`/hrpayroll/time-clock-records/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/time-clock-records/${id}`);
  },

  clockOut: async (id: number, data?: { clockOutLocation?: string; notes?: string }): Promise<TimeClockRecord> => {
    const response = await api.post(`/hrpayroll/time-clock-records/${id}/clock-out`, data);
    return response.data;
  },
};

// ============================================================================
// PROBATIONS API
// ============================================================================

export const probationsApi = {
  list: async (params?: ProbationQueryParams): Promise<PaginatedResponse<Probation>> => {
    const response = await api.get('/hrpayroll/probations', { params });
    return response.data;
  },

  get: async (id: number): Promise<Probation> => {
    const response = await api.get(`/hrpayroll/probations/${id}`);
    return response.data;
  },

  create: async (data: CreateProbationDto): Promise<Probation> => {
    const response = await api.post('/hrpayroll/probations', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProbationDto): Promise<Probation> => {
    const response = await api.patch(`/hrpayroll/probations/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/probations/${id}`);
  },

  extend: async (id: number, data: { extendedEndDate: string; reason?: string }): Promise<Probation> => {
    const response = await api.post(`/hrpayroll/probations/${id}/extend`, data);
    return response.data;
  },

  confirm: async (id: number): Promise<Probation> => {
    const response = await api.post(`/hrpayroll/probations/${id}/confirm`);
    return response.data;
  },

  terminate: async (id: number, data: { reason: string }): Promise<Probation> => {
    const response = await api.post(`/hrpayroll/probations/${id}/terminate`, data);
    return response.data;
  },
};

// ============================================================================
// REIMBURSEMENTS API
// ============================================================================

export const reimbursementsApi = {
  list: async (params?: ReimbursementQueryParams): Promise<PaginatedResponse<Reimbursement>> => {
    const response = await api.get('/hrpayroll/reimbursements', { params });
    return response.data;
  },

  get: async (id: number): Promise<Reimbursement> => {
    const response = await api.get(`/hrpayroll/reimbursements/${id}`);
    return response.data;
  },

  create: async (data: CreateReimbursementDto): Promise<Reimbursement> => {
    const response = await api.post('/hrpayroll/reimbursements', data);
    return response.data;
  },

  update: async (id: number, data: UpdateReimbursementDto): Promise<Reimbursement> => {
    const response = await api.patch(`/hrpayroll/reimbursements/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/reimbursements/${id}`);
  },
};

// ============================================================================
// SHIFT ASSIGNMENTS API
// ============================================================================

export const shiftAssignmentsApi = {
  list: async (params?: ShiftAssignmentQueryParams): Promise<PaginatedResponse<ShiftAssignment>> => {
    const response = await api.get('/hrpayroll/shift-assignments', { params });
    return response.data;
  },

  get: async (id: number): Promise<ShiftAssignment> => {
    const response = await api.get(`/hrpayroll/shift-assignments/${id}`);
    return response.data;
  },

  create: async (data: CreateShiftAssignmentDto): Promise<ShiftAssignment> => {
    const response = await api.post('/hrpayroll/shift-assignments', data);
    return response.data;
  },

  update: async (id: number, data: UpdateShiftAssignmentDto): Promise<ShiftAssignment> => {
    const response = await api.patch(`/hrpayroll/shift-assignments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/shift-assignments/${id}`);
  },
};

// ============================================================================
// ROSTERS API
// ============================================================================

export const rostersApi = {
  list: async (params?: RosterQueryParams): Promise<PaginatedResponse<Roster>> => {
    const response = await api.get('/hrpayroll/rosters', { params });
    return response.data;
  },

  get: async (id: number): Promise<Roster> => {
    const response = await api.get(`/hrpayroll/rosters/${id}`);
    return response.data;
  },

  create: async (data: CreateRosterDto): Promise<Roster> => {
    const response = await api.post('/hrpayroll/rosters', data);
    return response.data;
  },

  update: async (id: number, data: UpdateRosterDto): Promise<Roster> => {
    const response = await api.patch(`/hrpayroll/rosters/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/rosters/${id}`);
  },

  publish: async (id: number): Promise<Roster> => {
    const response = await api.post(`/hrpayroll/rosters/${id}/publish`);
    return response.data;
  },
};

// ============================================================================
// ROSTER ENTRIES API
// ============================================================================

export const rosterEntriesApi = {
  list: async (params?: RosterEntryQueryParams): Promise<PaginatedResponse<RosterEntry>> => {
    const response = await api.get('/hrpayroll/roster-entries', { params });
    return response.data;
  },

  get: async (id: number): Promise<RosterEntry> => {
    const response = await api.get(`/hrpayroll/roster-entries/${id}`);
    return response.data;
  },

  create: async (data: CreateRosterEntryDto): Promise<RosterEntry> => {
    const response = await api.post('/hrpayroll/roster-entries', data);
    return response.data;
  },

  update: async (id: number, data: UpdateRosterEntryDto): Promise<RosterEntry> => {
    const response = await api.patch(`/hrpayroll/roster-entries/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/roster-entries/${id}`);
  },
};

// ============================================================================
// EMPLOYEE WORK SCHEDULES API
// ============================================================================

export const employeeWorkSchedulesApi = {
  list: async (params?: EmployeeWorkScheduleQueryParams): Promise<PaginatedResponse<EmployeeWorkSchedule>> => {
    const response = await api.get('/hrpayroll/employee-work-schedules', { params });
    return response.data;
  },

  get: async (id: number): Promise<EmployeeWorkSchedule> => {
    const response = await api.get(`/hrpayroll/employee-work-schedules/${id}`);
    return response.data;
  },

  create: async (data: CreateEmployeeWorkScheduleDto): Promise<EmployeeWorkSchedule> => {
    const response = await api.post('/hrpayroll/employee-work-schedules', data);
    return response.data;
  },

  update: async (id: number, data: UpdateEmployeeWorkScheduleDto): Promise<EmployeeWorkSchedule> => {
    const response = await api.patch(`/hrpayroll/employee-work-schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/employee-work-schedules/${id}`);
  },
};

// ============================================================================
// JOB PLACEMENTS API
// ============================================================================

export const jobPlacementsApi = {
  list: async (params?: JobPlacementQueryParams): Promise<PaginatedResponse<JobPlacement>> => {
    const response = await api.get('/hrpayroll/job-placements', { params });
    return response.data;
  },

  get: async (id: number): Promise<JobPlacement> => {
    const response = await api.get(`/hrpayroll/job-placements/${id}`);
    return response.data;
  },

  create: async (data: CreateJobPlacementDto): Promise<JobPlacement> => {
    const response = await api.post('/hrpayroll/job-placements', data);
    return response.data;
  },

  update: async (id: number, data: UpdateJobPlacementDto): Promise<JobPlacement> => {
    const response = await api.patch(`/hrpayroll/job-placements/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/job-placements/${id}`);
  },

  onboard: async (id: number): Promise<JobPlacement> => {
    const response = await api.post(`/hrpayroll/job-placements/${id}/onboard`);
    return response.data;
  },
};

// ============================================================================
// INTERVIEW SCHEDULES API
// ============================================================================

export const interviewSchedulesApi = {
  list: async (params?: InterviewScheduleQueryParams): Promise<PaginatedResponse<InterviewSchedule>> => {
    const response = await api.get('/hrpayroll/interview-schedules', { params });
    return response.data;
  },

  get: async (id: number): Promise<InterviewSchedule> => {
    const response = await api.get(`/hrpayroll/interview-schedules/${id}`);
    return response.data;
  },

  create: async (data: CreateInterviewScheduleDto): Promise<InterviewSchedule> => {
    const response = await api.post('/hrpayroll/interview-schedules', data);
    return response.data;
  },

  update: async (id: number, data: UpdateInterviewScheduleDto): Promise<InterviewSchedule> => {
    const response = await api.patch(`/hrpayroll/interview-schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/interview-schedules/${id}`);
  },

  reschedule: async (id: number, data: { scheduledDate: string; reason?: string }): Promise<InterviewSchedule> => {
    const response = await api.post(`/hrpayroll/interview-schedules/${id}/reschedule`, data);
    return response.data;
  },

  cancel: async (id: number, data: { reason: string }): Promise<InterviewSchedule> => {
    const response = await api.post(`/hrpayroll/interview-schedules/${id}/cancel`, data);
    return response.data;
  },

  complete: async (id: number): Promise<InterviewSchedule> => {
    const response = await api.post(`/hrpayroll/interview-schedules/${id}/complete`);
    return response.data;
  },
};

// ============================================================================
// PERFORMANCE REVIEW TEMPLATES API
// ============================================================================

export const performanceReviewTemplatesApi = {
  list: async (params?: PerformanceReviewTemplateQueryParams): Promise<PaginatedResponse<PerformanceReviewTemplate>> => {
    const response = await api.get('/hrpayroll/performance-review-templates', { params });
    return response.data;
  },

  get: async (id: number): Promise<PerformanceReviewTemplate> => {
    const response = await api.get(`/hrpayroll/performance-review-templates/${id}`);
    return response.data;
  },

  create: async (data: CreatePerformanceReviewTemplateDto): Promise<PerformanceReviewTemplate> => {
    const response = await api.post('/hrpayroll/performance-review-templates', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePerformanceReviewTemplateDto): Promise<PerformanceReviewTemplate> => {
    const response = await api.patch(`/hrpayroll/performance-review-templates/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/performance-review-templates/${id}`);
  },
};

// ============================================================================
// PAYSLIP GENERATIONS API
// ============================================================================

export const payslipGenerationsApi = {
  list: async (params?: PayslipGenerationQueryParams): Promise<PaginatedResponse<PayslipGeneration>> => {
    const response = await api.get('/hrpayroll/payslip-generations', { params });
    return response.data;
  },

  get: async (id: number): Promise<PayslipGeneration> => {
    const response = await api.get(`/hrpayroll/payslip-generations/${id}`);
    return response.data;
  },

  generate: async (data: { payrollId: number; payrollPeriod: string }): Promise<PayslipGeneration[]> => {
    const response = await api.post('/hrpayroll/payslip-generations/generate', data);
    return response.data;
  },

  email: async (id: number): Promise<PayslipGeneration> => {
    const response = await api.post(`/hrpayroll/payslip-generations/${id}/email`);
    return response.data;
  },

  download: async (id: number): Promise<PayslipGeneration> => {
    const response = await api.get(`/hrpayroll/payslip-generations/${id}/download`);
    return response.data;
  },
};

// ============================================================================
// KPIS API
// ============================================================================

export const kpisApi = {
  list: async (params?: { search?: string; category?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/hrpayroll/kpis', { params });
    return response.data;
  },

  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/hrpayroll/kpis/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/hrpayroll/kpis', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`/hrpayroll/kpis/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/kpis/${id}`);
  },
};

// ============================================================================
// SKILLS API
// ============================================================================

export const skillsApi = {
  list: async (params?: { search?: string; category?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/hrpayroll/skills', { params });
    return response.data;
  },

  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/hrpayroll/skills/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/hrpayroll/skills', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`/hrpayroll/skills/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/skills/${id}`);
  },
};

// ============================================================================
// EMPLOYEE SKILLS API (Pivot)
// ============================================================================

export const employeeSkillsApi = {
  listForEmployee: async (employeeId: number): Promise<EmployeeSkillRecord[]> => {
    const response = await api.get(`/hrpayroll/employees/${employeeId}/skills`);
    return response.data;
  },

  assign: async (data: CreateEmployeeSkillDto): Promise<EmployeeSkillRecord> => {
    const response = await api.post('/hrpayroll/employee-skills', data);
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/employee-skills/${id}`);
  },
};

// ============================================================================
// EMPLOYEE CERTIFICATIONS API (Pivot)
// ============================================================================

export const employeeCertificationsApi = {
  listForEmployee: async (employeeId: number): Promise<EmployeeCertificationRecord[]> => {
    const response = await api.get(`/hrpayroll/employees/${employeeId}/certifications`);
    return response.data;
  },

  assign: async (data: CreateEmployeeCertificationDto): Promise<EmployeeCertificationRecord> => {
    const response = await api.post('/hrpayroll/employee-certifications', data);
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/employee-certifications/${id}`);
  },
};

// ============================================================================
// EMPLOYEE KPIS API (Pivot)
// ============================================================================

export const employeeKpisApi = {
  listForEmployee: async (employeeId: number): Promise<EmployeeKpiRecord[]> => {
    const response = await api.get(`/hrpayroll/employees/${employeeId}/kpis`);
    return response.data;
  },

  assign: async (data: CreateEmployeeKpiDto): Promise<EmployeeKpiRecord> => {
    const response = await api.post('/hrpayroll/employee-kpis', data);
    return response.data;
  },

  update: async (id: number, data: { actualValue?: number; status?: string; notes?: string }): Promise<EmployeeKpiRecord> => {
    const response = await api.patch(`/hrpayroll/employee-kpis/${id}`, data);
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/employee-kpis/${id}`);
  },
};

// ============================================================================
// APPOINTMENTS API
// ============================================================================

export const appointmentsApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/hrpayroll/appointments', { params });
    return response.data;
  },

  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/hrpayroll/appointments/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/hrpayroll/appointments', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`/hrpayroll/appointments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/appointments/${id}`);
  },
};

// ============================================================================
// CERTIFICATIONS API
// ============================================================================

export const certificationsApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/hrpayroll/certifications', { params });
    return response.data;
  },

  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/hrpayroll/certifications/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/hrpayroll/certifications', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`/hrpayroll/certifications/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/certifications/${id}`);
  },
};

// ============================================================================
// EXIT INTERVIEWS API
// ============================================================================

export const exitInterviewsApi = {
  list: async (params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/hrpayroll/exit-interviews', { params });
    return response.data;
  },

  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/hrpayroll/exit-interviews/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/hrpayroll/exit-interviews', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`/hrpayroll/exit-interviews/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/exit-interviews/${id}`);
  },
};

// ============================================================================
// EMPLOYEE DEDUCTIONS (ad-hoc: penalties, adjustments, etc.)
// ============================================================================
export const employeeDeductionsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/hrpayroll/employee-deductions', { params });
    return response.data;
  },
  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/hrpayroll/employee-deductions/${id}`);
    return response.data;
  },
  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/hrpayroll/employee-deductions', data);
    return response.data;
  },
  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`/hrpayroll/employee-deductions/${id}`, data);
    return response.data;
  },
  cancel: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.post(`/hrpayroll/employee-deductions/${id}/cancel`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/employee-deductions/${id}`);
  },
};

// ============================================================================
// PAYROLL COMPONENTS
// ============================================================================
export const payrollComponentsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const response = await api.get('/hrpayroll/payroll-components', { params });
    return response.data;
  },

  get: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/hrpayroll/payroll-components/${id}`);
    return response.data;
  },

  create: async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.post('/hrpayroll/payroll-components', data);
    return response.data;
  },

  update: async (id: number, data: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const response = await api.patch(`/hrpayroll/payroll-components/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/payroll-components/${id}`);
  },
};

// ============================================================================
// PAY ELEMENTS (consolidated PayrollComponent + PayrollItem with mode flag)
// ============================================================================
import type {
  PayElement,
  CreatePayElementDto,
  UpdatePayElementDto,
  PayElementQueryParams,
} from '@/types/hrpayroll';

export const payElementsApi = {
  list: async (params?: PayElementQueryParams): Promise<PaginatedResponse<PayElement>> => {
    const response = await api.get('/hrpayroll/pay-elements', { params });
    return response.data;
  },

  get: async (id: number): Promise<PayElement> => {
    const response = await api.get(`/hrpayroll/pay-elements/${id}`);
    return response.data;
  },

  create: async (data: CreatePayElementDto): Promise<PayElement> => {
    const response = await api.post('/hrpayroll/pay-elements', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePayElementDto): Promise<PayElement> => {
    const response = await api.patch(`/hrpayroll/pay-elements/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/pay-elements/${id}`);
  },
};

// ============================================================================
// PENSION FUND ADMINISTRATORS (Nigeria PFA lookup, seeded with 19 entries)
// ============================================================================
export interface PensionFundAdministrator {
  id: number;
  companyId: number;
  name: string;
  code: string | null;
  licenseNumber: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  isSeeded: boolean;
  createdAt: string;
  updatedAt: string;
}

export const pensionFundAdministratorsApi = {
  list: async (params?: { includeInactive?: boolean }): Promise<PensionFundAdministrator[]> => {
    const response = await api.get('/hrpayroll/pension-fund-administrators', { params });
    return response.data;
  },

  get: async (id: number): Promise<PensionFundAdministrator> => {
    const response = await api.get(`/hrpayroll/pension-fund-administrators/${id}`);
    return response.data;
  },

  create: async (data: Partial<PensionFundAdministrator>): Promise<PensionFundAdministrator> => {
    const response = await api.post('/hrpayroll/pension-fund-administrators', data);
    return response.data;
  },

  update: async (id: number, data: Partial<PensionFundAdministrator>): Promise<PensionFundAdministrator> => {
    const response = await api.patch(`/hrpayroll/pension-fund-administrators/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/pension-fund-administrators/${id}`);
  },
};

// ============================================================================
// EMPLOYEE PAY ADJUSTMENTS
// ============================================================================

export interface EmployeePayAdjustment {
  id: number;
  companyId: number;
  employeeId: number;
  payElementId: number | null;
  name: string;
  code: string;
  type: 'EARNING' | 'DEDUCTION';
  category: string;
  amount: number;
  isRecurring: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  taxable: boolean;
  affectsPension: boolean;
  note: string | null;
  status: 'active' | 'cancelled';
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  // Joined
  employeeName?: string;
  employeeNumber?: string;
  payElementName?: string;
}

export interface CreatePayAdjustmentDto {
  employeeId: number;
  payElementId?: number;
  name: string;
  code: string;
  type: 'EARNING' | 'DEDUCTION';
  category?: string;
  amount: number;
  isRecurring: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  taxable?: boolean;
  affectsPension?: boolean;
  note?: string;
}

export const employeePayAdjustmentsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<EmployeePayAdjustment>> => {
    const response = await api.get('/hrpayroll/employee-pay-adjustments', { params });
    return response.data;
  },
  listByEmployee: async (employeeId: number): Promise<EmployeePayAdjustment[]> => {
    const response = await api.get(`/hrpayroll/employee-pay-adjustments/employee/${employeeId}`);
    return response.data;
  },
  get: async (id: number): Promise<EmployeePayAdjustment> => {
    const response = await api.get(`/hrpayroll/employee-pay-adjustments/${id}`);
    return response.data;
  },
  create: async (data: CreatePayAdjustmentDto): Promise<EmployeePayAdjustment> => {
    const response = await api.post('/hrpayroll/employee-pay-adjustments', data);
    return response.data;
  },
  update: async (id: number, data: Partial<CreatePayAdjustmentDto>): Promise<EmployeePayAdjustment> => {
    const response = await api.patch(`/hrpayroll/employee-pay-adjustments/${id}`, data);
    return response.data;
  },
  cancel: async (id: number): Promise<EmployeePayAdjustment> => {
    const response = await api.patch(`/hrpayroll/employee-pay-adjustments/${id}/cancel`);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/hrpayroll/employee-pay-adjustments/${id}`);
  },
};

// ============================================================================
// PAYROLL RUNS API
// ============================================================================

export interface PayrollRunEmployee {
  payrollId: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  departmentName?: string;
  positionTitle?: string;
  baseSalaryAmount: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  payeTax: number;
  employeePensionContribution: number;
  totalEmployerCost: number;
  status: string;
  bankName?: string;
  bankAccountNumber?: string;
}

export interface PayrollRun {
  id: number;
  companyId: number;
  payrollCalendarId?: number;
  payrollCalendarName?: string;
  payrollPeriod: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  totalEmployerCost: number;
  totalPayeTax: number;
  totalPension: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  submittedById?: number;
  submittedAt?: string;
  approvedById?: number;
  approvedAt?: string;
  bankAccountId?: number;
  bankName?: string;
  bankAccountNumber?: string;
  paymentReference?: string;
  paymentDate?: string;
  paidById?: number;
  paidAt?: string;
  journalEntryId?: number;
  notes?: string;
  employees?: PayrollRunEmployee[];
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRunPaginated {
  data: PayrollRun[];
  total: number;
  page: number;
  limit: number;
}

export interface ProcessPayrollRunPaymentDto {
  bankAccountId: number;
  paymentDate: string;
  paymentReference?: string;
  notes?: string;
}

export const payrollRunsApi = {
  list: async (params?: { status?: string; payrollPeriod?: string; page?: number; limit?: number }): Promise<PayrollRunPaginated> => {
    const response = await api.get('/hrpayroll/payroll-runs', { params });
    return response.data;
  },
  get: async (id: number): Promise<PayrollRun> => {
    const response = await api.get(`/hrpayroll/payroll-runs/${id}`);
    return response.data;
  },
  createFromCalendar: async (calendarId: number): Promise<PayrollRun> => {
    const response = await api.post(`/hrpayroll/payroll-runs/from-calendar/${calendarId}`);
    return response.data;
  },
  submit: async (id: number): Promise<PayrollRun> => {
    const response = await api.post(`/hrpayroll/payroll-runs/${id}/submit`);
    return response.data;
  },
  approve: async (id: number, comment?: string): Promise<PayrollRun> => {
    const response = await api.post(`/hrpayroll/payroll-runs/${id}/approve`, { comment });
    return response.data;
  },
  reject: async (id: number, reason: string): Promise<PayrollRun> => {
    const response = await api.post(`/hrpayroll/payroll-runs/${id}/reject`, { reason });
    return response.data;
  },
  processPayment: async (id: number, dto: ProcessPayrollRunPaymentDto): Promise<PayrollRun> => {
    const response = await api.post(`/hrpayroll/payroll-runs/${id}/process-payment`, dto);
    return response.data;
  },
  cancel: async (id: number): Promise<PayrollRun> => {
    const response = await api.post(`/hrpayroll/payroll-runs/${id}/cancel`);
    return response.data;
  },
};
