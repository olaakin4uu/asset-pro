import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { toMoney } from '../../../common/utils/decimal';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AssetQueryDto,
  AssetStatus,
  AssetCondition,
  AcquisitionMethod,
  DepreciationMethod,
} from '../dto';
import { AssetClass } from './asset-class.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface Asset {
  id: number;
  companyId: number;
  assetClassId: number;
  assetCode: string;
  name: string;
  description: string | null;
  serialNumber: string | null;
  barcode: string | null;
  location: string | null;
  department: string | null;
  custodianUserId: number | null;
  acquisitionDate: Date | null;
  acquisitionCost: number;
  acquisitionMethod: string | null;
  supplierId: number | null;
  purchaseOrderNumber: string | null;
  invoiceNumber: string | null;
  grnId: number | null;
  grnLineId: number | null;
  depreciationMethod: string;
  usefulLifeYears: number;
  residualValue: number;
  residualValuePercent: number;
  depreciationStartDate: Date | null;
  bookValue: number;
  accumulatedDepreciation: number;
  impairmentLoss: number;
  lastDepreciationDate: Date | null;
  status: string;
  condition: string;
  warrantyStartDate: Date | null;
  warrantyExpiryDate: Date | null;
  lastMaintenanceDate: Date | null;
  nextMaintenanceDate: Date | null;
  disposalDate: Date | null;
  disposalValue: number | null;
  disposalMethod: string | null;
  disposalNotes: string | null;
  notes: string | null;
  customFields: Record<string, unknown> | null;
  imagePath: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetStats {
  total: number;
  active: number;
  inactive: number;
  underMaintenance: number;
  disposed: number;
  totalValue: number;
  totalAccumulatedDepreciation: number;
  totalNetBookValue: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  async create(companyId: number, dto: CreateAssetDto, createdById: number): Promise<Asset> {
    // Validate asset class
    const assetClass = await this.tenantPrisma.queryOne<AssetClass>(
      `SELECT * FROM ast_asset_classes WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [dto.assetClassId, companyId],
    );

    if (!assetClass) {
      throw new NotFoundException('Asset class not found');
    }

    // Generate asset code if not provided
    let assetCode = dto.assetCode;
    if (!assetCode) {
      assetCode = await this.generateAssetCode(companyId);
    } else {
      // Check for duplicate code
      const existing = await this.tenantPrisma.queryOne<Asset>(
        `SELECT * FROM ast_assets WHERE "companyId" = $1 AND "assetCode" = $2 AND "deletedAt" IS NULL`,
        [companyId, assetCode],
      );

      if (existing) {
        throw new BadRequestException(`Asset with code ${assetCode} already exists`);
      }
    }

    // Calculate initial values
    const acquisitionCost = dto.acquisitionCost;
    const residualValuePercent = dto.residualValuePercent ?? assetClass.residualValuePercent;
    const residualValue = dto.residualValue ?? (acquisitionCost * residualValuePercent / 100);
    const depreciationMethod = dto.depreciationMethod || assetClass.depreciationMethod;
    const usefulLifeYears = dto.usefulLifeYears || assetClass.usefulLifeYears;

    const asset = await this.tenantPrisma.insert<Asset>('ast_assets', {
      companyId,
      branchId: dto.branchId || null,
      assetClassId: dto.assetClassId,
      assetCode,
      name: dto.name,
      description: dto.description || null,
      serialNumber: dto.serialNumber || null,
      barcode: dto.barcode || null,
      location: dto.location || null,
      department: dto.department || null,
      custodianUserId: dto.custodianUserId || null,
      acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : new Date(),
      acquisitionCost,
      acquisitionMethod: dto.acquisitionMethod || AcquisitionMethod.PURCHASE,
      supplierId: dto.supplierId || null,
      purchaseOrderNumber: dto.purchaseOrderNumber || null,
      invoiceNumber: dto.invoiceNumber || null,
      depreciationMethod,
      usefulLifeYears,
      residualValue,
      residualValuePercent,
      depreciationStartDate: dto.depreciationStartDate ? new Date(dto.depreciationStartDate) : (dto.acquisitionDate ? new Date(dto.acquisitionDate) : new Date()),
      bookValue: acquisitionCost,
      accumulatedDepreciation: 0,
      impairmentLoss: 0,
      status: dto.status || AssetStatus.ACTIVE,
      condition: dto.condition || AssetCondition.NEW,
      warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : null,
      warrantyExpiryDate: dto.warrantyExpiryDate ? new Date(dto.warrantyExpiryDate) : null,
      notes: dto.notes || null,
      customFields: dto.customFields || null,
      createdById,
    });

    return this.findById(companyId, asset.id);
  }

  async update(companyId: number, id: number, dto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.findById(companyId, id);

    // Cannot update disposed assets
    if (asset.status === AssetStatus.DISPOSED) {
      throw new BadRequestException('Cannot update disposed asset');
    }

    // Validate asset class if changing
    if (dto.assetClassId && dto.assetClassId !== asset.assetClassId) {
      const assetClass = await this.tenantPrisma.queryOne<AssetClass>(
        `SELECT * FROM ast_asset_classes WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
        [dto.assetClassId, companyId],
      );

      if (!assetClass) {
        throw new NotFoundException('Asset class not found');
      }
    }

    const updateData: Record<string, any> = {};
    if (dto.assetClassId !== undefined) updateData.assetClassId = dto.assetClassId;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.serialNumber !== undefined) updateData.serialNumber = dto.serialNumber;
    if (dto.barcode !== undefined) updateData.barcode = dto.barcode;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.department !== undefined) updateData.department = dto.department;
    if (dto.custodianUserId !== undefined) updateData.custodianUserId = dto.custodianUserId;
    if (dto.acquisitionDate !== undefined) updateData.acquisitionDate = dto.acquisitionDate ? new Date(dto.acquisitionDate) : null;
    if (dto.acquisitionCost !== undefined) updateData.acquisitionCost = dto.acquisitionCost;
    if (dto.acquisitionMethod !== undefined) updateData.acquisitionMethod = dto.acquisitionMethod;
    if (dto.supplierId !== undefined) updateData.supplierId = dto.supplierId;
    if (dto.purchaseOrderNumber !== undefined) updateData.purchaseOrderNumber = dto.purchaseOrderNumber;
    if (dto.invoiceNumber !== undefined) updateData.invoiceNumber = dto.invoiceNumber;
    if (dto.depreciationMethod !== undefined) updateData.depreciationMethod = dto.depreciationMethod;
    if (dto.usefulLifeYears !== undefined) updateData.usefulLifeYears = dto.usefulLifeYears;
    if (dto.residualValue !== undefined) updateData.residualValue = dto.residualValue;
    if (dto.residualValuePercent !== undefined) updateData.residualValuePercent = dto.residualValuePercent;
    if (dto.depreciationStartDate !== undefined) updateData.depreciationStartDate = dto.depreciationStartDate ? new Date(dto.depreciationStartDate) : null;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.condition !== undefined) updateData.condition = dto.condition;
    if (dto.warrantyStartDate !== undefined) updateData.warrantyStartDate = dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : null;
    if (dto.warrantyExpiryDate !== undefined) updateData.warrantyExpiryDate = dto.warrantyExpiryDate ? new Date(dto.warrantyExpiryDate) : null;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.customFields !== undefined) updateData.customFields = dto.customFields;

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.update<Asset>('ast_assets', id, updateData);
    }

    return this.findById(companyId, id);
  }

  async delete(companyId: number, id: number): Promise<void> {
    const asset = await this.findById(companyId, id);

    // Check for related records
    const hasDepreciations = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ast_depreciations WHERE "assetId" = $1 AND "deletedAt" IS NULL`,
      [id],
    );

    if (hasDepreciations && parseInt(hasDepreciations.count) > 0) {
      throw new BadRequestException('Cannot delete asset with depreciation history');
    }

    await this.tenantPrisma.softDelete('ast_assets', id);
  }

  async findById(companyId: number, id: number): Promise<Asset & { assetClassName?: string; assetClassCode?: string; netBookValue: number; depreciationPercent: number; isUnderWarranty: boolean; custodianName?: string }> {
    const asset = await this.tenantPrisma.queryOne<Asset & { assetClassName?: string; assetClassCode?: string; custodianName?: string }>(
      `SELECT a.*,
        ac.name as "assetClassName",
        ac.code as "assetClassCode",
        u.name as "custodianName"
       FROM ast_assets a
       LEFT JOIN ast_asset_classes ac ON ac.id = a."assetClassId"
       LEFT JOIN users u ON u.id = a."custodianUserId"
       WHERE a.id = $1 AND a."companyId" = $2 AND a."deletedAt" IS NULL`,
      [id, companyId],
    );

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Calculate derived values
    const netBookValue = asset.bookValue - asset.accumulatedDepreciation - asset.impairmentLoss;
    const depreciationPercent = asset.acquisitionCost > 0
      ? (asset.accumulatedDepreciation / asset.acquisitionCost) * 100
      : 0;
    const isUnderWarranty = asset.warrantyExpiryDate
      ? new Date(asset.warrantyExpiryDate) > new Date()
      : false;

    return {
      ...asset,
      netBookValue,
      depreciationPercent,
      isUnderWarranty,
    };
  }

  async findAll(companyId: number, query: AssetQueryDto): Promise<{ data: Asset[]; total: number }> {
    const conditions: string[] = ['"companyId" = $1', '"deletedAt" IS NULL'];
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.search) {
      conditions.push(`("assetCode" ILIKE $${paramIndex} OR name ILIKE $${paramIndex} OR "serialNumber" ILIKE $${paramIndex})`);
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    if (query.assetClassId) {
      conditions.push(`"assetClassId" = $${paramIndex}`);
      params.push(query.assetClassId);
      paramIndex++;
    }

    if (query.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(query.status);
      paramIndex++;
    }

    if (query.condition) {
      conditions.push(`condition = $${paramIndex}`);
      params.push(query.condition);
      paramIndex++;
    }

    if (query.location) {
      conditions.push(`location ILIKE $${paramIndex}`);
      params.push(`%${query.location}%`);
      paramIndex++;
    }

    if (query.department) {
      conditions.push(`department ILIKE $${paramIndex}`);
      params.push(`%${query.department}%`);
      paramIndex++;
    }

    if (query.custodianUserId) {
      conditions.push(`"custodianUserId" = $${paramIndex}`);
      params.push(query.custodianUserId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ast_assets WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || '0');

    // Get data with pagination
    const limit = query.limit || 20;
    const offset = ((query.page || 1) - 1) * limit;

    const data = await this.tenantPrisma.query<Asset>(
      `SELECT * FROM ast_assets WHERE ${whereClause} ORDER BY "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return { data, total };
  }

  // ============================================================================
  // STATS
  // ============================================================================

  async getStats(companyId: number): Promise<AssetStats> {
    const stats = await this.tenantPrisma.queryOne<{
      total: string;
      active: string;
      inactive: string;
      underMaintenance: string;
      disposed: string;
      totalValue: string;
      totalAccumulatedDepreciation: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
        COUNT(*) FILTER (WHERE status = 'under_maintenance') as "underMaintenance",
        COUNT(*) FILTER (WHERE status = 'disposed') as disposed,
        COALESCE(SUM("acquisitionCost"), 0) as "totalValue",
        COALESCE(SUM("accumulatedDepreciation"), 0) as "totalAccumulatedDepreciation"
       FROM ast_assets
       WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
      [companyId],
    );

    const totalValue = toMoney(stats?.totalValue);
    const totalAccumulatedDepreciation = toMoney(stats?.totalAccumulatedDepreciation);

    return {
      total: parseInt(stats?.total || '0'),
      active: parseInt(stats?.active || '0'),
      inactive: parseInt(stats?.inactive || '0'),
      underMaintenance: parseInt(stats?.underMaintenance || '0'),
      disposed: parseInt(stats?.disposed || '0'),
      totalValue,
      totalAccumulatedDepreciation,
      totalNetBookValue: totalValue - totalAccumulatedDepreciation,
    };
  }

  // ============================================================================
  // RELATED RESOURCES
  // ============================================================================

  async getDepreciations(companyId: number, assetId: number): Promise<any[]> {
    await this.findById(companyId, assetId);

    return this.tenantPrisma.query(
      `SELECT * FROM ast_depreciations WHERE "assetId" = $1 AND "deletedAt" IS NULL ORDER BY "depreciationDate" DESC`,
      [assetId],
    );
  }

  async getMaintenances(companyId: number, assetId: number): Promise<any[]> {
    await this.findById(companyId, assetId);

    return this.tenantPrisma.query(
      `SELECT * FROM ast_maintenances WHERE "assetId" = $1 AND "deletedAt" IS NULL ORDER BY "scheduledDate" DESC`,
      [assetId],
    );
  }

  async getTransfers(companyId: number, assetId: number): Promise<any[]> {
    await this.findById(companyId, assetId);

    return this.tenantPrisma.query(
      `SELECT * FROM ast_transfers WHERE "assetId" = $1 AND "deletedAt" IS NULL ORDER BY "transferDate" DESC`,
      [assetId],
    );
  }

  async getDisposals(companyId: number, assetId: number): Promise<any[]> {
    await this.findById(companyId, assetId);

    return this.tenantPrisma.query(
      `SELECT * FROM ast_disposals WHERE "assetId" = $1 AND "deletedAt" IS NULL ORDER BY "disposalDate" DESC`,
      [assetId],
    );
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async generateAssetCode(companyId: number): Promise<string> {
    // Get settings
    const settings = await this.tenantPrisma.queryOne<{ codePrefix: string; codePadding: number }>(
      `SELECT "codePrefix", "codePadding" FROM ast_settings WHERE "companyId" = $1`,
      [companyId],
    );

    const prefix = settings?.codePrefix || 'AST';
    const padding = settings?.codePadding || 6;

    // Get next sequence number
    const lastAsset = await this.tenantPrisma.queryOne<{ assetCode: string }>(
      `SELECT "assetCode" FROM ast_assets
       WHERE "companyId" = $1 AND "assetCode" LIKE $2
       ORDER BY "createdAt" DESC LIMIT 1`,
      [companyId, `${prefix}%`],
    );

    let nextNumber = 1;
    if (lastAsset?.assetCode) {
      const numPart = lastAsset.assetCode.replace(prefix, '');
      const parsedNum = parseInt(numPart);
      if (!isNaN(parsedNum)) {
        nextNumber = parsedNum + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(padding, '0')}`;
  }

  async updateBookValue(assetId: number, depreciationAmount: number): Promise<void> {
    await this.tenantPrisma.query(
      `UPDATE ast_assets SET
        "accumulatedDepreciation" = "accumulatedDepreciation" + $1,
        "bookValue" = "acquisitionCost" - "accumulatedDepreciation" - $1,
        "lastDepreciationDate" = NOW()
       WHERE id = $2`,
      [depreciationAmount, assetId],
    );
  }
}
