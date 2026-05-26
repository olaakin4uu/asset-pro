import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { REQUIRE_COMPANY_KEY, REQUIRE_BRANCH_KEY } from '../guards/company-context.guard';

/**
 * Mark a route as requiring company context
 * Will return 403 if user has no company assigned and none can be auto-assigned
 */
export const RequireCompany = () => SetMetadata(REQUIRE_COMPANY_KEY, true);

/**
 * Mark a route as requiring branch context
 * Will return 403 if user has no branch assigned and none can be auto-assigned
 */
export const RequireBranch = () => SetMetadata(REQUIRE_BRANCH_KEY, true);

/**
 * Current company data interface
 */
export interface CurrentCompanyData {
  id: number;
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
  currency: string;
  logoPath?: string;
  isActive: boolean;
}

/**
 * Current branch data interface
 */
export interface CurrentBranchData {
  id: number;
  name: string;
  code?: string;
  companyId: number;
  isHeadOffice: boolean;
  isActive: boolean;
  timezone?: string;
}

/**
 * Get current company from request
 * Requires CompanyContextGuard to be applied
 */
export const CurrentCompany = createParamDecorator(
  (data: keyof CurrentCompanyData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const company = request.currentCompany as CurrentCompanyData;

    if (!company) {
      return null;
    }

    return data ? company[data] : company;
  },
);

/**
 * Get current branch from request
 * Requires CompanyContextGuard to be applied
 */
export const CurrentBranch = createParamDecorator(
  (data: keyof CurrentBranchData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const branch = request.currentBranch as CurrentBranchData;

    if (!branch) {
      return null;
    }

    return data ? branch[data] : branch;
  },
);

/**
 * Get accessible branches from request
 * Requires CompanyContextGuard to be applied
 */
export const AccessibleBranches = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.accessibleBranches || [];
  },
);

/**
 * Company context interface for convenience
 */
export interface CompanyContext {
  company: CurrentCompanyData;
  branch: CurrentBranchData;
  accessibleBranches: CurrentBranchData[];
}

/**
 * Get full company context from request
 * Requires CompanyContextGuard to be applied
 */
export const GetCompanyContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CompanyContext | null => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.currentCompany) {
      return null;
    }

    return {
      company: request.currentCompany,
      branch: request.currentBranch,
      accessibleBranches: request.accessibleBranches || [],
    };
  },
);
