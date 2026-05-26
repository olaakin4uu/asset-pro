import { api } from '../api';
import type {
  Company,
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyListQuery,
  PaginatedResponse,
  Branch,
  CreateBranchDto,
  UpdateBranchDto,
  BranchListQuery,
  Role,
  CreateRoleDto,
  UpdateRoleDto,
  RoleListQuery,
  Permission,
  PermissionListQuery,
  GroupedPermissions,
  User,
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  UserListQuery,
  ImportUserItem,
  ImportUsersResult,
  UserSeatInfo,
} from '@/types/core';

// ============================================================================
// COMPANIES API
// ============================================================================

export const companiesApi = {
  list: async (query?: CompanyListQuery): Promise<PaginatedResponse<Company>> => {
    const response = await api.get('/core/companies', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Company> => {
    const response = await api.get(`/core/companies/${id}`);
    return response.data;
  },

  create: async (data: CreateCompanyDto): Promise<Company> => {
    const response = await api.post('/core/companies', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCompanyDto): Promise<Company> => {
    const response = await api.patch(`/core/companies/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/core/companies/${id}`);
  },

  getStatistics: async (id: number): Promise<Record<string, number>> => {
    const response = await api.get(`/core/companies/${id}/statistics`);
    return response.data;
  },

  uploadLogo: async (id: number, file: File): Promise<Company> => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.post(`/core/companies/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteLogo: async (id: number): Promise<Company> => {
    const response = await api.delete(`/core/companies/${id}/logo`);
    return response.data;
  },

  seedAccounts: async (id: number): Promise<{ message: string }> => {
    const response = await api.post(`/core/companies/${id}/seed-accounts`);
    return response.data;
  },
};

// ============================================================================
// BRANCHES API
// ============================================================================

export const branchesApi = {
  list: async (query?: BranchListQuery): Promise<PaginatedResponse<Branch>> => {
    const response = await api.get('/core/branches', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Branch> => {
    const response = await api.get(`/core/branches/${id}`);
    return response.data;
  },

  getByCompany: async (companyId: number): Promise<Branch[]> => {
    const response = await api.get(`/core/branches/company/${companyId}`);
    return response.data;
  },

  create: async (data: CreateBranchDto): Promise<Branch> => {
    const response = await api.post('/core/branches', data);
    return response.data;
  },

  update: async (id: number, data: UpdateBranchDto): Promise<Branch> => {
    const response = await api.patch(`/core/branches/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/core/branches/${id}`);
  },

  setAsHeadOffice: async (id: number): Promise<Branch> => {
    const response = await api.post(`/core/branches/${id}/set-head-office`);
    return response.data;
  },
};

// ============================================================================
// ROLES API
// ============================================================================

export const rolesApi = {
  list: async (query?: RoleListQuery): Promise<PaginatedResponse<Role>> => {
    const response = await api.get('/core/roles', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<Role> => {
    const response = await api.get(`/core/roles/${id}`);
    return response.data;
  },

  create: async (data: CreateRoleDto): Promise<Role> => {
    const response = await api.post('/core/roles', data);
    return response.data;
  },

  update: async (id: number, data: UpdateRoleDto): Promise<Role> => {
    const response = await api.patch(`/core/roles/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/core/roles/${id}`);
  },

  assignPermissions: async (id: number, permissionIds: number[]): Promise<void> => {
    await api.post(`/core/roles/${id}/permissions`, { permissionIds });
  },

  getPermissions: async (id: number): Promise<Permission[]> => {
    const response = await api.get(`/core/roles/${id}/permissions`);
    return response.data;
  },
};

// ============================================================================
// PERMISSIONS API
// ============================================================================

export const permissionsApi = {
  /**
   * Get flat list of permissions
   */
  list: async (query?: PermissionListQuery): Promise<PaginatedResponse<Permission>> => {
    const response = await api.get('/core/permissions', { params: { ...query, groupByModule: false } });
    // Handle both response formats
    if (Array.isArray(response.data)) {
      return { data: response.data, total: response.data.length, page: 1, limit: response.data.length, totalPages: 1 };
    }
    if (response.data.data && Array.isArray(response.data.data)) {
      return response.data;
    }
    return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  },

  /**
   * Get permissions grouped by Module → Category
   * Returns: { data: { Module: { Category: [permissions] } }, total, moduleCount }
   */
  listGrouped: async (): Promise<GroupedPermissions> => {
    const response = await api.get('/core/permissions', { params: { groupByModule: true } });
    return response.data;
  },

  /**
   * Get flat list from grouped response (helper for forms)
   */
  listFlat: async (): Promise<Permission[]> => {
    const response = await api.get('/core/permissions', { params: { groupByModule: true } });
    const permissions: Permission[] = [];

    // Flatten Module → Category → Permissions structure
    if (response.data.data && typeof response.data.data === 'object') {
      Object.values(response.data.data).forEach((categories: unknown) => {
        if (typeof categories === 'object' && categories !== null && !Array.isArray(categories)) {
          Object.values(categories as Record<string, unknown>).forEach((perms: unknown) => {
            if (Array.isArray(perms)) {
              permissions.push(...perms);
            }
          });
        }
      });
    }

    return permissions;
  },

  get: async (id: number): Promise<Permission> => {
    const response = await api.get(`/core/permissions/${id}`);
    return response.data;
  },

  getModules: async (): Promise<string[]> => {
    const response = await api.get('/core/permissions/modules');
    return response.data;
  },
};

// ============================================================================
// USERS API
// ============================================================================

export const usersApi = {
  list: async (query?: UserListQuery): Promise<PaginatedResponse<User>> => {
    const response = await api.get('/core/users', { params: query });
    return response.data;
  },

  get: async (id: number): Promise<User> => {
    const response = await api.get(`/core/users/${id}`);
    return response.data;
  },

  create: async (data: CreateUserDto): Promise<User> => {
    const response = await api.post('/core/users', data);
    return response.data;
  },

  update: async (id: number, data: UpdateUserDto): Promise<User> => {
    const response = await api.patch(`/core/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/core/users/${id}`);
  },

  changePassword: async (id: number, data: ChangePasswordDto): Promise<void> => {
    await api.post(`/core/users/${id}/change-password`, data);
  },

  assignRoles: async (id: number, roleIds: number[]): Promise<void> => {
    await api.post(`/core/users/${id}/roles`, { roleIds });
  },

  getRoles: async (id: number): Promise<string[]> => {
    const response = await api.get(`/core/users/${id}/roles`);
    return response.data;
  },

  getPermissions: async (id: number): Promise<string[]> => {
    const response = await api.get(`/core/users/${id}/permissions`);
    return response.data;
  },

  hasPermission: async (id: number, permission: string): Promise<boolean> => {
    const response = await api.get(`/core/users/${id}/permissions/${permission}`);
    return response.data.hasPermission;
  },

  getSeatInfo: async (): Promise<UserSeatInfo> => {
    const response = await api.get('/core/users/seat-info');
    return response.data;
  },

  getImportTemplate: async (): Promise<{ headers: string[]; sampleRows: string[][]; notes: Record<string, string> }> => {
    const response = await api.get('/core/users/import/template');
    return response.data;
  },

  importUsers: async (
    users: ImportUserItem[],
    importMode?: 'skip' | 'update' | 'overwrite',
    passwordMode?: 'temp_password' | 'default_password',
    defaultPassword?: string,
  ): Promise<ImportUsersResult> => {
    const response = await api.post('/core/users/import', { users, importMode, passwordMode, defaultPassword });
    return response.data;
  },

  invite: async (data: { email: string; name: string; userType?: string; branchId?: number }): Promise<{ message: string }> => {
    const response = await api.post('/core/users/invite', data);
    return response.data;
  },
};

// ============================================================================
// COMPANY CONTEXT API
// ============================================================================

export interface CompanyDetails {
  id: number;
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
  currency: string;
  logoPath?: string;
  logoUrl?: string;
  isActive: boolean;
  branchCount: number;
  userCount: number;
}

export interface BranchDetails {
  id: number;
  name: string;
  code?: string;
  companyId: number;
  isHeadOffice: boolean;
  isActive: boolean;
  timezone?: string;
  userCount: number;
}

export interface FeatureAccess {
  code: string;
  name: string;
  module: string;
  isCore: boolean;
  includedInPlan: boolean;
  isEnabled: boolean;
  canToggle: boolean;
}

export interface ModuleAccess {
  slug: string;
  name: string;
  isCore: boolean;
  isEnabled: boolean;
  status: 'enabled' | 'disabled' | 'trial' | 'read_only';
  features: FeatureAccess[];
}

export interface CompanyContextResponse {
  currentCompany: CompanyDetails | null;
  currentBranch: BranchDetails | null;
  availableCompanies: CompanyDetails[];
  accessibleBranches: BranchDetails[];
}

export interface SwitchResult {
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  company?: CompanyDetails;
  branch?: BranchDetails;
}

export interface EmployeeBranchesResponse {
  branches: BranchDetails[];
  hasSingleBranch: boolean;
  defaultBranchId: number | null;
}

export const companyContextApi = {
  /**
   * Get the current company context for the authenticated user
   */
  getContext: async (): Promise<CompanyContextResponse> => {
    const response = await api.get('/core/context');
    return response.data;
  },

  /**
   * Switch to a different company
   */
  switchCompany: async (companyId: number): Promise<SwitchResult> => {
    const response = await api.post('/core/context/switch-company', { companyId });
    return response.data;
  },

  /**
   * Switch to a different branch within the same company
   */
  switchBranch: async (branchId: number): Promise<SwitchResult> => {
    const response = await api.post('/core/context/switch-branch', { branchId });
    return response.data;
  },

  /**
   * Get all available companies
   */
  getAvailableCompanies: async (): Promise<CompanyDetails[]> => {
    const response = await api.get('/core/context/companies');
    return response.data;
  },

  /**
   * Get accessible branches for the current company
   */
  getAccessibleBranches: async (): Promise<BranchDetails[]> => {
    const response = await api.get('/core/context/branches');
    return response.data;
  },

  /**
   * Get employee's assigned branches for transaction forms.
   * Returns branches, hasSingleBranch flag, and defaultBranchId.
   */
  getMyBranches: async (): Promise<EmployeeBranchesResponse> => {
    const response = await api.get('/core/context/my-branches');
    return response.data;
  },

  /**
   * Get enabled modules and features for the tenant
   */
  getModules: async (): Promise<ModuleAccess[]> => {
    const response = await api.get('/core/context/modules');
    return response.data;
  },

  /**
   * Toggle a feature on/off for the current tenant
   */
  toggleFeature: async (
    moduleSlug: string,
    featureSlug: string,
    enabled: boolean,
  ): Promise<{ success: boolean }> => {
    const response = await api.post('/core/context/features/toggle', {
      moduleSlug,
      featureSlug,
      enabled,
    });
    return response.data;
  },
};

// ============================================================================
// DASHBOARD API
// ============================================================================

export interface DashboardStat {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'amber' | 'indigo' | 'cyan';
  link?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  progress?: {
    value: number;
    label?: string;
  };
  badge?: {
    label: string;
    variant: 'default' | 'warning' | 'danger' | 'success';
    pulse?: boolean;
  };
}

export interface DashboardActivity {
  id: number;
  type: 'sale' | 'purchase' | 'inventory' | 'payment' | 'alert' | 'user';
  title: string;
  description: string;
  time: string;
  amount?: string;
}

export interface DashboardAlert {
  id: number;
  type: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  message: string;
  action?: string;
  actionUrl?: string;
}

export interface DashboardCompanyInfo {
  id: number;
  name: string;
  displayName?: string;
  businessType?: string;
  currency: string;
  city?: string;
  employeesCount: number;
}

export interface ChartDataItem {
  label: string;
  value: number;
  color?: string;
}

export interface ChartConfig {
  title: string;
  type: 'bar' | 'pie';
  data: ChartDataItem[];
}

export interface QuickAction {
  label: string;
  icon: string;
  href: string;
  variant: 'primary' | 'secondary';
}

export interface DashboardResponse {
  companyInfo: DashboardCompanyInfo | null;
  stats: DashboardStat[];
  performanceStats: DashboardStat[];
  charts: ChartConfig[];
  quickActions: QuickAction[];
  activities: DashboardActivity[];
  alerts: DashboardAlert[];
}

export interface FmCashPositionBank {
  name: string;
  glCode: string;
  balance: number;
}

export interface FmCashPosition {
  totalBankBalance: number;
  investeeOutstanding: number;
  aum: number;
  cashToAumPct: number;
  cashBreached: boolean;
  banks: FmCashPositionBank[];
}

export interface FundManagementDashboardResponse {
  companyInfo: DashboardCompanyInfo | null;
  aumStats: DashboardStat[];
  operationalStats: DashboardStat[];
  activities: DashboardActivity[];
  alerts: DashboardAlert[];
  complianceSummary: {
    totalRules: number;
    passedChecks: number;
    failedChecks: number;
    breachCount: number;
  };
  cashPosition: FmCashPosition;
}

export const dashboardApi = {
  /**
   * Get dashboard data for the current company context
   */
  getDashboard: async (): Promise<DashboardResponse> => {
    const response = await api.get('/core/dashboard');
    return response.data;
  },

  /**
   * Get fund management dashboard data
   */
  getFundManagementDashboard: async (): Promise<FundManagementDashboardResponse> => {
    const response = await api.get('/core/dashboard/fund-management');
    return response.data;
  },
};

// ============================================================================
// MESSAGES API
// ============================================================================

export const messagesApi = {
  listInbox: async (params?: Record<string, unknown>) => {
    const response = await api.get('/core/messages/inbox', { params });
    return response.data;
  },
  listSent: async (params?: Record<string, unknown>) => {
    const response = await api.get('/core/messages/sent', { params });
    return response.data;
  },
  listDrafts: async (params?: Record<string, unknown>) => {
    const response = await api.get('/core/messages/drafts', { params });
    return response.data;
  },
  get: async (id: number) => {
    const response = await api.get(`/core/messages/${id}`);
    return response.data;
  },
  send: async (data: { recipientIds: number[]; subject: string; body: string; isDraft?: boolean }) => {
    const response = await api.post('/core/messages', data);
    return response.data;
  },
  reply: async (id: number, data: { body: string }) => {
    const response = await api.post(`/core/messages/${id}/reply`, data);
    return response.data;
  },
  markAsRead: async (id: number) => {
    const response = await api.patch(`/core/messages/${id}/read`);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/core/messages/${id}`);
  },
};

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

export const notificationsApi = {
  list: async (params?: Record<string, unknown>) => {
    const response = await api.get('/core/notifications', { params });
    return response.data;
  },
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/core/notifications/unread-count');
    return response.data;
  },
  markAsRead: async (id: string) => {
    const response = await api.patch(`/core/notifications/${id}/read`);
    return response.data;
  },
  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await api.post('/core/notifications/mark-all-read');
    return response.data;
  },
  delete: async (id: string) => {
    await api.delete(`/core/notifications/${id}`);
  },
};

// ============================================================================
// EXPORT ALL
// ============================================================================

// ============================================================================
// SUPER ADMIN OVERRIDE API
// ============================================================================

export const superAdminOverrideApi = {
  override: async (data: { entityType: string; entityId: number; reason: string }): Promise<{ success: boolean; entityType: string; entityId: number; newStatus: string }> => {
    const response = await api.post('/core/super-admin-override', data);
    return response.data;
  },

  listEntityTypes: async (): Promise<{ entityType: string; table: string; approvedStatus: string }[]> => {
    const response = await api.post('/core/super-admin-override/entity-types');
    return response.data;
  },
};

// ============================================================================
// TENANT BACKUPS API
// ============================================================================

export const tenantBackupsApi = {
  list: async (params?: { skip?: number; take?: number }): Promise<{ data: Record<string, unknown>[]; total: number }> => {
    const response = await api.get('/core/backups', { params });
    return response.data;
  },

  create: async (notes?: string): Promise<Record<string, unknown>> => {
    const response = await api.post('/core/backups', { notes });
    return response.data;
  },

  getOne: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/core/backups/${id}`);
    return response.data;
  },

  download: async (id: number): Promise<void> => {
    const response = await api.get(`/core/backups/${id}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const filename = response.headers['content-disposition']
      ?.split('filename="')[1]
      ?.replace('"', '') || `backup_${id}.dump`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  restore: async (id: number): Promise<{ success: boolean; message: string; status?: string }> => {
    const response = await api.post(`/core/backups/${id}/restore`);
    return response.data;
  },

  upload: async (file: File, notes?: string): Promise<Record<string, unknown>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (notes) formData.append('notes', notes);
    const response = await api.post('/core/backups/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300_000,
    });
    return response.data;
  },

  restoreApprove: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/core/backups/${id}/restore-approve`);
    return response.data;
  },

  restoreOverride: async (id: number, reason: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/core/backups/${id}/restore-override`, { reason });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/core/backups/${id}`);
  },
};

export const coreApi = {
  companies: companiesApi,
  branches: branchesApi,
  roles: rolesApi,
  permissions: permissionsApi,
  users: usersApi,
  context: companyContextApi,
  dashboard: dashboardApi,
  messages: messagesApi,
  notifications: notificationsApi,
  superAdminOverride: superAdminOverrideApi,
  backups: tenantBackupsApi,
};
