'use client';

import React, { useState } from 'react';
import { CalendarClock, XCircle } from 'lucide-react';

/**
 * Shared confirm dialog for void/cancel/reverse actions that need an
 * accounting date in addition to the reason. Ensures every void across
 * the app asks for both:
 *
 *   1. A reason (required, free text)
 *   2. An accounting date (required, YYYY-MM-DD, defaults to today or
 *      to the original record's date)
 *
 * Backend enforces that the date falls in an open fiscal year and
 * returns a readable BadRequestException if it doesn't — the dialog
 * surfaces that error inline without closing.
 *
 * Usage:
 *   const [openVoid, setOpenVoid] = useState(false);
 *   <VoidWithDateDialog
 *     open={openVoid}
 *     title="Void receipt RCP-2026-00098"
 *     actionLabel="Void"
 *     defaultDate={receipt.receiptDate.slice(0, 10)}
 *     onCancel={() => setOpenVoid(false)}
 *     onConfirm={async (reason, date) => {
 *       await receiptsApi.void(receipt.id, reason, date);
 *       setOpenVoid(false);
 *     }}
 *   />
 */

export interface VoidWithDateDialogProps {
  open: boolean;
  title: string;
  /** What the action button says (e.g. "Void", "Cancel", "Reverse"). */
  actionLabel: string;
  /** Pre-populated date in YYYY-MM-DD. Defaults to today if absent. */
  defaultDate?: string;
  /** Pre-populated reason. Leave blank for a fresh dialog. */
  defaultReason?: string;
  /**
   * Earliest allowed void/reversal date (YYYY-MM-DD). Enforced via the
   * native `min` attribute on the date input AND a client-side check
   * before submit. Backend also validates — this is the UX sweetener.
   * Typical usage: pass the original transaction's date so the user
   * can't backdate the reversal before the event itself.
   */
  minDate?: string;
  /** Extra hint text displayed between the fields and the buttons. */
  hint?: string;
  onCancel: () => void;
  onConfirm: (reason: string, date: string) => Promise<void>;
}

export function VoidWithDateDialog({
  open,
  title,
  actionLabel,
  defaultDate,
  defaultReason = '',
  minDate,
  hint,
  onCancel,
  onConfirm,
}: VoidWithDateDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [reason, setReason] = useState(defaultReason);
  const [date, setDate] = useState(defaultDate || today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed fields when the dialog (re)opens
  React.useEffect(() => {
    if (open) {
      setReason(defaultReason);
      setDate(defaultDate || today);
      setError(null);
      setBusy(false);
    }
  }, [open, defaultDate, defaultReason]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }
    if (!date) {
      setError('Date is required.');
      return;
    }
    if (minDate && date < minDate) {
      setError(`Date cannot be before the original transaction date (${minDate}).`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim(), date);
    } catch (err) {
      // Pull a readable message out of axios errors (see lib/utils extractErrorMessage)
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'Operation failed';
      setError(String(msg));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && onCancel()}>
      <div
        className="bg-card border rounded-xl shadow-xl w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-2">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base">{title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              This creates a reversing journal entry. You can&rsquo;t undo a void.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Reason <span className="text-red-500">*</span></span>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background disabled:opacity-50"
              placeholder="e.g. Duplicate of RCP-2026-00032, entered in error"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              Accounting date <span className="text-red-500">*</span>
            </span>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
              disabled={busy}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background disabled:opacity-50"
            />
            <span className="text-xs text-muted-foreground">
              Must be in an open fiscal year
              {minDate ? ` and on/after ${minDate}` : ''}. Defaults to the original record&rsquo;s date.
            </span>
          </label>

          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-md border hover:bg-muted text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            {busy ? 'Processing...' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
