'use client';

import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

type ModuleKey = 'sales' | 'purchase' | 'inventory' | 'budget';

interface SettingsCache {
  data: Record<string, unknown>;
  timestamp: number;
}

interface SettingsStoreState {
  /** Cached settings per module */
  cache: Partial<Record<ModuleKey, SettingsCache>>;

  /** Get cached settings for a module (returns null if stale or missing) */
  getCached: <T>(module: ModuleKey, maxAgeMs?: number) => T | null;

  /** Store settings for a module */
  setSettings: (module: ModuleKey, data: Record<string, unknown>) => void;

  /** Invalidate a specific module's cache */
  invalidate: (module: ModuleKey) => void;

  /** Invalidate all caches */
  invalidateAll: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default cache TTL: 5 minutes */
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

// ============================================================================
// STORE
// ============================================================================

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  cache: {},

  getCached: <T>(module: ModuleKey, maxAgeMs: number = DEFAULT_MAX_AGE_MS): T | null => {
    const entry = get().cache[module];
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > maxAgeMs) return null;

    return entry.data as T;
  },

  setSettings: (module, data) => {
    set((state) => ({
      cache: {
        ...state.cache,
        [module]: { data, timestamp: Date.now() },
      },
    }));
  },

  invalidate: (module) => {
    set((state) => {
      const newCache = { ...state.cache };
      delete newCache[module];
      return { cache: newCache };
    });
  },

  invalidateAll: () => {
    set({ cache: {} });
  },
}));
