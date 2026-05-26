import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * PermissionsGuard - Checks if the authenticated user has the required permissions.
 *
 * Loads permissions from the tenant database by:
 * 1. Getting role-based permissions via role_has_permissions + user_roles
 * 2. Getting direct user permissions via user_permissions
 * 3. Unioning both sets
 *
 * Bypasses:
 * - Users with role name 'Super Admin' bypass all checks
 * - Users with 'manage all records' permission bypass all checks
 *
 * Results are cached on the request object to avoid repeated queries
 * within the same request lifecycle.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, PermissionsGuard)
 *   @RequirePermission('view employees', 'manage employees')
 *   @Get()
 *   findAll() { ... }
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private static pool: Pool;
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    if (!PermissionsGuard.pool) {
      PermissionsGuard.pool = new Pool({
        connectionString: this.configService.get('DATABASE_URL'),
        max: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('Authentication required.');
    }

    // Super Admin role bypasses all permission checks
    if (user.role === 'Super Admin') {
      return true;
    }

    // Determine tenant schema
    const tenantSlug = user.tenantSlug;
    if (!tenantSlug) {
      throw new ForbiddenException(
        'Tenant context required for permission checks.',
      );
    }

    const schemaName = `tenant_${tenantSlug.replace(/[^a-z0-9]/gi, '_')}`;

    // Load permissions (cached on request)
    const userPermissions = await this.loadUserPermissions(
      request,
      user.id,
      schemaName,
    );

    // 'manage all records' grants access to everything
    if (userPermissions.has('manage all records')) {
      return true;
    }

    // Check if user has ANY of the required permissions
    const hasPermission = requiredPermissions.some((perm) =>
      userPermissions.has(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(' or ')}`,
      );
    }

    return true;
  }

  /**
   * Load the user's permissions from the tenant database.
   * Caches results on request._userPermissions to avoid re-querying.
   */
  private async loadUserPermissions(
    request: Record<string, unknown>,
    userId: number,
    schemaName: string,
  ): Promise<Set<string>> {
    // Return cached permissions if already loaded in this request
    if (request._userPermissions instanceof Set) {
      return request._userPermissions as Set<string>;
    }

    const client = await PermissionsGuard.pool.connect();
    try {
      await client.query(`SET search_path TO "${schemaName}"`);

      // Check if user has Super Admin role (by role name in DB)
      const roleCheck = await client.query(
        `SELECT r.name FROM roles r
         JOIN user_roles ur ON r.id = ur."roleId"
         WHERE ur."userId" = $1 AND r.name = 'Super Admin'
         LIMIT 1`,
        [userId],
      );

      if (roleCheck.rows.length > 0) {
        // Super Admin in DB - grant all permissions
        const allPermsResult = await client.query(
          `SELECT name FROM permissions`,
        );
        const allPerms = new Set<string>(
          allPermsResult.rows.map((r: { name: string }) => r.name),
        );
        request._userPermissions = allPerms;
        return allPerms;
      }

      // Load permissions from roles + direct user permissions
      const result = await client.query(
        `SELECT p.name
         FROM permissions p
         JOIN role_has_permissions rp ON p.id = rp."permissionId"
         JOIN user_roles ur ON rp."roleId" = ur."roleId"
         WHERE ur."userId" = $1
         UNION
         SELECT p.name
         FROM permissions p
         JOIN user_permissions up ON p.id = up."permissionId"
         WHERE up."userId" = $1`,
        [userId],
      );

      const permissions = new Set<string>(
        result.rows.map((r: { name: string }) => r.name),
      );

      // Cache on request
      request._userPermissions = permissions;

      return permissions;
    } catch (error) {
      this.logger.error(
        `Failed to load permissions for user ${userId} in schema ${schemaName}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ForbiddenException('Failed to verify permissions.');
    } finally {
      client.release();
    }
  }
}
