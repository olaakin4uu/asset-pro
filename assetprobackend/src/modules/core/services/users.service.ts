import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../common/services/audit.service';
import { EmailService } from '../../../common/services/email.service';
import { ConfigService } from '@nestjs/config';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangeUserPasswordDto,
  UserListQueryDto,
  UserResponseDto,
  UserListResponseDto,
  AssignRolesDto,
  ImportUsersDto,
} from '../dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private tenantPrisma: TenantPrismaService,
    private prisma: PrismaService,
    private auditService: AuditService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  /**
   * Create a new user
   */
  async create(dto: CreateUserDto, createdById?: number): Promise<UserResponseDto> {
    // Check if email already exists
    const existing = await this.tenantPrisma.queryOne(
      `SELECT id FROM users WHERE email = $1 AND "deletedAt" IS NULL`,
      [dto.email],
    );

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.tenantPrisma.insert('users', {
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      companyId: dto.companyId,
      branchId: dto.branchId,
      userType: dto.userType || 'EMPLOYEE',
      createdById,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Assign roles if provided
    if (dto.roleIds?.length) {
      await this.assignRoles(user.id, { roleIds: dto.roleIds });
    }

    // Auto-create linked employee record for EMPLOYEE type users
    const userType = (dto.userType || 'EMPLOYEE').toUpperCase();
    if (userType === 'EMPLOYEE' && dto.companyId) {
      await this.createLinkedEmployeeRecord(user.id, user.name, dto.companyId);
    }

    // Audit log
    await this.auditService.log({
      userId: createdById || user.id,
      event: 'created',
      auditableType: 'User',
      auditableId: user.id,
      newValues: { name: user.name, email: user.email, userType: user.userType },
    });

    return this.mapToResponse(user);
  }

  /**
   * Auto-create a minimal employee record when a user is of type EMPLOYEE.
   * Non-blocking: failures are logged but do not fail user creation.
   */
  private async createLinkedEmployeeRecord(userId: number, userName: string, companyId: number): Promise<void> {
    try {
      // Generate a unique employee code based on userId
      const employeeCode = `USR${String(userId).padStart(5, '0')}`;

      // Skip if code already exists (idempotent)
      const codeExists = await this.tenantPrisma.queryOne(
        `SELECT id FROM employees WHERE "companyId" = $1 AND "employeeCode" = $2 AND "deletedAt" IS NULL`,
        [companyId, employeeCode],
      );
      if (codeExists) return;

      // Split display name into first/last
      const parts = userName.trim().split(/\s+/);
      const firstName = parts[0] ?? 'User';
      const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'Employee';
      const fullName = [firstName, lastName].join(' ');

      // Insert minimal employee record
      const employee = await this.tenantPrisma.insert('employees', {
        companyId,
        employeeCode,
        firstName,
        lastName,
        userId,        // legacy FK (Employee.userId → User.id)
        isUser: true,
        isActive: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Link User.employeeId → Employee.id (new pattern)
      await this.tenantPrisma.update('users', userId, { employeeId: employee.id });
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to create linked employee for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Get all users with pagination and filters
   */
  async findAll(query: UserListQueryDto): Promise<UserListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT u.*,
             array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
      FROM users u
      LEFT JOIN user_roles mhr ON u.id = mhr."userId"
      LEFT JOIN roles r ON mhr."roleId" = r.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (!query.includeDeleted) {
      sql += ` AND u."deletedAt" IS NULL`;
    }

    if (query.companyId) {
      sql += ` AND u."companyId" = $${paramIndex++}`;
      params.push(query.companyId);
    }

    if (query.branchId) {
      sql += ` AND u."branchId" = $${paramIndex++}`;
      params.push(query.branchId);
    }

    if (query.userType) {
      sql += ` AND u."userType" = $${paramIndex++}`;
      params.push(query.userType);
    }

    if (query.search) {
      sql += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` GROUP BY u.id ORDER BY u."createdAt" DESC`;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const users = await this.tenantPrisma.query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(DISTINCT u.id) as count FROM users u WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (!query.includeDeleted) {
      countSql += ` AND u."deletedAt" IS NULL`;
    }

    if (query.companyId) {
      countSql += ` AND u."companyId" = $${countParamIndex++}`;
      countParams.push(query.companyId);
    }

    if (query.branchId) {
      countSql += ` AND u."branchId" = $${countParamIndex++}`;
      countParams.push(query.branchId);
    }

    if (query.userType) {
      countSql += ` AND u."userType" = $${countParamIndex++}`;
      countParams.push(query.userType);
    }

    if (query.search) {
      countSql += ` AND (u.name ILIKE $${countParamIndex} OR u.email ILIKE $${countParamIndex})`;
      countParams.push(`%${query.search}%`);
    }

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(countSql, countParams);
    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: users.map(u => this.mapToResponse(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single user by ID
   */
  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.tenantPrisma.queryOne(
      `
      SELECT u.*,
             array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles,
             array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permissions
      FROM users u
      LEFT JOIN user_roles mhr ON u.id = mhr."userId"
      LEFT JOIN roles r ON mhr."roleId" = r.id
      LEFT JOIN role_has_permissions rhp ON r.id = rhp."roleId"
      LEFT JOIN permissions p ON rhp."permissionId" = p.id
      WHERE u.id = $1 AND u."deletedAt" IS NULL
      GROUP BY u.id
      `,
      [id],
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [companyAccess, branchAccess] = await Promise.all([
      this.tenantPrisma.query<{ companyId: number }>(
        `SELECT "companyId" FROM user_company_access WHERE "userId" = $1`,
        [id],
      ),
      this.tenantPrisma.query<{ branchId: number }>(
        `SELECT "branchId" FROM user_branch_access WHERE "userId" = $1`,
        [id],
      ),
    ]);

    user.accessibleCompanyIds = companyAccess.map((r) => r.companyId);
    user.accessibleBranchIds  = branchAccess.map((r) => r.branchId);

    return this.mapToResponse(user);
  }

  /**
   * Update a user
   */
  async update(id: number, dto: UpdateUserDto, updatedById?: number): Promise<UserResponseDto> {
    // Check if user exists
    const existing = await this.tenantPrisma.findById('users', id);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    // Check email uniqueness if changing email
    if (dto.email && dto.email !== existing.email) {
      const emailInUse = await this.tenantPrisma.queryOne(
        `SELECT id FROM users WHERE email = $1 AND id != $2 AND "deletedAt" IS NULL`,
        [dto.email, id],
      );

      if (emailInUse) {
        throw new ConflictException('Email already in use');
      }
    }

    // Update user
    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.companyId !== undefined) updateData.companyId = dto.companyId;
    if (dto.branchId !== undefined) updateData.branchId = dto.branchId;
    if (dto.userType !== undefined) updateData.userType = dto.userType;
    if (dto.themePreference !== undefined) updateData.themePreference = dto.themePreference;

    // Track who updated the record
    if (updatedById) {
      updateData.updatedById = updatedById;
    }

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.update('users', id, updateData);
    }

    // Update roles if provided
    if (dto.roleIds !== undefined) {
      await this.assignRoles(id, { roleIds: dto.roleIds });
    }

    // Sync company access
    if (dto.accessibleCompanyIds !== undefined) {
      await this.tenantPrisma.query(
        `DELETE FROM user_company_access WHERE "userId" = $1`,
        [id],
      );
      if (dto.accessibleCompanyIds.length > 0) {
        const values = dto.accessibleCompanyIds
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ');
        await this.tenantPrisma.query(
          `INSERT INTO user_company_access ("userId", "companyId") VALUES ${values} ON CONFLICT DO NOTHING`,
          [id, ...dto.accessibleCompanyIds],
        );
      }
    }

    // Sync branch access
    if (dto.accessibleBranchIds !== undefined) {
      await this.tenantPrisma.query(
        `DELETE FROM user_branch_access WHERE "userId" = $1`,
        [id],
      );
      if (dto.accessibleBranchIds.length > 0) {
        const values = dto.accessibleBranchIds
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ');
        await this.tenantPrisma.query(
          `INSERT INTO user_branch_access ("userId", "branchId") VALUES ${values} ON CONFLICT DO NOTHING`,
          [id, ...dto.accessibleBranchIds],
        );
      }
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
        auditableType: 'User',
        auditableId: id,
        oldValues,
        newValues,
      });
    }

    return this.findOne(id);
  }

  /**
   * Change user's password
   */
  async changePassword(id: number, dto: ChangeUserPasswordDto): Promise<void> {
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    const result = await this.tenantPrisma.update('users', id, {
      password: passwordHash,
    });

    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Soft delete a user
   */
  async remove(id: number, deletedById?: number): Promise<void> {
    const existing = await this.tenantPrisma.findById('users', id);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const result = await this.tenantPrisma.softDelete('users', id);
    if (!result) {
      throw new NotFoundException('User not found');
    }

    // Audit log
    await this.auditService.log({
      userId: deletedById || id,
      event: 'deleted',
      auditableType: 'User',
      auditableId: id,
      oldValues: { name: existing.name, email: existing.email, userType: existing.userType },
    });
  }

  /**
   * Assign roles to a user
   */
  async assignRoles(userId: number, dto: AssignRolesDto): Promise<void> {
    // Verify user exists
    const user = await this.tenantPrisma.findById('users', userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete existing role assignments
    await this.tenantPrisma.query(
      `DELETE FROM user_roles WHERE "userId" = $1`,
      [userId],
    );

    // Insert new role assignments
    for (const roleId of dto.roleIds) {
      await this.tenantPrisma.query(
        `INSERT INTO user_roles ("userId", "roleId", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT DO NOTHING`,
        [userId, roleId],
      );
    }
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: number): Promise<string[]> {
    const roles = await this.tenantPrisma.query<{ name: string }>(
      `
      SELECT r.name
      FROM user_roles mhr
      JOIN roles r ON mhr."roleId" = r.id
      WHERE mhr."userId" = $1
      `,
      [userId],
    );

    return roles.map(r => r.name);
  }

  /**
   * Get user's permissions (combined from roles)
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    const permissions = await this.tenantPrisma.query<{ name: string }>(
      `
      SELECT DISTINCT p.name
      FROM user_roles mhr
      JOIN role_has_permissions rhp ON mhr."roleId" = rhp."roleId"
      JOIN permissions p ON rhp."permissionId" = p.id
      WHERE mhr."userId" = $1
      `,
      [userId],
    );

    return permissions.map(p => p.name);
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: number, permission: string): Promise<boolean> {
    const result = await this.tenantPrisma.queryOne<{ exists: boolean }>(
      `
      SELECT EXISTS(
        SELECT 1
        FROM user_roles mhr
        JOIN role_has_permissions rhp ON mhr."roleId" = rhp."roleId"
        JOIN permissions p ON rhp."permissionId" = p.id
        WHERE mhr."userId" = $1 AND p.name = $2
      ) as exists
      `,
      [userId, permission],
    );

    return result?.exists || false;
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(userId: number, role: string): Promise<boolean> {
    const result = await this.tenantPrisma.queryOne<{ exists: boolean }>(
      `
      SELECT EXISTS(
        SELECT 1
        FROM user_roles mhr
        JOIN roles r ON mhr."roleId" = r.id
        WHERE mhr."userId" = $1 AND r.name = $2
      ) as exists
      `,
      [userId, role],
    );

    return result?.exists || false;
  }

  /**
   * Get seat usage info for a tenant
   */
  async getSeatInfo(tenantId: string): Promise<{ used: number; max: number; available: number; planName: string }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    const maxUsers = subscription?.plan?.maxUsers ?? 5;
    const planName = subscription?.plan?.name ?? 'Trial';

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM users WHERE "userType" = 'EMPLOYEE' AND "deletedAt" IS NULL`,
      [],
    );
    const used = parseInt(countResult?.count || '0', 10);

    return { used, max: maxUsers, available: Math.max(0, maxUsers - used), planName };
  }

  /**
   * Get import template definition
   */
  getUserImportTemplate(): { headers: string[]; sampleRows: string[][]; notes: Record<string, string> } {
    return {
      headers: ['name', 'email', 'roleName', 'branchName', 'isActive'],
      sampleRows: [
        ['Akin Johnson', 'akin@company.com', 'Admin', 'Head Office', 'true'],
        ['Bola Adeyemi', 'bola@company.com', 'Accountant', 'Lagos Branch', 'true'],
        ['Chidi Okonkwo', 'chidi@company.com', 'Sales Manager', 'Abuja Branch', 'true'],
        ['Dupe Adekunle', 'dupe@company.com', 'HR Officer', '', 'true'],
        ['Emeka Nwachukwu', 'emeka@company.com', 'Inventory Officer', 'Head Office', 'true'],
      ],
      notes: {
        name: 'Full name (2-100 chars, required)',
        email: 'Login email address — must be unique (required)',
        roleName: 'Must match an existing role name exactly, e.g. "Admin", "Accountant" (optional)',
        branchName: 'Must match an existing branch name exactly, e.g. "Head Office" (optional)',
        isActive: 'true or false (default: true)',
      },
    };
  }

  /**
   * Bulk import users
   */
  async importUsers(
    tenantId: string,
    dto: ImportUsersDto,
    importedById: number,
    importerCompanyId?: number,
  ): Promise<{
    imported: number;
    updated: number;
    skipped: number;
    errors: { row: number; email: string; message: string }[];
    tempPasswords: Record<string, string>;
    seatsUsed: number;
    seatsMax: number;
  }> {
    const importMode = dto.importMode ?? 'skip';
    const passwordMode = dto.passwordMode ?? 'temp_password';

    if (passwordMode === 'default_password' && !dto.defaultPassword) {
      throw new BadRequestException('defaultPassword is required when passwordMode is default_password');
    }

    // Check seat limit
    const seatInfo = await this.getSeatInfo(tenantId);
    const newUsersCount = dto.users.filter(u => u.isActive !== false).length;
    if (importMode === 'skip' || importMode === 'overwrite') {
      // Only new emails will consume seats — calculate after dedup
      // We'll check per-row to be precise
    }

    // Load all existing emails → Map<email, userId>
    const existingUsers = await this.tenantPrisma.query<{ id: number; email: string; deletedAt: Date | null }>(
      `SELECT id, email, "deletedAt" FROM users WHERE "deletedAt" IS NULL`,
      [],
    );
    const existingMap = new Map(existingUsers.map(u => [u.email.toLowerCase(), u.id]));

    // Overwrite mode: hard-delete all existing users except the importing user, then insert fresh
    if (importMode === 'overwrite') {
      try {
        await this.tenantPrisma.query(
          `DELETE FROM users WHERE "deletedAt" IS NULL AND id != $1`,
          [importedById],
        );
      } catch (err: any) {
        if (err?.code === '23503' || err?.message?.includes('foreign key constraint')) {
          throw new BadRequestException(
            'Cannot overwrite users: some users have dependent records (e.g. created entities). Remove dependent data first or use \'update\' mode instead.',
          );
        }
        throw err;
      }
      existingMap.clear();
    }

    // Load all roles → Map<name (lowercase), id>
    const allRoles = await this.tenantPrisma.query<{ id: number; name: string }>(
      `SELECT id, name FROM roles`,
      [],
    );
    const roleMap = new Map(allRoles.map(r => [r.name.toLowerCase(), r.id]));

    // Load all branches → Map<name (lowercase), id>
    const allBranches = await this.tenantPrisma.query<{ id: number; name: string }>(
      `SELECT id, name FROM branches WHERE "isActive" = true`,
      [],
    );
    const branchMap = new Map(allBranches.map(b => [b.name.toLowerCase(), b.id]));

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: { row: number; email: string; message: string }[] = [];
    const tempPasswords: Record<string, string> = {};
    let seatsConsumed = 0;

    for (let i = 0; i < dto.users.length; i++) {
      const item = dto.users[i];
      const row = i + 1;
      const emailLower = item.email.toLowerCase();

      try {
        // Resolve role and branch IDs
        const roleId = item.roleName ? roleMap.get(item.roleName.toLowerCase()) : undefined;
        if (item.roleName && !roleId) {
          errors.push({ row, email: item.email, message: `Role "${item.roleName}" not found` });
          continue;
        }

        const branchId = item.branchName ? branchMap.get(item.branchName.toLowerCase()) : undefined;
        if (item.branchName && !branchId) {
          errors.push({ row, email: item.email, message: `Branch "${item.branchName}" not found` });
          continue;
        }

        const existingId = existingMap.get(emailLower);

        if (existingId) {
          // Email already exists
          if (importMode === 'skip') {
            skipped++;
            continue;
          }

          // update or overwrite — update name, branchId, (overwrite also reactivates)
          const updateData: Record<string, unknown> = {
            name: item.name,
            branchId: branchId ?? null,
            updatedById: importedById,
            updatedAt: new Date(),
          };
          if (importMode === 'overwrite' && item.isActive === false) {
            updateData.deletedAt = new Date();
          }
          await this.tenantPrisma.update('users', existingId, updateData);

          // Update role
          if (roleId !== undefined) {
            await this.tenantPrisma.query(`DELETE FROM user_roles WHERE "userId" = $1`, [existingId]);
            await this.tenantPrisma.query(
              `INSERT INTO user_roles ("userId", "roleId", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT DO NOTHING`,
              [existingId, roleId],
            );
          }

          updated++;
        } else {
          // New user — check seat limit
          if (item.isActive !== false) {
            if (seatInfo.used + seatsConsumed + 1 > seatInfo.max) {
              errors.push({ row, email: item.email, message: `Seat limit reached (${seatInfo.max} users max). Upgrade your plan to add more users.` });
              continue;
            }
            seatsConsumed++;
          }

          // Generate or use password
          let plainPassword: string;
          if (passwordMode === 'temp_password') {
            plainPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + '!';
          } else {
            plainPassword = dto.defaultPassword!;
          }
          const passwordHash = await bcrypt.hash(plainPassword, 12);

          const newUser = await this.tenantPrisma.insert('users', {
            name: item.name,
            email: item.email,
            password: passwordHash,
            branchId: branchId ?? null,
            userType: 'EMPLOYEE',
            createdById: importedById,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          if (roleId !== undefined) {
            await this.tenantPrisma.query(
              `INSERT INTO user_roles ("userId", "roleId", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT DO NOTHING`,
              [newUser.id, roleId],
            );
          }

          // Auto-create linked employee record if importer has a company context
          if (importerCompanyId) {
            await this.createLinkedEmployeeRecord(newUser.id, item.name, importerCompanyId);
          }

          if (passwordMode === 'temp_password') {
            tempPasswords[item.email] = plainPassword;
          }

          imported++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ row, email: item.email, message });
      }
    }

    return {
      imported,
      updated,
      skipped,
      errors,
      tempPasswords,
      seatsUsed: seatInfo.used + imported,
      seatsMax: seatInfo.max,
    };
  }

  /**
   * Map database row to response DTO
   */
  // ============================================================
  // INVITE FLOW
  // ============================================================

  async inviteUser(
    dto: { email: string; name: string; userType?: string; companyId: number; branchId?: number },
    invitedById: number,
    tenantSlug: string,
    _baseUrl: string,
  ): Promise<{ message: string }> {
    const appDomain = this.configService.get<string>('APP_DOMAIN', 'bizphere.com.ng');
    const baseUrl = `https://${tenantSlug}.${appDomain}`;
    const existing = await this.tenantPrisma.queryOne<{ id: number; inviteToken: string | null }>(
      `SELECT id, "inviteToken" FROM users WHERE email = $1 AND "deletedAt" IS NULL`,
      [dto.email],
    );
    if (existing && !existing.inviteToken) {
      throw new ConflictException('A user with this email already has an active account');
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const tempPassword = randomUUID(); // placeholder — will be replaced on accept

    if (existing) {
      // Re-invite: refresh token
      await this.tenantPrisma.query(
        `UPDATE users SET "inviteToken" = $1, "inviteExpiresAt" = $2, "updatedAt" = NOW() WHERE id = $3`,
        [token, expiresAt, existing.id],
      );
    } else {
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      await this.tenantPrisma.query(
        `INSERT INTO users (name, email, password, "userType", "companyId", "branchId", "inviteToken", "inviteExpiresAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          dto.name,
          dto.email,
          passwordHash,
          dto.userType ?? 'EMPLOYEE',
          dto.companyId,
          dto.branchId ?? null,
          token,
          expiresAt,
        ],
      );
    }

    const inviter = await this.tenantPrisma.queryOne<{ name: string }>(
      `SELECT name FROM users WHERE id = $1`,
      [invitedById],
    );
    const company = await this.tenantPrisma.queryOne<{ name: string }>(
      `SELECT name FROM companies WHERE id = $1`,
      [dto.companyId],
    );

    const inviteUrl = `${baseUrl}/accept-invite?token=${token}&slug=${tenantSlug}`;

    await this.emailService.sendInvite({
      to: dto.email,
      name: dto.name,
      inviteUrl,
      invitedBy: inviter?.name ?? 'Admin',
      companyName: company?.name ?? 'Your Company',
      expiresIn: '48 hours',
    });

    this.logger.log(`Invite sent to ${dto.email} by user ${invitedById}`);
    return { message: `Invitation sent to ${dto.email}` };
  }

  /**
   * Tenant-wide employee lookup for comboboxes in non-HR modules (bank auth, approvals, etc.).
   * No module or permission gate — returns minimal fields only.
   */
  async employeeLookup(): Promise<{ id: number; fullName: string; employeeCode: string; companyId: number }[]> {
    return this.tenantPrisma.query<{ id: number; fullName: string; employeeCode: string; companyId: number }>(
      `SELECT id,
              "companyId",
              TRIM(CONCAT("firstName", ' ', COALESCE("lastName", ''))) AS "fullName",
              COALESCE("employeeCode", '') AS "employeeCode"
       FROM employees
       WHERE "deletedAt" IS NULL
       ORDER BY "firstName", "lastName"`,
    );
  }

  private mapToResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      companyId: user.companyId,
      branchId: user.branchId,
      userType: user.userType,
      themePreference: user.themePreference,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles || [],
      permissions: user.permissions || [],
      accessibleCompanyIds: user.accessibleCompanyIds ?? [],
      accessibleBranchIds: user.accessibleBranchIds ?? [],
    };
  }
}
