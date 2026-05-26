import { Controller, Get, Patch, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import * as express from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { FeatureGuard } from '../../../common/guards/feature.guard';
import { RequireModule } from '../../../common/decorators/feature.decorators';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CompanySettingsService, UpdateCompanySettingsDto } from '../services/company-settings.service';

interface AuthUser { id: number; companyId: number; tenantId: string }

@ApiTags('Accounts Settings')
@Controller('accounts/settings')
@UseGuards(JwtAuthGuard, FeatureGuard, PermissionsGuard)
@RequireModule('accounts')
@ApiBearerAuth()
export class CompanySettingsController {
  constructor(private readonly settingsService: CompanySettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get company accounting settings' })
  async get(@CurrentUser() user: AuthUser) {
    return this.settingsService.get(user.companyId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update company accounting settings' })
  async update(@Req() req: express.Request, @CurrentUser() user: AuthUser) {
    // Use req.body directly to bypass NestJS class-transformer entirely.
    // With enableImplicitConversion:true, unset boolean DTO fields get converted
    // to `false`, silently overwriting unrelated settings on every toggle.
    const body = (req.body ?? {}) as Record<string, unknown>;
    const dto: UpdateCompanySettingsDto = {};
    if ('defaultCashAccountId' in body) dto.defaultCashAccountId = (body.defaultCashAccountId as number | null);
    if ('defaultBankAccountId' in body) dto.defaultBankAccountId = (body.defaultBankAccountId as number | null);
    if ('defaultSalesRevenueAccountId' in body) dto.defaultSalesRevenueAccountId = (body.defaultSalesRevenueAccountId as number | null);
    if ('defaultAccountsReceivableAccountId' in body) dto.defaultAccountsReceivableAccountId = (body.defaultAccountsReceivableAccountId as number | null);
    if ('defaultVatOutputAccountId' in body) dto.defaultVatOutputAccountId = (body.defaultVatOutputAccountId as number | null);
    if ('defaultCustomerDepositsAccountId' in body) dto.defaultCustomerDepositsAccountId = (body.defaultCustomerDepositsAccountId as number | null);
    if ('defaultDiscountAllowedAccountId' in body) dto.defaultDiscountAllowedAccountId = (body.defaultDiscountAllowedAccountId as number | null);
    if ('useExpenseApproval' in body) dto.useExpenseApproval = Boolean(body.useExpenseApproval);
    if ('requireJournalApproval' in body) dto.requireJournalApproval = Boolean(body.requireJournalApproval);
    return this.settingsService.update(user.companyId, dto);
  }
}
