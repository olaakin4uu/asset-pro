'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { currenciesApi } from '@/lib/api/accounts';
import type { Currency, ExchangeRate, CreateExchangeRateDto, UpdateExchangeRateDto } from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// TYPES
// ============================================================================

interface ExchangeRateFormProps {
  entity?: ExchangeRate;
  onSubmit: (data: CreateExchangeRateDto | UpdateExchangeRateDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const exchangeRateFormSchema = z.object({
  fromCurrencyId: z.number().min(1, 'Source currency is required'),
  toCurrencyId: z.number().min(1, 'Target currency is required'),
  rate: z.number().positive('Rate must be positive'),
  validFrom: z.string().min(1, 'Valid from date is required'),
  validTo: z.string().optional(),
  source: z.string().optional(),
});

type FormValues = z.infer<typeof exchangeRateFormSchema>;

// ============================================================================
// EXCHANGE RATE FORM COMPONENT
// ============================================================================

export function ExchangeRateForm({ entity, onSubmit, onCancel, submitLabel }: ExchangeRateFormProps) {
  const isEditing = !!entity;

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(exchangeRateFormSchema),
    defaultValues: {
      fromCurrencyId: entity?.fromCurrencyId ?? 0,
      toCurrencyId: entity?.toCurrencyId ?? 0,
      rate: Number(entity?.rate) || 1,
      validFrom: entity?.validFrom?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      validTo: entity?.validTo?.split('T')[0] ?? '',
      source: entity?.source ?? '',
    },
  });

  const watchedFromCurrencyId = watch('fromCurrencyId');

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        setLoadingCurrencies(true);
        const data = await currenciesApi.getActive();
        setCurrencies(data);
      } catch (err) {
        console.error('Failed to load currencies:', err);
      } finally {
        setLoadingCurrencies(false);
      }
    };
    loadCurrencies();
  }, []);

  const onFormSubmit = async (data: FormValues) => {
    try {
      if (!isEditing && data.fromCurrencyId === data.toCurrencyId) {
        setError('toCurrencyId', { message: 'Currencies must be different' });
        return;
      }
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

  const activeCurrencies = currencies.filter((c) => c.isActive);

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <div className="rounded-xl border bg-card p-6 space-y-6">
        {/* Submit Error */}
        {errors.root && (
          <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
            {errors.root.message}
          </div>
        )}

        {/* From / To Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="fromCurrencyId" label="From Currency" required={!isEditing} error={errors.fromCurrencyId?.message}>
            {(props) => (
              <select
                {...props}
                {...register('fromCurrencyId', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
                disabled={isEditing || loadingCurrencies}
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  isEditing && 'bg-muted cursor-not-allowed',
                  errors.fromCurrencyId && 'border-red-500'
                )}
              >
                <option value="">Select currency</option>
                {activeCurrencies.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            )}
          </FormField>

          <FormField id="toCurrencyId" label="To Currency" required={!isEditing} error={errors.toCurrencyId?.message}>
            {(props) => (
              <select
                {...props}
                {...register('toCurrencyId', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
                disabled={isEditing || loadingCurrencies}
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  isEditing && 'bg-muted cursor-not-allowed',
                  errors.toCurrencyId && 'border-red-500'
                )}
              >
                <option value="">Select currency</option>
                {activeCurrencies
                  .filter((c) => c.id !== Number(watchedFromCurrencyId))
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
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
                errors.rate && 'border-red-500'
              )}
            />
          )}
        </FormField>

        {/* Valid From / To */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="validFrom"
            label="Valid From"
            required={!isEditing}
            error={errors.validFrom?.message}
          >
            {(props) => (
              <input
                {...props}
                {...register('validFrom')}
                type="date"
                disabled={isEditing}
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  isEditing && 'bg-muted cursor-not-allowed',
                  errors.validFrom && 'border-red-500'
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
