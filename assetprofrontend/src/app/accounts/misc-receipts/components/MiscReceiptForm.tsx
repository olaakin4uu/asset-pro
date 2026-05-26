'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { banksApi, accountsApi, type MiscReceipt, type CreateMiscReceiptDto } from '@/lib/api/accounts';
import { extractErrorMessage } from '@/lib/utils';
import { useCurrencyFormat } from '@/hooks';

interface MiscReceiptFormProps {
  receipt?: MiscReceipt;
  onSubmit: (data: CreateMiscReceiptDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function MiscReceiptForm({ receipt, onSubmit, onCancel, submitLabel = 'Save' }: MiscReceiptFormProps) {
  const { currencySymbol } = useCurrencyFormat();
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    bankId: receipt?.bankId ?? 0,
    glAccountId: receipt?.glAccountId ?? 0,
    amount: receipt?.amount ?? '',
    receiptDate: receipt?.receiptDate ? receipt.receiptDate.split('T')[0] : today,
    description: receipt?.description ?? '',
    reference: receipt?.reference ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load banks
  const { data: banksData } = useQuery({
    queryKey: ['banks-list'],
    queryFn: () => banksApi.list({ limit: 200 }),
  });

  // Load posting-level GL accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts-posting'],
    queryFn: () => accountsApi.list({ isPosting: true, limit: 500 }),
  });

  const banks = banksData?.data ?? [];
  const accounts = accountsData?.data ?? [];

  const set = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.bankId) e.bankId = 'Select a bank';
    if (!form.glAccountId) e.glAccountId = 'Select a GL account';
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter a valid amount';
    if (!form.receiptDate) e.receiptDate = 'Select a date';
    if (!form.description.trim()) e.description = 'Enter a description';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setSubmitError(null);
    try {
      await onSubmit({
        bankId: Number(form.bankId),
        glAccountId: Number(form.glAccountId),
        amount: Number(form.amount),
        receiptDate: form.receiptDate,
        description: form.description.trim(),
        reference: form.reference.trim() || undefined,
      });
    } catch (err) {
      setSubmitError(extractErrorMessage(err, 'Failed to save receipt'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {submitError}
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">Receipt Details</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Bank */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Bank Account <span className="text-red-500">*</span>
            </label>
            <select
              value={form.bankId}
              onChange={(e) => set('bankId', Number(e.target.value))}
              className="w-full rounded-lg border px-3 py-2 bg-background text-sm"
            >
              <option value={0}>Select bank...</option>
              {banks.map((b: { id: number; name: string; accountNumber?: string }) => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.accountNumber ? ` — ${b.accountNumber}` : ''}
                </option>
              ))}
            </select>
            {errors.bankId && <p className="text-xs text-red-500">{errors.bankId}</p>}
            <p className="text-xs text-muted-foreground">Bank account to debit (money received into)</p>
          </div>

          {/* GL Account */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              GL Account (Credit) <span className="text-red-500">*</span>
            </label>
            <select
              value={form.glAccountId}
              onChange={(e) => set('glAccountId', Number(e.target.value))}
              className="w-full rounded-lg border px-3 py-2 bg-background text-sm"
            >
              <option value={0}>Select GL account...</option>
              {accounts.map((a: { id: number; code: string; name: string }) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
            {errors.glAccountId && <p className="text-xs text-red-500">{errors.glAccountId}</p>}
            <p className="text-xs text-muted-foreground">Income, liability, or equity account to credit</p>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Amount ({currencySymbol}) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border px-3 py-2 bg-background text-sm"
            />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
          </div>

          {/* Receipt Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Receipt Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.receiptDate}
              onChange={(e) => set('receiptDate', e.target.value)}
              className="w-full rounded-lg border px-3 py-2 bg-background text-sm"
            />
            {errors.receiptDate && <p className="text-xs text-red-500">{errors.receiptDate}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. Interest income from Stanbic, Rent received from tenant..."
              className="w-full rounded-lg border px-3 py-2 bg-background text-sm"
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
          </div>

          {/* Reference */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Reference <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) => set('reference', e.target.value)}
              placeholder="Cheque number, transfer ref, teller no..."
              className="w-full rounded-lg border px-3 py-2 bg-background text-sm"
            />
          </div>

        </div>
      </div>

      {/* GL Preview */}
      {form.bankId > 0 && form.glAccountId > 0 && Number(form.amount) > 0 && (
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">GL Posting Preview</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left pb-2">Account</th>
                <th className="text-right pb-2">Debit</th>
                <th className="text-right pb-2">Credit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1.5">{banks.find((b: {id:number}) => b.id === Number(form.bankId)) ? (banks.find((b: {id:number}) => b.id === Number(form.bankId)) as {name:string}).name : 'Bank Account'}</td>
                <td className="py-1.5 text-right tabular-nums font-medium">
                  {currencySymbol}{Number(form.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-1.5 text-right text-muted-foreground">—</td>
              </tr>
              <tr>
                <td className="py-1.5">
                  {accounts.find((a: {id:number}) => a.id === Number(form.glAccountId))
                    ? `${(accounts.find((a: {id:number}) => a.id === Number(form.glAccountId)) as {code:string;name:string}).code} — ${(accounts.find((a: {id:number}) => a.id === Number(form.glAccountId)) as {code:string;name:string}).name}`
                    : 'GL Account'}
                </td>
                <td className="py-1.5 text-right text-muted-foreground">—</td>
                <td className="py-1.5 text-right tabular-nums font-medium">
                  {currencySymbol}{Number(form.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
