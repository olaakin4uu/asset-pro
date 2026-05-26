'use client';

import { useState } from 'react';
import { Shield, CheckCircle, AlertTriangle, X, ChevronRight, SkipForward, RotateCcw } from 'lucide-react';
import { approvalActionsApi } from '@/lib/api/approvals';
import type { ApprovalStatusRecord } from '@/types/approvals';
import { cn, extractErrorMessage } from '@/lib/utils';

// ============================================================================
// PRESET OVERRIDE REASONS
// ============================================================================

const PRESET_REASONS = [
  { id: 'emergency', label: 'Emergency Authorization', icon: '🚨' },
  { id: 'approver_unavailable', label: 'Approver Unavailable', icon: '👤' },
  { id: 'time_sensitive', label: 'Time-Sensitive Business Need', icon: '⏰' },
  { id: 'delegated_authority', label: 'Delegated Authority', icon: '📋' },
  { id: 'management_decision', label: 'Management Decision', icon: '👔' },
  { id: 'compliance', label: 'Compliance Requirement', icon: '⚖️' },
  { id: 'system_issue', label: 'System / Technical Issue', icon: '🔧' },
];

// ============================================================================
// TYPES
// ============================================================================

interface SuperAdminApprovalModalProps {
  approvalStatus: ApprovalStatusRecord;
  entityLabel: string;
  onClose: () => void;
  onActionComplete: (newStatus: ApprovalStatusRecord) => void;
}

type ModalStep = 'choose' | 'confirm-approve' | 'confirm-override' | 'confirm-reset';

// ============================================================================
// COMPONENT
// ============================================================================

export function SuperAdminApprovalModal({
  approvalStatus,
  entityLabel,
  onClose,
  onActionComplete,
}: SuperAdminApprovalModalProps) {
  const [step, setStep] = useState<ModalStep>('choose');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive steps that would be skipped on override
  const flowSteps = approvalStatus.flow?.steps ?? [];
  const currentNum = approvalStatus.currentStepNumber ?? 0;
  const stepsToSkip = flowSteps.filter(
    (s) => (s.stepNumber ?? 0) > currentNum,
  );
  const currentStepName = approvalStatus.currentStep?.name ?? `Step ${currentNum}`;

  const finalReason = selectedReason
    ? selectedReason === 'custom'
      ? customReason.trim()
      : `${PRESET_REASONS.find((r) => r.id === selectedReason)?.label ?? selectedReason}${customReason.trim() ? ` — ${customReason.trim()}` : ''}`
    : customReason.trim();

  const canSubmitOverride = finalReason.length > 0;

  // ── Approve Step ──────────────────────────────────────────────────────────

  const handleApproveStep = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await approvalActionsApi.superAdminApproveStep(approvalStatus.id);
      onActionComplete(result);
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to approve step'));
    } finally {
      setLoading(false);
    }
  };

  // ── Reset to Step 1 ───────────────────────────────────────────────────────

  const handleResetToStep1 = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await approvalActionsApi.resetToStep1(approvalStatus.id);
      onActionComplete(result);
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to reset approval'));
    } finally {
      setLoading(false);
    }
  };

  // ── Override All ──────────────────────────────────────────────────────────

  const handleOverride = async () => {
    if (!canSubmitOverride) return;
    setLoading(true);
    setError(null);
    try {
      const result = await approvalActionsApi.superAdminOverride(approvalStatus.id, finalReason);
      onActionComplete(result);
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to override approval'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/40">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">Super Admin Actions</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400">{entityLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ── Step: Choose action ─────────────────────────────────────── */}
          {step === 'choose' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Current step: <span className="font-medium text-foreground">{currentStepName}</span>
              </p>

              {/* Option 1 — Approve Step */}
              <button
                onClick={() => setStep('confirm-approve')}
                className="w-full flex items-center justify-between rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:border-green-400 dark:hover:border-green-600 p-4 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/40">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">Approve This Step</p>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                      Approve &quot;{currentStepName}&quot; and advance to the next step
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-green-500 shrink-0" />
              </button>

              {/* Option 2 — Override Remaining */}
              <button
                onClick={() => setStep('confirm-override')}
                className="w-full flex items-center justify-between rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 hover:border-amber-400 dark:hover:border-amber-600 p-4 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/40">
                    <SkipForward className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100">Override Remaining Steps</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Skip approval steps and jump to the final processing step (if one exists), or fully approve the document
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-amber-500 shrink-0" />
              </button>

              {/* Option 3 — Reset to Step 1 */}
              <button
                onClick={() => setStep('confirm-reset')}
                className="w-full flex items-center justify-between rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 hover:border-gray-400 dark:hover:border-gray-600 p-4 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <RotateCcw className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Reset to Step 1</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      Restart the entire approval flow from the beginning
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
              </button>
            </div>
          )}

          {/* ── Step: Confirm Reset ────────────────────────────────────── */}
          {step === 'confirm-reset' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start gap-3">
                  <RotateCcw className="h-5 w-5 text-gray-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Reset approval flow</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      All existing approvals will be cleared and the flow will restart from
                      <span className="font-semibold"> Step 1</span>. This action is logged.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <button
                  onClick={() => setStep('choose')}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
                >
                  Back
                </button>
                <button
                  onClick={handleResetToStep1}
                  disabled={loading}
                  className="rounded-lg bg-gray-700 hover:bg-gray-800 text-white px-5 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {loading ? 'Processing...' : 'Confirm Reset'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Confirm Approve Step ──────────────────────────────── */}
          {step === 'confirm-approve' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">Approve current step</p>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                      Step <span className="font-semibold">&quot;{currentStepName}&quot;</span> will be approved
                      and the flow will advance to the next step. This action is logged as
                      <span className="font-semibold"> &quot;Approved by Super Admin (override)&quot;</span>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <button
                  onClick={() => setStep('choose')}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
                >
                  Back
                </button>
                <button
                  onClick={handleApproveStep}
                  disabled={loading}
                  className="rounded-lg bg-green-600 hover:bg-green-700 text-white px-5 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {loading ? 'Processing...' : 'Confirm Approve'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Confirm Override ─────────────────────────────────── */}
          {step === 'confirm-override' && (
            <div className="space-y-4">
              {/* Warning card */}
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">Override Details</p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      All intermediate approval steps will be skipped. If this flow has a
                      final processing step (e.g. Transfer Processing, Payment Processing),
                      the flow will land there for the designated officer to complete.
                      Otherwise, the document will be fully approved.
                    </p>
                    {stepsToSkip.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {stepsToSkip.map((s) => (
                          <li key={s.id} className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <span className="inline-block w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-center font-bold">
                              {s.stepNumber}
                            </span>
                            {s.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Preset reason chips */}
              <div>
                <p className="text-sm font-medium mb-2">
                  Reason for override <span className="text-red-500">*</span>
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_REASONS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedReason(selectedReason === preset.id ? '' : preset.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                        selectedReason === preset.id
                          ? 'bg-amber-600 border-amber-600 text-white'
                          : 'bg-background border-border hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                      )}
                    >
                      <span>{preset.icon}</span>
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Additional notes */}
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder={selectedReason ? 'Additional details (optional)...' : 'Enter override reason...'}
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 text-sm bg-background resize-none"
                />
                {!canSubmitOverride && (
                  <p className="text-xs text-red-500 mt-1">Please select a reason or enter one above.</p>
                )}
              </div>

              <div className="flex justify-between gap-3">
                <button
                  onClick={() => setStep('choose')}
                  className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
                >
                  Back
                </button>
                <button
                  onClick={handleOverride}
                  disabled={loading || !canSubmitOverride}
                  className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <SkipForward className="h-4 w-4" />
                  {loading ? 'Processing...' : 'Override & Approve'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
