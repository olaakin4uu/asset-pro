'use client';

import { useMemo, useCallback, useEffect } from 'react';
import {
  useTablePagination,
  type UseTablePaginationConfig,
  type UseTablePaginationReturn,
} from './useTablePagination';
import {
  useTableSort,
  type UseTableSortConfig,
  type UseTableSortReturn,
  type SortDirection,
} from './useTableSort';
import {
  useTableSelection,
  type UseTableSelectionConfig,
  type UseTableSelectionReturn,
} from './useTableSelection';
import {
  useTableFilters,
  type UseTableFiltersConfig,
  type UseTableFiltersReturn,
  type FilterConfig,
} from './useTableFilters';
import {
  useTableColumns,
  type UseTableColumnsConfig,
  type UseTableColumnsReturn,
  type ColumnDefinition,
} from './useTableColumns';
import {
  useTableExport,
  type UseTableExportConfig,
  type UseTableExportReturn,
  type ExportColumn,
  type TableExportFormat,
} from './useTableExport';

// ============================================================================
// TYPES
// ============================================================================

export interface DataTableColumn<T> extends ColumnDefinition<T> {
  /** Filter configuration for this column */
  filter?: Omit<FilterConfig<T>, 'column' | 'label'>;
  /** Export configuration */
  export?: {
    /** Include in export */
    include?: boolean;
    /** Custom format for export */
    format?: (value: unknown, row: T) => string;
  };
}

export interface UseDataTableConfig<T> {
  /** Raw data array */
  data: T[];

  /** Column definitions */
  columns: DataTableColumn<T>[];

  /** ID key for row identification */
  idKey?: keyof T;

  // Pagination config
  pagination?: UseTablePaginationConfig | false;

  // Sort config
  sort?: Omit<UseTableSortConfig<T>, 'defaultColumn' | 'defaultDirection'> & {
    defaultColumn?: keyof T;
    defaultDirection?: SortDirection;
  } | false;

  // Selection config
  selection?: Omit<UseTableSelectionConfig<T>, 'idKey'> | false;

  // Filter config
  filters?: Omit<UseTableFiltersConfig<T>, 'filterableColumns'> & {
    searchableColumns?: Array<keyof T>;
  } | false;

  // Column visibility/order config
  columnSettings?: Omit<UseTableColumnsConfig<T>, 'columns'> | false;

  // Export config
  export?: Omit<UseTableExportConfig<T>, 'columns' | 'getData' | 'selectedIds' | 'idKey'> | false;

  /** Server-side mode (skip client-side filtering/sorting/pagination) */
  serverSide?: boolean;

  /** Callback for server-side data fetch */
  onServerFetch?: (params: ServerFetchParams<T>) => void;
}

export interface ServerFetchParams<T> {
  page: number;
  pageSize: number;
  sortColumn: keyof T | null;
  sortDirection: SortDirection;
  filters: Record<string, unknown>;
  searchQuery: string;
}

export interface UseDataTableReturn<T> {
  // Processed data
  data: T[];
  processedData: T[];
  displayData: T[];

  // Sub-hook returns
  pagination: UseTablePaginationReturn;
  sort: UseTableSortReturn<T>;
  selection: UseTableSelectionReturn<T>;
  filters: UseTableFiltersReturn<T>;
  columns: UseTableColumnsReturn<T>;
  tableExport: UseTableExportReturn<T>;

  // Convenience computed values
  totalRows: number;
  displayedRows: number;
  isLoading: boolean;
  isEmpty: boolean;
  hasFiltersApplied: boolean;

  // Actions
  resetAll: () => void;
  refresh: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useDataTable<T extends Record<string, unknown>>(
  config: UseDataTableConfig<T>
): UseDataTableReturn<T> {
  const {
    data,
    columns,
    idKey = 'id' as keyof T,
    pagination: paginationConfig = {},
    sort: sortConfig = {},
    selection: selectionConfig = {},
    filters: filtersConfig = {},
    columnSettings: columnSettingsConfig = {},
    export: exportConfig = {},
    serverSide = false,
    onServerFetch,
  } = config;

  // Build filter configs from columns
  const filterableColumns = useMemo<FilterConfig<T>[]>(() => {
    if (filtersConfig === false) return [];
    return columns
      .filter((col) => col.filter != null)
      .map((col) => ({
        column: (col.accessorKey ?? col.id) as keyof T,
        label: col.header,
        ...col.filter!,
      }));
  }, [columns, filtersConfig]);

  // Build export columns from visible columns
  const exportColumns = useMemo<ExportColumn<T>[]>(() => {
    if (exportConfig === false) return [];
    return columns
      .filter((col) => col.export?.include !== false)
      .map((col) => ({
        id: col.id,
        header: col.header,
        accessorKey: col.accessorKey,
        accessorFn: col.accessorFn,
        format: col.export?.format,
      }));
  }, [columns, exportConfig]);

  // Initialize pagination
  const pagination = useTablePagination(
    paginationConfig === false
      ? { totalItems: data.length }
      : { ...paginationConfig, totalItems: data.length }
  );

  // Initialize sort
  const sort = useTableSort<T>(
    sortConfig === false
      ? {}
      : {
          defaultColumn: sortConfig.defaultColumn,
          defaultDirection: sortConfig.defaultDirection,
          comparators: sortConfig.comparators,
          onSortChange: sortConfig.onSortChange,
        }
  );

  // Initialize selection
  const selection = useTableSelection<T>(
    selectionConfig === false
      ? { idKey }
      : { ...selectionConfig, idKey }
  );

  // Initialize filters
  const filters = useTableFilters<T>(
    filtersConfig === false
      ? {}
      : {
          ...filtersConfig,
          filterableColumns,
          searchableColumns: filtersConfig.searchableColumns ?? [],
        }
  );

  // Initialize columns
  const columnsHook = useTableColumns<T>(
    columnSettingsConfig === false
      ? { columns }
      : { ...columnSettingsConfig, columns }
  );

  // Process data through filters, sort, and pagination
  const processedData = useMemo(() => {
    if (serverSide) return data;

    let result = [...data];

    // Apply filters
    if (filtersConfig !== false) {
      result = filters.filterData(result);
    }

    // Apply sort
    if (sortConfig !== false) {
      result = sort.sortData(result);
    }

    return result;
  }, [data, serverSide, filtersConfig, filters, sortConfig, sort]);

  // Update total items when processed data changes
  useEffect(() => {
    if (!serverSide) {
      pagination.setTotalItems(processedData.length);
    }
  }, [processedData.length, serverSide, pagination.setTotalItems]);

  // Get display data (paginated)
  const displayData = useMemo(() => {
    if (serverSide) return data;
    if (paginationConfig === false) return processedData;
    return pagination.paginateData(processedData);
  }, [serverSide, data, paginationConfig, processedData, pagination]);

  // Initialize export
  const tableExport = useTableExport<T>(
    exportConfig === false
      ? {
          columns: exportColumns,
          getData: () => processedData,
          selectedIds: selection.selectedIds,
          idKey,
        }
      : {
          ...exportConfig,
          columns: exportColumns,
          getData: () => processedData,
          selectedIds: selection.selectedIds,
          idKey,
        }
  );

  // Server-side fetch callback
  const triggerServerFetch = useCallback(() => {
    if (!serverSide || !onServerFetch) return;

    onServerFetch({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      sortColumn: sort.sortColumn,
      sortDirection: sort.sortDirection,
      filters: filters.filters,
      searchQuery: filters.searchQuery,
    });
  }, [
    serverSide,
    onServerFetch,
    pagination.currentPage,
    pagination.pageSize,
    sort.sortColumn,
    sort.sortDirection,
    filters.filters,
    filters.searchQuery,
  ]);

  // Computed values
  const totalRows = processedData.length;
  const displayedRows = displayData.length;
  const isEmpty = data.length === 0;
  const hasFiltersApplied = filters.hasActiveFilters || filters.hasSearch;

  // Reset all state
  const resetAll = useCallback(() => {
    pagination.firstPage();
    sort.clearSort();
    selection.deselectAll();
    filters.clearAll();
    columnsHook.resetColumns();
  }, [pagination, sort, selection, filters, columnsHook]);

  return {
    // Data
    data,
    processedData,
    displayData,

    // Sub-hook returns
    pagination,
    sort,
    selection,
    filters,
    columns: columnsHook,
    tableExport,

    // Convenience values
    totalRows,
    displayedRows,
    isLoading: false, // Can be extended for async loading
    isEmpty,
    hasFiltersApplied,

    // Actions
    resetAll,
    refresh: triggerServerFetch,
  };
}

// Re-export types for convenience
export type {
  UseTablePaginationConfig,
  UseTablePaginationReturn,
  UseTableSortConfig,
  UseTableSortReturn,
  SortDirection,
  UseTableSelectionConfig,
  UseTableSelectionReturn,
  UseTableFiltersConfig,
  UseTableFiltersReturn,
  FilterConfig,
  UseTableColumnsConfig,
  UseTableColumnsReturn,
  ColumnDefinition,
  UseTableExportConfig,
  UseTableExportReturn,
  ExportColumn,
  TableExportFormat,
};
