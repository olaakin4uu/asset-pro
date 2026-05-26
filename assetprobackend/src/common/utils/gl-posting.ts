import { BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../services/tenant-prisma.service';
import { toMoney } from './decimal';

const logger = new Logger('GLPosting');

// ============================================================================
// TYPES
// ============================================================================

export interface GLPostingLine {
  accountId: number;
  debit: number;
  credit: number;
  narration?: string;
  /** Foreign currency fields — for multi-currency transactions */
  foreignDebit?: number;
  foreignCredit?: number;
  currencyCode?: string;
  exchangeRate?: number;
}

export interface GLPostingRequest {
  companyId: number;
  entryDate: Date;
  reference: string;
  narration: string;
  sourceType: string;       // e.g. 'sales_invoice', 'receipt', 'expense_request'
  sourceId: number;         // ID of the source document
  journalType?: string;     // 'general', 'sales', 'purchase', etc.
  lines: GLPostingLine[];
  /** If true, skip posting and return null (for optional GL postings) */
  optional?: boolean;
  /** Override fiscal year ID if known */
  fiscalYearId?: number;
}

export interface GLPostingResult {
  journalEntryId: number;
  entryNumber: string;
}

// ============================================================================
// MAIN POSTING FUNCTION
// ============================================================================

/**
 * Post a journal entry to the GL with full validation, atomicity, and controls.
 *
 * Validates:
 * - Debits = Credits (balanced entry)
 * - No zero-amount entries
 * - All GL accounts exist, are active, and are posting-enabled
 * - Fiscal period is open and not locked
 * - No duplicate posting (idempotency via sourceType + sourceId)
 *
 * Wraps everything in a SERIALIZABLE transaction.
 *
 * @throws BadRequestException if any validation fails
 * @returns GLPostingResult with journal entry ID and number, or null if optional and skipped
 */
export async function postToGL(
  tenantPrisma: TenantPrismaService,
  request: GLPostingRequest,
): Promise<GLPostingResult | null> {
  const { companyId, entryDate, reference, narration, sourceType, sourceId, lines } = request;

  // ── 1. Zero-amount rejection ──
  if (lines.length === 0) {
    if (request.optional) return null;
    throw new BadRequestException('GL posting requires at least one line item');
  }

  const totalDebit = toMoney(lines.reduce((s, l) => s + (l.debit || 0), 0));
  const totalCredit = toMoney(lines.reduce((s, l) => s + (l.credit || 0), 0));

  if (totalDebit <= 0 && totalCredit <= 0) {
    if (request.optional) {
      logger.debug(`GL posting skipped for ${sourceType}:${sourceId} — zero amount`);
      return null;
    }
    throw new BadRequestException('GL posting rejected: total amount is zero');
  }

  // ── 2. Balance validation ──
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new BadRequestException(
      `GL posting unbalanced: debits (${totalDebit}) ≠ credits (${totalCredit}). Difference: ${Math.abs(totalDebit - totalCredit)}`,
    );
  }

  // Filter out zero lines
  const validLines = lines.filter(l => (l.debit || 0) > 0 || (l.credit || 0) > 0);
  if (validLines.length === 0) {
    if (request.optional) return null;
    throw new BadRequestException('GL posting rejected: all lines have zero amounts');
  }

  // ── 3. Idempotency check ──
  const existingEntry = await tenantPrisma.queryOne<{ id: number; entryNumber: string }>(
    `SELECT id, "entryNumber" FROM journal_entries
     WHERE "sourceType" = $1 AND "sourceId" = $2 AND "companyId" = $3
     AND status NOT IN ('reversed', 'voided')      LIMIT 1`,
    [sourceType, sourceId, companyId],
  );
  if (existingEntry) {
    logger.warn(`GL posting skipped: ${sourceType}:${sourceId} already posted as ${existingEntry.entryNumber}`);
    return { journalEntryId: existingEntry.id, entryNumber: existingEntry.entryNumber };
  }

  // ── 4. GL account validation ──
  const accountIds = [...new Set(validLines.map(l => l.accountId))];
  const accounts = await tenantPrisma.query<{ id: number; code: string; name: string; isActive: boolean; isPosting: boolean }>(
    `SELECT id, code, name, "isActive", "isPosting" FROM ifrs_accounts WHERE id = ANY($1::int[]) AND ("deletedAt" IS NULL OR "deletedAt" IS NOT NULL AND FALSE)`,
    [accountIds],
  );

  const accountMap = new Map(accounts.map(a => [a.id, a]));
  for (const line of validLines) {
    const acct = accountMap.get(line.accountId);
    if (!acct) {
      throw new BadRequestException(`GL account ID ${line.accountId} does not exist`);
    }
    if (!acct.isActive) {
      throw new BadRequestException(`GL account ${acct.code} (${acct.name}) is inactive`);
    }
    if (!acct.isPosting) {
      throw new BadRequestException(`GL account ${acct.code} (${acct.name}) is a header account and cannot be posted to`);
    }
  }

  // ── 5. Fiscal period validation ──
  const entryDateStr = entryDate.toISOString().split('T')[0];

  // Check fiscal year
  const fiscalYear = await tenantPrisma.queryOne<{ id: number; status: string }>(
    `SELECT id, status FROM fiscal_years
     WHERE "companyId" = $1 AND "startDate" <= $2::date AND "endDate" >= $2::date      LIMIT 1`,
    [companyId, entryDateStr],
  );
  if (fiscalYear && fiscalYear.status.toUpperCase() !== 'OPEN') {
    throw new BadRequestException(`Cannot post to fiscal year: status is ${fiscalYear.status}. Only OPEN fiscal years accept postings.`);
  }

  // Check period lock
  const periodLock = await tenantPrisma.queryOne<{ id: number }>(
    `SELECT id FROM period_locks
     WHERE "companyId" = $1 AND "year" = EXTRACT(YEAR FROM $2::date)::int
     AND "period" = EXTRACT(MONTH FROM $2::date)::int AND "isLocked" = true`,
    [companyId, entryDateStr],
  );
  if (periodLock) {
    const month = entryDate.toLocaleString('en', { month: 'long', year: 'numeric' });
    throw new BadRequestException(`Cannot post to ${month}: period is locked`);
  }

  // ── 6. Post within SERIALIZABLE transaction ──
  let result: GLPostingResult | null = null;

  await tenantPrisma.transaction(async (client) => {
    // Generate entry number
    const seq = await client.query(
      `SELECT MAX(SUBSTRING("entryNumber" FROM '([0-9]+)$')::int) as max_num FROM journal_entries WHERE "companyId" = $1`,
      [companyId],
    );
    const nextNum = (parseInt(seq.rows[0]?.max_num || '0', 10) + 1).toString().padStart(5, '0');
    const entryNumber = `JE-${entryDate.getFullYear()}-${nextNum}`;

    // Insert journal entry
    const jeResult = await client.query(
      `INSERT INTO journal_entries ("companyId", "entryNumber", "entryDate", reference, narration, "totalDebit", "totalCredit", status, "journalType", "sourceType", "sourceId", "fiscalYearId", "postedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'posted', $8, $9, $10, $11, NOW(), NOW(), NOW())
       RETURNING id`,
      [companyId, entryNumber, entryDate, reference, narration, totalDebit, totalCredit,
       request.journalType || 'general', sourceType, sourceId, fiscalYear?.id || request.fiscalYearId || null],
    );
    const journalEntryId = jeResult.rows[0].id;

    // Insert line items
    for (const line of validLines) {
      await client.query(
        `INSERT INTO journal_entry_line_items ("journalEntryId", "accountId", debit, credit, narration, "foreignDebit", "foreignCredit", "currencyCode", "exchangeRate", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [journalEntryId, line.accountId, toMoney(line.debit || 0), toMoney(line.credit || 0), line.narration || narration,
         line.foreignDebit ? toMoney(line.foreignDebit) : null, line.foreignCredit ? toMoney(line.foreignCredit) : null,
         line.currencyCode || null, line.exchangeRate || null],
      );
    }

    result = { journalEntryId, entryNumber };

    logger.log(`GL posted: ${entryNumber} | ${sourceType}:${sourceId} | DR ${totalDebit} / CR ${totalCredit} | ${validLines.length} lines`);
  }, { isolationLevel: 'SERIALIZABLE' });

  return result;
}

// ============================================================================
// HELPER: Resolve GL account by multiple strategies
// ============================================================================

/**
 * Find a GL account by category mapping, code pattern, or name search.
 * Returns the account ID or null.
 */
export async function resolveGLAccount(
  tenantPrisma: TenantPrismaService,
  companyId: number,
  options: {
    /** Category GL mapping key (e.g. 'inventory_gl_account_id') */
    categoryMappingKey?: string;
    /** Item ID to look up category mapping */
    itemId?: number;
    /** Account code pattern (e.g. '109000') */
    codePattern?: string;
    /** Account name search (e.g. 'inventory') */
    nameSearch?: string;
    /** Fallback: settings key from company_settings or sales_settings */
    settingsKey?: string;
    settingsTable?: string;
  },
): Promise<number | null> {
  // Strategy 1: Category GL mapping
  if (options.categoryMappingKey && options.itemId) {
    const cat = await tenantPrisma.queryOne<{ glAccountMappings: Record<string, number> | null }>(
      `SELECT c."glAccountMappings" FROM inv_items i JOIN inv_item_categories c ON i."categoryId" = c.id WHERE i.id = $1`,
      [options.itemId],
    );
    const mappings = cat?.glAccountMappings || {};
    if (mappings[options.categoryMappingKey]) return mappings[options.categoryMappingKey];
  }

  // Strategy 2: Settings table
  if (options.settingsKey && options.settingsTable) {
    const setting = await tenantPrisma.queryOne<Record<string, unknown>>(
      `SELECT "${options.settingsKey}" FROM ${options.settingsTable} WHERE "companyId" = $1 LIMIT 1`,
      [companyId],
    );
    if (setting && setting[options.settingsKey]) return Number(setting[options.settingsKey]);
  }

  // Strategy 3: Code pattern
  if (options.codePattern) {
    const acct = await tenantPrisma.queryOne<{ id: number }>(
      `SELECT id FROM ifrs_accounts WHERE code LIKE $1 AND "companyId" = $2 AND "isActive" = true AND ("deletedAt" IS NULL OR "deletedAt" IS NOT NULL AND FALSE) LIMIT 1`,
      [`%${options.codePattern}%`, companyId],
    );
    if (acct) return acct.id;
  }

  // Strategy 4: Name search
  if (options.nameSearch) {
    const acct = await tenantPrisma.queryOne<{ id: number }>(
      `SELECT id FROM ifrs_accounts WHERE LOWER(name) LIKE $1 AND "companyId" = $2 AND "isActive" = true AND ("deletedAt" IS NULL OR "deletedAt" IS NOT NULL AND FALSE) LIMIT 1`,
      [`%${options.nameSearch.toLowerCase()}%`, companyId],
    );
    if (acct) return acct.id;
  }

  return null;
}
