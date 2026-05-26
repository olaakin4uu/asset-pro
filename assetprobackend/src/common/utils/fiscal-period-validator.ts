import { BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../services/tenant-prisma.service';

/**
 * Guardrails for posting-date / void-date inputs.
 *
 * Accounting rule: any ledger-impacting entry (receipt, invoice, void,
 * reversal, journal entry) must land in an OPEN fiscal year. Closed
 * years are frozen — changing them retroactively would invalidate
 * already-published financial statements, tax returns, and audit
 * sign-offs.
 *
 * This helper is called from every void/reverse/cancel flow that posts
 * a reversing journal entry. If the user picks a date that falls inside
 * a closed fiscal year, they get a clear error telling them to either
 * pick a date in an open year, or re-open the year first (which is a
 * separate manual admin action — we don't automate period re-open).
 *
 * Status values on `fiscal_years.status`:
 *   open            — writes freely allowed
 *   adjusting       — still open for period-close adjustments (allowed)
 *   pending_close   — close has been requested but not approved (allowed;
 *                     last chance to post)
 *   closed          — frozen; no writes
 */

export interface OpenPeriodCheckResult {
  ok: true;
  fiscalYearId: number;
  fiscalYearName: string;
  fiscalYearStatus: string;
}

const OPEN_STATUSES = new Set(['open', 'adjusting', 'pending_close']);

/**
 * Validate that a date falls within an open fiscal year for a company.
 * Throws BadRequestException with a helpful message if the date lands
 * in a closed year or outside any defined fiscal year.
 *
 * `action` is a short verb used in the error message ("void", "reverse",
 * "post") so the user sees exactly what's being blocked.
 */
export async function validateDateInOpenPeriod(
  tenantPrisma: TenantPrismaService,
  companyId: number,
  date: Date | string,
  action: string = 'post',
): Promise<OpenPeriodCheckResult> {
  const dateStr = typeof date === 'string' ? date : date.toISOString().slice(0, 10);

  // Find the fiscal year whose [startDate, endDate] contains this date.
  const year = await tenantPrisma.queryOne<{
    id: number; name: string; status: string; startDate: string; endDate: string;
  }>(
    `SELECT id, name, status, "startDate", "endDate"
       FROM fiscal_years
      WHERE "companyId" = $1
        AND "startDate" <= $2::date
        AND "endDate"   >= $2::date
      LIMIT 1`,
    [companyId, dateStr],
  );

  if (!year) {
    throw new BadRequestException(
      `Cannot ${action} on ${dateStr}: no fiscal year defined for that date. ` +
      `Create a fiscal year covering ${dateStr} (Accounts → Fiscal Years) first.`,
    );
  }

  if (!OPEN_STATUSES.has(year.status)) {
    throw new BadRequestException(
      `Cannot ${action} on ${dateStr}: fiscal year "${year.name}" is ${year.status}. ` +
      `Re-open the fiscal year (Accounts → Fiscal Years → Re-open) or pick a date in an open year.`,
    );
  }

  return { ok: true, fiscalYearId: year.id, fiscalYearName: year.name, fiscalYearStatus: year.status };
}

/**
 * Guard: accounting date for a void/reversal must NOT be earlier than the
 * original record's date. You can void on the same day or any later open
 * date, but never before the event happened — otherwise the running
 * balance is wrong in the period BETWEEN the original and the (backdated)
 * void, and the audit trail becomes nonsense.
 *
 * Accepts same date as original (common case — voiding a same-day duplicate).
 */
export function assertVoidDateOnOrAfterOriginal(
  originalDate: Date | string,
  voidDate: string,
  action: string = 'void',
): void {
  const origStr = typeof originalDate === 'string'
    ? originalDate.slice(0, 10)
    : originalDate.toISOString().slice(0, 10);
  if (voidDate < origStr) {
    throw new BadRequestException(
      `Cannot ${action} on ${voidDate}: earlier than the original transaction date (${origStr}). ` +
      `Pick ${origStr} or a later date.`,
    );
  }
}

/**
 * Default void/reversal date picker used across services. Returns:
 *   - `originalDate` if that date's fiscal year is still open
 *   - today's date otherwise (next best — lands in current open period)
 *
 * Lets the frontend pre-populate the date picker with a sensible default,
 * and lets backend fall back when no date is supplied.
 */
export async function resolveDefaultVoidDate(
  tenantPrisma: TenantPrismaService,
  companyId: number,
  originalDate: Date | string,
): Promise<string> {
  const origStr = typeof originalDate === 'string'
    ? originalDate.slice(0, 10)
    : originalDate.toISOString().slice(0, 10);

  // Is the original's year still open?
  const origYear = await tenantPrisma.queryOne<{ status: string }>(
    `SELECT status FROM fiscal_years
      WHERE "companyId" = $1 AND "startDate" <= $2::date AND "endDate" >= $2::date
      LIMIT 1`,
    [companyId, origStr],
  );

  if (origYear && OPEN_STATUSES.has(origYear.status)) {
    return origStr;
  }
  return new Date().toISOString().slice(0, 10);
}
