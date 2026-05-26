'use client';

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface UseTablePaginationConfig {
  /** Initial page number (1-indexed) */
  initialPage?: number;
  /** Items per page */
  pageSize?: number;
  /** Total number of items (for server-side pagination) */
  totalItems?: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
}

export interface UseTablePaginationReturn {
  // State
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;

  // Computed
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
  pageRange: number[];

  // Actions
  setPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;

  // Helpers
  pageSizeOptions: number[];
  paginateData: <T>(data: T[]) => T[];
}

// ============================================================================
// HOOK
// ============================================================================

export function useTablePagination(
  config: UseTablePaginationConfig = {}
): UseTablePaginationReturn {
  const {
    initialPage = 1,
    pageSize: initialPageSize = 10,
    totalItems: initialTotalItems = 0,
    pageSizeOptions = [10, 25, 50, 100],
    onPageChange,
    onPageSizeChange,
  } = config;

  // State
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(initialTotalItems);

  // Computed values
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize]
  );

  const startIndex = useMemo(
    () => (currentPage - 1) * pageSize,
    [currentPage, pageSize]
  );

  const endIndex = useMemo(
    () => Math.min(startIndex + pageSize, totalItems),
    [startIndex, pageSize, totalItems]
  );

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  // Generate page range for pagination UI (show 5 pages around current)
  const pageRange = useMemo(() => {
    const range: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    // Adjust start if we're near the end
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  }, [currentPage, totalPages]);

  // Actions
  const setPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
      onPageChange?.(validPage);
    },
    [totalPages, onPageChange]
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage(currentPage + 1);
    }
  }, [currentPage, hasNextPage, setPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPage(currentPage - 1);
    }
  }, [currentPage, hasPreviousPage, setPage]);

  const firstPage = useCallback(() => {
    setPage(1);
  }, [setPage]);

  const lastPage = useCallback(() => {
    setPage(totalPages);
  }, [setPage, totalPages]);

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size);
      // Reset to first page when page size changes
      setCurrentPage(1);
      onPageSizeChange?.(size);
      onPageChange?.(1);
    },
    [onPageSizeChange, onPageChange]
  );

  // Helper to paginate client-side data
  const paginateData = useCallback(
    <T>(data: T[]): T[] => {
      return data.slice(startIndex, startIndex + pageSize);
    },
    [startIndex, pageSize]
  );

  return {
    // State
    currentPage,
    pageSize,
    totalItems,
    totalPages,

    // Computed
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    isFirstPage,
    isLastPage,
    pageRange,

    // Actions
    setPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    setTotalItems,

    // Helpers
    pageSizeOptions,
    paginateData,
  };
}
