import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT_KEY = 'skip_audit';
export const AUDIT_RESOURCE_KEY = 'audit_resource';

/**
 * @SkipAudit() - Mark a controller or handler as exempt from the global audit interceptor.
 *
 * Use on:
 * - Auth endpoints (login, logout, refresh, password reset)
 * - Token endpoints (JWT refresh)
 * - Bulk/sync endpoints that would flood the audits table
 * - Health/heartbeat endpoints
 * - The audit-logs endpoints themselves (prevent loops)
 */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);

/**
 * @AuditResource('InventoryItem') - Override the auditable type name for a route/controller.
 *
 * By default the interceptor derives the resource from the URL path.
 * Use this decorator when the URL doesn't clearly identify the entity
 * (e.g. sub-routes, actions like /approve, /post).
 */
export const AuditResource = (resourceName: string) =>
  SetMetadata(AUDIT_RESOURCE_KEY, resourceName);
