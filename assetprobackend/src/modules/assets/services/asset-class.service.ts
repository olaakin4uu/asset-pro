import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import {
  CreateAssetClassDto,
  UpdateAssetClassDto,
  AssetClassQueryDto,
  DepreciationMethod,
} from '../dto';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AssetClass {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description: string | null;
  depreciationMethod: string;
  usefulLifeYears: number;
  residualValuePercent: number;
  assetAccountId: number | null;
  accumulatedDepreciationAccountId: number | null;
  depreciationExpenseAccountId: number | null;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetClassStats {
  total: number;
  active: number;
  inactive: number;
  totalAssets: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class AssetClassService {
  private readonly logger = new Logger(AssetClassService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  async create(companyId: number, dto: CreateAssetClassDto): Promise<AssetClass> {
    // Check for duplicate code within company
    const existing = await this.tenantPrisma.queryOne<AssetClass>(
      `SELECT * FROM ast_asset_classes WHERE "companyId" = $1 AND code = $2 AND "deletedAt" IS NULL`,
      [companyId, dto.code],
    );

    if (existing) {
      throw new BadRequestException(`Asset class with code ${dto.code} already exists`);
    }

    // Validate GL accounts if provided
    if (dto.assetAccountId) {
      await this.validateGLAccount(dto.assetAccountId);
    }
    if (dto.accumulatedDepreciationAccountId) {
      await this.validateGLAccount(dto.accumulatedDepreciationAccountId);
    }
    if (dto.depreciationExpenseAccountId) {
      await this.validateGLAccount(dto.depreciationExpenseAccountId);
    }

    const assetClass = await this.tenantPrisma.insert<AssetClass>('ast_asset_classes', {
      companyId,
      code: dto.code,
      name: dto.name,
      description: dto.description || null,
      depreciationMethod: dto.depreciationMethod || DepreciationMethod.STRAIGHT_LINE,
      usefulLifeYears: dto.usefulLifeYears || 5,
      residualValuePercent: dto.residualValuePercent || 0,
      assetAccountId: dto.assetAccountId || null,
      accumulatedDepreciationAccountId: dto.accumulatedDepreciationAccountId || null,
      depreciationExpenseAccountId: dto.depreciationExpenseAccountId || null,
      isActive: dto.isActive ?? true,
    });

    return this.findById(companyId, assetClass.id);
  }

  async update(companyId: number, id: number, dto: UpdateAssetClassDto): Promise<AssetClass> {
    await this.findById(companyId, id);

    // Validate GL accounts if provided
    if (dto.assetAccountId) {
      await this.validateGLAccount(dto.assetAccountId);
    }
    if (dto.accumulatedDepreciationAccountId) {
      await this.validateGLAccount(dto.accumulatedDepreciationAccountId);
    }
    if (dto.depreciationExpenseAccountId) {
      await this.validateGLAccount(dto.depreciationExpenseAccountId);
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.depreciationMethod !== undefined) updateData.depreciationMethod = dto.depreciationMethod;
    if (dto.usefulLifeYears !== undefined) updateData.usefulLifeYears = dto.usefulLifeYears;
    if (dto.residualValuePercent !== undefined) updateData.residualValuePercent = dto.residualValuePercent;
    if (dto.assetAccountId !== undefined) updateData.assetAccountId = dto.assetAccountId;
    if (dto.accumulatedDepreciationAccountId !== undefined) updateData.accumulatedDepreciationAccountId = dto.accumulatedDepreciationAccountId;
    if (dto.depreciationExpenseAccountId !== undefined) updateData.depreciationExpenseAccountId = dto.depreciationExpenseAccountId;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.update<AssetClass>('ast_asset_classes', id, updateData);
    }

    return this.findById(companyId, id);
  }

  async delete(companyId: number, id: number): Promise<void> {
    await this.findById(companyId, id);

    // Check if asset class is used by any assets
    const hasAssets = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ast_assets WHERE "assetClassId" = $1 AND "deletedAt" IS NULL`,
      [id],
    );

    if (hasAssets && parseInt(hasAssets.count) > 0) {
      throw new BadRequestException('Cannot delete asset class that has assets assigned');
    }

    await this.tenantPrisma.softDelete('ast_asset_classes', id);
  }

  async findById(companyId: number, id: number): Promise<AssetClass & { assetCount: number }> {
    const assetClass = await this.tenantPrisma.queryOne<AssetClass>(
      `SELECT * FROM ast_asset_classes WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [id, companyId],
    );

    if (!assetClass) {
      throw new NotFoundException('Asset class not found');
    }

    // Get asset count
    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ast_assets WHERE "assetClassId" = $1 AND "deletedAt" IS NULL`,
      [id],
    );

    return {
      ...assetClass,
      assetCount: parseInt(countResult?.count || '0'),
    };
  }

  async findAll(companyId: number, query: AssetClassQueryDto): Promise<{ data: AssetClass[]; total: number }> {
    const conditions: string[] = ['"companyId" = $1', '"deletedAt" IS NULL'];
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.search) {
      conditions.push(`(code ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`);
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    if (query.isActive !== undefined) {
      conditions.push(`"isActive" = $${paramIndex}`);
      params.push(query.isActive);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ast_asset_classes WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || '0');

    // Get data with pagination
    const limit = query.limit || 20;
    const offset = ((query.page || 1) - 1) * limit;

    const data = await this.tenantPrisma.query<AssetClass>(
      `SELECT * FROM ast_asset_classes WHERE ${whereClause} ORDER BY "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return { data, total };
  }

  // ============================================================================
  // STATS
  // ============================================================================

  async getStats(companyId: number): Promise<AssetClassStats> {
    const stats = await this.tenantPrisma.queryOne<{
      total: string;
      active: string;
      inactive: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE "isActive" = true) as active,
        COUNT(*) FILTER (WHERE "isActive" = false) as inactive
       FROM ast_asset_classes
       WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
      [companyId],
    );

    const totalAssets = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ast_assets WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
      [companyId],
    );

    return {
      total: parseInt(stats?.total || '0'),
      active: parseInt(stats?.active || '0'),
      inactive: parseInt(stats?.inactive || '0'),
      totalAssets: parseInt(totalAssets?.count || '0'),
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async validateGLAccount(accountId: number): Promise<void> {
    const account = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT id FROM ifrs_accounts WHERE id = $1 AND "deletedAt" IS NULL`,
      [accountId],
    );

    if (!account) {
      throw new NotFoundException(`GL Account ${accountId} not found`);
    }
  }
}
