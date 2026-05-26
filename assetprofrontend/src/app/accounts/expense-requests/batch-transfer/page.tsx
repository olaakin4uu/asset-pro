'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  FileDown,
  ArrowLeft,
  Check,
  Search,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { LoadingSpinner, EmptyState, EntityCombobox } from '@/components/erp';
import { expenseRequestsApi, banksApi } from '@/lib/api/accounts';
import type { ExpenseRequest } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { useCurrencyFormat } from '@/hooks';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Expense Requests', href: '/accounts/expense-requests' },
  { title: 'Batch Transfer Request' },
];

export default function BatchTransferPage() {
  const router = useRouter();
  const { formatCurrency } = useCurrencyFormat();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sourceBankId, setSourceBankId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Fetch requests that are either fully approved (awaiting payment) or pending at
  // the Payment Processing step — these are the only ones eligible for batch transfer.
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['batch-transfer-requests', search],
    queryFn: () => expenseRequestsApi.list({ search: search || undefined, limit: 500 }),
  });

  // Fetch banks
  const { data: banks = [] } = useQuery({
    queryKey: ['batch-transfer-banks'],
    queryFn: () => banksApi.getAuthorizedBanks(),
  });

  const requests = (requestsData?.data ?? []).filter(r =>
    r.status === 'approved' ||
    (r.status === 'pending' && r.pendingStepName === 'Payment Processing')
  );

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map(r => r.id)));
    }
  };

  const selectedTotal = requests
    .filter(r => selectedIds.has(r.id))
    .reduce((sum, r) => sum + Number(r.totalAmount ?? 0) - Number(r.whtAmount ?? 0), 0);

  const handleGenerate = async () => {
    if (!sourceBankId) {
      setError('Please select a source bank account');
      return;
    }
    if (selectedIds.size === 0) {
      setError('Please select at least one expense request');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const blob = await expenseRequestsApi.generateBatchTransferRequest(
        Array.from(selectedIds),
        sourceBankId,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Batch-Transfer-Request-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(extractErrorMessage(e, 'Failed to generate transfer request'));
    } finally {
      setGenerating(false);
    }
  };

  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/accounts/expense-requests'),
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={FileDown}
        title="Batch Transfer Request"
        description="Select multiple expense requests and generate a consolidated bank transfer request"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      {/* Source Bank Selection */}
      <div className="rounded-xl border bg-card p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium mb-1.5">
              <Building2 className="inline h-4 w-4 mr-1" />
              Source Bank Account (to debit)
            </label>
            <EntityCombobox
              value={sourceBankId}
              onChange={setSourceBankId}
              items={banks}
              labelKey="bankName"
              subtitleKey="accountNumber"
              searchKeys={['bankName', 'accountNumber']}
              placeholder="Select source bank account..."
              required
            />
          </div>

          <div className="relative flex-1 max-w-sm">
            <label className="block text-sm font-medium mb-1.5">Search Requests</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by request number or description..."
                className="w-full rounded-lg border pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Requests Table */}
      {isLoading ? (
        <LoadingSpinner fullPage />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={FileDown}
          title="No requests available"
          description="No expense requests are currently at the Payment Processing step or awaiting payment."
        />
      ) : (
        <>
          <div className="rounded-xl border bg-card overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === requests.length && requests.length > 0}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Request #</th>
                  <th className="text-left px-4 py-3 font-medium">Beneficiary</th>
                  <th className="text-left px-4 py-3 font-medium">Bank</th>
                  <th className="text-left px-4 py-3 font-medium">Account No</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {requests.map(r => (
                  <tr
                    key={r.id}
                    className={cn(
                      'hover:bg-muted/30 cursor-pointer transition-colors',
                      selectedIds.has(r.id) && 'bg-primary/5',
                    )}
                    onClick={() => toggleSelect(r.id)}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        onClick={e => e.stopPropagation()}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono">{r.requestNumber}</td>
                    <td className="px-4 py-3">{r.beneficiaryName || r.requesterName || '—'}</td>
                    <td className="px-4 py-3">{r.beneficiaryBankName || '—'}</td>
                    <td className="px-4 py-3 font-mono">{r.beneficiaryAccountNumber || '—'}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{r.description || r.subject || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatCurrency(Number(r.totalAmount ?? 0) - Number(r.whtAmount ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        r.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700',
                      )}>
                        {r.status === 'paid' ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary + Generate Button */}
          <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground">
                Selected: <span className="font-semibold text-foreground">{selectedIds.size}</span> of {requests.length}
              </span>
              <span className="text-muted-foreground">
                Total: <span className="font-bold text-foreground text-base tabular-nums">{formatCurrency(selectedTotal)}</span>
              </span>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || selectedIds.size === 0 || !sourceBankId}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Generate Transfer Request PDF
            </button>
          </div>
        </>
      )}
    </TenantLayout>
  );
}
