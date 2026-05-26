import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { CompanyContextGuard } from '../../../common/guards/company-context.guard';
import { RequireModule } from '../../../common/decorators/feature.decorators';
import { RequireCompany } from '../../../common/decorators/company-context.decorators';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { OpeningBalanceService } from '../services/opening-balance.service';
import {
  SetOpeningBalancesDto,
  UpdateOpeningBalanceDto,
  OpeningBalanceQueryDto,
} from '../dto/opening-balance.dto';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Opening Balances')
@Controller('accounts/opening-balances')
@UseGuards(JwtAuthGuard, FeatureGuard, CompanyContextGuard, PermissionsGuard)
@RequireModule('accounts')
@RequireCompany()
@ApiBearerAuth()
export class OpeningBalancesController {
  constructor(private readonly openingBalanceService: OpeningBalanceService) {}

  @Post()
  @RequirePermission('create opening-balances')
  @ApiOperation({ summary: 'Set opening balances for accounts (requires approval unless Super Admin)' })
  @ApiResponse({ status: 201, description: 'Opening balances set successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or unbalanced entries' })
  async setOpeningBalances(
    @Body() dto: SetOpeningBalancesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.openingBalanceService.setOpeningBalances(user.companyId, dto, user.id);
  }

  @Post('approve')
  @ApiOperation({ summary: 'Approve opening balances for a year/period (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Opening balances approved' })
  async approveOpeningBalances(
    @Body() body: { year: number; period: number; comment?: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.openingBalanceService.approveOpeningBalances(
      user.companyId, body.year, body.period, user.id, body.comment,
    );
  }

  @Get('approval-status')
  @ApiOperation({ summary: 'Get approval status for opening balances of a year/period' })
  @ApiResponse({ status: 200, description: 'Approval status' })
  async getApprovalStatus(
    @Query('year') year: string,
    @Query('period') period: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.openingBalanceService.getApprovalStatus(
      user.companyId, parseInt(year, 10), parseInt(period || '0', 10),
    );
  }

  @Get()
  @RequirePermission('view opening-balances')
  @ApiOperation({ summary: 'Get all opening balances with summary' })
  @ApiResponse({ status: 200, description: 'Opening balances retrieved successfully' })
  async getOpeningBalances(
    @Query() query: OpeningBalanceQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.openingBalanceService.findAll(user.companyId, query);
  }

  @Get('years')
  @ApiOperation({ summary: 'Get list of years with opening balances' })
  @ApiResponse({ status: 200, description: 'Years list retrieved successfully' })
  async getYearsWithBalances(@CurrentUser() user: AuthUser) {
    return this.openingBalanceService.getYearsWithBalances(user.companyId);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get accounts available for opening balances' })
  @ApiResponse({ status: 200, description: 'Accounts list retrieved successfully' })
  async getAccountsForBalances(@CurrentUser() user: AuthUser) {
    return this.openingBalanceService.getAccountsForBalances(user.companyId);
  }

  @Get(':id')
  @RequirePermission('view opening-balances')
  @ApiOperation({ summary: 'Get opening balance by ID' })
  @ApiResponse({ status: 200, description: 'Opening balance retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Opening balance not found' })
  async getOpeningBalance(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.openingBalanceService.findById(user.companyId, id);
  }

  @Put(':id')
  @RequirePermission('edit opening-balances')
  @ApiOperation({ summary: 'Update opening balance' })
  @ApiResponse({ status: 200, description: 'Opening balance updated successfully' })
  @ApiResponse({ status: 404, description: 'Opening balance not found' })
  async updateOpeningBalance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOpeningBalanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.openingBalanceService.updateOpeningBalance(user.companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('delete opening-balances')
  @ApiOperation({ summary: 'Delete opening balance' })
  @ApiResponse({ status: 200, description: 'Opening balance deleted successfully' })
  @ApiResponse({ status: 404, description: 'Opening balance not found' })
  async deleteOpeningBalance(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    await this.openingBalanceService.deleteOpeningBalance(user.companyId, id);
    return { success: true };
  }

  @Delete('year/:year')
  @ApiOperation({ summary: 'Clear all opening balances for a year' })
  @ApiResponse({ status: 200, description: 'Opening balances cleared successfully' })
  async clearOpeningBalances(
    @Param('year', ParseIntPipe) year: number,
    @Query('period') period: string,
    @CurrentUser() user: AuthUser,
  ) {
    const periodNum = period ? parseInt(period, 10) : undefined;
    return this.openingBalanceService.clearOpeningBalances(user.companyId, year, periodNum);
  }

  // ============================================================================
  // IMPORT
  // ============================================================================

  @Get('import/template')
  @ApiOperation({ summary: 'Get CSV import template for opening balances' })
  @ApiResponse({ status: 200, description: 'Import template with account list' })
  async getImportTemplate(@CurrentUser() user: AuthUser) {
    return this.openingBalanceService.getImportTemplate(user.companyId);
  }

  @Post('import')
  @RequirePermission('create opening-balances')
  @ApiOperation({ summary: 'Import opening balances from parsed CSV data' })
  @ApiResponse({ status: 200, description: 'Import result' })
  async importOpeningBalances(
    @Body() dto: { year: number; period: number; rows: { accountCode: string; debit: number; credit: number }[] },
    @CurrentUser() user: AuthUser,
  ) {
    return this.openingBalanceService.importOpeningBalances(user.companyId, dto);
  }
}
