import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

/**
 * TenantContext interface - Available in request after auth
 */
export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  schemaName: string;
  companyId?: number;
  companyName?: string;
}

/**
 * CurrentTenant decorator - Extract tenant context from request
 *
 * @example
 * ```typescript
 * @Get('dashboard')
 * getDashboard(@CurrentTenant() tenant: TenantContext) {
 *   console.log(tenant.tenantSlug);
 * }
 * ```
 */
export const CurrentTenant = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext): TenantContext | string | number | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      return undefined;
    }

    const tenant: TenantContext = {
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      tenantName: user.tenantName,
      schemaName: `tenant_${user.tenantSlug?.replace(/[^a-z0-9]/gi, '_')}`,
      companyId: user.companyId,
      companyName: user.companyName,
    };

    return data ? tenant[data] : tenant;
  },
);

/**
 * Metadata key for tenant-only routes
 */
export const TENANT_ONLY_KEY = 'tenant_only';

/**
 * TenantOnly decorator - Mark route as tenant-only (not for central admin)
 *
 * @example
 * ```typescript
 * @TenantOnly()
 * @Get('my-company')
 * getMyCompany() {}
 * ```
 */
export const TenantOnly = () => SetMetadata(TENANT_ONLY_KEY, true);

/**
 * CompanyId decorator - Extract company ID from request
 */
export const CompanyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.companyId;
  },
);

/**
 * TenantId decorator - Extract tenant ID from request
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId;
  },
);

/**
 * SchemaName decorator - Extract schema name from request
 */
export const SchemaName = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const tenantSlug = request.user?.tenantSlug;
    return tenantSlug ? `tenant_${tenantSlug.replace(/[^a-z0-9]/gi, '_')}` : undefined;
  },
);

/**
 * BranchId decorator - Extract branch ID from request
 */
export const BranchId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.branchId;
  },
);
