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
import { DisposalService } from '../services';
import {
  CreateAssetDisposalDto,
  UpdateAssetDisposalDto,
  AssetDisposalQueryDto,
  RejectDisposalDto,
  CalculateGainLossDto,
} from '../dto';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Assets - Disposals')
@ApiBearerAuth()
@Controller('assets/disposals')
@UseGuards(JwtAuthGuard)
export class DisposalController {
  constructor(private readonly disposalService: DisposalService) {}

  // ============================================================================
  // STATS & SPECIAL ROUTES (must be before :id route)
  // ============================================================================

  @Get('stats')
  @ApiOperation({ summary: 'Get disposal statistics' })
  @ApiResponse({ status: 200, description: 'Disposal statistics' })
  async getStats(@CurrentUser() user: AuthUser) {
    return this.disposalService.getStats(user.companyId);
  }

  @Post('calculate-gain-loss')
  @ApiOperation({ summary: 'Calculate gain/loss for disposal' })
  @ApiResponse({ status: 200, description: 'Calculated gain/loss' })
  async calculateGainLoss(
    @CurrentUser() user: AuthUser,
    @Body() dto: CalculateGainLossDto,
  ) {
    return this.disposalService.calculateGainLoss(
      user.companyId,
      dto.assetId,
      dto.disposalProceeds,
      dto.disposalCosts,
    );
  }

  // ============================================================================
  // CRUD
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create a new disposal' })
  @ApiResponse({ status: 201, description: 'Disposal created successfully' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssetDisposalDto) {
    return this.disposalService.create(user.companyId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all disposals with optional filters' })
  @ApiResponse({ status: 200, description: 'List of disposals' })
  async findAll(@CurrentUser() user: AuthUser, @Query() query: AssetDisposalQueryDto) {
    return this.disposalService.findAll(user.companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get disposal by ID' })
  @ApiResponse({ status: 200, description: 'Disposal details' })
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.disposalService.findById(user.companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a disposal' })
  @ApiResponse({ status: 200, description: 'Disposal updated successfully' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssetDisposalDto,
  ) {
    return this.disposalService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a disposal' })
  @ApiResponse({ status: 200, description: 'Disposal deleted successfully' })
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.disposalService.delete(user.companyId, id);
    return { message: 'Disposal deleted successfully' };
  }

  // ============================================================================
  // WORKFLOW
  // ============================================================================

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit disposal for approval' })
  @ApiResponse({ status: 200, description: 'Disposal submitted for approval' })
  async submit(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.disposalService.submit(user.companyId, id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a disposal' })
  @ApiResponse({ status: 200, description: 'Disposal approved' })
  async approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.disposalService.approve(user.companyId, id, user.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a disposal' })
  @ApiResponse({ status: 200, description: 'Disposal rejected' })
  async reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectDisposalDto,
  ) {
    return this.disposalService.reject(user.companyId, id, dto.reason);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a disposal' })
  @ApiResponse({ status: 200, description: 'Disposal completed' })
  async complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.disposalService.complete(user.companyId, id, user.id);
  }
}
