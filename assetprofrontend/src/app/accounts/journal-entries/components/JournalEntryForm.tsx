'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Save,
  X,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Calculator,
} from 'lucide-react';
import { accountsApi, fiscalYearsApi, categoriesApi, companySettingsApi } from '@/lib/api/accounts';
import { api } from '@/lib/api';
import type {
  CreateJournalEntryDto,
  UpdateJournalEntryDto,
  Account,
  Category,
  FiscalYear,
  JournalEntry,
} from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField, EntityCombobox } from '@/components/erp';
import { useCurrencyFormat } from '@/hooks';

// ============================================================================
// RESTRICTED CATEGORIES
// ============================================================================

const RESTRICTED_CATEGORY_NAMES = [
  'cash',
  'bank',
  'inventory',
  'receivable',
  'payable',
  'vat payable',
  'wht payable',
  'share capital',
  'retained earnings',
];

function isRestrictedCategory(categoryName: string): boolean {
  return RESTRICTED_CATEGORY_NAMES.includes(categoryName.toLowerCase());
}

function getRestrictedCategoryLabel(categoryName: string): string {
  return categoryName;
}

// ============================================================================
// TYPES
// ============================================================================

interface JournalEntryFormProps {
  journalEntry?: JournalEntry;
  onSubmit: (data: CreateJournalEntryDto | UpdateJournalEntryDto) => Promise<void>;
  onSubmitAndPost?: (data: CreateJournalEntryDto) => Promise<void>; // Only for create
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const lineSchema = z.object({
  accountId: z.coerce.number().nullable(),
  debit: z.coerce.number().min(0),
  credit: z.coerce.number().min(0),
  narration: z.string().optional(),
  reference: z.string().optional(),
});

const formSchema = z.object({
  entryDate: z.string().min(1, 'Entry date is required'),
  reference: z.string().optional(),
  narration: z.string().optional(),
  journalType: z.string(),
  fiscalYearId: z.coerce.number().optional(),
  lines: z.array(lineSchema).min(2, 'At least 2 lines are required'),
});

type FormValues = z.infer<typeof formSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

const journalTypes = [
  { value: 'general', label: 'General', description: 'Standard journal entry' },
  { value: 'adjusting', label: 'Adjusting', description: 'Period-end adjustments' },
  { value: 'closing', label: 'Closing', description: 'Year-end closing entries' },
  { value: 'opening', label: 'Opening', description: 'Opening balance entries' },
];

// ============================================================================
// JOURNAL ENTRY FORM COMPONENT
// ============================================================================

export function JournalEntryForm({
  journalEntry,
  onSubmit,
  onSubmitAndPost,
  onCancel,
  submitLabel = 'Save',
}: JournalEntryFormProps) {
  const isEditing = !!journalEntry;

  // Data state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [controlAccountIds, setControlAccountIds] = useState<Set<number>>(new Set());
  const [dataLoading, setDataLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setError,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entryDate: journalEntry?.entryDate?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      reference: journalEntry?.reference ?? '',
      narration: journalEntry?.narration ?? '',
      journalType: journalEntry?.journalType ?? 'general',
      fiscalYearId: journalEntry?.fiscalYearId ?? undefined,
      lines:
        journalEntry?.lines && journalEntry.lines.length > 0
          ? journalEntry.lines.map((line) => ({
              accountId: line.accountId,
              debit: line.debit || 0,
              credit: line.credit || 0,
              narration: line.narration || '',
              reference: line.reference || '',
            }))
          : [
              { accountId: null, debit: 0, credit: 0, narration: '', reference: '' },
              { accountId: null, debit: 0, credit: 0, narration: '', reference: '' },
            ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines',
  });

  const watchedLines = watch('lines');

  // Load accounts and fiscal years

  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true);

        const [accountsResponse, categoriesResponse, fiscalYearsResponse, settingsResponse, categoryGlResponse] = await Promise.all([
          accountsApi.list({ isPosting: true, isActive: true }),
          categoriesApi.list(),
          fiscalYearsApi.list(isEditing ? undefined : { status: 'open' }),
          companySettingsApi.get().catch(() => null),
          api.get('/inventory/item-categories', { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
        ]);

        setAccounts(accountsResponse.data);
        setCategories(categoriesResponse);
        setFiscalYears(fiscalYearsResponse.data);

        // Build control account IDs from company settings + category GL mappings
        const controlIds = new Set<number>();
        const settings = settingsResponse as Record<string, unknown> | null;
        if (settings) {
          for (const key of ['defaultCashAccountId', 'defaultBankAccountId', 'defaultSalesRevenueAccountId',
            'defaultAccountsReceivableAccountId', 'defaultVatOutputAccountId', 'defaultCustomerDepositsAccountId',
            'defaultDiscountAllowedAccountId', 'defaultCogsAccountId', 'defaultInventoryAccountId',
            'defaultVarianceAccountId']) {
            const id = settings[key] as number;
            if (id) controlIds.add(id);
          }
        }
        // Extract all GL account IDs from item category mappings
        const catData = ((categoryGlResponse as Record<string, unknown>).data as Record<string, unknown>)?.data || (categoryGlResponse as Record<string, unknown>).data || [];
        for (const cat of catData as Record<string, unknown>[]) {
          const mappings = cat.glAccountMappings as Record<string, number> | null;
          if (mappings) {
            for (const val of Object.values(mappings)) {
              if (typeof val === 'number' && val > 0) controlIds.add(val);
            }
          }
        }
        setControlAccountIds(controlIds);

        // Set default fiscal year to current (only for create)
        if (!isEditing && !journalEntry?.fiscalYearId) {
          const currentFY = fiscalYearsResponse.data.find((fy: FiscalYear) => fy.isCurrent);
          if (currentFY) {
            setValue('fiscalYearId', currentFY.id);
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, [isEditing, journalEntry?.fiscalYearId, setValue]);

  // Build category lookup map: categoryId -> categoryName
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const cat of categories) {
      map.set(cat.id, cat.name);
    }
    return map;
  }, [categories]);

  // Check if an account is a control account (blocked from manual posting)
  const isControlAccount = (accountId: number | null): boolean => {
    if (!accountId) return false;
    return controlAccountIds.has(accountId);
  };

  const getControlAccountLabel = (accountId: number | null): string | null => {
    if (!accountId || !controlAccountIds.has(accountId)) return null;
    const account = accounts.find((a) => a.id === accountId);
    return account ? `${account.code} - ${account.name} (Control Account — blocked from manual posting)` : 'Control Account';
  };

  // Track which lines have control accounts — computed inline (watch ref doesn't change for useMemo)
  const lineRestrictions = (watchedLines || []).map((line) => getControlAccountLabel(line.accountId));
  const hasAnyRestriction = lineRestrictions.some((r) => r !== null);

  // Calculate totals — no useMemo: watch() returns the same reference so memo never invalidates
  const totalDebit = (watchedLines || []).reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = (watchedLines || []).reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01;
  const totals = { totalDebit, totalCredit, difference, isBalanced };

  // Format currency
  const { formatCurrency } = useCurrencyFormat();
  // Auto-clear the opposite field when entering debit/credit
  const handleDebitChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setValue(`lines.${index}.debit`, numValue);
    if (numValue > 0) {
      setValue(`lines.${index}.credit`, 0);
    }
  };

  const handleCreditChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setValue(`lines.${index}.credit`, numValue);
    if (numValue > 0) {
      setValue(`lines.${index}.debit`, 0);
    }
  };

  // Build payload
  const buildPayload = (data: FormValues): CreateJournalEntryDto | UpdateJournalEntryDto => {
    return {
      entryDate: data.entryDate,
      reference: data.reference || undefined,
      narration: data.narration || undefined,
      journalType: data.journalType,
      fiscalYearId: data.fiscalYearId,
      lines: data.lines
        .filter((line) => line.accountId && (Number(line.debit) > 0 || Number(line.credit) > 0))
        .map((line) => ({
          accountId: line.accountId!,
          debit: Number(line.debit) > 0 ? Number(line.debit) : undefined,
          credit: Number(line.credit) > 0 ? Number(line.credit) : undefined,
          narration: line.narration || undefined,
          reference: line.reference || undefined,
        })),
    };
  };

  // Check for restricted accounts in lines
  const validateRestrictions = (data: FormValues): boolean => {
    const blockedLines: string[] = [];
    data.lines.forEach((line, idx) => {
      if (line.accountId && (Number(line.debit) > 0 || Number(line.credit) > 0)) {
        if (isControlAccount(line.accountId)) {
          const acct = accounts.find((a) => a.id === line.accountId);
          blockedLines.push(`Line ${idx + 1}: ${acct?.code || ''} - ${acct?.name || 'Control Account'}`);
        }
      }
    });
    if (blockedLines.length > 0) {
      setError('root', {
        message: `Cannot post to control accounts:\n${blockedLines.join('\n')}\n\nThese accounts are managed by the system (Sales, Purchase, Inventory, etc.). Use the appropriate module instead.`,
      });
      return false;
    }
    return true;
  };

  // Custom validation before submit
  const validateAndSubmit = async (data: FormValues) => {
    const linesWithAmounts = data.lines.filter((line) => Number(line.debit) > 0 || Number(line.credit) > 0);
    if (linesWithAmounts.length < 2) {
      setError('root', { message: 'At least 2 lines with amounts are required' });
      return;
    }

    const linesWithoutAccounts = linesWithAmounts.filter((line) => !line.accountId);
    if (linesWithoutAccounts.length > 0) {
      setError('root', { message: 'All lines with amounts must have an account selected' });
      return;
    }

    if (!totals.isBalanced) {
      setError('root', { message: `Entry is not balanced. Difference: ${formatCurrency(totals.difference)}` });
      return;
    }

    if (totals.totalDebit === 0) {
      setError('root', { message: 'Entry must have amounts greater than zero' });
      return;
    }

    if (!validateRestrictions(data)) return;

    try {
      const payload = buildPayload(data);
      await onSubmit(payload);
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to save journal entry') });
    }
  };

  // Handle submit and post (create only)
  const handleSubmitAndPost = async () => {
    if (!onSubmitAndPost) return;

    // Trigger RHF validation first
    handleSubmit(async (data) => {
      const linesWithAmounts = data.lines.filter((line) => Number(line.debit) > 0 || Number(line.credit) > 0);
      if (linesWithAmounts.length < 2) {
        setError('root', { message: 'At least 2 lines with amounts are required' });
        return;
      }

      const linesWithoutAccounts = linesWithAmounts.filter((line) => !line.accountId);
      if (linesWithoutAccounts.length > 0) {
        setError('root', { message: 'All lines with amounts must have an account selected' });
        return;
      }

      if (!totals.isBalanced) {
        setError('root', { message: `Entry is not balanced. Difference: ${formatCurrency(totals.difference)}` });
        return;
      }

      if (totals.totalDebit === 0) {
        setError('root', { message: 'Entry must have amounts greater than zero' });
        return;
      }

      if (!validateRestrictions(data)) return;

      try {
        const payload = buildPayload(data) as CreateJournalEntryDto;
        await onSubmitAndPost(payload);
      } catch (err: unknown) {
        setError('root', { message: extractErrorMessage(err, 'Failed to save journal entry') });
      }
    })();
  };

  return (
    <form onSubmit={handleSubmit(validateAndSubmit)}>
      {/* Error Messages */}
      {errors.root && (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      {/* Restricted Account Warning */}
      {hasAnyRestriction && (
        <div className="mb-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">Restricted Account Category Selected</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Journal entries cannot be posted directly to accounts under the following categories:{' '}
                <strong>Cash, Bank, Inventory, Receivable, Payable, VAT Payable, WHT Payable, Share Capital, Retained Earnings</strong>.
                These accounts are managed through their respective modules (e.g., Receipts, Payments, Invoices, Inventory movements).
              </p>
              <ul className="text-sm text-amber-700 dark:text-amber-400 mt-2 list-disc list-inside">
                {lineRestrictions.map((restriction, idx) =>
                  restriction ? (
                    <li key={idx}>
                      Line {idx + 1}: Account belongs to <strong>{restriction}</strong> category
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="rounded-xl border bg-card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <FormField id="entryDate" label="Entry Date" required error={errors.entryDate?.message}>
            {(props) => (
              <input
                {...props}
                {...register('entryDate')}
                type="date"
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  errors.entryDate && 'border-red-500'
                )}
              />
            )}
          </FormField>

          <FormField id="reference" label="Reference">
            {(props) => (
              <input
                {...props}
                {...register('reference')}
                type="text"
                placeholder="e.g., INV-001"
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>

          <FormField id="journalType" label="Journal Type">
            {(props) => (
              <select
                {...props}
                {...register('journalType')}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {journalTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <EntityCombobox
            value={watch('fiscalYearId') || null}
            onChange={(id) => setValue('fiscalYearId', id ? Number(id) : undefined)}
            items={fiscalYears}
            labelKey="name"
            searchKeys={['name']}
            label="Fiscal Year"
            placeholder="Select Fiscal Year..."
            disabled={dataLoading}
            allowNull
            nullLabel="None"
          />

          <div className="md:col-span-4">
            <FormField id="narration" label="Narration">
              {(props) => (
                <textarea
                  {...props}
                  {...register('narration')}
                  placeholder="Description of the journal entry..."
                  rows={2}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </FormField>
          </div>
        </div>
      </div>

      {/* Lines Section */}
      <div className="rounded-xl border bg-card overflow-hidden mb-6">
        <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
          <h3 className="font-semibold">Entry Lines</h3>
          <button
            type="button"
            onClick={() => append({ accountId: null, debit: 0, credit: 0, narration: '', reference: '' })}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Line
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium w-1/3">Account</th>
                <th className="text-right px-4 py-3 text-sm font-medium w-1/6">Debit</th>
                <th className="text-right px-4 py-3 text-sm font-medium w-1/6">Credit</th>
                <th className="text-left px-4 py-3 text-sm font-medium w-1/4">Line Narration</th>
                <th className="px-4 py-3 text-sm font-medium w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fields.map((field, index) => (
                <tr key={field.id} className={cn(
                  'hover:bg-muted/30',
                  lineRestrictions[index] && 'bg-amber-50/50 dark:bg-amber-900/10'
                )}>
                  <td className="px-4 py-3">
                    <EntityCombobox
                      value={watchedLines?.[index]?.accountId ?? null}
                      onChange={(id) => setValue(`lines.${index}.accountId`, id ? Number(id) : null)}
                      items={accounts}
                      labelKey="name"
                      subtitleKey="code"
                      searchKeys={['name', 'code']}
                      placeholder="Select Account..."
                      disabled={dataLoading}
                    />
                    {lineRestrictions[index] && (
                      <div className="flex items-center gap-1 mt-1 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs font-medium">
                          Restricted: {lineRestrictions[index]} category
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={watchedLines?.[index]?.debit || ''}
                      onChange={(e) => handleDebitChange(index, e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={watchedLines?.[index]?.credit || ''}
                      onChange={(e) => handleCreditChange(index, e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      {...register(`lines.${index}.narration`)}
                      type="text"
                      placeholder="Line description"
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 2}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Totals Footer */}
            <tfoot className="border-t-2 bg-muted/50">
              <tr>
                <td className="px-4 py-3 text-sm font-semibold text-right">Totals</td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold">{formatCurrency(totals.totalDebit)}</span>
                  {!totals.isBalanced && totals.totalDebit < totals.totalCredit && (
                    <div className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                      Need {formatCurrency(totals.difference)} more
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold">{formatCurrency(totals.totalCredit)}</span>
                  {!totals.isBalanced && totals.totalCredit < totals.totalDebit && (
                    <div className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                      Need {formatCurrency(totals.difference)} more
                    </div>
                  )}
                </td>
                <td colSpan={2} className="px-4 py-3">
                  {totals.isBalanced ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Balanced</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Difference: {formatCurrency(totals.difference)}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Balance Summary Bar */}
      <div className={cn(
        'rounded-xl border p-4 mb-6 flex items-center justify-between',
        totals.isBalanced ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
      )}>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Total Debit</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(totals.totalDebit)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Credit</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(totals.totalCredit)}</p>
          </div>
        </div>
        <div className="text-right">
          {totals.isBalanced ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Balanced</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">Out of Balance</span>
              </div>
              <p className="text-sm text-red-600 font-mono">
                {totals.totalDebit > totals.totalCredit
                  ? `Credit side needs ${formatCurrency(totals.difference)} more`
                  : `Debit side needs ${formatCurrency(totals.difference)} more`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calculator className="h-4 w-4" />
          <span>
            Total lines: {(watchedLines || []).filter((l) => l.accountId).length} |
            Total: {formatCurrency(totals.totalDebit)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>

          {isEditing && (
            <button
              type="submit"
              disabled={isSubmitting || !totals.isBalanced || hasAnyRestriction}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {submitLabel}
            </button>
          )}

          {!isEditing && (
            <>
              <button
                type="submit"
                disabled={isSubmitting || !totals.isBalanced || hasAnyRestriction}
                className="inline-flex items-center gap-2 rounded-lg border border-primary text-primary px-4 py-2 text-sm font-medium hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save as Draft
              </button>
              {onSubmitAndPost && (
                <button
                  type="button"
                  onClick={handleSubmitAndPost}
                  disabled={isSubmitting || !totals.isBalanced || hasAnyRestriction}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Save & Post
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </form>
  );
}
