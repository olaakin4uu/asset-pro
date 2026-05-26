'use client';

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type SortDirection = 'asc' | 'desc';

export interface SortState<T> {
  column: keyof T | null;
  direction: SortDirection;
}

export interface UseTableSortConfig<T> {
  /** Default sort column */
  defaultColumn?: keyof T;
  /** Default sort direction */
  defaultDirection?: SortDirection;
  /** Custom sort comparator for specific columns */
  comparators?: Partial<Record<keyof T, (a: T, b: T) => number>>;
  /** Callback when sort changes */
  onSortChange?: (column: keyof T | null, direction: SortDirection) => void;
  /** Enable multi-column sorting */
  multiSort?: boolean;
}

export interface UseTableSortReturn<T> {
  // State
  sortColumn: keyof T | null;
  sortDirection: SortDirection;
  sortState: SortState<T>;

  // Actions
  setSort: (column: keyof T, direction?: SortDirection) => void;
  toggleSort: (column: keyof T) => void;
  clearSort: () => void;

  // Helpers
  isSorted: (column: keyof T) => boolean;
  getSortDirection: (column: keyof T) => SortDirection | null;
  sortData: (data: T[]) => T[];
  getSortIcon: (column: keyof T) => 'asc' | 'desc' | 'none';
}

// ============================================================================
// HOOK
// ============================================================================

export function useTableSort<T extends Record<string, unknown>>(
  config: UseTableSortConfig<T> = {}
): UseTableSortReturn<T> {
  const {
    defaultColumn = null,
    defaultDirection = 'asc',
    comparators = {} as Partial<Record<keyof T, (a: T, b: T) => number>>,
    onSortChange,
  } = config;

  // State
  const [sortColumn, setSortColumn] = useState<keyof T | null>(defaultColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  // Computed
  const sortState = useMemo<SortState<T>>(
    () => ({ column: sortColumn, direction: sortDirection }),
    [sortColumn, sortDirection]
  );

  // Actions
  const setSort = useCallback(
    (column: keyof T, direction?: SortDirection) => {
      const newDirection = direction ?? 'asc';
      setSortColumn(column);
      setSortDirection(newDirection);
      onSortChange?.(column, newDirection);
    },
    [onSortChange]
  );

  const toggleSort = useCallback(
    (column: keyof T) => {
      if (sortColumn === column) {
        // Toggle direction or clear
        if (sortDirection === 'asc') {
          setSortDirection('desc');
          onSortChange?.(column, 'desc');
        } else {
          // Clear sort after desc
          setSortColumn(null);
          setSortDirection('asc');
          onSortChange?.(null, 'asc');
        }
      } else {
        // New column, start with asc
        setSortColumn(column);
        setSortDirection('asc');
        onSortChange?.(column, 'asc');
      }
    },
    [sortColumn, sortDirection, onSortChange]
  );

  const clearSort = useCallback(() => {
    setSortColumn(null);
    setSortDirection('asc');
    onSortChange?.(null, 'asc');
  }, [onSortChange]);

  // Helpers
  const isSorted = useCallback(
    (column: keyof T) => sortColumn === column,
    [sortColumn]
  );

  const getSortDirection = useCallback(
    (column: keyof T): SortDirection | null => {
      return sortColumn === column ? sortDirection : null;
    },
    [sortColumn, sortDirection]
  );

  const getSortIcon = useCallback(
    (column: keyof T): 'asc' | 'desc' | 'none' => {
      if (sortColumn !== column) return 'none';
      return sortDirection;
    },
    [sortColumn, sortDirection]
  );

  // Sort data helper
  const sortData = useCallback(
    (data: T[]): T[] => {
      if (!sortColumn) return data;

      return [...data].sort((a, b) => {
        // Use custom comparator if provided
        const customComparator = comparators[sortColumn];
        if (customComparator) {
          const result = customComparator(a, b);
          return sortDirection === 'asc' ? result : -result;
        }

        // Default comparison
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        // Handle null/undefined
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
        if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

        // String comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const result = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? result : -result;
        }

        // Number comparison
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          const result = aValue - bValue;
          return sortDirection === 'asc' ? result : -result;
        }

        // Date comparison
        if (aValue instanceof Date && bValue instanceof Date) {
          const result = aValue.getTime() - bValue.getTime();
          return sortDirection === 'asc' ? result : -result;
        }

        // Boolean comparison
        if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          const result = aValue === bValue ? 0 : aValue ? 1 : -1;
          return sortDirection === 'asc' ? result : -result;
        }

        // Fallback to string conversion
        const aStr = String(aValue);
        const bStr = String(bValue);
        const result = aStr.localeCompare(bStr);
        return sortDirection === 'asc' ? result : -result;
      });
    },
    [sortColumn, sortDirection, comparators]
  );

  return {
    // State
    sortColumn,
    sortDirection,
    sortState,

    // Actions
    setSort,
    toggleSort,
    clearSort,

    // Helpers
    isSorted,
    getSortDirection,
    sortData,
    getSortIcon,
  };
}
