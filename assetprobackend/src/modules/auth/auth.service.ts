import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenBlacklistService } from '../../common/services/token-blacklist.service';
import {
  RegisterTenantDto,
  LoginResponseDto,
  UserProfileDto,
  CheckSubdomainResponseDto,
} from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private pool: Pool;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private tokenBlacklist: TokenBlacklistService,
  ) {
    // Initialize PostgreSQL connection pool for tenant queries
    this.pool = new Pool({
      connectionString: this.configService.get('DATABASE_URL'),
      max: 2,
      idleTimeoutMillis: 30000,
    });
  }

  // ============================================================================
  // LOAD TENANT USER PERMISSIONS
  // ============================================================================
  private async loadTenantUserPermissions(
    client: import('pg').PoolClient,
    userId: number | string,
    roleName: string,
  ): Promise<string[]> {
    try {
      // If user has Super Admin role, load ALL permissions
      if (roleName === 'Super Admin' || roleName === 'super-admin' || roleName === 'superadmin') {
        const allPermsResult = await client.query(
          `SELECT name FROM permissions`,
        );
        return allPermsResult.rows.map((r: { name: string }) => r.name);
      }

      // Load permissions from roles + direct user permissions
      const permsResult = await client.query(
        `SELECT p.name FROM permissions p
         JOIN role_has_permissions rp ON p.id = rp."permissionId"
         JOIN user_roles ur ON rp."roleId" = ur."roleId"
         WHERE ur."userId" = $1
         UNION
         SELECT p.name FROM permissions p
         JOIN user_permissions up ON p.id = up."permissionId"
         WHERE up."userId" = $1`,
        [userId],
      );
      return permsResult.rows.map((r: { name: string }) => r.name);
    } catch (error) {
      this.logger.warn(`Failed to load permissions for user ${userId}: ${error.message}`);
      return [];
    }
  }

  // ============================================================================
  // VALIDATE USER (for local strategy)
  // ============================================================================
  async validateUser(email: string, password: string, subdomain?: string): Promise<any> {
    // If subdomain is provided, authenticate as tenant user
    if (subdomain) {
      return this.validateTenantUser(email, password, subdomain);
    }

    // Otherwise, try to find a central admin
    const admin = await this.prisma.centralAdmin.findUnique({
      where: { email },
    });

    if (admin && admin.isActive) {
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (isPasswordValid) {
        await this.prisma.centralAdmin.update({
          where: { id: admin.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          type: 'central_admin',
        };
      }
    }

    return null;
  }

  // ============================================================================
  // VALIDATE TENANT USER (Unified Login: Employee, Customer, Supplier)
  // ============================================================================
  private async validateTenantUser(email: string, password: string, subdomain: string): Promise<any> {
    // Lookup tenant from central database
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: subdomain },
    });

    if (!tenant || tenant.status !== 'active') {
      this.logger.warn(`Tenant not found or inactive: ${subdomain}`);
      return null;
    }

    // Query the tenant's schema for the user
    const schemaName = `tenant_${subdomain.replace(/[^a-z0-9]/gi, '_')}`;
    const client = await this.pool.connect();

    try {
      // Set search path to tenant schema
      await client.query(`SET search_path TO "${schemaName}"`);

      // Find user by email - simplified query for compatibility with schemas
      // that may not have unified login columns yet
      const userResult = await client.query(
        `SELECT u.id, u.email, u.name, u.password, u."companyId", u."branchId",
                COALESCE(u."userType", 'EMPLOYEE') as "userType",
                u."employeeId", u."customerId", u."supplierId", u."investorId",
                COALESCE(u.locale, 'en') as locale,
                c.name as "companyName"
         FROM users u
         LEFT JOIN companies c ON u."companyId" = c.id
         WHERE u.email = $1 AND u."deletedAt" IS NULL
         LIMIT 1`,
        [email],
      );

      if (userResult.rows.length === 0) {
        this.logger.debug(`User not found in tenant ${subdomain}: ${email}`);
        return null;
      }

      const user = userResult.rows[0];

      // Validate password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        this.logger.debug(`Invalid password for user ${email} in tenant ${subdomain}`);
        return null;
      }

      // Get user's role
      let roleName = 'user';
      const roleResult = await client.query(
        `SELECT r.name as "roleName"
         FROM user_roles ur
         JOIN roles r ON ur."roleId" = r.id
         WHERE ur."userId" = $1
         LIMIT 1`,
        [user.id],
      );
      roleName = roleResult.rows.length > 0 ? roleResult.rows[0].roleName : 'user';

      // Load user permissions
      const permissions = await this.loadTenantUserPermissions(client, user.id, roleName);

      this.logger.log(`Tenant user authenticated: ${email} (${user.userType}) in ${subdomain} with ${permissions.length} permissions`);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: roleName,
        userType: user.userType,
        tenantId: tenant.id,
        tenantSlug: subdomain,
        tenantName: tenant.name,
        companyId: user.companyId,
        companyName: user.companyName,
        branchId: user.branchId,
        employeeId: user.employeeId,
        customerId: user.customerId,
        supplierId: user.supplierId,
        investorId: user.investorId,
        locale: user.locale,
        permissions,
        type: 'tenant_user',
      };
    } catch (error) {
      this.logger.error(`Error validating tenant user: ${error.message}`);
      return null;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // LOGIN (Unified: Employee, Customer, Supplier)
  // ============================================================================
  async login(user: any): Promise<LoginResponseDto> {
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      userType: user.userType, // EMPLOYEE, CUSTOMER, SUPPLIER, ADMIN, SYSTEM
      companyId: user.companyId,
      branchId: user.branchId,
      // Entity-specific IDs
      employeeId: user.employeeId,
      customerId: user.customerId,
      supplierId: user.supplierId,
      investorId: user.investorId,
      locale: user.locale ?? 'en',
      type: 'access',
      jti: accessJti,
    };

    const refreshPayload: JwtPayload = {
      ...payload,
      type: 'refresh',
      jti: refreshJti,
    };

    const accessToken = this.jwtService.sign(payload as unknown as Record<string, unknown>, {
      expiresIn: 900, // 15 minutes
    });

    const refreshToken = this.jwtService.sign(refreshPayload as unknown as Record<string, unknown>, {
      expiresIn: 604800, // 7 days (matches company-context token generation)
    });

    // Build user response
    const userResponse: UserProfileDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      userType: user.userType || 'EMPLOYEE',
      tenantId: user.tenantId,
      tenantName: user.tenantName || user.companyName,
      companyId: user.companyId,
      companyName: user.companyName,
      branchId: user.branchId,
      employeeId: user.employeeId,
      locale: user.locale ?? 'en',
      permissions: user.permissions,
    };

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: userResponse,
    };
  }

  // ============================================================================
  // REFRESH TOKEN
  // ============================================================================
  async refreshToken(refreshToken: string): Promise<LoginResponseDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify user still exists and is active
      if (payload.role === 'super_admin' || payload.role === 'admin' || payload.role === 'support') {
        const admin = await this.prisma.centralAdmin.findUnique({
          where: { id: Number(payload.sub) },
        });

        if (!admin || !admin.isActive) {
          throw new UnauthorizedException('User no longer active');
        }

        return this.login({
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        });
      }

      // Handle tenant user refresh — verify user still active in tenant DB
      if (payload.tenantId && payload.sub) {
        let userName: string | undefined;
        let permissions: string[] = [];
        const client = await this.pool.connect();
        try {
          const schemaName = `tenant_${(payload.tenantSlug || '').replace(/[^a-z0-9]/gi, '_')}`;
          await client.query(`SET search_path TO "${schemaName}"`);
          const result = await client.query(
            `SELECT id, name, "deletedAt" FROM users WHERE id = $1`,
            [payload.sub],
          );
          const user = result.rows[0];
          if (!user || user.deletedAt) {
            throw new UnauthorizedException('User no longer active');
          }
          userName = user.name;

          // Load fresh permissions on refresh
          permissions = await this.loadTenantUserPermissions(client, payload.sub, payload.role);
        } finally {
          client.release();
        }

        return this.login({
          id: payload.sub,
          email: payload.email,
          name: userName || payload.name,
          tenantId: payload.tenantId,
          tenantSlug: payload.tenantSlug,
          companyId: payload.companyId,
          branchId: payload.branchId,
          role: payload.role,
          userType: payload.userType,
          employeeId: payload.employeeId,
          customerId: payload.customerId,
          supplierId: payload.supplierId,
          permissions,
        });
      }

      throw new UnauthorizedException('Invalid token');
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Token refresh failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ============================================================================
  // TENANT REGISTRATION
  // ============================================================================
  async registerTenant(dto: RegisterTenantDto): Promise<{ registrationId: string }> {
    // Check if subdomain is available
    const existingTenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: dto.subdomain },
          { email: dto.adminEmail },
        ],
      },
    });

    if (existingTenant) {
      if (existingTenant.slug === dto.subdomain) {
        throw new ConflictException('Subdomain is already taken');
      }
      throw new ConflictException('Email is already registered');
    }

    // Check if plan exists
    const plan = await this.prisma.plan.findUnique({
      where: { slug: dto.planSlug },
    });

    if (!plan || !plan.isActive) {
      throw new BadRequestException('Invalid plan selected');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Create registration state
    const registration = await this.prisma.registrationState.create({
      data: {
        companyName: dto.companyName,
        subdomain: dto.subdomain,
        adminEmail: dto.adminEmail,
        planSlug: dto.planSlug,
        status: 'pending',
        currentStep: 0,
        totalSteps: 13,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        data: {
          adminName: dto.adminName,
          passwordHash: hashedPassword,
          referralCode: dto.referralCode,
        },
      },
    });

    // Start provisioning inline (can be made async later with queue)
    this.provisionTenant(registration.id).catch(err => {
      this.logger.error(`Provisioning failed for ${registration.id}: ${err.message}`);
    });

    return {
      registrationId: registration.id,
    };
  }

  // ============================================================================
  // PROVISION TENANT (inline, can be replaced with queue worker later)
  // ============================================================================
  private async provisionTenant(registrationId: string): Promise<void> {
    try {
      await this.prisma.registrationState.update({
        where: { id: registrationId },
        data: { status: 'processing', currentStep: 1 },
      });

      // Step-by-step provisioning would go here (create database, schema, seed data, etc.)
      // For now, mark steps as progressing
      for (let step = 1; step <= 13; step++) {
        await this.prisma.registrationState.update({
          where: { id: registrationId },
          data: { currentStep: step },
        });
      }

      await this.prisma.registrationState.update({
        where: { id: registrationId },
        data: { status: 'completed', currentStep: 13, completedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Provisioning error for ${registrationId}: ${error.message}`);
      await this.prisma.registrationState.update({
        where: { id: registrationId },
        data: { status: 'failed', errorMessage: error.message },
      });
    }
  }

  // ============================================================================
  // CHECK REGISTRATION STATUS
  // ============================================================================
  async getRegistrationStatus(registrationId: string) {
    const registration = await this.prisma.registrationState.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      throw new BadRequestException('Registration not found');
    }

    return {
      id: registration.id,
      status: registration.status,
      currentStep: registration.currentStep,
      totalSteps: registration.totalSteps,
      stepMessage: registration.stepMessage,
      errorMessage: registration.errorMessage,
      redirectUrl: registration.redirectUrl,
      completedAt: registration.completedAt,
    };
  }

  // ============================================================================
  // CHECK SUBDOMAIN AVAILABILITY
  // ============================================================================
  async checkSubdomain(subdomain: string): Promise<CheckSubdomainResponseDto> {
    // Reserved subdomains
    const reserved = [
      'www', 'api', 'app', 'admin', 'mail', 'ftp', 'smtp', 'pop', 'imap',
      'test', 'demo', 'staging', 'dev', 'beta', 'alpha', 'support', 'help',
      'docs', 'status', 'blog', 'shop', 'store', 'my', 'account', 'dashboard',
    ];

    if (reserved.includes(subdomain.toLowerCase())) {
      return {
        available: false,
        suggestion: `${subdomain}-app`,
      };
    }

    const existing = await this.prisma.tenant.findUnique({
      where: { slug: subdomain },
    });

    if (existing) {
      // Generate suggestion
      const suggestion = `${subdomain}-${Math.floor(Math.random() * 100)}`;
      return {
        available: false,
        suggestion,
      };
    }

    return { available: true };
  }

  // ============================================================================
  // PORTAL CONFIG — what type of portal does this tenant support?
  // ============================================================================
  async getPortalConfig(slug: string): Promise<{ portalType: 'fleet' | 'investor' | null; tenantName: string | null }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true, name: true,
        subscription: {
          where: { status: { in: ['active', 'trial'] } },
          select: {
            modules: {
              where: { status: { in: ['enabled', 'trial'] } },
              select: { module: { select: { slug: true } } },
            },
          },
        },
      },
    });

    if (!tenant) return { portalType: null, tenantName: null };

    const moduleSlugs = new Set(
      (tenant.subscription ? [tenant.subscription] : []).flatMap((s) => s.modules.map((m) => m.module.slug)),
    );

    let portalType: 'fleet' | 'investor' | null = null;
    if (moduleSlugs.has('fleet-management')) portalType = 'fleet';
    else if (moduleSlugs.has('fund-management')) portalType = 'investor';

    return { portalType, tenantName: tenant.name };
  }

  // ============================================================================
  // LOGOUT (Blacklist tokens)
  // ============================================================================
  async logout(accessToken: string): Promise<{ message: string }> {
    try {
      const payload = this.jwtService.decode(accessToken) as JwtPayload;
      if (payload?.jti && payload?.exp) {
        const remainingSeconds = payload.exp - Math.floor(Date.now() / 1000);
        if (remainingSeconds > 0) {
          await this.tokenBlacklist.blacklist(payload.jti, remainingSeconds);
        }
      }
    } catch {
      // Token may be malformed; still return success
    }
    return { message: 'Logged out successfully' };
  }

  // ============================================================================
  // REVOKE ALL TOKENS FOR USER (disable / delete)
  // ============================================================================
  async revokeAllUserTokens(userId: string | number): Promise<void> {
    await this.tokenBlacklist.revokeAllForUser(userId);
  }

  // ============================================================================
  // PASSWORD RESET
  // ============================================================================
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    // Check if user exists (central admin or tenant user)
    const admin = await this.prisma.centralAdmin.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!admin) {
      return { message: 'If the email exists, a password reset link will be sent.' };
    }

    // Generate a unique reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Hash the token before storing — plain-text tokens in DB are a security risk
    const hashedToken = await bcrypt.hash(resetToken, 10);

    await this.prisma.centralAdmin.update({
      where: { id: admin.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: tokenExpiry,
      },
    });

    this.logger.log(`Password reset token generated for: ${email}`);

    return { message: 'If the email exists, a password reset link will be sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Find admins with pending reset tokens (non-null resetToken)
    const admins = await this.prisma.centralAdmin.findMany({
      where: {
        NOT: { resetToken: null },
      },
    });

    // Compare the provided token against each stored hash
    let matchedAdmin: (typeof admins)[number] | null = null;
    for (const admin of admins) {
      if (admin.resetToken && await bcrypt.compare(token, admin.resetToken)) {
        matchedAdmin = admin;
        break;
      }
    }

    if (!matchedAdmin) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check token expiry
    if (matchedAdmin.resetTokenExpiry && new Date(matchedAdmin.resetTokenExpiry) < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.centralAdmin.update({
      where: { id: matchedAdmin.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password has been reset successfully' };
  }

  // ============================================================================
  // CHANGE PASSWORD
  // ============================================================================
  async changePassword(
    userId: number | string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const admin = await this.prisma.centralAdmin.findUnique({
      where: { id: Number(userId) },
    });

    if (!admin) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.centralAdmin.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  // ============================================================================
  // GET USER PROFILE
  // ============================================================================
  async getProfile(userId: number | string, role: string, tenantSlug?: string): Promise<UserProfileDto> {
    if (role === 'super_admin' || role === 'admin' || role === 'support') {
      const admin = await this.prisma.centralAdmin.findUnique({
        where: { id: Number(userId) },
      });

      if (!admin) {
        throw new BadRequestException('User not found');
      }

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      };
    }

    // For tenant users, load profile + permissions from tenant schema
    if (tenantSlug) {
      const schemaName = `tenant_${tenantSlug.replace(/[^a-z0-9]/gi, '_')}`;
      const client = await this.pool.connect();

      try {
        await client.query(`SET search_path TO "${schemaName}"`);

        // Load user data
        const userResult = await client.query(
          `SELECT u.id, u.email, u.name, u."companyId", u."branchId",
                  COALESCE(u."userType", 'EMPLOYEE') as "userType",
                  c.name as "companyName"
           FROM users u
           LEFT JOIN companies c ON u."companyId" = c.id
           WHERE u.id = $1 AND u."deletedAt" IS NULL
           LIMIT 1`,
          [userId],
        );

        if (userResult.rows.length === 0) {
          throw new BadRequestException('User not found');
        }

        const user = userResult.rows[0];

        // Get user's role name
        let roleName = role;
        const roleResult = await client.query(
          `SELECT r.name as "roleName"
           FROM user_roles ur
           JOIN roles r ON ur."roleId" = r.id
           WHERE ur."userId" = $1
           LIMIT 1`,
          [user.id],
        );
        if (roleResult.rows.length > 0) {
          roleName = roleResult.rows[0].roleName;
        }

        // Load permissions
        const permissions = await this.loadTenantUserPermissions(client, user.id, roleName);

        // Lookup tenant name
        const tenant = await this.prisma.tenant.findFirst({
          where: { slug: tenantSlug },
          select: { name: true },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: roleName,
          userType: user.userType,
          tenantId: tenantSlug,
          tenantName: tenant?.name || user.companyName,
          companyId: user.companyId,
          companyName: user.companyName,
          branchId: user.branchId,
          permissions,
        };
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        this.logger.error(`Error loading tenant user profile: ${error.message}`);
        throw new BadRequestException('Failed to load user profile');
      } finally {
        client.release();
      }
    }

    throw new BadRequestException('Tenant user profiles require tenant context');
  }

  // ============================================================================
  // ACCEPT INVITE
  // ============================================================================
  async acceptInvite(token: string, tenantSlug: string, password: string): Promise<{ message: string }> {
    const client = await this.pool.connect();
    try {
      await client.query(`SET search_path TO "tenant_${tenantSlug}"`);
      const result = await client.query<{ id: number; inviteExpiresAt: Date }>(
        `SELECT id, "inviteExpiresAt" FROM users WHERE "inviteToken" = $1 AND "deletedAt" IS NULL`,
        [token],
      );
      if (!result.rows.length) throw new BadRequestException('Invalid or expired invitation');

      const user = result.rows[0];
      if (new Date() > new Date(user.inviteExpiresAt)) {
        throw new BadRequestException('Invitation has expired');
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await client.query(
        `UPDATE users SET password = $1, "inviteToken" = NULL, "inviteExpiresAt" = NULL, "emailVerifiedAt" = NOW(), "updatedAt" = NOW() WHERE id = $2`,
        [passwordHash, user.id],
      );
      return { message: 'Account activated. You can now log in.' };
    } finally {
      client.release();
    }
  }
}
