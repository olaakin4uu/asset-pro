'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';
import { defaultLocale, isLocale, LOCALE_STORAGE_KEY, type Locale } from '@/i18n/config';

import enMessages from '@/messages/en.json';
import yoMessages from '@/messages/yo.json';
import haMessages from '@/messages/ha.json';
import igMessages from '@/messages/ig.json';

// English ships with every build so it's always available as the fallback
// target for any key missing in yo/ha/ig. next-intl's onError hook makes
// the fallback automatic — we just supply English as the reference.
const messagesByLocale: Record<Locale, typeof enMessages> = {
  en: enMessages,
  yo: yoMessages as typeof enMessages,
  ha: haMessages as typeof enMessages,
  ig: igMessages as typeof enMessages,
};

/**
 * Read the user's preferred locale on mount. Source of truth is
 * localStorage (written at login + whenever the user changes it in
 * Profile settings). Pre-hydration we render against English to avoid
 * an SSR/client mismatch.
 */
function readLocaleFromStorage(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(raw) ? raw : defaultLocale;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    setLocale(readLocaleFromStorage());

    // Listen for locale changes dispatched by the language picker in the
    // profile page. That component writes to localStorage then fires this
    // event so the whole tree re-renders with the new messages without a
    // full page reload.
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { locale?: string } | undefined;
      if (isLocale(detail?.locale)) {
        setLocale(detail!.locale as Locale);
      }
    };
    window.addEventListener('assetpro:locale-changed', handler);
    return () => window.removeEventListener('assetpro:locale-changed', handler);
  }, []);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messagesByLocale[locale]}
      // Fallback to English text when a key is missing in the active
      // locale — safer for prod than showing the raw key name.
      onError={() => {}}
      getMessageFallback={({ namespace, key }) => {
        const full = namespace ? `${namespace}.${key}` : key;
        // Walk the English message tree for the same path.
        const parts = full.split('.');
        let node: unknown = enMessages;
        for (const part of parts) {
          if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
            node = (node as Record<string, unknown>)[part];
          } else {
            return full;
          }
        }
        return typeof node === 'string' ? node : full;
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}

/**
 * Small helper for the login flow / language picker to persist the
 * chosen locale and notify the LocaleProvider without a page reload.
 */
export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  window.dispatchEvent(new CustomEvent('assetpro:locale-changed', { detail: { locale } }));
}
