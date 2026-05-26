'use client';

import { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OverrideCategory } from '@/types/approvals';

// ============================================================================
// TYPES
// ============================================================================

interface OverrideApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (category: OverrideCategory, note: string) => Promise<void>;
  stepName: string;
  noteMinLength?: number;
  /** Name of the document / entity being overridden e.g. "PR-2024-001" */
  entityReference?: string;
}

const CATEGORIES: { value: OverrideCategory; label: string; description: string }[] = [
  { value: 'emergency',           label: 'Emergency',              description: 'Urgent action required to prevent business disruption' },
  { value: 'approver_absent',     label: 'Approver Absent',        description: 'Designated approver is unavailable or unreachable' },
  { value: 'time_sensitive',      label: 'Time-Sensitive Deadline', description: 'Approval required before an imminent deadline' },
  { value: 'delegated_authority', label: 'Delegated Authority',    description: 'Acting on behalf of the approver with explicit delegation' },
  { value: 'management_decision', label: 'Management Decision',    description: 'Senior management has authorised bypassing normal process' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function OverrideApprovalDialog({
  open,
  onClose,
  onConfirm,
  stepName,
  noteMinLength = 30,
  entityReference,
}: OverrideApprovalDialogProps) {
  const [category, setCategory] = useState<OverrideCategory | ''>('');
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noteLength = note.trim().length;
  const noteValid = noteLength >= noteMinLength;
  const canSubmit = category !== '' && noteValid && acknowledged && !submitting;

  const handleClose = () => {
    if (submitting) return;
    setCategory('');
    setNote('');
    setAcknowledged(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit || !category) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(category, note.trim());
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message :
        (typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined) ?? 'Override failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-6 border-b bg-amber-50/80 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 shrink-0">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Override Approval</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Bypass <span className="font-medium text-foreground">{stepName}</span>
                {entityReference && <> for <span className="font-medium text-foreground">{entityReference}</span></>}
              </p>
            </div>
          </div>
          <button onClick={handleClose} disabled={submitting} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Warning banner */}
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              This will <strong>bypass all remaining approval steps</strong> and mark this document as fully approved.
              This action is permanent and cannot be undone.
            </p>
          </div>

          {/* Reason category */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Reason Category <span className="text-destructive">*</span>
            </label>
            <div className="space-y-2">
              {CATEGORIES.map((cat) => (
                <label
                  key={cat.value}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all',
                    category === cat.value
                      ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-border hover:border-muted-foreground/40 hover:bg-muted/40'
                  )}
                >
                  <input
                    type="radio"
                    name="override-category"
                    value={cat.value}
                    checked={category === cat.value}
                    onChange={() => setCategory(cat.value)}
                    className="mt-0.5 accent-amber-600"
                  />
                  <div>
                    <p className="text-sm font-medium leading-none">{cat.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Justification note */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                Justification <span className="text-destructive">*</span>
              </label>
              <span className={cn(
                'text-xs tabular-nums',
                noteValid ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
              )}>
                {noteLength} / {noteMinLength} min
                {noteValid && <CheckCircle2 className="inline h-3 w-3 ml-1" />}
              </span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={`Explain why this override is necessary (minimum ${noteMinLength} characters)…`}
              className={cn(
                'w-full rounded-xl border px-3 py-2.5 text-sm bg-background resize-none focus:outline-none focus:ring-2 transition-colors',
                noteLength > 0 && !noteValid
                  ? 'border-destructive/50 focus:ring-destructive/30'
                  : noteValid
                  ? 'border-green-400 dark:border-green-600 focus:ring-green-400/30'
                  : 'focus:ring-primary/30'
              )}
            />
          </div>

          {/* Acknowledgement */}
          <label className="flex items-start gap-3 cursor-pointer rounded-xl border p-3 hover:bg-muted/40 transition-colors">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="rounded mt-0.5 accent-amber-600"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              I confirm that this override is necessary and I understand it will be{' '}
              <strong className="text-foreground">permanently logged</strong> and visible to auditors and compliance reviewers.
            </span>
          </label>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/30">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium text-white transition-all',
              canSubmit
                ? 'bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20'
                : 'bg-muted-foreground/30 cursor-not-allowed'
            )}
          >
            {submitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            {submitting ? 'Processing…' : 'Override & Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}
