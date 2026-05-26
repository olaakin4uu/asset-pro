import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermission } from '../../auth/decorators/permissions.decorator';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { TenantOnly } from '../../../common/decorators/tenant.decorators';
import { RequireModule } from '../../../common/decorators/feature.decorators';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../../auth/decorators/current-user.decorator';
import { BranchesService } from '../services/branches.service';
import {
  CreateBranchDto,
  UpdateBranchDto,
  BranchListQueryDto,
  BranchResponseDto,
  BranchListResponseDto,
} from '../dto';

@ApiTags('Core - Branches')
@ApiBearerAuth()
@Controller('core/branches')
@UseGuards(JwtAuthGuard, TenantGuard, FeatureGuard, PermissionsGuard)
@TenantOnly()
@RequireModule('core')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  // ============================================================================
  // CREATE BRANCH
  // ============================================================================
  @Post()
  @RequirePermission('create branches')
  @ApiOperation({ summary: 'Create a new branch' })
  @ApiResponse({ status: 201, description: 'Branch created', type: BranchResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 409, description: 'Branch code already exists' })
  async create(
    @Body() dto: CreateBranchDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<BranchResponseDto> {
    return this.branchesService.create(dto, user.id as number);
  }

  // ============================================================================
  // LIST BRANCHES
  // ============================================================================
  @Get()
  @RequirePermission('view branches')
  @ApiOperation({ summary: 'Get all branches with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of branches', type: BranchListResponseDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(@Query() query: BranchListQueryDto): Promise<BranchListResponseDto> {
    return this.branchesService.findAll(query);
  }

  // ============================================================================
  // GET BRANCHES BY COMPANY
  // ============================================================================
  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get all branches for a company' })
  @ApiParam({ name: 'companyId', type: Number })
  @ApiResponse({ status: 200, description: 'List of branches', type: [BranchResponseDto] })
  async findByCompany(
    @Param('companyId', ParseIntPipe) companyId: number,
  ): Promise<BranchResponseDto[]> {
    return this.branchesService.findByCompany(companyId);
  }

  // ============================================================================
  // GET BRANCH BY ID
  // ============================================================================
  @Get(':id')
  @RequirePermission('view branches')
  @ApiOperation({ summary: 'Get branch by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Branch details', type: BranchResponseDto })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<BranchResponseDto> {
    return this.branchesService.findOne(id);
  }

  // ============================================================================
  // UPDATE BRANCH
  // ============================================================================
  @Patch(':id')
  @RequirePermission('edit branches')
  @ApiOperation({ summary: 'Update branch' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Branch updated', type: BranchResponseDto })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  @ApiResponse({ status: 409, description: 'Branch code already exists' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<BranchResponseDto> {
    return this.branchesService.update(id, dto, user.id as number);
  }

  // ============================================================================
  // DELETE BRANCH
  // ============================================================================
  @Delete(':id')
  @RequirePermission('delete branches')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete branch (soft delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Branch deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete head office or branch with active users' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.branchesService.remove(id);
  }

  // ============================================================================
  // SET AS HEAD OFFICE
  // ============================================================================
  @Post(':id/set-head-office')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set branch as head office' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Branch set as head office', type: BranchResponseDto })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async setAsHeadOffice(@Param('id', ParseIntPipe) id: number): Promise<BranchResponseDto> {
    return this.branchesService.setAsHeadOffice(id);
  }
}
