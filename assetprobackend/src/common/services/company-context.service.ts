import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TenantPrismaService } from './tenant-prisma.service';
import type { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

export interface CompanyDetails {
  id: number;
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
  currency: string;
  logoPath?: string;
  logoUrl?: string;
  isActive: boolean;
  branchCount: number;
  userCount: number;
}

export interface BranchDetails {
  id: number;
  name: string;
  code?: string;
  companyId: number;
  isHeadOffice: boolean;
  isActive: boolean;
  timezone?: string;
  userCount: number;
}

export interface CompanyContextResponse {
  currentCompany: CompanyDetails | null;
  currentBranch: BranchDetails | null;
  availableCompanies: CompanyDetails[];
  accessibleBranches: BranchDetails[];
}

export interface SwitchResult {
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  company?: CompanyDetails;
  branch?: BranchDetails;
}

@Injectable()
export class CompanyContextService {
  private readonly logger = new Logger(CompanyContextService.name);

  constructor(
    private tenantPrisma: TenantPrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Get company context for a user
   */
  async getContext(userId: number): Promise<CompanyContextResponse> {
    // Get user with company/branch
    const user = await this.tenantPrisma.queryOne<{
      id: number;
      companyId: number | null;
      branchId: number | null;
    }>(
      `SELECT id, "companyId", "branchId" FROM users WHERE id = $1 AND "deletedAt" IS NULL`,
      [userId],
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get available companies scoped to this user's access
    const availableCompanies = await this.getAvailableCompanies(userId);

    // Get current company details
    let currentCompany: CompanyDetails | null = null;
    let currentBranch: BranchDetails | null = null;
    let accessibleBranches: BranchDetails[] = [];

    if (user.companyId) {
      currentCompany = await this.getCompanyDetails(user.companyId);

      if (currentCompany) {
        accessibleBranches = await this.getAccessibleBranches(user.id, user.companyId);

        if (user.branchId) {
          currentBranch = await this.getBranchDetails(user.branchId);
        }
      }
    }

    return {
      currentCompany,
      currentBranch,
      availableCompanies,
      accessibleBranches,
    };
  }

  /**
   * Get companies available to a user.
   * Super Admins see all companies. Other users see only companies they have explicit access to
   * (via user_company_access) plus their current companyId.
   */
  async getAvailableCompanies(userId?: number): Promise<CompanyDetails[]> {
    if (userId) {
      const isSuperAdmin = await this.isSuperAdmin(userId);
      if (!isSuperAdmin) {
        const companies = await this.tenantPrisma.query(
          `SELECT c.id, c.name, c."displayName", c.email, c.phone, c.currency, c."logoPath", c."isActive",
                  (SELECT COUNT(*) FROM branches b WHERE b."companyId" = c.id AND b."deletedAt" IS NULL) as "branchCount",
                  (SELECT COUNT(*) FROM users u WHERE u."companyId" = c.id AND u."deletedAt" IS NULL) as "userCount"
           FROM companies c
           WHERE c."isActive" = true AND c."deletedAt" IS NULL
           AND (
             c.id IN (SELECT "companyId" FROM user_company_access WHERE "userId" = $1)
             OR c.id = (SELECT "companyId" FROM users WHERE id = $1 AND "deletedAt" IS NULL)
           )
           ORDER BY c.name ASC`,
          [userId],
        );
        return companies.map((c) => this.mapCompany(c));
      }
    }

    // Super Admin or no userId: return all active companies
    const companies = await this.tenantPrisma.query(
      `SELECT c.id, c.name, c."displayName", c.email, c.phone, c.currency, c."logoPath", c."isActive",
              (SELECT COUNT(*) FROM branches b WHERE b."companyId" = c.id AND b."deletedAt" IS NULL) as "branchCount",
              (SELECT COUNT(*) FROM users u WHERE u."companyId" = c.id AND u."deletedAt" IS NULL) as "userCount"
       FROM companies c
       WHERE c."isActive" = true AND c."deletedAt" IS NULL
       ORDER BY c.name ASC`,
    );

    return companies.map((c) => this.mapCompany(c));
  }

  /**
   * Check if a user has the Super Admin role.
   */
  private async isSuperAdmin(userId: number): Promise<boolean> {
    const row = await this.tenantPrisma.queryOne<{ roleName: string }>(
      `SELECT r.name as "roleName" FROM user_roles ur
       JOIN roles r ON ur."roleId" = r.id
       WHERE ur."userId" = $1 AND r.name = 'Super Admin'
       LIMIT 1`,
      [userId],
    );
    return !!row;
  }

  /**
   * Get company details by ID
   */
  async getCompanyDetails(companyId: number): Promise<CompanyDetails | null> {
    const company = await this.tenantPrisma.queryOne(
      `SELECT c.id, c.name, c."displayName", c.email, c.phone, c.currency, c."logoPath", c."isActive",
              (SELECT COUNT(*) FROM branches b WHERE b."companyId" = c.id AND b."deletedAt" IS NULL) as "branchCount",
              (SELECT COUNT(*) FROM users u WHERE u."companyId" = c.id AND u."deletedAt" IS NULL) as "userCount"
       FROM companies c
       WHERE c.id = $1 AND c."deletedAt" IS NULL`,
      [companyId],
    );

    return company ? this.mapCompany(company) : null;
  }

  /**
   * Get accessible branches for a user in a company.
   * Super Admins see all branches. Other users see branches from:
   *   1. user_branch_access (explicit admin grant)
   *   2. branch_employee (employee assignment)
   *   3. users.branchId (current default branch)
   */
  async getAccessibleBranches(userId: number, companyId: number): Promise<BranchDetails[]> {
    const superAdmin = await this.isSuperAdmin(userId);

    if (superAdmin) {
      const branches = await this.tenantPrisma.query(
        `SELECT b.id, b.name, b.code, b."companyId", b."isHeadOffice", b."isActive", b.timezone,
                (SELECT COUNT(*) FROM users u WHERE u."branchId" = b.id AND u."deletedAt" IS NULL) as "userCount"
         FROM branches b
         WHERE b."companyId" = $1 AND b."isActive" = true AND b."deletedAt" IS NULL
         ORDER BY b."isHeadOffice" DESC, b.name ASC`,
        [companyId],
      );
      return branches.map((b) => this.mapBranch(b));
    }

    // Regular users: union of explicit access grants + employee assignments + default branch
    const branches = await this.tenantPrisma.query(
      `SELECT DISTINCT b.id, b.name, b.code, b."companyId", b."isHeadOffice", b."isActive", b.timezone,
              (SELECT COUNT(*) FROM users u WHERE u."branchId" = b.id AND u."deletedAt" IS NULL) as "userCount"
       FROM branches b
       WHERE b."companyId" = $1 AND b."isActive" = true AND b."deletedAt" IS NULL
       AND (
         b.id IN (SELECT "branchId" FROM user_branch_access WHERE "userId" = $2)
         OR b.id = (SELECT "branchId" FROM users WHERE id = $2 AND "deletedAt" IS NULL)
         OR b.id IN (
           SELECT be."branchId" FROM branch_employee be
           JOIN employees e ON e.id = be."employeeId"
           JOIN users u ON u."employeeId" = e.id
           WHERE u.id = $2 AND be."isActive" = true
         )
       )
       ORDER BY b."isHeadOffice" DESC, b.name ASC`,
      [companyId, userId],
    );

    return branches.map((b) => this.mapBranch(b));
  }

  /**
   * Get branch details by ID
   */
  async getBranchDetails(branchId: number): Promise<BranchDetails | null> {
    const branch = await this.tenantPrisma.queryOne(
      `SELECT b.id, b.name, b.code, b."companyId", b."isHeadOffice", b."isActive", b.timezone,
              (SELECT COUNT(*) FROM users u WHERE u."branchId" = b.id AND u."deletedAt" IS NULL) as "userCount"
       FROM branches b
       WHERE b.id = $1 AND b."deletedAt" IS NULL`,
      [branchId],
    );

    return branch ? this.mapBranch(branch) : null;
  }

  /**
   * Switch to a different company
   * Returns new tokens with updated companyId/branchId
   */
  async switchCompany(
    userId: number,
    companyId: number,
    currentPayload: JwtPayload,
  ): Promise<SwitchResult> {
    // Verify company exists and is active
    const company = await this.getCompanyDetails(companyId);
    if (!company || !company.isActive) {
      throw new NotFoundException('Company not found or inactive');
    }

    // Check user has access to the target company (Super Admins are unrestricted)
    const superAdmin = await this.isSuperAdmin(userId);
    if (!superAdmin) {
      const hasAccess = await this.tenantPrisma.queryOne(
        `SELECT 1 FROM user_company_access WHERE "userId" = $1 AND "companyId" = $2`,
        [userId, companyId],
      );
      // Also allow switching back to the user's own companyId without an explicit grant
      const userRow = await this.tenantPrisma.queryOne<{ companyId: number | null }>(
        `SELECT "companyId" FROM users WHERE id = $1`,
        [userId],
      );
      if (!hasAccess && userRow?.companyId !== companyId) {
        throw new ForbiddenException('You do not have access to this company');
      }
    }

    // Get first branch of the new company (preferably head office)
    const firstBranch = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT id FROM branches
       WHERE "companyId" = $1 AND "isActive" = true AND "deletedAt" IS NULL
       ORDER BY "isHeadOffice" DESC, "createdAt" ASC
       LIMIT 1`,
      [companyId],
    );

    const branchId = firstBranch?.id || null;

    // Update user in database
    await this.tenantPrisma.update('users', userId, {
      companyId,
      branchId,
    });

    // Generate new tokens with updated context
    const { accessToken, refreshToken } = this.generateTokens({
      ...currentPayload,
      companyId,
      branchId: branchId ?? undefined,
    });

    const branch = branchId ? await this.getBranchDetails(branchId) : null;

    this.logger.log(`User ${userId} switched to company ${companyId} (branch: ${branchId})`);

    return {
      success: true,
      message: `Successfully switched to ${company.displayName || company.name}`,
      accessToken,
      refreshToken,
      company,
      branch: branch ?? undefined,
    };
  }

  /**
   * Switch to a different branch within the same company
   */
  async switchBranch(
    userId: number,
    branchId: number,
    currentPayload: JwtPayload,
  ): Promise<SwitchResult> {
    // Verify branch exists and is active
    const branch = await this.getBranchDetails(branchId);
    if (!branch || !branch.isActive) {
      throw new NotFoundException('Branch not found or inactive');
    }

    // Check if user has access to this branch
    const accessibleBranches = await this.getAccessibleBranches(userId, branch.companyId);
    const hasAccess = accessibleBranches.some((b) => b.id === branchId);

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this branch');
    }

    // Verify the branch belongs to the user's current company
    if (currentPayload.companyId && branch.companyId !== currentPayload.companyId) {
      throw new BadRequestException(
        'Branch does not belong to your current company. Please switch company first.',
      );
    }

    // Update user in database
    await this.tenantPrisma.update('users', userId, {
      branchId,
    });

    // Generate new tokens with updated context
    const { accessToken, refreshToken } = this.generateTokens({
      ...currentPayload,
      branchId,
    });

    this.logger.log(`User ${userId} switched to branch ${branchId}`);

    return {
      success: true,
      message: `Successfully switched to ${branch.name}`,
      accessToken,
      refreshToken,
      branch,
    };
  }

  /**
   * Get branches assigned to the employee linked to this user.
   * Returns only the branches from branch_employee table.
   * If employee has only 1 branch, frontend auto-selects it.
   * If employee has multiple, frontend shows a branch selector on transaction forms.
   */
  async getEmployeeBranches(userId: number, companyId: number): Promise<{
    branches: BranchDetails[];
    hasSingleBranch: boolean;
    defaultBranchId: number | null;
  }> {
    // Check if user is super admin (can access all branches)
    const userRole = await this.tenantPrisma.queryOne<{ roleName: string }>(
      `SELECT r.name as "roleName" FROM user_roles ur
       JOIN roles r ON ur."roleId" = r.id
       WHERE ur."userId" = $1
       LIMIT 1`,
      [userId],
    );

    if (userRole?.roleName === 'Super Admin') {
      // Super Admin gets all active branches for the company
      const allBranches = await this.tenantPrisma.query(
        `SELECT b.id, b.name, b.code, b."companyId", b."isHeadOffice", b."isActive", b.timezone,
                (SELECT COUNT(*) FROM users u WHERE u."branchId" = b.id AND u."deletedAt" IS NULL) as "userCount"
         FROM branches b
         WHERE b."companyId" = $1 AND b."isActive" = true AND b."deletedAt" IS NULL
         ORDER BY b."isHeadOffice" DESC, b.name ASC`,
        [companyId],
      );

      const mapped = allBranches.map((b) => this.mapBranch(b));

      // Default to user's current branch, or head office, or first
      const userBranch = await this.tenantPrisma.queryOne<{ branchId: number | null }>(
        `SELECT "branchId" FROM users WHERE id = $1`,
        [userId],
      );
      const defaultBranchId = userBranch?.branchId || mapped.find((b) => b.isHeadOffice)?.id || mapped[0]?.id || null;

      return {
        branches: mapped,
        hasSingleBranch: mapped.length <= 1,
        defaultBranchId,
      };
    }

    // Get employee branches via user → employee → branch_employee
    const branches = await this.tenantPrisma.query(
      `SELECT b.id, b.name, b.code, b."companyId", b."isHeadOffice", b."isActive", b.timezone,
              be."isPrimary",
              (SELECT COUNT(*) FROM users u WHERE u."branchId" = b.id AND u."deletedAt" IS NULL) as "userCount"
       FROM branches b
       JOIN branch_employee be ON be."branchId" = b.id AND be."isActive" = true
       JOIN employees e ON e.id = be."employeeId"
       JOIN users u ON u."employeeId" = e.id
       WHERE u.id = $1 AND b."companyId" = $2 AND b."isActive" = true AND b."deletedAt" IS NULL
       ORDER BY be."isPrimary" DESC, b."isHeadOffice" DESC, b.name ASC`,
      [userId, companyId],
    );

    const mapped = branches.map((b) => this.mapBranch(b));

    // If no branches found via branch_employee, fall back to user's assigned branch
    if (mapped.length === 0) {
      const userBranch = await this.tenantPrisma.queryOne<{ branchId: number | null }>(
        `SELECT "branchId" FROM users WHERE id = $1`,
        [userId],
      );
      if (userBranch?.branchId) {
        const branch = await this.getBranchDetails(userBranch.branchId);
        if (branch) {
          return {
            branches: [branch],
            hasSingleBranch: true,
            defaultBranchId: branch.id,
          };
        }
      }
      return { branches: [], hasSingleBranch: true, defaultBranchId: null };
    }

    // Default branch = isPrimary first, then first in list
    const primaryBranch = branches.find((b: Record<string, unknown>) => b.isPrimary);
    const defaultBranchId = primaryBranch ? (primaryBranch as Record<string, unknown>).id as number : mapped[0].id;

    return {
      branches: mapped,
      hasSingleBranch: mapped.length === 1,
      defaultBranchId,
    };
  }

  /**
   * Validate that the user has access to the given branchId.
   * If branchId is null/undefined, passes silently (branchId is optional on most entities).
   * If branchId is provided, checks the user's accessible branches.
   * Throws ForbiddenException if user does not have access.
   */
  async validateBranchAccess(
    userId: number,
    companyId: number,
    branchId: number | null | undefined,
  ): Promise<void> {
    if (!branchId) return; // null/undefined branchId is always valid (optional)

    const accessibleBranches = await this.getAccessibleBranches(userId, companyId);
    const hasAccess = accessibleBranches.some((b) => b.id === branchId);

    if (!hasAccess) {
      throw new ForbiddenException(
        `You do not have access to branch ${branchId}`,
      );
    }
  }

  /**
   * Generate new JWT tokens
   */
  private generateTokens(payload: JwtPayload): { accessToken: string; refreshToken: string } {
    const accessPayload = { ...payload, type: 'access' as const };
    const refreshPayload = { ...payload, type: 'refresh' as const };

    const accessToken = this.jwtService.sign(accessPayload as unknown as Record<string, unknown>, {
      expiresIn: 900, // 15 minutes
    });

    const refreshToken = this.jwtService.sign(refreshPayload as unknown as Record<string, unknown>, {
      expiresIn: 604800, // 7 days
    });

    return { accessToken, refreshToken };
  }

  /**
   * Map company row to CompanyDetails
   */
  private mapCompany(row: any): CompanyDetails {
    return {
      id: row.id,
      name: row.name,
      displayName: row.displayName,
      email: row.email,
      phone: row.phone,
      currency: row.currency || 'NGN',
      logoPath: row.logoPath,
      logoUrl: row.logoPath ? `/uploads/${row.logoPath}` : undefined,
      isActive: row.isActive,
      branchCount: parseInt(row.branchCount || '0', 10),
      userCount: parseInt(row.userCount || '0', 10),
    };
  }

  /**
   * Map branch row to BranchDetails
   */
  private mapBranch(row: any): BranchDetails {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      companyId: row.companyId,
      isHeadOffice: row.isHeadOffice,
      isActive: row.isActive,
      timezone: row.timezone,
      userCount: parseInt(row.userCount || '0', 10),
    };
  }
}
