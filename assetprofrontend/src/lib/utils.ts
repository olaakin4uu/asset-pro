import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** API origin for resolving relative upload paths (e.g. /uploads/...) */
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(/\/api\/v1$/, '');

/** Resolve a relative upload path to a full URL using the API origin */
export function resolveUploadUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Utility function to merge Tailwind CSS classes
 * Uses clsx for conditional classes and tailwind-merge to handle conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a localized string
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return formatDate(d);
}

/**
 * Format a number as currency.
 *
 * In React components, prefer `useCurrencyFormat()` from `@/hooks` which
 * automatically reads the company context. This standalone function is
 * for non-component code or when you already have the currency code.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'NGN',
  locale?: string
): string {
  const LOCALE_MAP: Record<string, string> = {
    NGN: 'en-NG', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB',
    JPY: 'ja-JP', CNY: 'zh-CN', INR: 'en-IN', KES: 'en-KE',
    GHS: 'en-GH', ZAR: 'en-ZA', CAD: 'en-CA', AUD: 'en-AU',
  };
  const resolvedLocale = locale || LOCALE_MAP[currency] || 'en-US';
  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

/**
 * Format a number with commas and 2 decimal places for monetary display.
 * Use this everywhere amounts/prices/costs are rendered.
 * Handles string values from Prisma Decimal fields.
 *
 * @example formatMoney(1250000)   → "1,250,000.00"
 * @example formatMoney(null)      → "0.00"
 * @example formatMoney("42.5")   → "42.50"
 */
export function formatMoney(value: number | string | null | undefined): string {
  return Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a quantity with commas (no forced decimal places).
 * Handles string values from Prisma Decimal fields.
 *
 * @example formatQuantity(15000)    → "15,000"
 * @example formatQuantity(1500.5)   → "1,500.5"
 * @example formatQuantity(null)     → "0"
 */
export function formatQuantity(value: number | string | null | undefined): string {
  return Number(value ?? 0).toLocaleString();
}

/**
 * Format a percentage value with 1 decimal place.
 *
 * @example formatPercent(85.123)  → "85.1%"
 * @example formatPercent(null)    → "0.0%"
 */
export function formatPercent(value: number | string | null | undefined, decimals = 1): string {
  return `${Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Debounce a function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format a raw egg count as "28 crates + 3" (Nigerian standard = 30 eggs/crate).
 * Returns "12 eggs" for counts smaller than one crate so the farmer doesn't see
 * "0 crates + 12" for a small collection.
 */
export function formatEggsAsCrates(eggs: number | null | undefined): string {
  const total = Number(eggs ?? 0);
  if (!Number.isFinite(total) || total <= 0) return '0';
  if (total < 30) return `${total.toLocaleString()} eggs`;
  const crates = Math.floor(total / 30);
  const loose = total % 30;
  return loose === 0
    ? `${crates.toLocaleString()} crates`
    : `${crates.toLocaleString()} crates + ${loose}`;
}

/**
 * Safely extract an error message string from an axios error.
 * Handles cases where the backend returns nested objects in the message field.
 */
export function extractErrorMessage(err: unknown, fallback: string = 'An error occurred'): string {
  if (typeof err === 'string') return err;
  const axiosErr = err as {
    response?: { data?: { message?: string | string[] | { message?: string; error?: string } }; status?: number };
    message?: string;
    code?: string;
  };
  const message = axiosErr?.response?.data?.message;

  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.filter((m: unknown) => typeof m === 'string').join(', ') || fallback;
  if (typeof message === 'object' && message !== null) {
    // Handle nested {statusCode, message, error} from backend filter
    if (typeof message.message === 'string') return message.message;
    if (typeof message.error === 'string') return message.error;
  }
  // Surface network errors, timeouts, connection refused etc.
  if (axiosErr?.code === 'ECONNABORTED') return 'Request timed out — backend may be restarting, please retry';
  if (axiosErr?.code === 'ERR_NETWORK' || axiosErr?.message === 'Network Error') return 'Network error — cannot reach server, please retry';
  if (axiosErr?.message) return axiosErr.message;
  return fallback;
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, or empty object)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}
