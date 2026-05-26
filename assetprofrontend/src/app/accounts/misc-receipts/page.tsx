'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, Plus, Search, CheckCircle, Clock, ChevronLeft, ChevronRight, Eye, Pencil, Trash2,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { ErrorBanner, LoadingSpinner, EmptyState } from '@/components/erp';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { miscReceiptsApi, type MiscReceipt } from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { useCurrencyFormat } from '@/hooks';
import type { BreadcrumbItem } from '@/types/core';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Misc Receipts' },
];

const STATUS_STYLES: Record<string, string> = {
  draft:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  posted:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  cancelled: 'bg-gray-100 dark:bg-gray-800 text-gray-500',
};

export default function MiscReceiptsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currencySymbol, formatAmount } = useCurrencyFormat();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading, error } = useQuery({
    queryKey: ['misc-receipts', search, statusFilter, page],
    queryFn: () => miscReceiptsApi.list({
      search: search || undefined,
      status: statusFilter || undefined,
      page,
      limit,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['misc-receipts-stats'],
    queryFn: () => miscReceiptsApi.getStats(),
  });

  const receipts: MiscReceipt[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const handleDelete = (receipt: MiscReceipt) => {
    confirmDialog({
      message: `Delete receipt "${receipt.receiptNumber}"?`,
      header: 'Delete Receipt',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await miscReceiptsApi.delete(receipt.id);
          queryClient.invalidateQueries({ queryKey: ['misc-receipts'] });
          queryClient.invalidateQueries({ queryKey: ['misc-receipts-stats'] });
        } catch (err) {
          alert(extractErrorMessage(err, 'Failed to delete receipt'));
        }
      },
    });
  };

  const handlePost = async (receipt: MiscReceipt) => {
    try {
      await miscReceiptsApi.post(receipt.id);
      queryClient.invalidateQueries({ queryKey: ['misc-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['misc-receipts-stats'] });
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to post receipt'));
    }
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      <PageHeader
        icon={Inbox}
        title="Miscellaneous Receipts"
        description="Record bank receipts not linked to a customer"
        actions={[{
          id: 'create',
          label: 'New Receipt',
          icon: Plus,
          variant: 'default' as const,
          onClick: () => router.push('/accounts/misc-receipts/create'),
        }]}
        {...PageHeaderPresets.financial}
      />

      <StatCardsGrid columns={4} className="mb-6">
        <StatCard title="Total" value={stats?.total ?? 0} icon={Inbox} color={StatCardColors.blue} />
        <StatCard title="Draft" value={stats?.draft ?? 0} icon={Clock} color={StatCardColors.amber} />
        <StatCard title="Posted" value={stats?.posted ?? 0} icon={CheckCircle} color={StatCardColors.green} />
        <StatCard
          title="Posted Amount"
          value={`${currencySymbol}${(stats?.postedAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Inbox}
          color={StatCardColors.purple}
        />
      </StatCardsGrid>

      <ErrorBanner message={error ? extractErrorMessage(error, 'Failed to load receipts') : null} />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search receipts..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border pl-10 pr-4 py-2 bg-background"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border px-3 py-2 bg-background"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner fullPage />
      ) : receipts.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No misc receipts found"
          description={search || statusFilter ? 'Try adjusting your filters' : undefined}
          action={!search && !statusFilter ? {
            label: 'New Receipt',
            icon: Plus,
            onClick: () => router.push('/accounts/misc-receipts/create'),
          } : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Receipt No.</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Bank</th>
                <th className="px-4 py-3 text-left font-medium">GL Account</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{r.receiptNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(r.receiptDate).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">{r.bankName}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{r.glAccountCode}</span>
                    <span className="ml-1 text-muted-foreground text-xs">{r.glAccountName}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate" title={r.description}>{r.description}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {currencySymbol}{(r.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[r.status] || STATUS_STYLES.draft)}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handlePost(r)}
                            className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 font-medium"
                            title="Post to GL"
                          >
                            Post
                          </button>
                          <button
                            onClick={() => router.push(`/accounts/misc-receipts/${r.id}/edit`)}
                            className="p-1.5 rounded hover:bg-muted"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        </>
                      )}
                      {r.status === 'posted' && r.journalEntryId && (
                        <span className="text-xs text-muted-foreground">JE #{r.journalEntryId}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </TenantLayout>
  );
}
