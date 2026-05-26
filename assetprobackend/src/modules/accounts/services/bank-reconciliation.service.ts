import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { toMoney } from '../../../common/utils/decimal';
import { isSuperAdmin } from '../../../common/utils/super-admin';
import {
  CreateBankReconciliationDto,
  UpdateBankReconciliationDto,
  BankReconciliationQueryDto,
  CreateBankReconciliationItemDto,
  UpdateBankReconciliationItemDto,
  BulkClearItemsDto,
} from '../dto';

export interface BankReconciliationRecord {
  id: number;
  companyId: number;
  bankId: number;
  reconciliationDate: Date;
  statementDate: Date;
  statementBalance: number;
  bookBalance: number;
  reconciledBalance: number | null;
  difference: number | null;
  status: string;
  notes: string | null;
  completedAt: Date | null;
  completedBy: number | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  bankName?: string;
  bankCode?: string;
  itemCount?: number;
}

export interface BankReconciliationItemRecord {
  id: number;
  bankReconciliationId: number;
  transactionType: string;
  referenceType: string | null;
  referenceId: number | null;
  transactionDate: Date;
  description: string | null;
  amount: number;
  isCleared: boolean;
  clearedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BankReconciliationService {
  private readonly logger = new Logger(BankReconciliationService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  // ============================================================================
  // RECONCILIATION HEADER
  // ============================================================================

  async create(
    companyId: number,
    userId: number,
    dto: CreateBankReconciliationDto,
  ): Promise<BankReconciliationRecord> {
    // Validate bank exists
    const bank = await this.tenantPrisma.queryOne(
      `SELECT id, name FROM banks WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [dto.bankId, companyId],
    );

    if (!bank) {
      throw new BadRequestException('Bank not found');
    }

    // Check for existing draft/in-progress reconciliation for this bank
    const existingActive = await this.tenantPrisma.queryOne<BankReconciliationRecord>(
      `SELECT * FROM bank_reconciliations
       WHERE "companyId" = $1 AND "bankId" = $2 AND status IN ('draft', 'in_progress')`,
      [companyId, dto.bankId],
    );

    if (existingActive) {
      throw new BadRequestException(
        `An active reconciliation already exists for this bank (ID: ${existingActive.id}, status: ${existingActive.status}). Complete or delete it before creating a new one.`,
      );
    }

    return this.tenantPrisma.insert<BankReconciliationRecord>('bank_reconciliations', {
      companyId,
      branchId: dto.branchId || null,
      bankId: dto.bankId,
      reconciliationDate: dto.reconciliationDate,
      statementDate: dto.statementDate,
      statementBalance: dto.statementBalance,
      bookBalance: dto.bookBalance,
      reconciledBalance: null,
      difference: null,
      status: 'draft',
      notes: dto.notes || null,
      createdBy: userId,
    });
  }

  async update(
    companyId: number,
    reconciliationId: number,
    dto: UpdateBankReconciliationDto,
  ): Promise<BankReconciliationRecord> {
    const reconciliation = await this.findById(companyId, reconciliationId);

    if (reconciliation.status === 'completed') {
      throw new BadRequestException('Cannot update a completed reconciliation');
    }

    const updateData: Record<string, any> = {};
    if (dto.reconciliationDate !== undefined) updateData.reconciliationDate = dto.reconciliationDate;
    if (dto.statementDate !== undefined) updateData.statementDate = dto.statementDate;
    if (dto.statementBalance !== undefined) updateData.statementBalance = dto.statementBalance;
    if (dto.bookBalance !== undefined) updateData.bookBalance = dto.bookBalance;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (Object.keys(updateData).length === 0) {
      return reconciliation;
    }

    const updated = await this.tenantPrisma.update<BankReconciliationRecord>(
      'bank_reconciliations',
      reconciliationId,
      updateData,
    );

    if (!updated) {
      throw new NotFoundException('Bank reconciliation not found');
    }

    return updated;
  }

  async remove(companyId: number, reconciliationId: number): Promise<void> {
    const reconciliation = await this.findById(companyId, reconciliationId);

    if (reconciliation.status === 'completed') {
      throw new BadRequestException('Cannot delete a completed reconciliation');
    }

    // Delete all items first (hard delete since there is no deletedAt on items)
    await this.tenantPrisma.query(
      `DELETE FROM bank_reconciliation_items WHERE "bankReconciliationId" = $1`,
      [reconciliationId],
    );

    // Hard delete the reconciliation (no deletedAt column on this table)
    await this.tenantPrisma.delete('bank_reconciliations', reconciliationId);
  }

  async findById(companyId: number, reconciliationId: number): Promise<BankReconciliationRecord> {
    const reconciliation = await this.tenantPrisma.queryOne<BankReconciliationRecord>(
      `SELECT br.*,
        b.name as "bankName", b."accountNumber" as "bankCode"
       FROM bank_reconciliations br
       LEFT JOIN banks b ON b.id = br."bankId"
       WHERE br.id = $1 AND br."companyId" = $2`,
      [reconciliationId, companyId],
    );

    if (!reconciliation) {
      throw new NotFoundException('Bank reconciliation not found');
    }

    return reconciliation;
  }

  async findAll(
    companyId: number,
    query: BankReconciliationQueryDto,
  ): Promise<{
    data: BankReconciliationRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT br.*,
        b.name as "bankName", b."accountNumber" as "bankCode",
        (SELECT COUNT(*) FROM bank_reconciliation_items bri WHERE bri."bankReconciliationId" = br.id) as "itemCount"
      FROM bank_reconciliations br
      LEFT JOIN banks b ON b.id = br."bankId"
      WHERE br."companyId" = $1
    `;
    let countSql = `
      SELECT COUNT(*) as count
      FROM bank_reconciliations br
      WHERE br."companyId" = $1
    `;
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.bankId) {
      sql += ` AND br."bankId" = $${paramIndex}`;
      countSql += ` AND br."bankId" = $${paramIndex}`;
      params.push(query.bankId);
      paramIndex++;
    }

    if (query.status) {
      sql += ` AND br.status = $${paramIndex}`;
      countSql += ` AND br.status = $${paramIndex}`;
      params.push(query.status);
      paramIndex++;
    }

    if (query.fromDate) {
      sql += ` AND br."reconciliationDate" >= $${paramIndex}`;
      countSql += ` AND br."reconciliationDate" >= $${paramIndex}`;
      params.push(query.fromDate);
      paramIndex++;
    }

    if (query.toDate) {
      sql += ` AND br."reconciliationDate" <= $${paramIndex}`;
      countSql += ` AND br."reconciliationDate" <= $${paramIndex}`;
      params.push(query.toDate);
      paramIndex++;
    }

    if (query.search) {
      sql += ` AND (br.notes ILIKE $${paramIndex} OR b.name ILIKE $${paramIndex})`;
      countSql += ` AND (br.notes ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY br."reconciliationDate" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<BankReconciliationRecord>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }

  async complete(
    companyId: number,
    reconciliationId: number,
    userId: number,
  ): Promise<BankReconciliationRecord> {
    const reconciliation = await this.findById(companyId, reconciliationId);

    if (reconciliation.status === 'completed') {
      throw new BadRequestException('Reconciliation is already completed');
    }

    // Calculate reconciled balance from cleared items
    const clearedResult = await this.tenantPrisma.queryOne<{
      totalDeposits: string;
      totalWithdrawals: string;
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN "transactionType" IN ('deposit', 'interest') THEN amount ELSE 0 END), 0) as "totalDeposits",
        COALESCE(SUM(CASE WHEN "transactionType" IN ('withdrawal', 'charge', 'transfer') THEN amount ELSE 0 END), 0) as "totalWithdrawals"
       FROM bank_reconciliation_items
       WHERE "bankReconciliationId" = $1 AND "isCleared" = true`,
      [reconciliationId],
    );

    const totalDeposits = toMoney(clearedResult?.totalDeposits);
    const totalWithdrawals = toMoney(clearedResult?.totalWithdrawals);
    const reconciledBalance = reconciliation.bookBalance + totalDeposits - totalWithdrawals;
    const difference = Number(reconciliation.statementBalance) - reconciledBalance;

    const updated = await this.tenantPrisma.update<BankReconciliationRecord>(
      'bank_reconciliations',
      reconciliationId,
      {
        status: 'pending_approval',
        reconciledBalance,
        difference,
        completedAt: new Date(),
        completedBy: userId,
      },
    );

    if (!updated) {
      throw new NotFoundException('Bank reconciliation not found');
    }

    this.logger.log(
      `Bank reconciliation ${reconciliationId} submitted for approval. Reconciled balance: ${reconciledBalance}, Difference: ${difference}`,
    );

    return updated;
  }

  /**
   * Approve a completed bank reconciliation (Super Admin or authorized reviewer).
   * Approver must be different from preparer (completedBy).
   */
  async approve(
    companyId: number,
    reconciliationId: number,
    userId: number,
    comment?: string,
  ): Promise<BankReconciliationRecord> {
    const reconciliation = await this.findById(companyId, reconciliationId);

    if (reconciliation.status !== 'pending_approval') {
      throw new BadRequestException('Only reconciliations pending approval can be approved. Complete the reconciliation first.');
    }

    // Segregation of duties: approver must differ from preparer
    if (reconciliation.completedBy === userId) {
      throw new BadRequestException('You cannot approve a reconciliation you prepared. A different user must approve.');
    }

    // If difference exists, require explanation
    const diff = Number(reconciliation.difference) || 0;
    if (Math.abs(diff) > 0.01) {
      const existing = await this.tenantPrisma.queryOne<{ differenceExplanation: string | null }>(
        `SELECT "differenceExplanation" FROM bank_reconciliations WHERE id = $1`,
        [reconciliationId],
      );
      if (!existing?.differenceExplanation && !comment) {
        throw new BadRequestException(
          `Reconciliation has a difference of ${diff.toFixed(2)}. Provide an explanation in the approval comment.`,
        );
      }
    }

    const updated = await this.tenantPrisma.update<BankReconciliationRecord>(
      'bank_reconciliations',
      reconciliationId,
      {
        status: 'completed',
        approvedAt: new Date(),
        approvedBy: userId,
        approvalComment: comment || null,
        differenceExplanation: comment && Math.abs(diff) > 0.01 ? comment : undefined,
      },
    );

    this.logger.log(`Bank reconciliation ${reconciliationId} approved by user ${userId}`);
    return updated!;
  }

  /**
   * Lock a completed reconciliation to prevent post-month changes.
   */
  async lock(
    companyId: number,
    reconciliationId: number,
    userId: number,
  ): Promise<BankReconciliationRecord> {
    const isAdmin = await isSuperAdmin(this.tenantPrisma, userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only Super Admin can lock reconciliations.');
    }

    const reconciliation = await this.findById(companyId, reconciliationId);
    if (reconciliation.status !== 'completed') {
      throw new BadRequestException('Only completed reconciliations can be locked.');
    }

    const updated = await this.tenantPrisma.update<BankReconciliationRecord>(
      'bank_reconciliations',
      reconciliationId,
      { status: 'locked', lockedAt: new Date(), lockedBy: userId },
    );

    this.logger.log(`Bank reconciliation ${reconciliationId} locked by Super Admin ${userId}`);
    return updated!;
  }

  // ============================================================================
  // RECONCILIATION ITEMS
  // ============================================================================

  async addItem(
    companyId: number,
    reconciliationId: number,
    dto: CreateBankReconciliationItemDto,
  ): Promise<BankReconciliationItemRecord> {
    const reconciliation = await this.findById(companyId, reconciliationId);

    if (reconciliation.status === 'completed') {
      throw new BadRequestException('Cannot add items to a completed reconciliation');
    }

    // Update reconciliation status to in_progress if still draft
    if (reconciliation.status === 'draft') {
      await this.tenantPrisma.update('bank_reconciliations', reconciliationId, {
        status: 'in_progress',
      });
    }

    return this.tenantPrisma.insert<BankReconciliationItemRecord>('bank_reconciliation_items', {
      bankReconciliationId: reconciliationId,
      transactionType: dto.transactionType,
      referenceType: dto.referenceType || null,
      referenceId: dto.referenceId || null,
      transactionDate: dto.transactionDate,
      description: dto.description || null,
      amount: dto.amount,
      isCleared: dto.isCleared ?? false,
      clearedAt: dto.isCleared ? new Date() : null,
    });
  }

  async updateItem(
    companyId: number,
    reconciliationId: number,
    itemId: number,
    dto: UpdateBankReconciliationItemDto,
  ): Promise<BankReconciliationItemRecord> {
    const reconciliation = await this.findById(companyId, reconciliationId);

    if (reconciliation.status === 'completed') {
      throw new BadRequestException('Cannot update items in a completed reconciliation');
    }

    const item = await this.findItemById(reconciliationId, itemId);

    const updateData: Record<string, any> = {};
    if (dto.transactionType !== undefined) updateData.transactionType = dto.transactionType;
    if (dto.referenceType !== undefined) updateData.referenceType = dto.referenceType;
    if (dto.referenceId !== undefined) updateData.referenceId = dto.referenceId;
    if (dto.transactionDate !== undefined) updateData.transactionDate = dto.transactionDate;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.amount !== undefined) updateData.amount = dto.amount;
    if (dto.isCleared !== undefined) {
      updateData.isCleared = dto.isCleared;
      updateData.clearedAt = dto.isCleared ? new Date() : null;
    }

    if (Object.keys(updateData).length === 0) {
      return item;
    }

    const updated = await this.tenantPrisma.update<BankReconciliationItemRecord>(
      'bank_reconciliation_items',
      itemId,
      updateData,
    );

    if (!updated) {
      throw new NotFoundException('Reconciliation item not found');
    }

    return updated;
  }

  async removeItem(
    companyId: number,
    reconciliationId: number,
    itemId: number,
  ): Promise<void> {
    const reconciliation = await this.findById(companyId, reconciliationId);

    if (reconciliation.status === 'completed') {
      throw new BadRequestException('Cannot remove items from a completed reconciliation');
    }

    await this.findItemById(reconciliationId, itemId);
    await this.tenantPrisma.delete('bank_reconciliation_items', itemId);
  }

  async findItemById(
    reconciliationId: number,
    itemId: number,
  ): Promise<BankReconciliationItemRecord> {
    const item = await this.tenantPrisma.queryOne<BankReconciliationItemRecord>(
      `SELECT * FROM bank_reconciliation_items
       WHERE id = $1 AND "bankReconciliationId" = $2`,
      [itemId, reconciliationId],
    );

    if (!item) {
      throw new NotFoundException('Reconciliation item not found');
    }

    return item;
  }

  async findAllItems(
    companyId: number,
    reconciliationId: number,
  ): Promise<BankReconciliationItemRecord[]> {
    // Ensure reconciliation belongs to this company
    await this.findById(companyId, reconciliationId);

    return this.tenantPrisma.query<BankReconciliationItemRecord>(
      `SELECT * FROM bank_reconciliation_items
       WHERE "bankReconciliationId" = $1
       ORDER BY "transactionDate" ASC, id ASC`,
      [reconciliationId],
    );
  }

  async bulkClearItems(
    companyId: number,
    reconciliationId: number,
    dto: BulkClearItemsDto,
  ): Promise<{ cleared: number }> {
    const reconciliation = await this.findById(companyId, reconciliationId);

    if (reconciliation.status === 'completed') {
      throw new BadRequestException('Cannot modify items in a completed reconciliation');
    }

    if (dto.itemIds.length === 0) {
      return { cleared: 0 };
    }

    // Build parameterized query for the IN clause
    const placeholders = dto.itemIds.map((_, i) => `$${i + 2}`).join(', ');
    const result = await this.tenantPrisma.query(
      `UPDATE bank_reconciliation_items
       SET "isCleared" = true, "clearedAt" = NOW(), "updatedAt" = NOW()
       WHERE "bankReconciliationId" = $1 AND id IN (${placeholders})
       RETURNING id`,
      [reconciliationId, ...dto.itemIds],
    );

    return { cleared: result.length };
  }
}
