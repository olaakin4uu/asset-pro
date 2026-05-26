// ============================================================================
// PROJECT MANAGEMENT MODULE TYPES
// ============================================================================

// ----------------------------------------------------------------------------
// ENUMS & CONSTANTS
// ----------------------------------------------------------------------------

export type ProjectStatus = 'draft' | 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type BillingType = 'fixed_price' | 'time_and_materials' | 'milestone_based' | 'retainer';
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'missed';
export type TimeEntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'invoiced';
export type RevenueType = 'milestone_payment' | 'progress_payment' | 'final_payment' | 'advance_payment' | 'variation_order';

// ----------------------------------------------------------------------------
// PROJECT TYPE
// ----------------------------------------------------------------------------

export interface ProjectType {
  id: number;
  companyId: number;
  branchId?: number;
  name: string;
  code: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  projectsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectTypeDto {
  name: string;
  code: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateProjectTypeDto extends Partial<CreateProjectTypeDto> {
  isActive?: boolean;
}

export interface ProjectTypeQueryParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// PROJECT CATEGORY
// ----------------------------------------------------------------------------

export interface ProjectCategory {
  id: number;
  companyId: number;
  branchId?: number;
  name: string;
  code: string;
  description?: string;
  parentCategoryId?: number;
  isActive: boolean;
  // Relations
  parentCategory?: ProjectCategory;
  subCategories?: ProjectCategory[];
  projectsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectCategoryDto {
  name: string;
  code: string;
  description?: string;
  parentCategoryId?: number;
}

export interface UpdateProjectCategoryDto extends Partial<CreateProjectCategoryDto> {
  isActive?: boolean;
}

export interface ProjectCategoryQueryParams {
  search?: string;
  parentCategoryId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// PROJECT
// ----------------------------------------------------------------------------

export interface Project {
  id: number;
  companyId: number;
  branchId?: number;
  projectTypeId?: number;
  projectCategoryId?: number;
  clientId?: number;
  projectManagerId?: number;
  projectCode: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  billingType: BillingType;
  totalBudget: number;
  totalCost: number;
  totalRevenue: number;
  estimatedHours: number;
  actualHours: number;
  progress: number;
  healthScore?: number;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  isActive: boolean;
  // Relations
  projectType?: ProjectType;
  projectCategory?: ProjectCategory;
  projectManager?: { id: number; firstName: string; lastName: string; fullName: string; email?: string };
  phases?: ProjectPhase[];
  milestones?: ProjectMilestone[];
  teamMembers?: ProjectTeamMember[];
  budgets?: ProjectBudget[];
  timeEntries?: TimeEntry[];
  revenues?: ProjectRevenue[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  projectTypeId?: number;
  projectCategoryId?: number;
  clientId?: number;
  projectManagerId?: number;
  projectCode: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  billingType: BillingType;
  totalBudget: number;
  estimatedHours?: number;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {
  actualStartDate?: string;
  actualEndDate?: string;
  totalCost?: number;
  totalRevenue?: number;
  actualHours?: number;
  progress?: number;
  healthScore?: number;
  isActive?: boolean;
}

export interface ProjectQueryParams {
  search?: string;
  projectTypeId?: number;
  projectCategoryId?: number;
  clientId?: number;
  projectManagerId?: number;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  billingType?: BillingType;
  isActive?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  onHold: number;
  cancelled: number;
  totalBudget: number;
  totalCost: number;
  totalRevenue: number;
  byStatus: { status: ProjectStatus; count: number }[];
  byPriority: { priority: ProjectPriority; count: number }[];
  byType: { typeId: number; typeName: string; count: number }[];
}

export interface ProjectSummary {
  project: Project;
  phasesSummary: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
  milestonesSummary: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    missed: number;
  };
  budgetSummary: {
    totalBudget: number;
    totalCost: number;
    totalRevenue: number;
    profitMargin: number;
    costUtilization: number;
  };
  teamSummary: {
    totalMembers: number;
    activeMembers: number;
    byRole: { role: string; count: number }[];
  };
  timeSummary: {
    estimatedHours: number;
    actualHours: number;
    billableHours: number;
    nonBillableHours: number;
  };
}

// ----------------------------------------------------------------------------
// PROJECT PHASE
// ----------------------------------------------------------------------------

export interface ProjectPhase {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: PhaseStatus;
  order: number;
  progress: number;
  estimatedHours: number;
  actualHours: number;
  budget: number;
  actualCost: number;
  deliverables?: string[];
  notes?: string;
  // Relations
  project?: Project;
  milestones?: ProjectMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPhaseDto {
  projectId: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  order?: number;
  estimatedHours?: number;
  budget?: number;
  deliverables?: string[];
  notes?: string;
}

export interface UpdateProjectPhaseDto extends Partial<CreateProjectPhaseDto> {
  actualStartDate?: string;
  actualEndDate?: string;
  status?: PhaseStatus;
  progress?: number;
  actualHours?: number;
  actualCost?: number;
}

export interface ProjectPhaseQueryParams {
  projectId?: number;
  status?: PhaseStatus;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// PROJECT MILESTONE
// ----------------------------------------------------------------------------

export interface ProjectMilestone {
  id: number;
  projectId: number;
  projectPhaseId?: number;
  name: string;
  description?: string;
  dueDate: string;
  completedDate?: string;
  status: MilestoneStatus;
  progress: number;
  paymentPercentage?: number;
  paymentAmount?: number;
  deliverables?: string[];
  acceptanceCriteria?: string[];
  notes?: string;
  // Relations
  project?: Project;
  projectPhase?: ProjectPhase;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectMilestoneDto {
  projectId: number;
  projectPhaseId?: number;
  name: string;
  description?: string;
  dueDate: string;
  paymentPercentage?: number;
  paymentAmount?: number;
  deliverables?: string[];
  acceptanceCriteria?: string[];
  notes?: string;
}

export interface UpdateProjectMilestoneDto extends Partial<CreateProjectMilestoneDto> {
  completedDate?: string;
  status?: MilestoneStatus;
  progress?: number;
}

export interface ProjectMilestoneQueryParams {
  projectId?: number;
  projectPhaseId?: number;
  status?: MilestoneStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// PROJECT BUDGET
// ----------------------------------------------------------------------------

export interface ProjectBudget {
  id: number;
  projectId: number;
  projectPhaseId?: number;
  name: string;
  description?: string;
  category: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  notes?: string;
  // Relations
  project?: Project;
  projectPhase?: ProjectPhase;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectBudgetDto {
  projectId: number;
  projectPhaseId?: number;
  name: string;
  description?: string;
  category: string;
  budgetedAmount: number;
  notes?: string;
}

export interface UpdateProjectBudgetDto extends Partial<CreateProjectBudgetDto> {
  actualAmount?: number;
}

export interface ProjectBudgetQueryParams {
  projectId?: number;
  projectPhaseId?: number;
  category?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// PROJECT TEAM MEMBER
// ----------------------------------------------------------------------------

export interface ProjectTeamMember {
  id: number;
  projectId: number;
  employeeId: number;
  role: string;
  responsibilities?: string;
  hourlyRate?: number;
  allocationPercentage: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  canApproveTimeEntries: boolean;
  canEditBudget: boolean;
  notes?: string;
  // Relations
  project?: Project;
  employee?: { id: number; firstName: string; lastName: string; fullName: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectTeamMemberDto {
  projectId: number;
  employeeId: number;
  role: string;
  responsibilities?: string;
  hourlyRate?: number;
  allocationPercentage?: number;
  startDate: string;
  endDate?: string;
  canApproveTimeEntries?: boolean;
  canEditBudget?: boolean;
  notes?: string;
}

export interface UpdateProjectTeamMemberDto extends Partial<CreateProjectTeamMemberDto> {
  isActive?: boolean;
}

export interface ProjectTeamMemberQueryParams {
  projectId?: number;
  employeeId?: number;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// TIME ENTRY
// ----------------------------------------------------------------------------

export interface TimeEntry {
  id: number;
  projectId: number;
  projectPhaseId?: number;
  employeeId: number;
  entryCode: string;
  entryDate: string;
  startTime?: string;
  endTime?: string;
  hours: number;
  description?: string;
  taskName?: string;
  isBillable: boolean;
  hourlyRate?: number;
  amount?: number;
  status: TimeEntryStatus;
  rejectionReason?: string;
  approvedBy?: number;
  approvedAt?: string;
  invoiceId?: number;
  invoicedAt?: string;
  notes?: string;
  // Relations
  project?: Project;
  projectPhase?: ProjectPhase;
  employee?: { id: number; firstName: string; lastName: string; fullName: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimeEntryDto {
  projectId: number;
  projectPhaseId?: number;
  employeeId: number;
  entryDate: string;
  startTime?: string;
  endTime?: string;
  hours: number;
  description?: string;
  taskName?: string;
  isBillable?: boolean;
  hourlyRate?: number;
  notes?: string;
}

export interface UpdateTimeEntryDto extends Partial<CreateTimeEntryDto> {
  status?: TimeEntryStatus;
}

export interface TimeEntryQueryParams {
  projectId?: number;
  projectPhaseId?: number;
  employeeId?: number;
  status?: TimeEntryStatus;
  isBillable?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------------------------------
// PROJECT REVENUE
// ----------------------------------------------------------------------------

export interface ProjectRevenue {
  id: number;
  projectId: number;
  projectMilestoneId?: number;
  revenueCode: string;
  revenueType: RevenueType;
  amount: number;
  revenueDate: string;
  dueDate?: string;
  paidDate?: string;
  isPaid: boolean;
  invoiceNumber?: string;
  paymentReference?: string;
  description?: string;
  notes?: string;
  // Relations
  project?: Project;
  projectMilestone?: ProjectMilestone;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRevenueDto {
  projectId: number;
  projectMilestoneId?: number;
  revenueType: RevenueType;
  amount: number;
  revenueDate: string;
  dueDate?: string;
  invoiceNumber?: string;
  description?: string;
  notes?: string;
}

export interface UpdateProjectRevenueDto extends Partial<CreateProjectRevenueDto> {
  paidDate?: string;
  isPaid?: boolean;
  paymentReference?: string;
}

export interface ProjectRevenueQueryParams {
  projectId?: number;
  projectMilestoneId?: number;
  revenueType?: RevenueType;
  isPaid?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}
