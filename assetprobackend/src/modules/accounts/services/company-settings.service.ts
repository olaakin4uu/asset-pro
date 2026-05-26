import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';

export interface CompanySettings {
  id: number;
  companyId: number;
  defaultCashAccountId: number | null;
  defaultBankAccountId: number | null;
  defaultSalesRevenueAccountId: number | null;
  defaultAccountsReceivableAccountId: number | null;
  defaultVatOutputAccountId: number | null;
  defaultCustomerDepositsAccountId: number | null;
  defaultDiscountAllowedAccountId: number | null;
  useExpenseApproval: boolean;
  requireJournalApproval: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateCompanySettingsDto {
  defaultCashAccountId?: number | null;
  defaultBankAccountId?: number | null;
  defaultSalesRevenueAccountId?: number | null;
  defaultAccountsReceivableAccountId?: number | null;
  defaultVatOutputAccountId?: number | null;
  defaultCustomerDepositsAccountId?: number | null;
  defaultDiscountAllowedAccountId?: number | null;
  useExpenseApproval?: boolean;
  requireJournalApproval?: boolean;
  showFormalMemo?: boolean;
}

@Injectable()
export class CompanySettingsService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  async get(companyId: number): Promise<CompanySettings> {
    const row = await this.tenantPrisma.queryOne<CompanySettings>(
      `SELECT * FROM company_settings WHERE "companyId" = $1`,
      [companyId],
    );

    if (!row) {
      return {
        id: 0,
        companyId,
        defaultCashAccountId: null,
        defaultBankAccountId: null,
        defaultSalesRevenueAccountId: null,
        defaultAccountsReceivableAccountId: null,
        defaultVatOutputAccountId: null,
        defaultCustomerDepositsAccountId: null,
        defaultDiscountAllowedAccountId: null,
        useExpenseApproval: true,
        requireJournalApproval: false,
      };
    }

    return {
      ...row,
      useExpenseApproval: row.useExpenseApproval ?? true,
      requireJournalApproval: row.requireJournalApproval ?? false,
    };
  }

  async update(companyId: number, dto: UpdateCompanySettingsDto): Promise<CompanySettings> {
    const existing = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT id FROM company_settings WHERE "companyId" = $1`,
      [companyId],
    );

    if (!existing) {
      await this.tenantPrisma.query(
        `INSERT INTO company_settings
         ("companyId", "defaultCashAccountId", "defaultBankAccountId",
          "defaultSalesRevenueAccountId", "defaultAccountsReceivableAccountId",
          "defaultVatOutputAccountId", "defaultCustomerDepositsAccountId",
          "defaultDiscountAllowedAccountId", "useExpenseApproval", "requireJournalApproval", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
        [
          companyId,
          dto.defaultCashAccountId ?? null,
          dto.defaultBankAccountId ?? null,
          dto.defaultSalesRevenueAccountId ?? null,
          dto.defaultAccountsReceivableAccountId ?? null,
          dto.defaultVatOutputAccountId ?? null,
          dto.defaultCustomerDepositsAccountId ?? null,
          dto.defaultDiscountAllowedAccountId ?? null,
          dto.useExpenseApproval ?? true,
          dto.requireJournalApproval ?? false,
        ],
      );
    } else {
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const addField = (col: string, val: unknown) => {
        fields.push(`"${col}" = $${idx++}`);
        values.push(val);
      };

      if (dto.defaultCashAccountId !== undefined) addField('defaultCashAccountId', dto.defaultCashAccountId ?? null);
      if (dto.defaultBankAccountId !== undefined) addField('defaultBankAccountId', dto.defaultBankAccountId ?? null);
      if (dto.defaultSalesRevenueAccountId !== undefined) addField('defaultSalesRevenueAccountId', dto.defaultSalesRevenueAccountId ?? null);
      if (dto.defaultAccountsReceivableAccountId !== undefined) addField('defaultAccountsReceivableAccountId', dto.defaultAccountsReceivableAccountId ?? null);
      if (dto.defaultVatOutputAccountId !== undefined) addField('defaultVatOutputAccountId', dto.defaultVatOutputAccountId ?? null);
      if (dto.defaultCustomerDepositsAccountId !== undefined) addField('defaultCustomerDepositsAccountId', dto.defaultCustomerDepositsAccountId ?? null);
      if (dto.defaultDiscountAllowedAccountId !== undefined) addField('defaultDiscountAllowedAccountId', dto.defaultDiscountAllowedAccountId ?? null);
      if (dto.useExpenseApproval != null) addField('useExpenseApproval', dto.useExpenseApproval);
      if (dto.requireJournalApproval != null) addField('requireJournalApproval', dto.requireJournalApproval);

      if (fields.length > 0) {
        fields.push(`"updatedAt" = NOW()`);
        values.push(existing.id);
        await this.tenantPrisma.query(
          `UPDATE company_settings SET ${fields.join(', ')} WHERE id = $${idx}`,
          values,
        );
      }
    }

    return this.get(companyId);
  }
}
