// ============================================================================
// HR/PAYROLL MODULE TYPES
// ============================================================================

// ----------------------------------------------------------------------------
// ENUMS & CONSTANTS
// ----------------------------------------------------------------------------

export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'SUSPENDED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'TEMPORARY';
export type LifecycleStage = 'onboarding' | 'active' | 'performance_management' | 'offboarding' | 'terminated';
export type SalaryType = 'STRUCTURED' | 'UNSTRUCTURED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type PayFrequency = 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY';

export type LeaveType = 'annual' | 'sick' | 'maternity' | 'paternity' | 'casual' | 'compassionate' | 'study' | 'unpaid';
export type LeaveStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';

export type LoanType = 'salary_advance' | 'personal_loan' | 'emergency_loan' | 'car_loan' | 'housing_loan' | 'education_loan';
export type LoanStatus = 'draft' | 'pending' | 'approved' | 'active' | 'completed' | 'rejected';

export type PayrollStatus = 'draft' | 'calculated' | 'pending' | 'approved' | 'paid' | 'cancelled';
export type PayrollFrequency = 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';
export type PayrollPeriodStatus = 'draft' | 'open' | 'locked' | 'processed' | 'completed';

export type PayrollItemCategory = 'basic' | 'allowance' | 'bonus' | 'overtime' | 'deduction' | 'statutory' | 'benefit' | 'other';
export type CalculationType = 'fixed' | 'percentage';
export type BaseOn = 'basic_salary' | 'gross_salary' | 'flat_amount' | 'annual_salary';

export type CadreCategory = 'management' | 'senior_staff' | 'junior_staff' | 'contract' | 'temporary' | 'executive' | 'professional' | 'technical' | 'administrative' | 'support';

export type GradeAssignmentType = 'initial_placement' | 'promotion' | 'lateral_transfer' | 'demotion' | 'step_increment' | 'salary_review' | 'structure_change';
export type GradeAssignmentStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'superseded' | 'cancelled';

export type ExpenseClaimStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

// ----------------------------------------------------------------------------
// EMPLOYEE
// ----------------------------------------------------------------------------

export interface Employee {
  id: number;
  userId?: number;
  companyId: number;
  branchId?: number;
  departmentId: number;
  positionId: number;
  salaryStructureId?: number;
  gradeId?: number;
  employeeCode: string;
  staffId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  personalEmail: string;
  phone: string;
  alternatePhone?: string;
  dateOfBirth: string;
  gender: Gender;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  stateOfOrigin?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  hireDate: string;
  confirmationDate?: string;
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  jobTitle?: string;
  salaryType: SalaryType;
  unstructuredSalary?: number;
  voluntaryPensionContribution?: number;
  annualRentPaid?: number;
  currentSalary?: number;
  payFrequency?: PayFrequency;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  taxId?: string;
  nin?: string;
  bvn?: string;
  pensionPin?: string;
  pensionAdministratorId?: number | null;
  pensionAdministratorName?: string | null;
  isActive: boolean;
  isUser: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  metadata?: Record<string, unknown>;
  // Relations
  department?: Department;
  position?: Position;
  salaryStructure?: SalaryStructure;
  currentGradeAssignment?: EmployeeGradeAssignment;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeDto {
  // Basic Info
  employeeCode: string;
  staffId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  // Contact
  personalEmail: string;
  phone: string;
  alternatePhone?: string;
  // Personal
  dateOfBirth: string;
  gender: Gender;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  stateOfOrigin?: string;
  // Employment
  departmentId: number;
  positionId: number;
  salaryStructureId?: number;
  hireDate: string;
  confirmationDate?: string;
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  jobTitle?: string;
  // Salary
  salaryType: SalaryType;
  unstructuredSalary?: number;
  voluntaryPensionContribution?: number;
  annualRentPaid?: number;
  payFrequency?: PayFrequency;
  // Banking
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  // Address
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  // Identifiers
  nin?: string;
  bvn?: string;
  pensionPin?: string;
  pensionAdministratorId?: number;
  taxId?: string;
  // Meta
  isActive?: boolean;
  isUser?: boolean;
  userId?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {}

export interface EmployeeQueryParams {
  search?: string;
  departmentId?: number;
  positionId?: number;
  employmentStatus?: EmploymentStatus;
  employmentType?: EmploymentType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface EmployeeStats {
  total: number;
  active: number;
  onLeave: number;
  terminated: number;
  suspended?: number;
  byDepartment: { departmentId: number | null; departmentName: string; count: number }[];
  byEmploymentType: { type: EmploymentType; count: number }[];
}

// ----------------------------------------------------------------------------
// DEPARTMENT
// ----------------------------------------------------------------------------

export interface Department {
  id: number;
  companyId: number;
  branchId?: number;
  parentDepartmentId?: number;
  headEmployeeId?: number;
  name: string;
  code: string;
  description?: string;
  budgetAllocation?: number;
  costCenter?: string;
  phone?: string;
  email?: string;
  location?: string;
  notes?: string;
  isActive: boolean;
  // Relations (nested objects - not always present)
  parentDepartment?: Department;
  subDepartments?: Department[];
  headEmployee?: Employee;
  // Joined flat fields from backend queries
  headEmployeeName?: string;
  parentDepartmentName?: string;
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentDto {
  name: string;
  code: string;
  description?: string;
  parentDepartmentId?: number;
  headEmployeeId?: number;
  budgetAllocation?: number;
  costCenter?: string;
  phone?: string;
  email?: string;
  location?: string;
}

export interface UpdateDepartmentDto extends Partial<CreateDepartmentDto> {
  isActive?: boolean;
}

export interface DepartmentQueryParams {
  search?: string;
  parentDepartmentId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// POSITION
// ----------------------------------------------------------------------------

export interface Position {
  id: number;
  companyId: number;
  branchId?: number | null;
  departmentId?: number | null;
  cadreId: number;
  title: string;
  code: string;
  description?: string | null;
  responsibilities?: string[] | string | null;
  requirements?: string | null;
  requiredSkills?: string[] | null;
  preferredSkills?: string[] | null;
  educationLevel?: string | null;
  experienceYears?: number;
  reportsToPositionId?: number | null;
  positionMinSalary?: number | null;
  positionMaxSalary?: number | null;
  isRecruiting?: boolean;
  availableSlots?: number;
  notes?: string | null;
  isActive: boolean;
  // Joined fields
  departmentName?: string | null;
  cadreName?: string | null;
  // Relations
  department?: Department;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePositionDto {
  title: string;
  code: string;
  departmentId: number;
  cadreId: number;
  description?: string;
  responsibilities?: string[];
  requirements?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  educationLevel?: string;
  experienceYears?: number;
  reportsToPositionId?: number;
  positionMinSalary?: number;
  positionMaxSalary?: number;
  isRecruiting?: boolean;
  availableSlots?: number;
  notes?: string;
  isActive?: boolean;
}

export interface UpdatePositionDto {
  title?: string;
  departmentId?: number;
  cadreId?: number;
  description?: string;
  responsibilities?: string[];
  requirements?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  educationLevel?: string;
  experienceYears?: number;
  reportsToPositionId?: number;
  positionMinSalary?: number;
  positionMaxSalary?: number;
  isRecruiting?: boolean;
  availableSlots?: number;
  notes?: string;
  isActive?: boolean;
}

export interface PositionQueryParams {
  search?: string;
  departmentId?: number;
  cadreId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// CADRE
// ----------------------------------------------------------------------------

export interface Cadre {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description: string | null;
  minSalary: number | null;
  maxSalary: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCadreDto {
  name: string;
  code: string;
  description?: string;
  minSalary?: number;
  maxSalary?: number;
  isActive?: boolean;
}

export interface UpdateCadreDto {
  name?: string;
  code?: string;
  description?: string;
  minSalary?: number;
  maxSalary?: number;
  isActive?: boolean;
}

export interface CadreQueryParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// GRADE LEVEL
// ----------------------------------------------------------------------------

export interface GradeLevel {
  id: number;
  companyId: number;
  cadreId: number;
  name: string;
  code: string;
  description?: string | null;
  level: number;
  minSalary: number;
  maxSalary: number;
  annualIncrement?: number | null;
  incrementPercentage?: number | null;
  maxSteps: number;
  stepAmount?: number | null;
  minYearsForPromotion?: number | null;
  isActive: boolean;
  // Joined
  cadreName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGradeLevelDto {
  cadreId: number;
  name: string;
  code: string;
  description?: string;
  level?: number;
  minSalary: number;
  maxSalary: number;
  annualIncrement?: number;
  incrementPercentage?: number;
  maxSteps?: number;
  minYearsForPromotion?: number;
  isActive?: boolean;
}

export interface UpdateGradeLevelDto {
  cadreId?: number;
  name?: string;
  description?: string;
  level?: number;
  minSalary?: number;
  maxSalary?: number;
  annualIncrement?: number;
  incrementPercentage?: number;
  maxSteps?: number;
  minYearsForPromotion?: number;
  isActive?: boolean;
}

export interface GradeLevelQueryParams {
  search?: string;
  cadreId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// SALARY STRUCTURE
// ----------------------------------------------------------------------------

export interface SalaryStructure {
  id: number;
  companyId: number;
  branchId?: number;
  cadreId?: number;
  gradeLevelId?: number;
  name: string;
  code: string;
  description?: string;
  structureType?: string;
  salaryApproach?: string;
  baseAmount?: number;
  baseCalculationMethod?: string;
  baseCalculationFormula?: string;
  lumpSumAmount?: number;
  lumpSumTaxable: boolean;
  requiresApproval: boolean;
  approvalWorkflow?: string[];
  isActive: boolean;
  isDefaultForCadre: boolean;
  isDefaultForGrade: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  approvalStatus: string;
  // Joined
  cadreName?: string | null;
  gradeLevelName?: string | null;
  // Relations
  cadre?: Cadre;
  gradeLevel?: GradeLevel;
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalaryStructureDto {
  name: string;
  code: string;
  description?: string;
  cadreId?: number;
  gradeLevelId?: number;
  structureType?: string;
  salaryApproach?: string;
  baseAmount?: number;
  baseCalculationMethod?: string;
  lumpSumAmount?: number;
  lumpSumTaxable?: boolean;
  isDefaultForCadre?: boolean;
  isDefaultForGrade?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdateSalaryStructureDto extends Partial<CreateSalaryStructureDto> {
  isActive?: boolean;
}

export interface SalaryStructureQueryParams {
  search?: string;
  cadreId?: number;
  gradeLevelId?: number;
  structureType?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface SalaryStructureStats {
  total: number;
  active: number;
  byStructureType: Record<string, number>;
  bySalaryApproach: Record<string, number>;
}

// ----------------------------------------------------------------------------
// PAYROLL ITEM
// ----------------------------------------------------------------------------

export interface PayrollItem {
  id: number;
  companyId: number;
  branchId?: number;
  name: string;
  code: string;
  description?: string;
  category: PayrollItemCategory;
  calculationType: CalculationType;
  baseOn: BaseOn;
  defaultPercentage?: number;
  defaultAmount?: number;
  isTaxable: boolean;
  isPensionable: boolean;
  affectsGross: boolean;
  isDeduction: boolean;
  displayOrder: number;
  showOnPayslip: boolean;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  // Relations
  gradeLevels?: GradeLevel[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayrollItemDto {
  name: string;
  code: string;
  description?: string;
  category: PayrollItemCategory;
  calculationType: CalculationType;
  baseOn: BaseOn;
  defaultPercentage?: number;
  defaultAmount?: number;
  isTaxable?: boolean;
  isPensionable?: boolean;
  affectsGross?: boolean;
  isDeduction?: boolean;
  displayOrder?: number;
  showOnPayslip?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdatePayrollItemDto extends Partial<CreatePayrollItemDto> {
  isActive?: boolean;
}

export interface PayrollItemQueryParams {
  search?: string;
  category?: PayrollItemCategory;
  isDeduction?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PayrollItemStats {
  total: number;
  active: number;
  earnings: number;
  deductions: number;
  byCategory: Record<string, number>;
}

// ----------------------------------------------------------------------------
// PAY ELEMENT (consolidated PayrollComponent + PayrollItem)
// ----------------------------------------------------------------------------

export type PayElementMode = 'GRADE_BASED' | 'FORMULA_BASED' | 'LUMP_SUM';
export type PayElementType = 'EARNING' | 'DEDUCTION' | 'BENEFIT';

export interface PayElement {
  id: number;
  companyId: number;
  branchId: number | null;
  name: string;
  code: string;
  shortName: string | null;
  description: string | null;
  type: PayElementType;
  mode: PayElementMode;
  category: string;
  calculationType: string;
  baseOn: string | null;
  defaultRate: number | null;
  defaultAmount: number | null;
  defaultPercentage: number | null;
  minimumAmount: number | null;
  maximumAmount: number | null;
  calculationFormula: string | null;
  isStatutory: boolean;
  statutoryAgency: string | null;
  employerRate: number | null;
  employeeRate: number | null;
  taxable: boolean;
  affectsPensionCalculation: boolean;
  affectsGratuityCalculation: boolean;
  proRatable: boolean;
  showOnPayslip: boolean;
  displayOrder: number;
  frequency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  isSystemElement: boolean;
  legacyTable: string | null;
  legacyId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayElementDto {
  name: string;
  code: string;
  branchId?: number;
  shortName?: string;
  description?: string;
  type: PayElementType;
  mode: PayElementMode;
  category: string;
  calculationType?: string;
  baseOn?: string;
  defaultRate?: number;
  defaultAmount?: number;
  defaultPercentage?: number;
  minimumAmount?: number;
  maximumAmount?: number;
  calculationFormula?: string;
  isStatutory?: boolean;
  statutoryAgency?: string;
  employerRate?: number;
  employeeRate?: number;
  taxable?: boolean;
  affectsPensionCalculation?: boolean;
  affectsGratuityCalculation?: boolean;
  proRatable?: boolean;
  showOnPayslip?: boolean;
  displayOrder?: number;
  frequency?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
}

export type UpdatePayElementDto = Partial<CreatePayElementDto>;

export interface PayElementQueryParams {
  mode?: PayElementMode;
  type?: PayElementType;
  category?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// PAYROLL CALENDAR
// ----------------------------------------------------------------------------

export interface PayrollCalendar {
  id: number;
  companyId: number;
  branchId?: number | null;
  departmentId?: number | null;
  name: string;
  code: string;
  description?: string | null;
  notes?: string | null;
  frequency: PayrollFrequency;
  payDay: number;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayrollCalendarDto {
  name: string;
  code: string;
  description?: string;
  notes?: string;
  frequency: PayrollFrequency;
  payDay: number;
  departmentId?: number;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status?: string;
}

export interface UpdatePayrollCalendarDto extends Partial<Omit<CreatePayrollCalendarDto, 'code'>> {
  isActive?: boolean;
}

export interface PayrollCalendarQueryParams {
  search?: string;
  frequency?: PayrollFrequency;
  status?: string;
  departmentId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PayrollCalendarStats {
  total: number;
  active: number;
  byFrequency: Record<string, number>;
}

// ----------------------------------------------------------------------------
// PAYROLL PERIOD
// ----------------------------------------------------------------------------

export interface PayrollPeriod {
  id: number;
  payrollCalendarId: number;
  companyId: number;
  name: string;
  code: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: PayrollPeriodStatus;
  // Relations
  payrollCalendar?: PayrollCalendar;
  payrollsCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// PAYROLL
// ----------------------------------------------------------------------------

export interface Payroll {
  id: number;
  employeeId: number;
  payrollCalendarId: number;
  salaryStructureId?: number;
  employeeGradeAssignmentId?: number;
  payrollPeriod: string;
  payDate: string;
  periodStart: string;
  periodEnd: string;
  workingDaysInPeriod: number;
  daysWorked: number;
  attendancePercentage: number;
  salaryType: SalaryType;
  baseSalaryAmount: number;
  proratedBaseAmount: number;
  lumpSumGross?: number;
  lumpSumDescription?: string;
  totalEarnings: number;
  totalDeductions: number;
  grossPay: number;
  netPay: number;
  taxableIncome: number;
  taxReliefAmount: number;
  chargeableIncome: number;
  employeePensionContribution: number;
  nhfEmployee: number;
  nhisEmployee: number;
  payeTax: number;
  withholdingTax: number;
  employerPensionContribution: number;
  employerNhisContribution: number;
  employerNsitfContribution: number;
  employerItfContribution: number;
  totalEmployerCost: number;
  status: PayrollStatus;
  isManualOverride: boolean;
  overrideReason?: string;
  calculationLog?: { step: string; description: string; amount: number }[];
  isPaid: boolean;
  paidDate?: string;
  paymentReference?: string;
  paymentMethod?: string;
  approvalStatus: string;
  employeeFullName?: string;
  // Relations
  employee?: Employee;
  payrollCalendar?: PayrollCalendar;
  salaryStructure?: SalaryStructure;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayrollDto {
  employeeId: number;
  payrollCalendarId: number;
  payrollPeriod: string;
  payDate: string;
  periodStart: string;
  periodEnd: string;
  workingDaysInPeriod?: number;
  daysWorked?: number;
}

export interface UpdatePayrollDto {
  workingDaysInPeriod?: number;
  daysWorked?: number;
  isManualOverride?: boolean;
  overrideReason?: string;
}

export interface PayrollQueryParams {
  employeeId?: number;
  payrollCalendarId?: number;
  payrollPeriod?: string;
  status?: PayrollStatus;
  isPaid?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface PayrollStats {
  totalPayrolls: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  totalEmployerCost: number;
  byStatus: { status: PayrollStatus; count: number }[];
}

export interface RunPayrollDto {
  payrollCalendarId: number;
  payrollPeriod: string;
  employeeIds?: number[];
}

// ----------------------------------------------------------------------------
// LEAVE
// ----------------------------------------------------------------------------

export interface Leave {
  id: number;
  employeeId: number;
  companyId: number;
  branchId?: number;
  leaveCode: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  resumptionDate?: string;
  daysRequested: number;
  daysApproved?: number;
  reason: string;
  status: LeaveStatus;
  balanceBefore?: number;
  balanceAfter?: number;
  affectsPayroll: boolean;
  attachments?: string[];
  approvalStatus: string;
  employeeFullName?: string;
  // Relations
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveDto {
  employeeId: number;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  attachments?: string[];
}

export interface UpdateLeaveDto extends Partial<CreateLeaveDto> {
  daysApproved?: number;
}

export interface LeaveQueryParams {
  employeeId?: number;
  leaveType?: LeaveType;
  status?: LeaveStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface LeaveStats {
  totalLeaves: number;
  pending: number;
  approved: number;
  rejected: number;
  byType: { type: LeaveType; count: number }[];
}

export interface LeaveBalance {
  annual: number;
  sick: number;
  maternity?: number;
  paternity?: number;
  casual: number;
  compassionate: number;
  study: number;
}

// ----------------------------------------------------------------------------
// LOAN
// ----------------------------------------------------------------------------

export interface Loan {
  id: number;
  employeeId: number;
  companyId: number;
  loanTypeId?: number;
  loanNumber: string;
  loanTypeName?: string;
  loanType?: LoanType;
  amountRequested: number;
  amountApproved?: number;
  interestRate: number;
  tenureMonths: number;
  monthlyDeduction: number;
  totalAmount: number;
  purpose?: string;
  status: LoanStatus;
  disbursementDate?: string;
  disbursementMethod?: string;
  disbursementReference?: string;
  firstDeductionDate?: string;
  lastDeductionDate?: string;
  nextDeductionDate?: string;
  totalRepaid: number;
  outstandingBalance: number;
  paymentsMade: number;
  paymentsRemaining: number;
  autoDeduct: boolean;
  guarantor1Name?: string;
  guarantor1Relationship?: string;
  guarantor1Phone?: string;
  guarantor2Name?: string;
  guarantor2Relationship?: string;
  guarantor2Phone?: string;
  approvalStatus: string;
  employeeFullName?: string;
  // Relations
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanDto {
  employeeId: number;
  loanType: LoanType;
  amountRequested: number;
  interestRate?: number;
  tenureMonths: number;
  purpose?: string;
  autoDeduct?: boolean;
  guarantor1Name?: string;
  guarantor1Relationship?: string;
  guarantor1Phone?: string;
  guarantor2Name?: string;
  guarantor2Relationship?: string;
  guarantor2Phone?: string;
}

export interface UpdateLoanDto extends Partial<CreateLoanDto> {
  amountApproved?: number;
}

export interface LoanQueryParams {
  employeeId?: number;
  loanType?: LoanType;
  status?: LoanStatus;
  page?: number;
  limit?: number;
}

export interface LoanStats {
  totalLoans: number;
  totalDisbursed: number;
  totalOutstanding: number;
  totalRepaid: number;
  byStatus: { status: LoanStatus; count: number }[];
  byType: { type: LoanType; count: number; amount: number }[];
}

// ----------------------------------------------------------------------------
// EMPLOYEE GRADE ASSIGNMENT
// ----------------------------------------------------------------------------

export interface EmployeeGradeAssignment {
  id: number;
  employeeId: number;
  cadreId: number;
  gradeLevelId: number;
  salaryStructureId?: number;
  assignmentType: GradeAssignmentType;
  assignmentReason?: string;
  referenceDocument?: string;
  assignmentDate: string;
  effectiveFrom: string;
  effectiveTo?: string;
  currentStep: number;
  stepEffectiveDate: string;
  nextStepDueDate?: string;
  stepIncrementAmount: number;
  currentBasicSalary: number;
  totalSalary: number;
  eligibleForNextStep: boolean;
  lastStepIncrementDate?: string;
  monthsBetweenSteps: number;
  eligibleForPromotion: boolean;
  eligibleForPromotionDate?: string;
  lastPerformanceScore?: number;
  lastPerformanceReviewDate?: string;
  minimumYearsInLevel: number;
  previousCadreId?: number;
  previousGradeLevelId?: number;
  previousStep?: number;
  previousSalary?: number;
  customAdjustments?: { name: string; amount: number; type: string }[];
  calculatedBenefits?: { name: string; amount: number; type: string }[];
  changeHistory?: { field: string; oldValue: unknown; newValue: unknown; changedAt: string }[];
  status: GradeAssignmentStatus;
  isCurrent: boolean;
  payrollUpdated: boolean;
  approvalStatus: string;
  // Relations
  employee?: Employee;
  cadre?: Cadre;
  gradeLevel?: GradeLevel;
  salaryStructure?: SalaryStructure;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGradeAssignmentDto {
  employeeId: number;
  cadreId: number;
  gradeLevelId: number;
  salaryStructureId?: number;
  assignmentType: GradeAssignmentType;
  assignmentReason?: string;
  assignmentDate: string;
  effectiveFrom: string;
  currentStep?: number;
  currentBasicSalary?: number;
  customAdjustments?: { name: string; amount: number; type: string }[];
}

export interface UpdateGradeAssignmentDto extends Partial<CreateGradeAssignmentDto> {}

export interface GradeAssignmentQueryParams {
  employeeId?: number;
  cadreId?: number;
  gradeLevelId?: number;
  assignmentType?: GradeAssignmentType;
  status?: GradeAssignmentStatus;
  isCurrent?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// EXPENSE CLAIM
// ----------------------------------------------------------------------------

export interface ExpenseClaim {
  id: number;
  employeeId: number;
  companyId: number;
  currencyId?: number;
  claimNumber: string;
  claimDate: string;
  totalAmount: number;
  description?: string;
  status: ExpenseClaimStatus;
  rejectionReason?: string;
  approvalStatus: string;
  // Relations
  employee?: Employee;
  lines?: ExpenseClaimLine[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseClaimLine {
  id: number;
  expenseClaimId: number;
  expenseCategoryId?: number;
  description: string;
  amount: number;
  receiptUrl?: string;
  expenseDate: string;
}

export interface CreateExpenseClaimDto {
  employeeId: number;
  claimDate: string;
  description?: string;
  lines: {
    expenseCategoryId?: number;
    description: string;
    amount: number;
    receiptUrl?: string;
    expenseDate: string;
  }[];
}

export interface UpdateExpenseClaimDto extends Partial<CreateExpenseClaimDto> {}

export interface ExpenseClaimQueryParams {
  employeeId?: number;
  status?: ExpenseClaimStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseClaimStats {
  totalClaims: number;
  totalAmount: number;
  pending: number;
  approved: number;
  paid: number;
}

// ----------------------------------------------------------------------------
// HR SETTINGS
// ----------------------------------------------------------------------------

export interface HRSettings {
  id: number;
  companyId: number;
  // Statutory Rates
  pensionEmployeeRate: number;
  pensionEmployerRate: number;
  nhfRate: number;
  nhisEmployeeRate: number;
  nhisEmployerRate: number;
  nsitfRate: number;
  itfRate: number;
  // Tax Relief Settings (NTA 2025)
  taxReliefPercentage: number;
  consolidatedReliefAllowance: number;
  rentReliefMaxPercentage: number;
  lifeInsuranceReliefMaxPercentage: number;
  // Leave Settings
  defaultAnnualLeaveDays: number;
  defaultSickLeaveDays: number;
  defaultMaternityLeaveDays: number;
  defaultPaternityLeaveDays: number;
  // Payroll Settings
  defaultSalaryApproach: 'STRUCTURED' | 'UNSTRUCTURED';
  defaultPayrollFrequency: PayrollFrequency;
  autoCalculateStatutory: boolean;
  autoDeductLoans: boolean;
  // Approval Settings
  requireLeaveApproval: boolean;
  requireLoanApproval: boolean;
  requireExpenseApproval: boolean;
  requireGradeChangeApproval: boolean;
  // GL accounts (payroll journal posting on approve)
  salaryExpenseAccountId: number | null;
  pensionExpenseAccountId: number | null;
  nhisExpenseAccountId: number | null;
  otherStatutoryExpenseAccountId: number | null;
  netSalaryPayableAccountId: number | null;
  payeLiabilityAccountId: number | null;
  pensionLiabilityAccountId: number | null;
  nhfLiabilityAccountId: number | null;
  nhisLiabilityAccountId: number | null;
  otherStatutoryLiabilityAccountId: number | null;
  otherDeductionsPayableAccountId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateHRSettingsDto {
  pensionEmployeeRate?: number;
  pensionEmployerRate?: number;
  nhfRate?: number;
  nhisEmployeeRate?: number;
  nhisEmployerRate?: number;
  nsitfRate?: number;
  itfRate?: number;
  taxReliefPercentage?: number;
  consolidatedReliefAllowance?: number;
  rentReliefMaxPercentage?: number;
  lifeInsuranceReliefMaxPercentage?: number;
  defaultAnnualLeaveDays?: number;
  defaultSickLeaveDays?: number;
  defaultMaternityLeaveDays?: number;
  defaultPaternityLeaveDays?: number;
  defaultSalaryApproach?: 'STRUCTURED' | 'UNSTRUCTURED';
  defaultPayrollFrequency?: PayrollFrequency;
  autoCalculateStatutory?: boolean;
  autoDeductLoans?: boolean;
  requireLeaveApproval?: boolean;
  requireLoanApproval?: boolean;
  requireExpenseApproval?: boolean;
  requireGradeChangeApproval?: boolean;
  salaryExpenseAccountId?: number | null;
  pensionExpenseAccountId?: number | null;
  nhisExpenseAccountId?: number | null;
  otherStatutoryExpenseAccountId?: number | null;
  netSalaryPayableAccountId?: number | null;
  payeLiabilityAccountId?: number | null;
  pensionLiabilityAccountId?: number | null;
  nhfLiabilityAccountId?: number | null;
  nhisLiabilityAccountId?: number | null;
  otherStatutoryLiabilityAccountId?: number | null;
  otherDeductionsPayableAccountId?: number | null;
}

// ----------------------------------------------------------------------------
// LOAN TYPE (Entity)
// ----------------------------------------------------------------------------

export interface LoanTypeEntity {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description?: string;
  maxAmount?: number;
  minAmount?: number;
  defaultInterestRate: number;
  maxTenureMonths: number;
  minTenureMonths: number;
  requiresGuarantor: boolean;
  numberOfGuarantorsRequired: number;
  requiresCollateral: boolean;
  eligibilityMonths: number;
  maxPercentageOfSalary?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanTypeDto {
  name: string;
  code: string;
  description?: string;
  maxAmount?: number;
  minAmount?: number;
  defaultInterestRate: number;
  maxTenureMonths: number;
  minTenureMonths?: number;
  requiresGuarantor?: boolean;
  numberOfGuarantorsRequired?: number;
  requiresCollateral?: boolean;
  eligibilityMonths?: number;
  maxPercentageOfSalary?: number;
}

export interface UpdateLoanTypeDto extends Partial<CreateLoanTypeDto> {
  isActive?: boolean;
}

export interface LoanTypeQueryParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// RECRUITMENT - JOB POSTING
// ----------------------------------------------------------------------------

export type JobPostingStatus = 'draft' | 'open' | 'closed' | 'filled' | 'cancelled';

export interface JobPosting {
  id: number;
  companyId: number;
  branchId?: number;
  departmentId?: number;
  positionId?: number;
  jobCode: string;
  title: string;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  employmentType: EmploymentType;
  salaryRangeMin?: number;
  salaryRangeMax?: number;
  showSalary: boolean;
  location?: string;
  isRemote: boolean;
  experienceYears?: number;
  educationLevel?: string;
  skills?: string[];
  openings: number;
  applicationDeadline?: string;
  status: JobPostingStatus;
  publishedAt?: string;
  closedAt?: string;
  applicationsCount?: number;
  department?: Department;
  position?: Position;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobPostingDto {
  title: string;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  departmentId?: number;
  positionId?: number;
  employmentType: EmploymentType;
  salaryRangeMin?: number;
  salaryRangeMax?: number;
  showSalary?: boolean;
  location?: string;
  isRemote?: boolean;
  experienceYears?: number;
  educationLevel?: string;
  skills?: string[];
  openings?: number;
  applicationDeadline?: string;
}

export interface UpdateJobPostingDto extends Partial<CreateJobPostingDto> {
  status?: JobPostingStatus;
}

export interface JobPostingQueryParams {
  search?: string;
  departmentId?: number;
  status?: JobPostingStatus;
  employmentType?: EmploymentType;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// RECRUITMENT - JOB APPLICATION
// ----------------------------------------------------------------------------

export type ApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'interview_scheduled' | 'interviewed' | 'offered' | 'hired' | 'rejected' | 'withdrawn';

export interface JobApplication {
  id: number;
  jobPostingId: number;
  companyId: number;
  applicationCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetterUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentEmployer?: string;
  currentPosition?: string;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriodDays?: number;
  availableFrom?: string;
  source?: string;
  referredBy?: string;
  skills?: string[];
  educationHistory?: { institution: string; degree: string; fieldOfStudy?: string; startDate?: string; endDate?: string }[];
  workHistory?: { company: string; position: string; startDate?: string; endDate?: string; description?: string }[];
  status: ApplicationStatus;
  rating?: number;
  notes?: string;
  rejectionReason?: string;
  jobPosting?: JobPosting;
  interviews?: Interview[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobApplicationDto {
  jobPostingId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetterUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentEmployer?: string;
  currentPosition?: string;
  currentSalary?: number;
  expectedSalary?: number;
  noticePeriodDays?: number;
  availableFrom?: string;
  source?: string;
  referredBy?: string;
  skills?: string[];
}

export interface UpdateJobApplicationDto extends Partial<CreateJobApplicationDto> {
  status?: ApplicationStatus;
  rating?: number;
  notes?: string;
  rejectionReason?: string;
}

export interface JobApplicationQueryParams {
  jobPostingId?: number;
  status?: ApplicationStatus;
  search?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// RECRUITMENT - INTERVIEW
// ----------------------------------------------------------------------------

export type InterviewType = 'phone' | 'video' | 'in_person' | 'technical' | 'hr' | 'panel';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
export type InterviewResult = 'pending' | 'passed' | 'failed' | 'on_hold';

export interface Interview {
  id: number;
  jobApplicationId: number;
  companyId: number;
  interviewCode: string;
  interviewType: InterviewType;
  roundNumber: number;
  scheduledAt: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  interviewerIds?: number[];
  interviewerNames?: string[];
  status: InterviewStatus;
  result: InterviewResult;
  feedback?: string;
  technicalScore?: number;
  communicationScore?: number;
  cultureFitScore?: number;
  overallScore?: number;
  notes?: string;
  completedAt?: string;
  jobApplication?: JobApplication;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterviewDto {
  jobApplicationId: number;
  interviewType: InterviewType;
  roundNumber?: number;
  scheduledAt: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  interviewerIds?: number[];
}

export interface UpdateInterviewDto extends Partial<CreateInterviewDto> {
  status?: InterviewStatus;
  result?: InterviewResult;
  feedback?: string;
  technicalScore?: number;
  communicationScore?: number;
  cultureFitScore?: number;
  overallScore?: number;
  notes?: string;
}

export interface InterviewQueryParams {
  jobApplicationId?: number;
  interviewType?: InterviewType;
  status?: InterviewStatus;
  result?: InterviewResult;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// RECRUITMENT - JOB OFFER
// ----------------------------------------------------------------------------

export type OfferStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';

export interface JobOffer {
  id: number;
  jobApplicationId: number;
  companyId: number;
  offerCode: string;
  positionId?: number;
  departmentId?: number;
  cadreId?: number;
  gradeLevelId?: number;
  offeredSalary: number;
  salaryType: SalaryType;
  employmentType: EmploymentType;
  startDate: string;
  expiresAt?: string;
  probationPeriodMonths?: number;
  benefits?: string[];
  allowances?: { name: string; amount: number; frequency?: string }[];
  notes?: string;
  status: OfferStatus;
  sentAt?: string;
  respondedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  approvalStatus: string;
  jobApplication?: JobApplication;
  position?: Position;
  department?: Department;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobOfferDto {
  jobApplicationId: number;
  positionId?: number;
  departmentId?: number;
  cadreId?: number;
  gradeLevelId?: number;
  offeredSalary: number;
  salaryType: SalaryType;
  employmentType: EmploymentType;
  startDate: string;
  expiresAt?: string;
  probationPeriodMonths?: number;
  benefits?: string[];
  allowances?: { name: string; amount: number; frequency?: string }[];
  notes?: string;
}

export interface UpdateJobOfferDto extends Partial<CreateJobOfferDto> {
  status?: OfferStatus;
}

export interface JobOfferQueryParams {
  jobApplicationId?: number;
  status?: OfferStatus;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// TRAINING - TRAINING PROGRAM
// ----------------------------------------------------------------------------

export type TrainingType = 'technical' | 'soft_skills' | 'compliance' | 'leadership' | 'safety' | 'onboarding';
export type TrainingStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type DeliveryMethod = 'classroom' | 'online' | 'blended' | 'on_the_job' | 'workshop' | 'seminar';

export interface TrainingProgram {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description?: string;
  trainingType: TrainingType;
  deliveryMethod: DeliveryMethod;
  duration?: number;
  durationUnit?: string;
  provider?: string;
  instructorName?: string;
  maxParticipants?: number;
  minParticipants?: number;
  cost?: number;
  location?: string;
  startDate?: string;
  endDate?: string;
  objectives?: string[];
  materials?: string[];
  prerequisites?: string[];
  status: TrainingStatus;
  isActive: boolean;
  enrollmentsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrainingProgramDto {
  name: string;
  code: string;
  description?: string;
  trainingType: TrainingType;
  deliveryMethod: DeliveryMethod;
  duration?: number;
  durationUnit?: string;
  provider?: string;
  instructorName?: string;
  maxParticipants?: number;
  minParticipants?: number;
  cost?: number;
  location?: string;
  startDate?: string;
  endDate?: string;
  objectives?: string[];
  materials?: string[];
  prerequisites?: string[];
}

export interface UpdateTrainingProgramDto extends Partial<CreateTrainingProgramDto> {
  status?: TrainingStatus;
  isActive?: boolean;
}

export interface TrainingProgramQueryParams {
  search?: string;
  trainingType?: TrainingType;
  deliveryMethod?: DeliveryMethod;
  status?: TrainingStatus;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// TRAINING - TRAINING ENROLLMENT
// ----------------------------------------------------------------------------

export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'failed' | 'withdrawn' | 'no_show';

export interface TrainingEnrollment {
  id: number;
  trainingProgramId: number;
  employeeId: number;
  companyId: number;
  enrollmentCode: string;
  enrolledAt: string;
  startedAt?: string;
  completedAt?: string;
  status: EnrollmentStatus;
  progress?: number;
  score?: number;
  passingScore?: number;
  certificateUrl?: string;
  feedback?: string;
  attendancePercentage?: number;
  notes?: string;
  trainingProgram?: TrainingProgram;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrainingEnrollmentDto {
  trainingProgramId: number;
  employeeId: number;
}

export interface UpdateTrainingEnrollmentDto {
  status?: EnrollmentStatus;
  progress?: number;
  score?: number;
  feedback?: string;
  attendancePercentage?: number;
  notes?: string;
}

export interface TrainingEnrollmentQueryParams {
  trainingProgramId?: number;
  employeeId?: number;
  status?: EnrollmentStatus;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// BENEFITS
// ----------------------------------------------------------------------------

export type BenefitType = 'health_insurance' | 'life_insurance' | 'pension' | 'housing' | 'transportation' | 'meal' | 'education' | 'gym' | 'childcare' | 'other';
export type BenefitStatus = 'active' | 'inactive' | 'expired';

export interface Benefit {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description?: string;
  benefitType: BenefitType;
  provider?: string;
  coverageDetails?: string;
  employerContribution?: number;
  employeeContribution?: number;
  isPercentage: boolean;
  eligibilityCriteria?: string;
  waitingPeriodDays?: number;
  dependentsCovered: boolean;
  maxDependents?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
  enrollmentsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBenefitDto {
  name: string;
  code: string;
  description?: string;
  benefitType: BenefitType;
  provider?: string;
  coverageDetails?: string;
  employerContribution?: number;
  employeeContribution?: number;
  isPercentage?: boolean;
  eligibilityCriteria?: string;
  waitingPeriodDays?: number;
  dependentsCovered?: boolean;
  maxDependents?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdateBenefitDto extends Partial<CreateBenefitDto> {
  isActive?: boolean;
}

export interface BenefitQueryParams {
  search?: string;
  benefitType?: BenefitType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// BENEFIT ENROLLMENT
// ----------------------------------------------------------------------------

export type BenefitEnrollmentStatus = 'pending' | 'active' | 'terminated' | 'expired';

export interface BenefitEnrollment {
  id: number;
  benefitId: number;
  employeeId: number;
  companyId: number;
  enrollmentDate: string;
  effectiveDate: string;
  terminationDate?: string;
  status: BenefitEnrollmentStatus;
  coverageType?: string;
  coverageLevel?: string;
  employeeAmount?: number;
  employerAmount?: number;
  employeeContribution?: number;
  employerContribution?: number;
  dependentsCovered?: unknown[] | null;
  dependentsEnrolled?: number;
  notes?: string;
  benefit?: Benefit;
  employee?: Employee;
  dependents?: Dependent[];
  // Flat JOIN fields returned by findAll
  employeeFullName?: string;
  benefitName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBenefitEnrollmentDto {
  benefitId: number;
  employeeId: number;
  effectiveDate: string;
  coverageLevel?: string;
  dependentIds?: number[];
}

export interface UpdateBenefitEnrollmentDto {
  coverageLevel?: string;
  terminationDate?: string;
  status?: BenefitEnrollmentStatus;
  dependentIds?: number[];
}

export interface BenefitEnrollmentQueryParams {
  benefitId?: number;
  employeeId?: number;
  status?: BenefitEnrollmentStatus;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// DEPENDENT
// ----------------------------------------------------------------------------

export type DependentRelationship = 'spouse' | 'child' | 'parent' | 'sibling' | 'other';

export interface Dependent {
  id: number;
  employeeId: number;
  companyId: number;
  firstName: string;
  lastName: string;
  fullName: string;
  relationship: DependentRelationship;
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  email?: string;
  address?: string;
  isEmergencyContact: boolean;
  isBeneficiary: boolean;
  beneficiaryPercentage?: number;
  isActive: boolean;
  employeeFullName?: string;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDependentDto {
  employeeId: number;
  firstName: string;
  lastName: string;
  relationship: DependentRelationship;
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  email?: string;
  address?: string;
  isEmergencyContact?: boolean;
  isBeneficiary?: boolean;
  beneficiaryPercentage?: number;
}

export interface UpdateDependentDto extends Partial<CreateDependentDto> {
  isActive?: boolean;
}

export interface DependentQueryParams {
  employeeId?: number;
  relationship?: DependentRelationship;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// TIME SCHEDULING - WORK SCHEDULE
// ----------------------------------------------------------------------------

export interface WorkSchedule {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description?: string;
  workDays: string[];
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  breakDurationMinutes?: number;
  totalWorkHours: number;
  isFlexible: boolean;
  flexibleStartRange?: string;
  flexibleEndRange?: string;
  isDefault: boolean;
  isActive: boolean;
  employeesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkScheduleDto {
  name: string;
  code: string;
  description?: string;
  workDays: string[];
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  breakDurationMinutes?: number;
  isFlexible?: boolean;
  flexibleStartRange?: string;
  flexibleEndRange?: string;
  isDefault?: boolean;
}

export interface UpdateWorkScheduleDto extends Partial<CreateWorkScheduleDto> {
  isActive?: boolean;
}

export interface WorkScheduleQueryParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// TIME SCHEDULING - SHIFT
// ----------------------------------------------------------------------------

export type ShiftType = 'regular' | 'morning' | 'afternoon' | 'night' | 'split' | 'rotating';

export interface Shift {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description?: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  breakDurationMinutes?: number;
  totalHours: number;
  color?: string;
  allowanceAmount?: number;
  isOvernight: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftDto {
  name: string;
  code: string;
  description?: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  breakDurationMinutes?: number;
  totalHours: number;
  color?: string;
  allowanceAmount?: number;
  isOvernight?: boolean;
}

export interface UpdateShiftDto extends Partial<CreateShiftDto> {
  isActive?: boolean;
}

export interface ShiftQueryParams {
  search?: string;
  shiftType?: ShiftType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// TIME SCHEDULING - OVERTIME REQUEST
// ----------------------------------------------------------------------------

export type OvertimeStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'completed' | 'cancelled';

export interface OvertimeRequest {
  id: number;
  employeeId: number;
  companyId: number;
  requestCode: string;
  requestDate: string;
  startTime: string;
  endTime: string;
  hoursRequested: number;
  hoursApproved?: number;
  reason: string;
  status: OvertimeStatus;
  rateMultiplier: number;
  calculatedAmount?: number;
  approvalStatus: string;
  employeeFullName?: string;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOvertimeRequestDto {
  employeeId: number;
  requestDate: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface UpdateOvertimeRequestDto {
  hoursApproved?: number;
  status?: OvertimeStatus;
}

export interface OvertimeRequestQueryParams {
  employeeId?: number;
  status?: OvertimeStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// ONBOARDING
// ----------------------------------------------------------------------------

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';

export interface OnboardingTemplate {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description?: string;
  departmentId?: number;
  positionId?: number;
  durationDays: number;
  tasks?: OnboardingTask[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingTask {
  id: number;
  onboardingTemplateId: number;
  name: string;
  description?: string;
  assignedTo?: string;
  dayNumber: number;
  isMandatory: boolean;
  documentRequired: boolean;
  order: number;
}

export interface EmployeeOnboarding {
  id: number;
  employeeId: number;
  onboardingTemplateId: number;
  companyId: number;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  status: OnboardingStatus;
  progress: number;
  completedTasks: number;
  totalTasks: number;
  notes?: string;
  employeeFullName?: string;
  employee?: Employee;
  template?: OnboardingTemplate;
  taskProgress?: OnboardingTaskProgress[];
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingTaskProgress {
  id: number;
  employeeOnboardingId: number;
  onboardingTaskId: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: string;
  completedBy?: number;
  documentUrl?: string;
  notes?: string;
  task?: OnboardingTask;
}

export interface CreateOnboardingTemplateDto {
  name: string;
  code: string;
  description?: string;
  departmentId?: number;
  positionId?: number;
  durationDays: number;
  isDefault?: boolean;
  tasks?: {
    name: string;
    description?: string;
    assignedTo?: string;
    dayNumber: number;
    isMandatory?: boolean;
    documentRequired?: boolean;
    order: number;
  }[];
}

export interface UpdateOnboardingTemplateDto extends Partial<CreateOnboardingTemplateDto> {
  isActive?: boolean;
}

export interface StartOnboardingDto {
  employeeId: number;
  onboardingTemplateId: number;
  startDate: string;
}

export interface OnboardingQueryParams {
  employeeId?: number;
  status?: OnboardingStatus;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// OFFBOARDING
// ----------------------------------------------------------------------------

export type OffboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';
export type TerminationType = 'resignation' | 'termination' | 'retirement' | 'contract_end' | 'death' | 'redundancy';

export interface OffboardingTemplate {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description?: string;
  terminationType?: TerminationType;
  durationDays: number;
  tasks?: OffboardingTask[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OffboardingTask {
  id: number;
  offboardingTemplateId: number;
  name: string;
  description?: string;
  assignedTo?: string;
  dayNumber: number;
  isMandatory: boolean;
  documentRequired: boolean;
  order: number;
}

export interface EmployeeOffboarding {
  id: number;
  employeeId: number;
  offboardingTemplateId: number;
  companyId: number;
  terminationType: TerminationType;
  terminationReason?: string;
  lastWorkingDate: string;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  status: OffboardingStatus;
  progress: number;
  completedTasks: number;
  totalTasks: number;
  exitInterviewDate?: string;
  exitInterviewNotes?: string;
  clearanceStatus?: string;
  finalSettlementAmount?: number;
  notes?: string;
  employeeFullName?: string;
  employee?: Employee;
  template?: OffboardingTemplate;
  taskProgress?: OffboardingTaskProgress[];
  createdAt: string;
  updatedAt: string;
}

export interface OffboardingTaskProgress {
  id: number;
  employeeOffboardingId: number;
  offboardingTaskId: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: string;
  completedBy?: number;
  documentUrl?: string;
  notes?: string;
  task?: OffboardingTask;
}

export interface CreateOffboardingTemplateDto {
  name: string;
  code: string;
  description?: string;
  terminationType?: TerminationType;
  durationDays: number;
  isDefault?: boolean;
  tasks?: {
    name: string;
    description?: string;
    assignedTo?: string;
    dayNumber: number;
    isMandatory?: boolean;
    documentRequired?: boolean;
    order: number;
  }[];
}

export interface UpdateOffboardingTemplateDto extends Partial<CreateOffboardingTemplateDto> {
  isActive?: boolean;
}

export interface StartOffboardingDto {
  employeeId: number;
  offboardingTemplateId: number;
  terminationType: TerminationType;
  terminationReason?: string;
  lastWorkingDate: string;
}

export interface OffboardingQueryParams {
  employeeId?: number;
  status?: OffboardingStatus;
  terminationType?: TerminationType;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// PERFORMANCE MANAGEMENT
// ----------------------------------------------------------------------------

export type ReviewPeriod = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type ReviewStatus = 'draft' | 'self_review' | 'manager_review' | 'calibration' | 'completed';

export interface PerformanceReview {
  id: number;
  employeeId: number;
  reviewerId: number;
  companyId: number;
  reviewCode: string;
  employeeFullName?: string;
  reviewerFullName?: string;
  reviewPeriod: ReviewPeriod;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: ReviewStatus;
  selfRating?: number;
  managerRating?: number;
  finalRating?: number;
  selfComments?: string;
  managerComments?: string;
  strengths?: string[];
  areasForImprovement?: string[];
  developmentPlan?: string;
  goalsAchieved?: number;
  totalGoals?: number;
  completedAt?: string;
  employee?: Employee;
  reviewer?: Employee;
  goals?: PerformanceGoal[];
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceGoal {
  id: number;
  performanceReviewId?: number;
  employeeId: number;
  companyId: number;
  title: string;
  description?: string;
  targetValue?: number;
  actualValue?: number;
  unit?: string;
  weight: number;
  startDate: string;
  dueDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'exceeded' | 'not_achieved';
  progress: number;
  selfRating?: number;
  managerRating?: number;
  notes?: string;
  employee?: Employee;
  // Flat JOIN field returned by findAll
  employeeFullName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePerformanceReviewDto {
  employeeId: number;
  reviewerId: number;
  reviewPeriod: ReviewPeriod;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
}

export interface UpdatePerformanceReviewDto {
  selfRating?: number;
  managerRating?: number;
  finalRating?: number;
  selfComments?: string;
  managerComments?: string;
  strengths?: string[];
  areasForImprovement?: string[];
  developmentPlan?: string;
  status?: ReviewStatus;
}

export interface CreatePerformanceGoalDto {
  employeeId: number;
  performanceReviewId?: number;
  title: string;
  description?: string;
  targetValue?: number;
  unit?: string;
  weight?: number;
  startDate: string;
  dueDate: string;
}

export interface UpdatePerformanceGoalDto extends Partial<CreatePerformanceGoalDto> {
  actualValue?: number;
  progress?: number;
  selfRating?: number;
  managerRating?: number;
  status?: 'not_started' | 'in_progress' | 'completed' | 'exceeded' | 'not_achieved';
  notes?: string;
}

export interface PerformanceReviewQueryParams {
  employeeId?: number;
  reviewerId?: number;
  reviewPeriod?: ReviewPeriod;
  status?: ReviewStatus;
  page?: number;
  limit?: number;
}

export interface PerformanceGoalQueryParams {
  employeeId?: number;
  performanceReviewId?: number;
  status?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// EMPLOYEE DOCUMENTS
// ----------------------------------------------------------------------------

export type DocumentType = 'identification' | 'passport' | 'visa' | 'work_permit' | 'certificate' | 'qualification' | 'contract' | 'offer_letter' | 'other';

export interface EmployeeDocument {
  id: number;
  employeeId: number;
  companyId: number;
  documentType: DocumentType;
  name: string;
  description?: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  documentNumber?: string;
  isVerified: boolean;
  verifiedBy?: number;
  verifiedAt?: string;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeDocumentDto {
  employeeId: number;
  documentType: DocumentType;
  name: string;
  description?: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  documentNumber?: string;
}

export interface UpdateEmployeeDocumentDto extends Partial<CreateEmployeeDocumentDto> {
  isVerified?: boolean;
}

export interface EmployeeDocumentQueryParams {
  employeeId?: number;
  documentType?: DocumentType;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// EXPENSE CATEGORY
// ----------------------------------------------------------------------------

export interface ExpenseCategory {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description?: string;
  glAccountId?: number;
  maxAmount?: number;
  requiresReceipt: boolean;
  requiresApproval: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseCategoryDto {
  name: string;
  code: string;
  description?: string;
  glAccountId?: number;
  maxAmount?: number;
  requiresReceipt?: boolean;
  requiresApproval?: boolean;
}

export interface UpdateExpenseCategoryDto extends Partial<CreateExpenseCategoryDto> {
  isActive?: boolean;
}

export interface ExpenseCategoryQueryParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// LOAN REPAYMENT
// ----------------------------------------------------------------------------

export interface LoanRepayment {
  id: number;
  employeeLoanId: number;
  repaymentDate: string;
  amount: number;
  principalPart: number | null;
  interestPart: number | null;
  balanceAfter: number | null;
  paymentMethod: string | null;
  reference: string | null;
  receiptNumber: string | null;
  notes: string | null;
  receivedBy: number | null;
  employeeFullName?: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoanRepaymentQueryParams {
  employeeLoanId?: number;
  paymentMethod?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// LEAVE TYPE CONFIG
// ----------------------------------------------------------------------------

export interface LeaveTypeConfig {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description?: string;
  daysPerYear: number;
  isPaid: boolean;
  requiresAttachment: boolean;
  requiresApproval: boolean;
  maxConsecutiveDays?: number;
  minNoticeDays?: number;
  carryForward: boolean;
  maxCarryForward?: number;
  gender?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveTypeConfigDto {
  name: string;
  code: string;
  description?: string;
  daysPerYear?: number;
  isPaid?: boolean;
  requiresAttachment?: boolean;
  requiresApproval?: boolean;
  maxConsecutiveDays?: number;
  minNoticeDays?: number;
  carryForward?: boolean;
  maxCarryForward?: number;
  gender?: string;
}

export interface UpdateLeaveTypeConfigDto extends Partial<CreateLeaveTypeConfigDto> {
  isActive?: boolean;
}

export interface LeaveTypeConfigQueryParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// TIME CLOCK RECORD
// ----------------------------------------------------------------------------

export interface TimeClockRecord {
  id: number;
  companyId: number;
  employeeId: number;
  clockInTime: string;
  clockOutTime?: string;
  clockInLocation?: string;
  clockOutLocation?: string;
  totalHours?: number;
  breakMinutes?: number;
  overtimeHours?: number;
  status: 'clocked_in' | 'clocked_out' | 'absent' | 'late' | 'early_departure';
  shiftId?: number;
  source: 'manual' | 'biometric' | 'mobile' | 'web';
  ipAddress?: string;
  notes?: string;
  approvedBy?: number;
  approvedAt?: string;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeClockRecordDto {
  employeeId: number;
  clockInTime: string;
  clockInLocation?: string;
  shiftId?: number;
  source?: string;
  notes?: string;
}

export interface UpdateTimeClockRecordDto {
  clockOutTime?: string;
  clockOutLocation?: string;
  breakMinutes?: number;
  notes?: string;
}

export interface TimeClockRecordQueryParams {
  employeeId?: number;
  status?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// PROBATION
// ----------------------------------------------------------------------------

export interface Probation {
  id: number;
  companyId: number;
  employeeId: number;
  startDate: string;
  endDate: string;
  extendedEndDate?: string;
  probationType: 'initial' | 'extended';
  durationMonths: number;
  status: 'active' | 'extended' | 'confirmed' | 'terminated' | 'failed';
  objectives?: { title: string; description?: string; weight?: number; targetDate?: string }[];
  reviewNotes?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  confirmationDate?: string;
  terminationReason?: string;
  employeeFullName?: string;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProbationDto {
  employeeId: number;
  startDate: string;
  endDate: string;
  probationType?: string;
  durationMonths?: number;
  objectives?: { title: string; description?: string; weight?: number; targetDate?: string }[];
  notes?: string;
}

export interface UpdateProbationDto extends Partial<CreateProbationDto> {
  reviewNotes?: string;
}

export interface ProbationQueryParams {
  employeeId?: number;
  status?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// REIMBURSEMENT
// ----------------------------------------------------------------------------

export interface Reimbursement {
  id: number;
  companyId: number;
  expenseClaimId: number;
  employeeId: number;
  paymentDate: string;
  amount: number;
  paymentMethod: 'bank_transfer' | 'cash' | 'cheque';
  referenceNumber?: string;
  bankName?: string;
  accountNumber?: string;
  chequeNumber?: string;
  notes?: string;
  processedBy?: number;
  journalEntryId?: number;
  employeeFullName?: string;
  employee?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReimbursementDto {
  expenseClaimId: number;
  employeeId: number;
  paymentDate: string;
  amount: number;
  paymentMethod?: string;
  referenceNumber?: string;
  bankName?: string;
  accountNumber?: string;
  chequeNumber?: string;
  notes?: string;
}

export interface UpdateReimbursementDto extends Partial<CreateReimbursementDto> {}

export interface ReimbursementQueryParams {
  employeeId?: number;
  expenseClaimId?: number;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// SHIFT ASSIGNMENT
// ----------------------------------------------------------------------------

export interface ShiftAssignment {
  id: number;
  companyId: number;
  employeeId: number;
  employeeFullName?: string;
  shiftId: number;
  startDate: string;
  endDate?: string;
  isRecurring: boolean;
  recurPattern?: string;
  notes?: string;
  assignedBy?: number;
  isActive: boolean;
  employee?: Employee;
  shift?: Shift;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftAssignmentDto {
  employeeId: number;
  shiftId: number;
  startDate: string;
  endDate?: string;
  isRecurring?: boolean;
  recurPattern?: string;
  notes?: string;
}

export interface UpdateShiftAssignmentDto extends Partial<CreateShiftAssignmentDto> {
  isActive?: boolean;
}

export interface ShiftAssignmentQueryParams {
  employeeId?: number;
  shiftId?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// ROSTER
// ----------------------------------------------------------------------------

export interface Roster {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description?: string;
  departmentId?: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'published' | 'active' | 'completed' | 'cancelled';
  publishedBy?: number;
  publishedAt?: string;
  notes?: string;
  entries?: RosterEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRosterDto {
  name: string;
  code: string;
  description?: string;
  departmentId?: number;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface UpdateRosterDto extends Partial<CreateRosterDto> {}

export interface RosterQueryParams {
  search?: string;
  status?: string;
  departmentId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// ROSTER ENTRY
// ----------------------------------------------------------------------------

export interface RosterEntry {
  id: number;
  rosterId: number;
  employeeId: number;
  employeeFullName?: string;
  shiftId: number;
  date: string;
  startTime?: string;
  endTime?: string;
  status: 'scheduled' | 'confirmed' | 'swapped' | 'cancelled';
  swappedWith?: number;
  notes?: string;
  employee?: Employee;
  shift?: Shift;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRosterEntryDto {
  rosterId: number;
  employeeId: number;
  shiftId: number;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface UpdateRosterEntryDto extends Partial<CreateRosterEntryDto> {
  status?: string;
}

export interface RosterEntryQueryParams {
  rosterId?: number;
  employeeId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// EMPLOYEE WORK SCHEDULE
// ----------------------------------------------------------------------------

export interface EmployeeWorkSchedule {
  id: number;
  companyId: number;
  employeeId: number;
  workScheduleId: number;
  effectiveDate: string;
  endDate?: string;
  isCurrent: boolean;
  notes?: string;
  assignedBy?: number;
  employee?: Employee;
  workSchedule?: WorkSchedule;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeWorkScheduleDto {
  employeeId: number;
  workScheduleId: number;
  effectiveDate: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateEmployeeWorkScheduleDto extends Partial<CreateEmployeeWorkScheduleDto> {
  isCurrent?: boolean;
}

export interface EmployeeWorkScheduleQueryParams {
  employeeId?: number;
  workScheduleId?: number;
  isCurrent?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// JOB PLACEMENT
// ----------------------------------------------------------------------------

export interface JobPlacement {
  id: number;
  companyId: number;
  jobApplicationId: number;
  jobPostingId: number;
  employeeId?: number;
  employeeFullName?: string;
  placementDate: string;
  startDate: string;
  positionId?: number;
  departmentId?: number;
  salaryOffered?: number;
  status: 'pending' | 'onboarded' | 'confirmed' | 'cancelled';
  onboardingId?: number;
  notes?: string;
  processedBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobPlacementDto {
  jobApplicationId: number;
  jobPostingId: number;
  placementDate: string;
  startDate: string;
  positionId?: number;
  departmentId?: number;
  salaryOffered?: number;
  notes?: string;
}

export interface UpdateJobPlacementDto extends Partial<CreateJobPlacementDto> {
  status?: string;
}

export interface JobPlacementQueryParams {
  status?: string;
  jobPostingId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// INTERVIEW SCHEDULE
// ----------------------------------------------------------------------------

export interface InterviewSchedule {
  id: number;
  companyId: number;
  interviewId: number;
  scheduledDate: string;
  duration: number;
  location?: string;
  meetingLink?: string;
  roomName?: string;
  interviewerIds?: number[];
  status: 'scheduled' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no_show';
  reminderSent: boolean;
  notes?: string;
  rescheduledFrom?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterviewScheduleDto {
  interviewId: number;
  scheduledDate: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  roomName?: string;
  interviewerIds?: number[];
  notes?: string;
}

export interface UpdateInterviewScheduleDto extends Partial<CreateInterviewScheduleDto> {
  status?: string;
}

export interface InterviewScheduleQueryParams {
  interviewId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// PERFORMANCE REVIEW TEMPLATE
// ----------------------------------------------------------------------------

export interface PerformanceReviewTemplate {
  id: number;
  companyId: number;
  name: string;
  code: string;
  description?: string;
  reviewType: 'annual' | 'quarterly' | 'probation' | '360_degree' | 'project';
  sections?: { name: string; description?: string; weight?: number; criteria?: string[] }[];
  ratingScale: number;
  ratingLabels?: Record<number, string>;
  includeGoals: boolean;
  includeKpis: boolean;
  includeSelfReview: boolean;
  includePeerReview: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePerformanceReviewTemplateDto {
  name: string;
  code: string;
  description?: string;
  reviewType?: string;
  sections?: { name: string; description?: string; weight?: number; criteria?: string[] }[];
  ratingScale?: number;
  ratingLabels?: Record<number, string>;
  includeGoals?: boolean;
  includeKpis?: boolean;
  includeSelfReview?: boolean;
  includePeerReview?: boolean;
  isDefault?: boolean;
}

export interface UpdatePerformanceReviewTemplateDto extends Partial<CreatePerformanceReviewTemplateDto> {
  isActive?: boolean;
}

export interface PerformanceReviewTemplateQueryParams {
  search?: string;
  reviewType?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// PAYSLIP GENERATION
// ----------------------------------------------------------------------------

export interface PayslipGeneration {
  id: number;
  companyId: number;
  payrollId: number;
  employeeId: number;
  payrollPeriod: string;
  payslipNumber: string;
  generatedAt: string;
  payslipHtml?: string;
  pdfPath?: string;
  emailSent: boolean;
  emailSentAt?: string;
  downloadCount: number;
  lastDownloadAt?: string;
  generatedBy?: number;
  employee?: Employee;
  // Flat JOIN field returned by findAll
  employeeFullName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayslipGenerationQueryParams {
  payrollId?: number;
  employeeId?: number;
  payrollPeriod?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// EMPLOYEE SKILL (Pivot)
// ----------------------------------------------------------------------------

export interface EmployeeSkillRecord {
  id: number;
  employeeId: number;
  skillId: number;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  acquiredDate?: string;
  expiryDate?: string;
  certifiedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeSkillDto {
  employeeId: number;
  skillId: number;
  proficiencyLevel?: string;
  acquiredDate?: string;
  expiryDate?: string;
  certifiedBy?: string;
  notes?: string;
}

// ----------------------------------------------------------------------------
// EMPLOYEE CERTIFICATION (Pivot)
// ----------------------------------------------------------------------------

export interface EmployeeCertificationRecord {
  id: number;
  employeeId: number;
  certificationId: number;
  issueDate: string;
  expiryDate?: string;
  certificateNumber?: string;
  issuingBody?: string;
  status: 'active' | 'expired' | 'revoked' | 'renewed';
  renewalDate?: string;
  attachmentPath?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeCertificationDto {
  employeeId: number;
  certificationId: number;
  issueDate: string;
  expiryDate?: string;
  certificateNumber?: string;
  issuingBody?: string;
  notes?: string;
}

// ----------------------------------------------------------------------------
// EMPLOYEE KPI (Pivot)
// ----------------------------------------------------------------------------

export interface EmployeeKpiRecord {
  id: number;
  employeeId: number;
  kpiId: number;
  targetValue?: number;
  actualValue?: number;
  weight: number;
  score?: number;
  period?: string;
  status: 'pending' | 'in_progress' | 'achieved' | 'missed' | 'exceeded';
  notes?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeKpiDto {
  employeeId: number;
  kpiId: number;
  targetValue?: number;
  weight?: number;
  period?: string;
  notes?: string;
}

export interface ImportEmployeeItem {
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  personalEmail?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  hireDate?: string;
  departmentName?: string;
  positionName?: string;
  jobTitle?: string;
  employmentType?: string;
  employmentStatus?: string;
  branchName?: string;
  unstructuredSalary?: number;
  voluntaryPensionContribution?: number;
  annualRentPaid?: number;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  isActive?: boolean;
}

export interface ImportEmployeesResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; code: string; message: string }[];
}
