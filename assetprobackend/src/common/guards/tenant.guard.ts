import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TENANT_ONLY_KEY } from '../decorators/tenant.decorators';

/**
 * TenantGuard - Ensures route is accessed by a tenant user (not central admin)
 *
 * Use with @TenantOnly() decorator
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isTenantOnly = this.reflector.getAllAndOverride<boolean>(
      TENANT_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If not marked as tenant-only, allow access
    if (!isTenantOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user has tenant context
    if (!user || !user.tenantId) {
      throw new ForbiddenException(
        'This resource is only accessible to tenant users.',
      );
    }

    // Check user type (not central admin)
    if (user.type === 'central_admin') {
      throw new ForbiddenException(
        'Central administrators cannot access tenant-specific resources directly.',
      );
    }

    return true;
  }
}
