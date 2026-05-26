import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { ExpenseRequestService } from './expense-request.service';
import { isSuperAdmin } from '../../../common/utils/super-admin';
import { toMoney, subMoney } from '../../../common/utils/decimal';
import {
  BatchImportDto,
  BatchImportRowDto,
  HistoricalLoadDto,
  HistoricalLoadRowDto,
  BatchDryRunResponse,
  BatchCommitResponse,
  BatchValidationResult,
} from '../dto/batch-import.dto';
import { CreateExpenseRequestDto } from '../dto/expense-request.dto';

/**
 * Expense Request bulk-upload service.
 *
 * Two distinct flows live here:
 *
 * 1. **Live batch** — each row is created through the normal
 *    `ExpenseRequestService.create() + submit()` path, so the tenant's
 *    `useExpenseApproval` setting is respected. A batch with approval on
 *    lands dozens of drafts-turned-pending for the normal approvers to
 *    action; a batch with approval off lands them already posted-and-paid
 *    (because submit() auto-advances in that mode).
 *
 * 2. **Historical load** — Super-Admin-only. Bypasses the approval flow
 *    entirely and inserts the expense request as `paid`, posting the GL
 *    entry on the row's own `paymentDate`. Use case: bringing in prior-
 *    period activity from a legacy system when the actual approvals
 *    already happened offline. Tagged `isHistoricalLoad = true` so audit
 *    reports can separate backfilled facts from current activity.
 *
 * Both flows use a two-phase dry-run / commit split and group CSV rows
 * by their client-supplied `externalRef` field. Idempotency: a commit
 * refuses to run if any externalRef in the batch already exists in
 * `expense_requests.batchRef` for the tenant.
 */
@Injectable()
export class BatchImportService {
  private readonly logger = new Logger(BatchImportService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly expenseRequestService: ExpenseRequestService,
  ) {}

  // =========================================================================
  // PUBLIC ENTRY POINTS
  // =========================================================================

  async liveBatchDryRun(companyId: number, dto: BatchImportDto): Promise<BatchDryRunResponse> {
    const groups = this.groupByRef(dto.rows);
    const results = await Promise.all(
      Array.from(groups.entries()).map(([ref, rows]) => this.validateGroup(companyId, ref, rows, false)),
    );
    return this.buildDryRunResponse(results, dto.batchLabel);
  }

  async liveBatchCommit(
    companyId: number,
    dto: BatchImportDto,
    userId: number,
  ): Promise<BatchCommitResponse> {
    const batchRef = this.generateBatchRef(dto.batchLabel);
    await this.assertBatchRefIsNew(companyId, dto.rows);
    const groups = this.groupByRef(dto.rows);

    const createdRequestIds: number[] = [];
    const failedRefs: Array<{ externalRef: string; error: string }> = [];

    for (const [ref, rows] of groups.entries()) {
      try {
        const result = await this.validateGroup(companyId, ref, rows, false);
        if (result.errors.length > 0) {
          failedRefs.push({ externalRef: ref, error: result.errors.join('; ') });
          continue;
        }
        const id = await this.createLiveBatchRequest(companyId, ref, rows, batchRef, userId);
        createdRequestIds.push(id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(`liveBatchCommit group ${ref} failed: ${msg}`);
        failedRefs.push({ externalRef: ref, error: msg });
      }
    }

    this.logger.log(
      `Live batch ${batchRef} by user ${userId}: ${createdRequestIds.length} created, ${failedRefs.length} failed`,
    );
    return { batchRef, createdRequestIds, failedRefs };
  }

  async historicalLoadDryRun(
    companyId: number,
    dto: HistoricalLoadDto,
    userId: number,
  ): Promise<BatchDryRunResponse> {
    await this.assertSuperAdmin(userId);
    const groups = this.groupByRef(dto.rows);
    const results = await Promise.all(
      Array.from(groups.entries()).map(([ref, rows]) =>
        this.validateGroup(companyId, ref, rows as BatchImportRowDto[], true),
      ),
    );
    return this.buildDryRunResponse(results, dto.batchLabel);
  }

  async historicalLoadCommit(
    companyId: number,
    dto: HistoricalLoadDto,
    userId: number,
  ): Promise<BatchCommitResponse> {
    await this.assertSuperAdmin(userId);
    const batchRef = this.generateBatchRef(dto.batchLabel);
    await this.assertBatchRefIsNew(companyId, dto.rows);
    const groups = this.groupByRef(dto.rows);

    const createdRequestIds: number[] = [];
    const failedRefs: Array<{ externalRef: string; error: string }> = [];

    for (const [ref, rows] of groups.entries()) {
      try {
        const histRows = rows as HistoricalLoadRowDto[];
        const result = await this.validateGroup(companyId, ref, histRows, true);
        if (result.errors.length > 0) {
          failedRefs.push({ externalRef: ref, error: result.errors.join('; ') });
          continue;
        }
        const id = await this.createHistoricalLoadRequest(companyId, ref, histRows, batchRef, userId);
        createdRequestIds.push(id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(`historicalLoadCommit group ${ref} failed: ${msg}`);
        failedRefs.push({ externalRef: ref, error: msg });
      }
    }

    this.logger.log(
      `Historical load ${batchRef} by super-admin ${userId}: ${createdRequestIds.length} created, ${failedRefs.length} failed`,
    );
    return { batchRef, createdRequestIds, failedRefs };
  }

  // =========================================================================
  // GROUPING / HELPERS
  // =========================================================================

  private groupByRef<T extends BatchImportRowDto>(rows: T[]): Map<string, T[]> {
    const groups = new Map<string, T[]>();
    for (const row of rows) {
      const ref = row.externalRef?.trim();
      if (!ref) continue;
      const bucket = groups.get(ref) ?? [];
      bucket.push(row);
      groups.set(ref, bucket);
    }
    return groups;
  }

  private generateBatchRef(label?: string): string {
    const stamp = new Date().toISOString().replace(/[:T-]/g, '').slice(0, 14);
    const suffix = label ? `-${label.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8)}` : '';
    return `BATCH-${stamp}${suffix}`;
  }

  private async assertSuperAdmin(userId: number): Promise<void> {
    const ok = await isSuperAdmin(this.tenantPrisma, userId);
    if (!ok) {
      throw new ForbiddenException('Historical load requires Super Admin privileges');
    }
  }

  /**
   * Fail fast if any externalRef in this batch was already used on a prior
   * import. Prevents accidental double-uploads — including re-runs of
   * the same chunk in a chunked upload — from creating duplicate expense
   * requests + GL entries.
   *
   * The `expense_requests.batchRef` column stores the raw externalRef so
   * this check is a direct equality match. (Previously we concatenated a
   * generated BATCH-* prefix, but that broke dedup because the pre-check
   * compared against the raw externalRef while the insert wrote the
   * combined value.)
   */
  private async assertBatchRefIsNew(companyId: number, rows: BatchImportRowDto[]): Promise<void> {
    const refs = Array.from(new Set(rows.map((r) => r.externalRef?.trim()).filter(Boolean)));
    if (refs.length === 0) {
      throw new BadRequestException('Batch contains no externalRef values');
    }
    const clashes = await this.tenantPrisma.query<{ batchRef: string }>(
      `SELECT DISTINCT "batchRef"
         FROM expense_requests
        WHERE "companyId" = $1 AND "batchRef" = ANY($2::text[]) AND "deletedAt" IS NULL`,
      [companyId, refs],
    );
    if (clashes.length > 0) {
      throw new BadRequestException(
        `The following externalRefs have already been imported and cannot be re-uploaded: ${clashes
          .map((c) => c.batchRef)
          .join(', ')}`,
      );
    }
  }

  private buildDryRunResponse(
    results: BatchValidationResult[],
    batchLabel?: string,
  ): BatchDryRunResponse {
    const validCount = results.filter((r) => r.errors.length === 0).length;
    return {
      batchRef: this.generateBatchRef(batchLabel),
      results,
      validCount,
      invalidCount: results.length - validCount,
    };
  }

  // =========================================================================
  // VALIDATION — runs per externalRef group
  // =========================================================================

  private async validateGroup(
    companyId: number,
    externalRef: string,
    rows: BatchImportRowDto[],
    isHistorical: boolean,
  ): Promise<BatchValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (rows.length === 0) {
      return { externalRef, rowCount: 0, totalAmount: 0, errors: ['No rows in group'], warnings };
    }

    const header = rows[0];

    // Header consistency — all rows should agree on requestDate, email, description, historical fields
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.requestDate !== header.requestDate) warnings.push(`Row ${i + 1} requestDate differs — first row used`);
      if (r.requesterEmail !== header.requesterEmail) warnings.push(`Row ${i + 1} requesterEmail differs — first row used`);
      if (isHistorical) {
        const hh = header as HistoricalLoadRowDto;
        const rh = r as HistoricalLoadRowDto;
        if (rh.paymentDate !== hh.paymentDate) errors.push(`Row ${i + 1} paymentDate differs from first row in same group`);
        if (rh.bankAccountCode !== hh.bankAccountCode) errors.push(`Row ${i + 1} bankAccountCode differs from first row in same group`);
      }
    }

    // Requester — matched by email, employee code, staff ID, or full name
    const requester = await this.resolveEmployeeByEmail(companyId, header.requesterEmail);
    if (!requester) errors.push(`Requester "${header.requesterEmail}" not found (tried email, employee code, staff ID, and full name)`);

    // Per-line account + wht validation
    let totalAmount = 0;
    for (const [idx, row] of rows.entries()) {
      const qty = Number(row.quantity);
      const price = Number(row.unitPrice);
      if (!Number.isFinite(qty) || qty <= 0) errors.push(`Row ${idx + 1} quantity must be > 0`);
      if (!Number.isFinite(price) || price <= 0) errors.push(`Row ${idx + 1} unitPrice must be > 0`);

      if (row.expenseAccountCode?.trim()) {
        const acc = await this.resolveAccountByCode(companyId, row.expenseAccountCode);
        if (!acc) errors.push(`Row ${idx + 1} expenseAccountCode "${row.expenseAccountCode}" not found`);
      } else {
        errors.push(`Row ${idx + 1} missing expenseAccountCode`);
      }

      if (row.whtCode?.trim()) {
        const wht = await this.resolveWhtByCode(companyId, row.whtCode);
        if (!wht) warnings.push(`Row ${idx + 1} whtCode "${row.whtCode}" not found — WHT will be ignored`);
      }

      totalAmount += qty * price;
    }

    // Historical-only — bank + payment date
    if (isHistorical) {
      const h = header as HistoricalLoadRowDto;
      if (!h.paymentDate) errors.push('Missing paymentDate');
      else if (new Date(h.paymentDate) > new Date()) errors.push('paymentDate cannot be in the future');
      if (!h.bankAccountCode?.trim()) errors.push('Missing bankAccountCode');
      else {
        const bank = await this.resolveBankByCodeOrName(companyId, h.bankAccountCode);
        if (!bank) errors.push(`bankAccountCode "${h.bankAccountCode}" not found`);
      }
    }

    return {
      externalRef,
      rowCount: rows.length,
      requesterName: requester?.name,
      totalAmount: Number(totalAmount.toFixed(2)),
      errors,
      warnings,
    };
  }

  // =========================================================================
  // LIVE BATCH — one request per group, through the normal service path
  // =========================================================================

  private async createLiveBatchRequest(
    companyId: number,
    externalRef: string,
    rows: BatchImportRowDto[],
    batchRef: string,
    userId: number,
  ): Promise<number> {
    const header = rows[0];
    const requester = await this.resolveEmployeeByEmail(companyId, header.requesterEmail);
    if (!requester) throw new BadRequestException(`Requester "${header.requesterEmail}" not found`);

    const createDto = await this.buildCreateDto(companyId, rows, requester.id);
    const created = await this.expenseRequestService.create(companyId, createDto);

    // Tag with the externalRef so re-uploads of the same row are blocked
    // (assertBatchRefIsNew matches on this column). The generated batchRef
    // value is audit-level metadata only and captured in the log below.
    await this.tenantPrisma.query(
      `UPDATE expense_requests
         SET "batchRef" = $1, "updatedAt" = NOW()
       WHERE id = $2`,
      [externalRef, created.id],
    );
    this.logger.debug(
      `Live batch row created id=${created.id} externalRef=${externalRef} uploadBatch=${batchRef}`,
    );

    // Submit through the normal path — if useExpenseApproval=false, this
    // auto-approves. If approval is on, it goes to step 1 (HOD).
    await this.expenseRequestService.submit(companyId, created.id, userId);

    return created.id;
  }

  private async buildCreateDto(
    companyId: number,
    rows: BatchImportRowDto[],
    requesterId: number,
  ): Promise<CreateExpenseRequestDto> {
    const header = rows[0];
    const lines = [] as CreateExpenseRequestDto['lines'];
    for (const row of rows) {
      const acc = await this.resolveAccountByCode(companyId, row.expenseAccountCode);
      const wht = row.whtCode?.trim()
        ? await this.resolveWhtByCode(companyId, row.whtCode)
        : null;
      lines.push({
        description: row.lineDescription,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unitPrice),
        accountId: acc?.id ?? undefined,
        expenseAccountId: acc?.id ?? undefined,
        whtId: wht?.id ?? undefined,
        whtApplicable: !!wht,
        whtRate: wht?.rate ?? undefined,
      });
    }

    const benBank = header.beneficiaryBankName?.trim()
      ? await this.resolveBankByCodeOrName(companyId, header.beneficiaryBankName)
      : null;

    return {
      requesterId,
      requestDate: header.requestDate,
      description: header.description,
      memoFrom: header.memoFrom,
      memoTo: header.memoTo,
      subject: header.subject,
      background: header.background,
      justification: header.justification,
      prayer: header.prayer,
      beneficiaryName: header.beneficiaryName,
      beneficiaryAccountNumber: header.beneficiaryAccountNumber,
      beneficiaryBankName: header.beneficiaryBankName,
      beneficiaryBankId: benBank?.id,
      lines,
    } as CreateExpenseRequestDto;
  }

  // =========================================================================
  // HISTORICAL LOAD — bypass approval, post JE on the historical date
  // =========================================================================

  /**
   * Inline create + GL post. Keeps the existing `ExpenseRequestService.markAsPaid`
   * untouched (which always dates JEs to NOW()) and runs the equivalent
   * posting inside one serializable transaction using `paymentDate` as the
   * JE entryDate.
   */
  private async createHistoricalLoadRequest(
    companyId: number,
    externalRef: string,
    rows: HistoricalLoadRowDto[],
    batchRef: string,
    userId: number,
  ): Promise<number> {
    const header = rows[0];
    const requester = await this.resolveEmployeeByEmail(companyId, header.requesterEmail);
    if (!requester) throw new BadRequestException(`Requester "${header.requesterEmail}" not found`);

    const bank = await this.resolveBankByCodeOrName(companyId, header.bankAccountCode);
    if (!bank) throw new BadRequestException(`Bank "${header.bankAccountCode}" not found`);
    if (!bank.glAccountId) {
      throw new BadRequestException(`Bank "${header.bankAccountCode}" has no GL account configured`);
    }

    // Build line + total data up-front — keeps the transaction short
    type Line = {
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      accountId: number;
      whtId: number | null;
      whtRate: number | null;
      whtAmount: number;
      whtApplicable: boolean;
    };
    const lines: Line[] = [];
    let totalAmount = 0;
    let whtAmount = 0;
    for (const row of rows) {
      const acc = await this.resolveAccountByCode(companyId, row.expenseAccountCode);
      if (!acc) throw new BadRequestException(`expenseAccountCode "${row.expenseAccountCode}" not found`);
      const wht = row.whtCode?.trim() ? await this.resolveWhtByCode(companyId, row.whtCode) : null;
      const qty = Number(row.quantity);
      const price = Number(row.unitPrice);
      const amount = toMoney(qty * price);
      const lineWht = wht ? toMoney((amount * Number(wht.rate)) / 100) : 0;
      lines.push({
        description: row.lineDescription,
        quantity: qty,
        unitPrice: price,
        amount,
        accountId: acc.id,
        whtId: wht?.id ?? null,
        whtRate: wht ? Number(wht.rate) : null,
        whtApplicable: !!wht,
        whtAmount: lineWht,
      });
      totalAmount = toMoney(totalAmount + amount);
      whtAmount = toMoney(whtAmount + lineWht);
    }
    const netAmount = subMoney(totalAmount, whtAmount);
    const paymentDate = new Date(header.paymentDate);

    let newRequestId = -1;

    await this.tenantPrisma.transaction(async (client) => {
      // Generate sequence numbers (ER, PV, TL, JE) — same patterns as the
      // normal service uses, all under row locks.
      const year = paymentDate.getFullYear();

      const erPrefix = `ER-${year}-`;
      const lastEr = await client.query(
        `SELECT "requestNumber" FROM expense_requests
          WHERE "companyId" = $1 AND "requestNumber" LIKE $2
          ORDER BY "requestNumber" DESC LIMIT 1 FOR UPDATE`,
        [companyId, `${erPrefix}%`],
      );
      const nextEr = this.nextSeqNum(lastEr.rows[0]?.requestNumber) ?? 1;
      const requestNumber = `${erPrefix}${String(nextEr).padStart(5, '0')}`;

      const pvLast = await client.query(
        `SELECT "paymentVoucherNumber" FROM expense_requests
          WHERE "companyId" = $1 AND "paymentVoucherNumber" IS NOT NULL
          ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [companyId],
      );
      const lastPvNum = pvLast.rows[0]
        ? parseInt((pvLast.rows[0].paymentVoucherNumber as string).replace('PV-', ''), 10) || 0
        : 0;
      const pvNumber = `PV-${String(lastPvNum + 1).padStart(6, '0')}`;

      const tlPrefix = `TL-${year}-`;
      const tlLast = await client.query(
        `SELECT "transferMemoNumber" FROM expense_requests
          WHERE "companyId" = $1 AND "transferMemoNumber" IS NOT NULL
          ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [companyId],
      );
      const lastTlNum = tlLast.rows[0]
        ? parseInt((tlLast.rows[0].transferMemoNumber as string).replace(tlPrefix, ''), 10) || 0
        : 0;
      const tlNumber = `${tlPrefix}${String(lastTlNum + 1).padStart(5, '0')}`;

      const jePrefix = `JE-${year}-`;
      const jeLast = await client.query(
        `SELECT "entryNumber" FROM journal_entries
          WHERE "companyId" = $1 AND "entryNumber" LIKE $2
          ORDER BY "entryNumber" DESC LIMIT 1 FOR UPDATE`,
        [companyId, `${jePrefix}%`],
      );
      const nextJe = this.nextSeqNum(jeLast.rows[0]?.entryNumber) ?? 1;
      const jeNumber = `${jePrefix}${String(nextJe).padStart(5, '0')}`;

      // Resolve fiscal year for the payment date — historical loads MUST
      // land in the fiscal year containing paymentDate, not today's year.
      const fyRes = await client.query(
        `SELECT id FROM fiscal_years
          WHERE "companyId" = $1 AND "startDate" <= $2::date AND "endDate" >= $2::date
          LIMIT 1`,
        [companyId, paymentDate],
      );
      const fiscalYearId = fyRes.rows[0]?.id || null;

      // Beneficiary bank lookup (optional)
      const benBank = header.beneficiaryBankName?.trim()
        ? await this.resolveBankByCodeOrNameWithClient(client, companyId, header.beneficiaryBankName)
        : null;

      // Insert expense_requests row — straight to 'paid' with historical flag
      const erInsert = await client.query(
        `INSERT INTO expense_requests
          ("companyId", "requestNumber", "requesterId", "requestDate", description,
           status, "totalAmount", "whtAmount", "netAmount", currency,
           "approvedAmount", "approvedAt", "approvedBy",
           "bankAccountId", "paymentVoucherNumber", "transferMemoNumber",
           "paymentDate", "paymentReference", "paidAt", "paidBy",
           "memoFrom", "memoTo", subject, background, justification, prayer,
           "beneficiaryName", "beneficiaryAccountNumber", "beneficiaryBankName", "beneficiaryBankId",
           "batchRef", "isHistoricalLoad", "createdBy", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4::date,$5,'paid',$6,$7,$8,'NGN',$6,$9::timestamp,$10,
                 $11,$12,$13,$14::date,$15,$9::timestamp,$10,
                 $16,$17,$18,$19,$20,$21,
                 $22,$23,$24,$25,
                 $26,true,$10,NOW(),NOW())
         RETURNING id`,
        [
          companyId, requestNumber, requester.id, header.requestDate, header.description,
          totalAmount, whtAmount, netAmount,
          paymentDate, userId,
          bank.id, pvNumber, tlNumber, paymentDate, header.paymentReference ?? null,
          header.memoFrom ?? null, header.memoTo ?? null, header.subject ?? null,
          header.background ?? null, header.justification ?? null, header.prayer ?? null,
          header.beneficiaryName ?? null, header.beneficiaryAccountNumber ?? null,
          header.beneficiaryBankName ?? null, benBank?.id ?? null,
          externalRef,
        ],
      );
      newRequestId = erInsert.rows[0].id;
      this.logger.debug(
        `Historical load row created id=${newRequestId} externalRef=${externalRef} uploadBatch=${batchRef}`,
      );

      // Insert lines
      for (const line of lines) {
        const netLine = subMoney(line.amount, line.whtAmount);
        await client.query(
          `INSERT INTO expense_request_lines
            ("expenseRequestId", description, "accountId", "expenseAccountId", "whtId",
             amount, quantity, "unitPrice", "whtApplicable", "whtRate",
             "whtAmount", "netAmount", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
          [
            newRequestId, line.description, line.accountId, line.whtId,
            line.amount, line.quantity, line.unitPrice,
            line.whtApplicable, line.whtRate, line.whtAmount, netLine,
          ],
        );
      }

      // Post the journal entry — dated to paymentDate (this is the key
      // difference from markAsPaid which always uses NOW()).
      const jeIns = await client.query(
        `INSERT INTO journal_entries
          ("companyId", "entryNumber", "entryDate", reference, narration,
           "totalDebit", "totalCredit", status, "journalType", "sourceType",
           "sourceId", "fiscalYearId", "createdBy", "createdAt", "updatedAt")
         VALUES ($1,$2,$3::date,$4,$5,$6,$6,'posted','payment','expense_request',
                 $7,$8,$9,NOW(),NOW())
         RETURNING id`,
        [
          companyId, jeNumber, paymentDate, pvNumber,
          `Historical payment of ${requestNumber} - ${header.description}`,
          totalAmount, newRequestId, fiscalYearId, userId,
        ],
      );
      const journalEntryId = jeIns.rows[0].id;

      // DR expense accounts (one line per CSV row)
      for (const line of lines) {
        await client.query(
          `INSERT INTO journal_entry_line_items
            ("journalEntryId", "accountId", debit, credit, narration, "createdAt", "updatedAt")
           VALUES ($1,$2,$3,NULL,$4,NOW(),NOW())`,
          [journalEntryId, line.accountId, line.amount, `Expense: ${line.description}`],
        );
      }

      // CR bank (net after WHT)
      await client.query(
        `INSERT INTO journal_entry_line_items
          ("journalEntryId", "accountId", debit, credit, narration, "createdAt", "updatedAt")
         VALUES ($1,$2,NULL,$3,$4,NOW(),NOW())`,
        [journalEntryId, bank.glAccountId, netAmount, `Historical payment via bank: ${pvNumber}`],
      );

      // CR WHT payable if applicable
      if (whtAmount > 0) {
        const whtPayable = await client.query(
          `SELECT id FROM ifrs_accounts
            WHERE "companyId" = $1
              AND (name ILIKE '%withholding tax payable%' OR name ILIKE '%wht payable%')
              AND "deletedAt" IS NULL
            LIMIT 1`,
          [companyId],
        );
        if (whtPayable.rows[0]?.id) {
          await client.query(
            `INSERT INTO journal_entry_line_items
              ("journalEntryId", "accountId", debit, credit, narration, "createdAt", "updatedAt")
             VALUES ($1,$2,NULL,$3,$4,NOW(),NOW())`,
            [whtPayable.rows[0].id, whtAmount, `WHT payable: ${requestNumber}`],
          );
        }
      }

      // Balance check — refuse to commit an unbalanced JE
      const bal = await client.query(
        `SELECT COALESCE(SUM(debit),0) AS d, COALESCE(SUM(credit),0) AS c
           FROM journal_entry_line_items WHERE "journalEntryId" = $1`,
        [journalEntryId],
      );
      const d = parseFloat(bal.rows[0]?.d ?? '0');
      const c = parseFloat(bal.rows[0]?.c ?? '0');
      if (Math.abs(d - c) > 0.01) {
        throw new BadRequestException(
          `Historical JE unbalanced: DR ${d.toFixed(2)} CR ${c.toFixed(2)} — group ${externalRef}`,
        );
      }

      // Link JE back to the request
      await client.query(
        `UPDATE expense_requests SET "journalEntryId" = $1, "updatedAt" = NOW() WHERE id = $2`,
        [journalEntryId, newRequestId],
      );
    }, { isolationLevel: 'SERIALIZABLE' });

    return newRequestId;
  }

  // =========================================================================
  // RESOLVERS — lookups used by both validation + commit
  // =========================================================================

  /**
   * Resolve the requester identifier to a user row by email or name.
   * AssetPro has no employees table — requester is identified by user login email or display name.
   */
  private async resolveEmployeeByEmail(
    companyId: number,
    identifier: string,
  ): Promise<{ id: number; name: string } | null> {
    const needle = identifier.trim();
    if (!needle) return null;
    const row = await this.tenantPrisma.queryOne<{ id: number; name: string }>(
      `SELECT u.id, u.name
         FROM users u
        WHERE u."companyId" = $1
          AND (LOWER(u.email) = LOWER($2) OR LOWER(u.name) = LOWER($2))
        LIMIT 1`,
      [companyId, needle],
    );
    return row ?? null;
  }

  private async resolveAccountByCode(
    companyId: number,
    code: string,
  ): Promise<{ id: number } | null> {
    const row = await this.tenantPrisma.queryOne<{ id: number }>(
      `SELECT id FROM ifrs_accounts
        WHERE "companyId" = $1 AND code = $2 AND "deletedAt" IS NULL
        LIMIT 1`,
      [companyId, code.trim()],
    );
    return row ?? null;
  }

  private async resolveWhtByCode(
    companyId: number,
    code: string,
  ): Promise<{ id: number; rate: number } | null> {
    // Table is `withholding_taxes`, not `wht` (despite the ORM model being
    // named `WithholdingTax`). Matching by `code` is exact; matching by
    // `name` is a fuzzy ILIKE fallback so users can paste "VAT 5%" or
    // similar human strings.
    const row = await this.tenantPrisma.queryOne<{ id: number; rate: number }>(
      `SELECT id, rate FROM withholding_taxes
        WHERE "companyId" = $1 AND (code = $2 OR name ILIKE $2) AND "isActive" = true
        LIMIT 1`,
      [companyId, code.trim()],
    );
    return row ?? null;
  }

  private async resolveBankByCodeOrName(
    companyId: number,
    codeOrName: string,
  ): Promise<{ id: number; glAccountId: number | null; name: string } | null> {
    const needle = codeOrName.trim();
    // The banks table has no `code` column — use `name` (internal label),
    // `bankName` (institution), or `accountNumber` instead.
    const row = await this.tenantPrisma.queryOne<{
      id: number;
      glAccountId: number | null;
      name: string;
    }>(
      `SELECT id, "glAccountId", name FROM banks
        WHERE "companyId" = $1
          AND (name ILIKE $2 OR "bankName" ILIKE $2 OR "accountNumber" = $2)
          AND "deletedAt" IS NULL
        LIMIT 1`,
      [companyId, needle],
    );
    return row ?? null;
  }

  /** Same as resolveBankByCodeOrName but using the active transaction client. */
  private async resolveBankByCodeOrNameWithClient(
    client: { query: (q: string, p: unknown[]) => Promise<{ rows: Array<{ id: number; glAccountId: number | null; name: string }> }> },
    companyId: number,
    codeOrName: string,
  ): Promise<{ id: number; glAccountId: number | null; name: string } | null> {
    const res = await client.query(
      `SELECT id, "glAccountId", name FROM banks
        WHERE "companyId" = $1
          AND (name ILIKE $2 OR "bankName" ILIKE $2 OR "accountNumber" = $2)
          AND "deletedAt" IS NULL
        LIMIT 1`,
      [companyId, codeOrName.trim()],
    );
    return res.rows[0] ?? null;
  }

  private nextSeqNum(lastValue: string | undefined): number | null {
    if (!lastValue) return null;
    const parts = lastValue.split('-');
    const n = parseInt(parts[parts.length - 1], 10);
    return isNaN(n) ? null : n + 1;
  }
}
