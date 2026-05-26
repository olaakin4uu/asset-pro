'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// TYPES
// ============================================================================

export interface ReportingPeriod {
  id: number;
  entityId: number;
  calendarYear: number;
  number: number;
  label: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'ADJUSTING' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportingPeriodDto {
  calendarYear: number;
  number: number;
  label: string;
  startDate: string;
  endDate: string;
  status?: string;
}

export interface UpdateReportingPeriodDto {
  status?: string;
}

interface ReportingPeriodFormProps {
  entity?: ReportingPeriod;
  onSubmit: (data: CreateReportingPeriodDto | UpdateReportingPeriodDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const createSchema = z.object({
  calendarYear: z.coerce.number().int().min(2000, 'Enter a valid year (2000-2100)').max(2100, 'Enter a valid year (2000-2100)'),
  number: z.coerce.number().int().min(1, 'Period number must be between 1 and 13').max(13, 'Period number must be between 1 and 13'),
  label: z.string().min(1, 'Label is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  status: z.string(),
});

const editSchema = z.object({
  status: z.string(),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

const statusOptions = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ADJUSTING', label: 'Adjusting' },
  { value: 'CLOSED', label: 'Closed' },
];

// ============================================================================
// REPORTING PERIOD FORM COMPONENT
// ============================================================================

export function ReportingPeriodForm({ entity, onSubmit, onCancel, submitLabel }: ReportingPeriodFormProps) {
  const isEditing = !!entity;

  // Edit mode — only status can be changed
  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      status: entity?.status ?? 'OPEN',
    },
  });

  // Create mode — all fields
  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      calendarYear: new Date().getFullYear(),
      number: 1,
      label: '',
      startDate: '',
      endDate: '',
      status: 'OPEN',
    },
  });

  const form = isEditing ? editForm : createForm;
  const { formState: { errors, isSubmitting } } = form;

  const onFormSubmit = async (data: CreateFormValues | EditFormValues) => {
    try {
      if (isEditing) {
        await onSubmit({ status: (data as EditFormValues).status } as UpdateReportingPeriodDto);
      } else {
        const d = data as CreateFormValues;
        await onSubmit({
          calendarYear: d.calendarYear,
          number: d.number,
          label: d.label,
          startDate: d.startDate,
          endDate: d.endDate,
          status: d.status,
        } as CreateReportingPeriodDto);
      }
    } catch (err: unknown) {
      form.setError('root', { message: extractErrorMessage(err, 'Operation failed') });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onFormSubmit)}>
      <div className="rounded-xl border bg-card p-6 space-y-6">
        {/* Submit Error */}
        {errors.root && (
          <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
            {errors.root.message}
          </div>
        )}

        {isEditing ? (
          <>
            {/* Read-only period info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Calendar Year</label>
                <p className="text-lg font-bold">{entity.calendarYear}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Period</label>
                <p className="text-lg font-bold">P{entity.number} — {entity.label}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Date Range</label>
                <p className="text-sm">{new Date(entity.startDate).toLocaleDateString()} – {new Date(entity.endDate).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Editable status */}
            <FormField id="status" label="Status">
              {(props) => (
                <select
                  {...props}
                  {...editForm.register('status')}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </FormField>
          </>
        ) : (
          <>
            {/* Create mode — all fields */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-600 dark:text-blue-400">
              Reporting periods are normally auto-generated when a fiscal year is created. Use this form only for manual corrections.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField id="calendarYear" label="Calendar Year" required error={(errors as Record<string, { message?: string }>).calendarYear?.message}>
                {(props) => (
                  <input
                    {...props}
                    {...createForm.register('calendarYear')}
                    type="number"
                    min="2000"
                    max="2100"
                    placeholder="e.g., 2026"
                    className={cn(
                      'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                      (errors as Record<string, { message?: string }>).calendarYear && 'border-red-500'
                    )}
                  />
                )}
              </FormField>

              <FormField id="number" label="Period Number" required error={(errors as Record<string, { message?: string }>).number?.message}>
                {(props) => (
                  <input
                    {...props}
                    {...createForm.register('number')}
                    type="number"
                    min="1"
                    max="13"
                    placeholder="1-13"
                    className={cn(
                      'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                      (errors as Record<string, { message?: string }>).number && 'border-red-500'
                    )}
                  />
                )}
              </FormField>

              <FormField id="label" label="Label" required error={(errors as Record<string, { message?: string }>).label?.message}>
                {(props) => (
                  <input
                    {...props}
                    {...createForm.register('label')}
                    type="text"
                    placeholder="e.g., Jan '26"
                    className={cn(
                      'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                      (errors as Record<string, { message?: string }>).label && 'border-red-500'
                    )}
                  />
                )}
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField id="startDate" label="Start Date" required error={(errors as Record<string, { message?: string }>).startDate?.message}>
                {(props) => (
                  <input
                    {...props}
                    {...createForm.register('startDate')}
                    type="date"
                    className={cn(
                      'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                      (errors as Record<string, { message?: string }>).startDate && 'border-red-500'
                    )}
                  />
                )}
              </FormField>

              <FormField id="endDate" label="End Date" required error={(errors as Record<string, { message?: string }>).endDate?.message}>
                {(props) => (
                  <input
                    {...props}
                    {...createForm.register('endDate')}
                    type="date"
                    className={cn(
                      'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                      (errors as Record<string, { message?: string }>).endDate && 'border-red-500'
                    )}
                  />
                )}
              </FormField>

              <FormField id="status" label="Status">
                {(props) => (
                  <select
                    {...props}
                    {...createForm.register('status')}
                    className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
              </FormField>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {submitLabel || (isEditing ? 'Save Changes' : 'Create Period')}
        </button>
      </div>
    </form>
  );
}
