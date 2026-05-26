'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import type { Currency, CreateCurrencyDto, UpdateCurrencyDto } from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// SCHEMAS
// ============================================================================

const currencyFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  symbol: z.string().optional(),
  decimalPlaces: z.number().int().min(0).max(6),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof currencyFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface CurrencyFormProps {
  /** Existing currency for edit mode; undefined for create */
  currency?: Currency;
  /** Called with validated form data */
  onSubmit: (data: CreateCurrencyDto | UpdateCurrencyDto) => Promise<void>;
  /** Called when user cancels */
  onCancel: () => void;
  /** Submit button label */
  submitLabel?: string;
}

// ============================================================================
// CURRENCY FORM COMPONENT
// ============================================================================

export function CurrencyForm({ currency, onSubmit, onCancel, submitLabel }: CurrencyFormProps) {
  const isEditing = !!currency;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(currencyFormSchema),
    defaultValues: {
      name: currency?.name ?? '',
      code: currency?.code ?? '',
      symbol: currency?.symbol ?? '',
      decimalPlaces: currency?.decimalPlaces ?? 2,
      isActive: currency?.isActive ?? true,
    },
  });

  const onFormSubmit = async (data: FormValues) => {
    try {
      if (!isEditing) {
        if (!data.code || data.code.length !== 3) {
          setError('code', { message: 'Code must be exactly 3 characters' });
          return;
        }
      }
      if (isEditing) {
        await onSubmit({
          name: data.name,
          symbol: data.symbol || undefined,
          decimalPlaces: data.decimalPlaces,
          isActive: data.isActive,
        } as UpdateCurrencyDto);
      } else {
        await onSubmit({
          name: data.name,
          code: data.code!.toUpperCase(),
          symbol: data.symbol || undefined,
          decimalPlaces: data.decimalPlaces,
          isActive: data.isActive,
        } as CreateCurrencyDto);
      }
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Operation failed') });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <div className="rounded-xl border bg-card p-6 space-y-6">
        {/* Submit Error */}
        {errors.root && (
          <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
            {errors.root.message}
          </div>
        )}

        {/* Name + Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="name" label="Currency Name" required error={errors.name?.message}>
            {(props) => (
              <input
                {...props}
                {...register('name')}
                type="text"
                placeholder="e.g., Nigerian Naira"
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  errors.name && 'border-red-500'
                )}
              />
            )}
          </FormField>

          <FormField
            id="code"
            label="Currency Code"
            required={!isEditing}
            error={errors.code?.message}
            description={isEditing ? 'Currency code cannot be changed' : undefined}
          >
            {(props) => (
              <input
                {...props}
                {...register('code')}
                type="text"
                placeholder="e.g., NGN"
                maxLength={3}
                disabled={isEditing}
                className={cn(
                  'w-full rounded-lg border px-4 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary',
                  isEditing && 'bg-muted cursor-not-allowed',
                  errors.code && 'border-red-500'
                )}
              />
            )}
          </FormField>
        </div>

        {/* Symbol + Decimal Places */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="symbol" label="Symbol">
            {(props) => (
              <input
                {...props}
                {...register('symbol')}
                type="text"
                placeholder="e.g., ₦"
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>

          <FormField id="decimalPlaces" label="Decimal Places">
            {(props) => (
              <input
                {...props}
                {...register('decimalPlaces', { valueAsNumber: true })}
                type="number"
                min="0"
                max="6"
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>

        {/* Active Checkbox */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            {...register('isActive')}
            type="checkbox"
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Active</span>
        </label>
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
          {submitLabel || (isEditing ? 'Save Changes' : 'Create Currency')}
        </button>
      </div>
    </form>
  );
}
