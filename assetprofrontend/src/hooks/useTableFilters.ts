'use client';

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'between'
  | 'in'
  | 'notIn'
  | 'isEmpty'
  | 'isNotEmpty';

export interface FilterValue {
  operator: FilterOperator;
  value: unknown;
  value2?: unknown; // For 'between' operator
}

export interface FilterConfig<T> {
  column: keyof T;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  operators?: FilterOperator[];
  options?: Array<{ label: string; value: unknown }>; // For select type
}

export interface UseTableFiltersConfig<T> {
  /** Columns that can be filtered */
  filterableColumns?: FilterConfig<T>[];
  /** Initial filter values */
  initialFilters?: Record<string, FilterValue>;
  /** Initial search query */
  initialSearch?: string;
  /** Columns to search in (for global search) */
  searchableColumns?: Array<keyof T>;
  /** Debounce delay for search (ms) */
  searchDebounce?: number;
  /** Callback when filters change */
  onFiltersChange?: (filters: Record<string, FilterValue>) => void;
  /** Callback when search changes */
  onSearchChange?: (search: string) => void;
}

export interface UseTableFiltersReturn<T> {
  // State
  filters: Record<string, FilterValue>;
  searchQuery: string;
  activeFilterCount: number;

  // Actions
  setFilter: (column: keyof T, value: FilterValue | null) => void;
  setFilters: (filters: Record<string, FilterValue>) => void;
  removeFilter: (column: keyof T) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  clearAll: () => void;

  // Helpers
  hasActiveFilters: boolean;
  hasSearch: boolean;
  getFilterValue: (column: keyof T) => FilterValue | null;
  filterData: (data: T[]) => T[];
  filterableColumns: FilterConfig<T>[];
}

// ============================================================================
// DEFAULT OPERATORS
// ============================================================================

const defaultOperators: Record<string, FilterOperator[]> = {
  text: ['contains', 'equals', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  number: ['equals', 'greaterThan', 'lessThan', 'between', 'isEmpty', 'isNotEmpty'],
  date: ['equals', 'greaterThan', 'lessThan', 'between', 'isEmpty', 'isNotEmpty'],
  select: ['equals', 'notEquals', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  boolean: ['equals'],
};

// ============================================================================
// HOOK
// ============================================================================

export function useTableFilters<T extends Record<string, unknown>>(
  config: UseTableFiltersConfig<T> = {}
): UseTableFiltersReturn<T> {
  const {
    filterableColumns = [],
    initialFilters = {},
    initialSearch = '',
    searchableColumns = [],
    onFiltersChange,
    onSearchChange,
  } = config;

  // State
  const [filters, setFiltersState] = useState<Record<string, FilterValue>>(initialFilters);
  const [searchQuery, setSearchQueryState] = useState(initialSearch);

  // Computed
  const activeFilterCount = useMemo(
    () => Object.keys(filters).length,
    [filters]
  );

  const hasActiveFilters = activeFilterCount > 0;
  const hasSearch = searchQuery.trim().length > 0;

  // Actions
  const setFilter = useCallback(
    (column: keyof T, value: FilterValue | null) => {
      setFiltersState((prev) => {
        const next = { ...prev };
        if (value === null) {
          delete next[String(column)];
        } else {
          next[String(column)] = value;
        }
        onFiltersChange?.(next);
        return next;
      });
    },
    [onFiltersChange]
  );

  const setFilters = useCallback(
    (newFilters: Record<string, FilterValue>) => {
      setFiltersState(newFilters);
      onFiltersChange?.(newFilters);
    },
    [onFiltersChange]
  );

  const removeFilter = useCallback(
    (column: keyof T) => {
      setFilter(column, null);
    },
    [setFilter]
  );

  const clearFilters = useCallback(() => {
    setFiltersState({});
    onFiltersChange?.({});
  }, [onFiltersChange]);

  const setSearchQuery = useCallback(
    (query: string) => {
      setSearchQueryState(query);
      onSearchChange?.(query);
    },
    [onSearchChange]
  );

  const clearSearch = useCallback(() => {
    setSearchQueryState('');
    onSearchChange?.('');
  }, [onSearchChange]);

  const clearAll = useCallback(() => {
    clearFilters();
    clearSearch();
  }, [clearFilters, clearSearch]);

  // Helpers
  const getFilterValue = useCallback(
    (column: keyof T): FilterValue | null => {
      return filters[String(column)] ?? null;
    },
    [filters]
  );

  // Apply filter to single value
  const applyFilter = useCallback(
    (value: unknown, filter: FilterValue): boolean => {
      const { operator, value: filterValue, value2 } = filter;

      // Handle isEmpty/isNotEmpty
      if (operator === 'isEmpty') {
        return value == null || value === '' || (Array.isArray(value) && value.length === 0);
      }
      if (operator === 'isNotEmpty') {
        return value != null && value !== '' && (!Array.isArray(value) || value.length > 0);
      }

      // Handle null values
      if (value == null) return false;

      // String operations
      if (typeof value === 'string') {
        const strValue = value.toLowerCase();
        const filterStr = String(filterValue).toLowerCase();

        switch (operator) {
          case 'equals':
            return strValue === filterStr;
          case 'notEquals':
            return strValue !== filterStr;
          case 'contains':
            return strValue.includes(filterStr);
          case 'startsWith':
            return strValue.startsWith(filterStr);
          case 'endsWith':
            return strValue.endsWith(filterStr);
          default:
            return true;
        }
      }

      // Number operations
      if (typeof value === 'number') {
        const numValue = value;
        const filterNum = Number(filterValue);
        const filterNum2 = value2 != null ? Number(value2) : undefined;

        switch (operator) {
          case 'equals':
            return numValue === filterNum;
          case 'notEquals':
            return numValue !== filterNum;
          case 'greaterThan':
            return numValue > filterNum;
          case 'lessThan':
            return numValue < filterNum;
          case 'greaterThanOrEqual':
            return numValue >= filterNum;
          case 'lessThanOrEqual':
            return numValue <= filterNum;
          case 'between':
            return filterNum2 != null && numValue >= filterNum && numValue <= filterNum2;
          default:
            return true;
        }
      }

      // Date operations
      if (value instanceof Date) {
        const dateValue = value.getTime();
        const filterDate = new Date(String(filterValue)).getTime();
        const filterDate2 = value2 != null ? new Date(String(value2)).getTime() : undefined;

        switch (operator) {
          case 'equals':
            return dateValue === filterDate;
          case 'notEquals':
            return dateValue !== filterDate;
          case 'greaterThan':
            return dateValue > filterDate;
          case 'lessThan':
            return dateValue < filterDate;
          case 'between':
            return filterDate2 != null && dateValue >= filterDate && dateValue <= filterDate2;
          default:
            return true;
        }
      }

      // Boolean operations
      if (typeof value === 'boolean') {
        switch (operator) {
          case 'equals':
            return value === filterValue;
          default:
            return true;
        }
      }

      // Array operations (in/notIn)
      if (Array.isArray(filterValue)) {
        switch (operator) {
          case 'in':
            return filterValue.includes(value);
          case 'notIn':
            return !filterValue.includes(value);
          default:
            return true;
        }
      }

      return true;
    },
    []
  );

  // Filter data
  const filterData = useCallback(
    (data: T[]): T[] => {
      let filtered = data;

      // Apply search
      if (hasSearch && searchableColumns.length > 0) {
        const searchLower = searchQuery.toLowerCase();
        filtered = filtered.filter((item) =>
          searchableColumns.some((column) => {
            const value = item[column];
            if (value == null) return false;
            return String(value).toLowerCase().includes(searchLower);
          })
        );
      }

      // Apply filters
      if (hasActiveFilters) {
        filtered = filtered.filter((item) => {
          return Object.entries(filters).every(([column, filter]) => {
            const value = item[column as keyof T];
            return applyFilter(value, filter);
          });
        });
      }

      return filtered;
    },
    [hasSearch, searchQuery, searchableColumns, hasActiveFilters, filters, applyFilter]
  );

  // Enhance filterable columns with default operators
  const enhancedFilterableColumns = useMemo(
    () =>
      filterableColumns.map((col) => ({
        ...col,
        operators: col.operators ?? defaultOperators[col.type] ?? [],
      })),
    [filterableColumns]
  );

  return {
    // State
    filters,
    searchQuery,
    activeFilterCount,

    // Actions
    setFilter,
    setFilters,
    removeFilter,
    clearFilters,
    setSearchQuery,
    clearSearch,
    clearAll,

    // Helpers
    hasActiveFilters,
    hasSearch,
    getFilterValue,
    filterData,
    filterableColumns: enhancedFilterableColumns,
  };
}
