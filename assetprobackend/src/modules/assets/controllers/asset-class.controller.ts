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
import { AssetClassService } from '../services';
import { CreateAssetClassDto, UpdateAssetClassDto, AssetClassQueryDto } from '../dto';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Assets - Asset Classes')
@ApiBearerAuth()
@Controller('assets/asset-classes')
@UseGuards(JwtAuthGuard)
export class AssetClassController {
  constructor(private readonly assetClassService: AssetClassService) {}

  // ============================================================================
  // STATS (must be before :id route)
  // ============================================================================

  @Get('stats')
  @ApiOperation({ summary: 'Get asset class statistics' })
  @ApiResponse({ status: 200, description: 'Asset class statistics' })
  async getStats(@CurrentUser() user: AuthUser) {
    return this.assetClassService.getStats(user.companyId);
  }

  // ============================================================================
  // CRUD
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create a new asset class' })
  @ApiResponse({ status: 201, description: 'Asset class created successfully' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssetClassDto) {
    return this.assetClassService.create(user.companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all asset classes with optional filters' })
  @ApiResponse({ status: 200, description: 'List of asset classes' })
  async findAll(@CurrentUser() user: AuthUser, @Query() query: AssetClassQueryDto) {
    return this.assetClassService.findAll(user.companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset class by ID' })
  @ApiResponse({ status: 200, description: 'Asset class details' })
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.assetClassService.findById(user.companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an asset class' })
  @ApiResponse({ status: 200, description: 'Asset class updated successfully' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssetClassDto,
  ) {
    return this.assetClassService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an asset class' })
  @ApiResponse({ status: 200, description: 'Asset class deleted successfully' })
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.assetClassService.delete(user.companyId, id);
    return { message: 'Asset class deleted successfully' };
  }
}
