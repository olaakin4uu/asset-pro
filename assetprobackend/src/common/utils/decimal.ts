import Decimal from 'decimal.js';

/**
 * Safely convert a database value (string, number, Decimal, null) to a JS number
 * using arbitrary-precision decimal arithmetic to avoid floating-point errors.
 *
 * @param value - Raw value from database (typically string from PostgreSQL numeric/decimal columns)
 * @param decimalPlaces - Number of decimal places to round to (default: 2 for monetary values)
 * @returns A JavaScript number rounded to the specified precision
 */
export function toMoney(value: string | number | null | undefined, decimalPlaces = 2): number {
  if (value == null || value === '') return 0;
  return new Decimal(value).toDecimalPlaces(decimalPlaces).toNumber();
}

/**
 * Add two monetary values with precision.
 */
export function addMoney(a: number, b: number): number {
  return new Decimal(a).plus(new Decimal(b)).toDecimalPlaces(2).toNumber();
}

/**
 * Subtract two monetary values with precision.
 */
export function subMoney(a: number, b: number): number {
  return new Decimal(a).minus(new Decimal(b)).toDecimalPlaces(2).toNumber();
}

/**
 * Multiply a monetary value by a rate/factor with precision.
 */
export function mulMoney(amount: number, factor: number, decimalPlaces = 2): number {
  return new Decimal(amount).times(new Decimal(factor)).toDecimalPlaces(decimalPlaces).toNumber();
}

/**
 * Convert a calculated ratio (e.g., currentRatio, profitMargin) to a fixed-precision number.
 * Ratios are NOT monetary — they represent percentages or multipliers.
 */
export function toRatio(value: number, decimalPlaces = 2): number {
  return new Decimal(value).toDecimalPlaces(decimalPlaces).toNumber();
}

/**
 * Safely convert a database quantity value (string from PostgreSQL) to a JS number.
 * Quantities may have varying decimal places (e.g., 1.5 kg, 100 pieces).
 */
export function toQuantity(value: string | number | null | undefined, decimalPlaces = 4): number {
  if (value == null || value === '') return 0;
  return new Decimal(value).toDecimalPlaces(decimalPlaces).toNumber();
}
