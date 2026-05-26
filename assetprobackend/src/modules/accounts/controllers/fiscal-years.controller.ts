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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { FiscalYearService } from '../services/fiscal-year.service';
import {
  CreateFiscalYearDto,
  UpdateFiscalYearDto,
  CloseFiscalYearDto,
  FiscalYearQueryDto,
} from '../dto';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule, RequireFeature } from '../../../common/decorators/feature.decorators';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Fiscal Years')
@ApiBearerAuth()
@Controller('accounts/fiscal-years')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireModule('accounts')
export class FiscalYearsController {
  constructor(private readonly fiscalYearService: FiscalYearService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new fiscal year' })
  @ApiResponse({ status: 201, description: 'Fiscal year created successfully' })
  @RequireFeature('accounts', 'accounts.fiscal_years')
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFiscalYearDto,
  ) {
    return this.fiscalYearService.create(user.companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a fiscal year' })
  @ApiResponse({ status: 200, description: 'Fiscal year updated successfully' })
  @RequireFeature('accounts', 'accounts.fiscal_years')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFiscalYearDto,
  ) {
    return this.fiscalYearService.update(user.companyId, id, dto);
  }

  @Post(':id/set-current')
  @ApiOperation({ summary: 'Set a fiscal year as the current fiscal year' })
  @ApiResponse({ status: 200, description: 'Fiscal year set as current' })
  @RequireFeature('accounts', 'accounts.fiscal_years')
  async setCurrent(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.fiscalYearService.setCurrent(user.companyId, id);
  }

  @Get(':id/checklist')
  @ApiOperation({ summary: 'Get pre-closing checklist for a fiscal year' })
  @ApiResponse({ status: 200, description: 'Year-end checklist with validation results' })
  @RequireFeature('accounts', 'accounts.fiscal_years')
  async getChecklist(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.fiscalYearService.getYearEndChecklist(user.companyId, id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a fiscal year and optionally create opening balances' })
  @ApiResponse({ status: 200, description: 'Fiscal year closed successfully' })
  @RequireFeature('accounts', 'accounts.fiscal_years')
  async close(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseFiscalYearDto,
  ) {
    return this.fiscalYearService.close(user.companyId, id, dto, user.id);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the current fiscal year' })
  @ApiResponse({ status: 200, description: 'Current fiscal year details' })
  async getCurrent(@CurrentUser() user: AuthUser) {
    return this.fiscalYearService.findCurrent(user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fiscal year by ID' })
  @ApiResponse({ status: 200, description: 'Fiscal year details' })
  async getById(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.fiscalYearService.findById(user.companyId, id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all fiscal years' })
  @ApiResponse({ status: 200, description: 'List of fiscal years' })
  async getAll(
    @CurrentUser() user: AuthUser,
    @Query() query: FiscalYearQueryDto,
  ) {
    return this.fiscalYearService.findAll(user.companyId, query);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a fiscal year' })
  @ApiResponse({ status: 200, description: 'Fiscal year deleted successfully' })
  @RequireFeature('accounts', 'accounts.fiscal_years')
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.fiscalYearService.delete(user.companyId, id);
    return { message: 'Fiscal year deleted successfully' };
  }
}
