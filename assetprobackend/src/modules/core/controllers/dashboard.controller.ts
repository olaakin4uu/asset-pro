import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { TenantOnly } from '../../../common/decorators/tenant.decorators';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/strategies/jwt.strategy';
import { DashboardService, DashboardResponse, FundManagementDashboardResponse } from '../services/dashboard.service';

// ============================================================================
// CONTROLLER
// ============================================================================

@ApiTags('Core - Dashboard')
@ApiBearerAuth()
@Controller('core/dashboard')
@UseGuards(JwtAuthGuard, TenantGuard)
@TenantOnly()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ============================================================================
  // GET DASHBOARD
  // ============================================================================
  @Get()
  @ApiOperation({
    summary: 'Get dashboard data',
    description:
      'Returns dashboard statistics, activities, and alerts for the current company context. ' +
      'All data is scoped to the authenticated user\'s company and branch.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboard(@CurrentUser() user: AuthUser): Promise<DashboardResponse> {
    return this.dashboardService.getDashboard(
      user.companyId || null,
      user.branchId || null
    );
  }

  // ============================================================================
  // GET FUND MANAGEMENT DASHBOARD
  // ============================================================================
  @Get('fund-management')
  @ApiOperation({
    summary: 'Get fund management dashboard data',
    description:
      'Returns fund management specific dashboard with AUM, investor, NAV, and compliance stats.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fund management dashboard data retrieved successfully',
  })
  async getFundManagementDashboard(@CurrentUser() user: AuthUser): Promise<FundManagementDashboardResponse> {
    return this.dashboardService.getFundManagementDashboard(
      user.companyId || null,
      user.branchId || null
    );
  }
}
