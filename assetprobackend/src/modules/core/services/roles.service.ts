import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { AuditService } from '../../../common/services/audit.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleListQueryDto,
  RoleResponseDto,
  RoleListResponseDto,
  AssignPermissionsToRoleDto,
  PermissionResponseDto,
  PermissionListQueryDto,
  PermissionListResponseDto,
  GroupedPermissionsResponseDto,
} from '../dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private tenantPrisma: TenantPrismaService,
    private auditService: AuditService,
  ) {}

  // ============================================================================
  // ROLES
  // ============================================================================

  /**
   * Create a new role
   */
  async create(dto: CreateRoleDto, createdById?: number): Promise<RoleResponseDto> {
    // Check if role name already exists
    const existing = await this.tenantPrisma.queryOne(
      `SELECT id FROM roles WHERE name = $1 AND "guardName" = 'web'`,
      [dto.name],
    );

    if (existing) {
      throw new ConflictException('Role name already exists');
    }

    // Create role
    const role = await this.tenantPrisma.insert('roles', {
      name: dto.name,
      guardName: 'web',
      description: dto.description,
      createdById,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Assign permissions if provided
    if (dto.permissionIds?.length) {
      await this.assignPermissions(role.id, { permissionIds: dto.permissionIds });
    }

    // Audit log
    await this.auditService.log({
      userId: createdById || role.id,
      event: 'created',
      auditableType: 'Role',
      auditableId: role.id,
      newValues: { name: role.name, description: role.description, guardName: role.guardName },
    });

    return this.findOne(role.id);
  }

  /**
   * Get all roles with pagination
   */
  async findAll(query: RoleListQueryDto): Promise<RoleListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT r.*,
             (SELECT COUNT(*) FROM user_roles ur WHERE ur."roleId" = r.id) as "userCount"
    `;

    if (query.includePermissions) {
      sql += `,
             array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permissions
      `;
    }

    sql += `
      FROM roles r
    `;

    if (query.includePermissions) {
      sql += `
        LEFT JOIN role_has_permissions rhp ON r.id = rhp."roleId"
        LEFT JOIN permissions p ON rhp."permissionId" = p.id
      `;
    }

    sql += ` WHERE r."guardName" = 'web'`;

    const params: any[] = [];
    let paramIndex = 1;

    if (query.search) {
      sql += ` AND (r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` GROUP BY r.id ORDER BY r.name ASC`;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const roles = await this.tenantPrisma.query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM roles WHERE "guardName" = 'web'`;
    const countParams: any[] = [];

    if (query.search) {
      countSql += ` AND (name ILIKE $1 OR description ILIKE $1)`;
      countParams.push(`%${query.search}%`);
    }

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(countSql, countParams);
    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: roles.map(r => this.mapRoleToResponse(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single role by ID
   */
  async findOne(id: number): Promise<RoleResponseDto> {
    const role = await this.tenantPrisma.queryOne(
      `
      SELECT r.*,
             array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permissions,
             (SELECT COUNT(*) FROM user_roles ur WHERE ur."roleId" = r.id) as "userCount"
      FROM roles r
      LEFT JOIN role_has_permissions rhp ON r.id = rhp."roleId"
      LEFT JOIN permissions p ON rhp."permissionId" = p.id
      WHERE r.id = $1
      GROUP BY r.id
      `,
      [id],
    );

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.mapRoleToResponse(role);
  }

  /**
   * Update a role
   */
  async update(id: number, dto: UpdateRoleDto, updatedById?: number): Promise<RoleResponseDto> {
    // Direct query - roles table doesn't have deletedAt
    const existing = await this.tenantPrisma.queryOne<{ id: number; name: string }>(
      `SELECT id, name FROM roles WHERE id = $1`,
      [id],
    );
    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    // Check name uniqueness if changing name
    if (dto.name && dto.name !== existing.name) {
      const nameInUse = await this.tenantPrisma.queryOne(
        `SELECT id FROM roles WHERE name = $1 AND "guardName" = 'web' AND id != $2`,
        [dto.name, id],
      );

      if (nameInUse) {
        throw new ConflictException('Role name already exists');
      }
    }

    // Update role
    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;

    // Track who updated the record
    if (updatedById) {
      updateData.updatedById = updatedById;
    }

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.update('roles', id, updateData);
    }

    // Update permissions if provided
    if (dto.permissionIds !== undefined) {
      await this.assignPermissions(id, { permissionIds: dto.permissionIds });
    }

    // Audit log
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};
    for (const key of Object.keys(updateData)) {
      if (['updatedById'].includes(key)) continue;
      oldValues[key] = existing[key];
      newValues[key] = updateData[key];
    }
    if (Object.keys(newValues).length > 0) {
      await this.auditService.log({
        userId: updatedById || id,
        event: 'updated',
        auditableType: 'Role',
        auditableId: id,
        oldValues,
        newValues,
      });
    }

    return this.findOne(id);
  }

  /**
   * Delete a role
   */
  async remove(id: number, deletedById?: number): Promise<void> {
    // Direct query - roles table doesn't have deletedAt
    const role = await this.tenantPrisma.queryOne<{ id: number; name: string; description: string }>(
      `SELECT id, name, description FROM roles WHERE id = $1`,
      [id],
    );
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if it's a system role (Super Admin, etc.)
    const systemRoles = ['Super Admin', 'System Admin'];
    if (systemRoles.includes(role.name)) {
      throw new BadRequestException('Cannot delete system roles');
    }

    // Check if role is assigned to any users
    const hasUsers = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_roles WHERE "roleId" = $1`,
      [id],
    );

    if (parseInt(hasUsers?.count || '0', 10) > 0) {
      throw new BadRequestException(
        'Cannot delete role that is assigned to users. Please remove role from users first.',
      );
    }

    // Delete role permissions
    await this.tenantPrisma.query(
      `DELETE FROM role_has_permissions WHERE "roleId" = $1`,
      [id],
    );

    // Delete role
    await this.tenantPrisma.delete('roles', id);

    // Audit log
    if (deletedById) {
      await this.auditService.log({
        userId: deletedById,
        event: 'deleted',
        auditableType: 'Role',
        auditableId: id,
        oldValues: { name: role.name, description: role.description },
      });
    }
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissions(roleId: number, dto: AssignPermissionsToRoleDto): Promise<void> {
    // Verify role exists (direct query - roles table doesn't have deletedAt)
    const role = await this.tenantPrisma.queryOne(
      `SELECT id FROM roles WHERE id = $1`,
      [roleId],
    );
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Delete existing permissions
    await this.tenantPrisma.query(
      `DELETE FROM role_has_permissions WHERE "roleId" = $1`,
      [roleId],
    );

    // Insert new permissions
    for (const permissionId of dto.permissionIds) {
      await this.tenantPrisma.query(
        `INSERT INTO role_has_permissions ("roleId", "permissionId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roleId, permissionId],
      );
    }
  }

  /**
   * Get role's permissions
   */
  async getRolePermissions(roleId: number): Promise<PermissionResponseDto[]> {
    const permissions = await this.tenantPrisma.query(
      `
      SELECT p.*
      FROM role_has_permissions rhp
      JOIN permissions p ON rhp."permissionId" = p.id
      WHERE rhp."roleId" = $1
      ORDER BY p.module, p.name
      `,
      [roleId],
    );

    return permissions.map(p => this.mapPermissionToResponse(p));
  }

  // ============================================================================
  // PERMISSIONS
  // ============================================================================

  /**
   * Get all permissions
   */
  async findAllPermissions(query: PermissionListQueryDto): Promise<PermissionListResponseDto | GroupedPermissionsResponseDto> {
    let sql = `SELECT * FROM permissions WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (query.module) {
      sql += ` AND module = $${paramIndex++}`;
      params.push(query.module);
    }

    if (query.search) {
      sql += ` AND name ILIKE $${paramIndex}`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY module, name`;

    const permissions = await this.tenantPrisma.query(sql, params);

    // Group by module if requested (default behavior)
    if (query.groupByModule !== false) {
      const grouped: Record<string, Record<string, PermissionResponseDto[]>> = {};

      for (const p of permissions) {
        const module = p.module || 'Other';
        const category = this.extractCategoryFromPermission(p.name);

        if (!grouped[module]) {
          grouped[module] = {};
        }
        if (!grouped[module][category]) {
          grouped[module][category] = [];
        }
        grouped[module][category].push(this.mapPermissionToResponse(p));
      }

      return {
        data: grouped,
        total: permissions.length,
        moduleCount: Object.keys(grouped).length,
      };
    }

    return {
      data: permissions.map(p => this.mapPermissionToResponse(p)),
      total: permissions.length,
    };
  }

  /**
   * Extract category from permission name
   * e.g., "view employees" → "Employees"
   * e.g., "approve bank-transfers" → "Bank Transfers"
   * e.g., "access Core module" → "Module Access"
   */
  private extractCategoryFromPermission(permissionName: string): string {
    // Handle "access X module" permissions
    if (permissionName.startsWith('access ') && permissionName.endsWith(' module')) {
      return 'Module Access';
    }

    // Split by space and get everything after the action
    const parts = permissionName.split(' ');
    if (parts.length < 2) {
      return 'General';
    }

    // Get entity (everything after the action word)
    const entity = parts.slice(1).join(' ');

    // Convert kebab-case to Title Case
    return entity
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get permission by ID
   */
  async findOnePermission(id: number): Promise<PermissionResponseDto> {
    const permission = await this.tenantPrisma.findById('permissions', id);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    return this.mapPermissionToResponse(permission);
  }

  /**
   * Get all unique permission modules
   */
  async getPermissionModules(): Promise<string[]> {
    const modules = await this.tenantPrisma.query<{ module: string }>(
      `SELECT DISTINCT module FROM permissions WHERE module IS NOT NULL ORDER BY module`,
      [],
    );

    return modules.map(m => m.module);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private mapRoleToResponse(role: any): RoleResponseDto {
    const SYSTEM_ROLES = ['Super Admin', 'System Admin'];
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      guardName: role.guardName,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions || [],
      userCount: parseInt(role.userCount || '0', 10),
      isSystem: SYSTEM_ROLES.includes(role.name),
    };
  }

  private mapPermissionToResponse(permission: any): PermissionResponseDto {
    return {
      id: permission.id,
      name: permission.name,
      module: permission.module,
      guardName: permission.guardName,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }
}
