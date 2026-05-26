export const locales = ['en', 'yo', 'ha', 'ig'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'assetpro_locale';

export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}
