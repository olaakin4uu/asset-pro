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
import { DepreciationService } from '../services';
import {
  CreateAssetDepreciationDto,
  UpdateAssetDepreciationDto,
  AssetDepreciationQueryDto,
  BulkPostDepreciationDto,
  CalculateDepreciationDto,
  RunDepreciationDto,
} from '../dto';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Assets - Depreciation')
@ApiBearerAuth()
@Controller('assets/depreciations')
@UseGuards(JwtAuthGuard)
export class DepreciationController {
  constructor(private readonly depreciationService: DepreciationService) {}

  // ============================================================================
  // STATS & SPECIAL ROUTES (must be before :id route)
  // ============================================================================

  @Get('stats')
  @ApiOperation({ summary: 'Get depreciation statistics' })
  @ApiResponse({ status: 200, description: 'Depreciation statistics' })
  async getStats(@CurrentUser() user: AuthUser) {
    return this.depreciationService.getStats(user.companyId);
  }

  @Post('bulk-post')
  @ApiOperation({ summary: 'Bulk post depreciations to GL' })
  @ApiResponse({ status: 200, description: 'Bulk post results' })
  async bulkPost(
    @CurrentUser() user: AuthUser,
    @Body() dto: BulkPostDepreciationDto,
  ) {
    return this.depreciationService.bulkPost(user.companyId, dto.ids, user.id);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate depreciation for an asset' })
  @ApiResponse({ status: 200, description: 'Calculated depreciation amount' })
  async calculate(
    @CurrentUser() user: AuthUser,
    @Body() dto: CalculateDepreciationDto,
  ) {
    return this.depreciationService.calculate(user.companyId, dto.assetId, dto.date);
  }

  @Post('run')
  @ApiOperation({ summary: 'Run depreciation for a fiscal period' })
  @ApiResponse({ status: 200, description: 'Run depreciation results' })
  async runForPeriod(
    @CurrentUser() user: AuthUser,
    @Body() dto: RunDepreciationDto,
  ) {
    return this.depreciationService.runForPeriod(
      user.companyId,
      dto.fiscalYear,
      dto.fiscalPeriod,
      user.id,
    );
  }

  // ============================================================================
  // CRUD
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create a new depreciation entry' })
  @ApiResponse({ status: 201, description: 'Depreciation created successfully' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssetDepreciationDto) {
    return this.depreciationService.create(user.companyId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all depreciations with optional filters' })
  @ApiResponse({ status: 200, description: 'List of depreciations' })
  async findAll(@CurrentUser() user: AuthUser, @Query() query: AssetDepreciationQueryDto) {
    return this.depreciationService.findAll(user.companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get depreciation by ID' })
  @ApiResponse({ status: 200, description: 'Depreciation details' })
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.depreciationService.findById(user.companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a depreciation entry' })
  @ApiResponse({ status: 200, description: 'Depreciation updated successfully' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssetDepreciationDto,
  ) {
    return this.depreciationService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a depreciation entry' })
  @ApiResponse({ status: 200, description: 'Depreciation deleted successfully' })
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.depreciationService.delete(user.companyId, id);
    return { message: 'Depreciation deleted successfully' };
  }

  // ============================================================================
  // WORKFLOW
  // ============================================================================

  @Post(':id/post')
  @ApiOperation({ summary: 'Post depreciation to GL' })
  @ApiResponse({ status: 200, description: 'Depreciation posted successfully' })
  async post(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.depreciationService.post(user.companyId, id, user.id);
  }
}
