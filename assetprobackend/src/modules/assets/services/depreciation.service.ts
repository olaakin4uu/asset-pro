import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { toMoney } from '../../../common/utils/decimal';
import {
  CreateAssetDepreciationDto,
  UpdateAssetDepreciationDto,
  AssetDepreciationQueryDto,
  DepreciationStatus,
  DepreciationMethod,
} from '../dto';
import { Asset } from './asset.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AssetDepreciation {
  id: number;
  companyId: number;
  assetId: number;
  depreciationDate: Date;
  fiscalYear: number;
  fiscalPeriod: number;
  periodName: string | null;
  depreciationMethod: string;
  openingBookValue: number;
  depreciationAmount: number;
  closingBookValue: number;
  accumulatedDepreciation: number;
  annualDepreciationRate: number | null;
  usefulLifeYears: number;
  residualValue: number;
  monthsDepreciated: number;
  isPosted: boolean;
  transactionId: number | null;
  postedAt: Date | null;
  postedByUserId: number | null;
  batchNumber: string | null;
  isAdjustment: boolean;
  adjustmentReason: string | null;
  status: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetDepreciationStats {
  total: number;
  draft: number;
  pending: number;
  posted: number;
  totalAmount: number;
}

export interface CalculationResult {
  amount: number;
  method: string;
}

export interface RunResult {
  created: number;
  total: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class DepreciationService {
  private readonly logger = new Logger(DepreciationService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  async create(companyId: number, dto: CreateAssetDepreciationDto, createdById: number): Promise<AssetDepreciation> {
    // Validate asset
    const asset = await this.getAsset(companyId, dto.assetId);

    // Check for duplicate depreciation in same period
    const existing = await this.tenantPrisma.queryOne<AssetDepreciation>(
      `SELECT * FROM ast_depreciations
       WHERE "assetId" = $1 AND "fiscalYear" = $2 AND "fiscalPeriod" = $3 AND "deletedAt" IS NULL`,
      [dto.assetId, dto.fiscalYear, dto.fiscalPeriod],
    );

    if (existing && !dto.isAdjustment) {
      throw new BadRequestException('Depreciation already exists for this period');
    }

    // Calculate depreciation amount if not provided
    const depreciationAmount = dto.depreciationAmount ?? await this.calculateDepreciationAmount(asset);

    // Get current accumulated depreciation
    const accumulatedResult = await this.tenantPrisma.queryOne<{ total: string }>(
      `SELECT COALESCE(SUM("depreciationAmount"), 0) as total FROM ast_depreciations
       WHERE "assetId" = $1 AND "isPosted" = true AND "deletedAt" IS NULL`,
      [dto.assetId],
    );
    const currentAccumulated = toMoney(accumulatedResult?.total);

    const openingBookValue = asset.acquisitionCost - currentAccumulated;
    const closingBookValue = openingBookValue - depreciationAmount;
    const newAccumulated = currentAccumulated + depreciationAmount;

    const depreciation = await this.tenantPrisma.insert<AssetDepreciation>('ast_depreciations', {
      companyId,
      assetId: dto.assetId,
      depreciationDate: new Date(dto.depreciationDate),
      fiscalYear: dto.fiscalYear,
      fiscalPeriod: dto.fiscalPeriod,
      periodName: dto.periodName || null,
      depreciationMethod: dto.depreciationMethod || asset.depreciationMethod,
      openingBookValue,
      depreciationAmount,
      closingBookValue,
      accumulatedDepreciation: newAccumulated,
      annualDepreciationRate: this.calculateAnnualRate(asset),
      usefulLifeYears: asset.usefulLifeYears,
      residualValue: asset.residualValue,
      monthsDepreciated: 1,
      isPosted: false,
      batchNumber: dto.batchNumber || null,
      isAdjustment: dto.isAdjustment || false,
      adjustmentReason: dto.adjustmentReason || null,
      status: DepreciationStatus.DRAFT,
      createdById,
    });

    return this.findById(companyId, depreciation.id);
  }

  async update(companyId: number, id: number, dto: UpdateAssetDepreciationDto): Promise<AssetDepreciation> {
    const depreciation = await this.findById(companyId, id);

    if (depreciation.isPosted) {
      throw new BadRequestException('Cannot update posted depreciation');
    }

    const updateData: Record<string, any> = {};
    if (dto.depreciationDate !== undefined) updateData.depreciationDate = new Date(dto.depreciationDate);
    if (dto.fiscalYear !== undefined) updateData.fiscalYear = dto.fiscalYear;
    if (dto.fiscalPeriod !== undefined) updateData.fiscalPeriod = dto.fiscalPeriod;
    if (dto.periodName !== undefined) updateData.periodName = dto.periodName;
    if (dto.depreciationAmount !== undefined) {
      updateData.depreciationAmount = dto.depreciationAmount;
      // Recalculate closing book value
      updateData.closingBookValue = depreciation.openingBookValue - dto.depreciationAmount;
    }
    if (dto.isAdjustment !== undefined) updateData.isAdjustment = dto.isAdjustment;
    if (dto.adjustmentReason !== undefined) updateData.adjustmentReason = dto.adjustmentReason;

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.update<AssetDepreciation>('ast_depreciations', id, updateData);
    }

    return this.findById(companyId, id);
  }

  async delete(companyId: number, id: number): Promise<void> {
    const depreciation = await this.findById(companyId, id);

    if (depreciation.isPosted) {
      throw new BadRequestException('Cannot delete posted depreciation');
    }

    await this.tenantPrisma.softDelete('ast_depreciations', id);
  }

  async findById(companyId: number, id: number): Promise<AssetDepreciation & { assetCode?: string; assetName?: string; postedByUserName?: string }> {
    const depreciation = await this.tenantPrisma.queryOne<AssetDepreciation & { assetCode?: string; assetName?: string; postedByUserName?: string }>(
      `SELECT d.*,
        a."assetCode",
        a.name as "assetName",
        u.name as "postedByUserName"
       FROM ast_depreciations d
       LEFT JOIN ast_assets a ON a.id = d."assetId"
       LEFT JOIN users u ON u.id = d."postedByUserId"
       WHERE d.id = $1 AND d."companyId" = $2 AND d."deletedAt" IS NULL`,
      [id, companyId],
    );

    if (!depreciation) {
      throw new NotFoundException('Depreciation not found');
    }

    return depreciation;
  }

  async findAll(companyId: number, query: AssetDepreciationQueryDto): Promise<{ data: AssetDepreciation[]; total: number }> {
    const conditions: string[] = ['"companyId" = $1', '"deletedAt" IS NULL'];
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.assetId) {
      conditions.push(`"assetId" = $${paramIndex}`);
      params.push(query.assetId);
      paramIndex++;
    }

    if (query.fiscalYear) {
      conditions.push(`"fiscalYear" = $${paramIndex}`);
      params.push(query.fiscalYear);
      paramIndex++;
    }

    if (query.fiscalPeriod) {
      conditions.push(`"fiscalPeriod" = $${paramIndex}`);
      params.push(query.fiscalPeriod);
      paramIndex++;
    }

    if (query.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(query.status);
      paramIndex++;
    }

    if (query.isPosted !== undefined) {
      conditions.push(`"isPosted" = $${paramIndex}`);
      params.push(query.isPosted);
      paramIndex++;
    }

    if (query.batchNumber) {
      conditions.push(`"batchNumber" = $${paramIndex}`);
      params.push(query.batchNumber);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ast_depreciations WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || '0');

    // Get data with pagination
    const limit = query.limit || 20;
    const offset = ((query.page || 1) - 1) * limit;

    const data = await this.tenantPrisma.query<AssetDepreciation>(
      `SELECT * FROM ast_depreciations WHERE ${whereClause} ORDER BY "depreciationDate" DESC, "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return { data, total };
  }

  // ============================================================================
  // STATS
  // ============================================================================

  async getStats(companyId: number): Promise<AssetDepreciationStats> {
    const stats = await this.tenantPrisma.queryOne<{
      total: string;
      draft: string;
      pending: string;
      posted: string;
      totalAmount: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE "isPosted" = true) as posted,
        COALESCE(SUM("depreciationAmount"), 0) as "totalAmount"
       FROM ast_depreciations
       WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
      [companyId],
    );

    return {
      total: parseInt(stats?.total || '0'),
      draft: parseInt(stats?.draft || '0'),
      pending: parseInt(stats?.pending || '0'),
      posted: parseInt(stats?.posted || '0'),
      totalAmount: toMoney(stats?.totalAmount),
    };
  }

  // ============================================================================
  // WORKFLOW
  // ============================================================================

  async post(companyId: number, id: number, userId: number): Promise<AssetDepreciation> {
    const depreciation = await this.findById(companyId, id);

    if (depreciation.isPosted) {
      throw new BadRequestException('Depreciation already posted');
    }

    // Create GL journal entry
    const transactionId = await this.createGLEntry(companyId, depreciation);

    await this.tenantPrisma.update<AssetDepreciation>('ast_depreciations', id, {
      isPosted: true,
      status: DepreciationStatus.POSTED,
      postedAt: new Date(),
      postedByUserId: userId,
      transactionId,
    });

    // Update asset book value
    await this.tenantPrisma.query(
      `UPDATE ast_assets SET
        "accumulatedDepreciation" = "accumulatedDepreciation" + $1,
        "bookValue" = "acquisitionCost" - "accumulatedDepreciation" - $1,
        "lastDepreciationDate" = $2
       WHERE id = $3`,
      [depreciation.depreciationAmount, depreciation.depreciationDate, depreciation.assetId],
    );

    return this.findById(companyId, id);
  }

  async bulkPost(
    companyId: number,
    ids: number[],
    userId: number,
  ): Promise<{ posted: number; failed: number; failures: Array<{ recordId: number; error: string }> }> {
    let posted = 0;
    let failed = 0;
    const failures: Array<{ recordId: number; error: string }> = [];

    for (const id of ids) {
      try {
        await this.post(companyId, id, userId);
        posted++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to post depreciation ${id}: ${message}`, error instanceof Error ? error.stack : undefined);
        failed++;
        failures.push({ recordId: id, error: message });
      }
    }

    if (posted === 0 && failed > 0) {
      throw new BadRequestException({
        message: `All ${failed} depreciation posting(s) failed`,
        failures,
      });
    }

    return { posted, failed, failures };
  }

  // ============================================================================
  // CALCULATION
  // ============================================================================

  async calculate(companyId: number, assetId: number, date: string): Promise<CalculationResult> {
    const asset = await this.getAsset(companyId, assetId);
    const amount = await this.calculateDepreciationAmount(asset);

    return {
      amount,
      method: asset.depreciationMethod,
    };
  }

  async runForPeriod(companyId: number, fiscalYear: number, fiscalPeriod: number, userId: number): Promise<RunResult> {
    // Get all active assets that need depreciation
    const assets = await this.tenantPrisma.query<Asset>(
      `SELECT * FROM ast_assets
       WHERE "companyId" = $1
       AND status = 'active'
       AND "deletedAt" IS NULL
       AND ("depreciationStartDate" IS NULL OR "depreciationStartDate" <= NOW())`,
      [companyId],
    );

    let created = 0;

    for (const asset of assets) {
      // Check if depreciation already exists for this period
      const existing = await this.tenantPrisma.queryOne<AssetDepreciation>(
        `SELECT * FROM ast_depreciations
         WHERE "assetId" = $1 AND "fiscalYear" = $2 AND "fiscalPeriod" = $3 AND "deletedAt" IS NULL`,
        [asset.id, fiscalYear, fiscalPeriod],
      );

      if (!existing) {
        try {
          const batchNumber = `DEP-${fiscalYear}-${String(fiscalPeriod).padStart(2, '0')}`;
          const depreciationDate = new Date(fiscalYear, fiscalPeriod - 1, 1);

          await this.create(companyId, {
            assetId: asset.id,
            depreciationDate: depreciationDate.toISOString(),
            fiscalYear,
            fiscalPeriod,
            batchNumber,
          }, userId);

          created++;
        } catch (error) {
          this.logger.error(`Failed to create depreciation for asset ${asset.id}:`, error);
        }
      }
    }

    return { created, total: assets.length };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  // ============================================================================
  // GL JOURNAL ENTRY HELPERS
  // ============================================================================

  /**
   * Find a GL account by standard IFRS codes.
   * Tries each code in order, returning the first active match.
   */
  private async findAccountByCode(companyId: number, codes: string[]): Promise<number | null> {
    for (const code of codes) {
      const account = await this.tenantPrisma.queryOne<{ id: number }>(
        `SELECT id FROM ifrs_accounts
         WHERE "companyId" = $1 AND code LIKE $2 AND "isActive" = true AND "deletedAt" IS NULL
         LIMIT 1`,
        [companyId, `%${code}%`],
      );
      if (account) return account.id;
    }
    return null;
  }

  /**
   * Get GL account configuration for depreciation posting.
   * Checks company_settings first, then falls back to IFRS standard codes.
   */
  private async getDepreciationAccountConfig(companyId: number): Promise<{
    depreciationExpenseAccountId: number | null;
    accumulatedDepreciationAccountId: number | null;
  }> {
    const settings = await this.tenantPrisma.queryOne<{
      defaultDepreciationExpenseAccountId: number | null;
      defaultAccumulatedDepreciationAccountId: number | null;
    }>(
      `SELECT "defaultDepreciationExpenseAccountId", "defaultAccumulatedDepreciationAccountId"
       FROM company_settings
       WHERE "companyId" = $1`,
      [companyId],
    );

    const [depreciationExpenseAccountId, accumulatedDepreciationAccountId] = await Promise.all([
      settings?.defaultDepreciationExpenseAccountId ? Promise.resolve(settings.defaultDepreciationExpenseAccountId) : this.findAccountByCode(companyId, ['6600', '6610', '660']),
      settings?.defaultAccumulatedDepreciationAccountId ? Promise.resolve(settings.defaultAccumulatedDepreciationAccountId) : this.findAccountByCode(companyId, ['1610', '1620', '161']),
    ]);

    return { depreciationExpenseAccountId, accumulatedDepreciationAccountId };
  }

  /**
   * Create GL journal entry for depreciation.
   * Debit: Depreciation Expense
   * Credit: Accumulated Depreciation
   *
   * Returns the journal entry ID, or null if accounts are not configured.
   */
  private async createGLEntry(companyId: number, depreciation: AssetDepreciation & { assetCode?: string; assetName?: string }): Promise<number | null> {
    try {
      const amount = Number(depreciation.depreciationAmount) || 0;
      if (amount <= 0) {
        this.logger.warn(`Zero depreciation amount for depreciation ${depreciation.id}, skipping GL posting`);
        return null;
      }

      const config = await this.getDepreciationAccountConfig(companyId);

      if (!config.depreciationExpenseAccountId) {
        this.logger.warn(`No Depreciation Expense account configured for company ${companyId}, skipping GL posting for depreciation ${depreciation.id}`);
        return null;
      }

      if (!config.accumulatedDepreciationAccountId) {
        this.logger.warn(`No Accumulated Depreciation account configured for company ${companyId}, skipping GL posting for depreciation ${depreciation.id}`);
        return null;
      }

      const assetRef = depreciation.assetCode || depreciation.assetName || `Asset #${depreciation.assetId}`;
      const periodRef = depreciation.periodName || `${depreciation.fiscalYear}-${String(depreciation.fiscalPeriod).padStart(2, '0')}`;

      // Create journal entry
      const journalEntry = await this.tenantPrisma.insert<{ id: number }>('journal_entries', {
        companyId,
        entryDate: depreciation.depreciationDate,
        referenceType: 'asset_depreciation',
        referenceId: depreciation.id,
        description: `Depreciation - ${assetRef} (${periodRef})`,
        status: 'posted',
      });

      // Debit: Depreciation Expense
      await this.tenantPrisma.insert('journal_entry_line_items', {
        journalEntryId: journalEntry.id,
        accountId: config.depreciationExpenseAccountId,
        debit: amount,
        credit: 0,
        description: `Depreciation expense - ${assetRef}`,
      });

      // Credit: Accumulated Depreciation
      await this.tenantPrisma.insert('journal_entry_line_items', {
        journalEntryId: journalEntry.id,
        accountId: config.accumulatedDepreciationAccountId,
        debit: 0,
        credit: amount,
        description: `Accumulated depreciation - ${assetRef}`,
      });

      this.logger.log(`GL entry posted for depreciation of ${assetRef} (journal entry #${journalEntry.id}, amount: ${amount})`);
      return journalEntry.id;
    } catch (error) {
      this.logger.error(`GL FAILED for depreciation ${depreciation.id}: ${error.message}`, error.stack);
      throw new Error(`Depreciation GL posting failed: ${error.message}. Fix GL account configuration for this asset.`);
    }
  }

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

  private async calculateDepreciationAmount(asset: Asset): Promise<number> {
    const depreciableValue = asset.acquisitionCost - asset.residualValue;
    const currentBookValue = asset.bookValue - asset.residualValue;

    // Don't depreciate below residual value
    if (currentBookValue <= 0) {
      return 0;
    }

    switch (asset.depreciationMethod) {
      case DepreciationMethod.STRAIGHT_LINE:
        // Annual depreciation / 12 for monthly
        const annualDepreciation = depreciableValue / asset.usefulLifeYears;
        return Math.min(annualDepreciation / 12, currentBookValue);

      case DepreciationMethod.DECLINING_BALANCE:
        // Double declining balance method
        const rate = (2 / asset.usefulLifeYears);
        return Math.min((asset.bookValue * rate) / 12, currentBookValue);

      case DepreciationMethod.SUM_OF_YEARS_DIGITS:
        // Sum of years digits method
        const totalYears = (asset.usefulLifeYears * (asset.usefulLifeYears + 1)) / 2;
        const yearsRemaining = this.calculateYearsRemaining(asset);
        const soyFraction = yearsRemaining / totalYears;
        return Math.min((depreciableValue * soyFraction) / 12, currentBookValue);

      case DepreciationMethod.UNITS_OF_PRODUCTION:
        // For units of production, we'd need actual usage data
        // Fallback to straight line
        return Math.min(depreciableValue / (asset.usefulLifeYears * 12), currentBookValue);

      default:
        return Math.min(depreciableValue / (asset.usefulLifeYears * 12), currentBookValue);
    }
  }

  private calculateAnnualRate(asset: Asset): number {
    if (asset.acquisitionCost === 0) return 0;

    const depreciableValue = asset.acquisitionCost - asset.residualValue;
    const annualDepreciation = depreciableValue / asset.usefulLifeYears;

    return (annualDepreciation / asset.acquisitionCost) * 100;
  }

  private calculateYearsRemaining(asset: Asset): number {
    if (!asset.depreciationStartDate) {
      return asset.usefulLifeYears;
    }

    const startDate = new Date(asset.depreciationStartDate);
    const now = new Date();
    const yearsElapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    return Math.max(0, asset.usefulLifeYears - Math.floor(yearsElapsed));
  }
}
