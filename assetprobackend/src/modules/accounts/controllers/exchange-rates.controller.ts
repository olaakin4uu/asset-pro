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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ExchangeRatesService } from '../services/exchange-rates.service';
import {
  CreateExchangeRateStandaloneDto,
  UpdateExchangeRateStandaloneDto,
  ExchangeRateStandaloneQueryDto,
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

@ApiTags('Exchange Rates')
@ApiBearerAuth()
@Controller('accounts/exchange-rates')
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireModule('accounts')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new exchange rate' })
  @ApiResponse({ status: 201, description: 'Exchange rate created successfully' })
  @RequireFeature('accounts', 'accounts.multi_currency')
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateExchangeRateStandaloneDto,
  ) {
    return this.exchangeRatesService.create(user.companyId, user.id, dto);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get the latest exchange rate for a currency pair' })
  @ApiResponse({ status: 200, description: 'Latest exchange rate for the pair' })
  @ApiQuery({ name: 'from', type: Number, description: 'Source currency ID' })
  @ApiQuery({ name: 'to', type: Number, description: 'Target currency ID' })
  async getLatest(
    @CurrentUser() user: AuthUser,
    @Query('from', ParseIntPipe) fromCurrencyId: number,
    @Query('to', ParseIntPipe) toCurrencyId: number,
  ) {
    const rate = await this.exchangeRatesService.findLatest(
      user.companyId,
      fromCurrencyId,
      toCurrencyId,
    );

    if (!rate) {
      return { message: 'No active exchange rate found for this currency pair', data: null };
    }

    return rate;
  }

  @Get()
  @ApiOperation({ summary: 'Get all exchange rates' })
  @ApiResponse({ status: 200, description: 'Paginated list of exchange rates' })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ExchangeRateStandaloneQueryDto,
  ) {
    return this.exchangeRatesService.findAll(user.companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exchange rate by ID' })
  @ApiResponse({ status: 200, description: 'Exchange rate details' })
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.exchangeRatesService.findById(user.companyId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an exchange rate' })
  @ApiResponse({ status: 200, description: 'Exchange rate updated successfully' })
  @RequireFeature('accounts', 'accounts.multi_currency')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExchangeRateStandaloneDto,
  ) {
    return this.exchangeRatesService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an exchange rate' })
  @ApiResponse({ status: 200, description: 'Exchange rate deleted successfully' })
  @RequireFeature('accounts', 'accounts.multi_currency')
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.exchangeRatesService.remove(user.companyId, id);
    return { message: 'Exchange rate deleted successfully' };
  }
}
