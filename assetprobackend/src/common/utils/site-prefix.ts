/**
 * Site-prefix sequential numbering utility.
 *
 * Each deployment site has a unique prefix code (e.g., "CL" for cloud,
 * "HQ" for headquarters, "ABJ" for Abuja branch) set via SITE_PREFIX_CODE
 * in the environment. This ensures document numbers are globally unique
 * across all on-premise and cloud instances without coordination.
 *
 * Format: {ENTITY_PREFIX}-{SITE_CODE}-{SEQUENCE}
 * Example: INV-HQ-00001
 */

/** Known entity prefixes for document numbering */
export const ENTITY_PREFIXES = {
  INVOICE: 'INV',
  PURCHASE_ORDER: 'PO',
  JOURNAL_ENTRY: 'JE',
  PAYMENT: 'PMT',
  RECEIPT: 'RCT',
  STOCK_MOVEMENT: 'STK',
  PAYROLL_RUN: 'PAY',
  SALES_ORDER: 'SO',
  EXPENSE_REQUEST: 'EXP',
  BANK_TRANSFER: 'BT',
  CREDIT_NOTE: 'CN',
  DEBIT_NOTE: 'DN',
  DELIVERY_NOTE: 'DLV',
  QUOTATION: 'QT',
  POS_TRANSACTION: 'POS',
  WORK_ORDER: 'WO',
  BILL_OF_MATERIALS: 'BOM',
} as const;

export type EntityPrefix =
  (typeof ENTITY_PREFIXES)[keyof typeof ENTITY_PREFIXES];

/**
 * Generate a site-prefixed document number.
 *
 * @param entityPrefix - The entity type prefix (e.g., "INV", "PO", "JE")
 * @param siteCode    - The site prefix code from SITE_PREFIX_CODE env var
 * @param sequence    - The numeric sequence value
 * @param padLength   - Zero-pad length for the sequence (default: 5)
 * @returns Formatted number like "INV-HQ-00001"
 */
export function generateSiteNumber(
  entityPrefix: string,
  siteCode: string,
  sequence: number,
  padLength = 5,
): string {
  const paddedSequence = String(sequence).padStart(padLength, '0');
  return `${entityPrefix}-${siteCode}-${paddedSequence}`;
}

/**
 * Parse a site-prefixed document number back into its components.
 *
 * @param number - The formatted number (e.g., "INV-HQ-00001")
 * @returns Parsed components or null if format is invalid
 */
export function parseSiteNumber(
  number: string,
): { entityPrefix: string; siteCode: string; sequence: number } | null {
  const parts = number.split('-');
  if (parts.length !== 3) return null;

  const [entityPrefix, siteCode, sequenceStr] = parts;
  const sequence = parseInt(sequenceStr, 10);

  if (isNaN(sequence)) return null;

  return { entityPrefix, siteCode, sequence };
}

/**
 * Extract the site code from a document number.
 *
 * @param number - The formatted number (e.g., "INV-HQ-00001")
 * @returns The site code (e.g., "HQ") or null if invalid
 */
export function extractSiteCode(number: string): string | null {
  const parsed = parseSiteNumber(number);
  return parsed?.siteCode ?? null;
}
