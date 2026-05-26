'use client';

import { useQuery } from '@tanstack/react-query';
import { extractErrorMessage } from '@/lib/utils';

export interface UseEntityFetchConfig<T> {
  /** Unique query key prefix, e.g. 'hrpayroll-loans' */
  queryKey: string;
  /** Entity ID to fetch */
  id: number | string;
  /** Fetch function that takes a numeric ID */
  fetchFn: (id: number) => Promise<T>;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
  /** Custom error message prefix */
  errorMessage?: string;
}

export interface UseEntityFetchReturn<T> {
  entity: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for fetching a single entity by ID using TanStack Query.
 * Replaces the old useState+useCallback+useEffect pattern for detail/edit pages.
 *
 * Usage:
 * ```ts
 * const { entity, loading, error } = useEntityFetch({
 *   queryKey: 'hrpayroll-loans',
 *   id: loanId,
 *   fetchFn: loansApi.get,
 * });
 * ```
 */
export function useEntityFetch<T>(config: UseEntityFetchConfig<T>): UseEntityFetchReturn<T> {
  const { queryKey, id, fetchFn, enabled = true, errorMessage = 'Failed to load' } = config;
  const numId = typeof id === 'string' ? parseInt(id) : id;

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: [queryKey, numId],
    queryFn: () => fetchFn(numId),
    enabled: enabled && !!numId && !isNaN(numId),
  });

  const error = fetchError ? extractErrorMessage(fetchError, errorMessage) : null;

  return {
    entity: data ?? null,
    loading: isLoading,
    error,
  };
}
