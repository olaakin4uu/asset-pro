'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { extractErrorMessage } from '@/lib/utils';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  totalPages?: number;
}

export interface UseEntityListConfig<TData, TStats = unknown, TFilters = Record<string, unknown>> {
  /** Unique query key prefix, e.g. 'inventory-items' */
  queryKey: string;
  /** Fetch list function — receives merged filters + pagination */
  fetchList: (params: TFilters & { page: number; limit: number }) => Promise<PaginatedResponse<TData>>;
  /** Optional: fetch stats (separate query, cached independently) */
  fetchStats?: () => Promise<TStats>;
  /** Default filter values */
  defaultFilters?: TFilters;
  /** Items per page (default: 20) */
  limit?: number;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
}

export interface UseEntityListReturn<TData, TStats, TFilters> {
  // Data
  items: TData[];
  total: number;
  stats: TStats | null;
  // State
  loading: boolean;
  statsLoading: boolean;
  error: string | null;
  clearError: () => void;
  // Pagination
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  // Filters
  filters: TFilters;
  setFilters: (f: TFilters) => void;
  updateFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  resetFilters: () => void;
  // Actions
  refresh: () => void;
  refreshStats: () => void;
}

export function useEntityList<TData, TStats = unknown, TFilters = Record<string, unknown>>(
  config: UseEntityListConfig<TData, TStats, TFilters>,
): UseEntityListReturn<TData, TStats, TFilters> {
  const {
    queryKey,
    fetchList,
    fetchStats,
    defaultFilters = {} as TFilters,
    limit = 20,
    enabled = true,
  } = config;

  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFiltersState] = useState<TFilters>(defaultFilters);
  const [manualError, setManualError] = useState<string | null>(null);

  // List query
  const listQuery = useQuery({
    queryKey: [queryKey, 'list', filters, page],
    queryFn: async () => {
      const result = await fetchList({ ...filters, page, limit });
      return result;
    },
    enabled,
  });

  // Stats query (separate cache, doesn't re-fetch on filter/page change)
  const statsQuery = useQuery({
    queryKey: [queryKey, 'stats'],
    queryFn: fetchStats ?? (() => Promise.resolve(null as TStats)),
    enabled: enabled && !!fetchStats,
  });

  // Derive error from queries or manual error
  const error = useMemo(() => {
    if (manualError) return manualError;
    if (listQuery.error) return extractErrorMessage(listQuery.error, 'Failed to fetch data');
    if (statsQuery.error) return extractErrorMessage(statsQuery.error, 'Failed to fetch stats');
    return null;
  }, [manualError, listQuery.error, statsQuery.error]);

  const clearError = useCallback(() => {
    setManualError(null);
  }, []);

  const setFilters = useCallback((f: TFilters) => {
    setFiltersState(f);
    setPage(1); // Reset to page 1 on filter change
  }, []);

  const updateFilter = useCallback(<K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    setPage(1);
  }, [defaultFilters]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [queryKey, 'list'] });
  }, [queryClient, queryKey]);

  const refreshStats = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [queryKey, 'stats'] });
  }, [queryClient, queryKey]);

  const items = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    items,
    total,
    stats: statsQuery.data ?? null,
    loading: listQuery.isLoading,
    statsLoading: statsQuery.isLoading,
    error,
    clearError,
    page,
    setPage,
    totalPages,
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    refresh,
    refreshStats,
  };
}
