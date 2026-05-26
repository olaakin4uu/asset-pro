/**
 * Exchange Rate Utility
 *
 * Provides helpers to:
 * 1. Look up the current exchange rate between two currencies from the DB
 * 2. Convert an amount from one currency to another for reporting
 *
 * Exchange rates are stored in `ifrs_exchange_rates`:
 *   fromCurrencyId → toCurrencyId, rate, validFrom, validTo
 *
 * For reporting: amounts in a foreign-currency bank are converted to the
 * company (reporting) currency using the rate valid on the transaction date.
 */

import { TenantPrismaService } from '../services/tenant-prisma.service';
import { toMoney } from './decimal';

export interface ExchangeRateRow {
  rate: number;
  validFrom: string;
  validTo: string | null;
}

/**
 * Look up the exchange rate between two currency codes on a given date.
 * Returns the most recent rate where validFrom <= transactionDate.
 * Falls back to 1 when currencies are the same or no rate is found.
 */
export async function getExchangeRate(
  tenantPrisma: TenantPrismaService,
  fromCurrencyCode: string,
  toCurrencyCode: string,
  onDate: string | Date,
): Promise<number> {
  if (fromCurrencyCode === toCurrencyCode) return 1;

  const dateStr = typeof onDate === 'string' ? onDate.slice(0, 10) : onDate.toISOString().slice(0, 10);

  const row = await tenantPrisma.queryOne<{ rate: string }>(
    `SELECT er.rate
     FROM ifrs_exchange_rates er
     JOIN ifrs_currencies fc ON fc.id = er."fromCurrencyId"
     JOIN ifrs_currencies tc ON tc.id = er."toCurrencyId"
     WHERE fc.code = $1
       AND tc.code = $2
       AND er."validFrom" <= $3
       AND (er."validTo" IS NULL OR er."validTo" >= $3)
     ORDER BY er."validFrom" DESC
     LIMIT 1`,
    [fromCurrencyCode, toCurrencyCode, dateStr],
  );

  if (row) return toMoney(row.rate);

  // Try inverse rate
  const inverseRow = await tenantPrisma.queryOne<{ rate: string }>(
    `SELECT er.rate
     FROM ifrs_exchange_rates er
     JOIN ifrs_currencies fc ON fc.id = er."fromCurrencyId"
     JOIN ifrs_currencies tc ON tc.id = er."toCurrencyId"
     WHERE fc.code = $1
       AND tc.code = $2
       AND er."validFrom" <= $3
       AND (er."validTo" IS NULL OR er."validTo" >= $3)
     ORDER BY er."validFrom" DESC
     LIMIT 1`,
    [toCurrencyCode, fromCurrencyCode, dateStr],
  );

  if (inverseRow && Number(inverseRow.rate) !== 0) {
    return toMoney(1 / Number(inverseRow.rate));
  }

  return 1; // no rate found — return 1 (no conversion)
}

/**
 * Convert an amount from a foreign currency to the reporting (company) currency.
 * Uses the exchange rate valid on the given date.
 *
 * Example:
 *   convertToReportingCurrency(tenantPrisma, 1000, 'USD', 'NGN', '2025-01-15')
 *   → 1,620,000 (at rate of 1620)
 */
export async function convertToReportingCurrency(
  tenantPrisma: TenantPrismaService,
  amount: number,
  fromCurrencyCode: string,
  reportingCurrencyCode: string,
  onDate: string | Date,
): Promise<number> {
  if (fromCurrencyCode === reportingCurrencyCode) return toMoney(amount);
  const rate = await getExchangeRate(tenantPrisma, fromCurrencyCode, reportingCurrencyCode, onDate);
  return toMoney(amount * rate);
}
