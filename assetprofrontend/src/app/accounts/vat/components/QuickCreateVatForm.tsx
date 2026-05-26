'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import { vatApi, accountsApi } from '@/lib/api/accounts';
import type { Vat, Account, CreateVatDto } from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField, EntityCombobox } from '@/components/erp';

// ============================================================================
// SCHEMA
// ============================================================================

const quickVatSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  rate: z.coerce
    .number()
    .min(0, 'Rate must be between 0 and 100')
    .max(100, 'Rate must be between 0 and 100'),
  accountId: z.coerce.number().optional(),
  isActive: z.boolean(),
});

type QuickVatFormValues = z.infer<typeof quickVatSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface QuickCreateVatFormProps {
  /** Pre-filled name from combobox search */
  initialName: string;
  /** Whether drawer is in expanded mode */
  isExpanded: boolean;
  /** Toggle expand */
  toggleExpand: () => void;
  /** Called with created entity on success */
  onSave: (vat: Vat) => void;
  /** Called when user cancels */
  onCancel: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function QuickCreateVatForm({
  initialName,
  isExpanded,
  toggleExpand,
  onSave,
  onCancel,
}: QuickCreateVatFormProps) {
  // Accounts for GL dropdown (only loaded in expanded mode)
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuickVatFormValues>({
    resolver: zodResolver(quickVatSchema),
    defaultValues: {
      name: initialName,
      code: initialName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8),
      rate: 0,
      accountId: undefined,
      isActive: true,
    },
  });

  const nameValue = watch('name');

  // Auto-suggest code from name (only if user hasn't manually edited it)
  useEffect(() => {
    if (!codeManuallyEdited && nameValue) {
      const suggested = nameValue
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 8);
      setValue('code', suggested);
    }
  }, [nameValue, codeManuallyEdited, setValue]);

  // Load accounts when expanded
  useEffect(() => {
    if (!isExpanded || accounts.length > 0) return;

    const loadAccounts = async () => {
      try {
        setAccountsLoading(true);
        const response = await accountsApi.list({
          accountType: 'liability',
          isPosting: true,
        });
        setAccounts(response.data);
      } catch {
        // Non-critical — user can still create without GL account
      } finally {
        setAccountsLoading(false);
      }
    };
    loadAccounts();
  }, [isExpanded, accounts.length]);

  const onFormSubmit = async (data: QuickVatFormValues) => {
    try {
      const createData: CreateVatDto = {
        name: data.name,
        code: data.code.toUpperCase(),
        rate: data.rate,
        accountId: isExpanded ? data.accountId : undefined,
        isActive: isExpanded ? data.isActive : true,
      };
      const created = await vatApi.create(createData);
      onSave(created);
    } catch (err: unknown) {
      setError('root', {
        message: extractErrorMessage(err, 'Failed to create VAT rate'),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {/* Error Banner */}
      {errors.root && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      {/* Fields */}
      <div className="space-y-4">
        {isExpanded ? (
          /* ── Expanded mode: 2-column layout with all fields ── */
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField id="qc-vat-name" label="Name" required error={errors.name?.message}>
                {(fieldProps) => (
                  <input
                    {...fieldProps}
                    {...register('name')}
                    type="text"
                    placeholder="e.g., Standard VAT"
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                      errors.name && 'border-red-500',
                    )}
                  />
                )}
              </FormField>

              <FormField id="qc-vat-code" label="Code" required error={errors.code?.message}>
                {(fieldProps) => (
                  <input
                    {...fieldProps}
                    {...register('code', {
                      setValueAs: (v: string) => v.toUpperCase(),
                      onChange: () => setCodeManuallyEdited(true),
                    })}
                    type="text"
                    placeholder="e.g., VAT-STD"
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono',
                      errors.code && 'border-red-500',
                    )}
                  />
                )}
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField id="qc-vat-rate" label="Rate (%)" required error={errors.rate?.message}>
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
                      'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                      errors.rate && 'border-red-500',
                    )}
                  />
                )}
              </FormField>

              <EntityCombobox
                value={watch('accountId') ?? null}
                onChange={(id) => setValue('accountId', id as number | undefined, { shouldValidate: true })}
                items={accounts}
                labelKey="name"
                subtitleKey="code"
                searchKeys={['name', 'code']}
                label="GL Account"
                placeholder="Select GL Account"
                disabled={accountsLoading}
                allowNull
                nullLabel="None"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('isActive')}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm">Active</span>
            </label>
          </>
        ) : (
          /* ── Compact mode: single column, required fields only ── */
          <>
            <FormField id="qc-vat-name" label="Name" required error={errors.name?.message}>
              {(fieldProps) => (
                <input
                  {...fieldProps}
                  {...register('name')}
                  type="text"
                  placeholder="e.g., Standard VAT"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                    errors.name && 'border-red-500',
                  )}
                />
              )}
            </FormField>

            <FormField id="qc-vat-code" label="Code" required error={errors.code?.message}>
              {(fieldProps) => (
                <input
                  {...fieldProps}
                  {...register('code', {
                    setValueAs: (v: string) => v.toUpperCase(),
                    onChange: () => setCodeManuallyEdited(true),
                  })}
                  type="text"
                  placeholder="e.g., VAT-STD"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono',
                    errors.code && 'border-red-500',
                  )}
                />
              )}
            </FormField>

            <FormField id="qc-vat-rate" label="Rate (%)" required error={errors.rate?.message}>
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
                    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                    errors.rate && 'border-red-500',
                  )}
                />
              )}
            </FormField>
          </>
        )}
      </div>

      {/* Expand/Collapse toggle */}
      <button
        type="button"
        onClick={toggleExpand}
        className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
      >
        {isExpanded ? (
          <>
            <ChevronLeft className="h-4 w-4" />
            Less Details
          </>
        ) : (
          <>
            <ChevronRight className="h-4 w-4" />
            More Details
          </>
        )}
      </button>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
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
            <Plus className="h-4 w-4" />
          )}
          Create VAT Rate
        </button>
      </div>
    </form>
  );
}
