import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { validateDateInOpenPeriod, assertVoidDateOnOrAfterOriginal } from '../../../common/utils/fiscal-period-validator';
import {
  CreateJournalEntryDto,
  UpdateJournalEntryDto,
  PostJournalEntryDto,
  ReverseJournalEntryDto,
  JournalEntryQueryDto,
  JournalEntryLineDto,
} from '../dto';

export interface JournalEntry {
  id: number;
  companyId: number;
  entryNumber: string;
  entryDate: Date;
  reference: string | null;
  narration: string | null;
  totalDebit: number;
  totalCredit: number;
  status: string;
  journalType: string | null;
  sourceType: string | null;
  sourceId: number | null;
  requiresApproval: boolean;
  approvalLevel: number;
  reviewedAt: Date | null;
  reviewedBy: number | null;
  reviewComment: string | null;
  approvedAt: Date | null;
  approvedBy: number | null;
  approvalComment: string | null;
  rejectedAt: Date | null;
  rejectedBy: number | null;
  rejectionReason: string | null;
  postedAt: Date | null;
  postedBy: number | null;
  reversedAt: Date | null;
  reversedBy: number | null;
  reversalOf: number | null;
  reversalReason: string | null;
  fiscalYearId: number | null;
  createdBy: number | null;
  lastModifiedBy: number | null;
  deletedAt: Date | null;
  deletedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntryLine {
  id: number;
  journalEntryId: number;
  accountId: number;
  debit: number | null;
  credit: number | null;
  narration: string | null;
  reference: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntryWithLines extends JournalEntry {
  lines: JournalEntryLine[];
}

@Injectable()
export class JournalEntryService {
  private readonly logger = new Logger(JournalEntryService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  async create(
    companyId: number,
    dto: CreateJournalEntryDto,
    userId: number,
  ): Promise<JournalEntryWithLines> {
    // Validate lines balance
    this.validateLines(dto.lines);

    // Validate all accounts are active and posting-enabled
    const accountIds = dto.lines.map((l) => l.accountId).filter(Boolean);
    if (accountIds.length > 0) {
      const accounts = await this.tenantPrisma.query<{ id: number; code: string; name: string; isActive: boolean; isPosting: boolean }>(
        `SELECT id, code, name, "isActive", "isPosting" FROM ifrs_accounts WHERE id = ANY($1) AND "companyId" = $2 AND "deletedAt" IS NULL`,
        [accountIds, companyId],
      );
      const accountMap = new Map(accounts.map((a) => [a.id, a]));
      for (const line of dto.lines) {
        if (!line.accountId) continue;
        const acct = accountMap.get(line.accountId);
        if (!acct) {
          throw new BadRequestException(`Account ID ${line.accountId} not found`);
        }
        if (!acct.isActive) {
          throw new BadRequestException(`Account "${acct.code} - ${acct.name}" is deactivated. Cannot post to inactive accounts.`);
        }
        if (!acct.isPosting) {
          throw new BadRequestException(`Account "${acct.code} - ${acct.name}" is a header account (non-posting). Use a posting sub-account instead.`);
        }
      }
    }

    // Validate and auto-resolve fiscal period (rejects closed periods)
    const resolvedFiscalYearId = await this.enforceFiscalPeriodOpen(
      companyId, dto.entryDate, dto.fiscalYearId,
    );

    // Check if journal approval is required
    const companySettings = await this.tenantPrisma.queryOne<{ requireJournalApproval: boolean }>(
      `SELECT "requireJournalApproval" FROM company_settings WHERE "companyId" = $1`, [companyId],
    ).catch(() => null);
    const requireApproval = companySettings?.requireJournalApproval ?? false;
    const isManualEntry = !dto.sourceType || dto.sourceType === 'manual';
    const initialStatus = 'draft'; // Always start as draft; user must explicitly submit for approval

    // Generate entry number
    const entryNumber = await this.generateEntryNumber(companyId);

    // Calculate totals
    const totalDebit = dto.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = dto.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    return this.tenantPrisma.transaction(async (client) => {
      // Create journal entry
      const result = await client.query(
        `INSERT INTO journal_entries
         ("companyId", "entryNumber", "entryDate", reference, narration,
          "totalDebit", "totalCredit", status, "journalType", "sourceType",
          "sourceId", "fiscalYearId", "requiresApproval", "approvalLevel", "createdBy", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, $14, NOW(), NOW())
         RETURNING *`,
        [
          companyId,
          entryNumber,
          dto.entryDate,
          dto.reference || null,
          dto.narration || null,
          totalDebit,
          totalCredit,
          initialStatus,
          dto.journalType || 'general',
          dto.sourceType || 'manual',
          dto.sourceId || null,
          resolvedFiscalYearId,
          requireApproval && isManualEntry,
          userId,
        ],
      );
      const journalEntry = result.rows[0] as JournalEntry;

      // Create lines
      const lines: JournalEntryLine[] = [];
      for (const line of dto.lines) {
        const lineResult = await client.query(
          `INSERT INTO journal_entry_line_items
           ("journalEntryId", "accountId", debit, credit, narration, reference, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING *`,
          [
            journalEntry.id,
            line.accountId,
            line.debit || null,
            line.credit || null,
            line.narration || null,
            line.reference || null,
          ],
        );
        lines.push(lineResult.rows[0] as JournalEntryLine);
      }

      return { ...journalEntry, lines };
    }, { isolationLevel: 'SERIALIZABLE' });
  }

  async update(
    companyId: number,
    entryId: number,
    dto: UpdateJournalEntryDto,
    userId: number,
  ): Promise<JournalEntryWithLines> {
    const entry = await this.findById(companyId, entryId);

    if (entry.status !== 'draft') {
      throw new BadRequestException('Only draft journal entries can be updated');
    }

    if (dto.lines) {
      this.validateLines(dto.lines);
    }

    return this.tenantPrisma.transaction(async (client) => {
      // Update journal entry
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (dto.entryDate !== undefined) {
        updateFields.push(`"entryDate" = $${paramIndex++}`);
        updateValues.push(dto.entryDate);
      }
      if (dto.reference !== undefined) {
        updateFields.push(`reference = $${paramIndex++}`);
        updateValues.push(dto.reference);
      }
      if (dto.narration !== undefined) {
        updateFields.push(`narration = $${paramIndex++}`);
        updateValues.push(dto.narration);
      }
      if (dto.journalType !== undefined) {
        updateFields.push(`"journalType" = $${paramIndex++}`);
        updateValues.push(dto.journalType);
      }
      if (dto.fiscalYearId !== undefined) {
        updateFields.push(`"fiscalYearId" = $${paramIndex++}`);
        updateValues.push(dto.fiscalYearId);
      }

      let journalEntry: JournalEntry = { ...entry };

      if (updateFields.length > 0) {
        updateFields.push(`"updatedAt" = NOW()`);
        updateValues.push(entryId);

        const result = await client.query(
          `UPDATE journal_entries SET ${updateFields.join(', ')}
           WHERE id = $${paramIndex} RETURNING *`,
          updateValues,
        );
        journalEntry = result.rows[0] as JournalEntry;
      }

      // Update lines if provided
      let lines: JournalEntryLine[] = [];
      if (dto.lines) {
        // Delete existing lines
        await client.query(
          `DELETE FROM journal_entry_line_items WHERE "journalEntryId" = $1`,
          [entryId],
        );

        // Create new lines
        const totalDebit = dto.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
        const totalCredit = dto.lines.reduce((sum, line) => sum + (line.credit || 0), 0);

        for (const line of dto.lines) {
          const lineResult = await client.query(
            `INSERT INTO journal_entry_line_items
             ("journalEntryId", "accountId", debit, credit, narration, reference, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING *`,
            [
              entryId,
              line.accountId,
              line.debit || null,
              line.credit || null,
              line.narration || null,
              line.reference || null,
            ],
          );
          lines.push(lineResult.rows[0] as JournalEntryLine);
        }

        // Update totals
        await client.query(
          `UPDATE journal_entries
           SET "totalDebit" = $1, "totalCredit" = $2, "updatedAt" = NOW()
           WHERE id = $3`,
          [totalDebit, totalCredit, entryId],
        );
        journalEntry.totalDebit = totalDebit;
        journalEntry.totalCredit = totalCredit;
      } else {
        const linesResult = await client.query(
          `SELECT * FROM journal_entry_line_items WHERE "journalEntryId" = $1`,
          [entryId],
        );
        lines = linesResult.rows as JournalEntryLine[];
      }

      return { ...journalEntry, lines };
    }, { isolationLevel: 'SERIALIZABLE' });
  }

  // ==========================================================================
  // 2-LEVEL APPROVAL WORKFLOW
  // Draft → Submit (pending_review) → Review (reviewed) → Approve (approved → auto-post)
  // ==========================================================================

  /**
   * Submit a draft entry for approval.
   * Only the creator or an editor can submit.
   */
  async submit(
    companyId: number,
    entryId: number,
    userId: number,
  ): Promise<JournalEntryWithLines> {
    const entry = await this.findById(companyId, entryId);

    if (entry.status !== 'draft') {
      throw new BadRequestException('Only draft journal entries can be submitted for approval');
    }

    if (Math.abs(entry.totalDebit - entry.totalCredit) > 0.01) {
      throw new BadRequestException('Journal entry is not balanced. Fix before submitting.');
    }

    await this.tenantPrisma.query(
      `UPDATE journal_entries SET status = 'pending_review', "approvalLevel" = 0, "updatedAt" = NOW() WHERE id = $1`,
      [entryId],
    );

    this.logger.log(`JE ${entry.entryNumber} submitted for review by user ${userId}`);
    return this.findById(companyId, entryId);
  }

  /**
   * Level 1: Review a pending entry.
   * Reviewer must be different from creator.
   */
  async review(
    companyId: number,
    entryId: number,
    userId: number,
    comment?: string,
  ): Promise<JournalEntryWithLines> {
    const entry = await this.findById(companyId, entryId);

    if (entry.status !== 'pending_review') {
      throw new BadRequestException('Only entries pending review can be reviewed');
    }

    if (entry.createdBy === userId) {
      throw new BadRequestException('You cannot review a journal entry you created. A different user must review.');
    }

    await this.tenantPrisma.query(
      `UPDATE journal_entries
       SET status = 'reviewed', "approvalLevel" = 1,
           "reviewedAt" = NOW(), "reviewedBy" = $1, "reviewComment" = $2,
           "updatedAt" = NOW()
       WHERE id = $3`,
      [userId, comment || null, entryId],
    );

    this.logger.log(`JE ${entry.entryNumber} reviewed (Level 1) by user ${userId}`);
    return this.findById(companyId, entryId);
  }

  /**
   * Level 2: Approve a reviewed entry.
   * Approver must be different from both creator and reviewer.
   * On approval, entry is auto-posted to the ledger.
   */
  async approve(
    companyId: number,
    entryId: number,
    userId: number,
    comment?: string,
  ): Promise<JournalEntryWithLines> {
    const entry = await this.findById(companyId, entryId);

    if (entry.status !== 'reviewed') {
      throw new BadRequestException('Only reviewed journal entries can be approved. Entry must be reviewed first (Level 1).');
    }

    if (entry.createdBy === userId) {
      throw new BadRequestException('You cannot approve a journal entry you created.');
    }

    // For stronger segregation: approver should differ from reviewer too
    const je = await this.tenantPrisma.queryOne<{ reviewedBy: number | null }>(
      `SELECT "reviewedBy" FROM journal_entries WHERE id = $1`,
      [entryId],
    );
    if (je?.reviewedBy === userId) {
      throw new BadRequestException('You cannot approve a journal entry you reviewed. A different user must approve (Level 2).');
    }

    // Block posting to closed/locked periods
    await this.enforceFiscalPeriodOpen(companyId, entry.entryDate, entry.fiscalYearId);

    // Approve and auto-post in a transaction
    return this.tenantPrisma.transaction(async (client) => {
      const result = await client.query(
        `UPDATE journal_entries
         SET status = 'posted', "approvalLevel" = 2,
             "approvedAt" = NOW(), "approvedBy" = $1, "approvalComment" = $2,
             "postedAt" = NOW(), "postedBy" = $1,
             "updatedAt" = NOW()
         WHERE id = $3 RETURNING *`,
        [userId, comment || null, entryId],
      );
      const journalEntry = result.rows[0] as JournalEntry;

      // Get lines and create IFRS transactions (same as post logic below)
      const linesResult = await client.query(
        `SELECT * FROM journal_entry_line_items WHERE "journalEntryId" = $1`,
        [entryId],
      );
      const lines = linesResult.rows as JournalEntryLine[];

      await this.createIfrsTransactions(client, companyId, journalEntry, lines, userId);

      this.logger.log(`JE ${entry.entryNumber} approved (Level 2) and posted by user ${userId}`);
      return { ...journalEntry, lines };
    }, { isolationLevel: 'SERIALIZABLE' });
  }

  /**
   * Reject an entry at any approval level back to draft.
   */
  async reject(
    companyId: number,
    entryId: number,
    userId: number,
    reason: string,
  ): Promise<JournalEntryWithLines> {
    const entry = await this.findById(companyId, entryId);

    if (!['pending_review', 'reviewed'].includes(entry.status)) {
      throw new BadRequestException('Only entries in the approval process can be rejected');
    }

    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('Rejection reason is required (minimum 5 characters)');
    }

    await this.tenantPrisma.query(
      `UPDATE journal_entries
       SET status = 'draft', "approvalLevel" = 0,
           "rejectedAt" = NOW(), "rejectedBy" = $1, "rejectionReason" = $2,
           "reviewedAt" = NULL, "reviewedBy" = NULL, "reviewComment" = NULL,
           "approvedAt" = NULL, "approvedBy" = NULL, "approvalComment" = NULL,
           "updatedAt" = NOW()
       WHERE id = $3`,
      [userId, reason.trim(), entryId],
    );

    this.logger.log(`JE ${entry.entryNumber} rejected by user ${userId}: ${reason}`);
    return this.findById(companyId, entryId);
  }

  /**
   * Direct post — only for entries that do NOT require approval,
   * or for system-generated entries (sourceType != 'manual').
   */
  async post(
    companyId: number,
    entryId: number,
    dto: PostJournalEntryDto,
    userId: number,
  ): Promise<JournalEntryWithLines> {
    const entry = await this.findById(companyId, entryId);

    // If approval is required, cannot direct-post — must go through workflow
    if (entry.requiresApproval) {
      if (entry.status === 'draft') {
        throw new BadRequestException(
          'This journal entry requires approval. Use "Submit for Approval" instead of posting directly.',
        );
      }
      if (['pending_review', 'reviewed'].includes(entry.status)) {
        throw new BadRequestException(
          'This journal entry is in the approval workflow. It will be posted automatically when approved.',
        );
      }
    }

    if (entry.status !== 'draft') {
      throw new BadRequestException('Only draft journal entries can be directly posted (entries not requiring approval)');
    }

    // Verify entry is balanced
    if (Math.abs(entry.totalDebit - entry.totalCredit) > 0.01) {
      throw new BadRequestException('Journal entry is not balanced');
    }

    // Block posting to closed fiscal periods (auto-detect if not set)
    await this.enforceFiscalPeriodOpen(companyId, entry.entryDate, entry.fiscalYearId);

    return this.tenantPrisma.transaction(async (client) => {
      // Update journal entry status
      const result = await client.query(
        `UPDATE journal_entries
         SET status = 'posted', "postedAt" = NOW(), "postedBy" = $1, "updatedAt" = NOW()
         WHERE id = $2 RETURNING *`,
        [userId, entryId],
      );
      const journalEntry = result.rows[0] as JournalEntry;

      // Get lines
      const linesResult = await client.query(
        `SELECT * FROM journal_entry_line_items WHERE "journalEntryId" = $1`,
        [entryId],
      );
      const lines = linesResult.rows as JournalEntryLine[];

      await this.createIfrsTransactions(client, companyId, journalEntry, lines, userId);

      return { ...journalEntry, lines };
    }, { isolationLevel: 'SERIALIZABLE' });
  }

  async reverse(
    companyId: number,
    entryId: number,
    dto: ReverseJournalEntryDto,
    userId: number,
  ): Promise<JournalEntryWithLines> {
    const entry = await this.findById(companyId, entryId);

    if (entry.status !== 'posted') {
      throw new BadRequestException('Only posted journal entries can be reversed');
    }

    if (entry.reversedAt) {
      throw new BadRequestException('Journal entry has already been reversed');
    }

    // Require reversal reason
    const reversalReason = dto.reason;
    if (!reversalReason || reversalReason.trim().length < 5) {
      throw new BadRequestException('Reversal reason is required (minimum 5 characters). Explain why this entry is being reversed.');
    }

    // Block reversals to closed fiscal periods (auto-detect if not set)
    await this.enforceFiscalPeriodOpen(companyId, entry.entryDate, entry.fiscalYearId);

    // The REVERSAL date itself must also land in an open period and on/after
    // the original entry date — otherwise the running balance is wrong in
    // the period BETWEEN the original and the (backdated) reversal.
    const originalDateStr = typeof entry.entryDate === 'string'
      ? String(entry.entryDate).slice(0, 10)
      : new Date(entry.entryDate as unknown as string).toISOString().slice(0, 10);
    const reversalDateStr = typeof dto.reversalDate === 'string'
      ? dto.reversalDate.slice(0, 10)
      : new Date(dto.reversalDate as unknown as string).toISOString().slice(0, 10);
    assertVoidDateOnOrAfterOriginal(originalDateStr, reversalDateStr, 'reverse this journal entry');
    await validateDateInOpenPeriod(this.tenantPrisma, companyId, reversalDateStr, 'reverse this journal entry');

    return this.tenantPrisma.transaction(async (client) => {
      // Mark original as reversed with reason
      await client.query(
        `UPDATE journal_entries
         SET status = 'reversed', "reversedAt" = NOW(), "reversedBy" = $1, "reversalReason" = $3, "updatedAt" = NOW()
         WHERE id = $2`,
        [userId, entryId, reversalReason.trim()],
      );

      // Get original lines
      const linesResult = await client.query(
        `SELECT * FROM journal_entry_line_items WHERE "journalEntryId" = $1`,
        [entryId],
      );
      const originalLines = linesResult.rows as JournalEntryLine[];

      // Generate new entry number for reversal
      const reversalNumber = await this.generateEntryNumber(companyId);

      // Create reversal entry
      const reversalResult = await client.query(
        `INSERT INTO journal_entries
         ("companyId", "entryNumber", "entryDate", reference, narration,
          "totalDebit", "totalCredit", status, "journalType", "reversalOf",
          "createdBy", "postedAt", "postedBy", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'posted', 'adjusting', $8, $9, NOW(), $9, NOW(), NOW())
         RETURNING *`,
        [
          companyId,
          reversalNumber,
          dto.reversalDate,
          entry.reference ? `REV-${entry.reference}` : null,
          `Reversal of ${entry.entryNumber}${dto.reason ? `: ${dto.reason}` : ''}`,
          entry.totalCredit, // Swap debit and credit
          entry.totalDebit,
          entryId,
          userId,
        ],
      );
      const reversalEntry = reversalResult.rows[0] as JournalEntry;

      // Create reversed lines (swap debit and credit)
      const reversedLines: JournalEntryLine[] = [];
      for (const line of originalLines) {
        const lineResult = await client.query(
          `INSERT INTO journal_entry_line_items
           ("journalEntryId", "accountId", debit, credit, narration, reference, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING *`,
          [
            reversalEntry.id,
            line.accountId,
            line.credit, // Swap
            line.debit,  // Swap
            `Reversal: ${line.narration || ''}`,
            line.reference,
          ],
        );
        reversedLines.push(lineResult.rows[0] as JournalEntryLine);
      }

      // Mark original IFRS transactions as reversed
      await client.query(
        `UPDATE ifrs_transactions
         SET "isReversed" = true, "reversedBy" = $1, "updatedAt" = NOW()
         WHERE "referenceType" = 'journal_entry' AND "referenceId" = $2`,
        [userId, entryId],
      );

      return { ...reversalEntry, lines: reversedLines };
    }, { isolationLevel: 'SERIALIZABLE' });
  }

  async delete(companyId: number, entryId: number): Promise<void> {
    const entry = await this.findById(companyId, entryId);

    if (entry.status !== 'draft') {
      throw new BadRequestException('Only draft journal entries can be deleted');
    }

    await this.tenantPrisma.transaction(async (client) => {
      // Delete lines
      await client.query(
        `DELETE FROM journal_entry_line_items WHERE "journalEntryId" = $1`,
        [entryId],
      );

      // Soft delete entry
      await client.query(
        `UPDATE journal_entries SET "deletedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1`,
        [entryId],
      );
    }, { isolationLevel: 'SERIALIZABLE' });
  }

  async findById(companyId: number, entryId: number): Promise<JournalEntryWithLines> {
    const entry = await this.tenantPrisma.queryOne<JournalEntry>(
      `SELECT * FROM journal_entries WHERE id = $1 AND "companyId" = $2 AND "deletedAt" IS NULL`,
      [entryId, companyId],
    );

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    const lines = await this.tenantPrisma.query<JournalEntryLine>(
      `SELECT jel.*, a.code as account_code, a.name as account_name
       FROM journal_entry_line_items jel
       JOIN ifrs_accounts a ON a.id = jel."accountId"
       WHERE jel."journalEntryId" = $1
       ORDER BY jel.id`,
      [entryId],
    );

    return { ...entry, lines };
  }

  async findAll(companyId: number, query: JournalEntryQueryDto): Promise<{
    data: JournalEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;

    let sql = `SELECT journal_entries.*,
              (SELECT pafs.name
               FROM process_approval_statuses pas
               JOIN process_approvals pa ON pa."approvableType" = pas."approvableType" AND pa."approvableId" = pas."approvableId" AND pa."approvalAction" = 'Pending'
               JOIN process_approval_flow_steps pafs ON pafs.id = pa."processApprovalFlowStepId"
               WHERE pas."approvableType" = 'journal_entries' AND pas."approvableId" = journal_entries.id AND pas.status = 'PENDING'
               ORDER BY pafs."stepOrder" ASC LIMIT 1
              ) as "pendingStepName"
       FROM journal_entries WHERE "companyId" = $1 AND "deletedAt" IS NULL`;
    let countSql = `SELECT COUNT(*) as count FROM journal_entries WHERE "companyId" = $1 AND "deletedAt" IS NULL`;
    const params: any[] = [companyId];
    let paramIndex = 2;

    if (query.status) {
      sql += ` AND status = $${paramIndex}`;
      countSql += ` AND status = $${paramIndex}`;
      params.push(query.status);
      paramIndex++;
    }

    if (query.journalType) {
      sql += ` AND "journalType" = $${paramIndex}`;
      countSql += ` AND "journalType" = $${paramIndex}`;
      params.push(query.journalType);
      paramIndex++;
    }

    if (query.fiscalYearId) {
      sql += ` AND "fiscalYearId" = $${paramIndex}`;
      countSql += ` AND "fiscalYearId" = $${paramIndex}`;
      params.push(query.fiscalYearId);
      paramIndex++;
    }

    if (query.startDate) {
      sql += ` AND "entryDate" >= $${paramIndex}`;
      countSql += ` AND "entryDate" >= $${paramIndex}`;
      params.push(query.startDate);
      paramIndex++;
    }

    if (query.endDate) {
      sql += ` AND "entryDate" <= $${paramIndex}`;
      countSql += ` AND "entryDate" <= $${paramIndex}`;
      params.push(query.endDate);
      paramIndex++;
    }

    if (query.sourceType) {
      const st = query.sourceType;
      if (st === 'manual') {
        sql += ` AND ("sourceType" IS NULL OR "sourceType" = 'manual')`;
        countSql += ` AND ("sourceType" IS NULL OR "sourceType" = 'manual')`;
      } else {
        sql += ` AND "sourceType" = $${paramIndex}`;
        countSql += ` AND "sourceType" = $${paramIndex}`;
        params.push(st);
        paramIndex++;
      }
    }

    if (query.search) {
      sql += ` AND ("entryNumber" ILIKE $${paramIndex} OR narration ILIKE $${paramIndex} OR reference ILIKE $${paramIndex})`;
      countSql += ` AND ("entryNumber" ILIKE $${paramIndex} OR narration ILIKE $${paramIndex} OR reference ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY "entryDate" DESC, "entryNumber" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [data, countResult] = await Promise.all([
      this.tenantPrisma.query<JournalEntry>(sql, params),
      this.tenantPrisma.queryOne<{ count: string }>(countSql, params.slice(0, -2)),
    ]);

    return {
      data,
      total: parseInt(countResult?.count || '0', 10),
      page,
      limit,
    };
  }

  private validateLines(lines: JournalEntryLineDto[]): void {
    if (!lines || lines.length < 2) {
      throw new BadRequestException('Journal entry must have at least 2 lines');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      if (!line.debit && !line.credit) {
        throw new BadRequestException('Each line must have either a debit or credit amount');
      }
      if (line.debit && line.credit) {
        throw new BadRequestException('A line cannot have both debit and credit amounts');
      }
      if ((line.debit && line.debit < 0) || (line.credit && line.credit < 0)) {
        throw new BadRequestException('Amounts cannot be negative');
      }
      totalDebit += line.debit || 0;
      totalCredit += line.credit || 0;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Journal entry is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`,
      );
    }
  }

  /**
   * Resolve the fiscal year for a given entry date. Returns { id, status } or null if no fiscal year covers this date.
   */
  private async resolveFiscalYear(
    companyId: number,
    entryDate: Date | string,
  ): Promise<{ id: number; status: string } | null> {
    return this.tenantPrisma.queryOne<{ id: number; status: string }>(
      `SELECT id, status FROM fiscal_years
       WHERE "companyId" = $1 AND "startDate" <= $2 AND "endDate" >= $2
       LIMIT 1`,
      [companyId, entryDate],
    );
  }

  /**
   * Ensure the fiscal year covering this entry date is open. Throws if it's closed/adjusting.
   * Returns the resolved fiscalYearId (or the provided one).
   */
  private async enforceFiscalPeriodOpen(
    companyId: number,
    entryDate: Date | string,
    explicitFiscalYearId?: number | null,
  ): Promise<number | null> {
    // Check period lock first
    await this.checkPeriodLock(companyId, entryDate);

    if (explicitFiscalYearId) {
      // Validate the explicitly provided fiscal year
      const fiscalYear = await this.tenantPrisma.queryOne<{ id: number; status: string }>(
        `SELECT id, status FROM fiscal_years WHERE id = $1 AND "companyId" = $2`,
        [explicitFiscalYearId, companyId],
      );
      if (!fiscalYear) {
        throw new BadRequestException('Fiscal year not found');
      }
      if (fiscalYear.status !== 'open') {
        throw new BadRequestException('Cannot create or post journal entries to a closed fiscal period');
      }
      return explicitFiscalYearId;
    }

    // Auto-detect fiscal year from entry date
    const fiscalYear = await this.resolveFiscalYear(companyId, entryDate);
    if (fiscalYear && fiscalYear.status !== 'open') {
      throw new BadRequestException('Cannot create or post journal entries to a closed fiscal period');
    }
    return fiscalYear?.id ?? null;
  }

  /**
   * Check if the period is locked (month-level or year-level).
   * Throws BadRequestException if locked.
   */
  private async checkPeriodLock(companyId: number, date: Date | string): Promise<void> {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    const lock = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT id FROM period_locks
       WHERE "companyId" = $1 AND "isLocked" = true
       AND ((year = $2 AND period = 0) OR (year = $2 AND period = $3))
       LIMIT 1`,
      [companyId, year, month],
    );

    if (lock) {
      const monthName = d.toLocaleString('en', { month: 'long', year: 'numeric' });
      throw new BadRequestException(
        `Cannot post to ${monthName}. This accounting period is locked. Contact your administrator to unlock if an adjustment is needed.`,
      );
    }
  }

  /**
   * Create IFRS transactions from journal entry lines.
   * Shared by both direct-post and approval-post paths.
   */
  private async createIfrsTransactions(
    client: { query: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }> },
    companyId: number,
    journalEntry: JournalEntry,
    lines: JournalEntryLine[],
    userId: number,
  ): Promise<void> {
    for (const line of lines) {
      if (line.debit && line.debit > 0) {
        const creditLine = lines.find(l => l.credit && l.credit > 0 && l.id !== line.id);
        if (creditLine) {
          await client.query(
            `INSERT INTO ifrs_transactions
             ("entityId", "companyId", "transactionDate", "transactionNo", "transactionType",
              "debitAccountId", "creditAccountId", amount, narration, reference,
              "referenceType", "referenceId", posted, "postedAt", "postedBy", "createdAt", "updatedAt")
             VALUES (
               (SELECT "entityId" FROM companies WHERE id = $1),
               $1, $2, $3, 'journal', $4, $5, $6, $7, $8, 'journal_entry', $9, true, NOW(), $10, NOW(), NOW()
             )`,
            [
              companyId,
              journalEntry.entryDate,
              journalEntry.entryNumber,
              line.accountId,
              creditLine.accountId,
              line.debit,
              line.narration || journalEntry.narration,
              journalEntry.reference,
              journalEntry.id,
              userId,
            ],
          );
        }
      }
    }
  }

  private async generateEntryNumber(companyId: number): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `JE-${year}-`;

    const lastEntry = await this.tenantPrisma.queryOne<{ entryNumber: string }>(
      `SELECT "entryNumber" FROM journal_entries
       WHERE "companyId" = $1 AND "entryNumber" LIKE $2
       ORDER BY "entryNumber" DESC LIMIT 1`,
      [companyId, `${prefix}%`],
    );

    let nextNumber = 1;
    if (lastEntry?.entryNumber) {
      const parts = lastEntry.entryNumber.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }
}
