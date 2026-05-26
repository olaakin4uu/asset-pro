import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import {
  CreateExchangeRateStandaloneDto,
  UpdateExchangeRateStandaloneDto,
  ExchangeRateStandaloneQueryDto,
} from '../dto';

export interface ExchangeRateRecord {
  id: number;
  fromCurrencyId: number;
  toCurrencyId: number;
  rate: number;
  validFrom: Date;
  validTo: Date | null;
  source: string | null;
  isActive: boolean;
  createdBy: number | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  fromCurrencyName?: string;
  fromCurrencyCode?: string;
  toCurrencyName?: string;
  toCurrencyCode?: string;
}

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  async create(
    companyId: number,
    userId: number,
    dto: CreateExchangeRateStandaloneDto,
  ): Promise<ExchangeRateRecord> {
    // Validate from and to currencies are different
    if (dto.fromCurrencyId === dto.toCurrencyId) {
      throw new BadRequestException('Source and target currencies must be different');
    }

    if (dto.rate <= 0) {
      throw new BadRequestException('Exchange rate must be a positive number');
    }

    // Validate that both currencies exist
    const fromCurrency = await this.tenantPrisma.queryOne(
      `SELECT id FROM ifrs_currencies WHERE id = $1 AND "deletedAt" IS NULL`,
      [dto.fromCurrencyId],
    );
    if (!fromCurrency) {
      throw new BadRequestException('Source currency not found');
    }

    const toCurrency = await this.tenantPrisma.queryOne(
      `SELECT id FROM ifrs_currencies WHERE id = $1 AND "deletedAt" IS NULL`,
      [dto.toCurrencyId],
    );
    if (!toCurrency) {
      throw new BadRequestException('Target currency not found');
    }

    // If validTo is provided, ensure validTo >= validFrom
    if (dto.validTo && new Date(dto.validTo) < new Date(dto.validFrom)) {
      throw new BadRequestException('Valid to date must be on or after valid from date');
    }

    // Check for overlapping active rates for the same currency pair
    const overlapping = await this.tenantPrisma.queryOne<ExchangeRateRecord>(
      `SELECT * FROM ifrs_exchange_rates
       WHERE "fromCurrencyId" = $1
       AND "toCurrencyId" = $2
       AND "isActive" = true
       AND "deletedAt" IS NULL
       AND "validFrom" <= $3
       AND ("validTo" IS NULL OR "validTo" >= $3)`,
      [dto.fromCurrencyId, dto.toCurrencyId, dto.validFrom],
    );

    if (overlapping) {
      // Close the previous rate by setting validTo to the day before new rate starts
      const dayBefore = new Date(new Date(dto.validFrom).getTime() - 86400000)
        .toISOString()
        .split('T')[0];
      await this.tenantPrisma.update('ifrs_exchange_rates', overlapping.id, {
        validTo: dayBefore,
      });
    }

    return this.tenantPrisma.insert<ExchangeRateRecord>('ifrs_exchange_rates', {
      fromCurrencyId: dto.fromCurrencyId,
      toCurrencyId: dto.toCurrencyId,
      rate: dto.rate,
      validFrom: dto.validFrom,
      validTo: dto.validTo || null,
      source: dto.source || null,
      isActive: dto.isActive ?? true,
      createdBy: userId,
    });
  }

  async update(
    companyId: number,
    rateId: number,
    dto: UpdateExchangeRateStandaloneDto,
  ): Promise<ExchangeRateRecord> {
    const rate = await this.findById(companyId, rateId);

    const updateData: Record<string, any> = {};
    if (dto.rate !== undefined) {
      if (dto.rate <= 0) {
        throw new BadRequestException('Exchange rate must be a positive number');
      }
      updateData.rate = dto.rate;
    }
    if (dto.validFrom !== undefined) updateData.validFrom = dto.validFrom;
    if (dto.validTo !== undefined) updateData.validTo = dto.validTo;
    if (dto.source !== undefined) updateData.source = dto.source;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (Object.keys(updateData).length === 0) {
      return rate;
    }

    const updated = await this.tenantPrisma.update<ExchangeRateRecord>(
      'ifrs_exchange_rates',
      rateId,
      updateData,
    );

    if (!updated) {
      throw new NotFoundException('Exchange rate not found');
    }

    return updated;
  }

  async remove(companyId: number, rateId: number): Promise<void> {
    await this.findById(companyId, rateId);
    await this.tenantPrisma.softDelete('ifrs_exchange_rates', rateId);
  }

  async findById(companyId: number, rateId: number): Promise<ExchangeRateRecord> {
    const rate = await this.tenantPrisma.queryOne<ExchangeRateRecord>(
      `SELECT er.*,
        fc.name as "fromCurrencyName", fc.code as "fromCurrencyCode",
        tc.name as "toCurrencyName", tc.code as "toCurrencyCode"
       FROM ifrs_exchange_rates er
       LEFT JOIN ifrs_currencies fc ON fc.id = er."fromCurrencyId"
       LEFT JOIN ifrs_currencies tc ON tc.id = er."toCurrencyId"
       WHERE er.id = $1
       AND er."deletedAt" IS NULL`,
      [rateId],
    );

    if (!rate) {
      throw new NotFoundException('Exchange rate not found');
    }

    return rate;
  }

  async findLatest(
    companyId: number,
    fromCurrencyId: number,
    toCurrencyId: number,
  ): Promise<ExchangeRateRecord | null> {
    const today = new Date().toISOString().split('T')[0];

    return this.tenantPrisma.queryOne<ExchangeRateRecord>(
      `SELECT er.*,
        fc.name as "fromCurrencyName", fc.code as "fromCurrencyCode",
        tc.name as "toCurrencyName", tc.code as "toCurrencyCode"
       FROM ifrs_exchange_rates er
       LEFT JOIN ifrs_currencies fc ON fc.id = er."fromCurrencyId"
       LEFT JOIN ifrs_currencies tc ON tc.id = er."toCurrencyId"
       WHERE er."fromCurrencyId" = $1
       AND er."toCurrencyId" = $2
       AND er."isActive" = true
       AND er."deletedAt" IS NULL
       AND er."validFrom" <= $3
       AND (er."validTo" IS NULL OR er."validTo" >= $3)
       ORDER BY er."validFrom" DESC
       LIMIT 1`,
      [fromCurrencyId, toCurrencyId, today],
    );
  }

  async findAll(
    companyId: number,
    query: ExchangeRateStandaloneQueryDto,
  ): Promise<{
    data: ExchangeRateRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT er.*,
        fc.name as "fromCurrencyName", fc.code as "fromCurrencyCode",
        tc.name as "toCurrencyName", tc.code as "toCurrencyCode"
      FROM ifrs_exchange_rates er
      LEFT JOIN ifrs_currencies fc ON fc.id = er."fromCurrencyId"
      LEFT JOIN ifrs_currencies tc ON tc.id = er."toCurrencyId"
      WHERE er."deletedAt" IS NULL
        AND er."companyId" = $1
    `;
    let countSql = `
      SELECT COUNT(*) as count
      FROM ifrs_exchange_rates er
      WHERE er."deletedAt" IS NULL
        AND er."companyId" = $1
    `;
    const params: any[] = [companyId];
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

    if (query.isActive !== undefined) {
      sql += ` AND er."isActive" = $${paramIndex}`;
      countSql += ` AND er."isActive" = $${paramIndex}`;
      params.push(query.isActive);
      paramIndex++;
    }

    if (query.asOfDate) {
      sql += ` AND er."validFrom" <= $${paramIndex} AND (er."validTo" IS NULL OR er."validTo" >= $${paramIndex})`;
      countSql += ` AND er."validFrom" <= $${paramIndex} AND (er."validTo" IS NULL OR er."validTo" >= $${paramIndex})`;
      params.push(query.asOfDate);
      paramIndex++;
    }

    if (query.search) {
      sql += ` AND (er.source ILIKE $${paramIndex} OR fc.code ILIKE $${paramIndex} OR tc.code ILIKE $${paramIndex})`;
      countSql += ` AND (er.source ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY er."validFrom" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<ExchangeRateRecord>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }

  /**
   * Get full exchange rate history for a currency pair — includes closed/inactive rates.
   * Used for audit trail: "what rate was in effect on July 15th?"
   */
  async getHistory(
    fromCurrencyId: number,
    toCurrencyId: number,
  ): Promise<ExchangeRateRecord[]> {
    return this.tenantPrisma.query<ExchangeRateRecord>(
      `SELECT er.*,
              fc.name as "fromCurrencyName", fc.code as "fromCurrencyCode",
              tc.name as "toCurrencyName", tc.code as "toCurrencyCode",
              u.name as "createdByName",
              ua.name as "approvedByName"
       FROM ifrs_exchange_rates er
       LEFT JOIN ifrs_currencies fc ON fc.id = er."fromCurrencyId"
       LEFT JOIN ifrs_currencies tc ON tc.id = er."toCurrencyId"
       LEFT JOIN users u ON u.id = er."createdBy"
       LEFT JOIN users ua ON ua.id = er."approvedBy"
       WHERE er."fromCurrencyId" = $1 AND er."toCurrencyId" = $2
       ORDER BY er."validFrom" DESC`,
      [fromCurrencyId, toCurrencyId],
    );
  }

  /**
   * Get the rate that was effective on a specific date (for audit purposes).
   */
  async getRateAsOfDate(
    fromCurrencyId: number,
    toCurrencyId: number,
    asOfDate: string,
  ): Promise<ExchangeRateRecord | null> {
    return this.tenantPrisma.queryOne<ExchangeRateRecord>(
      `SELECT er.*,
              fc.code as "fromCurrencyCode", tc.code as "toCurrencyCode"
       FROM ifrs_exchange_rates er
       LEFT JOIN ifrs_currencies fc ON fc.id = er."fromCurrencyId"
       LEFT JOIN ifrs_currencies tc ON tc.id = er."toCurrencyId"
       WHERE er."fromCurrencyId" = $1 AND er."toCurrencyId" = $2
         AND er."validFrom" <= $3::date
         AND (er."validTo" IS NULL OR er."validTo" >= $3::date)
       ORDER BY er."validFrom" DESC
       LIMIT 1`,
      [fromCurrencyId, toCurrencyId, asOfDate],
    );
  }
}
