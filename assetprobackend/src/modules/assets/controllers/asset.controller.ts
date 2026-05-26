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
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AssetService } from '../services';
import { CreateAssetDto, UpdateAssetDto, AssetQueryDto } from '../dto';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  // ============================================================================
  // STATS (must be before :id route)
  // ============================================================================

  @Get('stats')
  @ApiOperation({ summary: 'Get asset statistics' })
  @ApiResponse({ status: 200, description: 'Asset statistics' })
  async getStats(@CurrentUser() user: AuthUser) {
    return this.assetService.getStats(user.companyId);
  }

  // ============================================================================
  // CRUD
  // ============================================================================

  @Post()
  @RequirePermission('create assets')
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiResponse({ status: 201, description: 'Asset created successfully' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssetDto) {
    return this.assetService.create(user.companyId, dto, user.id);
  }

  @Get()
  @RequirePermission('view assets')
  @ApiOperation({ summary: 'Get all assets with optional filters' })
  @ApiResponse({ status: 200, description: 'List of assets' })
  async findAll(@CurrentUser() user: AuthUser, @Query() query: AssetQueryDto) {
    return this.assetService.findAll(user.companyId, query);
  }

  @Get(':id')
  @RequirePermission('view assets')
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiResponse({ status: 200, description: 'Asset details' })
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.assetService.findById(user.companyId, id);
  }

  @Put(':id')
  @RequirePermission('edit assets')
  @ApiOperation({ summary: 'Update an asset' })
  @ApiResponse({ status: 200, description: 'Asset updated successfully' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('delete assets')
  @ApiOperation({ summary: 'Delete an asset' })
  @ApiResponse({ status: 200, description: 'Asset deleted successfully' })
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.assetService.delete(user.companyId, id);
    return { message: 'Asset deleted successfully' };
  }

  // ============================================================================
  // RELATED RESOURCES
  // ============================================================================

  @Get(':id/depreciations')
  @ApiOperation({ summary: 'Get depreciation history for an asset' })
  @ApiResponse({ status: 200, description: 'Asset depreciation history' })
  async getDepreciations(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.assetService.getDepreciations(user.companyId, id);
    return { data };
  }

  @Get(':id/maintenances')
  @ApiOperation({ summary: 'Get maintenance history for an asset' })
  @ApiResponse({ status: 200, description: 'Asset maintenance history' })
  async getMaintenances(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.assetService.getMaintenances(user.companyId, id);
    return { data };
  }

  @Get(':id/transfers')
  @ApiOperation({ summary: 'Get transfer history for an asset' })
  @ApiResponse({ status: 200, description: 'Asset transfer history' })
  async getTransfers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.assetService.getTransfers(user.companyId, id);
    return { data };
  }

  @Get(':id/disposals')
  @ApiOperation({ summary: 'Get disposal history for an asset' })
  @ApiResponse({ status: 200, description: 'Asset disposal history' })
  async getDisposals(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.assetService.getDisposals(user.companyId, id);
    return { data };
  }
}
