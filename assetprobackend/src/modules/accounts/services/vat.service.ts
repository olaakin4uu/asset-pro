import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { CreateVatDto, UpdateVatDto, VatQueryDto } from '../dto';

export interface Vat {
  id: number;
  entityId: number;
  name: string;
  code: string;
  rate: number;
  accountId: number | null;
  inputAccountId: number | null;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  accountCode?: string;
  accountName?: string;
  inputAccountCode?: string;
  inputAccountName?: string;
  account?: {
    id: number;
    code: string;
    name: string;
  };
  inputAccount?: {
    id: number;
    code: string;
    name: string;
  };
}

@Injectable()
export class VatService {
  private readonly logger = new Logger(VatService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  async createVat(entityId: number, dto: CreateVatDto): Promise<Vat> {
    // Check for duplicate code
    const existing = await this.tenantPrisma.queryOne<Vat>(
      `SELECT * FROM ifrs_vats WHERE "entityId" = $1 AND code = $2 AND "deletedAt" IS NULL`,
      [entityId, dto.code.toUpperCase()],
    );

    if (existing) {
      throw new BadRequestException(`VAT code ${dto.code} already exists`);
    }

    // Validate output GL account if provided
    if (dto.accountId) {
      const account = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT id FROM ifrs_accounts WHERE id = $1 AND "entityId" = $2 AND "deletedAt" IS NULL`,
        [dto.accountId, entityId],
      );
      if (!account) throw new NotFoundException('Output GL Account not found');
    }

    // Validate input GL account if provided
    if (dto.inputAccountId) {
      const account = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT id FROM ifrs_accounts WHERE id = $1 AND "entityId" = $2 AND "deletedAt" IS NULL`,
        [dto.inputAccountId, entityId],
      );
      if (!account) throw new NotFoundException('Input GL Account not found');
    }

    if (dto.rate < 0 || dto.rate > 100) {
      throw new BadRequestException('VAT rate must be between 0 and 100');
    }

    return this.tenantPrisma.insert<Vat>('ifrs_vats', {
      entityId,
      name: dto.name,
      code: dto.code.toUpperCase(),
      rate: dto.rate,
      accountId: dto.accountId || null,
      inputAccountId: dto.inputAccountId || null,
      isActive: dto.isActive ?? true,
    });
  }

  async updateVat(entityId: number, vatId: number, dto: UpdateVatDto): Promise<Vat> {
    const vat = await this.findVatById(entityId, vatId);

    // Validate GL account if provided
    if (dto.accountId) {
      const account = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT id FROM ifrs_accounts WHERE id = $1 AND "entityId" = $2 AND "deletedAt" IS NULL`,
        [dto.accountId, entityId],
      );

      if (!account) {
        throw new NotFoundException('GL Account not found');
      }
    }

    if (dto.rate !== undefined && (dto.rate < 0 || dto.rate > 100)) {
      throw new BadRequestException('VAT rate must be between 0 and 100');
    }

    // Validate input GL account if provided
    if (dto.inputAccountId) {
      const account = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT id FROM ifrs_accounts WHERE id = $1 AND "entityId" = $2 AND "deletedAt" IS NULL`,
        [dto.inputAccountId, entityId],
      );
      if (!account) throw new NotFoundException('Input GL Account not found');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.rate !== undefined) updateData.rate = dto.rate;
    if (dto.accountId !== undefined) updateData.accountId = dto.accountId;
    if (dto.inputAccountId !== undefined) updateData.inputAccountId = dto.inputAccountId;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (Object.keys(updateData).length === 0) {
      return vat;
    }

    const updated = await this.tenantPrisma.update<Vat>('ifrs_vats', vatId, updateData);

    if (!updated) {
      throw new NotFoundException('VAT not found');
    }

    return updated;
  }

  async deleteVat(entityId: number, vatId: number): Promise<void> {
    await this.findVatById(entityId, vatId);
    await this.tenantPrisma.softDelete('ifrs_vats', vatId);
  }

  async findVatById(entityId: number, vatId: number): Promise<Vat> {
    const vat = await this.tenantPrisma.queryOne<Vat>(
      `SELECT v.*,
        a.code as "accountCode", a.name as "accountName",
        ia.code as "inputAccountCode", ia.name as "inputAccountName"
       FROM ifrs_vats v
       LEFT JOIN ifrs_accounts a ON a.id = v."accountId"
       LEFT JOIN ifrs_accounts ia ON ia.id = v."inputAccountId"
       WHERE v.id = $1 AND v."entityId" = $2 AND v."deletedAt" IS NULL`,
      [vatId, entityId],
    );

    if (!vat) {
      throw new NotFoundException('VAT not found');
    }

    return vat;
  }

  async findVatByCode(entityId: number, code: string): Promise<Vat | null> {
    return this.tenantPrisma.queryOne<Vat>(
      `SELECT * FROM ifrs_vats WHERE "entityId" = $1 AND code = $2 AND "deletedAt" IS NULL`,
      [entityId, code.toUpperCase()],
    );
  }

  async findAllVats(entityId: number, query: VatQueryDto): Promise<{
    data: Vat[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT v.*,
        a.code as "accountCode", a.name as "accountName",
        ia.code as "inputAccountCode", ia.name as "inputAccountName"
      FROM ifrs_vats v
      LEFT JOIN ifrs_accounts a ON a.id = v."accountId"
      LEFT JOIN ifrs_accounts ia ON ia.id = v."inputAccountId"
      WHERE v."entityId" = $1 AND v."deletedAt" IS NULL
    `;
    let countSql = `SELECT COUNT(*) as count FROM ifrs_vats WHERE "entityId" = $1 AND "deletedAt" IS NULL`;
    const params: any[] = [entityId];
    let paramIndex = 2;

    if (query.isActive !== undefined) {
      sql += ` AND v."isActive" = $${paramIndex}`;
      countSql += ` AND "isActive" = $${paramIndex}`;
      params.push(query.isActive);
      paramIndex++;
    }

    if (query.search) {
      sql += ` AND (v.name ILIKE $${paramIndex} OR v.code ILIKE $${paramIndex})`;
      countSql += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY v.code ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<Vat>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }

  async getActiveVats(entityId: number): Promise<Vat[]> {
    return this.tenantPrisma.query<Vat>(
      `SELECT v.*,
        a.code as "accountCode", a.name as "accountName",
        ia.code as "inputAccountCode", ia.name as "inputAccountName"
       FROM ifrs_vats v
       LEFT JOIN ifrs_accounts a ON a.id = v."accountId"
       LEFT JOIN ifrs_accounts ia ON ia.id = v."inputAccountId"
       WHERE v."entityId" = $1 AND v."isActive" = true AND v."deletedAt" IS NULL
       ORDER BY v.code ASC`,
      [entityId],
    );
  }
}
