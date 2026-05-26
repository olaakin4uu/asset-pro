'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCompanyContextStore } from '@/stores/company-context';

// ============================================================================
// CURRENCY SYMBOL MAP
// ============================================================================

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  KES: 'KSh',
  GHS: 'GH₵',
  ZAR: 'R',
  CAD: 'CA$',
  AUD: 'A$',
  BRL: 'R$',
  AED: 'د.إ',
  SAR: '﷼',
  EGP: 'E£',
  XOF: 'CFA',
  XAF: 'FCFA',
  TZS: 'TSh',
  UGX: 'USh',
  RWF: 'RF',
  ETB: 'Br',
  MAD: 'MAD',
  TND: 'DT',
  BWP: 'P',
  MUR: '₨',
  ZMW: 'ZK',
  MZN: 'MT',
};

/**
 * Get the symbol for a currency code (non-hook, can be used anywhere).
 * Falls back to the code itself if no symbol is mapped.
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

/**
 * Get the locale for a currency code (for Intl.NumberFormat).
 * Maps common currencies to their typical locale.
 */
function getLocaleForCurrency(currencyCode: string): string {
  const LOCALE_MAP: Record<string, string> = {
    NGN: 'en-NG',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    CNY: 'zh-CN',
    INR: 'en-IN',
    KES: 'en-KE',
    GHS: 'en-GH',
    ZAR: 'en-ZA',
    CAD: 'en-CA',
    AUD: 'en-AU',
    BRL: 'pt-BR',
  };
  return LOCALE_MAP[currencyCode] || 'en-US';
}

// ============================================================================
// HOOK
// ============================================================================

export interface UseCurrencyFormatReturn {
  /** The company's currency code, e.g. "NGN" */
  currency: string;
  /** The currency symbol, e.g. "₦" */
  currencySymbol: string;
  /** Format a number as currency, e.g. "₦1,234.56" */
  formatCurrency: (amount: number) => string;
  /** Format a number with just grouping (no currency symbol), e.g. "1,234.56" */
  formatNumber: (amount: number, decimals?: number) => string;
}

/**
 * Hook that provides currency formatting based on the company context.
 * Use this instead of hardcoded Intl.NumberFormat('en-NG', { currency: 'NGN' }).
 *
 * SSR-safe: uses zustand's getState()/subscribe() instead of the hook,
 * so it won't crash during Next.js static page generation.
 */
export function useCurrencyFormat(): UseCurrencyFormatReturn {
  // SSR-safe: useState provides 'NGN' default during SSR;
  // useEffect reads from zustand store only on the client.
  const [currency, setCurrency] = useState('NGN');

  useEffect(() => {
    const getCurrency = () =>
      useCompanyContextStore.getState().currentCompany?.currency || 'NGN';

    setCurrency(getCurrency());

    const unsubscribe = useCompanyContextStore.subscribe(() => {
      setCurrency(getCurrency());
    });
    return unsubscribe;
  }, []);

  return useMemo(() => {
    const code = currency || 'NGN';
    const locale = getLocaleForCurrency(code);
    const symbol = getCurrencySymbol(code);

    const currencyFormatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
    });

    const numberFormatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return {
      currency: code,
      currencySymbol: symbol,
      formatCurrency: (amount: number) => currencyFormatter.format(amount),
      formatNumber: (amount: number, decimals?: number) => {
        if (decimals !== undefined) {
          return new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }).format(amount);
        }
        return numberFormatter.format(amount);
      },
    };
  }, [currency]);
}
