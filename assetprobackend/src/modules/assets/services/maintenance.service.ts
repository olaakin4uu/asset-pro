import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { toMoney } from '../../../common/utils/decimal';
import {
  CreateAssetMaintenanceDto,
  UpdateAssetMaintenanceDto,
  AssetMaintenanceQueryDto,
  MaintenanceStatus,
  MaintenancePriority,
  RecurrenceFrequency,
  AssetStatus,
} from '../dto';
import { Asset } from './asset.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AssetMaintenance {
  id: number;
  companyId: number;
  assetId: number;
  maintenanceNumber: string;
  title: string;
  description: string | null;
  maintenanceType: string;
  priority: string;
  scheduledDate: Date | null;
  dueDate: Date | null;
  startedDate: Date | null;
  completedDate: Date | null;
  estimatedDurationHours: number | null;
  actualDurationHours: number | null;
  isRecurring: boolean;
  recurrenceFrequency: string | null;
  recurrenceInterval: number | null;
  nextScheduledDate: Date | null;
  vendorName: string | null;
  vendorContact: string | null;
  technicianName: string | null;
  assignedToUserId: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
  laborCost: number | null;
  partsCost: number | null;
  costBreakdown: string | null;
  partsUsed: string | null;
  materialsUsed: string | null;
  conditionBefore: string | null;
  conditionAfter: string | null;
  meterReadingBefore: number | null;
  meterReadingAfter: number | null;
  meterUnit: string | null;
  workPerformed: string | null;
  findings: string | null;
  recommendations: string | null;
  notes: string | null;
  status: string;
  requiresFollowUp: boolean;
  followUpNotes: string | null;
  requestedByUserId: number | null;
  approvedByUserId: number | null;
  approvedAt: Date | null;
  completedByUserId: number | null;
  isPosted: boolean;
  transactionId: number | null;
  postedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetMaintenanceStats {
  total: number;
  scheduled: number;
  inProgress: number;
  onHold: number;
  completed: number;
  overdue: number;
  totalCost: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  async create(companyId: number, dto: CreateAssetMaintenanceDto, createdById: number): Promise<AssetMaintenance> {
    // Validate asset
    const asset = await this.getAsset(companyId, dto.assetId);

    if (asset.status === AssetStatus.DISPOSED) {
      throw new BadRequestException('Cannot create maintenance for disposed asset');
    }

    // Generate maintenance number
    const maintenanceNumber = await this.generateMaintenanceNumber(companyId);

    // Calculate next scheduled date for recurring maintenance
    let nextScheduledDate: Date | null = null;
    if (dto.isRecurring && dto.scheduledDate && dto.recurrenceFrequency) {
      nextScheduledDate = this.calculateNextScheduledDate(
        new Date(dto.scheduledDate),
        dto.recurrenceFrequency as RecurrenceFrequency,
        dto.recurrenceInterval || 1,
      );
    }

    const maintenance = await this.tenantPrisma.insert<AssetMaintenance>('ast_maintenances', {
      companyId,
      assetId: dto.assetId,
      maintenanceNumber,
      title: dto.title,
      description: dto.description || null,
      maintenanceType: dto.maintenanceType,
      priority: dto.priority || MaintenancePriority.MEDIUM,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      estimatedDurationHours: dto.estimatedDurationHours || null,
      isRecurring: dto.isRecurring || false,
      recurrenceFrequency: dto.recurrenceFrequency || null,
      recurrenceInterval: dto.recurrenceInterval || null,
      nextScheduledDate,
      vendorName: dto.vendorName || null,
      vendorContact: dto.vendorContact || null,
      technicianName: dto.technicianName || null,
      assignedToUserId: dto.assignedToUserId || null,
      estimatedCost: dto.estimatedCost || null,
      notes: dto.notes || null,
      status: MaintenanceStatus.SCHEDULED,
      requiresFollowUp: false,
      requestedByUserId: createdById,
      isPosted: false,
    });

    return this.findById(companyId, maintenance.id);
  }

  async update(companyId: number, id: number, dto: UpdateAssetMaintenanceDto): Promise<AssetMaintenance> {
    const maintenance = await this.findById(companyId, id);

    if (maintenance.status === MaintenanceStatus.COMPLETED || maintenance.status === MaintenanceStatus.CANCELLED) {
      throw new BadRequestException('Cannot update completed or cancelled maintenance');
    }

    const updateData: Record<string, any> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.maintenanceType !== undefined) updateData.maintenanceType = dto.maintenanceType;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.scheduledDate !== undefined) updateData.scheduledDate = dto.scheduledDate ? new Date(dto.scheduledDate) : null;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.estimatedDurationHours !== undefined) updateData.estimatedDurationHours = dto.estimatedDurationHours;
    if (dto.actualDurationHours !== undefined) updateData.actualDurationHours = dto.actualDurationHours;
    if (dto.isRecurring !== undefined) updateData.isRecurring = dto.isRecurring;
    if (dto.recurrenceFrequency !== undefined) updateData.recurrenceFrequency = dto.recurrenceFrequency;
    if (dto.recurrenceInterval !== undefined) updateData.recurrenceInterval = dto.recurrenceInterval;
    if (dto.vendorName !== undefined) updateData.vendorName = dto.vendorName;
    if (dto.vendorContact !== undefined) updateData.vendorContact = dto.vendorContact;
    if (dto.technicianName !== undefined) updateData.technicianName = dto.technicianName;
    if (dto.assignedToUserId !== undefined) updateData.assignedToUserId = dto.assignedToUserId;
    if (dto.estimatedCost !== undefined) updateData.estimatedCost = dto.estimatedCost;
    if (dto.actualCost !== undefined) updateData.actualCost = dto.actualCost;
    if (dto.laborCost !== undefined) updateData.laborCost = dto.laborCost;
    if (dto.partsCost !== undefined) updateData.partsCost = dto.partsCost;
    if (dto.costBreakdown !== undefined) updateData.costBreakdown = dto.costBreakdown;
    if (dto.partsUsed !== undefined) updateData.partsUsed = dto.partsUsed;
    if (dto.materialsUsed !== undefined) updateData.materialsUsed = dto.materialsUsed;
    if (dto.conditionBefore !== undefined) updateData.conditionBefore = dto.conditionBefore;
    if (dto.conditionAfter !== undefined) updateData.conditionAfter = dto.conditionAfter;
    if (dto.meterReadingBefore !== undefined) updateData.meterReadingBefore = dto.meterReadingBefore;
    if (dto.meterReadingAfter !== undefined) updateData.meterReadingAfter = dto.meterReadingAfter;
    if (dto.meterUnit !== undefined) updateData.meterUnit = dto.meterUnit;
    if (dto.workPerformed !== undefined) updateData.workPerformed = dto.workPerformed;
    if (dto.findings !== undefined) updateData.findings = dto.findings;
    if (dto.recommendations !== undefined) updateData.recommendations = dto.recommendations;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.requiresFollowUp !== undefined) updateData.requiresFollowUp = dto.requiresFollowUp;
    if (dto.followUpNotes !== undefined) updateData.followUpNotes = dto.followUpNotes;

    if (Object.keys(updateData).length > 0) {
      await this.tenantPrisma.update<AssetMaintenance>('ast_maintenances', id, updateData);
    }

    return this.findById(companyId, id);
  }

  async delete(companyId: number, id: number): Promise<void> {
    const maintenance = await this.findById(companyId, id);

    if (maintenance.status === MaintenanceStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete in-progress maintenance');
    }

    await this.tenantPrisma.softDelete('ast_maintenances', id);
  }

  async findById(companyId: number, id: number): Promise<AssetMaintenance & {
    assetCode?: string;
    assetName?: string;
    assignedToUserName?: string;
    requestedByUserName?: string;
    approvedByUserName?: string;
    completedByUserName?: string;
  }> {
    const maintenance = await this.tenantPrisma.queryOne<AssetMaintenance & {
      assetCode?: string;
      assetName?: string;
      assignedToUserName?: string;
      requestedByUserName?: string;
      approvedByUserName?: string;
      completedByUserName?: string;
    }>(
      `SELECT m.*,
        a."assetCode",
        a.name as "assetName",
        ua.name as "assignedToUserName",
        ur.name as "requestedByUserName",
        uap.name as "approvedByUserName",
        uc.name as "completedByUserName"
       FROM ast_maintenances m
       LEFT JOIN ast_assets a ON a.id = m."assetId"
       LEFT JOIN users ua ON ua.id = m."assignedToUserId"
       LEFT JOIN users ur ON ur.id = m."requestedByUserId"
       LEFT JOIN users uap ON uap.id = m."approvedByUserId"
       LEFT JOIN users uc ON uc.id = m."completedByUserId"
       WHERE m.id = $1 AND m."companyId" = $2 AND m."deletedAt" IS NULL`,
      [id, companyId],
    );

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    return maintenance;
  }

  async findAll(companyId: number, query: AssetMaintenanceQueryDto): Promise<{ data: AssetMaintenance[]; total: number }> {
    const conditions: string[] = ['"companyId" = $1', '"deletedAt" IS NULL'];
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.assetId) {
      conditions.push(`"assetId" = $${paramIndex}`);
      params.push(query.assetId);
      paramIndex++;
    }

    if (query.maintenanceType) {
      conditions.push(`"maintenanceType" = $${paramIndex}`);
      params.push(query.maintenanceType);
      paramIndex++;
    }

    if (query.priority) {
      conditions.push(`priority = $${paramIndex}`);
      params.push(query.priority);
      paramIndex++;
    }

    if (query.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(query.status);
      paramIndex++;
    }

    if (query.isRecurring !== undefined) {
      conditions.push(`"isRecurring" = $${paramIndex}`);
      params.push(query.isRecurring);
      paramIndex++;
    }

    if (query.dateFrom) {
      conditions.push(`COALESCE("scheduledDate", "dueDate") >= $${paramIndex}`);
      params.push(new Date(query.dateFrom));
      paramIndex++;
    }

    if (query.dateTo) {
      conditions.push(`COALESCE("scheduledDate", "dueDate") <= $${paramIndex}`);
      params.push(new Date(query.dateTo));
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ast_maintenances WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult?.count || '0');

    // Get data with pagination
    const limit = query.limit || 20;
    const offset = ((query.page || 1) - 1) * limit;

    const data = await this.tenantPrisma.query<AssetMaintenance>(
      `SELECT * FROM ast_maintenances WHERE ${whereClause} ORDER BY COALESCE("scheduledDate", "dueDate") ASC NULLS LAST, "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return { data, total };
  }

  // ============================================================================
  // STATS
  // ============================================================================

  async getStats(companyId: number): Promise<AssetMaintenanceStats> {
    const stats = await this.tenantPrisma.queryOne<{
      total: string;
      scheduled: string;
      inProgress: string;
      onHold: string;
      completed: string;
      totalCost: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'in_progress') as "inProgress",
        COUNT(*) FILTER (WHERE status = 'on_hold') as "onHold",
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COALESCE(SUM("actualCost") FILTER (WHERE status = 'completed'), 0) as "totalCost"
       FROM ast_maintenances
       WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
      [companyId],
    );

    // Count overdue
    const overdueResult = await this.tenantPrisma.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM ast_maintenances
       WHERE "companyId" = $1
       AND status IN ('scheduled', 'in_progress')
       AND "dueDate" < NOW()
       AND "deletedAt" IS NULL`,
      [companyId],
    );

    return {
      total: parseInt(stats?.total || '0'),
      scheduled: parseInt(stats?.scheduled || '0'),
      inProgress: parseInt(stats?.inProgress || '0'),
      onHold: parseInt(stats?.onHold || '0'),
      completed: parseInt(stats?.completed || '0'),
      overdue: parseInt(overdueResult?.count || '0'),
      totalCost: toMoney(stats?.totalCost),
    };
  }

  // ============================================================================
  // WORKFLOW
  // ============================================================================

  async start(companyId: number, id: number): Promise<AssetMaintenance> {
    const maintenance = await this.findById(companyId, id);

    if (maintenance.status !== MaintenanceStatus.SCHEDULED) {
      throw new BadRequestException('Can only start scheduled maintenance');
    }

    await this.tenantPrisma.update<AssetMaintenance>('ast_maintenances', id, {
      status: MaintenanceStatus.IN_PROGRESS,
      startedDate: new Date(),
    });

    // Update asset status
    await this.tenantPrisma.query(
      `UPDATE ast_assets SET status = $1 WHERE id = $2`,
      [AssetStatus.UNDER_MAINTENANCE, maintenance.assetId],
    );

    return this.findById(companyId, id);
  }

  async hold(companyId: number, id: number, reason?: string): Promise<AssetMaintenance> {
    const maintenance = await this.findById(companyId, id);

    if (maintenance.status !== MaintenanceStatus.IN_PROGRESS) {
      throw new BadRequestException('Can only hold in-progress maintenance');
    }

    await this.tenantPrisma.update<AssetMaintenance>('ast_maintenances', id, {
      status: MaintenanceStatus.ON_HOLD,
      notes: reason ? `On hold: ${reason}. ${maintenance.notes || ''}` : maintenance.notes,
    });

    return this.findById(companyId, id);
  }

  async resume(companyId: number, id: number): Promise<AssetMaintenance> {
    const maintenance = await this.findById(companyId, id);

    if (maintenance.status !== MaintenanceStatus.ON_HOLD) {
      throw new BadRequestException('Can only resume on-hold maintenance');
    }

    await this.tenantPrisma.update<AssetMaintenance>('ast_maintenances', id, {
      status: MaintenanceStatus.IN_PROGRESS,
    });

    return this.findById(companyId, id);
  }

  async complete(companyId: number, id: number, userId: number, completionData?: UpdateAssetMaintenanceDto): Promise<AssetMaintenance> {
    const maintenance = await this.findById(companyId, id);

    if (maintenance.status !== MaintenanceStatus.IN_PROGRESS && maintenance.status !== MaintenanceStatus.SCHEDULED) {
      throw new BadRequestException('Can only complete in-progress or scheduled maintenance');
    }

    const updateData: Record<string, any> = {
      status: MaintenanceStatus.COMPLETED,
      completedDate: new Date(),
      completedByUserId: userId,
    };

    // Add completion data if provided
    if (completionData) {
      if (completionData.actualDurationHours !== undefined) updateData.actualDurationHours = completionData.actualDurationHours;
      if (completionData.actualCost !== undefined) updateData.actualCost = completionData.actualCost;
      if (completionData.laborCost !== undefined) updateData.laborCost = completionData.laborCost;
      if (completionData.partsCost !== undefined) updateData.partsCost = completionData.partsCost;
      if (completionData.workPerformed !== undefined) updateData.workPerformed = completionData.workPerformed;
      if (completionData.findings !== undefined) updateData.findings = completionData.findings;
      if (completionData.recommendations !== undefined) updateData.recommendations = completionData.recommendations;
      if (completionData.conditionAfter !== undefined) updateData.conditionAfter = completionData.conditionAfter;
      if (completionData.meterReadingAfter !== undefined) updateData.meterReadingAfter = completionData.meterReadingAfter;
      if (completionData.requiresFollowUp !== undefined) updateData.requiresFollowUp = completionData.requiresFollowUp;
      if (completionData.followUpNotes !== undefined) updateData.followUpNotes = completionData.followUpNotes;
    }

    await this.tenantPrisma.update<AssetMaintenance>('ast_maintenances', id, updateData);

    // Update asset status back to active and set last/next maintenance dates
    const assetUpdateData: Record<string, any> = {
      status: AssetStatus.ACTIVE,
      lastMaintenanceDate: new Date(),
    };

    // Set condition if provided
    if (completionData?.conditionAfter) {
      assetUpdateData.condition = completionData.conditionAfter;
    }

    // Calculate next maintenance date for recurring
    if (maintenance.isRecurring && maintenance.recurrenceFrequency) {
      const nextDate = this.calculateNextScheduledDate(
        new Date(),
        maintenance.recurrenceFrequency as RecurrenceFrequency,
        maintenance.recurrenceInterval || 1,
      );
      assetUpdateData.nextMaintenanceDate = nextDate;

      // Update maintenance next scheduled date
      await this.tenantPrisma.update<AssetMaintenance>('ast_maintenances', id, {
        nextScheduledDate: nextDate,
      });
    }

    await this.tenantPrisma.update('ast_assets', maintenance.assetId, assetUpdateData);

    return this.findById(companyId, id);
  }

  async post(companyId: number, id: number, userId: number): Promise<AssetMaintenance> {
    const maintenance = await this.findById(companyId, id);

    if (maintenance.status !== MaintenanceStatus.COMPLETED) {
      throw new BadRequestException('Can only post completed maintenance');
    }

    if (maintenance.isPosted) {
      throw new BadRequestException('Maintenance already posted');
    }

    // Create GL journal entry for maintenance cost
    const transactionId = await this.postMaintenanceToGL(companyId, maintenance);

    await this.tenantPrisma.update<AssetMaintenance>('ast_maintenances', id, {
      isPosted: true,
      postedAt: new Date(),
      transactionId,
    });

    return this.findById(companyId, id);
  }

  // ============================================================================
  // SPECIAL QUERIES
  // ============================================================================

  async getUpcoming(companyId: number, days: number = 30): Promise<AssetMaintenance[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.tenantPrisma.query<AssetMaintenance>(
      `SELECT m.*, a."assetCode", a.name as "assetName"
       FROM ast_maintenances m
       LEFT JOIN ast_assets a ON a.id = m."assetId"
       WHERE m."companyId" = $1
       AND m.status = 'scheduled'
       AND COALESCE(m."scheduledDate", m."dueDate") BETWEEN NOW() AND $2
       AND m."deletedAt" IS NULL
       ORDER BY COALESCE(m."scheduledDate", m."dueDate") ASC`,
      [companyId, futureDate],
    );
  }

  async getOverdue(companyId: number): Promise<AssetMaintenance[]> {
    return this.tenantPrisma.query<AssetMaintenance>(
      `SELECT m.*, a."assetCode", a.name as "assetName"
       FROM ast_maintenances m
       LEFT JOIN ast_assets a ON a.id = m."assetId"
       WHERE m."companyId" = $1
       AND m.status IN ('scheduled', 'in_progress')
       AND m."dueDate" < NOW()
       AND m."deletedAt" IS NULL
       ORDER BY m."dueDate" ASC`,
      [companyId],
    );
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
   * Get GL account configuration for maintenance cost posting.
   * Checks company_settings first, then falls back to IFRS standard codes.
   */
  private async getMaintenanceAccountConfig(companyId: number): Promise<{
    maintenanceExpenseAccountId: number | null;
    cashBankAccountId: number | null;
    accountsPayableAccountId: number | null;
  }> {
    const settings = await this.tenantPrisma.queryOne<{
      defaultMaintenanceExpenseAccountId: number | null;
      defaultCashBankAccountId: number | null;
      defaultAccountsPayableAccountId: number | null;
    }>(
      `SELECT
        "defaultMaintenanceExpenseAccountId",
        "defaultCashBankAccountId",
        "defaultAccountsPayableAccountId"
       FROM company_settings
       WHERE "companyId" = $1`,
      [companyId],
    );

    const [maintenanceExpenseAccountId, cashBankAccountId, accountsPayableAccountId] = await Promise.all([
      settings?.defaultMaintenanceExpenseAccountId ? Promise.resolve(settings.defaultMaintenanceExpenseAccountId) : this.findAccountByCode(companyId, ['6700', '6710', '670']),
      settings?.defaultCashBankAccountId ? Promise.resolve(settings.defaultCashBankAccountId) : this.findAccountByCode(companyId, ['1100', '1110']),
      settings?.defaultAccountsPayableAccountId ? Promise.resolve(settings.defaultAccountsPayableAccountId) : this.findAccountByCode(companyId, ['2100', '2000']),
    ]);

    return { maintenanceExpenseAccountId, cashBankAccountId, accountsPayableAccountId };
  }

  /**
   * Post maintenance cost to General Ledger.
   * Debit: Maintenance/Repair Expense
   * Credit: Cash/Bank (for direct payments) or Accounts Payable (for vendor invoices)
   *
   * Returns the journal entry ID, or null if accounts are not configured.
   */
  private async postMaintenanceToGL(companyId: number, maintenance: AssetMaintenance & { assetCode?: string; assetName?: string }): Promise<number | null> {
    try {
      const amount = Number(maintenance.actualCost) || 0;
      if (amount <= 0) {
        this.logger.warn(`No cost for maintenance ${maintenance.maintenanceNumber}, skipping GL posting`);
        return null;
      }

      const config = await this.getMaintenanceAccountConfig(companyId);

      if (!config.maintenanceExpenseAccountId) {
        this.logger.warn(`No Maintenance Expense account configured for company ${companyId}, skipping GL posting for maintenance ${maintenance.maintenanceNumber}`);
        return null;
      }

      // Determine credit account: use AP if vendor is involved, otherwise Cash/Bank
      const creditAccountId = maintenance.vendorName
        ? config.accountsPayableAccountId
        : config.cashBankAccountId;

      if (!creditAccountId) {
        const accountType = maintenance.vendorName ? 'Accounts Payable' : 'Cash/Bank';
        this.logger.warn(`No ${accountType} account configured for company ${companyId}, skipping GL posting for maintenance ${maintenance.maintenanceNumber}`);
        return null;
      }

      const assetRef = maintenance.assetCode || maintenance.assetName || `Asset #${maintenance.assetId}`;

      // Create journal entry
      const journalEntry = await this.tenantPrisma.insert<{ id: number }>('journal_entries', {
        companyId,
        entryDate: new Date(),
        referenceType: 'asset_maintenance',
        referenceId: maintenance.id,
        description: `Maintenance ${maintenance.maintenanceNumber} - ${assetRef} - ${maintenance.title}`,
        status: 'posted',
      });

      // Debit: Maintenance/Repair Expense
      await this.tenantPrisma.insert('journal_entry_line_items', {
        journalEntryId: journalEntry.id,
        accountId: config.maintenanceExpenseAccountId,
        debit: amount,
        credit: 0,
        description: `Maintenance expense - ${maintenance.maintenanceNumber}`,
      });

      // Credit: Cash/Bank or Accounts Payable
      const creditDescription = maintenance.vendorName
        ? `AP - Maintenance ${maintenance.maintenanceNumber} (${maintenance.vendorName})`
        : `Cash - Maintenance ${maintenance.maintenanceNumber}`;

      await this.tenantPrisma.insert('journal_entry_line_items', {
        journalEntryId: journalEntry.id,
        accountId: creditAccountId,
        debit: 0,
        credit: amount,
        description: creditDescription,
      });

      this.logger.log(`GL entry posted for maintenance ${maintenance.maintenanceNumber} (journal entry #${journalEntry.id}, amount: ${amount})`);
      return journalEntry.id;
    } catch (error) {
      this.logger.warn(`Failed to post GL entry for maintenance ${maintenance.maintenanceNumber}: ${error.message}`);
      // Do not rethrow - GL failure should not block the maintenance posting
      return null;
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

  private async generateMaintenanceNumber(companyId: number): Promise<string> {
    const prefix = 'MNT';
    const year = new Date().getFullYear();

    const lastMaintenance = await this.tenantPrisma.queryOne<{ maintenanceNumber: string }>(
      `SELECT "maintenanceNumber" FROM ast_maintenances
       WHERE "companyId" = $1 AND "maintenanceNumber" LIKE $2
       ORDER BY "createdAt" DESC LIMIT 1`,
      [companyId, `${prefix}${year}%`],
    );

    let nextNumber = 1;
    if (lastMaintenance?.maintenanceNumber) {
      const numPart = lastMaintenance.maintenanceNumber.replace(`${prefix}${year}`, '');
      const parsedNum = parseInt(numPart);
      if (!isNaN(parsedNum)) {
        nextNumber = parsedNum + 1;
      }
    }

    return `${prefix}${year}${String(nextNumber).padStart(5, '0')}`;
  }

  private calculateNextScheduledDate(fromDate: Date, frequency: RecurrenceFrequency, interval: number): Date {
    const nextDate = new Date(fromDate);

    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case RecurrenceFrequency.WEEKLY:
        nextDate.setDate(nextDate.getDate() + (7 * interval));
        break;
      case RecurrenceFrequency.BI_WEEKLY:
        nextDate.setDate(nextDate.getDate() + (14 * interval));
        break;
      case RecurrenceFrequency.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case RecurrenceFrequency.QUARTERLY:
        nextDate.setMonth(nextDate.getMonth() + (3 * interval));
        break;
      case RecurrenceFrequency.SEMI_ANNUALLY:
        nextDate.setMonth(nextDate.getMonth() + (6 * interval));
        break;
      case RecurrenceFrequency.ANNUALLY:
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
    }

    return nextDate;
  }
}
