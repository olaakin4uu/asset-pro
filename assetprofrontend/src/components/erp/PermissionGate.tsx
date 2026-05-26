'use client';

import { usePermission, useEntityPermissions } from '@/hooks/usePermission';
import { AccessDenied } from './AccessDenied';
import type { PermissionAction } from '@/types/auth';

// ============================================================================
// PERMISSION GATE (single permission string)
// ============================================================================

interface PermissionGateProps {
  /** The full permission string e.g. "create employees" */
  permission: string;
  /** What to render when the user has the permission */
  children: React.ReactNode;
  /** Override the AccessDenied action description */
  action?: string;
  /** Render inline AccessDenied instead of full-page */
  inline?: boolean;
  /** Render null instead of AccessDenied when denied (silent gate) */
  silent?: boolean;
}

/**
 * PermissionGate — wrap any content that requires a specific permission.
 * Shows an AccessDenied UI when the user lacks the permission.
 *
 * Usage:
 *   <PermissionGate permission="create employees">
 *     <CreateEmployeeForm />
 *   </PermissionGate>
 *
 * Silent (hides without any message):
 *   <PermissionGate permission="delete employees" silent>
 *     <DeleteButton />
 *   </PermissionGate>
 */
export function PermissionGate({
  permission,
  children,
  action,
  inline = false,
  silent = false,
}: PermissionGateProps) {
  const hasPermission = usePermission(permission);

  if (!hasPermission) {
    if (silent) return null;
    return <AccessDenied action={action ?? permission} inline={inline} />;
  }

  return <>{children}</>;
}

// ============================================================================
// ENTITY PERMISSION GATE (module + entity + action)
// ============================================================================

interface EntityPermissionGateProps {
  module: string;
  entity: string;
  action: PermissionAction;
  children: React.ReactNode;
  inline?: boolean;
  silent?: boolean;
}

/**
 * EntityPermissionGate — gate based on module + entity + action.
 * Matches the same format as useEntityPermissions().
 *
 * Usage:
 *   <EntityPermissionGate module="hrpayroll" entity="employees" action="create">
 *     <CreateEmployeeForm />
 *   </EntityPermissionGate>
 */
export function EntityPermissionGate({
  module,
  entity,
  action,
  children,
  inline = false,
  silent = false,
}: EntityPermissionGateProps) {
  const perms = useEntityPermissions(module, entity);

  const hasPermission =
    action === 'view'    ? perms.canView   :
    action === 'create'  ? perms.canCreate :
    action === 'edit'    ? perms.canEdit   :
    action === 'delete'  ? perms.canDelete :
    action === 'approve' ? perms.canApprove :
    action === 'export'  ? perms.canExport  :
    action === 'manage'  ? perms.canManage  :
    false;

  if (!hasPermission) {
    if (silent) return null;
    return (
      <AccessDenied
        action={`${action} ${entity}`}
        inline={inline}
      />
    );
  }

  return <>{children}</>;
}
