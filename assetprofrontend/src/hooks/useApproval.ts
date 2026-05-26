import { useState, useEffect, useCallback } from 'react';
import { approvalActionsApi } from '@/lib/api/approvals';
import { extractErrorMessage } from '@/lib/utils';
import type { ApprovalStatusRecord, ApprovalStatus } from '@/types/approvals';

// ============================================================================
// TYPES
// ============================================================================

export interface UseApprovalOptions {
  entityType: string;
  entityId: number | null;
  /** Auto-fetch approval status on mount */
  autoFetch?: boolean;
  /** Called when approval status changes */
  onStatusChange?: (status: ApprovalStatusRecord | null) => void;
}

export interface UseApprovalReturn {
  /** Current approval status record */
  approvalStatus: ApprovalStatusRecord | null;
  /** Whether approval status is loading */
  loading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** The current approval status string */
  status: ApprovalStatus | null;
  /** Whether the entity is in draft status */
  isDraft: boolean;
  /** Whether the entity is pending approval */
  isPending: boolean;
  /** Whether the entity is approved */
  isApproved: boolean;
  /** Whether the entity is rejected */
  isRejected: boolean;
  /** Whether the entity was returned for revision */
  isReturned: boolean;
  /** Whether the entity is completed */
  isCompleted: boolean;
  /** Whether an action is in progress */
  actionLoading: boolean;
  /** Refresh the approval status */
  refresh: () => Promise<void>;
  /** Submit the entity for approval */
  submit: () => Promise<ApprovalStatusRecord>;
  /** Approve the entity (requires approvalStatus) */
  approve: (comment?: string) => Promise<ApprovalStatusRecord>;
  /** Reject the entity (requires approvalStatus) */
  reject: (comment: string) => Promise<ApprovalStatusRecord>;
  /** Return the entity for revision (requires approvalStatus) */
  returnForRevision: (comment: string) => Promise<ApprovalStatusRecord>;
  /** Cancel the approval (requires approvalStatus) */
  cancel: (reason?: string) => Promise<void>;
  /** Check if the current user can take an approval action */
  canTakeAction: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useApproval({
  entityType,
  entityId,
  autoFetch = true,
  onStatusChange,
}: UseApprovalOptions): UseApprovalReturn {
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatusRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch approval status
  const fetchStatus = useCallback(async () => {
    if (!entityId) {
      setApprovalStatus(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const status = await approvalActionsApi.getStatus(entityType, entityId);
      setApprovalStatus(status);
      onStatusChange?.(status);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to fetch approval status'));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, onStatusChange]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && entityId) {
      fetchStatus();
    }
  }, [autoFetch, entityId, fetchStatus]);

  // Submit for approval
  const submit = useCallback(async () => {
    if (!entityId) throw new Error('Entity ID is required');

    setActionLoading(true);
    try {
      const result = await approvalActionsApi.submit({
        entityType,
        entityId,
      });
      setApprovalStatus(result);
      onStatusChange?.(result);
      return result;
    } finally {
      setActionLoading(false);
    }
  }, [entityType, entityId, onStatusChange]);

  // Approve
  const approve = useCallback(
    async (comment?: string) => {
      if (!approvalStatus) throw new Error('No approval status');

      setActionLoading(true);
      try {
        const result = await approvalActionsApi.action(approvalStatus.id, {
          action: 'approve',
          comment,
        });
        setApprovalStatus(result);
        onStatusChange?.(result);
        return result;
      } finally {
        setActionLoading(false);
      }
    },
    [approvalStatus, onStatusChange]
  );

  // Reject
  const reject = useCallback(
    async (comment: string) => {
      if (!approvalStatus) throw new Error('No approval status');
      if (!comment.trim()) throw new Error('Comment is required for rejection');

      setActionLoading(true);
      try {
        const result = await approvalActionsApi.action(approvalStatus.id, {
          action: 'reject',
          comment,
        });
        setApprovalStatus(result);
        onStatusChange?.(result);
        return result;
      } finally {
        setActionLoading(false);
      }
    },
    [approvalStatus, onStatusChange]
  );

  // Return for revision
  const returnForRevision = useCallback(
    async (comment: string) => {
      if (!approvalStatus) throw new Error('No approval status');
      if (!comment.trim()) throw new Error('Comment is required when returning');

      setActionLoading(true);
      try {
        const result = await approvalActionsApi.action(approvalStatus.id, {
          action: 'return',
          comment,
        });
        setApprovalStatus(result);
        onStatusChange?.(result);
        return result;
      } finally {
        setActionLoading(false);
      }
    },
    [approvalStatus, onStatusChange]
  );

  // Cancel
  const cancel = useCallback(
    async (reason?: string) => {
      if (!approvalStatus) throw new Error('No approval status');

      setActionLoading(true);
      try {
        await approvalActionsApi.cancel(approvalStatus.id, reason);
        await fetchStatus();
      } finally {
        setActionLoading(false);
      }
    },
    [approvalStatus, fetchStatus]
  );

  // Derived state
  const status = approvalStatus?.status || null;
  const isDraft = status === 'draft' || status === null;
  const isPending = status === 'pending' || status === 'submitted';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const isReturned = status === 'returned';
  const isCompleted = status === 'completed';

  // TODO: This should check against the current user's permissions
  // For now, we'll assume the user can take action if they have the page open
  const canTakeAction = isPending;

  return {
    approvalStatus,
    loading,
    error,
    status,
    isDraft,
    isPending,
    isApproved,
    isRejected,
    isReturned,
    isCompleted,
    actionLoading,
    refresh: fetchStatus,
    submit,
    approve,
    reject,
    returnForRevision,
    cancel,
    canTakeAction,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the display color for an approval status
 */
export function getApprovalStatusColor(status: ApprovalStatus | null): string {
  const colors: Record<ApprovalStatus, string> = {
    draft: 'gray',
    submitted: 'blue',
    pending: 'amber',
    approved: 'green',
    rejected: 'red',
    returned: 'orange',
    completed: 'emerald',
  };
  return status ? colors[status] : 'gray';
}

/**
 * Get the display label for an approval status
 */
export function getApprovalStatusLabel(status: ApprovalStatus | null): string {
  const labels: Record<ApprovalStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    pending: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    returned: 'Returned',
    completed: 'Completed',
  };
  return status ? labels[status] : 'Draft';
}
