import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { PermissionAction, buildPermission } from '@/types/auth';

/**
 * Check if the current user has a specific permission
 */
export function usePermission(permission: string): boolean {
  const user = useAuthStore((state) => state.user);

  // Not logged in — allow (middleware/layout will redirect)
  if (!user) return true;

  // Logged in but permissions not yet loaded — allow temporarily
  if (user.permissions === undefined || user.permissions === null) return true;

  return user.permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function useAnyPermission(permissions: string[]): boolean {
  const user = useAuthStore((state) => state.user);

  if (!user) return true;
  if (user.permissions === undefined || user.permissions === null) return true;

  return permissions.some(p => user.permissions!.includes(p));
}

/**
 * Check if user has all of the specified permissions
 */
export function useAllPermissions(permissions: string[]): boolean {
  const user = useAuthStore((state) => state.user);

  if (!user) return true;
  if (user.permissions === undefined || user.permissions === null) return true;

  return permissions.every(p => user.permissions!.includes(p));
}

/**
 * Get all permissions for a specific module/entity
 * Returns an object with boolean flags for each action
 */
export function useEntityPermissions(module: string, entity: string) {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions;

  // Allow all only when user is not yet authenticated (no user object)
  // or when permissions haven't been loaded into the user object yet
  const allowAll = !user || permissions === undefined || permissions === null;

  const checkPermission = (action: PermissionAction): boolean => {
    if (allowAll) return true;
    return permissions!.includes(buildPermission(action, module, entity));
  };

  return {
    canView: checkPermission('view'),
    canCreate: checkPermission('create'),
    canEdit: checkPermission('edit'),
    canDelete: checkPermission('delete'),
    canApprove: checkPermission('approve'),
    canExport: checkPermission('export'),
    canManage: checkPermission('manage'),
  };
}

/**
 * Shorthand hooks for common permission checks
 */
export function useCanView(module: string, entity: string): boolean {
  return usePermission(buildPermission('view', module, entity));
}

export function useCanCreate(module: string, entity: string): boolean {
  return usePermission(buildPermission('create', module, entity));
}

export function useCanEdit(module: string, entity: string): boolean {
  return usePermission(buildPermission('edit', module, entity));
}

export function useCanDelete(module: string, entity: string): boolean {
  return usePermission(buildPermission('delete', module, entity));
}

export function useCanApprove(module: string, entity: string): boolean {
  return usePermission(buildPermission('approve', module, entity));
}

/**
 * Check if user has a specific role.
 * Checks both authStore (central admin) and tenantStore (tenant users).
 */
export function useHasRole(role: string): boolean {
  const authUser = useAuthStore((state) => state.user);
  const tenantUser = useTenantStore((state) => state.user);

  const normalizedRole = role.toLowerCase();

  // Check authStore user
  if (authUser) {
    if (authUser.role?.toLowerCase() === normalizedRole) return true;
    if (authUser.roles?.some(r => r.toLowerCase() === normalizedRole)) return true;
  }

  // Check tenantStore user
  if (tenantUser) {
    if (tenantUser.role?.toLowerCase() === normalizedRole) return true;
  }

  return false;
}

/**
 * Check if user has any of the specified roles.
 * Case-insensitive. Checks both authStore and tenantStore.
 */
export function useHasAnyRole(roles: string[]): boolean {
  const authUser = useAuthStore((state) => state.user);
  const tenantUser = useTenantStore((state) => state.user);

  const normalizedRoles = roles.map(r => r.toLowerCase());

  // Check authStore user
  if (authUser) {
    if (normalizedRoles.includes(authUser.role?.toLowerCase())) return true;
    if (authUser.roles?.some(r => normalizedRoles.includes(r.toLowerCase()))) return true;
  }

  // Check tenantStore user
  if (tenantUser) {
    if (normalizedRoles.includes(tenantUser.role?.toLowerCase())) return true;
  }

  return false;
}

/**
 * Check if user is a super admin
 */
export function useIsSuperAdmin(): boolean {
  return useHasAnyRole(['super admin', 'super-admin', 'superadmin']);
}
