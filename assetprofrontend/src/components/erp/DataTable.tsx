'use client';

import React, { createContext, useContext } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  Settings2,
  Download,
  Check,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UseDataTableReturn, ColumnDefinition } from '@/hooks/useDataTable';

// ============================================================================
// CONTEXT
// ============================================================================

interface DataTableContextValue<T> {
  table: UseDataTableReturn<T>;
}

const DataTableContext = createContext<DataTableContextValue<unknown> | null>(null);

function useDataTableContext<T>() {
  const context = useContext(DataTableContext) as DataTableContextValue<T> | null;
  if (!context) {
    throw new Error('DataTable components must be used within a DataTable');
  }
  return context;
}

// ============================================================================
// TYPES
// ============================================================================

export interface DataTableProps<T> {
  table: UseDataTableReturn<T>;
  children: React.ReactNode;
  className?: string;
}

export interface DataTableRootProps {
  children: React.ReactNode;
  className?: string;
}

export interface DataTableToolbarProps {
  children?: React.ReactNode;
  className?: string;
  showSearch?: boolean;
  showColumnToggle?: boolean;
  showExport?: boolean;
  searchPlaceholder?: string;
}

export interface DataTableHeaderProps<T> {
  children?: React.ReactNode;
  className?: string;
}

export interface DataTableColumnHeaderProps<T> {
  column: ColumnDefinition<T>;
  children?: React.ReactNode;
  className?: string;
}

export interface DataTableBodyProps<T> {
  children?: React.ReactNode;
  className?: string;
  renderRow?: (row: T, index: number, rowProps: {
    focused: boolean;
    ref: ((el: HTMLTableRowElement | null) => void) | null;
    rowIndex: number;
  }) => React.ReactNode;
  emptyMessage?: string;
  /** Callback when a row is activated via keyboard Enter */
  onRowClick?: (row: T) => void;
}

export interface DataTableRowProps {
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
  onClick?: () => void;
}

export interface DataTableCellProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTablePaginationProps {
  className?: string;
  showPageSize?: boolean;
  showPageInfo?: boolean;
  showPageNumbers?: boolean;
}

export interface DataTableSelectionHeaderProps {
  className?: string;
}

export interface DataTableSelectionCellProps<T> {
  row: T;
  className?: string;
}

// ============================================================================
// ROOT COMPONENT
// ============================================================================

function DataTableRoot<T extends Record<string, unknown>>({
  table,
  children,
  className,
}: DataTableProps<T>) {
  return (
    <DataTableContext.Provider value={{ table: table as UseDataTableReturn<unknown> }}>
      <div className={cn('flex flex-col gap-4', className)}>{children}</div>
    </DataTableContext.Provider>
  );
}

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

function DataTableToolbar<T>({
  children,
  className,
  showSearch = true,
  showColumnToggle = true,
  showExport = true,
  searchPlaceholder = 'Search...',
}: DataTableToolbarProps) {
  const { table } = useDataTableContext<T>();
  const [columnMenuOpen, setColumnMenuOpen] = React.useState(false);
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const columnMenuRef = React.useRef<HTMLDivElement>(null);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);

  // Close menus on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setColumnMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex flex-1 items-center gap-2">
        {showSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              aria-label="Search table"
              value={table.filters.searchQuery}
              onChange={(e) => table.filters.setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border bg-background pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {table.filters.searchQuery && (
              <button
                aria-label="Clear search"
                onClick={() => table.filters.clearSearch()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>

      <div className="flex items-center gap-2">
        {/* Selection info */}
        {table.selection.selectedCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {table.selection.selectedCount} selected
          </span>
        )}

        {/* Column toggle */}
        {showColumnToggle && (
          <div ref={columnMenuRef} className="relative">
            <button
              aria-label="Toggle column visibility"
              aria-expanded={columnMenuOpen}
              onClick={() => setColumnMenuOpen(!columnMenuOpen)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Columns</span>
            </button>
            {columnMenuOpen && (
              <div className="absolute right-0 z-50 mt-1 min-w-[180px] rounded-lg border bg-popover p-2 shadow-lg animate-in fade-in-0 zoom-in-95">
                <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                  Toggle columns
                </div>
                {table.columns.hideableColumns.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => table.columns.toggleColumn(col.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded border',
                        table.columns.isColumnVisible(col.id)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input'
                      )}
                    >
                      {table.columns.isColumnVisible(col.id) && <Check className="h-3 w-3" />}
                    </span>
                    {col.header}
                  </button>
                ))}
                <div className="mt-2 border-t pt-2">
                  <button
                    onClick={() => table.columns.resetColumns()}
                    className="w-full rounded px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
                  >
                    Reset to default
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Export */}
        {showExport && (
          <div ref={exportMenuRef} className="relative">
            <button
              aria-label="Export data"
              aria-expanded={exportMenuOpen}
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={table.tableExport.isExporting}
              className="inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {table.tableExport.isExporting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Export</span>
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 z-50 mt-1 min-w-[160px] rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                <button
                  onClick={() => {
                    table.tableExport.exportToCsv();
                    setExportMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => {
                    table.tableExport.exportToExcel();
                    setExportMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
                >
                  Export as Excel
                </button>
                <button
                  onClick={() => {
                    table.tableExport.exportToJson();
                    setExportMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
                >
                  Export as JSON
                </button>
                {table.selection.selectedCount > 0 && (
                  <>
                    <div className="my-1 border-t" />
                    <button
                      onClick={() => {
                        table.tableExport.exportToCsv({ selectedOnly: true });
                        setExportMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted"
                    >
                      Export selected ({table.selection.selectedCount})
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TABLE CONTAINER
// ============================================================================

export interface DataTableContainerProps extends DataTableRootProps {
  /** Accessible label for the data table */
  'aria-label'?: string;
}

function DataTableContainer({ children, className, 'aria-label': ariaLabel = 'Data table' }: DataTableContainerProps) {
  return (
    <div className={cn('overflow-auto rounded-lg border', className)}>
      <table role="table" aria-label={ariaLabel} className="w-full caption-bottom text-sm">{children}</table>
    </div>
  );
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

function DataTableHeader<T>({ children, className }: DataTableHeaderProps<T>) {
  return (
    <thead role="rowgroup" className={cn('[&_tr]:border-b', className)}>
      <tr role="row" className="border-b bg-muted/50 transition-colors hover:bg-muted/50">{children}</tr>
    </thead>
  );
}

// ============================================================================
// COLUMN HEADER COMPONENT
// ============================================================================

function DataTableColumnHeader<T>({
  column,
  children,
  className,
}: DataTableColumnHeaderProps<T>) {
  const { table } = useDataTableContext<T>();
  const isSortable = column.sortable !== false;
  const sortDirection = table.sort.getSortDirection(
    (column.accessorKey ?? column.id) as keyof T
  );

  const handleSort = () => {
    if (!isSortable) return;
    table.sort.toggleSort((column.accessorKey ?? column.id) as keyof T);
  };

  const ariaSortValue: 'ascending' | 'descending' | 'none' | undefined = isSortable
    ? sortDirection === 'asc'
      ? 'ascending'
      : sortDirection === 'desc'
      ? 'descending'
      : 'none'
    : undefined;

  return (
    <th
      role="columnheader"
      aria-sort={ariaSortValue}
      className={cn(
        'h-11 px-4 text-left align-middle font-medium text-muted-foreground',
        column.align === 'center' && 'text-center',
        column.align === 'right' && 'text-right',
        isSortable && 'cursor-pointer select-none hover:text-foreground',
        className
      )}
      style={{ width: column.width, minWidth: column.minWidth, maxWidth: column.maxWidth }}
      onClick={handleSort}
    >
      <div className="flex items-center gap-2">
        {children ?? column.header}
        {isSortable && (
          <span className="ml-auto">
            {sortDirection === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : sortDirection === 'desc' ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            )}
          </span>
        )}
      </div>
    </th>
  );
}

// ============================================================================
// SELECTION HEADER
// ============================================================================

function DataTableSelectionHeader<T>({ className }: DataTableSelectionHeaderProps) {
  const { table } = useDataTableContext<T>();

  const allSelected = table.displayData.length > 0 &&
    table.displayData.every((row) =>
      table.selection.isSelected((row as Record<string, unknown>).id as string | number)
    );

  const someSelected = table.displayData.some((row) =>
    table.selection.isSelected((row as Record<string, unknown>).id as string | number)
  ) && !allSelected;

  return (
    <th role="columnheader" className={cn('h-11 w-12 px-4', className)}>
      <button
        aria-label="Select all rows"
        onClick={() => table.selection.toggleAll(table.displayData)}
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded border transition-colors',
          allSelected
            ? 'border-primary bg-primary text-primary-foreground'
            : someSelected
            ? 'border-primary bg-primary/20'
            : 'border-input hover:border-primary'
        )}
      >
        {allSelected && <Check className="h-3 w-3" />}
        {someSelected && <Minus className="h-3 w-3" />}
      </button>
    </th>
  );
}

// ============================================================================
// SELECTION CELL
// ============================================================================

function DataTableSelectionCell<T extends Record<string, unknown>>({
  row,
  className,
}: DataTableSelectionCellProps<T>) {
  const { table } = useDataTableContext<T>();
  const id = row.id as string | number;
  const isSelected = table.selection.isSelected(id);
  const isDisabled = table.selection.isDisabled(id);

  return (
    <td role="cell" className={cn('w-12 px-4', className)}>
      <button
        aria-label={isSelected ? 'Deselect row' : 'Select row'}
        onClick={(e) => {
          e.stopPropagation();
          table.selection.toggle(id);
        }}
        disabled={isDisabled}
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded border transition-colors',
          isSelected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-input hover:border-primary',
          isDisabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {isSelected && <Check className="h-3 w-3" />}
      </button>
    </td>
  );
}

// ============================================================================
// BODY COMPONENT
// ============================================================================

function DataTableBody<T extends Record<string, unknown>>({
  children,
  className,
  renderRow,
  emptyMessage = 'No results found.',
  onRowClick,
}: DataTableBodyProps<T>) {
  const { table } = useDataTableContext<T>();
  const [focusedRowIndex, setFocusedRowIndex] = React.useState(-1);
  const rowRefs = React.useRef<Map<number, HTMLTableRowElement>>(new Map());
  const tbodyRef = React.useRef<HTMLTableSectionElement>(null);

  // Scroll focused row into view
  React.useEffect(() => {
    if (focusedRowIndex >= 0) {
      const rowEl = rowRefs.current.get(focusedRowIndex);
      if (rowEl) {
        rowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        rowEl.focus({ preventScroll: true });
      }
    }
  }, [focusedRowIndex]);

  // Reset focused row when data changes (e.g. page change, filter)
  React.useEffect(() => {
    setFocusedRowIndex(-1);
  }, [table.displayData]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const rowCount = table.displayData.length;
    if (rowCount === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.min(prev + 1, rowCount - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedRowIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setFocusedRowIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedRowIndex(rowCount - 1);
        break;
      case 'Enter':
        if (focusedRowIndex >= 0 && onRowClick) {
          e.preventDefault();
          onRowClick(table.displayData[focusedRowIndex] as T);
        }
        break;
      case ' ':
        e.preventDefault();
        if (focusedRowIndex >= 0) {
          const row = table.displayData[focusedRowIndex] as Record<string, unknown>;
          const id = row.id as string | number;
          if (id !== undefined) {
            table.selection.toggle(id);
          }
        }
        break;
      case 'Escape':
        setFocusedRowIndex(-1);
        (e.currentTarget as HTMLElement).blur();
        break;
    }
  };

  const setRowRef = (index: number) => (el: HTMLTableRowElement | null) => {
    if (el) {
      rowRefs.current.set(index, el);
    } else {
      rowRefs.current.delete(index);
    }
  };

  if (table.displayData.length === 0) {
    return (
      <tbody role="rowgroup" className={className}>
        <tr role="row">
          <td
            role="cell"
            colSpan={table.columns.visibleColumns.length + 1}
            className="h-24 text-center text-muted-foreground"
          >
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody
      ref={tbodyRef}
      role="rowgroup"
      tabIndex={0}
      aria-label="Table body. Use arrow keys to navigate rows."
      onKeyDown={handleKeyDown}
      className={cn('[&_tr:last-child]:border-0 focus:outline-none', className)}
    >
      {renderRow
        ? table.displayData.map((row, index) =>
            renderRow(row as T, index, {
              focused: focusedRowIndex === index,
              ref: setRowRef(index),
              rowIndex: index,
            })
          )
        : children}
    </tbody>
  );
}

// ============================================================================
// ROW COMPONENT
// ============================================================================

export interface DataTableRowInternalProps extends DataTableRowProps {
  /** Whether this row has keyboard focus */
  focused?: boolean;
  /** Row index for keyboard navigation */
  rowIndex?: number;
}

const DataTableRowInner = React.forwardRef<HTMLTableRowElement, DataTableRowInternalProps>(
  function DataTableRowInner({ children, className, selected, focused, onClick, rowIndex }, ref) {
    return (
      <tr
        ref={ref}
        role="row"
        aria-selected={selected}
        aria-rowindex={rowIndex !== undefined ? rowIndex + 1 : undefined}
        tabIndex={focused ? 0 : -1}
        onClick={onClick}
        className={cn(
          'border-b transition-colors hover:bg-muted/50',
          selected && 'bg-muted',
          focused && 'ring-2 ring-inset ring-blue-500 outline-none',
          onClick && 'cursor-pointer',
          className
        )}
      >
        {children}
      </tr>
    );
  }
);

function DataTableRow({ children, className, selected, onClick }: DataTableRowProps) {
  return (
    <DataTableRowInner
      className={className}
      selected={selected}
      onClick={onClick}
    >
      {children}
    </DataTableRowInner>
  );
}

// ============================================================================
// CELL COMPONENT
// ============================================================================

function DataTableCell({ children, className, align = 'left' }: DataTableCellProps) {
  return (
    <td
      role="cell"
      className={cn(
        'px-4 py-3',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        className
      )}
    >
      {children}
    </td>
  );
}

// ============================================================================
// PAGINATION COMPONENT
// ============================================================================

function DataTablePagination<T>({
  className,
  showPageSize = true,
  showPageInfo = true,
  showPageNumbers = true,
}: DataTablePaginationProps) {
  const { table } = useDataTableContext<T>();
  const { pagination } = table;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      {/* Left side - page size selector */}
      <div className="flex items-center gap-4">
        {showPageSize && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <select
              aria-label="Rows per page"
              value={pagination.pageSize}
              onChange={(e) => pagination.setPageSize(Number(e.target.value))}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              {pagination.pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {showPageInfo && (
          <span className="text-sm text-muted-foreground">
            {pagination.startIndex + 1}-{pagination.endIndex} of {pagination.totalItems}
          </span>
        )}
      </div>

      {/* Right side - pagination controls */}
      <nav aria-label="Table pagination" className="flex items-center gap-1">
        <button
          aria-label="First page"
          onClick={pagination.firstPage}
          disabled={pagination.isFirstPage}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          aria-label="Previous page"
          onClick={pagination.previousPage}
          disabled={!pagination.hasPreviousPage}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {showPageNumbers && (
          <div className="flex items-center gap-1 px-2">
            {pagination.pageRange.map((page) => (
              <button
                key={page}
                aria-label={`Page ${page}`}
                aria-current={page === pagination.currentPage ? 'page' : undefined}
                onClick={() => pagination.setPage(page)}
                className={cn(
                  'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium',
                  page === pagination.currentPage
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                {page}
              </button>
            ))}
          </div>
        )}

        <button
          aria-label="Next page"
          onClick={pagination.nextPage}
          disabled={!pagination.hasNextPage}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          aria-label="Last page"
          onClick={pagination.lastPage}
          disabled={pagination.isLastPage}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

export interface DataTableEmptyProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function DataTableEmpty({
  icon,
  title = 'No data',
  description = 'There are no records to display.',
  action,
  className,
}: DataTableEmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ============================================================================
// EXPORT COMPOUND COMPONENT
// ============================================================================

export const DataTable = Object.assign(DataTableRoot, {
  Toolbar: DataTableToolbar,
  Container: DataTableContainer,
  Header: DataTableHeader,
  ColumnHeader: DataTableColumnHeader,
  SelectionHeader: DataTableSelectionHeader,
  Body: DataTableBody,
  Row: DataTableRow,
  /** Row variant that accepts `focused`, `ref`, and `rowIndex` props for keyboard navigation */
  FocusableRow: DataTableRowInner,
  Cell: DataTableCell,
  SelectionCell: DataTableSelectionCell,
  Pagination: DataTablePagination,
  Empty: DataTableEmpty,
});

// Types are exported inline with their interfaces
