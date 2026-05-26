'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { banksApi } from '@/lib/api/accounts';
import type { Bank, BankReconciliation, CreateBankReconciliationDto, UpdateBankReconciliationDto } from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField, EntityCombobox } from '@/components/erp';

// ============================================================================
// SCHEMAS
// ============================================================================

const formSchema = z.object({
  bankId: z.number().min(1, 'Bank is required'),
  reconciliationDate: z.string().min(1, 'Reconciliation date is required'),
  statementDate: z.string().min(1, 'Statement date is required'),
  statementBalance: z.number(),
  bookBalance: z.number(),
  status: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface BankReconciliationFormProps {
  entity?: BankReconciliation;
  onSubmit: (data: CreateBankReconciliationDto | UpdateBankReconciliationDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// BANK RECONCILIATION FORM COMPONENT
// ============================================================================

export function BankReconciliationForm({ entity, onSubmit, onCancel, submitLabel }: BankReconciliationFormProps) {
  const isEditing = !!entity;

  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankId: entity?.bankId ?? 0,
      reconciliationDate: entity?.reconciliationDate?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      statementDate: entity?.statementDate?.split('T')[0] ?? '',
      statementBalance: entity?.statementBalance ?? 0,
      bookBalance: entity?.bookBalance ?? 0,
      status: entity?.status ?? 'draft',
    },
  });

  useEffect(() => {
    const loadBanks = async () => {
      try {
        setLoadingBanks(true);
        const response = await banksApi.list();
        setBanks(response.data.filter((b: Bank) => b.isActive));
      } catch (err) {
        console.error('Failed to load banks:', err);
      } finally {
        setLoadingBanks(false);
      }
    };
    loadBanks();
  }, []);

  const onFormSubmit = async (data: FormValues) => {
    try {
      if (isEditing) {
        await onSubmit({
          reconciliationDate: data.reconciliationDate,
          statementDate: data.statementDate,
          statementBalance: data.statementBalance,
          bookBalance: data.bookBalance,
        } as UpdateBankReconciliationDto);
      } else {
        await onSubmit({
          bankId: data.bankId,
          reconciliationDate: data.reconciliationDate,
          statementDate: data.statementDate,
          statementBalance: data.statementBalance,
          bookBalance: data.bookBalance,
        } as CreateBankReconciliationDto);
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

        {/* Bank */}
        <EntityCombobox
          value={watch('bankId') || null}
          onChange={(id) => setValue('bankId', id as number ?? 0, { shouldValidate: true })}
          items={banks}
          labelKey="name"
          subtitleKey="accountNumber"
          searchKeys={['name', 'accountNumber']}
          placeholder="Select Bank"
          disabled={isEditing || loadingBanks}
          required={!isEditing}
          error={errors.bankId?.message}
        />

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="reconciliationDate" label="Reconciliation Date" required error={errors.reconciliationDate?.message}>
            {(props) => (
              <input
                {...props}
                {...register('reconciliationDate')}
                type="date"
                disabled={isEditing}
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  isEditing && 'bg-muted cursor-not-allowed',
                  errors.reconciliationDate && 'border-red-500'
                )}
              />
            )}
          </FormField>

          <FormField id="statementDate" label="Statement Date" required error={errors.statementDate?.message}>
            {(props) => (
              <input
                {...props}
                {...register('statementDate')}
                type="date"
                disabled={isEditing}
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  isEditing && 'bg-muted cursor-not-allowed',
                  errors.statementDate && 'border-red-500'
                )}
              />
            )}
          </FormField>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="statementBalance" label="Statement Balance" description="Balance per bank statement">
            {(props) => (
              <input
                {...props}
                {...register('statementBalance', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>

          <FormField id="bookBalance" label="Book Balance" description="Balance per your records">
            {(props) => (
              <input
                {...props}
                {...register('bookBalance', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>

        {/* Status (editing only) */}
        {isEditing && (
          <FormField id="status" label="Status" description="Mark as completed when reconciliation is finalized">
            {(props) => (
              <select
                {...props}
                {...register('status')}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="draft">Draft</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            )}
          </FormField>
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
          {submitLabel || (isEditing ? 'Save Changes' : 'Create Reconciliation')}
        </button>
      </div>
    </form>
  );
}
