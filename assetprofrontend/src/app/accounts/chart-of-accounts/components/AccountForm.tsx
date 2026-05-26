'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X, Info } from 'lucide-react';
import { accountsApi, categoriesApi } from '@/lib/api/accounts';
import type { CreateAccountDto, UpdateAccountDto, Account, Category } from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// SCHEMAS
// ============================================================================

const accountFormSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'Account name is required'),
  description: z.string().optional(),
  accountType: z.string().min(1, 'Account type is required'),
  ifrs18AccountType: z.string().optional(),
  parentId: z.number().optional(),
  categoryId: z.number().optional(),
  isPosting: z.boolean(),
  closingRate: z.boolean(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof accountFormSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface AccountFormProps {
  account?: Account;
  onSubmit: (data: CreateAccountDto | UpdateAccountDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const accountTypes = [
  { value: 'asset', label: 'Asset', description: 'Resources owned by the company' },
  { value: 'liability', label: 'Liability', description: 'Obligations owed to others' },
  { value: 'equity', label: 'Equity', description: "Owner's investment in the company" },
  { value: 'revenue', label: 'Revenue', description: 'Income from operations' },
  { value: 'expense', label: 'Expense', description: 'Costs incurred in operations' },
];

const ifrs18AccountTypes = [
  { value: 'operating', label: 'Operating', description: 'Core business activities' },
  { value: 'investing', label: 'Investing', description: 'Investment activities' },
  { value: 'financing', label: 'Financing', description: 'Financing activities' },
];

// ============================================================================
// ACCOUNT FORM COMPONENT
// ============================================================================

export function AccountForm({ account, onSubmit, onCancel, submitLabel = 'Save' }: AccountFormProps) {
  const isEditing = !!account;

  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [parentAccounts, setParentAccounts] = useState<Account[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setError,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      code: account?.code ?? '',
      name: account?.name ?? '',
      description: account?.description ?? '',
      accountType: account?.accountType ?? 'asset',
      ifrs18AccountType: account?.ifrs18AccountType ?? '',
      parentId: account?.parentId ?? undefined,
      categoryId: account?.categoryId ?? undefined,
      isPosting: account?.isPosting ?? true,
      closingRate: account?.closingRate ?? false,
      isActive: account?.isActive ?? true,
    },
  });

  const watchedAccountType = watch('accountType');
  const watchedIfrs18Type = watch('ifrs18AccountType');

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const cats = await categoriesApi.list();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  // Load parent accounts (based on account type)
  useEffect(() => {
    const loadParentAccounts = async () => {
      try {
        setAccountsLoading(true);
        const response = await accountsApi.list({
          accountType: watchedAccountType,
          isPosting: false,
        });
        const filtered = isEditing
          ? response.data.filter((a: Account) => a.id !== account?.id)
          : response.data;
        setParentAccounts(filtered);
      } catch (err) {
        console.error('Failed to load parent accounts:', err);
      } finally {
        setAccountsLoading(false);
      }
    };
    loadParentAccounts();
  }, [watchedAccountType, isEditing, account?.id]);

  // Map account types to their matching granular category types
  const CATEGORY_TYPE_MAP: Record<string, string[]> = {
    asset: ['current_asset', 'non_current_asset', 'contra_asset', 'inventory', 'bank', 'receivable', 'reconciliation'],
    liability: ['current_liability', 'non_current_liability', 'control', 'payable'],
    equity: ['equity'],
    revenue: ['operating_revenue', 'non_operating_revenue'],
    expense: ['operating_expense', 'direct_expense', 'overhead_expense', 'other_expense'],
  };

  const filteredCategories = categories.filter(
    (cat) => CATEGORY_TYPE_MAP[watchedAccountType]?.includes(cat.categoryType)
  );

  const onFormSubmit = async (data: FormValues) => {
    try {
      if (!isEditing && (!data.code || data.code.trim() === '')) {
        setError('code', { message: 'Account code is required' });
        return;
      }
      if (!isEditing && data.code && !/^[A-Za-z0-9-]+$/.test(data.code)) {
        setError('code', { message: 'Account code can only contain letters, numbers, and hyphens' });
        return;
      }
      if (isEditing) {
        await onSubmit({
          name: data.name,
          description: data.description || undefined,
          accountType: data.accountType,
          ifrs18AccountType: data.ifrs18AccountType || undefined,
          parentId: data.parentId || undefined,
          categoryId: data.categoryId || undefined,
          isPosting: data.isPosting,
          closingRate: data.closingRate,
          isActive: data.isActive,
        } as UpdateAccountDto);
      } else {
        await onSubmit({
          code: data.code!,
          name: data.name,
          description: data.description || undefined,
          accountType: data.accountType,
          ifrs18AccountType: data.ifrs18AccountType || undefined,
          parentId: data.parentId || undefined,
          categoryId: data.categoryId || undefined,
          isPosting: data.isPosting,
          closingRate: data.closingRate,
          isActive: data.isActive,
        } as CreateAccountDto);
      }
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to save account') });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      {/* Error Message */}
      {errors.root && (
        <div role="alert" className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      {/* Form Content */}
      <div className="rounded-xl border bg-card p-6 space-y-6">
        {/* Account Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Account Type <span className="text-red-500">*</span>
          </label>
          <Controller
            name="accountType"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {accountTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      field.onChange(type.value);
                      // Reset parent and category when account type changes
                      setValue('parentId', undefined);
                      setValue('categoryId', undefined);
                    }}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-all',
                      field.value === type.value
                        ? 'border-primary bg-primary/5 ring-2 ring-primary'
                        : 'hover:border-primary/50'
                    )}
                  >
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                  </button>
                ))}
              </div>
            )}
          />
          {errors.accountType && (
            <p role="alert" className="mt-2 text-sm text-red-500">{errors.accountType.message}</p>
          )}
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Code */}
          <FormField
            id="code"
            label="Account Code"
            required={!isEditing}
            error={errors.code?.message}
            description={isEditing ? 'Account code cannot be changed after creation' : undefined}
          >
            {(props) =>
              isEditing ? (
                <input
                  {...props}
                  type="text"
                  value={account.code}
                  disabled
                  className="w-full rounded-lg border px-4 py-2 bg-muted cursor-not-allowed"
                />
              ) : (
                <input
                  {...props}
                  {...register('code')}
                  type="text"
                  placeholder="e.g., 1001, CASH-001"
                  className={cn(
                    'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                    errors.code && 'border-red-500'
                  )}
                />
              )
            }
          </FormField>

          {/* Account Name */}
          <FormField id="name" label="Account Name" required error={errors.name?.message}>
            {(props) => (
              <input
                {...props}
                {...register('name')}
                type="text"
                placeholder="e.g., Cash on Hand"
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  errors.name && 'border-red-500'
                )}
              />
            )}
          </FormField>

          {/* Description */}
          <div className="md:col-span-2">
            <FormField id="description" label="Description">
              {(props) => (
                <textarea
                  {...props}
                  {...register('description')}
                  placeholder="Optional description of the account"
                  rows={2}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </FormField>
          </div>
        </div>

        {/* Classification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField id="parentId" label="Parent Account" description="Select a parent account to create a sub-account">
            {(props) => (
              <select
                {...props}
                {...register('parentId', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={accountsLoading}
              >
                <option value="">No Parent (Top Level)</option>
                {parentAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <FormField id="categoryId" label="Category" description="Categories help organize accounts for reporting">
            {(props) => (
              <select
                {...props}
                {...register('categoryId', { setValueAs: (v) => (v === '' ? undefined : Number(v)) })}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={categoriesLoading}
              >
                <option value="">Select Category</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>

        {/* IFRS 18 Classification */}
        {(watchedAccountType === 'revenue' || watchedAccountType === 'expense') && (
          <div>
            <label className="block text-sm font-medium mb-3">
              IFRS 18 Classification
              <span className="ml-2 text-muted-foreground text-xs">(for cash flow reporting)</span>
            </label>
            <Controller
              name="ifrs18AccountType"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {ifrs18AccountTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        field.onChange(field.value === type.value ? '' : type.value)
                      }
                      className={cn(
                        'rounded-lg border p-3 text-left transition-all',
                        field.value === type.value
                          ? 'border-primary bg-primary/5 ring-2 ring-primary'
                          : 'hover:border-primary/50'
                      )}
                    >
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>
        )}

        {/* Account Options */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Account Options</h4>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                {...register('isPosting')}
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium">Posting Account</span>
                <p className="text-xs text-muted-foreground">
                  Allows transactions to be posted directly
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                {...register('closingRate')}
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium">Use Closing Rate</span>
                <p className="text-xs text-muted-foreground">
                  For multi-currency translation
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                {...register('isActive')}
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium">Active</span>
                <p className="text-xs text-muted-foreground">
                  Account can be used in transactions
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Help Note - only for create */}
        {!isEditing && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">Account Structure Tips</p>
                <ul className="mt-1 list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                  <li>Use consistent numbering (e.g., 1xxx for assets, 2xxx for liabilities)</li>
                  <li>Non-posting accounts serve as headers/groups in reports</li>
                  <li>Categories help with IFRS/GAAP compliant reporting</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="mt-6 flex items-center justify-end gap-4">
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
