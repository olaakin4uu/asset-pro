'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

interface AccountsState {
  // State
  activeFiscalYearId: number | null;
  activeCurrency: string;
  recentAccountIds: number[];

  // Actions
  setActiveFiscalYear: (id: number) => void;
  setActiveCurrency: (code: string) => void;
  addRecentAccount: (id: number) => void;
  clear: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_RECENT_ITEMS = 10;
const DEFAULT_CURRENCY = 'NGN';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Add an ID to the front of a recent-IDs list, deduplicating and capping at max.
 */
function pushRecent(ids: number[], id: number): number[] {
  const filtered = ids.filter((existing) => existing !== id);
  return [id, ...filtered].slice(0, MAX_RECENT_ITEMS);
}

// ============================================================================
// STORE
// ============================================================================

export const useAccountsStore = create<AccountsState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeFiscalYearId: null,
      activeCurrency: DEFAULT_CURRENCY,
      recentAccountIds: [],

      // Actions
      setActiveFiscalYear: (id: number) => {
        set({ activeFiscalYearId: id });
      },

      setActiveCurrency: (code: string) => {
        set({ activeCurrency: code });
      },

      addRecentAccount: (id: number) => {
        set({ recentAccountIds: pushRecent(get().recentAccountIds, id) });
      },

      clear: () => {
        set({
          activeFiscalYearId: null,
          activeCurrency: DEFAULT_CURRENCY,
          recentAccountIds: [],
        });
      },
    }),
    {
      name: 'assetpro-accounts',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Convenience hook for the Accounts module store.
 */
export function useAccounts() {
  return useAccountsStore();
}
