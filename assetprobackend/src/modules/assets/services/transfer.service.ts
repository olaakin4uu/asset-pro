import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import {
  CreateAssetTransferDto,
  UpdateAssetTransferDto,
  AssetTransferQueryDto,
  TransferStatus,
  AssetStatus,
} from '../dto';
import { Asset } from './asset.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AssetTransfer {
  id: number;
  companyId: number;
  assetId: number;
  transferNumber: string;
  transferDate: Date;
  effectiveDate: Date | null;
  transferType: string;
  fromLocation: string | null;
  fromDepartment: string | null;
  fromCustodianUserId: number | null;
  fromBranchId: number | null;
  toLocation: string | null;
  toDepartment: string | null;
  toCustodianUserId: number | null;
  toBranchId: number | null;
  conditionAtTransfer: string | null;
  conditionNotes: string | null;
  status: string;
  requestedByUserId: number | null;
  approvedByUserId: number | null;
  approvedAt: Date | null;
  dispatchedAt: Date | null;
  receivedByUserId: number | null;
  receivedAt: Date | null;
  reason: string | null;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetTransferStats {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  inTransit: number;
  completed: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  async create(companyId: number, dto: CreateAssetTransferDto, createdById: number): Promise<AssetTransfer> {
    // Validate asset
    const asset = await this.getAsset(companyId, dto.assetId);

    if (asset.status === AssetStatus.DISPOSED) {
      throw new BadRequestException('Cannot transfer disposed asset');
    }

    // Check for pending transfer
    const pendingTransfer = await this.tenantPrisma.queryOne<AssetTransfer>(
      `SELECT * FROM ast_transfers
       WHERE "assetId" = $1 AND status NOT IN ('cancelled', 'completed') AND "deletedAt" IS NULL`,
      [dto.assetId],
    );

    if (pendingTransfer) {
      throw new BadRequestException('Asset already has a pending transfer');
    }

    // Generate transfer number
    const transferNumber = await this.generateTransferNumber(companyId);

    const transfer = await this.tenantPrisma.insert<AssetTransfer>('ast_transfers', {
      companyId,
      assetId: dto.assetId,
      transferNumber,
      transferDate: new Date(dto.transferDate),
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
      transferType: dto.transferType,
      fromLocation: asset.location,
      fromDepartment: asset.department,
      fromCustodianUserId: asset.custodianUserId,
      // fromBranchId: asset.branchId, // If you track branch on asset
      toLocation: dto.toLocation || null,
      toDepartment: dto.toDepartment || null,
      toCustodianUserId: dto.toCustodianUserId || null,
      toBranchId: dto.toBranchId || null,
      conditionAtTransfer: dto.conditionAtTransfer || asset.condition,
      conditionNotes: dto.conditionNotes || null,
      status: TransferStatus.DRAFT,
      requestedByUserId: createdById,
      reason: dto.reason || null,
      notes: dto.notes || null,
    });

    return this.findById(companyId, transfer.id);
  }

  async update(companyId: number, id: number, dto: UpdateAssetTransferDto): Promise<AssetTransfer> {
    const transfer = await this.findById(companyId, id);

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new BadRequestException('Can only update draft transfers');
    }

    const updateData: Record<string, any> = {};
    if (dto.transferDate !== undefined) updateData.transferDate = new Date(dto.transferDate);
    if (dto.effectiveDate !== undefined) updateData.effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : null;
    if (dto.transferType !== undefined) updateData.transferType = dto.transferType;
    if (dto.toLocation !== undefined) updateData.toLocation = dto.toLocation;
    if (dto.toDepartment !== undefined) updateData.toDepartment = dto.toDepartment;
    if (dto.toCustodianUserId !== undefined) updateData.toCustodianUserId = dto.toCustodianUserId;
    if (dto.toBranchId !== undefined) updateData.toBranchId = dto.toBranchId;
    if (dto.conditionAtTransfer !== undefined) updateData.conditionAtTransfer = dto.conditionAtTransfer;
    if (dto.conditionNotes !== undefined) updateData.conditionNotes = dto.conditionNotes;
    if (dto.reason !== undefined) updateData.reason = dto.reason;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.update<AssetTransfer>('ast_transfers', id, updateData);
    }

    return this.findById(companyId, id);
  }

  async delete(companyId: number, id: number): Promise<void> {
    const transfer = await this.findById(companyId, id);

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new BadRequestException('Can only delete draft transfers');
    }

    await this.tenantPrisma.softDelete('ast_transfers', id);
  }

  async findById(companyId: number, id: number): Promise<AssetTransfer & {
    assetCode?: string;
    assetName?: string;
    fromCustodianName?: string;
    toCustodianName?: string;
    fromBranchName?: string;
    toBranchName?: string;
    requestedByUserName?: string;
    approvedByUserName?: string;
    receivedByUserName?: string;
  }> {
    const transfer = await this.tenantPrisma.queryOne<AssetTransfer & {
      assetCode?: string;
      assetName?: string;
      fromCustodianName?: string;
      toCustodianName?: string;
      fromBranchName?: string;
      toBranchName?: string;
      requestedByUserName?: string;
      approvedByUserName?: string;
      receivedByUserName?: string;
    }>(
      `SELECT t.*,
        a."assetCode",
        a.name as "assetName",
        uf.name as "fromCustodianName",
        ut.name as "toCustodianName",
        bf.name as "fromBranchName",
        bt.name as "toBranchName",
        ur.name as "requestedByUserName",
        ua.name as "approvedByUserName",
        urc.name as "receivedByUserName"
       FROM ast_transfers t
       LEFT JOIN ast_assets a ON a.id = t."assetId"
       LEFT JOIN users uf ON uf.id = t."fromCustodianUserId"
       LEFT JOIN users ut ON ut.id = t."toCustodianUserId"
       LEFT JOIN branches bf ON bf.id = t."fromBranchId"
       LEFT JOIN branches bt ON bt.id = t."toBranchId"
       LEFT JOIN users ur ON ur.id = t."requestedByUserId"
       LEFT JOIN users ua ON ua.id = t."approvedByUserId"
       LEFT JOIN users urc ON urc.id = t."receivedByUserId"
       WHERE t.id = $1 AND t."companyId" = $2 AND t."deletedAt" IS NULL`,
      [id, companyId],
    );

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return transfer;
  }

  async findAll(companyId: number, query: AssetTransferQueryDto): Promise<{ data: AssetTransfer[]; total: number }> {
    const conditions: string[] = ['"companyId" = $1', '"deletedAt" IS NULL'];
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.assetId) {
      conditions.push(`"assetId" = $${paramIndex}`);
      params.push(query.assetId);
      paramIndex++;
    }

    if (query.transferType) {
      conditions.push(`"transferType" = $${paramIndex}`);
      params.push(query.transferType);
      paramIndex++;
    }

    if (query.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(query.status);
      paramIndex++;
    }

    if (query.dateFrom) {
      conditions.push(`"transferDate" >= $${paramIndex}`);
      params.push(new Date(query.dateFrom));
      paramIndex++;
    }

    if (query.dateTo) {
      conditions.push(`"transferDate" <= $${paramIndex}`);
      params.push(new Date(query.dateTo));
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ast_transfers WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || '0');

    // Get data with pagination
    const limit = query.limit || 20;
    const offset = ((query.page || 1) - 1) * limit;

    const data = await this.tenantPrisma.query<AssetTransfer>(
      `SELECT * FROM ast_transfers WHERE ${whereClause} ORDER BY "transferDate" DESC, "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return { data, total };
  }

  // ============================================================================
  // STATS
  // ============================================================================

  async getStats(companyId: number): Promise<AssetTransferStats> {
    const stats = await this.tenantPrisma.queryOne<{
      total: string;
      draft: string;
      pendingApproval: string;
      approved: string;
      inTransit: string;
      completed: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'pending_approval') as "pendingApproval",
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'in_transit') as "inTransit",
        COUNT(*) FILTER (WHERE status = 'completed') as completed
       FROM ast_transfers
       WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
      [companyId],
    );

    return {
      total: parseInt(stats?.total || '0'),
      draft: parseInt(stats?.draft || '0'),
      pendingApproval: parseInt(stats?.pendingApproval || '0'),
      approved: parseInt(stats?.approved || '0'),
      inTransit: parseInt(stats?.inTransit || '0'),
      completed: parseInt(stats?.completed || '0'),
    };
  }

  // ============================================================================
  // WORKFLOW
  // ============================================================================

  async submit(companyId: number, id: number): Promise<AssetTransfer> {
    const transfer = await this.findById(companyId, id);

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new BadRequestException('Can only submit draft transfers');
    }

    await this.tenantPrisma.update<AssetTransfer>('ast_transfers', id, {
      status: TransferStatus.PENDING_APPROVAL,
    });

    return this.findById(companyId, id);
  }

  async approve(companyId: number, id: number, userId: number): Promise<AssetTransfer> {
    const transfer = await this.findById(companyId, id);

    if (transfer.status !== TransferStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Can only approve pending transfers');
    }

    await this.tenantPrisma.update<AssetTransfer>('ast_transfers', id, {
      status: TransferStatus.APPROVED,
      approvedByUserId: userId,
      approvedAt: new Date(),
    });

    return this.findById(companyId, id);
  }

  async reject(companyId: number, id: number, reason?: string): Promise<AssetTransfer> {
    const transfer = await this.findById(companyId, id);

    if (transfer.status !== TransferStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Can only reject pending transfers');
    }

    await this.tenantPrisma.update<AssetTransfer>('ast_transfers', id, {
      status: TransferStatus.DRAFT,
      notes: reason ? `Rejected: ${reason}. ${transfer.notes || ''}` : transfer.notes,
    });

    return this.findById(companyId, id);
  }

  async dispatch(companyId: number, id: number): Promise<AssetTransfer> {
    const transfer = await this.findById(companyId, id);

    if (transfer.status !== TransferStatus.APPROVED) {
      throw new BadRequestException('Can only dispatch approved transfers');
    }

    await this.tenantPrisma.update<AssetTransfer>('ast_transfers', id, {
      status: TransferStatus.IN_TRANSIT,
      dispatchedAt: new Date(),
    });

    return this.findById(companyId, id);
  }

  async complete(companyId: number, id: number, userId: number): Promise<AssetTransfer> {
    const transfer = await this.findById(companyId, id);

    if (transfer.status !== TransferStatus.IN_TRANSIT && transfer.status !== TransferStatus.APPROVED) {
      throw new BadRequestException('Can only complete in-transit or approved transfers');
    }

    // Update transfer status
    await this.tenantPrisma.update<AssetTransfer>('ast_transfers', id, {
      status: TransferStatus.COMPLETED,
      receivedByUserId: userId,
      receivedAt: new Date(),
    });

    // Update asset with new location/department/custodian
    const updateAssetData: Record<string, any> = {};
    if (transfer.toLocation) updateAssetData.location = transfer.toLocation;
    if (transfer.toDepartment) updateAssetData.department = transfer.toDepartment;
    if (transfer.toCustodianUserId) updateAssetData.custodianUserId = transfer.toCustodianUserId;
    if (transfer.conditionAtTransfer) updateAssetData.condition = transfer.conditionAtTransfer;

    if (Object.keys(updateAssetData).length > 0) {
      await this.tenantPrisma.update('ast_assets', transfer.assetId, updateAssetData);
    }

    return this.findById(companyId, id);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async getAsset(companyId: number, assetId: number): Promise<Asset> {
    const asset = await this.tenantPrisma.queryOne<Asset>(
      `SELECT * FROM ast_assets WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [assetId, companyId],
    );

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  private async generateTransferNumber(companyId: number): Promise<string> {
    const prefix = 'TRF';
    const year = new Date().getFullYear();

    const lastTransfer = await this.tenantPrisma.queryOne<{ transferNumber: string }>(
      `SELECT "transferNumber" FROM ast_transfers
       WHERE "companyId" = $1 AND "transferNumber" LIKE $2
       ORDER BY "createdAt" DESC LIMIT 1`,
      [companyId, `${prefix}${year}%`],
    );

    let nextNumber = 1;
    if (lastTransfer?.transferNumber) {
      const numPart = lastTransfer.transferNumber.replace(`${prefix}${year}`, '');
      const parsedNum = parseInt(numPart);
      if (!isNaN(parsedNum)) {
        nextNumber = parsedNum + 1;
      }
    }

    return `${prefix}${year}${String(nextNumber).padStart(5, '0')}`;
  }
}
