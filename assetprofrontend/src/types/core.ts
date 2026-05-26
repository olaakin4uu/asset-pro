// ============================================================================
// CORE MODULE TYPES
// ============================================================================

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
}

// ============================================================================
// COMPANY TYPES
// ============================================================================

export interface Company {
  id: number;
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  businessType: string;
  currency: string;
  taxNumber?: string;
  registrationNumber?: string;
  website?: string;
  logoPath?: string;
  logoUrl?: string | null;
  isActive: boolean;
  entityId?: number;
  createdAt: string;
  updatedAt: string;
  branchCount?: number;
  userCount?: number;
}

export interface CreateCompanyDto {
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  businessType?: string;
  currency?: string;
  taxNumber?: string;
  registrationNumber?: string;
  website?: string;
  entityId?: number;
}

export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {
  isActive?: boolean;
}

export interface CompanyListQuery extends ListQueryParams {}

export interface CompanyStatistics {
  total: number;
  active: number;
  inactive: number;
  thisMonth: number;
}

// ============================================================================
// BRANCH TYPES
// ============================================================================

export interface Branch {
  id: number;
  companyId: number;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  isHeadOffice: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  companyName?: string;
  userCount?: number;
  warehouseCount?: number;
}

// Note: isActive is NOT allowed in CreateBranchDto - only in UpdateBranchDto
export interface CreateBranchDto {
  companyId: number;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  isHeadOffice?: boolean;
}

export interface UpdateBranchDto {
  companyId?: number;
  name?: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  isHeadOffice?: boolean;
  isActive?: boolean;
}

export interface BranchListQuery extends ListQueryParams {
  companyId?: number;
}

export interface BranchStatistics {
  total: number;
  active: number;
  headOffices: number;
  inactive: number;
}

// ============================================================================
// ROLE TYPES
// ============================================================================

export interface Role {
  id: number;
  name: string;
  description?: string;
  guardName?: string;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: string[];
  userCount?: number;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissionIds: number[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissionIds?: number[];
}

export interface RoleListQuery extends ListQueryParams {
  includePermissions?: boolean;
}

export interface RoleStatistics {
  total: number;
  withUsers: number;
  systemRoles: number;
  recent: number;
}

// ============================================================================
// PERMISSION TYPES
// ============================================================================

export interface Permission {
  id: number;
  name: string;
  description?: string;
  module?: string;
  guardName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionListQuery {
  module?: string;
  search?: string;
  groupByModule?: boolean;
}

/**
 * Permissions grouped by Module → Category
 * Structure: { Module: { Category: [Permission, ...] } }
 */
export interface GroupedPermissions {
  data: Record<string, Record<string, Permission[]>>;
  total: number;
  moduleCount: number;
}

/**
 * Permission action types for UI display
 */
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'manage' | 'export' | 'access';

/**
 * Extract action from permission name (e.g., "view employees" → "view")
 */
export function getPermissionAction(permissionName: string): PermissionAction {
  const action = permissionName.split(' ')[0];
  return action as PermissionAction;
}

/**
 * Extract entity from permission name (e.g., "view employees" → "employees")
 */
export function getPermissionEntity(permissionName: string): string {
  return permissionName.split(' ').slice(1).join(' ');
}

// ============================================================================
// USER TYPES
// ============================================================================

export type UserType = 'EMPLOYEE' | 'ADMIN' | 'SYSTEM' | 'EXTERNAL';

export interface User {
  id: number;
  name: string;
  email: string;
  emailVerifiedAt?: string;
  companyId?: number;
  branchId?: number;
  userType: UserType;
  themePreference?: string;
  createdAt: string;
  updatedAt: string;
  roles: string[];
  permissions: string[];
  companyName?: string;
  branchName?: string;
  accessibleCompanyIds?: number[];
  accessibleBranchIds?: number[];
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  companyId?: number;
  branchId?: number;
  userType?: UserType;
  roleIds?: number[];
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  companyId?: number;
  branchId?: number;
  userType?: UserType;
  themePreference?: string;
  roleIds?: number[];
  accessibleCompanyIds?: number[];
  accessibleBranchIds?: number[];
}

export interface ChangePasswordDto {
  newPassword: string;
}

export interface UserListQuery extends ListQueryParams {
  companyId?: number;
  branchId?: number;
  userType?: UserType;
}

export interface UserStatistics {
  total: number;
  active: number;
  admins: number;
  employees: number;
  thisMonth: number;
}

export interface ImportUserItem {
  name: string;
  email: string;
  roleName?: string;
  branchName?: string;
  isActive?: boolean;
}

export interface ImportUsersResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: { row: number; email: string; message: string }[];
  tempPasswords: Record<string, string>;
  seatsUsed: number;
  seatsMax: number;
}

export interface UserSeatInfo {
  used: number;
  max: number;
  available: number;
  planName: string;
}

// ============================================================================
// BREADCRUMB TYPES
// ============================================================================

export interface BreadcrumbItem {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: Array<{
    title: string;
    href: string;
    description?: string;
  }>;
}
