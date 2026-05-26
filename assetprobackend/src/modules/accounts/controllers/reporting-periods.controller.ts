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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ReportingPeriodsService } from '../services/reporting-periods.service';
import {
  CreateReportingPeriodDto,
  UpdateReportingPeriodDto,
  ReportingPeriodQueryDto,
} from '../dto';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule, RequireFeature } from '../../../common/decorators/feature.decorators';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Reporting Periods')
@ApiBearerAuth()
@Controller('accounts/reporting-periods')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireModule('accounts')
export class ReportingPeriodsController {
  constructor(
    private readonly reportingPeriodsService: ReportingPeriodsService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  /**
   * Resolve the IFRS entity ID from the user's current company.
   * Reporting periods are scoped to IfrsEntity, not Company directly.
   */
  private async resolveEntityId(companyId: number): Promise<number> {
    const company = await this.tenantPrisma.queryOne<{ entityId: number | null }>(
      `SELECT "entityId" FROM companies WHERE id = $1`,
      [companyId],
    );

    if (!company?.entityId) {
      throw new BadRequestException(
        'Company does not have an IFRS entity configured. Please set up an IFRS entity first.',
      );
    }

    return company.entityId;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new reporting period' })
  @ApiResponse({ status: 201, description: 'Reporting period created successfully' })
  @RequireFeature('accounts', 'accounts.reporting_periods')
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReportingPeriodDto,
  ) {
    const entityId = await this.resolveEntityId(user.companyId);
    return this.reportingPeriodsService.create(entityId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reporting periods' })
  @ApiResponse({ status: 200, description: 'Paginated list of reporting periods' })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ReportingPeriodQueryDto,
  ) {
    const entityId = await this.resolveEntityId(user.companyId);
    return this.reportingPeriodsService.findAll(entityId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reporting period by ID' })
  @ApiResponse({ status: 200, description: 'Reporting period details' })
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const entityId = await this.resolveEntityId(user.companyId);
    return this.reportingPeriodsService.findById(entityId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a reporting period' })
  @ApiResponse({ status: 200, description: 'Reporting period updated successfully' })
  @RequireFeature('accounts', 'accounts.reporting_periods')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportingPeriodDto,
  ) {
    const entityId = await this.resolveEntityId(user.companyId);
    return this.reportingPeriodsService.update(entityId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a reporting period' })
  @ApiResponse({ status: 200, description: 'Reporting period deleted successfully' })
  @RequireFeature('accounts', 'accounts.reporting_periods')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const entityId = await this.resolveEntityId(user.companyId);
    await this.reportingPeriodsService.remove(entityId, id);
    return { message: 'Reporting period deleted successfully' };
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a reporting period' })
  @ApiResponse({ status: 200, description: 'Reporting period closed successfully' })
  @RequireFeature('accounts', 'accounts.reporting_periods')
  async close(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const entityId = await this.resolveEntityId(user.companyId);
    return this.reportingPeriodsService.closePeriod(entityId, id);
  }

  @Post(':id/reopen')
  @ApiOperation({ summary: 'Reopen a closed reporting period' })
  @ApiResponse({ status: 200, description: 'Reporting period reopened successfully' })
  @RequireFeature('accounts', 'accounts.reporting_periods')
  async reopen(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const entityId = await this.resolveEntityId(user.companyId);
    return this.reportingPeriodsService.reopenPeriod(entityId, id);
  }
}
