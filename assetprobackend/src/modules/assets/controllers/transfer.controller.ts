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
import { TransferService } from '../services';
import {
  CreateAssetTransferDto,
  UpdateAssetTransferDto,
  AssetTransferQueryDto,
  RejectTransferDto,
} from '../dto';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Assets - Transfers')
@ApiBearerAuth()
@Controller('assets/transfers')
@UseGuards(JwtAuthGuard)
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  // ============================================================================
  // STATS (must be before :id route)
  // ============================================================================

  @Get('stats')
  @ApiOperation({ summary: 'Get transfer statistics' })
  @ApiResponse({ status: 200, description: 'Transfer statistics' })
  async getStats(@CurrentUser() user: AuthUser) {
    return this.transferService.getStats(user.companyId);
  }

  // ============================================================================
  // CRUD
  // ============================================================================

  @Post()
  @ApiOperation({ summary: 'Create a new transfer' })
  @ApiResponse({ status: 201, description: 'Transfer created successfully' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssetTransferDto) {
    return this.transferService.create(user.companyId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transfers with optional filters' })
  @ApiResponse({ status: 200, description: 'List of transfers' })
  async findAll(@CurrentUser() user: AuthUser, @Query() query: AssetTransferQueryDto) {
    return this.transferService.findAll(user.companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transfer by ID' })
  @ApiResponse({ status: 200, description: 'Transfer details' })
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transferService.findById(user.companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a transfer' })
  @ApiResponse({ status: 200, description: 'Transfer updated successfully' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssetTransferDto,
  ) {
    return this.transferService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transfer' })
  @ApiResponse({ status: 200, description: 'Transfer deleted successfully' })
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.transferService.delete(user.companyId, id);
    return { message: 'Transfer deleted successfully' };
  }

  // ============================================================================
  // WORKFLOW
  // ============================================================================

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit transfer for approval' })
  @ApiResponse({ status: 200, description: 'Transfer submitted for approval' })
  async submit(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transferService.submit(user.companyId, id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a transfer' })
  @ApiResponse({ status: 200, description: 'Transfer approved' })
  async approve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transferService.approve(user.companyId, id, user.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a transfer' })
  @ApiResponse({ status: 200, description: 'Transfer rejected' })
  async reject(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectTransferDto,
  ) {
    return this.transferService.reject(user.companyId, id, dto.reason);
  }

  @Post(':id/dispatch')
  @ApiOperation({ summary: 'Dispatch a transfer' })
  @ApiResponse({ status: 200, description: 'Transfer dispatched' })
  async dispatch(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transferService.dispatch(user.companyId, id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete a transfer' })
  @ApiResponse({ status: 200, description: 'Transfer completed' })
  async complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transferService.complete(user.companyId, id, user.id);
  }
}
