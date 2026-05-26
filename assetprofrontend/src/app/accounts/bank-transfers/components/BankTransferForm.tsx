'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { banksApi, exchangeRatesApi } from '@/lib/api/accounts';
import { lookupsApi } from '@/lib/api/lookups';
import type { Bank, BankTransferDto } from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField, EntityCombobox, DraftSubmitActions } from '@/components/erp';
import { useCurrencyFormat } from '@/hooks';

function CurrencyInput({ value, onChange, className, ...rest }: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  [key: string]: unknown;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');
  const display = focused ? raw : (value > 0 ? Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={(e) => { setRaw(e.target.value); const n = parseFloat(e.target.value.replace(/,/g, '')); if (!isNaN(n)) onChange(n); }}
      onFocus={() => { setFocused(true); setRaw(value > 0 ? value.toString() : ''); }}
      onBlur={() => setFocused(false)}
      placeholder="0.00"
      className={className}
      {...rest}
    />
  );
}

// ============================================================================
// SCHEMAS
// ============================================================================

const transferSchema = z.object({
  fromBankId: z.number().min(1, 'Source bank is required'),
  toBankId: z.number().min(1, 'Destination bank is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  exchangeRate: z.number().positive('Exchange rate must be greater than 0').optional(),
  transferDate: z.string().min(1, 'Transfer date is required'),
  reference: z.string().optional(),
  narration: z.string().optional(),
  bankCharges: z.number().min(0).optional(),
});

type FormValues = z.infer<typeof transferSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface BankTransferFormProps {
  onSubmit: (data: BankTransferDto) => Promise<void>;
  onSaveDraft?: (data: BankTransferDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// BANK TRANSFER FORM COMPONENT (Create-only)
// ============================================================================

export function BankTransferForm({ onSubmit, onSaveDraft, onCancel, submitLabel = 'Create Transfer' }: BankTransferFormProps) {
  const [savingDraft, setSavingDraft] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [transferType, setTransferType] = useState<'local' | 'foreign'>('local');
  const [fromBankBalance, setFromBankBalance] = useState<number | null>(null);
  const [toBankBalance, setToBankBalance] = useState<number | null>(null);
  const [expenseAccounts, setExpenseAccounts] = useState<Array<{ id: number; name: string }>>([]);
  const [chargesAccountId, setChargesAccountId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromBankId: 0,
      toBankId: 0,
      amount: 0,
      exchangeRate: 1,
      transferDate: new Date().toISOString().split('T')[0],
      reference: '',
      narration: '',
    },
  });

  const watchedFromBankId = watch('fromBankId');
  const watchedToBankId = watch('toBankId');
  const watchedAmount = watch('amount');
  const watchedExchangeRate = watch('exchangeRate');

  const fromBank = banks.find((b) => b.id === Number(watchedFromBankId));
  const toBank = banks.find((b) => b.id === Number(watchedToBankId));
  const isCrossCurrency = !!(fromBank && toBank && fromBank.currencyCode !== toBank.currencyCode);

  useEffect(() => {
    const loadBanks = async () => {
      try {
        setBanksLoading(true);
        const response = await banksApi.list();
        setBanks(response.data.filter((b: Bank) => b.isActive));
      } catch (err) {
        console.error('Failed to load banks:', err);
      } finally {
        setBanksLoading(false);
      }
    };
    loadBanks();
    // Load expense accounts for charges GL selection — filter client-side for reliability
    lookupsApi.accounts({ limit: 2000 }).then((res) => {
      const expenses = ((res.data || []) as Array<Record<string, unknown>>)
        .filter((a) => a.accountType === 'expense' && a.isPosting === true)
        .map((a) => ({ id: a.id as number, name: `${a.code} — ${a.name}` }));
      setExpenseAccounts(expenses);
    }).catch(() => {});
  }, []);
  const { formatCurrency } = useCurrencyFormat();
  const getSourceBank = () => fromBank;
  const getDestBank = () => toBank;

  // Fetch bank balances when selection changes
  useEffect(() => {
    if (watchedFromBankId && Number(watchedFromBankId) > 0) {
      banksApi.getBalance(Number(watchedFromBankId)).then(r => setFromBankBalance(r.balance)).catch(() => setFromBankBalance(null));
    } else {
      setFromBankBalance(null);
    }
  }, [watchedFromBankId]);

  useEffect(() => {
    if (watchedToBankId && Number(watchedToBankId) > 0) {
      banksApi.getBalance(Number(watchedToBankId)).then(r => setToBankBalance(r.balance)).catch(() => setToBankBalance(null));
    } else {
      setToBankBalance(null);
    }
  }, [watchedToBankId]);

  // Auto-switch to foreign when banks have different currencies
  useEffect(() => {
    if (fromBank && toBank && fromBank.currencyCode !== toBank.currencyCode) {
      setTransferType('foreign');
    }
  }, [fromBank?.currencyCode, toBank?.currencyCode]);

  // Auto-fetch exchange rate when both banks selected and foreign transfer
  // Banks have currencyCode (string), exchange rates use currencyId (int)
  // We need to look up IDs from codes, then try both directions
  const [currencies, setCurrencies] = useState<Array<{ id: number; code: string }>>([]);
  useEffect(() => {
    import('@/lib/api/lookups').then(({ lookupsApi }) => {
      lookupsApi.currencies().then((res: Array<{ id: number; code: string }>) => setCurrencies(res)).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (transferType !== 'foreign' || !fromBank || !toBank) return;
    if (fromBank.currencyCode === toBank.currencyCode) return;

    const fromCurrency = currencies.find(c => c.code === fromBank.currencyCode);
    const toCurrency = currencies.find(c => c.code === toBank.currencyCode);
    if (!fromCurrency || !toCurrency) return;

    // Try direct: from → to
    exchangeRatesApi.getCurrent(fromCurrency.id, toCurrency.id)
      .then((rate) => {
        if (rate && Number(rate.rate) > 0) {
          setValue('exchangeRate', Number(rate.rate));
        } else {
          // Try reverse: to → from, then invert
          return exchangeRatesApi.getCurrent(toCurrency.id, fromCurrency.id)
            .then((reverseRate) => {
              if (reverseRate && Number(reverseRate.rate) > 0) {
                setValue('exchangeRate', Number((1 / Number(reverseRate.rate)).toFixed(6)));
              }
            });
        }
      })
      .catch(() => { /* No rate found — user enters manually */ });
  }, [transferType, fromBank?.currencyCode, toBank?.currencyCode, currencies, setValue]);

  const availableDestBanks = banks.filter((b) => b.id !== Number(watchedFromBankId));

  const onSaveDraftClick = async () => {
    if (!onSaveDraft) return;
    await handleSubmit(async (data) => {
      if (data.fromBankId === data.toBankId) {
        setError('toBankId', { message: 'Cannot transfer to the same bank' });
        return;
      }
      setSavingDraft(true);
      try {
        await onSaveDraft({
          fromBankId: data.fromBankId,
          toBankId: data.toBankId,
          amount: data.amount,
          transferDate: data.transferDate,
          reference: data.reference || '',
          narration: data.narration || '',
          exchangeRate: isCrossCurrency ? (data.exchangeRate ?? 1) : 1,
        });
      } catch (err: unknown) {
        setError('root', { message: extractErrorMessage(err, 'Failed to save draft') });
      } finally {
        setSavingDraft(false);
      }
    })();
  };

  const onFormSubmit = async (data: FormValues) => {
    try {
      if (data.fromBankId === data.toBankId) {
        setError('toBankId', { message: 'Cannot transfer to the same bank' });
        return;
      }
      // For foreign transfers, charges account is mandatory
      if (transferType === 'foreign' && Number((data as Record<string, unknown>).bankCharges || 0) > 0 && !chargesAccountId) {
        setError('root', { message: 'Please select an expense account for bank charges' });
        return;
      }
      await onSubmit({
        fromBankId: data.fromBankId,
        toBankId: data.toBankId,
        amount: data.amount,
        transferDate: data.transferDate,
        reference: data.reference || '',
        narration: data.narration || '',
        exchangeRate: transferType === 'foreign' ? (data.exchangeRate ?? 1) : 1,
        transferType,
        bankCharges: transferType === 'foreign' ? Number((data as Record<string, unknown>).bankCharges || 0) : 0,
        destinationAmount: transferType === 'foreign' ? (data.amount * (data.exchangeRate ?? 1)) : data.amount,
        chargesAccountId: chargesAccountId || undefined,
      } as BankTransferDto);
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to create transfer') });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {/* Error Banner */}
      {errors.root && (
        <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      {/* Transfer Type Selector */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Transfer Type</h3>
        <div className="flex gap-3">
          <label className={cn(
            'flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all',
            transferType === 'local' ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-muted-foreground/30',
          )}>
            <input type="radio" value="local" checked={transferType === 'local'} onChange={() => setTransferType('local')} className="accent-primary" />
            <div>
              <p className="text-sm font-medium">Local Transfer</p>
              <p className="text-xs text-muted-foreground">Same currency — validated and posted immediately</p>
            </div>
          </label>
          <label className={cn(
            'flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all',
            transferType === 'foreign' ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-muted-foreground/30',
          )}>
            <input type="radio" value="foreign" checked={transferType === 'foreign'} onChange={() => setTransferType('foreign')} className="accent-primary" />
            <div>
              <p className="text-sm font-medium">Foreign Transfer</p>
              <p className="text-xs text-muted-foreground">Cross-currency — requires exchange rate and approval</p>
            </div>
          </label>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-4">
        {/* Transfer Direction Visual */}
        <div className="flex items-center justify-center gap-3 py-2">
          <div className="flex-1 text-center">
            <div className="text-xs text-muted-foreground mb-1">From</div>
            <div className="px-3 py-2 rounded-lg border-2 border-dashed bg-muted/30">
              {getSourceBank() ? (
                <>
                  <div className="text-sm font-semibold">{getSourceBank()?.name}</div>
                  <div className="text-sm text-muted-foreground">{getSourceBank()?.accountNumber}</div>
                  <div className="mt-1 inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                    {getSourceBank()?.currencyCode}
                  </div>
                  {fromBankBalance !== null && (
                    <div className={cn('mt-1 text-sm font-mono font-medium', fromBankBalance >= 0 ? 'text-green-600' : 'text-red-600')}>
                      Bal: {getSourceBank()?.currencyCode === 'NGN' ? '₦' : ''}{Number(fromBankBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">Select source bank</div>
              )}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1 text-center">
            <div className="text-xs text-muted-foreground mb-1">To</div>
            <div className="px-3 py-2 rounded-lg border-2 border-dashed bg-muted/30">
              {getDestBank() ? (
                <>
                  <div className="text-sm font-semibold">{getDestBank()?.name}</div>
                  <div className="text-sm text-muted-foreground">{getDestBank()?.accountNumber}</div>
                  <div className="mt-1 inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                    {getDestBank()?.currencyCode}
                  </div>
                  {toBankBalance !== null && (
                    <div className={cn('mt-1 text-sm font-mono font-medium', toBankBalance >= 0 ? 'text-green-600' : 'text-red-600')}>
                      Bal: {getDestBank()?.currencyCode === 'NGN' ? '₦' : ''}{Number(toBankBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">Select destination bank</div>
              )}
            </div>
          </div>
        </div>

        {/* Bank Selection */}
        <div className="grid grid-cols-2 gap-3">
          <EntityCombobox
            value={watch('fromBankId') || null}
            onChange={(id) => setValue('fromBankId', id ? Number(id) : 0)}
            items={banks}
            labelKey="name"
            subtitleKey="accountNumber"
            searchKeys={['name', 'accountNumber']}
            label="From Bank"
            placeholder="Select source bank..."
            required
            disabled={banksLoading}
            error={errors.fromBankId?.message}
          />

          <EntityCombobox
            value={watch('toBankId') || null}
            onChange={(id) => setValue('toBankId', id ? Number(id) : 0)}
            items={availableDestBanks}
            labelKey="name"
            subtitleKey="accountNumber"
            searchKeys={['name', 'accountNumber']}
            label="To Bank"
            placeholder="Select destination bank..."
            required
            disabled={banksLoading || !watchedFromBankId}
            error={errors.toBankId?.message}
          />
        </div>

        {/* Cross-currency notice + exchange rate */}
        {transferType === 'foreign' && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Foreign currency transfer{fromBank && toBank ? `: ${fromBank.currencyCode} → ${toBank.currencyCode}` : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField id="exchangeRate" label={`Exchange Rate${fromBank && toBank ? ` (1 ${fromBank.currencyCode} = ? ${toBank.currencyCode})` : ''}`} required error={errors.exchangeRate?.message}>
                {(props) => (
                  <input
                    {...props}
                    {...register('exchangeRate', { valueAsNumber: true })}
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    placeholder="1.000000"
                    className={cn('w-full rounded-lg border px-3 py-1.5 text-sm', errors.exchangeRate && 'border-red-500')}
                  />
                )}
              </FormField>
              <FormField id="bankCharges" label="Bank Charges / Commission">
                {(props) => (
                  <input
                    {...props}
                    {...register('bankCharges' as keyof FormValues, { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full rounded-lg border px-3 py-1.5 text-sm"
                  />
                )}
              </FormField>
              <FormField id="chargesAccountId" label="Charges Expense Account *">
                {() => (
                  <EntityCombobox
                    value={chargesAccountId}
                    onChange={(val) => setChargesAccountId(val as number)}
                    items={expenseAccounts}
                    labelKey="name"
                    searchKeys={['name']}
                    placeholder="Select expense account..."
                    required
                  />
                )}
              </FormField>
            </div>
            {Number(watchedAmount) > 0 && Number(watchedExchangeRate) > 0 && (() => {
              const charges = Number(watch('bankCharges' as keyof FormValues) || 0);
              const totalSource = Number(watchedAmount) + charges;
              return (
                <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Transfer Amount:</span>
                    <span className="font-mono">{Number(watchedAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {fromBank?.currencyCode || ''}</span>
                  </div>
                  {charges > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>+ Commission/Charges:</span>
                      <span className="font-mono">{charges.toLocaleString(undefined, { minimumFractionDigits: 2 })} {fromBank?.currencyCode || ''}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t border-amber-300 pt-1">
                    <span>Total Debit (Source):</span>
                    <span className="font-mono">{totalSource.toLocaleString(undefined, { minimumFractionDigits: 2 })} {fromBank?.currencyCode || ''}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-700">
                    <span>Credit (Destination):</span>
                    <span className="font-mono">{(Number(watchedAmount) * Number(watchedExchangeRate)).toLocaleString(undefined, { minimumFractionDigits: 2 })} {toBank?.currencyCode || ''}</span>
                  </div>
                </div>
              );
            })()}
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Foreign transfers require approval before posting to GL.
            </p>
          </div>
        )}

        {transferType === 'local' && isCrossCurrency && fromBank && toBank && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            Source bank ({fromBank.currencyCode}) and destination bank ({toBank.currencyCode}) have different currencies. Switch to Foreign Transfer.
          </div>
        )}

        {/* Amount, Date, Reference */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <FormField id="amount" label="Amount" required error={errors.amount?.message}>
            {(props) => (
              <CurrencyInput
                {...props}
                value={watch('amount')}
                onChange={(n) => setValue('amount', n, { shouldValidate: true })}
                className={cn(
                  'w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                  errors.amount && 'border-red-500'
                )}
              />
            )}
          </FormField>

          <FormField id="transferDate" label="Transfer Date" required error={errors.transferDate?.message}>
            {(props) => (
              <input
                {...props}
                {...register('transferDate')}
                type="date"
                className={cn(
                  'w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                  errors.transferDate && 'border-red-500'
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
                placeholder="Bank Ref #"
                className="w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>

          <FormField id="narration" label="Narration">
            {(props) => (
              <input
                {...props}
                {...register('narration')}
                type="text"
                placeholder="Transfer description..."
                className="w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>
      </div>

      {/* Actions */}
      <DraftSubmitActions
        onCancel={onCancel}
        onSaveDraft={onSaveDraft ? onSaveDraftClick : undefined}
        submitLabel={submitLabel}
        isSubmitting={isSubmitting}
        isSavingDraft={savingDraft}
      />
    </form>
  );
}
