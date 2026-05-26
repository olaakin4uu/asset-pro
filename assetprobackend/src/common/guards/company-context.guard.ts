import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantPrismaService } from '../services/tenant-prisma.service';

export const REQUIRE_COMPANY_KEY = 'require_company';
export const REQUIRE_BRANCH_KEY = 'require_branch';

/**
 * CompanyContextGuard - Ensures user has a company context and enriches the request
 *
 * This guard:
 * 1. Checks if user has company_id assigned
 * 2. If not, assigns the first active company
 * 3. Checks if user has branch_id assigned
 * 4. If not, assigns the first active branch of the company
 * 5. Enriches request with company/branch details
 *
 * Use with @RequireCompany() or @RequireBranch() decorators
 */
@Injectable()
export class CompanyContextGuard implements CanActivate {
  private readonly logger = new Logger(CompanyContextGuard.name);

  constructor(
    private reflector: Reflector,
    private tenantPrisma: TenantPrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireCompany = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_COMPANY_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requireBranch = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_BRANCH_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no company/branch requirements, just enrich the request if possible
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return !requireCompany && !requireBranch;
    }

    try {
      // Check if user needs company assignment
      let companyId = user.companyId;
      let branchId = user.branchId;
      let needsUpdate = false;

      if (!companyId) {
        // Auto-assign first active company
        const firstCompany = await this.tenantPrisma.queryOne<{ id: number }>(
          `SELECT id FROM companies WHERE "isActive" = true AND "deletedAt" IS NULL ORDER BY "createdAt" ASC LIMIT 1`,
        );

        if (firstCompany) {
          companyId = firstCompany.id;
          needsUpdate = true;
          this.logger.debug(`Auto-assigned company ${companyId} to user ${user.id}`);
        } else if (requireCompany) {
          this.logger.warn(`No active company found for user ${user.id}`);
          return false;
        }
      }

      if (companyId && !branchId) {
        // Auto-assign first active branch of the company
        const firstBranch = await this.tenantPrisma.queryOne<{ id: number }>(
          `SELECT id FROM branches WHERE "companyId" = $1 AND "isActive" = true AND "deletedAt" IS NULL ORDER BY "isHeadOffice" DESC, "createdAt" ASC LIMIT 1`,
          [companyId],
        );

        if (firstBranch) {
          branchId = firstBranch.id;
          needsUpdate = true;
          this.logger.debug(`Auto-assigned branch ${branchId} to user ${user.id}`);
        } else if (requireBranch) {
          this.logger.warn(`No active branch found for company ${companyId}`);
          return false;
        }
      }

      // Update user in database if needed
      if (needsUpdate) {
        await this.tenantPrisma.update('users', user.id, {
          companyId,
          branchId,
        });
      }

      // Update user object with context
      user.companyId = companyId;
      user.branchId = branchId;

      // Enrich request with company details
      if (companyId) {
        const company = await this.tenantPrisma.queryOne(
          `SELECT id, name, "displayName", email, phone, currency, "logoPath", "isActive"
           FROM companies WHERE id = $1`,
          [companyId],
        );

        if (company) {
          request.currentCompany = company;

          // Get accessible branches for the user
          const branches = await this.tenantPrisma.query(
            `SELECT id, name, code, "isHeadOffice", "isActive"
             FROM branches
             WHERE "companyId" = $1 AND "isActive" = true AND "deletedAt" IS NULL
             ORDER BY "isHeadOffice" DESC, name ASC`,
            [companyId],
          );

          request.accessibleBranches = branches;
        }
      }

      // Enrich request with branch details
      if (branchId) {
        const branch = await this.tenantPrisma.queryOne(
          `SELECT id, name, code, "companyId", "isHeadOffice", "isActive", timezone
           FROM branches WHERE id = $1`,
          [branchId],
        );

        if (branch) {
          request.currentBranch = branch;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Error in CompanyContextGuard: ${error.message}`);
      return !requireCompany && !requireBranch;
    }
  }
}
