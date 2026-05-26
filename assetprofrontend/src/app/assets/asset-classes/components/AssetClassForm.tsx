'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { lookupsApi } from '@/lib/api/lookups';
import type { AssetClass, CreateAssetClassDto, UpdateAssetClassDto, DepreciationMethod } from '@/types/assets';
import { extractErrorMessage } from '@/lib/utils';
import { FormField, EntityCombobox } from '@/components/erp';

// ============================================================================
// SCHEMAS
// ============================================================================

const createSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  depreciationMethod: z.string(),
  usefulLifeYears: z.coerce.number().min(1, 'Useful life must be at least 1 year'),
  residualValuePercent: z.coerce.number().min(0).max(100, 'Residual value must be between 0 and 100'),
  assetAccountId: z.string(),
  accumulatedDepreciationAccountId: z.string(),
  depreciationExpenseAccountId: z.string(),
  isActive: z.boolean(),
});

const editSchema = createSchema.omit({ code: true });

type CreateFormValues = z.infer<typeof createSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface AssetClassFormProps {
  assetClass?: AssetClass;
  onSubmit: (data: CreateAssetClassDto | UpdateAssetClassDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

interface Account {
  id: number;
  code: string;
  name: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const depreciationMethods: { value: DepreciationMethod; label: string }[] = [
  { value: 'STRAIGHT_LINE', label: 'Straight Line' },
  { value: 'DECLINING_BALANCE', label: 'Declining Balance' },
  { value: 'UNITS_OF_PRODUCTION', label: 'Units of Production' },
  { value: 'SUM_OF_YEARS_DIGITS', label: 'Sum of Years Digits' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function AssetClassForm({ assetClass, onSubmit, onCancel, submitLabel }: AssetClassFormProps) {
  const isEditing = !!assetClass;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: {
      code: assetClass?.code || '',
      name: assetClass?.name || '',
      description: assetClass?.description || '',
      depreciationMethod: assetClass?.depreciationMethod || 'STRAIGHT_LINE',
      usefulLifeYears: assetClass?.usefulLifeYears || 5,
      residualValuePercent: assetClass?.residualValuePercent || 0,
      assetAccountId: assetClass?.assetAccountId?.toString() || '',
      accumulatedDepreciationAccountId: assetClass?.accumulatedDepreciationAccountId?.toString() || '',
      depreciationExpenseAccountId: assetClass?.depreciationExpenseAccountId?.toString() || '',
      isActive: assetClass?.isActive ?? true,
    },
  });

  const loadAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);
      const response = await lookupsApi.accounts({ isActive: true, limit: 1000 });
      setAccounts(response.data || []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const onFormSubmit = async (data: CreateFormValues) => {
    try {
      const submitData: CreateAssetClassDto | UpdateAssetClassDto = {
        ...(isEditing ? {} : { code: data.code }),
        name: data.name,
        description: data.description || undefined,
        depreciationMethod: data.depreciationMethod as DepreciationMethod,
        usefulLifeYears: data.usefulLifeYears,
        residualValuePercent: data.residualValuePercent,
        assetAccountId: data.assetAccountId ? Number(data.assetAccountId) : undefined,
        accumulatedDepreciationAccountId: data.accumulatedDepreciationAccountId
          ? Number(data.accumulatedDepreciationAccountId)
          : undefined,
        depreciationExpenseAccountId: data.depreciationExpenseAccountId
          ? Number(data.depreciationExpenseAccountId)
          : undefined,
        isActive: data.isActive,
      };
      await onSubmit(submitData);
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to save asset class') });
    }
  };

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {errors.root && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="code"
            label="Code"
            required={!isEditing}
            error={errors.code?.message}
            description={isEditing ? 'Code cannot be changed after creation' : undefined}
          >
            {(props) => (
              <input
                {...props}
                {...register('code')}
                type="text"
                disabled={isEditing}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
                placeholder="e.g., COMP"
              />
            )}
          </FormField>

          <FormField id="name" label="Name" required error={errors.name?.message}>
            {(props) => (
              <input
                {...props}
                {...register('name')}
                type="text"
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Computer Equipment"
              />
            )}
          </FormField>

          <div className="md:col-span-2">
            <FormField id="description" label="Description">
              {(props) => (
                <textarea
                  {...props}
                  {...register('description')}
                  rows={3}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Description of this asset class..."
                />
              )}
            </FormField>
          </div>

          <div className="flex items-center gap-2">
            <input
              {...register('isActive')}
              type="checkbox"
              id="isActive"
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              Active
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Depreciation Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField id="depreciationMethod" label="Depreciation Method">
            {(props) => (
              <select
                {...props}
                {...register('depreciationMethod')}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {depreciationMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField id="usefulLifeYears" label="Useful Life (Years)" required error={errors.usefulLifeYears?.message}>
            {(props) => (
              <input
                {...props}
                {...register('usefulLifeYears', { valueAsNumber: true })}
                type="number"
                min="1"
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>

          <FormField id="residualValuePercent" label="Residual Value (%)" error={errors.residualValuePercent?.message}>
            {(props) => (
              <input
                {...props}
                {...register('residualValuePercent', { valueAsNumber: true })}
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">GL Account Integration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField id="assetAccountId" label="Asset Account" description="Account for asset cost">
            {() => (
              <EntityCombobox
                value={watch('assetAccountId') ? Number(watch('assetAccountId')) : null}
                onChange={(val) => setValue('assetAccountId', val ? String(val) : '')}
                items={accounts}
                labelKey="name"
                subtitleKey="code"
                searchKeys={['name', 'code']}
                placeholder="Select account..."
                allowNull
              />
            )}
          </FormField>

          <FormField id="accumulatedDepreciationAccountId" label="Accumulated Depreciation Account" description="Contra-asset account">
            {() => (
              <EntityCombobox
                value={watch('accumulatedDepreciationAccountId') ? Number(watch('accumulatedDepreciationAccountId')) : null}
                onChange={(val) => setValue('accumulatedDepreciationAccountId', val ? String(val) : '')}
                items={accounts}
                labelKey="name"
                subtitleKey="code"
                searchKeys={['name', 'code']}
                placeholder="Select account..."
                allowNull
              />
            )}
          </FormField>

          <FormField id="depreciationExpenseAccountId" label="Depreciation Expense Account" description="Expense account for depreciation">
            {() => (
              <EntityCombobox
                value={watch('depreciationExpenseAccountId') ? Number(watch('depreciationExpenseAccountId')) : null}
                onChange={(val) => setValue('depreciationExpenseAccountId', val ? String(val) : '')}
                items={accounts}
                labelKey="name"
                subtitleKey="code"
                searchKeys={['name', 'code']}
                placeholder="Select account..."
                allowNull
              />
            )}
          </FormField>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2 rounded-lg border hover:bg-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel || (isEditing ? 'Save Changes' : 'Create Asset Class')}
        </button>
      </div>
    </form>
  );
}
