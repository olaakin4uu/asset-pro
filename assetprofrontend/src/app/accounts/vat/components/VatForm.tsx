'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { accountsApi } from '@/lib/api/accounts';
import type { Vat, Account, CreateVatDto, UpdateVatDto } from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField, EntityCombobox } from '@/components/erp';

// ============================================================================
// SCHEMA
// ============================================================================

const vatSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  rate: z.coerce.number().min(0, 'Rate must be between 0 and 100').max(100, 'Rate must be between 0 and 100'),
  accountId: z.coerce.number().optional(),
  inputAccountId: z.coerce.number().optional(),
  isActive: z.boolean(),
});

type VatFormValues = z.infer<typeof vatSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface VatFormProps {
  vat?: Vat;
  onSubmit: (data: CreateVatDto | UpdateVatDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// VAT FORM COMPONENT
// ============================================================================

export function VatForm({ vat, onSubmit, onCancel, submitLabel = 'Save' }: VatFormProps) {
  const isEditing = !!vat;

  const [liabilityAccounts, setLiabilityAccounts] = useState<Account[]>([]);
  const [assetAccounts, setAssetAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // React Hook Form
  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VatFormValues>({
    resolver: zodResolver(vatSchema),
    defaultValues: {
      name: vat?.name ?? '',
      code: vat?.code ?? '',
      rate: Number(vat?.rate) || 0,
      accountId: vat?.accountId ?? undefined,
      inputAccountId: vat?.inputAccountId ?? undefined,
      isActive: vat?.isActive ?? true,
    },
  });

  // Load both liability (output VAT payable) and asset (input VAT recoverable) accounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setAccountsLoading(true);
        const [liabilityRes, assetRes] = await Promise.all([
          accountsApi.list({ accountType: 'liability', isPosting: true }),
          accountsApi.list({ accountType: 'asset', isPosting: true }),
        ]);
        setLiabilityAccounts(liabilityRes.data);
        setAssetAccounts(assetRes.data);
      } catch (err) {
        console.error('Failed to load accounts:', err);
      } finally {
        setAccountsLoading(false);
      }
    };
    loadAccounts();
  }, []);

  // Handle submit
  const onFormSubmit = async (data: VatFormValues) => {
    try {
      if (isEditing) {
        const updateData: UpdateVatDto = {
          name: data.name,
          rate: data.rate,
          accountId: data.accountId,
          inputAccountId: data.inputAccountId,
          isActive: data.isActive,
        };
        await onSubmit(updateData);
      } else {
        const createData: CreateVatDto = {
          name: data.name,
          code: data.code,
          rate: data.rate,
          accountId: data.accountId,
          inputAccountId: data.inputAccountId,
          isActive: data.isActive,
        };
        await onSubmit(createData);
      }
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to save VAT rate') });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Error Banner */}
      {errors.root && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 space-y-6">
        {/* Name and Code */}
        <div className="grid grid-cols-2 gap-4">
          <FormField id="name" label="Name" required error={errors.name?.message}>
            {(fieldProps) => (
              <input
                {...fieldProps}
                {...register('name')}
                type="text"
                placeholder="e.g., Standard VAT"
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  errors.name && 'border-red-500'
                )}
              />
            )}
          </FormField>

          <FormField
            id="code"
            label="Code"
            required={!isEditing}
            error={errors.code?.message}
            description={isEditing ? 'Code cannot be changed' : undefined}
          >
            {(fieldProps) => (
              <input
                {...fieldProps}
                {...register('code', {
                  setValueAs: (v: string) => v.toUpperCase(),
                })}
                type="text"
                placeholder="e.g., VAT-STD"
                disabled={isEditing}
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary font-mono',
                  isEditing && 'bg-muted cursor-not-allowed',
                  errors.code && 'border-red-500'
                )}
              />
            )}
          </FormField>
        </div>

        {/* Rate */}
        <FormField id="rate" label="Rate (%)" required error={errors.rate?.message}>
          {(fieldProps) => (
            <input
              {...fieldProps}
              {...register('rate')}
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="e.g., 7.5"
              className={cn(
                'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.rate && 'border-red-500'
              )}
            />
          )}
        </FormField>

        {/* GL Accounts — output (payable) and input (recoverable) side by side */}
        <div className="grid grid-cols-2 gap-4">
          <EntityCombobox
            value={watch('accountId') ?? null}
            onChange={(id) => setValue('accountId', id as number | undefined, { shouldValidate: true })}
            items={liabilityAccounts}
            labelKey="name"
            subtitleKey="code"
            searchKeys={['name', 'code']}
            label="GL Account (VAT Payable)"
            placeholder="Select liability account"
            disabled={accountsLoading}
            allowNull
            nullLabel="None"
          />

          <EntityCombobox
            value={watch('inputAccountId') ?? null}
            onChange={(id) => setValue('inputAccountId', id as number | undefined, { shouldValidate: true })}
            items={assetAccounts}
            labelKey="name"
            subtitleKey="code"
            searchKeys={['name', 'code']}
            label="GL Account (VAT Recoverable)"
            placeholder="Select asset account"
            disabled={accountsLoading}
            allowNull
            nullLabel="None"
          />
        </div>

        {/* Active Checkbox */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            id="isActive"
            {...register('isActive')}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Active</span>
        </label>
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
