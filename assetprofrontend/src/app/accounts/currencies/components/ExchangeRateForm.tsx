'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import type { Currency, ExchangeRate, CreateExchangeRateDto, UpdateExchangeRateDto } from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// SCHEMAS
// ============================================================================

const exchangeRateSchema = z.object({
  fromCurrencyId: z.coerce.number(),
  toCurrencyId: z.coerce.number(),
  rate: z.coerce.number().positive('Rate must be positive'),
  validFrom: z.string(),
  validTo: z.string(),
  source: z.string(),
});

type ExchangeRateFormValues = z.infer<typeof exchangeRateSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface ExchangeRateFormProps {
  /** Existing exchange rate for edit mode; undefined for create */
  exchangeRate?: ExchangeRate;
  /** Available currencies for dropdowns */
  currencies: Currency[];
  /** Called with validated form data */
  onSubmit: (data: CreateExchangeRateDto | UpdateExchangeRateDto) => Promise<void>;
  /** Called when user cancels */
  onCancel: () => void;
  /** Submit button label */
  submitLabel?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExchangeRateForm({ exchangeRate, currencies, onSubmit, onCancel, submitLabel }: ExchangeRateFormProps) {
  const isEditing = !!exchangeRate;

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExchangeRateFormValues>({
    resolver: zodResolver(exchangeRateSchema),
    defaultValues: {
      fromCurrencyId: exchangeRate?.fromCurrencyId ?? 0,
      toCurrencyId: exchangeRate?.toCurrencyId ?? 0,
      rate: exchangeRate?.rate ?? 1,
      validFrom: exchangeRate?.validFrom?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      validTo: exchangeRate?.validTo?.split('T')[0] ?? '',
      source: exchangeRate?.source ?? '',
    },
  });

  const watchedFromCurrencyId = watch('fromCurrencyId');
  const activeCurrencies = currencies.filter((c) => c.isActive);

  const onFormSubmit = async (data: ExchangeRateFormValues) => {
    // Custom validation for create mode
    if (!isEditing) {
      if (!data.fromCurrencyId) {
        setError('fromCurrencyId', { message: 'Source currency is required' });
        return;
      }
      if (!data.toCurrencyId) {
        setError('toCurrencyId', { message: 'Target currency is required' });
        return;
      }
      if (data.fromCurrencyId === data.toCurrencyId) {
        setError('toCurrencyId', { message: 'Currencies must be different' });
        return;
      }
      if (!data.validFrom) {
        setError('validFrom', { message: 'Valid from date is required' });
        return;
      }
    }

    try {
      if (isEditing) {
        await onSubmit({
          rate: data.rate,
          validTo: data.validTo || undefined,
          source: data.source || undefined,
        } as UpdateExchangeRateDto);
      } else {
        await onSubmit({
          fromCurrencyId: data.fromCurrencyId,
          toCurrencyId: data.toCurrencyId,
          rate: data.rate,
          validFrom: data.validFrom,
          validTo: data.validTo || undefined,
          source: data.source || undefined,
        } as CreateExchangeRateDto);
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
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
            {errors.root.message}
          </div>
        )}

        {/* From / To Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="fromCurrencyId" label="From Currency" required error={errors.fromCurrencyId?.message}>
            {(props) => (
              <select
                {...props}
                {...register('fromCurrencyId', { valueAsNumber: true })}
                disabled={isEditing}
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  isEditing && 'bg-muted cursor-not-allowed',
                  errors.fromCurrencyId && 'border-red-500',
                )}
              >
                <option value="">Select currency</option>
                {activeCurrencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField id="toCurrencyId" label="To Currency" required error={errors.toCurrencyId?.message}>
            {(props) => (
              <select
                {...props}
                {...register('toCurrencyId', { valueAsNumber: true })}
                disabled={isEditing}
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  isEditing && 'bg-muted cursor-not-allowed',
                  errors.toCurrencyId && 'border-red-500',
                )}
              >
                <option value="">Select currency</option>
                {activeCurrencies
                  .filter((c) => c.id !== Number(watchedFromCurrencyId))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
              </select>
            )}
          </FormField>
        </div>

        {/* Rate */}
        <FormField id="rate" label="Exchange Rate" required error={errors.rate?.message}>
          {(props) => (
            <input
              {...props}
              {...register('rate', { valueAsNumber: true })}
              type="number"
              step="0.000001"
              min="0"
              placeholder="e.g., 1.25"
              className={cn(
                'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.rate && 'border-red-500',
              )}
            />
          )}
        </FormField>

        {/* Valid From / To */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="validFrom" label="Valid From" required={!isEditing} error={errors.validFrom?.message}>
            {(props) => (
              <input
                {...props}
                {...register('validFrom')}
                type="date"
                disabled={isEditing}
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  isEditing && 'bg-muted cursor-not-allowed',
                  errors.validFrom && 'border-red-500',
                )}
              />
            )}
          </FormField>

          <FormField id="validTo" label="Valid To">
            {(props) => (
              <input
                {...props}
                {...register('validTo')}
                type="date"
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>

        {/* Source */}
        <FormField id="source" label="Source">
          {(props) => (
            <input
              {...props}
              {...register('source')}
              type="text"
              placeholder="e.g., CBN, XE.com"
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </FormField>
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
          {submitLabel || (isEditing ? 'Save Changes' : 'Create Exchange Rate')}
        </button>
      </div>
    </form>
  );
}
