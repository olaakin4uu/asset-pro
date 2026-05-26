'use client';

import { useState } from 'react';
import {
  Check,
  X,
  RotateCcw,
  Send,
  Clock,
  AlertCircle,
  ChevronDown,
  MessageSquare,
  Shield,
  Info,
} from 'lucide-react';
import { approvalActionsApi } from '@/lib/api/approvals';
import type { ApprovalStatusRecord, ApprovalStatus } from '@/types/approvals';
import { cn, extractErrorMessage } from '@/lib/utils';
import { useIsSuperAdmin } from '@/hooks/usePermission';
import { SuperAdminApprovalModal } from './SuperAdminApprovalModal';

// ============================================================================
// APPROVAL STATUS BADGE
// ============================================================================

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
  className?: string;
}

export function ApprovalStatusBadge({ status, className }: ApprovalStatusBadgeProps) {
  const config: Record<ApprovalStatus, { label: string; icon: typeof Check; color: string }> = {
    draft: {
      label: 'Draft',
      icon: Clock,
      color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    },
    submitted: {
      label: 'Submitted',
      icon: Send,
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    },
    pending: {
      label: 'Pending Approval',
      icon: Clock,
      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    },
    approved: {
      label: 'Approved',
      icon: Check,
      color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    },
    rejected: {
      label: 'Rejected',
      icon: X,
      color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    },
    returned: {
      label: 'Returned',
      icon: RotateCcw,
      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    },
    completed: {
      label: 'Completed',
      icon: Check,
      color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    },
  };

  const { label, icon: Icon, color } = config[status] || config.draft;

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', color, className)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

// ============================================================================
// APPROVAL ACTIONS BUTTONS
// ============================================================================

// Expense Request is excluded from Super Admin override
const EXCLUDED_FROM_SA_OVERRIDE = ['expense_requests', 'expense-requests'];

interface ApprovalActionsProps {
  approvalStatus: ApprovalStatusRecord | null;
  entityType: string;
  entityId: number;
  entityLabel?: string;
  canApprove?: boolean;
  onSubmit?: () => Promise<void>;
  onActionComplete?: (newStatus: ApprovalStatusRecord) => void;
  className?: string;
}

export function ApprovalActions({
  approvalStatus,
  entityType,
  entityId,
  entityLabel = 'Document',
  canApprove = true,
  onSubmit,
  onActionComplete,
  className,
}: ApprovalActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [comment, setComment] = useState('');
  const [showSAModal, setShowSAModal] = useState(false);

  const isSuperAdmin = useIsSuperAdmin();
  const showSAButton =
    isSuperAdmin &&
    !EXCLUDED_FROM_SA_OVERRIDE.includes(entityType) &&
    !!approvalStatus &&
    (approvalStatus.status === 'pending' || approvalStatus.status === 'submitted');

  const handleSubmitForApproval = async () => {
    if (!onSubmit) return;
    setLoading(true);
    try {
      await onSubmit();
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'return') => {
    if (!approvalStatus) return;

    setLoading(true);
    setError(null);
    try {
      const result = await approvalActionsApi.action(approvalStatus.id, {
        action,
        comment: comment || undefined,
      });
      setShowCommentDialog(null);
      setComment('');
      onActionComplete?.(result);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, `Failed to ${action}`));
      setShowCommentDialog(null);
      setComment('');
    } finally {
      setLoading(false);
    }
  };

  // No approval status yet - show submit button
  if (!approvalStatus) {
    if (!onSubmit) return null;

    return (
      <button
        onClick={handleSubmitForApproval}
        disabled={loading}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50',
          className
        )}
      >
        <Send className="h-4 w-4" />
        {loading ? 'Submitting...' : 'Submit for Approval'}
      </button>
    );
  }

  // Show status and actions based on current state
  const status = approvalStatus.status;

  // Draft status - show submit button
  if (status === 'draft') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <ApprovalStatusBadge status={status} />
        {onSubmit && (
          <button
            onClick={handleSubmitForApproval}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>
        )}
      </div>
    );
  }

  // Pending approval - show approve/reject/return buttons if user can approve
  if (status === 'pending' || status === 'submitted') {
    const currentStep = approvalStatus.currentStep;
    const stepLabel = currentStep?.name || 'Approval';
    const roleName = currentStep?.role?.name;

    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-3">
          <ApprovalStatusBadge status={status} />
          <span className="text-sm text-muted-foreground">
            Step {approvalStatus.currentStepNumber}: {stepLabel}
          </span>
        </div>

        {/* Inline error from a failed action */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Info for users who are not the designated approver */}
        {!canApprove && (
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-700 dark:text-blue-400">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              You are not assigned to approve this step.
              {roleName && <> This step requires approval from <strong>{roleName}</strong>.</>}
            </span>
          </div>
        )}

        {canApprove && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCommentDialog('approve')}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Approve
            </button>
            <button
              onClick={() => setShowCommentDialog('reject')}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Reject
            </button>
            <button
              onClick={() => setShowCommentDialog('return')}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Return
            </button>
          </div>
        )}

        {/* Super Admin Actions */}
        {showSAButton && (
          <div className="pt-1 border-t border-dashed border-amber-300 dark:border-amber-700 mt-1">
            <button
              onClick={() => setShowSAModal(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50 transition-colors"
            >
              <Shield className="h-4 w-4" />
              Super Admin Actions
            </button>
          </div>
        )}

        {/* Super Admin Modal */}
        {showSAModal && approvalStatus && (
          <SuperAdminApprovalModal
            approvalStatus={approvalStatus}
            entityLabel={entityLabel}
            onClose={() => setShowSAModal(false)}
            onActionComplete={(result) => {
              setShowSAModal(false);
              onActionComplete?.(result);
            }}
          />
        )}

        {/* Comment Dialog */}
        {showCommentDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
              <h3 className="text-lg font-semibold mb-4 capitalize">{showCommentDialog} Document</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Comment {showCommentDialog !== 'approve' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={`Enter ${showCommentDialog === 'approve' ? 'optional' : 'required'} comment...`}
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2"
                  required={showCommentDialog !== 'approve'}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCommentDialog(null);
                    setComment('');
                  }}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(showCommentDialog)}
                  disabled={loading || (showCommentDialog !== 'approve' && !comment.trim())}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50',
                    showCommentDialog === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : showCommentDialog === 'reject'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-orange-600 hover:bg-orange-700'
                  )}
                >
                  {loading ? 'Processing...' : `Confirm ${showCommentDialog}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Final states - just show the badge
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <ApprovalStatusBadge status={status} />
      {status === 'rejected' && approvalStatus.actions?.length > 0 && (
        <span className="text-sm text-muted-foreground">
          {approvalStatus.actions[approvalStatus.actions.length - 1].comment}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// APPROVAL TIMELINE
// ============================================================================

interface ApprovalTimelineProps {
  approvalStatus: ApprovalStatusRecord | null;
  className?: string;
}

export function ApprovalTimeline({ approvalStatus, className }: ApprovalTimelineProps) {
  if (!approvalStatus || !approvalStatus.actions || approvalStatus.actions.length === 0) {
    return null;
  }

  const actionConfig: Record<string, { icon: typeof Check; color: string }> = {
    submit: { icon: Send, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    approve: { icon: Check, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    reject: { icon: X, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
    return: { icon: RotateCcw, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
    escalate: { icon: AlertCircle, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  };

  return (
    <div className={cn('space-y-4', className)}>
      <h4 className="text-sm font-semibold">Approval History</h4>
      <div className="space-y-3">
        {approvalStatus.actions.map((action, idx) => {
          const config = actionConfig[action.action] || actionConfig.submit;
          const Icon = config.icon;

          return (
            <div key={action.id} className="flex gap-3">
              <div className={cn('p-2 rounded-full', config.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{action.userName}</span>
                  <span className="text-xs text-muted-foreground capitalize">{action.action}</span>
                  {action.stepNumber && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Step {action.stepNumber}</span>
                  )}
                </div>
                {action.comment && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-start gap-1">
                    <MessageSquare className="h-3 w-3 mt-1 shrink-0" />
                    {action.comment}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(action.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// APPROVAL INFO CARD
// ============================================================================

interface ApprovalInfoCardProps {
  approvalStatus: ApprovalStatusRecord | null;
  entityType: string;
  entityId: number;
  entityLabel?: string;
  canApprove?: boolean;
  onSubmit?: () => Promise<void>;
  onActionComplete?: (newStatus: ApprovalStatusRecord) => void;
  className?: string;
}

export function ApprovalInfoCard({
  approvalStatus,
  entityType,
  entityId,
  entityLabel = 'Document',
  canApprove = true,
  onSubmit,
  onActionComplete,
  className,
}: ApprovalInfoCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-6', className)}>
      <h3 className="text-lg font-semibold mb-4">Approval Status</h3>

      <ApprovalActions
        approvalStatus={approvalStatus}
        entityType={entityType}
        entityId={entityId}
        entityLabel={entityLabel}
        canApprove={canApprove}
        onSubmit={onSubmit}
        onActionComplete={onActionComplete}
      />

      {approvalStatus && (
        <>
          {/* Current Step Info */}
          {(approvalStatus.status === 'pending' || approvalStatus.status === 'submitted') &&
            approvalStatus.currentStep && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Current Step</p>
                <p className="text-sm text-muted-foreground">
                  {approvalStatus.currentStepNumber}. {approvalStatus.currentStep.name}
                </p>
                {approvalStatus.currentStep.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {approvalStatus.currentStep.description}
                  </p>
                )}
              </div>
            )}

          {/* Timeline */}
          <div className="mt-6">
            <ApprovalTimeline approvalStatus={approvalStatus} />
          </div>
        </>
      )}
    </div>
  );
}
