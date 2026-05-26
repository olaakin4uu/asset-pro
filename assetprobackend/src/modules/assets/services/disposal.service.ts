import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { toMoney } from '../../../common/utils/decimal';
import {
  CreateAssetDisposalDto,
  UpdateAssetDisposalDto,
  AssetDisposalQueryDto,
  DisposalStatus,
  AssetStatus,
} from '../dto';
import { Asset } from './asset.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AssetDisposal {
  id: number;
  companyId: number;
  assetId: number;
  disposalNumber: string;
  disposalDate: Date;
  disposalType: string;
  bookValueAtDisposal: number;
  accumulatedDepreciation: number;
  disposalProceeds: number;
  disposalCosts: number;
  gainLoss: number;
  buyerEntityId: number | null;
  buyerName: string | null;
  buyerContact: string | null;
  buyerAddress: string | null;
  saleAgreementNumber: string | null;
  invoiceNumber: string | null;
  paymentReceivedDate: Date | null;
  paymentMethod: string | null;
  status: string;
  requestedByUserId: number | null;
  approvedByUserId: number | null;
  approvedAt: Date | null;
  completedAt: Date | null;
  isPosted: boolean;
  transactionId: number | null;
  postedAt: Date | null;
  reason: string | null;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetDisposalStats {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  completed: number;
  totalProceeds: number;
  totalGainLoss: number;
}

export interface GainLossResult {
  gainLoss: number;
  bookValue: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class DisposalService {
  private readonly logger = new Logger(DisposalService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  async create(companyId: number, dto: CreateAssetDisposalDto, createdById: number): Promise<AssetDisposal> {
    // Validate asset
    const asset = await this.getAsset(companyId, dto.assetId);

    if (asset.status === AssetStatus.DISPOSED) {
      throw new BadRequestException('Asset is already disposed');
    }

    // Check for pending disposal
    const pendingDisposal = await this.tenantPrisma.queryOne<AssetDisposal>(
      `SELECT * FROM ast_disposals
       WHERE "assetId" = $1 AND status NOT IN ('cancelled', 'completed') AND "deletedAt" IS NULL`,
      [dto.assetId],
    );

    if (pendingDisposal) {
      throw new BadRequestException('Asset already has a pending disposal');
    }

    // Generate disposal number
    const disposalNumber = await this.generateDisposalNumber(companyId);

    // Calculate book value and gain/loss
    const bookValueAtDisposal = asset.bookValue;
    const accumulatedDepreciation = asset.accumulatedDepreciation;
    const disposalProceeds = dto.disposalProceeds || 0;
    const disposalCosts = dto.disposalCosts || 0;
    const gainLoss = disposalProceeds - disposalCosts - bookValueAtDisposal;

    const disposal = await this.tenantPrisma.insert<AssetDisposal>('ast_disposals', {
      companyId,
      assetId: dto.assetId,
      disposalNumber,
      disposalDate: new Date(dto.disposalDate),
      disposalType: dto.disposalType,
      bookValueAtDisposal,
      accumulatedDepreciation,
      disposalProceeds,
      disposalCosts,
      gainLoss,
      buyerName: dto.buyerName || null,
      buyerContact: dto.buyerContact || null,
      buyerAddress: dto.buyerAddress || null,
      saleAgreementNumber: dto.saleAgreementNumber || null,
      invoiceNumber: dto.invoiceNumber || null,
      paymentReceivedDate: dto.paymentReceivedDate ? new Date(dto.paymentReceivedDate) : null,
      paymentMethod: dto.paymentMethod || null,
      status: DisposalStatus.DRAFT,
      requestedByUserId: createdById,
      reason: dto.reason || null,
      notes: dto.notes || null,
      isPosted: false,
    });

    return this.findById(companyId, disposal.id);
  }

  async update(companyId: number, id: number, dto: UpdateAssetDisposalDto): Promise<AssetDisposal> {
    const disposal = await this.findById(companyId, id);

    if (disposal.status !== DisposalStatus.DRAFT) {
      throw new BadRequestException('Can only update draft disposals');
    }

    const updateData: Record<string, any> = {};
    if (dto.disposalDate !== undefined) updateData.disposalDate = new Date(dto.disposalDate);
    if (dto.disposalType !== undefined) updateData.disposalType = dto.disposalType;
    if (dto.disposalProceeds !== undefined) {
      updateData.disposalProceeds = dto.disposalProceeds;
      // Recalculate gain/loss
      const costs = dto.disposalCosts ?? disposal.disposalCosts;
      updateData.gainLoss = dto.disposalProceeds - costs - disposal.bookValueAtDisposal;
    }
    if (dto.disposalCosts !== undefined) {
      updateData.disposalCosts = dto.disposalCosts;
      // Recalculate gain/loss
      const proceeds = dto.disposalProceeds ?? disposal.disposalProceeds;
      updateData.gainLoss = proceeds - dto.disposalCosts - disposal.bookValueAtDisposal;
    }
    if (dto.buyerName !== undefined) updateData.buyerName = dto.buyerName;
    if (dto.buyerContact !== undefined) updateData.buyerContact = dto.buyerContact;
    if (dto.buyerAddress !== undefined) updateData.buyerAddress = dto.buyerAddress;
    if (dto.saleAgreementNumber !== undefined) updateData.saleAgreementNumber = dto.saleAgreementNumber;
    if (dto.invoiceNumber !== undefined) updateData.invoiceNumber = dto.invoiceNumber;
    if (dto.paymentReceivedDate !== undefined) updateData.paymentReceivedDate = dto.paymentReceivedDate ? new Date(dto.paymentReceivedDate) : null;
    if (dto.paymentMethod !== undefined) updateData.paymentMethod = dto.paymentMethod;
    if (dto.reason !== undefined) updateData.reason = dto.reason;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.update<AssetDisposal>('ast_disposals', id, updateData);
    }

    return this.findById(companyId, id);
  }

  async delete(companyId: number, id: number): Promise<void> {
    const disposal = await this.findById(companyId, id);

    if (disposal.status !== DisposalStatus.DRAFT) {
      throw new BadRequestException('Can only delete draft disposals');
    }

    await this.tenantPrisma.softDelete('ast_disposals', id);
  }

  async findById(companyId: number, id: number): Promise<AssetDisposal & { assetCode?: string; assetName?: string; requestedByUserName?: string; approvedByUserName?: string }> {
    const disposal = await this.tenantPrisma.queryOne<AssetDisposal & { assetCode?: string; assetName?: string; requestedByUserName?: string; approvedByUserName?: string }>(
      `SELECT d.*,
        a."assetCode",
        a.name as "assetName",
        u1.name as "requestedByUserName",
        u2.name as "approvedByUserName"
       FROM ast_disposals d
       LEFT JOIN ast_assets a ON a.id = d."assetId"
       LEFT JOIN users u1 ON u1.id = d."requestedByUserId"
       LEFT JOIN users u2 ON u2.id = d."approvedByUserId"
       WHERE d.id = $1 AND d."companyId" = $2 AND d."deletedAt" IS NULL`,
      [id, companyId],
    );

    if (!disposal) {
      throw new NotFoundException('Disposal not found');
    }

    return disposal;
  }

  async findAll(companyId: number, query: AssetDisposalQueryDto): Promise<{ data: AssetDisposal[]; total: number }> {
    const conditions: string[] = ['"companyId" = $1', '"deletedAt" IS NULL'];
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.assetId) {
      conditions.push(`"assetId" = $${paramIndex}`);
      params.push(query.assetId);
      paramIndex++;
    }

    if (query.disposalType) {
      conditions.push(`"disposalType" = $${paramIndex}`);
      params.push(query.disposalType);
      paramIndex++;
    }

    if (query.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(query.status);
      paramIndex++;
    }

    if (query.dateFrom) {
      conditions.push(`"disposalDate" >= $${paramIndex}`);
      params.push(new Date(query.dateFrom));
      paramIndex++;
    }

    if (query.dateTo) {
      conditions.push(`"disposalDate" <= $${paramIndex}`);
      params.push(new Date(query.dateTo));
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ast_disposals WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || '0');

    // Get data with pagination
    const limit = query.limit || 20;
    const offset = ((query.page || 1) - 1) * limit;

    const data = await this.tenantPrisma.query<AssetDisposal>(
      `SELECT * FROM ast_disposals WHERE ${whereClause} ORDER BY "disposalDate" DESC, "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return { data, total };
  }

  // ============================================================================
  // STATS
  // ============================================================================

  async getStats(companyId: number): Promise<AssetDisposalStats> {
    const stats = await this.tenantPrisma.queryOne<{
      total: string;
      draft: string;
      pendingApproval: string;
      approved: string;
      completed: string;
      totalProceeds: string;
      totalGainLoss: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE status = 'pending_approval') as "pendingApproval",
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COALESCE(SUM("disposalProceeds") FILTER (WHERE status = 'completed'), 0) as "totalProceeds",
        COALESCE(SUM("gainLoss") FILTER (WHERE status = 'completed'), 0) as "totalGainLoss"
       FROM ast_disposals
       WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
      [companyId],
    );

    return {
      total: parseInt(stats?.total || '0'),
      draft: parseInt(stats?.draft || '0'),
      pendingApproval: parseInt(stats?.pendingApproval || '0'),
      approved: parseInt(stats?.approved || '0'),
      completed: parseInt(stats?.completed || '0'),
      totalProceeds: toMoney(stats?.totalProceeds),
      totalGainLoss: toMoney(stats?.totalGainLoss),
    };
  }

  // ============================================================================
  // WORKFLOW
  // ============================================================================

  async submit(companyId: number, id: number): Promise<AssetDisposal> {
    const disposal = await this.findById(companyId, id);

    if (disposal.status !== DisposalStatus.DRAFT) {
      throw new BadRequestException('Can only submit draft disposals');
    }

    await this.tenantPrisma.update<AssetDisposal>('ast_disposals', id, {
      status: DisposalStatus.PENDING_APPROVAL,
    });

    return this.findById(companyId, id);
  }

  async approve(companyId: number, id: number, userId: number): Promise<AssetDisposal> {
    const disposal = await this.findById(companyId, id);

    if (disposal.status !== DisposalStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Can only approve pending disposals');
    }

    await this.tenantPrisma.update<AssetDisposal>('ast_disposals', id, {
      status: DisposalStatus.APPROVED,
      approvedByUserId: userId,
      approvedAt: new Date(),
    });

    return this.findById(companyId, id);
  }

  async reject(companyId: number, id: number, reason?: string): Promise<AssetDisposal> {
    const disposal = await this.findById(companyId, id);

    if (disposal.status !== DisposalStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Can only reject pending disposals');
    }

    await this.tenantPrisma.update<AssetDisposal>('ast_disposals', id, {
      status: DisposalStatus.DRAFT,
      notes: reason ? `Rejected: ${reason}. ${disposal.notes || ''}` : disposal.notes,
    });

    return this.findById(companyId, id);
  }

  async complete(companyId: number, id: number, userId: number): Promise<AssetDisposal> {
    const disposal = await this.findById(companyId, id);

    if (disposal.status !== DisposalStatus.APPROVED) {
      throw new BadRequestException('Can only complete approved disposals');
    }

    // Update disposal status
    await this.tenantPrisma.update<AssetDisposal>('ast_disposals', id, {
      status: DisposalStatus.COMPLETED,
      completedAt: new Date(),
      isPosted: true,
      postedAt: new Date(),
    });

    // Update asset status to disposed
    await this.tenantPrisma.query(
      `UPDATE ast_assets SET
        status = $1,
        "disposalDate" = $2,
        "disposalValue" = $3,
        "disposalMethod" = $4,
        "disposalNotes" = $5
       WHERE id = $6`,
      [
        AssetStatus.DISPOSED,
        disposal.disposalDate,
        disposal.disposalProceeds,
        disposal.disposalType,
        disposal.notes,
        disposal.assetId,
      ],
    );

    // Post disposal to GL
    await this.postDisposalToGL(companyId, disposal);

    return this.findById(companyId, id);
  }

  // ============================================================================
  // CALCULATION
  // ============================================================================

  async calculateGainLoss(companyId: number, assetId: number, disposalProceeds: number, disposalCosts: number): Promise<GainLossResult> {
    const asset = await this.getAsset(companyId, assetId);
    const bookValue = asset.bookValue;
    const gainLoss = disposalProceeds - disposalCosts - bookValue;

    return { gainLoss, bookValue };
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
   * Get GL account configuration for asset disposal posting.
   * Checks company_settings first, then falls back to IFRS standard codes.
   */
  private async getDisposalAccountConfig(companyId: number): Promise<{
    cashBankAccountId: number | null;
    accumulatedDepreciationAccountId: number | null;
    fixedAssetAccountId: number | null;
    gainLossAccountId: number | null;
  }> {
    const settings = await this.tenantPrisma.queryOne<{
      defaultCashBankAccountId: number | null;
      defaultAccumulatedDepreciationAccountId: number | null;
      defaultFixedAssetAccountId: number | null;
      defaultGainLossDisposalAccountId: number | null;
    }>(
      `SELECT
        "defaultCashBankAccountId",
        "defaultAccumulatedDepreciationAccountId",
        "defaultFixedAssetAccountId",
        "defaultGainLossDisposalAccountId"
       FROM company_settings
       WHERE "companyId" = $1`,
      [companyId],
    );

    const [cashBankAccountId, accumulatedDepreciationAccountId, fixedAssetAccountId, gainLossAccountId] = await Promise.all([
      settings?.defaultCashBankAccountId ? Promise.resolve(settings.defaultCashBankAccountId) : this.findAccountByCode(companyId, ['1100', '1110']),
      settings?.defaultAccumulatedDepreciationAccountId ? Promise.resolve(settings.defaultAccumulatedDepreciationAccountId) : this.findAccountByCode(companyId, ['1610', '1620']),
      settings?.defaultFixedAssetAccountId ? Promise.resolve(settings.defaultFixedAssetAccountId) : this.findAccountByCode(companyId, ['1600', '1700', '160']),
      settings?.defaultGainLossDisposalAccountId ? Promise.resolve(settings.defaultGainLossDisposalAccountId) : this.findAccountByCode(companyId, ['4900', '4910', '490']),
    ]);

    return { cashBankAccountId, accumulatedDepreciationAccountId, fixedAssetAccountId, gainLossAccountId };
  }

  /**
   * Post asset disposal to General Ledger.
   *
   * Journal entry for disposal:
   * - Debit: Cash/Bank (disposal proceeds)
   * - Debit: Accumulated Depreciation (remove accumulated depreciation)
   * - Credit: Fixed Asset (remove asset at acquisition cost)
   * - Debit/Credit: Gain/Loss on Disposal (balancing amount)
   *   If proceeds > bookValue => gain (credit gain/loss account)
   *   If proceeds < bookValue => loss (debit gain/loss account)
   */
  private async postDisposalToGL(companyId: number, disposal: AssetDisposal): Promise<void> {
    try {
      const asset = await this.getAsset(companyId, disposal.assetId);
      const config = await this.getDisposalAccountConfig(companyId);

      if (!config.fixedAssetAccountId) {
        this.logger.warn(`No Fixed Asset account configured for company ${companyId}, skipping GL posting for disposal ${disposal.disposalNumber}`);
        return;
      }

      if (!config.accumulatedDepreciationAccountId) {
        this.logger.warn(`No Accumulated Depreciation account configured for company ${companyId}, skipping GL posting for disposal ${disposal.disposalNumber}`);
        return;
      }

      const acquisitionCost = Number(asset.acquisitionCost) || 0;
      const accumulatedDepreciation = Number(disposal.accumulatedDepreciation) || 0;
      const disposalProceeds = Number(disposal.disposalProceeds) || 0;
      const bookValue = Number(disposal.bookValueAtDisposal) || 0;
      const gainLoss = disposalProceeds - bookValue;

      // Create journal entry
      const journalEntry = await this.tenantPrisma.insert<{ id: number }>('journal_entries', {
        companyId,
        entryDate: new Date(),
        referenceType: 'asset_disposal',
        referenceId: disposal.id,
        description: `Asset Disposal ${disposal.disposalNumber} - ${asset.name || ''}`,
        status: 'posted',
      });

      // Debit: Cash/Bank (disposal proceeds)
      if (disposalProceeds > 0 && config.cashBankAccountId) {
        await this.tenantPrisma.insert('journal_entry_line_items', {
          journalEntryId: journalEntry.id,
          accountId: config.cashBankAccountId,
          debit: disposalProceeds,
          credit: 0,
          description: `Cash proceeds - Disposal ${disposal.disposalNumber}`,
        });
      } else if (disposalProceeds > 0 && !config.cashBankAccountId) {
        this.logger.warn(`No Cash/Bank account configured for company ${companyId}, proceeds not recorded for disposal ${disposal.disposalNumber}`);
      }

      // Debit: Accumulated Depreciation (remove it)
      if (accumulatedDepreciation > 0) {
        await this.tenantPrisma.insert('journal_entry_line_items', {
          journalEntryId: journalEntry.id,
          accountId: config.accumulatedDepreciationAccountId,
          debit: accumulatedDepreciation,
          credit: 0,
          description: `Remove accumulated depreciation - Disposal ${disposal.disposalNumber}`,
        });
      }

      // Credit: Fixed Asset (remove at acquisition cost)
      await this.tenantPrisma.insert('journal_entry_line_items', {
        journalEntryId: journalEntry.id,
        accountId: config.fixedAssetAccountId,
        debit: 0,
        credit: acquisitionCost,
        description: `Remove fixed asset - Disposal ${disposal.disposalNumber}`,
      });

      // Debit/Credit: Gain/Loss on Disposal
      if (gainLoss !== 0 && config.gainLossAccountId) {
        if (gainLoss > 0) {
          // Gain on disposal: credit
          await this.tenantPrisma.insert('journal_entry_line_items', {
            journalEntryId: journalEntry.id,
            accountId: config.gainLossAccountId,
            debit: 0,
            credit: gainLoss,
            description: `Gain on disposal - ${disposal.disposalNumber}`,
          });
        } else {
          // Loss on disposal: debit
          await this.tenantPrisma.insert('journal_entry_line_items', {
            journalEntryId: journalEntry.id,
            accountId: config.gainLossAccountId,
            debit: Math.abs(gainLoss),
            credit: 0,
            description: `Loss on disposal - ${disposal.disposalNumber}`,
          });
        }
      } else if (gainLoss !== 0 && !config.gainLossAccountId) {
        this.logger.warn(`No Gain/Loss account configured for company ${companyId}, gain/loss not recorded for disposal ${disposal.disposalNumber}`);
      }

      // Update disposal with transaction reference
      await this.tenantPrisma.update('ast_disposals', disposal.id, {
        transactionId: journalEntry.id,
      });

      this.logger.log(`GL entry posted for disposal ${disposal.disposalNumber} (journal entry #${journalEntry.id})`);
    } catch (error) {
      this.logger.error(`GL FAILED for disposal ${disposal.disposalNumber}: ${error.message}`, error.stack);
      throw new Error(`Disposal GL posting failed: ${error.message}. Fix GL account configuration for this asset.`);
    }
  }

  private async generateDisposalNumber(companyId: number): Promise<string> {
    const prefix = 'DSP';
    const year = new Date().getFullYear();

    const lastDisposal = await this.tenantPrisma.queryOne<{ disposalNumber: string }>(
      `SELECT "disposalNumber" FROM ast_disposals
       WHERE "companyId" = $1 AND "disposalNumber" LIKE $2
       ORDER BY "createdAt" DESC LIMIT 1`,
      [companyId, `${prefix}${year}%`],
    );

    let nextNumber = 1;
    if (lastDisposal?.disposalNumber) {
      const numPart = lastDisposal.disposalNumber.replace(`${prefix}${year}`, '');
      const parsedNum = parseInt(numPart);
      if (!isNaN(parsedNum)) {
        nextNumber = parsedNum + 1;
      }
    }

    return `${prefix}${year}${String(nextNumber).padStart(5, '0')}`;
  }
}
