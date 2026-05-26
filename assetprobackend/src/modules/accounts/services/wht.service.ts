import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { CreateWhtDto, UpdateWhtDto, WhtQueryDto } from '../dto';

export interface Wht {
  id: number;
  companyId: number;
  name: string;
  code: string;
  rate: number;
  accountId: number | null;
  description: string | null;
  isActive: boolean;
  accountCode?: string;
  accountName?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WhtService {
  private readonly logger = new Logger(WhtService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  async createWht(companyId: number, dto: CreateWhtDto): Promise<Wht> {
    // Check for duplicate code
    const existing = await this.tenantPrisma.queryOne<Wht>(
      `SELECT * FROM withholding_taxes WHERE "companyId" = $1 AND code = $2`,
      [companyId, dto.code.toUpperCase()],
    );

    if (existing) {
      throw new BadRequestException(`WHT code ${dto.code} already exists`);
    }

    // Validate GL account if provided
    if (dto.accountId) {
      const account = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT id FROM ifrs_accounts WHERE id = $1 AND "deletedAt" IS NULL`,
        [dto.accountId],
      );

      if (!account) {
        throw new NotFoundException('GL Account not found');
      }
    }

    if (dto.rate < 0 || dto.rate > 100) {
      throw new BadRequestException('WHT rate must be between 0 and 100');
    }

    return this.tenantPrisma.insert<Wht>('withholding_taxes', {
      companyId,
      name: dto.name,
      code: dto.code.toUpperCase(),
      rate: dto.rate,
      accountId: dto.accountId || null,
      description: dto.description || null,
      isActive: dto.isActive ?? true,
    });
  }

  async updateWht(companyId: number, whtId: number, dto: UpdateWhtDto): Promise<Wht> {
    const wht = await this.findWhtById(companyId, whtId);

    // Validate GL account if provided
    if (dto.accountId) {
      const account = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT id FROM ifrs_accounts WHERE id = $1 AND "deletedAt" IS NULL`,
        [dto.accountId],
      );

      if (!account) {
        throw new NotFoundException('GL Account not found');
      }
    }

    if (dto.rate !== undefined && (dto.rate < 0 || dto.rate > 100)) {
      throw new BadRequestException('WHT rate must be between 0 and 100');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.rate !== undefined) updateData.rate = dto.rate;
    if (dto.accountId !== undefined) updateData.accountId = dto.accountId;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (Object.keys(updateData).length === 0) {
      return wht;
    }

    const updated = await this.tenantPrisma.update<Wht>('withholding_taxes', whtId, updateData);

    if (!updated) {
      throw new NotFoundException('WHT not found');
    }

    return updated;
  }

  async deleteWht(companyId: number, whtId: number): Promise<void> {
    await this.findWhtById(companyId, whtId);

    // Check if WHT is used in purchase invoices
    const hasInvoices = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM purchase_invoice_lines WHERE "withholdingTaxId" = $1`,
      [whtId],
    );

    if (parseInt(hasInvoices?.count || '0', 10) > 0) {
      throw new BadRequestException('Cannot delete WHT used in transactions. Deactivate it instead.');
    }

    // Hard delete since no soft delete column
    await this.tenantPrisma.query(
      `DELETE FROM withholding_taxes WHERE id = $1 AND "companyId" = $2`,
      [whtId, companyId],
    );
  }

  async findWhtById(companyId: number, whtId: number): Promise<Wht> {
    const wht = await this.tenantPrisma.queryOne<Wht>(
      `SELECT w.*,
        a.code as "accountCode", a.name as "accountName"
       FROM withholding_taxes w
       LEFT JOIN ifrs_accounts a ON a.id = w."accountId"
       WHERE w.id = $1 AND w."companyId" = $2`,
      [whtId, companyId],
    );

    if (!wht) {
      throw new NotFoundException('WHT not found');
    }

    return wht;
  }

  async findWhtByCode(companyId: number, code: string): Promise<Wht | null> {
    return this.tenantPrisma.queryOne<Wht>(
      `SELECT * FROM withholding_taxes WHERE "companyId" = $1 AND code = $2`,
      [companyId, code.toUpperCase()],
    );
  }

  async findAllWhts(companyId: number, query: WhtQueryDto): Promise<{
    data: Wht[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT w.*,
        a.code as "accountCode", a.name as "accountName"
      FROM withholding_taxes w
      LEFT JOIN ifrs_accounts a ON a.id = w."accountId"
      WHERE w."companyId" = $1
    `;
    let countSql = `SELECT COUNT(*) as count FROM withholding_taxes WHERE "companyId" = $1`;
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.isActive !== undefined) {
      sql += ` AND w."isActive" = $${paramIndex}`;
      countSql += ` AND "isActive" = $${paramIndex}`;
      params.push(query.isActive);
      paramIndex++;
    }

    if (query.search) {
      sql += ` AND (w.name ILIKE $${paramIndex} OR w.code ILIKE $${paramIndex})`;
      countSql += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY w.code ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<Wht>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }

  async getActiveWhts(companyId: number): Promise<Wht[]> {
    return this.tenantPrisma.query<Wht>(
      `SELECT w.*,
        a.code as "accountCode", a.name as "accountName"
       FROM withholding_taxes w
       LEFT JOIN ifrs_accounts a ON a.id = w."accountId"
       WHERE w."companyId" = $1 AND w."isActive" = true
       ORDER BY w.code ASC`,
      [companyId],
    );
  }

  async calculateWht(companyId: number, whtId: number, amount: number): Promise<{
    whtAmount: number;
    netAmount: number;
    rate: number;
  }> {
    const wht = await this.findWhtById(companyId, whtId);

    if (!wht.isActive) {
      throw new BadRequestException('WHT rate is not active');
    }

    const rate = Number(wht.rate);
    const whtAmount = amount * (rate / 100);
    const netAmount = amount - whtAmount;

    return {
      whtAmount: Math.round(whtAmount * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      rate,
    };
  }
}
