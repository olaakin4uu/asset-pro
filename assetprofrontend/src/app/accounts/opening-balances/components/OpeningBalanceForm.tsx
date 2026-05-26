'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { openingBalancesApi } from '@/lib/api/accounts';
import type { OpeningBalance, OpeningBalanceEntryDto, SetOpeningBalancesDto, UpdateOpeningBalanceDto } from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// TYPES
// ============================================================================

interface AccountForBalance {
  id: number;
  code: string;
  name: string;
  accountType: string;
}

// Normal balance type per account type (standard accounting convention)
function getNormalBalanceType(accountType: string): 'debit' | 'credit' {
  switch (accountType) {
    case 'asset':
    case 'expense':
      return 'debit';
    case 'liability':
    case 'equity':
    case 'revenue':
      return 'credit';
    default:
      return 'debit';
  }
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ============================================================================
// BULK FORM (for Create - multiple entries)
// ============================================================================

interface BulkFormProps {
  year: number;
  period: number;
  onSubmit: (data: SetOpeningBalancesDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function OpeningBalanceBulkForm({
  year,
  period,
  onSubmit,
  onCancel,
  submitLabel = 'Save Balances',
}: BulkFormProps) {
  const [accounts, setAccounts] = useState<AccountForBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Balances map: accountId -> { balance, balanceType }
  const [balances, setBalances] = useState<Record<number, { balance: string; balanceType: 'debit' | 'credit' }>>({});

  // Track which accounts already have balances saved in the database
  const [existingBalanceIds, setExistingBalanceIds] = useState<Set<number>>(new Set());

  // Load all posting accounts and existing balances for this year/period
  useEffect(() => {
    const loadData = async () => {
      try {
        setAccountsLoading(true);
        const [accountList, existingData] = await Promise.all([
          openingBalancesApi.getAccounts(),
          openingBalancesApi.list({ year, period, includeZeroBalances: false }),
        ]);
        setAccounts(accountList);

        // Pre-populate form with existing balances
        if (existingData?.data?.length > 0) {
          const existingMap: Record<number, { balance: string; balanceType: 'debit' | 'credit' }> = {};
          const existingIds = new Set<number>();
          for (const bal of existingData.data) {
            existingMap[bal.accountId] = {
              balance: String(Number(bal.balance)),
              balanceType: bal.balanceType as 'debit' | 'credit',
            };
            existingIds.add(bal.accountId);
          }
          setBalances(existingMap);
          setExistingBalanceIds(existingIds);
        }
      } catch (err) {
        console.error('Failed to load accounts:', err);
      } finally {
        setAccountsLoading(false);
      }
    };
    loadData();
  }, [year, period]);

  // Update balance for an account
  const updateBalance = (accountId: number, balance: string) => {
    const account = accounts.find((a) => a.id === accountId);
    setBalances((prev) => ({
      ...prev,
      [accountId]: {
        balance,
        balanceType: prev[accountId]?.balanceType || (account ? getNormalBalanceType(account.accountType) : 'debit'),
      },
    }));
  };

  // Toggle Dr/Cr for an account (supports opposite-side entries, e.g. overdraft bank, overpaid supplier)
  const updateBalanceType = (accountId: number, newType: 'debit' | 'credit') => {
    setBalances((prev) => ({
      ...prev,
      [accountId]: {
        balance: prev[accountId]?.balance || '',
        balanceType: newType,
      },
    }));
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      !searchFilter ||
      account.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
      account.name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesType =
      typeFilter === 'all' ||
      typeFilter === 'with-balances' ||
      account.accountType === typeFilter;
    const matchesBalanceFilter =
      typeFilter !== 'with-balances' ||
      existingBalanceIds.has(account.id) ||
      (balances[account.id] && parseFloat(balances[account.id].balance) > 0);
    return matchesSearch && matchesType && matchesBalanceFilter;
  });

  // Get unique account types for filter
  const accountTypes = [...new Set(accounts.map((a) => a.accountType))].sort();

  // Calculate totals (only from accounts with balances entered)
  const formTotals = Object.entries(balances).reduce(
    (acc, [, entry]) => {
      const amount = parseFloat(entry.balance) || 0;
      if (amount > 0) {
        if (entry.balanceType === 'debit') {
          acc.debit += amount;
        } else {
          acc.credit += amount;
        }
      }
      return acc;
    },
    { debit: 0, credit: 0 },
  );

  const isBalanced = Math.abs(formTotals.debit - formTotals.credit) < 0.01;
  const hasEntries = Object.values(balances).some((b) => parseFloat(b.balance) > 0);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validEntries = Object.entries(balances)
      .filter(([, entry]) => parseFloat(entry.balance) > 0)
      .map(([accountId, entry]) => ({
        accountId: parseInt(accountId, 10),
        balance: parseFloat(entry.balance),
        balanceType: entry.balanceType,
      }));

    if (validEntries.length === 0) {
      setSubmitError('Please enter at least one balance amount');
      return;
    }

    const totalDebit = validEntries
      .filter((entry) => entry.balanceType === 'debit')
      .reduce((sum, entry) => sum + entry.balance, 0);
    const totalCredit = validEntries
      .filter((entry) => entry.balanceType === 'credit')
      .reduce((sum, entry) => sum + entry.balance, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setSubmitError(`Debits must equal credits. Debit: ${formatCurrency(totalDebit)}, Credit: ${formatCurrency(totalCredit)}`);
      return;
    }

    const entriesDto: OpeningBalanceEntryDto[] = validEntries;

    try {
      setLoading(true);
      await onSubmit({
        year,
        period,
        entries: entriesDto,
      });
    } catch (err: unknown) {
      setSubmitError(extractErrorMessage(err, 'Failed to save opening balances'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Error Message */}
      {submitError && (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {submitError}
        </div>
      )}

      {/* Entries Card */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Balance Entries</h3>
          <span className="text-sm text-muted-foreground">
            {accounts.length} accounts available
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex-1">
            <InputText
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by account code or name..."
              className="w-full"
            />
          </div>
          <Dropdown
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.value)}
            options={[
              { label: 'All Types', value: 'all' },
              { label: 'With Balances', value: 'with-balances' },
              ...accountTypes.map((t) => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t })),
            ]}
            optionLabel="label"
            optionValue="value"
            className="w-48"
          />
        </div>

        {/* Existing balances info banner */}
        {existingBalanceIds.size > 0 && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-400">
            <i className="pi pi-info-circle mr-2" />
            {existingBalanceIds.size} account(s) already have balances for Year {year}, Period {period === 0 ? 'Opening' : period}.
            Values are pre-filled and can be modified.
          </div>
        )}

        {/* Header */}
        <div className="grid grid-cols-12 gap-3 text-sm font-medium text-muted-foreground border-b pb-2">
          <div className="col-span-2">Code</div>
          <div className="col-span-4">Account Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-3">Amount</div>
          <div className="col-span-1 text-center" title="Click to toggle Debit/Credit">Dr/Cr ↕</div>
        </div>

        {/* Loading state */}
        {accountsLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <i className="pi pi-spin pi-spinner mr-2" />
            Loading accounts...
          </div>
        )}

        {/* Account Rows */}
        {!accountsLoading && (
          <div className="max-h-[500px] overflow-y-auto space-y-1">
            {filteredAccounts.map((account) => {
              const entry = balances[account.id];
              const balanceValue = entry ? parseFloat(entry.balance) || 0 : 0;
              const hasBalance = balanceValue > 0;
              const hasExistingBalance = existingBalanceIds.has(account.id);

              return (
                <div
                  key={account.id}
                  className={cn(
                    'grid grid-cols-12 gap-3 items-center py-1.5 px-1 rounded',
                    hasExistingBalance
                      ? 'bg-green-50 dark:bg-green-900/10 border-l-2 border-green-400'
                      : hasBalance
                        ? 'bg-blue-50 dark:bg-blue-900/10'
                        : 'hover:bg-muted/50',
                  )}
                >
                  <div className="col-span-2 text-sm font-mono">{account.code}</div>
                  <div className="col-span-4 text-sm truncate" title={account.name}>{account.name}</div>
                  <div className="col-span-2">
                    <Tag
                      value={account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
                      severity={
                        account.accountType === 'asset' || account.accountType === 'expense'
                          ? 'info'
                          : 'warning'
                      }
                      className="text-xs"
                    />
                  </div>
                  <div className="col-span-3 min-w-0">
                    <InputNumber
                      value={balanceValue || null}
                      onValueChange={(e) => updateBalance(account.id, e.value?.toString() || '')}
                      mode="decimal"
                      minFractionDigits={2}
                      maxFractionDigits={2}
                      min={0}
                      placeholder="0.00"
                      className="w-full"
                      inputClassName="text-sm"
                    />
                  </div>
                  <div className="col-span-1 flex flex-col items-center justify-center gap-0.5">
                    {/* Clickable Dr/Cr toggle — allows opposite-side entries (e.g. overdraft, overpaid supplier) */}
                    <button
                      type="button"
                      title="Click to toggle between Debit and Credit"
                      onClick={() => {
                        const current = balances[account.id]?.balanceType || getNormalBalanceType(account.accountType);
                        updateBalanceType(account.id, current === 'debit' ? 'credit' : 'debit');
                      }}
                      className="focus:outline-none focus:ring-2 focus:ring-primary/50 rounded"
                    >
                      <Tag
                        value={(balances[account.id]?.balanceType || getNormalBalanceType(account.accountType)) === 'debit' ? 'Dr' : 'Cr'}
                        severity={(balances[account.id]?.balanceType || getNormalBalanceType(account.accountType)) === 'debit' ? 'info' : 'warning'}
                        className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    </button>
                    {hasExistingBalance && (
                      <Tag value="✓" severity="success" className="text-[10px]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No results */}
        {!accountsLoading && filteredAccounts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No accounts match your filter criteria.
          </div>
        )}

        {/* Totals */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Debit:</span>
            <span className="font-medium">{formatCurrency(formTotals.debit)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total Credit:</span>
            <span className="font-medium">{formatCurrency(formTotals.credit)}</span>
          </div>
          <div
            className={cn(
              'flex justify-between text-sm font-semibold',
              isBalanced && hasEntries ? 'text-green-600' : 'text-red-600',
            )}
          >
            <span>Difference:</span>
            <span>{formatCurrency(Math.abs(formTotals.debit - formTotals.credit))}</span>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <Button
          type="button"
          label="Cancel"
          icon="pi pi-times"
          severity="secondary"
          outlined
          onClick={onCancel}
        />
        <Button
          type="submit"
          label={submitLabel}
          icon="pi pi-save"
          loading={loading}
          disabled={!isBalanced || !hasEntries}
        />
      </div>
    </form>
  );
}

// ============================================================================
// SINGLE FORM (for Edit - single entry)
// ============================================================================

const singleFormSchema = z.object({
  balance: z.coerce.number().positive('Amount must be greater than zero'),
  balanceType: z.enum(['debit', 'credit']),
});

type SingleFormValues = z.infer<typeof singleFormSchema>;

interface SingleFormProps {
  balance: OpeningBalance;
  onSubmit: (data: UpdateOpeningBalanceDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function OpeningBalanceSingleForm({
  balance,
  onSubmit,
  onCancel,
  submitLabel = 'Save Changes',
}: SingleFormProps) {
  const {
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SingleFormValues>({
    resolver: zodResolver(singleFormSchema),
    defaultValues: {
      balance: Number(balance.balance),
      balanceType: balance.balanceType as 'debit' | 'credit',
    },
  });

  const watchedBalance = watch('balance');
  const watchedBalanceType = watch('balanceType');

  const onFormSubmit = async (data: SingleFormValues) => {
    try {
      await onSubmit(data);
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to update opening balance') });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      {/* Error Message */}
      {errors.root && (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 space-y-6">
        {/* Account (Read Only) */}
        <div>
          <label className="block text-sm font-medium mb-2">Account</label>
          <InputText
            value={`${balance.accountCode} - ${balance.accountName}`}
            disabled
            className="w-full"
          />
        </div>

        {/* Year & Period (Read Only) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <InputText
              value={balance.year.toString()}
              disabled
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Period</label>
            <InputText
              value={balance.period === 0 ? 'Opening' : `Period ${balance.period}`}
              disabled
              className="w-full"
            />
          </div>
        </div>

        {/* Amount */}
        <FormField id="balance" label="Amount" required error={errors.balance?.message}>
          {() => (
            <InputNumber
              value={watchedBalance}
              onValueChange={(e) => setValue('balance', e.value || 0)}
              mode="decimal"
              minFractionDigits={2}
              maxFractionDigits={2}
              min={0}
              className="w-full"
              invalid={!!errors.balance}
            />
          )}
        </FormField>

        {/* Balance Type (auto-determined by account type) */}
        <div>
          <label className="block text-sm font-medium mb-2">Type</label>
          <div className="flex items-center h-10.5">
            <Tag
              value={watchedBalanceType === 'debit' ? 'Debit' : 'Credit'}
              severity={watchedBalanceType === 'debit' ? 'info' : 'warning'}
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <Button
          type="button"
          label="Cancel"
          icon="pi pi-times"
          severity="secondary"
          outlined
          onClick={onCancel}
        />
        <Button
          type="submit"
          label={submitLabel}
          icon="pi pi-save"
          loading={isSubmitting}
        />
      </div>
    </form>
  );
}
