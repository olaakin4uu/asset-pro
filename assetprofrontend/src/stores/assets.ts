'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

interface AssetsState {
  // State
  activeAssetId: number | null;
  recentAssetIds: number[];
  depreciationRunCount: number;

  // Actions
  setActiveAsset: (id: number) => void;
  addRecentAsset: (id: number) => void;
  setDepreciationRunCount: (count: number) => void;
  clear: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_RECENT_ITEMS = 10;

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

export const useAssetsStore = create<AssetsState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeAssetId: null,
      recentAssetIds: [],
      depreciationRunCount: 0,

      // Actions
      setActiveAsset: (id: number) => {
        set({ activeAssetId: id });
      },

      addRecentAsset: (id: number) => {
        set({ recentAssetIds: pushRecent(get().recentAssetIds, id) });
      },

      setDepreciationRunCount: (count: number) => {
        set({ depreciationRunCount: count });
      },

      clear: () => {
        set({
          activeAssetId: null,
          recentAssetIds: [],
          depreciationRunCount: 0,
        });
      },
    }),
    {
      name: 'assetpro-assets',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Convenience hook for the Assets module store.
 */
export function useAssets() {
  return useAssetsStore();
}
