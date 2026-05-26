import { api } from '../api';
import type { PaginatedResponse } from '@/types/core';
import type {
  ProjectType,
  CreateProjectTypeDto,
  UpdateProjectTypeDto,
  ProjectTypeQueryParams,
  ProjectCategory,
  CreateProjectCategoryDto,
  UpdateProjectCategoryDto,
  ProjectCategoryQueryParams,
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectQueryParams,
  ProjectStats,
  ProjectSummary,
  ProjectPhase,
  CreateProjectPhaseDto,
  UpdateProjectPhaseDto,
  ProjectPhaseQueryParams,
  ProjectMilestone,
  CreateProjectMilestoneDto,
  UpdateProjectMilestoneDto,
  ProjectMilestoneQueryParams,
  ProjectBudget,
  CreateProjectBudgetDto,
  UpdateProjectBudgetDto,
  ProjectBudgetQueryParams,
  ProjectTeamMember,
  CreateProjectTeamMemberDto,
  UpdateProjectTeamMemberDto,
  ProjectTeamMemberQueryParams,
  TimeEntry,
  CreateTimeEntryDto,
  UpdateTimeEntryDto,
  TimeEntryQueryParams,
  ProjectRevenue,
  CreateProjectRevenueDto,
  UpdateProjectRevenueDto,
  ProjectRevenueQueryParams,
} from '@/types/projectmanagement';

// ============================================================================
// PROJECT TYPES API
// ============================================================================

export const projectTypesApi = {
  list: async (params?: ProjectTypeQueryParams): Promise<PaginatedResponse<ProjectType>> => {
    const response = await api.get('/projectmanagement/project-types', { params });
    return response.data;
  },

  get: async (id: number): Promise<ProjectType> => {
    const response = await api.get(`/projectmanagement/project-types/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectTypeDto): Promise<ProjectType> => {
    const response = await api.post('/projectmanagement/project-types', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProjectTypeDto): Promise<ProjectType> => {
    const response = await api.patch(`/projectmanagement/project-types/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/projectmanagement/project-types/${id}`);
  },
};

// ============================================================================
// PROJECT CATEGORIES API
// ============================================================================

export const projectCategoriesApi = {
  list: async (params?: ProjectCategoryQueryParams): Promise<PaginatedResponse<ProjectCategory>> => {
    const response = await api.get('/projectmanagement/project-categories', { params });
    return response.data;
  },

  get: async (id: number): Promise<ProjectCategory> => {
    const response = await api.get(`/projectmanagement/project-categories/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectCategoryDto): Promise<ProjectCategory> => {
    const response = await api.post('/projectmanagement/project-categories', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProjectCategoryDto): Promise<ProjectCategory> => {
    const response = await api.patch(`/projectmanagement/project-categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/projectmanagement/project-categories/${id}`);
  },
};

// ============================================================================
// PROJECTS API
// ============================================================================

export const projectsApi = {
  list: async (params?: ProjectQueryParams): Promise<PaginatedResponse<Project>> => {
    const response = await api.get('/projectmanagement/projects', { params });
    return response.data;
  },

  get: async (id: number): Promise<Project> => {
    const response = await api.get(`/projectmanagement/projects/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectDto): Promise<Project> => {
    const response = await api.post('/projectmanagement/projects', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProjectDto): Promise<Project> => {
    const response = await api.patch(`/projectmanagement/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/projectmanagement/projects/${id}`);
  },

  getStats: async (): Promise<ProjectStats> => {
    const response = await api.get('/projectmanagement/projects/stats');
    return response.data;
  },

  getSummary: async (id: number): Promise<ProjectSummary> => {
    const response = await api.get(`/projectmanagement/projects/${id}/summary`);
    return response.data;
  },
};

// ============================================================================
// PROJECT PHASES API
// ============================================================================

export const projectPhasesApi = {
  list: async (params?: ProjectPhaseQueryParams): Promise<PaginatedResponse<ProjectPhase>> => {
    const response = await api.get('/projectmanagement/project-phases', { params });
    return response.data;
  },

  get: async (id: number): Promise<ProjectPhase> => {
    const response = await api.get(`/projectmanagement/project-phases/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectPhaseDto): Promise<ProjectPhase> => {
    const response = await api.post('/projectmanagement/project-phases', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProjectPhaseDto): Promise<ProjectPhase> => {
    const response = await api.patch(`/projectmanagement/project-phases/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/projectmanagement/project-phases/${id}`);
  },
};

// ============================================================================
// PROJECT MILESTONES API
// ============================================================================

export const projectMilestonesApi = {
  list: async (params?: ProjectMilestoneQueryParams): Promise<PaginatedResponse<ProjectMilestone>> => {
    const response = await api.get('/projectmanagement/project-milestones', { params });
    return response.data;
  },

  get: async (id: number): Promise<ProjectMilestone> => {
    const response = await api.get(`/projectmanagement/project-milestones/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectMilestoneDto): Promise<ProjectMilestone> => {
    const response = await api.post('/projectmanagement/project-milestones', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProjectMilestoneDto): Promise<ProjectMilestone> => {
    const response = await api.patch(`/projectmanagement/project-milestones/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/projectmanagement/project-milestones/${id}`);
  },
};

// ============================================================================
// PROJECT BUDGETS API
// ============================================================================

export const projectBudgetsApi = {
  list: async (params?: ProjectBudgetQueryParams): Promise<PaginatedResponse<ProjectBudget>> => {
    const response = await api.get('/projectmanagement/project-budgets', { params });
    return response.data;
  },

  get: async (id: number): Promise<ProjectBudget> => {
    const response = await api.get(`/projectmanagement/project-budgets/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectBudgetDto): Promise<ProjectBudget> => {
    const response = await api.post('/projectmanagement/project-budgets', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProjectBudgetDto): Promise<ProjectBudget> => {
    const response = await api.patch(`/projectmanagement/project-budgets/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/projectmanagement/project-budgets/${id}`);
  },
};

// ============================================================================
// PROJECT TEAM MEMBERS API
// ============================================================================

export const projectTeamMembersApi = {
  list: async (params?: ProjectTeamMemberQueryParams): Promise<PaginatedResponse<ProjectTeamMember>> => {
    const response = await api.get('/projectmanagement/project-team-members', { params });
    return response.data;
  },

  get: async (id: number): Promise<ProjectTeamMember> => {
    const response = await api.get(`/projectmanagement/project-team-members/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectTeamMemberDto): Promise<ProjectTeamMember> => {
    const response = await api.post('/projectmanagement/project-team-members', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProjectTeamMemberDto): Promise<ProjectTeamMember> => {
    const response = await api.patch(`/projectmanagement/project-team-members/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/projectmanagement/project-team-members/${id}`);
  },
};

// ============================================================================
// TIME ENTRIES API
// ============================================================================

export const timeEntriesApi = {
  list: async (params?: TimeEntryQueryParams): Promise<PaginatedResponse<TimeEntry>> => {
    const response = await api.get('/projectmanagement/time-entries', { params });
    return response.data;
  },

  get: async (id: number): Promise<TimeEntry> => {
    const response = await api.get(`/projectmanagement/time-entries/${id}`);
    return response.data;
  },

  create: async (data: CreateTimeEntryDto): Promise<TimeEntry> => {
    const response = await api.post('/projectmanagement/time-entries', data);
    return response.data;
  },

  update: async (id: number, data: UpdateTimeEntryDto): Promise<TimeEntry> => {
    const response = await api.patch(`/projectmanagement/time-entries/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/projectmanagement/time-entries/${id}`);
  },

  submit: async (id: number): Promise<TimeEntry> => {
    const response = await api.post(`/projectmanagement/time-entries/${id}/submit`);
    return response.data;
  },

  approve: async (id: number): Promise<TimeEntry> => {
    const response = await api.post(`/projectmanagement/time-entries/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<TimeEntry> => {
    const response = await api.post(`/projectmanagement/time-entries/${id}/reject`, { reason });
    return response.data;
  },
};

// ============================================================================
// PROJECT REVENUES API
// ============================================================================

export const projectRevenuesApi = {
  list: async (params?: ProjectRevenueQueryParams): Promise<PaginatedResponse<ProjectRevenue>> => {
    const response = await api.get('/projectmanagement/project-revenues', { params });
    return response.data;
  },

  get: async (id: number): Promise<ProjectRevenue> => {
    const response = await api.get(`/projectmanagement/project-revenues/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectRevenueDto): Promise<ProjectRevenue> => {
    const response = await api.post('/projectmanagement/project-revenues', data);
    return response.data;
  },

  update: async (id: number, data: UpdateProjectRevenueDto): Promise<ProjectRevenue> => {
    const response = await api.patch(`/projectmanagement/project-revenues/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/projectmanagement/project-revenues/${id}`);
  },
};
