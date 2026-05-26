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
import { CurrencyService } from '../services/currency.service';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
  CurrencyQueryDto,
  CreateExchangeRateDto,
  UpdateExchangeRateDto,
  ExchangeRateQueryDto,
} from '../dto';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule, RequireFeature } from '../../../common/decorators/feature.decorators';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Currencies')
@ApiBearerAuth()
@Controller('accounts/currencies')
@UseGuards(JwtAuthGuard, FeatureGuard, PermissionsGuard)
@RequireModule('accounts')
export class CurrenciesController {
  constructor(private readonly currencyService: CurrencyService) {}

  // ============================================================================
  // EXCHANGE RATES (static prefix routes must be before :id param route)
  // ============================================================================

  @Post('exchange-rates')
  @ApiOperation({ summary: 'Create a new exchange rate' })
  @ApiResponse({ status: 201, description: 'Exchange rate created successfully' })
  @RequireFeature('accounts', 'accounts.multi_currency')
  async createExchangeRate(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateExchangeRateDto,
  ) {
    return this.currencyService.createExchangeRate(user.companyId, dto);
  }

  @Get('exchange-rates/current')
  @ApiOperation({ summary: 'Get current exchange rate between two currencies' })
  @ApiResponse({ status: 200, description: 'Current exchange rate' })
  async getCurrentExchangeRate(
    @CurrentUser() user: AuthUser,
    @Query('fromCurrencyId', ParseIntPipe) fromCurrencyId: number,
    @Query('toCurrencyId', ParseIntPipe) toCurrencyId: number,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.currencyService.findCurrentRate(
      user.companyId,
      fromCurrencyId,
      toCurrencyId,
      asOfDate,
    );
  }

  @Get('exchange-rates')
  @ApiOperation({ summary: 'Get all exchange rates' })
  @ApiResponse({ status: 200, description: 'List of exchange rates' })
  async getAllExchangeRates(
    @CurrentUser() user: AuthUser,
    @Query() query: ExchangeRateQueryDto,
  ) {
    return this.currencyService.findAllExchangeRates(user.companyId, query);
  }

  @Get('exchange-rates/:id')
  @ApiOperation({ summary: 'Get exchange rate by ID' })
  @ApiResponse({ status: 200, description: 'Exchange rate details' })
  async getExchangeRate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.currencyService.findExchangeRateById(user.companyId, id);
  }

  @Put('exchange-rates/:id')
  @ApiOperation({ summary: 'Update an exchange rate' })
  @ApiResponse({ status: 200, description: 'Exchange rate updated successfully' })
  @RequireFeature('accounts', 'accounts.multi_currency')
  async updateExchangeRate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExchangeRateDto,
  ) {
    return this.currencyService.updateExchangeRate(user.companyId, id, dto);
  }

  @Delete('exchange-rates/:id')
  @ApiOperation({ summary: 'Delete an exchange rate' })
  @ApiResponse({ status: 200, description: 'Exchange rate deleted successfully' })
  @RequireFeature('accounts', 'accounts.multi_currency')
  async deleteExchangeRate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.currencyService.deleteExchangeRate(user.companyId, id);
    return { message: 'Exchange rate deleted successfully' };
  }

  // ============================================================================
  // CURRENCIES (static routes before :id param route)
  // ============================================================================

  @Post()
  @RequirePermission('create currencies')
  @ApiOperation({ summary: 'Create a new currency' })
  @ApiResponse({ status: 201, description: 'Currency created successfully' })
  @RequireFeature('accounts', 'accounts.multi_currency')
  async createCurrency(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCurrencyDto,
  ) {
    return this.currencyService.createCurrency(user.companyId, dto);
  }

  @Get()
  @RequirePermission('view currencies')
  @ApiOperation({ summary: 'Get all currencies' })
  @ApiResponse({ status: 200, description: 'List of currencies' })
  async getAllCurrencies(
    @CurrentUser() user: AuthUser,
    @Query() query: CurrencyQueryDto,
  ) {
    return this.currencyService.findAllCurrencies(user.companyId, query);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get currency by code' })
  @ApiResponse({ status: 200, description: 'Currency details' })
  async getCurrencyByCode(
    @CurrentUser() user: AuthUser,
    @Param('code') code: string,
  ) {
    return this.currencyService.findCurrencyByCode(user.companyId, code);
  }

  @Get(':id')
  @RequirePermission('view currencies')
  @ApiOperation({ summary: 'Get currency by ID' })
  @ApiResponse({ status: 200, description: 'Currency details' })
  async getCurrency(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.currencyService.findCurrencyById(user.companyId, id);
  }

  @Put(':id')
  @RequirePermission('edit currencies')
  @ApiOperation({ summary: 'Update a currency' })
  @ApiResponse({ status: 200, description: 'Currency updated successfully' })
  @RequireFeature('accounts', 'accounts.multi_currency')
  async updateCurrency(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCurrencyDto,
  ) {
    return this.currencyService.updateCurrency(user.companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('delete currencies')
  @ApiOperation({ summary: 'Delete a currency' })
  @ApiResponse({ status: 200, description: 'Currency deleted successfully' })
  @RequireFeature('accounts', 'accounts.multi_currency')
  async deleteCurrency(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.currencyService.deleteCurrency(user.companyId, id);
    return { message: 'Currency deleted successfully' };
  }
}
