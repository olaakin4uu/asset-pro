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
import { WhtService } from '../services/wht.service';
import { CreateWhtDto, UpdateWhtDto, WhtQueryDto, CalculateWhtDto } from '../dto';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule, RequireFeature } from '../../../common/decorators/feature.decorators';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('WHT (Withholding Tax)')
@ApiBearerAuth()
@Controller('accounts/wht')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireModule('accounts')
export class WhtController {
  constructor(private readonly whtService: WhtService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new WHT rate' })
  @ApiResponse({ status: 201, description: 'WHT rate created successfully' })
  @RequireFeature('accounts', 'accounts.wht_management')
  async createWht(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWhtDto,
  ) {
    return this.whtService.createWht(user.companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a WHT rate' })
  @ApiResponse({ status: 200, description: 'WHT rate updated successfully' })
  @RequireFeature('accounts', 'accounts.wht_management')
  async updateWht(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWhtDto,
  ) {
    return this.whtService.updateWht(user.companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a WHT rate' })
  @ApiResponse({ status: 200, description: 'WHT rate deleted successfully' })
  @RequireFeature('accounts', 'accounts.wht_management')
  async deleteWht(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.whtService.deleteWht(user.companyId, id);
    return { message: 'WHT rate deleted successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get WHT rate by ID' })
  @ApiResponse({ status: 200, description: 'WHT rate details' })
  async getWht(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.whtService.findWhtById(user.companyId, id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all WHT rates' })
  @ApiResponse({ status: 200, description: 'List of WHT rates' })
  async getAllWhts(
    @CurrentUser() user: AuthUser,
    @Query() query: WhtQueryDto,
  ) {
    return this.whtService.findAllWhts(user.companyId, query);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get WHT rate by code' })
  @ApiResponse({ status: 200, description: 'WHT rate details' })
  async getWhtByCode(
    @CurrentUser() user: AuthUser,
    @Param('code') code: string,
  ) {
    return this.whtService.findWhtByCode(user.companyId, code);
  }

  @Get('active/list')
  @ApiOperation({ summary: 'Get active WHT rates for dropdowns' })
  @ApiResponse({ status: 200, description: 'List of active WHT rates' })
  async getActiveWhts(@CurrentUser() user: AuthUser) {
    return this.whtService.getActiveWhts(user.companyId);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate WHT for an amount' })
  @ApiResponse({ status: 200, description: 'WHT calculation result' })
  async calculateWht(
    @CurrentUser() user: AuthUser,
    @Body() dto: CalculateWhtDto,
  ) {
    return this.whtService.calculateWht(user.companyId, dto.whtId, dto.amount);
  }
}
