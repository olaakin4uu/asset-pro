'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { accountsApi } from '@/lib/api/accounts';
import type { Wht, Account, CreateWhtDto, UpdateWhtDto } from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField, EntityCombobox } from '@/components/erp';

// ============================================================================
// SCHEMAS
// ============================================================================

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  rate: z.coerce.number().min(0, 'Rate must be between 0 and 100').max(100, 'Rate must be between 0 and 100'),
  accountId: z.coerce.number().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
});

const editSchema = createSchema.omit({ code: true });

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface WhtFormProps {
  wht?: Wht;
  onSubmit: (data: CreateWhtDto | UpdateWhtDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// WHT FORM COMPONENT
// ============================================================================

export function WhtForm({ wht, onSubmit, onCancel, submitLabel = 'Save' }: WhtFormProps) {
  const isEditing = !!wht;

  // Accounts for GL account dropdown
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: {
      name: wht?.name ?? '',
      code: wht?.code ?? '',
      rate: Number(wht?.rate) || 0,
      accountId: wht?.accountId ?? undefined,
      description: wht?.description ?? '',
      isActive: wht?.isActive ?? true,
    },
  });

  // Load accounts for dropdown
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setAccountsLoading(true);
        const response = await accountsApi.list({ accountType: 'liability', isPosting: true });
        setAccounts(response.data);
      } catch (err) {
        console.error('Failed to load accounts:', err);
      } finally {
        setAccountsLoading(false);
      }
    };
    loadAccounts();
  }, []);

  const onFormSubmit = async (data: CreateFormValues) => {
    try {
      if (isEditing) {
        await onSubmit({
          name: data.name,
          rate: data.rate,
          accountId: data.accountId || undefined,
          description: data.description || undefined,
          isActive: data.isActive,
        } as UpdateWhtDto);
      } else {
        await onSubmit({
          name: data.name,
          code: data.code,
          rate: data.rate,
          accountId: data.accountId || undefined,
          description: data.description || undefined,
          isActive: data.isActive,
        } as CreateWhtDto);
      }
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to save WHT rate') });
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
        {/* Name and Code */}
        <div className="grid grid-cols-2 gap-4">
          <FormField id="name" label="Name" required error={errors.name?.message}>
            {(props) => (
              <input
                {...props}
                {...register('name')}
                type="text"
                placeholder="e.g., Professional Services"
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
            {(props) => (
              <input
                {...props}
                {...register('code')}
                type="text"
                placeholder="e.g., WHT-PROF"
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
          {(props) => (
            <input
              {...props}
              {...register('rate')}
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="e.g., 10"
              className={cn(
                'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.rate && 'border-red-500'
              )}
            />
          )}
        </FormField>

        {/* GL Account */}
        <EntityCombobox
          value={watch('accountId') ?? null}
          onChange={(id) => setValue('accountId', id as number | undefined, { shouldValidate: true })}
          items={accounts}
          labelKey="name"
          subtitleKey="code"
          searchKeys={['name', 'code']}
          label="GL Account (WHT Payable)"
          placeholder="Select GL Account"
          disabled={accountsLoading}
          allowNull
          nullLabel="None"
        />

        {/* Description */}
        <FormField id="description" label="Description">
          {(props) => (
            <textarea
              {...props}
              {...register('description')}
              placeholder="Optional description..."
              rows={3}
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          )}
        </FormField>

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
