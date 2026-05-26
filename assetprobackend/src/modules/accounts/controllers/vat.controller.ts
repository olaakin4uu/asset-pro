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
import { VatService } from '../services/vat.service';
import { CreateVatDto, UpdateVatDto, VatQueryDto } from '../dto';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule, RequireFeature } from '../../../common/decorators/feature.decorators';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('VAT')
@ApiBearerAuth()
@Controller('accounts/vat')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireModule('accounts')
export class VatController {
  constructor(private readonly vatService: VatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new VAT rate' })
  @ApiResponse({ status: 201, description: 'VAT rate created successfully' })
  @RequireFeature('accounts', 'accounts.vat_management')
  async createVat(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateVatDto,
  ) {
    return this.vatService.createVat(user.companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a VAT rate' })
  @ApiResponse({ status: 200, description: 'VAT rate updated successfully' })
  @RequireFeature('accounts', 'accounts.vat_management')
  async updateVat(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVatDto,
  ) {
    return this.vatService.updateVat(user.companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a VAT rate' })
  @ApiResponse({ status: 200, description: 'VAT rate deleted successfully' })
  @RequireFeature('accounts', 'accounts.vat_management')
  async deleteVat(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.vatService.deleteVat(user.companyId, id);
    return { message: 'VAT rate deleted successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get VAT rate by ID' })
  @ApiResponse({ status: 200, description: 'VAT rate details' })
  async getVat(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.vatService.findVatById(user.companyId, id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all VAT rates' })
  @ApiResponse({ status: 200, description: 'List of VAT rates' })
  async getAllVats(
    @CurrentUser() user: AuthUser,
    @Query() query: VatQueryDto,
  ) {
    return this.vatService.findAllVats(user.companyId, query);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get VAT rate by code' })
  @ApiResponse({ status: 200, description: 'VAT rate details' })
  async getVatByCode(
    @CurrentUser() user: AuthUser,
    @Param('code') code: string,
  ) {
    return this.vatService.findVatByCode(user.companyId, code);
  }

  @Get('active/list')
  @ApiOperation({ summary: 'Get active VAT rates for dropdowns' })
  @ApiResponse({ status: 200, description: 'List of active VAT rates' })
  async getActiveVats(@CurrentUser() user: AuthUser) {
    return this.vatService.getActiveVats(user.companyId);
  }
}
