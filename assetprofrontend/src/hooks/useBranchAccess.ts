'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  companyContextApi,
  type BranchDetails,
  type EmployeeBranchesResponse,
} from '@/lib/api/core';

// ============================================================================
// TYPES
// ============================================================================

export interface UseBranchAccessReturn {
  /** All branches the employee has access to */
  branches: BranchDetails[];
  /** Currently selected branch ID */
  selectedBranchId: number | null;
  /** Currently selected branch object */
  selectedBranch: BranchDetails | null;
  /** True if employee has only 1 branch (auto-selected, hide selector) */
  hasSingleBranch: boolean;
  /** Loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Change the selected branch */
  setSelectedBranchId: (branchId: number | null) => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for branch access on transaction forms.
 *
 * - Fetches the employee's assigned branches from GET /core/context/my-branches
 * - If single branch: auto-selects it, hasSingleBranch = true (hide dropdown)
 * - If multiple branches: hasSingleBranch = false (show dropdown as first form field)
 *
 * Usage:
 * ```tsx
 * const { branches, selectedBranchId, setSelectedBranchId, hasSingleBranch, loading } = useBranchAccess();
 *
 * // In JSX:
 * {!hasSingleBranch && (
 *   <BranchSelector
 *     branches={branches}
 *     value={selectedBranchId}
 *     onChange={setSelectedBranchId}
 *   />
 * )}
 * ```
 */
export function useBranchAccess(): UseBranchAccessReturn {
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [hasSingleBranch, setHasSingleBranch] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data: EmployeeBranchesResponse = await companyContextApi.getMyBranches();
      setBranches(data.branches);
      setHasSingleBranch(data.hasSingleBranch);

      // Auto-select default branch
      if (data.defaultBranchId) {
        setSelectedBranchId(data.defaultBranchId);
      } else if (data.branches.length === 1) {
        setSelectedBranchId(data.branches[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load branches';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || null;

  return {
    branches,
    selectedBranchId,
    selectedBranch,
    hasSingleBranch,
    loading,
    error,
    setSelectedBranchId,
  };
}
