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
import { MaintenanceService } from '../services';
import {
  CreateAssetMaintenanceDto,
  UpdateAssetMaintenanceDto,
  AssetMaintenanceQueryDto,
  HoldMaintenanceDto,
  UpcomingMaintenanceQueryDto,
} from '../dto';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Assets - Maintenance')
@ApiBearerAuth()
@Controller('assets/maintenances')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  // ============================================================================
  // STATS & SPECIAL ROUTES (must be before :id route)
  // ============================================================================

  @Get('stats')
  @ApiOperation({ summary: 'Get maintenance statistics' })
  @ApiResponse({ status: 200, description: 'Maintenance statistics' })
  async getStats(@CurrentUser() user: AuthUser) {
    return this.maintenanceService.getStats(user.companyId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming maintenance' })
  @ApiResponse({ status: 200, description: 'List of upcoming maintenance' })
  async getUpcoming(
    @CurrentUser() user: AuthUser,
    @Query() query: UpcomingMaintenanceQueryDto,
  ) {
    const data = await this.maintenanceService.getUpcoming(user.companyId, query.days);
    return { data };
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue maintenance' })
  @ApiResponse({ status: 200, description: 'List of overdue maintenance' })
  async getOverdue(@CurrentUser() user: AuthUser) {
    const data = await this.maintenanceService.getOverdue(user.companyId);
    return { data };
  }

  // ============================================================================
  // CRUD
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create a new maintenance' })
  @ApiResponse({ status: 201, description: 'Maintenance created successfully' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssetMaintenanceDto) {
    return this.maintenanceService.create(user.companyId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all maintenance records with optional filters' })
  @ApiResponse({ status: 200, description: 'List of maintenance records' })
  async findAll(@CurrentUser() user: AuthUser, @Query() query: AssetMaintenanceQueryDto) {
    return this.maintenanceService.findAll(user.companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get maintenance by ID' })
  @ApiResponse({ status: 200, description: 'Maintenance details' })
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.maintenanceService.findById(user.companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a maintenance record' })
  @ApiResponse({ status: 200, description: 'Maintenance updated successfully' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssetMaintenanceDto,
  ) {
    return this.maintenanceService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a maintenance record' })
  @ApiResponse({ status: 200, description: 'Maintenance deleted successfully' })
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.maintenanceService.delete(user.companyId, id);
    return { message: 'Maintenance deleted successfully' };
  }

  // ============================================================================
  // WORKFLOW
  // ============================================================================

  @Post(':id/start')
  @ApiOperation({ summary: 'Start maintenance' })
  @ApiResponse({ status: 200, description: 'Maintenance started' })
  async start(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.maintenanceService.start(user.companyId, id);
  }

  @Post(':id/hold')
  @ApiOperation({ summary: 'Put maintenance on hold' })
  @ApiResponse({ status: 200, description: 'Maintenance put on hold' })
  async hold(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HoldMaintenanceDto,
  ) {
    return this.maintenanceService.hold(user.companyId, id, dto.reason);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume maintenance' })
  @ApiResponse({ status: 200, description: 'Maintenance resumed' })
  async resume(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.maintenanceService.resume(user.companyId, id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete maintenance' })
  @ApiResponse({ status: 200, description: 'Maintenance completed' })
  async complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: UpdateAssetMaintenanceDto,
  ) {
    return this.maintenanceService.complete(user.companyId, id, user.id, dto);
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post maintenance cost to GL' })
  @ApiResponse({ status: 200, description: 'Maintenance cost posted' })
  async post(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.maintenanceService.post(user.companyId, id, user.id);
  }
}
