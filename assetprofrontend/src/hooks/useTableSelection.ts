'use client';

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface UseTableSelectionConfig<T> {
  /** Key to use for identifying items (default: 'id') */
  idKey?: keyof T;
  /** Initially selected item IDs */
  initialSelection?: Array<string | number>;
  /** Maximum number of items that can be selected */
  maxSelection?: number;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Array<string | number>, selectedItems: T[]) => void;
  /** Items that cannot be selected */
  disabledIds?: Array<string | number>;
}

export interface UseTableSelectionReturn<T> {
  // State
  selectedIds: Set<string | number>;
  selectedCount: number;

  // Computed
  hasSelection: boolean;
  isAllSelected: boolean;
  isPartiallySelected: boolean;

  // Actions
  select: (id: string | number) => void;
  deselect: (id: string | number) => void;
  toggle: (id: string | number) => void;
  selectAll: (items: T[]) => void;
  deselectAll: () => void;
  toggleAll: (items: T[]) => void;
  selectRange: (items: T[], fromId: string | number, toId: string | number) => void;

  // Helpers
  isSelected: (id: string | number) => boolean;
  isDisabled: (id: string | number) => boolean;
  getSelectedItems: (items: T[]) => T[];
  canSelectMore: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useTableSelection<T extends Record<string, unknown>>(
  config: UseTableSelectionConfig<T> = {}
): UseTableSelectionReturn<T> {
  const {
    idKey = 'id' as keyof T,
    initialSelection = [],
    maxSelection,
    onSelectionChange,
    disabledIds = [],
  } = config;

  // State
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(initialSelection)
  );

  // Disabled set for faster lookups
  const disabledSet = useMemo(() => new Set(disabledIds), [disabledIds]);

  // Computed
  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;
  const canSelectMore = maxSelection == null || selectedCount < maxSelection;

  // Helper to get item ID
  const getItemId = useCallback(
    (item: T): string | number => {
      const id = item[idKey];
      if (typeof id === 'string' || typeof id === 'number') {
        return id;
      }
      throw new Error(`Invalid ID type for key "${String(idKey)}"`);
    },
    [idKey]
  );

  // Notify changes
  const notifyChange = useCallback(
    (newSelectedIds: Set<string | number>, items?: T[]) => {
      if (onSelectionChange && items) {
        const selectedItems = items.filter((item) =>
          newSelectedIds.has(getItemId(item))
        );
        onSelectionChange(Array.from(newSelectedIds), selectedItems);
      }
    },
    [onSelectionChange, getItemId]
  );

  // Actions
  const select = useCallback(
    (id: string | number) => {
      if (disabledSet.has(id)) return;
      if (!canSelectMore && !selectedIds.has(id)) return;

      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [disabledSet, canSelectMore, selectedIds]
  );

  const deselect = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (id: string | number) => {
      if (disabledSet.has(id)) return;

      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          if (maxSelection != null && next.size >= maxSelection) {
            return prev;
          }
          next.add(id);
        }
        return next;
      });
    },
    [disabledSet, maxSelection]
  );

  const selectAll = useCallback(
    (items: T[]) => {
      const selectableItems = items.filter(
        (item) => !disabledSet.has(getItemId(item))
      );

      let itemsToSelect = selectableItems;
      if (maxSelection != null) {
        itemsToSelect = selectableItems.slice(0, maxSelection);
      }

      const newSelectedIds = new Set<string | number>(
        itemsToSelect.map((item) => getItemId(item))
      );

      setSelectedIds(newSelectedIds);
      notifyChange(newSelectedIds, items);
    },
    [disabledSet, getItemId, maxSelection, notifyChange]
  );

  const deselectAll = useCallback(() => {
    const newSelectedIds = new Set<string | number>();
    setSelectedIds(newSelectedIds);
    onSelectionChange?.([], []);
  }, [onSelectionChange]);

  const toggleAll = useCallback(
    (items: T[]) => {
      const selectableItems = items.filter(
        (item) => !disabledSet.has(getItemId(item))
      );
      const allSelected = selectableItems.every((item) =>
        selectedIds.has(getItemId(item))
      );

      if (allSelected) {
        deselectAll();
      } else {
        selectAll(items);
      }
    },
    [disabledSet, getItemId, selectedIds, deselectAll, selectAll]
  );

  const selectRange = useCallback(
    (items: T[], fromId: string | number, toId: string | number) => {
      const fromIndex = items.findIndex((item) => getItemId(item) === fromId);
      const toIndex = items.findIndex((item) => getItemId(item) === toId);

      if (fromIndex === -1 || toIndex === -1) return;

      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);

      const rangeItems = items.slice(start, end + 1);
      const selectableRangeItems = rangeItems.filter(
        (item) => !disabledSet.has(getItemId(item))
      );

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const item of selectableRangeItems) {
          if (maxSelection != null && next.size >= maxSelection) {
            break;
          }
          next.add(getItemId(item));
        }
        return next;
      });
    },
    [disabledSet, getItemId, maxSelection]
  );

  // Helpers
  const isSelected = useCallback(
    (id: string | number) => selectedIds.has(id),
    [selectedIds]
  );

  const isDisabled = useCallback(
    (id: string | number) => disabledSet.has(id),
    [disabledSet]
  );

  const getSelectedItems = useCallback(
    (items: T[]) => items.filter((item) => selectedIds.has(getItemId(item))),
    [selectedIds, getItemId]
  );

  // Check if all/partial selected for a given items array
  const checkAllSelected = useCallback(
    (items: T[]) => {
      const selectableItems = items.filter(
        (item) => !disabledSet.has(getItemId(item))
      );
      if (selectableItems.length === 0) return false;
      return selectableItems.every((item) => selectedIds.has(getItemId(item)));
    },
    [disabledSet, getItemId, selectedIds]
  );

  const checkPartiallySelected = useCallback(
    (items: T[]) => {
      const selectableItems = items.filter(
        (item) => !disabledSet.has(getItemId(item))
      );
      if (selectableItems.length === 0) return false;
      const someSelected = selectableItems.some((item) =>
        selectedIds.has(getItemId(item))
      );
      const allSelected = selectableItems.every((item) =>
        selectedIds.has(getItemId(item))
      );
      return someSelected && !allSelected;
    },
    [disabledSet, getItemId, selectedIds]
  );

  return {
    // State
    selectedIds,
    selectedCount,

    // Computed (these need items to compute properly, but we expose basic versions)
    hasSelection,
    isAllSelected: false, // Will be computed with items in component
    isPartiallySelected: false, // Will be computed with items in component

    // Actions
    select,
    deselect,
    toggle,
    selectAll,
    deselectAll,
    toggleAll,
    selectRange,

    // Helpers
    isSelected,
    isDisabled,
    getSelectedItems,
    canSelectMore,
  };
}
