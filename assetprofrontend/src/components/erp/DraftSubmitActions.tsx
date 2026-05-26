'use client';

import { Save, Send, X } from 'lucide-react';

interface DraftSubmitActionsProps {
  onCancel: () => void;
  onSaveDraft?: () => void;
  submitLabel?: string;
  draftLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  isSavingDraft?: boolean;
}

/**
 * Reusable action buttons for create/edit pages with approval workflows.
 *
 * Renders: [Cancel] [Save Draft] [Create & Submit]
 *
 * - "Save Draft" (type="button") saves the entity in draft status only.
 * - "Create & Submit" (type="submit") triggers form validation + submit.
 * - If `onSaveDraft` is not provided, only Cancel + Submit are shown.
 *
 * Place inside a <form> element — the submit button triggers the form's onSubmit.
 */
export function DraftSubmitActions({
  onCancel,
  onSaveDraft,
  submitLabel = 'Create & Submit',
  draftLabel = 'Save Draft',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  isSavingDraft = false,
}: DraftSubmitActionsProps) {
  const busy = isSubmitting || isSavingDraft;

  return (
    <div className="flex items-center justify-end gap-4">
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-2 px-6 py-2 border rounded-lg hover:bg-muted"
        disabled={busy}
      >
        <X className="h-4 w-4" />
        {cancelLabel}
      </button>
      {onSaveDraft && (
        <button
          type="button"
          onClick={onSaveDraft}
          className="flex items-center gap-2 px-6 py-2 border rounded-lg hover:bg-muted disabled:opacity-50"
          disabled={busy}
        >
          <Save className="h-4 w-4" />
          {isSavingDraft ? 'Saving...' : draftLabel}
        </button>
      )}
      <button
        type="submit"
        className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        disabled={busy}
      >
        <Send className="h-4 w-4" />
        {isSubmitting ? 'Submitting...' : submitLabel}
      </button>
    </div>
  );
}
