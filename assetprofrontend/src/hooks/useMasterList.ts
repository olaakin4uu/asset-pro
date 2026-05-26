'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface UseMasterListConfig<T> {
  /** Data items */
  items: T[];
  /** ID key for identifying items */
  idKey?: keyof T;
  /** Initially selected item ID */
  initialSelectedId?: string | number | null;
  /** Keys to search in */
  searchKeys?: Array<keyof T>;
  /** Items per page for infinite scroll */
  pageSize?: number;
  /** Callback when selection changes */
  onSelectionChange?: (item: T | null, id: string | number | null) => void;
  /** Callback when search changes */
  onSearchChange?: (query: string) => void;
  /** Custom filter function */
  filterFn?: (item: T, searchQuery: string) => boolean;
  /** Sort function */
  sortFn?: (a: T, b: T) => number;
  /** Group by key */
  groupBy?: keyof T;
}

export interface ListGroup<T> {
  key: string;
  label: string;
  items: T[];
}

export interface UseMasterListReturn<T> {
  // State
  items: T[];
  filteredItems: T[];
  displayedItems: T[];
  selectedId: string | number | null;
  selectedItem: T | null;
  searchQuery: string;

  // Pagination/Infinite scroll
  currentPage: number;
  hasMore: boolean;
  totalCount: number;
  filteredCount: number;

  // Grouping
  groups: ListGroup<T>[] | null;

  // Actions
  select: (id: string | number) => void;
  selectItem: (item: T) => void;
  clearSelection: () => void;
  selectNext: () => void;
  selectPrevious: () => void;
  selectFirst: () => void;
  selectLast: () => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  loadMore: () => void;
  resetPagination: () => void;

  // Helpers
  isSelected: (id: string | number) => boolean;
  getItemById: (id: string | number) => T | undefined;
  getItemIndex: (id: string | number) => number;
  isEmpty: boolean;
  isSearching: boolean;
  hasNoResults: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useMasterList<T extends Record<string, unknown>>(
  config: UseMasterListConfig<T>
): UseMasterListReturn<T> {
  const {
    items,
    idKey = 'id' as keyof T,
    initialSelectedId = null,
    searchKeys = [],
    pageSize = 50,
    onSelectionChange,
    onSearchChange,
    filterFn,
    sortFn,
    groupBy,
  } = config;

  // State
  const [selectedId, setSelectedId] = useState<string | number | null>(initialSelectedId);
  const [searchQuery, setSearchQueryState] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Get item ID
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

  // Filter items based on search
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      if (filterFn) {
        result = result.filter((item) => filterFn(item, searchQuery));
      } else if (searchKeys.length > 0) {
        result = result.filter((item) =>
          searchKeys.some((key) => {
            const value = item[key];
            if (value == null) return false;
            return String(value).toLowerCase().includes(query);
          })
        );
      }
    }

    // Apply sort
    if (sortFn) {
      result.sort(sortFn);
    }

    return result;
  }, [items, searchQuery, searchKeys, filterFn, sortFn]);

  // Displayed items (paginated for infinite scroll)
  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, currentPage * pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Grouped items
  const groups = useMemo<ListGroup<T>[] | null>(() => {
    if (!groupBy) return null;

    const groupMap = new Map<string, T[]>();

    for (const item of displayedItems) {
      const groupValue = item[groupBy];
      const groupKey = groupValue == null ? 'Other' : String(groupValue);

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(item);
    }

    return Array.from(groupMap.entries()).map(([key, items]) => ({
      key,
      label: key,
      items,
    }));
  }, [displayedItems, groupBy]);

  // Selected item
  const selectedItem = useMemo(() => {
    if (selectedId == null) return null;
    return items.find((item) => getItemId(item) === selectedId) ?? null;
  }, [items, selectedId, getItemId]);

  // Computed values
  const hasMore = displayedItems.length < filteredItems.length;
  const totalCount = items.length;
  const filteredCount = filteredItems.length;
  const isEmpty = items.length === 0;
  const isSearching = searchQuery.trim().length > 0;
  const hasNoResults = isSearching && filteredItems.length === 0;

  // Actions
  const select = useCallback(
    (id: string | number) => {
      setSelectedId(id);
      const item = items.find((item) => getItemId(item) === id) ?? null;
      onSelectionChange?.(item, id);
    },
    [items, getItemId, onSelectionChange]
  );

  const selectItem = useCallback(
    (item: T) => {
      const id = getItemId(item);
      setSelectedId(id);
      onSelectionChange?.(item, id);
    },
    [getItemId, onSelectionChange]
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    onSelectionChange?.(null, null);
  }, [onSelectionChange]);

  const selectNext = useCallback(() => {
    if (filteredItems.length === 0) return;

    const currentIndex = selectedId != null
      ? filteredItems.findIndex((item) => getItemId(item) === selectedId)
      : -1;

    const nextIndex = currentIndex < filteredItems.length - 1 ? currentIndex + 1 : 0;
    const nextItem = filteredItems[nextIndex];
    const nextId = getItemId(nextItem);

    setSelectedId(nextId);
    onSelectionChange?.(nextItem, nextId);
  }, [filteredItems, selectedId, getItemId, onSelectionChange]);

  const selectPrevious = useCallback(() => {
    if (filteredItems.length === 0) return;

    const currentIndex = selectedId != null
      ? filteredItems.findIndex((item) => getItemId(item) === selectedId)
      : filteredItems.length;

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredItems.length - 1;
    const prevItem = filteredItems[prevIndex];
    const prevId = getItemId(prevItem);

    setSelectedId(prevId);
    onSelectionChange?.(prevItem, prevId);
  }, [filteredItems, selectedId, getItemId, onSelectionChange]);

  const selectFirst = useCallback(() => {
    if (filteredItems.length === 0) return;

    const firstItem = filteredItems[0];
    const firstId = getItemId(firstItem);

    setSelectedId(firstId);
    onSelectionChange?.(firstItem, firstId);
  }, [filteredItems, getItemId, onSelectionChange]);

  const selectLast = useCallback(() => {
    if (filteredItems.length === 0) return;

    const lastItem = filteredItems[filteredItems.length - 1];
    const lastId = getItemId(lastItem);

    setSelectedId(lastId);
    onSelectionChange?.(lastItem, lastId);
  }, [filteredItems, getItemId, onSelectionChange]);

  const setSearchQuery = useCallback(
    (query: string) => {
      setSearchQueryState(query);
      setCurrentPage(1); // Reset pagination on search
      onSearchChange?.(query);
    },
    [onSearchChange]
  );

  const clearSearch = useCallback(() => {
    setSearchQueryState('');
    setCurrentPage(1);
    onSearchChange?.('');
  }, [onSearchChange]);

  const loadMore = useCallback(() => {
    if (hasMore) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasMore]);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Helpers
  const isSelected = useCallback(
    (id: string | number) => selectedId === id,
    [selectedId]
  );

  const getItemById = useCallback(
    (id: string | number) => items.find((item) => getItemId(item) === id),
    [items, getItemId]
  );

  const getItemIndex = useCallback(
    (id: string | number) => filteredItems.findIndex((item) => getItemId(item) === id),
    [filteredItems, getItemId]
  );

  // Ensure selected item is visible in displayed items
  useEffect(() => {
    if (selectedId != null) {
      const selectedIndex = filteredItems.findIndex((item) => getItemId(item) === selectedId);
      if (selectedIndex >= 0) {
        const requiredPage = Math.ceil((selectedIndex + 1) / pageSize);
        if (requiredPage > currentPage) {
          setCurrentPage(requiredPage);
        }
      }
    }
  }, [selectedId, filteredItems, getItemId, pageSize, currentPage]);

  return {
    // State
    items,
    filteredItems,
    displayedItems,
    selectedId,
    selectedItem,
    searchQuery,

    // Pagination
    currentPage,
    hasMore,
    totalCount,
    filteredCount,

    // Grouping
    groups,

    // Actions
    select,
    selectItem,
    clearSelection,
    selectNext,
    selectPrevious,
    selectFirst,
    selectLast,
    setSearchQuery,
    clearSearch,
    loadMore,
    resetPagination,

    // Helpers
    isSelected,
    getItemById,
    getItemIndex,
    isEmpty,
    isSearching,
    hasNoResults,
  };
}
