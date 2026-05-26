'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import type { FiscalYear, CreateFiscalYearDto, UpdateFiscalYearDto } from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// SCHEMAS
// ============================================================================

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isCurrent: z.boolean(),
}).refine((data) => data.startDate < data.endDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
}).refine((data) => data.startDate < data.endDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface FiscalYearFormProps {
  fiscalYear?: FiscalYear;
  onSubmit: (data: CreateFiscalYearDto | UpdateFiscalYearDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// FISCAL YEAR FORM COMPONENT
// ============================================================================

export function FiscalYearForm({ fiscalYear, onSubmit, onCancel, submitLabel = 'Save' }: FiscalYearFormProps) {
  const isEditing = !!fiscalYear;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: {
      name: fiscalYear?.name ?? '',
      startDate: fiscalYear?.startDate?.split('T')[0] ?? '',
      endDate: fiscalYear?.endDate?.split('T')[0] ?? '',
      isCurrent: fiscalYear?.isCurrent ?? false,
    },
  });

  const onFormSubmit = async (data: CreateFormValues) => {
    try {
      if (isEditing) {
        await onSubmit({
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
        } as UpdateFiscalYearDto);
      } else {
        await onSubmit({
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          isCurrent: data.isCurrent,
        } as CreateFiscalYearDto);
      }
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to save fiscal year') });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Error Banner */}
      {errors.root && (
        <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 space-y-6">
        {/* Name */}
        <FormField id="name" label="Name" required error={errors.name?.message}>
          {(props) => (
            <input
              {...props}
              {...register('name')}
              type="text"
              placeholder="e.g., FY 2026"
              className={cn(
                'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.name && 'border-red-500'
              )}
            />
          )}
        </FormField>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <FormField id="startDate" label="Start Date" required error={errors.startDate?.message}>
            {(props) => (
              <input
                {...props}
                {...register('startDate')}
                type="date"
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  errors.startDate && 'border-red-500'
                )}
              />
            )}
          </FormField>

          <FormField id="endDate" label="End Date" required error={errors.endDate?.message}>
            {(props) => (
              <input
                {...props}
                {...register('endDate')}
                type="date"
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  errors.endDate && 'border-red-500'
                )}
              />
            )}
          </FormField>
        </div>

        {/* Set as Current - only for create */}
        {!isEditing && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              {...register('isCurrent')}
              type="checkbox"
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">Set as current fiscal year</span>
          </label>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
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
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
