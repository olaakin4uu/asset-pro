'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

export type UrlParamValue = string | number | boolean | null | undefined;

export interface UrlParamConfig<T extends UrlParamValue = UrlParamValue> {
  /** Parameter key in URL */
  key: string;
  /** Default value when param is not present */
  defaultValue?: T;
  /** Parse function to convert string to value */
  parse?: (value: string) => T;
  /** Serialize function to convert value to string */
  serialize?: (value: T) => string;
  /** Remove param from URL when value equals this */
  removeWhen?: T;
}

export interface UseUrlSyncConfig {
  /** Parameter configurations */
  params?: Record<string, UrlParamConfig>;
  /** Use replace instead of push for URL updates */
  replace?: boolean;
  /** Debounce delay for URL updates (ms) */
  debounce?: number;
  /** Scroll to top on URL change */
  scrollToTop?: boolean;
}

export interface UseUrlSyncReturn<T extends Record<string, UrlParamValue>> {
  // State
  values: T;
  isReady: boolean;

  // Actions
  setValue: <K extends keyof T>(key: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  removeValue: (key: keyof T) => void;
  clearAll: () => void;
  reset: () => void;

  // Helpers
  getUrl: (overrides?: Partial<T>) => string;
  hasValue: (key: keyof T) => boolean;
}

// ============================================================================
// SIMPLE SINGLE-VALUE HOOK
// ============================================================================

export interface UseUrlParamConfig<T extends UrlParamValue> {
  /** Parameter key in URL */
  key: string;
  /** Default value when param is not present */
  defaultValue?: T;
  /** Parse function to convert string to value */
  parse?: (value: string) => T;
  /** Serialize function to convert value to string */
  serialize?: (value: T) => string;
  /** Use replace instead of push for URL updates */
  replace?: boolean;
}

export interface UseUrlParamReturn<T extends UrlParamValue> {
  value: T;
  setValue: (value: T) => void;
  clearValue: () => void;
  isDefault: boolean;
}

/**
 * Simple hook for syncing a single value with URL search params
 */
export function useUrlParam<T extends UrlParamValue>(
  config: UseUrlParamConfig<T>
): UseUrlParamReturn<T> {
  const {
    key,
    defaultValue = null as T,
    parse = (v) => v as T,
    serialize = (v) => String(v ?? ''),
    replace = true,
  } = config;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);

  // Get current value from URL
  const urlValue = searchParams.get(key);
  const value = (urlValue != null ? parse(urlValue) : defaultValue) as T;

  // Check if using default
  const isDefault = value === defaultValue || urlValue == null;

  // Set value
  const setValue = useCallback(
    (newValue: T) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newValue == null || newValue === defaultValue || newValue === '') {
        params.delete(key);
      } else {
        params.set(key, serialize(newValue));
      }

      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;

      if (replace) {
        router.replace(url, { scroll: false });
      } else {
        router.push(url, { scroll: false });
      }
    },
    [router, pathname, searchParams, key, defaultValue, serialize, replace]
  );

  // Clear value
  const clearValue = useCallback(() => {
    setValue(defaultValue as T);
  }, [setValue, defaultValue]);

  return {
    value,
    setValue,
    clearValue,
    isDefault,
  };
}

// ============================================================================
// MULTI-VALUE HOOK
// ============================================================================

/**
 * Hook for syncing multiple values with URL search params
 */
export function useUrlSync<T extends Record<string, UrlParamValue>>(
  config: UseUrlSyncConfig = {}
): UseUrlSyncReturn<T> {
  const {
    params = {},
    replace = true,
    debounce = 0,
    scrollToTop = false,
  } = config;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isReady, setIsReady] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Parse current URL values
  const values = Object.entries(params).reduce((acc, [key, paramConfig]) => {
    const urlValue = searchParams.get(paramConfig.key);

    if (urlValue != null) {
      const parse = paramConfig.parse ?? ((v: string) => v);
      acc[key as keyof T] = parse(urlValue) as T[keyof T];
    } else if (paramConfig.defaultValue !== undefined) {
      acc[key as keyof T] = paramConfig.defaultValue as T[keyof T];
    }

    return acc;
  }, {} as T);

  // Mark ready after first render
  useEffect(() => {
    setIsReady(true);
  }, []);

  // Update URL with new values
  const updateUrl = useCallback(
    (newValues: Partial<T>) => {
      const update = () => {
        const newParams = new URLSearchParams(searchParams.toString());

        Object.entries(newValues).forEach(([key, value]) => {
          const paramConfig = params[key];
          if (!paramConfig) return;

          const serialize = paramConfig.serialize ?? ((v: UrlParamValue) => String(v ?? ''));
          const removeWhen = paramConfig.removeWhen;

          if (value == null || value === '' || value === removeWhen) {
            newParams.delete(paramConfig.key);
          } else {
            newParams.set(paramConfig.key, serialize(value));
          }
        });

        const queryString = newParams.toString();
        const url = queryString ? `${pathname}?${queryString}` : pathname;

        if (replace) {
          router.replace(url, { scroll: scrollToTop });
        } else {
          router.push(url, { scroll: scrollToTop });
        }
      };

      if (debounce > 0) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(update, debounce);
      } else {
        update();
      }
    },
    [router, pathname, searchParams, params, replace, scrollToTop, debounce]
  );

  // Set single value
  const setValue = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      updateUrl({ [key]: value } as unknown as Partial<T>);
    },
    [updateUrl]
  );

  // Set multiple values
  const setValues = useCallback(
    (newValues: Partial<T>) => {
      updateUrl(newValues);
    },
    [updateUrl]
  );

  // Remove single value
  const removeValue = useCallback(
    (key: keyof T) => {
      const paramConfig = params[key as string];
      if (!paramConfig) return;

      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete(paramConfig.key);

      const queryString = newParams.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;

      if (replace) {
        router.replace(url, { scroll: false });
      } else {
        router.push(url, { scroll: false });
      }
    },
    [router, pathname, searchParams, params, replace]
  );

  // Clear all values
  const clearAll = useCallback(() => {
    const url = pathname;
    if (replace) {
      router.replace(url, { scroll: false });
    } else {
      router.push(url, { scroll: false });
    }
  }, [router, pathname, replace]);

  // Reset to defaults
  const reset = useCallback(() => {
    const defaults = Object.entries(params).reduce((acc, [key, paramConfig]) => {
      if (paramConfig.defaultValue !== undefined) {
        acc[key as keyof T] = paramConfig.defaultValue as T[keyof T];
      }
      return acc;
    }, {} as Partial<T>);

    clearAll();
  }, [params, clearAll]);

  // Get URL with optional overrides
  const getUrl = useCallback(
    (overrides?: Partial<T>): string => {
      const newParams = new URLSearchParams();
      const mergedValues = { ...values, ...overrides };

      Object.entries(mergedValues).forEach(([key, value]) => {
        const paramConfig = params[key];
        if (!paramConfig) return;

        const serialize = paramConfig.serialize ?? ((v: UrlParamValue) => String(v ?? ''));
        const removeWhen = paramConfig.removeWhen;

        if (value != null && value !== '' && value !== removeWhen) {
          newParams.set(paramConfig.key, serialize(value));
        }
      });

      const queryString = newParams.toString();
      return queryString ? `${pathname}?${queryString}` : pathname;
    },
    [pathname, params, values]
  );

  // Check if value exists
  const hasValue = useCallback(
    (key: keyof T): boolean => {
      const paramConfig = params[key as string];
      if (!paramConfig) return false;
      return searchParams.has(paramConfig.key);
    },
    [searchParams, params]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    values,
    isReady,
    setValue,
    setValues,
    removeValue,
    clearAll,
    reset,
    getUrl,
    hasValue,
  };
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Sync selected ID with URL
 */
export function useUrlSelectedId(
  key = 'id',
  options: { replace?: boolean } = {}
): UseUrlParamReturn<string | null> {
  return useUrlParam<string | null>({
    key,
    defaultValue: null,
    parse: (v) => v,
    serialize: (v) => v ?? '',
    replace: options.replace ?? true,
  });
}

/**
 * Sync page number with URL
 */
export function useUrlPage(
  key = 'page',
  options: { replace?: boolean; defaultPage?: number } = {}
): UseUrlParamReturn<number> {
  return useUrlParam<number>({
    key,
    defaultValue: options.defaultPage ?? 1,
    parse: (v) => parseInt(v, 10) || 1,
    serialize: (v) => String(v),
    replace: options.replace ?? true,
  });
}

/**
 * Sync search query with URL
 */
export function useUrlSearch(
  key = 'q',
  options: { replace?: boolean; debounce?: number } = {}
): UseUrlParamReturn<string> {
  return useUrlParam<string>({
    key,
    defaultValue: '',
    parse: (v) => v,
    serialize: (v) => v,
    replace: options.replace ?? true,
  });
}
