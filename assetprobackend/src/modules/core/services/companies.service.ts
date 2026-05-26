import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyListQueryDto,
  CompanyResponseDto,
  CompanyListResponseDto,
} from '../dto';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);
  private readonly uploadBaseUrl: string;

  constructor(
    private tenantPrisma: TenantPrismaService,
    private configService: ConfigService,
  ) {
    const port = this.configService.get('PORT') || 4000;
    this.uploadBaseUrl = this.configService.get('UPLOAD_BASE_URL') || `http://localhost:${port}/uploads`;
  }

  /**
   * Create a new company
   */
  async create(dto: CreateCompanyDto, createdById?: number): Promise<CompanyResponseDto> {
    const company = await this.tenantPrisma.insert('companies', {
      name: dto.name,
      displayName: dto.displayName || dto.name,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      country: dto.country,
      postalCode: dto.postalCode,
      businessType: dto.businessType || 'general',
      currency: dto.currency || 'NGN',
      taxNumber: dto.taxNumber,
      registrationNumber: dto.registrationNumber,
      website: dto.website,
      entityId: dto.entityId,
      createdById,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create an IFRS entity for the new company if one wasn't provided
    if (!dto.entityId) {
      const entity = await this.tenantPrisma.queryOne<{ id: number }>(
        `INSERT INTO ifrs_entities (name, "createdAt", "updatedAt") VALUES ($1, NOW(), NOW()) RETURNING id`,
        [dto.name],
      );
      if (entity) {
        await this.tenantPrisma.update('companies', company.id, { entityId: entity.id });
        company.entityId = entity.id;
        // Copy all active currencies from the primary entity to the new entity
        await this.tenantPrisma.query(
          `INSERT INTO ifrs_currencies (code, name, symbol, "decimalPlaces", "isActive", "entityId", "createdAt", "updatedAt")
           SELECT code, name, symbol, "decimalPlaces", "isActive", $1, NOW(), NOW()
           FROM ifrs_currencies
           WHERE "entityId" = 1 AND "deletedAt" IS NULL
           ON CONFLICT DO NOTHING`,
          [entity.id],
        );
      }
    }

    // Seed COA for the new company by copying from the oldest existing company
    await this.seedAccountsForCompany(company.id);

    return this.mapToResponse(company);
  }

  /**
   * Copy the full chart of accounts from the oldest existing company into a new company.
   * Uses a two-pass approach: first insert all accounts (flat, no parent links),
   * then wire up parent relationships by matching account codes.
   */
  async seedAccountsForCompany(newCompanyId: number): Promise<void> {
    // Ensure the company has an IFRS entity (backfill for companies created before this logic)
    const companyCheck = await this.tenantPrisma.queryOne<{ entityId: number | null; name: string }>(
      `SELECT "entityId", name FROM companies WHERE id = $1 AND "deletedAt" IS NULL`,
      [newCompanyId],
    );
    if (companyCheck && !companyCheck.entityId) {
      const entity = await this.tenantPrisma.queryOne<{ id: number }>(
        `INSERT INTO ifrs_entities (name, "createdAt", "updatedAt") VALUES ($1, NOW(), NOW()) RETURNING id`,
        [companyCheck.name],
      );
      if (entity) {
        await this.tenantPrisma.update('companies', newCompanyId, { entityId: entity.id });
        this.logger.log(`Created IFRS entity ${entity.id} for company ${newCompanyId}`);
      }
    }

    // Find the source company (oldest one that isn't the new company)
    const source = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT id FROM companies WHERE id != $1 AND "deletedAt" IS NULL ORDER BY id ASC LIMIT 1`,
      [newCompanyId],
    );
    if (!source) return; // First company ever — seeded by provisioning, nothing to copy

    // Fetch all accounts from the source company (ordered by id so parents come before children)
    const sourceAccounts = await this.tenantPrisma.query<Record<string, any>>(
      `SELECT id, code, name, "accountType", "categoryId", "currencyId", "isPosting", "isActive", "parentId"
       FROM ifrs_accounts
       WHERE "companyId" = $1 AND "deletedAt" IS NULL
       ORDER BY id`,
      [source.id],
    );

    if (sourceAccounts.length === 0) return;

    // Pass 1 — insert flat (no parentId yet), collect old→new ID mapping
    const idMap = new Map<number, number>();
    for (const acct of sourceAccounts) {
      const inserted = await this.tenantPrisma.queryOne<{ id: number }>(
        `INSERT INTO ifrs_accounts
           ("companyId", "categoryId", "currencyId", code, name, "accountType", "isPosting", "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         ON CONFLICT ("companyId", code) DO NOTHING
         RETURNING id`,
        [newCompanyId, acct.categoryId, acct.currencyId, acct.code, acct.name, acct.accountType, acct.isPosting, acct.isActive],
      );
      if (inserted) idMap.set(Number(acct.id), inserted.id);
    }

    // Pass 2 — wire up parent links using the ID map
    for (const acct of sourceAccounts) {
      if (!acct.parentId) continue;
      const newId = idMap.get(Number(acct.id));
      const newParentId = idMap.get(Number(acct.parentId));
      if (newId && newParentId) {
        await this.tenantPrisma.query(
          `UPDATE ifrs_accounts SET "parentId" = $1 WHERE id = $2`,
          [newParentId, newId],
        );
      }
    }

    this.logger.log(`Seeded ${idMap.size} accounts for new company ${newCompanyId} (copied from company ${source.id})`);
  }

  /**
   * Get all companies with pagination and filters
   */
  async findAll(query: CompanyListQueryDto): Promise<CompanyListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT c.*,
             (SELECT COUNT(*) FROM branches b WHERE b."companyId" = c.id AND b."deletedAt" IS NULL) as "branchCount",
             (SELECT COUNT(*) FROM users u WHERE u."companyId" = c.id AND u."deletedAt" IS NULL) as "userCount"
      FROM companies c
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (!query.includeDeleted) {
      sql += ` AND c."deletedAt" IS NULL`;
    }

    if (query.isActive !== undefined) {
      sql += ` AND c."isActive" = $${paramIndex++}`;
      params.push(query.isActive);
    }

    if (query.search) {
      sql += ` AND (c.name ILIKE $${paramIndex} OR c."displayName" ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY c."createdAt" DESC`;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const companies = await this.tenantPrisma.query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM companies c WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (!query.includeDeleted) {
      countSql += ` AND c."deletedAt" IS NULL`;
    }

    if (query.isActive !== undefined) {
      countSql += ` AND c."isActive" = $${countParamIndex++}`;
      countParams.push(query.isActive);
    }

    if (query.search) {
      countSql += ` AND (c.name ILIKE $${countParamIndex} OR c."displayName" ILIKE $${countParamIndex} OR c.email ILIKE $${countParamIndex})`;
      countParams.push(`%${query.search}%`);
    }

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(countSql, countParams);
    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: companies.map(c => this.mapToResponse(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single company by ID
   */
  async findOne(id: number): Promise<CompanyResponseDto> {
    const company = await this.tenantPrisma.queryOne(
      `
      SELECT c.*,
             (SELECT COUNT(*) FROM branches b WHERE b."companyId" = c.id AND b."deletedAt" IS NULL) as "branchCount",
             (SELECT COUNT(*) FROM users u WHERE u."companyId" = c.id AND u."deletedAt" IS NULL) as "userCount"
      FROM companies c
      WHERE c.id = $1 AND c."deletedAt" IS NULL
      `,
      [id],
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.mapToResponse(company);
  }

  /**
   * Update a company
   */
  async update(id: number, dto: UpdateCompanyDto, updatedById?: number): Promise<CompanyResponseDto> {
    // Check if company exists
    const existing = await this.tenantPrisma.findById('companies', id);
    if (!existing) {
      throw new NotFoundException('Company not found');
    }

    // Build update data
    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode;
    if (dto.businessType !== undefined) updateData.businessType = dto.businessType;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.taxNumber !== undefined) updateData.taxNumber = dto.taxNumber;
    if (dto.registrationNumber !== undefined) updateData.registrationNumber = dto.registrationNumber;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.entityId !== undefined) updateData.entityId = dto.entityId;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Track who updated the record
    if (updatedById) {
      updateData.updatedById = updatedById;
    }

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.update('companies', id, updateData);
    }

    return this.findOne(id);
  }

  /**
   * Soft delete a company
   */
  async remove(id: number): Promise<void> {
    // Check if company has active users or branches
    const hasActiveUsers = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM users WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
      [id],
    );

    if (parseInt(hasActiveUsers?.count || '0', 10) > 0) {
      throw new BadRequestException(
        'Cannot delete company with active users. Please reassign or remove users first.',
      );
    }

    const result = await this.tenantPrisma.softDelete('companies', id);
    if (!result) {
      throw new NotFoundException('Company not found');
    }
  }

  /**
   * Get company statistics
   */
  async getStatistics(id: number): Promise<Record<string, number>> {
    const stats = await this.tenantPrisma.queryOne(
      `
      SELECT
        (SELECT COUNT(*) FROM branches WHERE "companyId" = $1 AND "deletedAt" IS NULL) as branches,
        (SELECT COUNT(*) FROM users WHERE "companyId" = $1 AND "deletedAt" IS NULL) as users,
        (SELECT COUNT(*) FROM customers WHERE "companyId" = $1 AND "deletedAt" IS NULL) as customers,
        (SELECT COUNT(*) FROM suppliers WHERE "companyId" = $1 AND "deletedAt" IS NULL) as suppliers,
        (SELECT COUNT(*) FROM employees WHERE "companyId" = $1 AND "deletedAt" IS NULL) as employees
      `,
      [id],
    );

    return {
      branches: parseInt(stats?.branches || '0', 10),
      users: parseInt(stats?.users || '0', 10),
      customers: parseInt(stats?.customers || '0', 10),
      suppliers: parseInt(stats?.suppliers || '0', 10),
      employees: parseInt(stats?.employees || '0', 10),
    };
  }

  /**
   * Update company logo
   */
  async updateLogo(id: number, logoPath: string | null): Promise<CompanyResponseDto> {
    const result = await this.tenantPrisma.update('companies', id, { logoPath });
    if (!result) {
      throw new NotFoundException('Company not found');
    }
    return this.findOne(id);
  }

  /**
   * Map database row to response DTO
   */
  private mapToResponse(company: any): CompanyResponseDto {
    return {
      id: company.id,
      name: company.name,
      displayName: company.displayName,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      state: company.state,
      country: company.country,
      postalCode: company.postalCode,
      businessType: company.businessType,
      currency: company.currency,
      taxNumber: company.taxNumber,
      registrationNumber: company.registrationNumber,
      website: company.website,
      logoPath: company.logoPath,
      logoUrl: company.logoPath ? `/uploads/${company.logoPath}` : null,
      isActive: company.isActive,
      entityId: company.entityId,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
      branchCount: parseInt(company.branchCount || '0', 10),
      userCount: parseInt(company.userCount || '0', 10),
    };
  }
}
