'use client';

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ColumnDefinition<T> {
  /** Unique column ID (usually matches the data key) */
  id: string;
  /** Column header label */
  header: string;
  /** Data accessor key */
  accessorKey?: keyof T;
  /** Custom accessor function */
  accessorFn?: (row: T) => unknown;
  /** Column width (px, %, or 'auto') */
  width?: number | string;
  /** Minimum width in pixels */
  minWidth?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Whether column is visible by default */
  visible?: boolean;
  /** Whether column can be hidden */
  hideable?: boolean;
  /** Whether column can be resized */
  resizable?: boolean;
  /** Whether column is sticky (left/right) */
  sticky?: 'left' | 'right';
  /** Column alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom cell renderer */
  cell?: (value: unknown, row: T) => React.ReactNode;
  /** Custom header renderer */
  headerCell?: () => React.ReactNode;
  /** Enable column pinning */
  pinnable?: boolean;
}

export interface UseTableColumnsConfig<T> {
  /** Column definitions */
  columns: ColumnDefinition<T>[];
  /** Initially hidden columns */
  initialHidden?: string[];
  /** Column order (by ID) */
  initialOrder?: string[];
  /** Initially pinned columns */
  initialPinned?: { left?: string[]; right?: string[] };
  /** Persist column state to localStorage */
  persistKey?: string;
  /** Callback when visibility changes */
  onVisibilityChange?: (visibleIds: string[]) => void;
  /** Callback when order changes */
  onOrderChange?: (order: string[]) => void;
}

export interface UseTableColumnsReturn<T> {
  // State
  columns: ColumnDefinition<T>[];
  visibleColumns: ColumnDefinition<T>[];
  hiddenColumnIds: Set<string>;
  columnOrder: string[];
  pinnedColumns: { left: string[]; right: string[] };

  // Actions
  showColumn: (columnId: string) => void;
  hideColumn: (columnId: string) => void;
  toggleColumn: (columnId: string) => void;
  showAllColumns: () => void;
  hideAllColumns: () => void;
  setColumnOrder: (order: string[]) => void;
  moveColumn: (columnId: string, direction: 'left' | 'right') => void;
  pinColumn: (columnId: string, position: 'left' | 'right' | null) => void;
  resetColumns: () => void;

  // Helpers
  isColumnVisible: (columnId: string) => boolean;
  isColumnPinned: (columnId: string) => 'left' | 'right' | null;
  getColumnById: (columnId: string) => ColumnDefinition<T> | undefined;
  hideableColumns: ColumnDefinition<T>[];
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

interface PersistedState {
  hidden: string[];
  order: string[];
  pinned: { left: string[]; right: string[] };
}

function loadPersistedState(key: string): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`table-columns-${key}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function savePersistedState(key: string, state: PersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`table-columns-${key}`, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useTableColumns<T>(
  config: UseTableColumnsConfig<T>
): UseTableColumnsReturn<T> {
  const {
    columns,
    initialHidden = [],
    initialOrder,
    initialPinned = { left: [], right: [] },
    persistKey,
    onVisibilityChange,
    onOrderChange,
  } = config;

  // Load persisted state
  const persistedState = useMemo(
    () => (persistKey ? loadPersistedState(persistKey) : null),
    [persistKey]
  );

  // Initialize state from persisted or defaults
  const [hiddenColumnIds, setHiddenColumnIds] = useState<Set<string>>(
    () => new Set(persistedState?.hidden ?? initialHidden)
  );

  const [columnOrder, setColumnOrderState] = useState<string[]>(() => {
    const order = persistedState?.order ?? initialOrder;
    if (order) return order;
    // Default order from column definitions
    return columns.map((col) => col.id);
  });

  const [pinnedColumns, setPinnedColumns] = useState<{ left: string[]; right: string[] }>(
    () => ({
      left: persistedState?.pinned?.left ?? initialPinned.left ?? [],
      right: persistedState?.pinned?.right ?? initialPinned.right ?? [],
    })
  );

  // Save state when it changes
  const persistState = useCallback(() => {
    if (!persistKey) return;
    savePersistedState(persistKey, {
      hidden: Array.from(hiddenColumnIds),
      order: columnOrder,
      pinned: pinnedColumns,
    });
  }, [persistKey, hiddenColumnIds, columnOrder, pinnedColumns]);

  // Visible columns computed from order and visibility
  const visibleColumns = useMemo(() => {
    const ordered = columnOrder
      .map((id) => columns.find((col) => col.id === id))
      .filter((col): col is ColumnDefinition<T> => col != null);

    // Add any columns not in order
    const orderSet = new Set(columnOrder);
    const remaining = columns.filter((col) => !orderSet.has(col.id));

    return [...ordered, ...remaining].filter(
      (col) => !hiddenColumnIds.has(col.id) && col.visible !== false
    );
  }, [columns, columnOrder, hiddenColumnIds]);

  // Hideable columns (for column toggle UI)
  const hideableColumns = useMemo(
    () => columns.filter((col) => col.hideable !== false),
    [columns]
  );

  // Actions
  const showColumn = useCallback(
    (columnId: string) => {
      setHiddenColumnIds((prev) => {
        const next = new Set(prev);
        next.delete(columnId);
        const visibleIds = columns
          .filter((col) => !next.has(col.id))
          .map((col) => col.id);
        onVisibilityChange?.(visibleIds);
        return next;
      });
      persistState();
    },
    [columns, onVisibilityChange, persistState]
  );

  const hideColumn = useCallback(
    (columnId: string) => {
      const column = columns.find((col) => col.id === columnId);
      if (column?.hideable === false) return;

      setHiddenColumnIds((prev) => {
        const next = new Set(prev);
        next.add(columnId);
        const visibleIds = columns
          .filter((col) => !next.has(col.id))
          .map((col) => col.id);
        onVisibilityChange?.(visibleIds);
        return next;
      });
      persistState();
    },
    [columns, onVisibilityChange, persistState]
  );

  const toggleColumn = useCallback(
    (columnId: string) => {
      if (hiddenColumnIds.has(columnId)) {
        showColumn(columnId);
      } else {
        hideColumn(columnId);
      }
    },
    [hiddenColumnIds, showColumn, hideColumn]
  );

  const showAllColumns = useCallback(() => {
    setHiddenColumnIds(new Set());
    onVisibilityChange?.(columns.map((col) => col.id));
    persistState();
  }, [columns, onVisibilityChange, persistState]);

  const hideAllColumns = useCallback(() => {
    const hideableIds = columns
      .filter((col) => col.hideable !== false)
      .map((col) => col.id);
    setHiddenColumnIds(new Set(hideableIds));
    const visibleIds = columns
      .filter((col) => col.hideable === false)
      .map((col) => col.id);
    onVisibilityChange?.(visibleIds);
    persistState();
  }, [columns, onVisibilityChange, persistState]);

  const setColumnOrder = useCallback(
    (order: string[]) => {
      setColumnOrderState(order);
      onOrderChange?.(order);
      persistState();
    },
    [onOrderChange, persistState]
  );

  const moveColumn = useCallback(
    (columnId: string, direction: 'left' | 'right') => {
      setColumnOrderState((prev) => {
        const index = prev.indexOf(columnId);
        if (index === -1) return prev;

        const newIndex = direction === 'left' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= prev.length) return prev;

        const next = [...prev];
        [next[index], next[newIndex]] = [next[newIndex], next[index]];
        onOrderChange?.(next);
        return next;
      });
      persistState();
    },
    [onOrderChange, persistState]
  );

  const pinColumn = useCallback(
    (columnId: string, position: 'left' | 'right' | null) => {
      setPinnedColumns((prev) => {
        const next = {
          left: prev.left.filter((id) => id !== columnId),
          right: prev.right.filter((id) => id !== columnId),
        };

        if (position === 'left') {
          next.left.push(columnId);
        } else if (position === 'right') {
          next.right.push(columnId);
        }

        return next;
      });
      persistState();
    },
    [persistState]
  );

  const resetColumns = useCallback(() => {
    const defaultHidden = columns
      .filter((col) => col.visible === false)
      .map((col) => col.id);
    setHiddenColumnIds(new Set(defaultHidden));
    setColumnOrderState(columns.map((col) => col.id));
    setPinnedColumns({ left: [], right: [] });
    onVisibilityChange?.(columns.filter((col) => col.visible !== false).map((col) => col.id));
    onOrderChange?.(columns.map((col) => col.id));
    persistState();
  }, [columns, onVisibilityChange, onOrderChange, persistState]);

  // Helpers
  const isColumnVisible = useCallback(
    (columnId: string) => !hiddenColumnIds.has(columnId),
    [hiddenColumnIds]
  );

  const isColumnPinned = useCallback(
    (columnId: string): 'left' | 'right' | null => {
      if (pinnedColumns.left.includes(columnId)) return 'left';
      if (pinnedColumns.right.includes(columnId)) return 'right';
      return null;
    },
    [pinnedColumns]
  );

  const getColumnById = useCallback(
    (columnId: string) => columns.find((col) => col.id === columnId),
    [columns]
  );

  return {
    // State
    columns,
    visibleColumns,
    hiddenColumnIds,
    columnOrder,
    pinnedColumns,

    // Actions
    showColumn,
    hideColumn,
    toggleColumn,
    showAllColumns,
    hideAllColumns,
    setColumnOrder,
    moveColumn,
    pinColumn,
    resetColumns,

    // Helpers
    isColumnVisible,
    isColumnPinned,
    getColumnById,
    hideableColumns,
  };
}
