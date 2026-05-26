import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { TenantOnly } from '../../../common/decorators/tenant.decorators';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/strategies/jwt.strategy';
import {
  CompanyContextService,
  CompanyContextResponse,
  SwitchResult,
} from '../../../common/services/company-context.service';
import { FeatureService, ModuleStatus } from '../../../common/services/feature.service';

// ============================================================================
// DTOs
// ============================================================================

class SwitchCompanyDto {
  @ApiProperty({ description: 'ID of the company to switch to' })
  @IsInt()
  @IsNotEmpty()
  companyId: number;
}

class SwitchBranchDto {
  @ApiProperty({ description: 'ID of the branch to switch to' })
  @IsInt()
  @IsNotEmpty()
  branchId: number;
}

class ToggleFeatureDto {
  @ApiProperty({ description: 'Module slug (e.g. "hrpayroll")' })
  @IsString()
  @IsNotEmpty()
  moduleSlug: string;

  @ApiProperty({ description: 'Feature slug (e.g. "payroll")' })
  @IsString()
  @IsNotEmpty()
  featureSlug: string;

  @ApiProperty({ description: 'Whether to enable or disable the feature' })
  @IsBoolean()
  enabled: boolean;
}

// ============================================================================
// CONTROLLER
// ============================================================================

@ApiTags('Core - Company Context')
@ApiBearerAuth()
@Controller('core/context')
@UseGuards(JwtAuthGuard, TenantGuard)
@TenantOnly()
export class CompanyContextController {
  constructor(
    private readonly companyContextService: CompanyContextService,
    private readonly featureService: FeatureService,
  ) {}

  // ============================================================================
  // GET CURRENT CONTEXT
  // ============================================================================
  @Get()
  @ApiOperation({
    summary: 'Get current company context',
    description:
      'Returns the current company, branch, available companies, and accessible branches for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Company context retrieved successfully',
  })
  async getContext(@CurrentUser() user: AuthUser): Promise<CompanyContextResponse> {
    return this.companyContextService.getContext(user.id as number);
  }

  // ============================================================================
  // SWITCH COMPANY
  // ============================================================================
  @Post('switch-company')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Switch to a different company',
    description:
      'Switches the user to a different company and returns new authentication tokens with updated context',
  })
  @ApiResponse({
    status: 200,
    description: 'Company switched successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found or inactive',
  })
  async switchCompany(
    @Body() dto: SwitchCompanyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SwitchResult> {
    return this.companyContextService.switchCompany(user.id as number, dto.companyId, {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      userType: user.userType,
      companyId: user.companyId,
      branchId: user.branchId,
      employeeId: user.employeeId,
      customerId: user.customerId,
      supplierId: user.supplierId,
      type: 'access',
    });
  }

  // ============================================================================
  // SWITCH BRANCH
  // ============================================================================
  @Post('switch-branch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Switch to a different branch',
    description:
      'Switches the user to a different branch within the same company and returns new authentication tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Branch switched successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to this branch',
  })
  @ApiResponse({
    status: 404,
    description: 'Branch not found or inactive',
  })
  async switchBranch(
    @Body() dto: SwitchBranchDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SwitchResult> {
    return this.companyContextService.switchBranch(user.id as number, dto.branchId, {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      userType: user.userType,
      companyId: user.companyId,
      branchId: user.branchId,
      employeeId: user.employeeId,
      customerId: user.customerId,
      supplierId: user.supplierId,
      type: 'access',
    });
  }

  // ============================================================================
  // GET ENABLED MODULES
  // ============================================================================
  @Get('modules')
  @ApiOperation({
    summary: 'Get enabled modules for tenant',
    description:
      'Returns the list of modules and their enabled/disabled status based on the tenant subscription',
  })
  @ApiResponse({
    status: 200,
    description: 'Module status list retrieved successfully',
  })
  async getEnabledModules(@CurrentUser() user: AuthUser): Promise<ModuleStatus[]> {
    if (!user.tenantId) {
      return [];
    }
    return this.featureService.getTenantModules(user.tenantId);
  }

  // ============================================================================
  // TOGGLE FEATURE
  // ============================================================================
  @Post('features/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Toggle a feature for the current tenant',
    description:
      'Enables or disables a specific feature within a module, subject to plan limits',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature toggled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot toggle core features or feature not in plan',
  })
  async toggleFeature(
    @Body() dto: ToggleFeatureDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ success: boolean }> {
    if (!user.tenantId) {
      return { success: false };
    }
    const result = await this.featureService.toggleTenantFeature(
      user.tenantId,
      dto.moduleSlug,
      dto.featureSlug,
      dto.enabled,
    );
    return { success: result };
  }

  // ============================================================================
  // GET EMPLOYEE'S ASSIGNED BRANCHES (for transaction form branch selector)
  // ============================================================================
  @Get('my-branches')
  @ApiOperation({
    summary: 'Get employee assigned branches',
    description:
      'Returns branches assigned to the current employee via branch_employee table. ' +
      'If employee has only 1 branch, hasSingleBranch=true and frontend auto-selects it. ' +
      'If multiple, frontend shows a branch selector as the first field on transaction forms.',
  })
  @ApiResponse({
    status: 200,
    description: 'Employee branches retrieved successfully',
  })
  async getMyBranches(@CurrentUser() user: AuthUser) {
    if (!user.companyId) {
      return { branches: [], hasSingleBranch: true, defaultBranchId: null };
    }
    return this.companyContextService.getEmployeeBranches(
      user.id as number,
      user.companyId,
    );
  }

  // ============================================================================
  // GET AVAILABLE COMPANIES
  // ============================================================================
  @Get('companies')
  @ApiOperation({
    summary: 'Get all available companies',
    description: 'Returns a list of all active companies the user can switch to',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available companies',
  })
  async getAvailableCompanies() {
    return this.companyContextService.getAvailableCompanies();
  }

  // ============================================================================
  // GET ACCESSIBLE BRANCHES
  // ============================================================================
  @Get('branches')
  @ApiOperation({
    summary: 'Get accessible branches',
    description: 'Returns a list of branches the user can access in their current company',
  })
  @ApiResponse({
    status: 200,
    description: 'List of accessible branches',
  })
  async getAccessibleBranches(@CurrentUser() user: AuthUser) {
    if (!user.companyId) {
      return [];
    }
    return this.companyContextService.getAccessibleBranches(
      user.id as number,
      user.companyId,
    );
  }
}
