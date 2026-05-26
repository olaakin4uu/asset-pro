'use client';

import React, { useState } from 'react';
import { Clock, CheckCircle, XCircle, Send, RotateCcw, Pen, Shield, Info, User, Upload, SkipForward } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn, extractErrorMessage } from '@/lib/utils';
import { ApprovalCelebration } from './ApprovalCelebration';
import { approvalsApi } from '@/lib/api/approvals';
import { settingsApi } from '@/lib/api/settings';
import { useIsSuperAdmin } from '@/hooks/usePermission';
import { useAuthStore } from '@/store/authStore';
import { SuperAdminApprovalModal } from './SuperAdminApprovalModal';
import type { ApprovalAction as ApprovalTrailAction } from '@/types/approvals';

// ============================================================================
// TYPES
// ============================================================================

export interface ApprovalAction {
  id: string;
  label: string;
  icon?: React.ElementType;
  variant: 'primary' | 'success' | 'danger' | 'warning' | 'outline';
  requiresComment?: boolean;
  commentLabel?: string;
  confirmMessage?: string;
}

// Expense Request is excluded from Super Admin override
const EXCLUDED_FROM_SA_OVERRIDE = ['expense_requests', 'expense-requests'];

export interface ApprovalPanelConfig {
  /** Current entity status (e.g. 'draft', 'pending', 'approved') */
  status: string;
  /** Separate approval status if different from status */
  approvalStatus?: string;
  /** Display label for the entity type (e.g. "Order", "Requisition") */
  entityLabel: string;
  /** Entity type slug for fetching approval trail (e.g. 'purchase_orders') */
  entityType?: string;
  /** Entity ID for fetching approval trail */
  entityId?: number;
  /** Map of status → available actions */
  statusActions: Record<string, ApprovalAction[]>;
  /** Handler called with (actionId, comment?) */
  onAction: (actionId: string, comment?: string) => Promise<void>;
  /** Called after successful action */
  onActionComplete?: () => void;
  /** Approval details to display */
  approvalDetails?: {
    approvedAt?: string | null;
    approvedBy?: string | null;
    submittedAt?: string | null;
    rejectedAt?: string | null;
    rejectionReason?: string | null;
  };
}

// ============================================================================
// STYLES
// ============================================================================

const APPROVAL_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  submitted: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  pending_approval: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  pending_hod_approval: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  pending_audit_approval: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  pending_accountant_processing: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  pending_management_approval: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  pending_payment: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  returned: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  posted: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  paid: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  sent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  converted: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  calculated: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  reviewed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  processed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  voided: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const BUTTON_VARIANTS: Record<string, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  success: 'bg-green-600 text-white hover:bg-green-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  warning: 'bg-orange-600 text-white hover:bg-orange-700',
  outline: 'border hover:bg-muted',
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ApprovalPanel({ config }: { config: ApprovalPanelConfig }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<ApprovalAction | null>(null);
  const [comment, setComment] = useState('');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [celebration, setCelebration] = useState<{ message: string } | null>(null);
  const [showSAModal, setShowSAModal] = useState(false);

  const isSuperAdmin = useIsSuperAdmin();
  const currentUser = useAuthStore(s => s.user);

  // Fetch approval trail if entityType and entityId are provided
  const { data: approvalStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['approval-status', config.entityType, config.entityId],
    queryFn: () => approvalsApi.actions.getStatus(config.entityType!, config.entityId!),
    enabled: !!config.entityType && !!config.entityId && config.entityId > 0,
  });

  const displayStatus = config.approvalStatus || config.status;
  const allActions = config.statusActions[config.status] || [];

  // Approver visibility: backend tells us if current user can approve
  const currentStep = approvalStatus?.currentStep;
  const approverNames = currentStep?.approverNames ?? [];
  const isDesignatedApprover = approvalStatus?.canCurrentUserApprove ?? !approvalStatus; // default true if no approval flow

  // Only show action buttons to designated approvers (or if no approval flow is configured)
  const actions = isDesignatedApprover ? allActions : [];

  const isPendingStatus = displayStatus === 'pending' || displayStatus === 'submitted' ||
    displayStatus.startsWith('pending_');
  // Show SA button if entity is pending OR if the approval system still has incomplete steps
  const approvalSystemPending = approvalStatus?.status === 'pending' || approvalStatus?.status === 'submitted';
  const showSAButton =
    isSuperAdmin &&
    !!config.entityType &&
    !EXCLUDED_FROM_SA_OVERRIDE.includes(config.entityType) &&
    (isPendingStatus || approvalSystemPending) &&
    !!approvalStatus;

  const isApproveAction = (actionId: string) =>
    ['approve', 'confirm', 'post', 'complete'].includes(actionId);

  const handleDirectAction = async (action: ApprovalAction) => {
    if (action.requiresComment || action.confirmMessage) {
      setDialogAction(action);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await config.onAction(action.id);
      if (isApproveAction(action.id)) {
        setCelebration({ message: `${config.entityLabel} has been ${action.label.toLowerCase()}d` });
      }
      config.onActionComplete?.();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, `Failed to ${action.label.toLowerCase()}`));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!dialogAction) return;
    setLoading(true);
    setError(null);
    try {
      // Upload signature if provided
      if (signatureFile && isApproveAction(dialogAction.id)) {
        try {
          await settingsApi.uploadSignature(signatureFile);
        } catch { /* signature upload is optional — proceed with approval */ }
      }
      await config.onAction(dialogAction.id, comment || undefined);
      if (isApproveAction(dialogAction.id)) {
        setCelebration({ message: `${config.entityLabel} has been ${dialogAction.label.toLowerCase()}d` });
      }
      setDialogAction(null);
      setComment('');
      setSignatureFile(null);
      config.onActionComplete?.();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, `Failed to ${dialogAction.label.toLowerCase()}`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Celebration Overlay */}
      {celebration && (
        <ApprovalCelebration
          message={celebration.message}
          onClose={() => setCelebration(null)}
        />
      )}

      {/* Current Status Card */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Approval Status</h3>

        <div className="flex items-center gap-3 mb-4">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
            APPROVAL_STYLES[displayStatus] || APPROVAL_STYLES.draft
          )}>
            {(displayStatus === 'approved' || displayStatus === 'confirmed') ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            {formatStatusLabel(displayStatus)}
          </span>
          {config.approvalStatus && config.approvalStatus !== config.status && (
            <span className="text-sm text-muted-foreground">
              {config.entityLabel} Status: <span className="font-medium capitalize">{formatStatusLabel(config.status)}</span>
            </span>
          )}
        </div>

        {/* Step context — shown when document is pending */}
        {isPendingStatus && approvalStatus?.currentStep && (() => {
          const step = approvalStatus.currentStep;
          const displayNames = approverNames.length > 0 ? approverNames.join(', ') : step.role?.name;
          const hasActions = actions.length > 0;

          return hasActions ? (
            // User is the designated approver — confirmation banner
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 text-sm text-blue-700 dark:text-blue-400">
              <User className="h-4 w-4 shrink-0" />
              <span>
                {isSuperAdmin && !(currentStep?.approverIds ?? []).includes(currentUser?.employeeId ?? 0)
                  ? <><strong>Super Admin Override</strong> — You can approve on behalf of: <strong>{displayNames}</strong></>
                  : <><strong>Your action is required</strong> — Step {approvalStatus.currentStepNumber}: {step.name}</>}
              </span>
            </div>
          ) : (
            // User cannot act — tell them who is waiting to approve
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-400">
              <Clock className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Awaiting Step {approvalStatus.currentStepNumber}: <strong>{step.name}</strong>.
                {displayNames && <> Assigned to: <strong>{displayNames}</strong>.</>}
              </span>
            </div>
          );
        })()}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleDirectAction(action)}
                  disabled={loading}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50',
                    BUTTON_VARIANTS[action.variant]
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {loading ? 'Processing...' : action.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Super Admin Actions */}
        {showSAButton && (
          <div className={cn('pt-3 mt-1 border-t border-dashed border-amber-300 dark:border-amber-700', actions.length > 0 && 'mt-3')}>
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
            entityLabel={config.entityLabel}
            onClose={() => setShowSAModal(false)}
            onActionComplete={() => {
              setShowSAModal(false);
              setCelebration({ message: `${config.entityLabel} has been approved` });
              refetchStatus();
              config.onActionComplete?.();
            }}
          />
        )}

        {/* Approved info when no actions available */}
        {actions.length === 0 && (displayStatus === 'approved' || displayStatus === 'confirmed') && config.approvalDetails?.approvedAt && (
          <div className="text-sm text-muted-foreground">
            Approved on {formatDate(config.approvalDetails.approvedAt)}
            {config.approvalDetails.approvedBy && ` by ${config.approvalDetails.approvedBy}`}
          </div>
        )}
      </div>

      {/* Approval Details */}
      {(config.approvalDetails?.approvedAt || config.approvalDetails?.submittedAt || config.approvalDetails?.rejectionReason) && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Approval Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {config.approvalDetails.submittedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Submitted Date</p>
                <p className="font-medium">{formatDate(config.approvalDetails.submittedAt)}</p>
              </div>
            )}
            {config.approvalDetails.approvedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Approved Date</p>
                <p className="font-medium">{formatDate(config.approvalDetails.approvedAt)}</p>
              </div>
            )}
            {config.approvalDetails.approvedBy && (
              <div>
                <p className="text-sm text-muted-foreground">Approved By</p>
                <p className="font-medium">{config.approvalDetails.approvedBy}</p>
              </div>
            )}
            {config.approvalDetails.rejectionReason && (
              <div className="col-span-full">
                <p className="text-sm text-muted-foreground">Rejection Reason</p>
                <p className="font-medium text-red-600 dark:text-red-400">{config.approvalDetails.rejectionReason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval Flow — shows all steps: completed, current, and pending */}
      {approvalStatus && (approvalStatus.actions?.length > 0 || approvalStatus.steps?.length) && (() => {
        // The backend returns steps JSON with status/roleName from process_approval_statuses
        const stepsJson = approvalStatus.steps || [];
        const flowSteps = approvalStatus.flow?.steps || [];
        const completedActions = (approvalStatus.actions || [])
          .sort((a: ApprovalTrailAction, b: ApprovalTrailAction) => a.stepNumber - b.stepNumber || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // Map step numbers to their completed actions (only real approvals, not pending submissions)
        const actionsByStep = new Map<number, ApprovalTrailAction[]>();
        for (const a of completedActions) {
          if (a.action === 'approve' || a.action === 'reject') {
            const existing = actionsByStep.get(a.stepNumber) || [];
            existing.push(a);
            actionsByStep.set(a.stepNumber, existing);
          }
        }

        // Build unified step list — prefer steps JSON (has all steps including future), fall back to flow steps
        const stepSource = stepsJson.length > 0 ? stepsJson : flowSteps;
        const allSteps = stepSource.length > 0
          ? stepSource.map((step: Record<string, unknown>, idx: number) => {
              const stepNum = Number(step.stepNumber || step.stepOrder || idx + 1);
              const actions = actionsByStep.get(stepNum) || [];
              const hasApproval = actions.some((a: ApprovalTrailAction) => a.action === 'approve');
              const hasRejection = actions.some((a: ApprovalTrailAction) => a.action === 'reject');
              const stepStatus = (step.status as string) || '';
              const isCurrent = stepStatus === 'PENDING' || (approvalStatus.currentStepNumber === stepNum && approvalStatus.status === 'pending');
              const isApproved = stepStatus === 'APPROVED' || hasApproval;
              const isOverridden = stepStatus === 'OVERRIDDEN';
              const roleName = (step.roleName as string) || (step.name as string) || '';
              return {
                stepNumber: stepNum,
                stepName: (step.name || `Step ${stepNum}`) as string,
                roleName,
                overriddenBy: isOverridden ? (step.overriddenBy as string) || 'Super Admin' : undefined,
                status: isApproved ? 'approved' : isOverridden ? 'overridden' : hasRejection ? 'rejected' : isCurrent ? 'pending' : 'waiting',
                actions,
              };
            })
          : completedActions.map((a: ApprovalTrailAction) => ({
              stepNumber: a.stepNumber,
              stepName: a.stepName || `Step ${a.stepNumber}`,
              roleName: '',
              status: a.action === 'approve' ? 'approved' : a.action === 'reject' ? 'rejected' : 'submitted',
              actions: [a],
            }));

        return (
          <div className="rounded-xl border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Pen className="h-4 w-4" /> Approval Flow
            </h3>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-border" />

              <div className="space-y-4">
                {allSteps.map((step: { stepNumber: number; stepName: string; roleName: string; status: string; actions: ApprovalTrailAction[]; overriddenBy?: string }, idx: number) => {
                  const isApproved = step.status === 'approved';
                  const isRejected = step.status === 'rejected';
                  const isOverridden = step.status === 'overridden';
                  const isPending = step.status === 'pending';
                  const isWaiting = step.status === 'waiting';
                  const trail = step.actions[0]; // Primary action for this step (only real approve/reject actions)

                  // For completed steps: show who approved/rejected
                  // For pending/waiting steps: show who needs to act (role name or approver names)
                  const pendingApproverDisplay = isPending && approvalStatus.currentStep
                    ? (approverNames.length > 0 ? approverNames.join(', ') : step.roleName)
                    : step.roleName;

                  return (
                    <div key={`step-${step.stepNumber}-${idx}`} className="flex gap-3 relative">
                      {/* Timeline dot */}
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2',
                        isApproved ? 'bg-green-100 dark:bg-green-900/30 border-green-500' :
                        isOverridden ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500' :
                        isRejected ? 'bg-red-100 dark:bg-red-900/30 border-red-500' :
                        isPending ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-500 animate-pulse' :
                        'bg-gray-100 dark:bg-gray-800 border-gray-300'
                      )}>
                        {isApproved ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                         isOverridden ? <SkipForward className="h-5 w-5 text-blue-600" /> :
                         isRejected ? <XCircle className="h-5 w-5 text-red-600" /> :
                         isPending ? <Clock className="h-5 w-5 text-amber-600" /> :
                         <Clock className="h-5 w-5 text-gray-300" />}
                      </div>

                      {/* Content */}
                      <div className={cn(
                        'flex-1 rounded-lg border p-3 min-w-0',
                        isOverridden ? 'bg-blue-50/50 dark:bg-blue-950/20 border-dashed' :
                        isWaiting ? 'bg-muted/30 border-dashed' : 'bg-card',
                      )}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            {(isApproved || isRejected) && trail ? (
                              <>
                                <p className="text-sm font-semibold">{trail.userName}</p>
                                <p className="text-xs text-muted-foreground">Step {step.stepNumber}: {step.stepName}</p>
                              </>
                            ) : isOverridden ? (
                              <>
                                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                  Skipped by {step.overriddenBy || 'Super Admin'}
                                </p>
                                <p className="text-xs text-muted-foreground">Step {step.stepNumber}: {step.stepName}</p>
                              </>
                            ) : isPending ? (
                              <>
                                <p className="text-sm font-semibold">
                                  Awaiting: {pendingApproverDisplay || 'approval'}
                                </p>
                                <p className="text-xs text-muted-foreground">Step {step.stepNumber}: {step.stepName}</p>
                              </>
                            ) : (
                              <>
                                <p className={cn('text-sm font-semibold', 'text-muted-foreground')}>
                                  {step.roleName || step.stepName}
                                </p>
                                <p className="text-xs text-muted-foreground">Step {step.stepNumber}: {step.stepName}</p>
                              </>
                            )}
                          </div>
                          <span className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                            isApproved ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            isOverridden ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            isRejected ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                            isPending ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-400'
                          )}>
                            {isApproved ? 'Approved' : isOverridden ? 'Skipped' : isRejected ? 'Rejected' : isPending ? 'Pending' : 'Waiting'}
                          </span>
                        </div>

                        {/* Timestamp */}
                        {trail?.createdAt && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(trail.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}

                        {/* Comment */}
                        {trail?.comment && (
                          <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{trail.comment}&rdquo;</p>
                        )}

                        {/* Digital Signature */}
                        {trail?.signaturePath && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Signature:</span>
                            <img
                              src={trail.signaturePath.startsWith('data:') ? trail.signaturePath : `/uploads/${trail.signaturePath}`}
                              alt={`${trail.userName}'s signature`}
                              className="h-8 max-w-[120px] object-contain"
                              style={{ filter: 'contrast(1.4) brightness(0.9)' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Comment Dialog */}
      {dialogAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">{dialogAction.label} {config.entityLabel}</h3>
            {dialogAction.confirmMessage && (
              <p className="text-sm text-muted-foreground mb-4">{dialogAction.confirmMessage}</p>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                {dialogAction.commentLabel || 'Comment'} {dialogAction.requiresComment && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={`Enter ${dialogAction.requiresComment ? 'required' : 'optional'} comment...`}
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            {/* Signature upload for approve actions */}
            {isApproveAction(dialogAction.id) && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Signature (optional)</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-muted px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-muted/80 transition-colors">
                    <Upload className="h-3 w-3" />
                    {signatureFile ? 'Change' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSignatureFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </label>
                  {signatureFile && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> {signatureFile.name}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setDialogAction(null); setComment(''); }}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || (dialogAction.requiresComment && !comment.trim())}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50',
                  BUTTON_VARIANTS[dialogAction.variant]
                )}
              >
                {loading ? 'Processing...' : `Confirm`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PRE-BUILT ACTION SETS
// ============================================================================

export const COMMON_ACTIONS = {
  submit: (entityLabel = 'item'): ApprovalAction => ({
    id: 'submit', label: 'Submit for Approval', icon: Send, variant: 'primary',
    confirmMessage: `Submit this ${entityLabel} for approval?`,
  }),
  approve: (entityLabel = 'item'): ApprovalAction => ({
    id: 'approve', label: 'Approve', icon: CheckCircle, variant: 'success',
    confirmMessage: `Are you sure you want to approve this ${entityLabel}?`,
    commentLabel: 'Approval Comment',
  }),
  reject: (entityLabel = 'item'): ApprovalAction => ({
    id: 'reject', label: 'Reject', icon: XCircle, variant: 'danger',
    requiresComment: true, commentLabel: 'Rejection Reason',
    confirmMessage: `Are you sure you want to reject this ${entityLabel}?`,
  }),
  return: (entityLabel = 'item'): ApprovalAction => ({
    id: 'return', label: 'Return for Revision', icon: RotateCcw, variant: 'warning',
    requiresComment: true, commentLabel: 'Return Reason',
    confirmMessage: `Return this ${entityLabel} to draft for revision.`,
  }),
};
