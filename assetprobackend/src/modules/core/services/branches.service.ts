import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import {
  CreateBranchDto,
  UpdateBranchDto,
  BranchListQueryDto,
  BranchResponseDto,
  BranchListResponseDto,
} from '../dto';

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  /**
   * Create a new branch
   */
  async create(dto: CreateBranchDto, createdById?: number): Promise<BranchResponseDto> {
    // Verify company exists
    const company = await this.tenantPrisma.findById('companies', dto.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if branch code is unique within company
    const existingCode = await this.tenantPrisma.queryOne(
      `SELECT id FROM branches WHERE "companyId" = $1 AND code = $2 AND "deletedAt" IS NULL`,
      [dto.companyId, dto.code],
    );

    if (existingCode) {
      throw new ConflictException('Branch code already exists for this company');
    }

    // If this is the first branch or marked as head office, handle head office assignment
    const branchCount = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM branches WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
      [dto.companyId],
    );

    const isFirstBranch = parseInt(branchCount?.count || '0', 10) === 0;
    const isHeadOffice = dto.isHeadOffice ?? isFirstBranch;

    // If setting as head office, unset other head offices
    if (isHeadOffice) {
      await this.tenantPrisma.query(
        `UPDATE branches SET "isHeadOffice" = false WHERE "companyId" = $1`,
        [dto.companyId],
      );
    }

    // Create branch
    const branch = await this.tenantPrisma.insert('branches', {
      companyId: dto.companyId,
      name: dto.name,
      code: dto.code,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      country: dto.country,
      postalCode: dto.postalCode,
      timezone: dto.timezone || 'Africa/Lagos',
      isHeadOffice,
      isActive: true,
      createdById,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.mapToResponse(branch);
  }

  /**
   * Get all branches with pagination and filters
   */
  async findAll(query: BranchListQueryDto): Promise<BranchListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT b.*,
             c.name as "companyName",
             (SELECT COUNT(*) FROM users u WHERE u."branchId" = b.id AND u."deletedAt" IS NULL) as "userCount",
             (SELECT COUNT(*) FROM inv_warehouses w WHERE w."branchId" = b.id AND w."deletedAt" IS NULL) as "warehouseCount"
      FROM branches b
      LEFT JOIN companies c ON b."companyId" = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (!query.includeDeleted) {
      sql += ` AND b."deletedAt" IS NULL`;
    }

    if (query.companyId) {
      sql += ` AND b."companyId" = $${paramIndex++}`;
      params.push(query.companyId);
    }

    if (query.isActive !== undefined) {
      sql += ` AND b."isActive" = $${paramIndex++}`;
      params.push(query.isActive);
    }

    if (query.search) {
      sql += ` AND (b.name ILIKE $${paramIndex} OR b.code ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY b."isHeadOffice" DESC, b."createdAt" DESC`;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const branches = await this.tenantPrisma.query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM branches b WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (!query.includeDeleted) {
      countSql += ` AND b."deletedAt" IS NULL`;
    }

    if (query.companyId) {
      countSql += ` AND b."companyId" = $${countParamIndex++}`;
      countParams.push(query.companyId);
    }

    if (query.isActive !== undefined) {
      countSql += ` AND b."isActive" = $${countParamIndex++}`;
      countParams.push(query.isActive);
    }

    if (query.search) {
      countSql += ` AND (b.name ILIKE $${countParamIndex} OR b.code ILIKE $${countParamIndex})`;
      countParams.push(`%${query.search}%`);
    }

    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(countSql, countParams);
    const total = parseInt(countResult?.count || '0', 10);

    return {
      data: branches.map(b => this.mapToResponse(b)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single branch by ID
   */
  async findOne(id: number): Promise<BranchResponseDto> {
    const branch = await this.tenantPrisma.queryOne(
      `
      SELECT b.*,
             c.name as "companyName",
             (SELECT COUNT(*) FROM users u WHERE u."branchId" = b.id AND u."deletedAt" IS NULL) as "userCount",
             (SELECT COUNT(*) FROM inv_warehouses w WHERE w."branchId" = b.id AND w."deletedAt" IS NULL) as "warehouseCount"
      FROM branches b
      LEFT JOIN companies c ON b."companyId" = c.id
      WHERE b.id = $1 AND b."deletedAt" IS NULL
      `,
      [id],
    );

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return this.mapToResponse(branch);
  }

  /**
   * Get branches by company ID
   */
  async findByCompany(companyId: number): Promise<BranchResponseDto[]> {
    const branches = await this.tenantPrisma.query(
      `
      SELECT b.*,
             c.name as "companyName",
             (SELECT COUNT(*) FROM users u WHERE u."branchId" = b.id AND u."deletedAt" IS NULL) as "userCount"
      FROM branches b
      LEFT JOIN companies c ON b."companyId" = c.id
      WHERE b."companyId" = $1 AND b."deletedAt" IS NULL
      ORDER BY b."isHeadOffice" DESC, b.name ASC
      `,
      [companyId],
    );

    return branches.map(b => this.mapToResponse(b));
  }

  /**
   * Update a branch
   */
  async update(id: number, dto: UpdateBranchDto, updatedById?: number): Promise<BranchResponseDto> {
    // Check if branch exists
    const existing = await this.tenantPrisma.findById('branches', id);
    if (!existing) {
      throw new NotFoundException('Branch not found');
    }

    // Check code uniqueness if changing code
    if (dto.code && dto.code !== existing.code) {
      const codeInUse = await this.tenantPrisma.queryOne(
        `SELECT id FROM branches WHERE "companyId" = $1 AND code = $2 AND id != $3 AND "deletedAt" IS NULL`,
        [dto.companyId || existing.companyId, dto.code, id],
      );

      if (codeInUse) {
        throw new ConflictException('Branch code already exists for this company');
      }
    }

    // Handle head office flag
    if (dto.isHeadOffice === true) {
      await this.tenantPrisma.query(
        `UPDATE branches SET "isHeadOffice" = false WHERE "companyId" = $1 AND id != $2`,
        [existing.companyId, id],
      );
    }

    // Build update data
    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.isHeadOffice !== undefined) updateData.isHeadOffice = dto.isHeadOffice;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Track who updated the record
    if (updatedById) {
      updateData.updatedById = updatedById;
    }

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.update('branches', id, updateData);
    }

    return this.findOne(id);
  }

  /**
   * Soft delete a branch
   */
  async remove(id: number): Promise<void> {
    // Check if branch exists
    const branch = await this.tenantPrisma.findById('branches', id);
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Check if it's the head office
    if (branch.isHeadOffice) {
      throw new BadRequestException(
        'Cannot delete head office branch. Please designate another branch as head office first.',
      );
    }

    // Check if branch has active users
    const hasActiveUsers = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM users WHERE "branchId" = $1 AND "deletedAt" IS NULL`,
      [id],
    );

    if (parseInt(hasActiveUsers?.count || '0', 10) > 0) {
      throw new BadRequestException(
        'Cannot delete branch with active users. Please reassign users first.',
      );
    }

    await this.tenantPrisma.softDelete('branches', id);
  }

  /**
   * Set branch as head office
   */
  async setAsHeadOffice(id: number): Promise<BranchResponseDto> {
    const branch = await this.tenantPrisma.findById('branches', id);
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Unset current head office
    await this.tenantPrisma.query(
      `UPDATE branches SET "isHeadOffice" = false WHERE "companyId" = $1`,
      [branch.companyId],
    );

    // Set new head office
    await this.tenantPrisma.update('branches', id, { isHeadOffice: true });

    return this.findOne(id);
  }

  /**
   * Map database row to response DTO
   */
  private mapToResponse(branch: any): BranchResponseDto {
    return {
      id: branch.id,
      companyId: branch.companyId,
      name: branch.name,
      code: branch.code,
      email: branch.email,
      phone: branch.phone,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      country: branch.country,
      postalCode: branch.postalCode,
      timezone: branch.timezone,
      isHeadOffice: branch.isHeadOffice,
      isActive: branch.isActive,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
      companyName: branch.companyName,
      userCount: parseInt(branch.userCount || '0', 10),
      warehouseCount: parseInt(branch.warehouseCount || '0', 10),
    };
  }
}
