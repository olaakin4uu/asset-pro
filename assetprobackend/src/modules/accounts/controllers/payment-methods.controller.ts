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
import { PaymentMethodsService } from '../services/payment-methods.service';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto, PaymentMethodQueryDto } from '../dto';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule, RequireFeature } from '../../../common/decorators/feature.decorators';

interface AuthUser {
  id: number;
  tenantId: string;
  tenantSlug: string;
  companyId: number;
  branchId: number | null;
}

@ApiTags('Payment Methods')
@ApiBearerAuth()
@Controller('accounts/payment-methods')
@UseGuards(JwtAuthGuard, FeatureGuard, PermissionsGuard)
@RequireModule('accounts')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Post()
  @RequirePermission('create payment-methods')
  @ApiOperation({ summary: 'Create a new payment method' })
  @ApiResponse({ status: 201, description: 'Payment method created successfully' })
  @RequireFeature('accounts', 'accounts.payment_methods')
  async createPaymentMethod(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.createPaymentMethod(user.companyId, dto);
  }

  @Put(':id')
  @RequirePermission('edit payment-methods')
  @ApiOperation({ summary: 'Update a payment method' })
  @ApiResponse({ status: 200, description: 'Payment method updated successfully' })
  @RequireFeature('accounts', 'accounts.payment_methods')
  async updatePaymentMethod(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.updatePaymentMethod(user.companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('delete payment-methods')
  @ApiOperation({ summary: 'Delete a payment method' })
  @ApiResponse({ status: 200, description: 'Payment method deleted successfully' })
  @RequireFeature('accounts', 'accounts.payment_methods')
  async deletePaymentMethod(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.paymentMethodsService.deletePaymentMethod(user.companyId, id);
    return { message: 'Payment method deleted successfully' };
  }

  @Get(':id')
  @RequirePermission('view payment-methods')
  @ApiOperation({ summary: 'Get payment method by ID' })
  @ApiResponse({ status: 200, description: 'Payment method details' })
  async getPaymentMethod(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.paymentMethodsService.findPaymentMethodById(user.companyId, id);
  }

  @Get()
  @RequirePermission('view payment-methods')
  @ApiOperation({ summary: 'Get all payment methods' })
  @ApiResponse({ status: 200, description: 'List of payment methods' })
  async getAllPaymentMethods(
    @CurrentUser() user: AuthUser,
    @Query() query: PaymentMethodQueryDto,
  ) {
    return this.paymentMethodsService.findAllPaymentMethods(user.companyId, query);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get payment method by code' })
  @ApiResponse({ status: 200, description: 'Payment method details' })
  async getPaymentMethodByCode(
    @CurrentUser() user: AuthUser,
    @Param('code') code: string,
  ) {
    return this.paymentMethodsService.findPaymentMethodByCode(user.companyId, code);
  }

  @Get('active/list')
  @ApiOperation({ summary: 'Get active payment methods for dropdowns' })
  @ApiResponse({ status: 200, description: 'List of active payment methods' })
  async getActivePaymentMethods(@CurrentUser() user: AuthUser) {
    return this.paymentMethodsService.getActivePaymentMethods(user.companyId);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get payment methods by type' })
  @ApiResponse({ status: 200, description: 'List of payment methods by type' })
  async getPaymentMethodsByType(
    @CurrentUser() user: AuthUser,
    @Param('type') type: string,
  ) {
    return this.paymentMethodsService.getPaymentMethodsByType(user.companyId, type);
  }
}
