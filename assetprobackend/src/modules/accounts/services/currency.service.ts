import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
  CurrencyQueryDto,
  CreateExchangeRateDto,
  UpdateExchangeRateDto,
  ExchangeRateQueryDto,
} from '../dto';

export interface Currency {
  id: number;
  entityId: number;
  name: string;
  code: string;
  symbol: string | null;
  decimalPlaces: number;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExchangeRate {
  id: number;
  fromCurrencyId: number;
  toCurrencyId: number;
  rate: number;
  validFrom: Date;
  validTo: Date | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
  fromCurrency?: Currency;
  toCurrency?: Currency;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  /**
   * Resolve the IFRS entityId from a companyId.
   * If the company's own entity has no currencies, falls back to entityId=1
   * (the primary entity seeded at provisioning time) so multi-company tenants
   * where only the first entity was seeded still get a currency list.
   */
  private async resolveEntityId(companyId: number): Promise<number> {
    const row = await this.tenantPrisma.queryOne<{ entityId: number | null }>(
      `SELECT "entityId" FROM companies WHERE id = $1`,
      [companyId],
    );
    const entityId = row?.entityId ?? 1;
    // Verify this entityId has currencies; fall back to 1 if not
    const hasCurrencies = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ifrs_currencies WHERE "entityId" = $1 AND "deletedAt" IS NULL`,
      [entityId],
    );
    if (parseInt(hasCurrencies?.count || '0') > 0) return entityId;
    return 1;
  }

  // ============================================================================
  // CURRENCIES
  // ============================================================================

  async createCurrency(companyId: number, dto: CreateCurrencyDto): Promise<Currency> {
    const entityId = await this.resolveEntityId(companyId);
    // Purge stale soft-deleted records with same code to prevent unique constraint violation
    await this.tenantPrisma.query(
      `DELETE FROM ifrs_currencies WHERE "entityId" = $1 AND code = $2 AND "deletedAt" IS NOT NULL`,
      [entityId, dto.code.toUpperCase()],
    );

    // Check for duplicate code
    const existing = await this.tenantPrisma.queryOne<Currency>(
      `SELECT * FROM ifrs_currencies WHERE "entityId" = $1 AND code = $2 AND "deletedAt" IS NULL`,
      [entityId, dto.code.toUpperCase()],
    );

    if (existing) {
      throw new BadRequestException(`Currency code ${dto.code} already exists`);
    }

    return this.tenantPrisma.insert<Currency>('ifrs_currencies', {
      entityId,
      name: dto.name,
      code: dto.code.toUpperCase(),
      symbol: dto.symbol || null,
      decimalPlaces: dto.decimalPlaces ?? 2,
      isActive: dto.isActive ?? true,
    });
  }

  async updateCurrency(companyId: number, currencyId: number, dto: UpdateCurrencyDto): Promise<Currency> {
    const entityId = await this.resolveEntityId(companyId);
    const currency = await this.findCurrencyById(entityId, currencyId);

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.symbol !== undefined) updateData.symbol = dto.symbol;
    if (dto.decimalPlaces !== undefined) updateData.decimalPlaces = dto.decimalPlaces;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (Object.keys(updateData).length === 0) {
      return currency;
    }

    const updated = await this.tenantPrisma.update<Currency>('ifrs_currencies', currencyId, updateData);

    if (!updated) {
      throw new NotFoundException('Currency not found');
    }

    return updated;
  }

  async deleteCurrency(companyId: number, currencyId: number): Promise<void> {
    const entityId = await this.resolveEntityId(companyId);
    await this.findCurrencyById(entityId, currencyId);

    // Check for exchange rates
    const hasRates = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ifrs_exchange_rates
       WHERE ("fromCurrencyId" = $1 OR "toCurrencyId" = $1)`,
      [currencyId],
    );

    if (parseInt(hasRates?.count || '0', 10) > 0) {
      throw new BadRequestException('Cannot delete currency with exchange rates. Deactivate it instead.');
    }

    // Check for references in other tables
    try {
      const hasReferences = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT (
          (SELECT COUNT(*) FROM inv_items WHERE "currencyId" = $1)
        ) as count`,
        [currencyId],
      );

      if (parseInt(hasReferences?.count || '0', 10) > 0) {
        throw new BadRequestException('Cannot delete currency that is referenced by other records. Deactivate it instead.');
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Skipping reference check for currency: ${err.message}`);
    }

    // Check for accounts using this currency
    const hasAccounts = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ifrs_accounts
       WHERE "currencyId" = $1 AND "deletedAt" IS NULL`,
      [currencyId],
    );

    if (parseInt(hasAccounts?.count || '0', 10) > 0) {
      throw new BadRequestException(
        'Cannot delete currency assigned to chart of accounts. Reassign accounts or deactivate instead.',
      );
    }

    // Hard delete to allow re-creation with the same code.
    await this.tenantPrisma.delete('ifrs_currencies', currencyId);
  }

  async findCurrencyById(companyIdOrEntityId: number, currencyId: number): Promise<Currency> {
    const entityId = await this.resolveEntityId(companyIdOrEntityId);
    const currency = await this.tenantPrisma.queryOne<Currency>(
      `SELECT * FROM ifrs_currencies WHERE id = $1 AND "entityId" = $2 AND "deletedAt" IS NULL`,
      [currencyId, entityId],
    );

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }

    return currency;
  }

  async findCurrencyByCode(companyId: number, code: string): Promise<Currency | null> {
    const entityId = await this.resolveEntityId(companyId);
    return this.tenantPrisma.queryOne<Currency>(
      `SELECT * FROM ifrs_currencies WHERE "entityId" = $1 AND code = $2 AND "deletedAt" IS NULL`,
      [entityId, code.toUpperCase()],
    );
  }

  async findAllCurrencies(companyId: number, query: CurrencyQueryDto): Promise<{
    data: Currency[];
    total: number;
    page: number;
    limit: number;
  }> {
    const entityId = await this.resolveEntityId(companyId);
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM ifrs_currencies WHERE "entityId" = $1 AND "deletedAt" IS NULL`;
    let countSql = `SELECT COUNT(*) as count FROM ifrs_currencies WHERE "entityId" = $1 AND "deletedAt" IS NULL`;
    const params: any[] = [entityId];
    let paramIndex = 2;

    if (query.isActive !== undefined) {
      sql += ` AND "isActive" = $${paramIndex}`;
      countSql += ` AND "isActive" = $${paramIndex}`;
      params.push(query.isActive);
      paramIndex++;
    }

    if (query.search) {
      sql += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`;
      countSql += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY code ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<Currency>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }

  // ============================================================================
  // EXCHANGE RATES
  // ============================================================================

  async createExchangeRate(companyId: number, dto: CreateExchangeRateDto): Promise<ExchangeRate> {
    // Validate currencies exist
    const fromCurrency = await this.findCurrencyById(companyId, dto.fromCurrencyId);
    const toCurrency = await this.findCurrencyById(companyId, dto.toCurrencyId);

    if (dto.fromCurrencyId === dto.toCurrencyId) {
      throw new BadRequestException('Source and target currencies must be different');
    }

    if (dto.rate <= 0) {
      throw new BadRequestException('Exchange rate must be positive');
    }

    // Check for overlapping rates
    const overlapping = await this.tenantPrisma.queryOne<ExchangeRate>(
      `SELECT * FROM ifrs_exchange_rates
       WHERE "fromCurrencyId" = $1
       AND "toCurrencyId" = $2
       AND "validFrom" <= $3
       AND ("validTo" IS NULL OR "validTo" >= $3)`,
      [dto.fromCurrencyId, dto.toCurrencyId, dto.validFrom],
    );

    if (overlapping) {
      // Close the previous rate
      await this.tenantPrisma.update('ifrs_exchange_rates', overlapping.id, {
        validTo: new Date(new Date(dto.validFrom).getTime() - 86400000), // Day before
      });
    }

    return this.tenantPrisma.insert<ExchangeRate>('ifrs_exchange_rates', {
      fromCurrencyId: dto.fromCurrencyId,
      toCurrencyId: dto.toCurrencyId,
      rate: dto.rate,
      validFrom: dto.validFrom,
      validTo: dto.validTo || null,
      source: dto.source || null,
    });
  }

  async updateExchangeRate(
    entityId: number,
    rateId: number,
    dto: UpdateExchangeRateDto,
  ): Promise<ExchangeRate> {
    const rate = await this.findExchangeRateById(entityId, rateId);

    const updateData: Record<string, any> = {};
    if (dto.rate !== undefined) updateData.rate = dto.rate;
    if (dto.validTo !== undefined) updateData.validTo = dto.validTo;
    if (dto.source !== undefined) updateData.source = dto.source;

    if (Object.keys(updateData).length === 0) {
      return rate;
    }

    const updated = await this.tenantPrisma.update<ExchangeRate>('ifrs_exchange_rates', rateId, updateData);

    if (!updated) {
      throw new NotFoundException('Exchange rate not found');
    }

    return updated;
  }

  async deleteExchangeRate(companyId: number, rateId: number): Promise<void> {
    await this.findExchangeRateById(companyId, rateId);
    await this.tenantPrisma.delete('ifrs_exchange_rates', rateId);
  }

  async findExchangeRateById(companyId: number, rateId: number): Promise<ExchangeRate> {
    const entityId = await this.resolveEntityId(companyId);
    const rate = await this.tenantPrisma.queryOne<ExchangeRate>(
      `SELECT er.*,
        fc.name as "fromCurrencyName", fc.code as "fromCurrencyCode",
        tc.name as "toCurrencyName", tc.code as "toCurrencyCode"
       FROM ifrs_exchange_rates er
       LEFT JOIN ifrs_currencies fc ON fc.id = er."fromCurrencyId"
       LEFT JOIN ifrs_currencies tc ON tc.id = er."toCurrencyId"
       WHERE er.id = $1
       AND (fc."entityId" = $2 OR tc."entityId" = $2)`,
      [rateId, entityId],
    );

    if (!rate) {
      throw new NotFoundException('Exchange rate not found');
    }

    return rate;
  }

  async findCurrentRate(
    companyId: number,
    fromCurrencyId: number,
    toCurrencyId: number,
    asOfDate?: string,
  ): Promise<ExchangeRate | null> {
    const entityId = await this.resolveEntityId(companyId);
    const date = asOfDate || new Date().toISOString().split('T')[0];

    return this.tenantPrisma.queryOne<ExchangeRate>(
      `SELECT er.* FROM ifrs_exchange_rates er
       JOIN ifrs_currencies fc ON fc.id = er."fromCurrencyId" AND fc."entityId" = $1
       WHERE er."fromCurrencyId" = $2
       AND er."toCurrencyId" = $3
       AND er."validFrom" <= $4
       AND (er."validTo" IS NULL OR er."validTo" >= $4)
       ORDER BY er."validFrom" DESC
       LIMIT 1`,
      [entityId, fromCurrencyId, toCurrencyId, date],
    );
  }

  async findAllExchangeRates(companyId: number, query: ExchangeRateQueryDto): Promise<{
    data: ExchangeRate[];
    total: number;
    page: number;
    limit: number;
  }> {
    const entityId = await this.resolveEntityId(companyId);
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT er.*,
        fc.name as "fromCurrencyName", fc.code as "fromCurrencyCode", fc.symbol as "fromCurrencySymbol",
        tc.name as "toCurrencyName", tc.code as "toCurrencyCode", tc.symbol as "toCurrencySymbol"
      FROM ifrs_exchange_rates er
      JOIN ifrs_currencies fc ON fc.id = er."fromCurrencyId" AND fc."entityId" = $1
      LEFT JOIN ifrs_currencies tc ON tc.id = er."toCurrencyId"
      WHERE 1=1
    `;
    let countSql = `SELECT COUNT(*) as count FROM ifrs_exchange_rates er
      JOIN ifrs_currencies fc ON fc.id = er."fromCurrencyId" AND fc."entityId" = $1
      WHERE 1=1`;
    const params: any[] = [entityId];
    let paramIndex = 2;

    if (query.fromCurrencyId) {
      sql += ` AND er."fromCurrencyId" = $${paramIndex}`;
      countSql += ` AND er."fromCurrencyId" = $${paramIndex}`;
      params.push(query.fromCurrencyId);
      paramIndex++;
    }

    if (query.toCurrencyId) {
      sql += ` AND er."toCurrencyId" = $${paramIndex}`;
      countSql += ` AND er."toCurrencyId" = $${paramIndex}`;
      params.push(query.toCurrencyId);
      paramIndex++;
    }

    if (query.asOfDate) {
      sql += ` AND er."validFrom" <= $${paramIndex} AND (er."validTo" IS NULL OR er."validTo" >= $${paramIndex})`;
      countSql += ` AND er."validFrom" <= $${paramIndex} AND (er."validTo" IS NULL OR er."validTo" >= $${paramIndex})`;
      params.push(query.asOfDate);
      paramIndex++;
    }

    sql += ` ORDER BY er."validFrom" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<ExchangeRate>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }
}
