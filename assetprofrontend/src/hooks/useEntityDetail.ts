'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { extractErrorMessage } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface UseEntityDetailConfig<T extends { id: string | number }> {
  basePath: string;
  entities: T[];
  fetchDetail: (id: number) => Promise<T>;
  onError?: (error: string) => void;
}

export interface UseEntityDetailReturn<T> {
  selectedEntity: T | null;
  detailLoading: boolean;
  viewId: string | null;
  openDetail: (id: number) => void;
  closeDetail: () => void;
  handleEntitySelect: (entity: T) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useEntityDetail<T extends { id: string | number }>(
  config: UseEntityDetailConfig<T>
): UseEntityDetailReturn<T> {
  const { basePath, entities, fetchDetail, onError } = config;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Stabilise fetchDetail/onError in a ref so they never cause effect re-runs
  const fetchDetailRef = useRef(fetchDetail);
  fetchDetailRef.current = fetchDetail;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const viewId = searchParams.get('view');
  const [selectedEntity, setSelectedEntity] = useState<T | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load detail when ?view=id changes — fetchDetail excluded from deps via ref
  useEffect(() => {
    if (!viewId) {
      setSelectedEntity(null);
      return;
    }
    const id = parseInt(viewId);
    if (isNaN(id)) return;

    // Try optimistic lookup in list data first
    const existing = entities.find((e) => e.id === id);
    if (existing) {
      setSelectedEntity(existing);
    }

    // Always fetch full detail (list items may not have all fields)
    let cancelled = false;
    const load = async () => {
      try {
        setDetailLoading(true);
        const data = await fetchDetailRef.current(id);
        if (!cancelled) setSelectedEntity(data);
      } catch (err) {
        console.error(`Failed to fetch ${basePath} detail:`, err);
        if (!cancelled) {
          onErrorRef.current?.(extractErrorMessage(err, 'Failed to load details'));
          // Don't auto-redirect on error — let the caller decide
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [viewId, basePath]); // fetchDetail/onError/router deliberately excluded — stabilised via refs

  const openDetail = useCallback(
    (id: number) => {
      router.push(`${basePath}?view=${id}`, { scroll: false });
    },
    [router, basePath]
  );

  const closeDetail = useCallback(() => {
    router.push(basePath, { scroll: false });
  }, [router, basePath]);

  const handleEntitySelect = useCallback(
    async (entity: T) => {
      // Immediately show the entity (optimistic, avoids blink)
      setSelectedEntity(entity);
      router.replace(`${basePath}?view=${entity.id}`, { scroll: false });

      // Fetch full detail in background
      try {
        setDetailLoading(true);
        const data = await fetchDetailRef.current(Number(entity.id));
        setSelectedEntity(data);
      } catch (err) {
        console.error(`Failed to fetch ${basePath} detail:`, err);
        onErrorRef.current?.(extractErrorMessage(err, 'Failed to load details'));
      } finally {
        setDetailLoading(false);
      }
    },
    [router, basePath]
  );

  return {
    selectedEntity,
    detailLoading,
    viewId,
    openDetail,
    closeDetail,
    handleEntitySelect,
  };
}
