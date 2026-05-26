'use client';

import { Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash,
  CheckCircle,
  Clock,
  Send,
  DollarSign,
  TrendingUp,
  TrendingDown,
  XCircle,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { ErrorBanner, LoadingSpinner, EmptyState } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { assetDisposalsApi } from '@/lib/api/assets';
import { useEntityDetail, useEntityPermissions } from '@/hooks';
import type { AssetDisposal, AssetDisposalQuery } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { useCurrencyFormat } from '@/hooks';
import { cn, extractErrorMessage } from '@/lib/utils';
import { DisposalDetailViewer } from './components/DisposalDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Assets', href: '/assets' },
  { title: 'Disposals' },
];

const statusLabels: Record<string, string> = {
  draft: 'Draft', pending_approval: 'Pending Approval', approved: 'Approved',
  completed: 'Completed', cancelled: 'Cancelled',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  pending_approval: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
};

const disposalTypeLabels: Record<string, string> = {
  sale: 'Sale', scrap: 'Scrap', donation: 'Donation', trade_in: 'Trade In',
  theft: 'Theft', loss: 'Loss', write_off: 'Write Off', insurance_claim: 'Insurance Claim', other: 'Other',
};

// formatCurrency is provided by useCurrencyFormat hook inside the component

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DisposalsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <DisposalsListContent />
    </Suspense>
  );
}

const fetchDisposalDetail = (id: number) => assetDisposalsApi.get(id);

function DisposalsListContent() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('assets', 'disposals');
  const { formatCurrency, currencySymbol } = useCurrencyFormat();

  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const queryClient = useQueryClient();

  const { data: listData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['asset-disposals', page, statusFilter, typeFilter],
    queryFn: async () => {
      const query: AssetDisposalQuery = {
        page, limit,
        status: statusFilter === 'all' ? undefined : (statusFilter as AssetDisposalQuery['status']),
        disposalType: typeFilter === 'all' ? undefined : (typeFilter as AssetDisposalQuery['disposalType']),
      };

      const [disposalResult, statsResult] = await Promise.all([
        assetDisposalsApi.list(query),
        assetDisposalsApi.getStats(),
      ]);

      return { disposalResult, statsResult };
    },
  });

  const disposals = listData?.disposalResult.data ?? [];
  const total = listData?.disposalResult.total ?? 0;
  const stats = listData?.statsResult ?? null;
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load disposals') : actionError;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['asset-disposals'] });

  const {
    selectedEntity: selectedDisposal,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect,
  } = useEntityDetail({
    basePath: '/assets/disposals',
    entities: disposals,
    fetchDetail: fetchDisposalDetail,
    onError: (msg) => setActionError(msg),
  });

  const handleDelete = async (disposal: AssetDisposal) => {
    if (disposal.status !== 'draft') return;
    confirmDialog({
      message: `Are you sure you want to delete this disposal record?`,
      header: 'Delete Disposal',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await assetDisposalsApi.delete(disposal.id);
          if (selectedDisposal?.id === disposal.id) closeDetail();
          refresh();
        } catch (err) {
          setActionError(extractErrorMessage(err, 'Failed to delete disposal'));
        }
      },
    });
  };

  const handleSubmit = async (disposal: AssetDisposal) => {
    if (disposal.status !== 'draft') return;
    confirmDialog({
      message: `Submit this disposal for approval?`,
      header: 'Submit Disposal',
      icon: 'pi pi-send',
      accept: async () => {
        try {
          await assetDisposalsApi.submit(disposal.id);
          refresh();
        } catch (err) {
          setActionError(extractErrorMessage(err, 'Failed to submit disposal'));
        }
      },
    });
  };

  const pageActions = [
    ...(canCreate ? [{
      id: 'create', label: 'New Disposal', icon: Plus, variant: 'default' as const,
      onClick: () => router.push('/assets/disposals/create'),
    }] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />

      <PageHeader
        icon={Trash2}
        title="Asset Disposals"
        description="Manage asset retirement and disposal"
        actions={pageActions}
        {...PageHeaderPresets.operations}
      />

      <StatCardsGrid columns={4} className="mb-6">
        <StatCard title="Total Disposals" value={stats?.total?.toString() ?? '0'} icon={Trash2} color={StatCardColors.blue} />
        <StatCard title="Pending Approval" value={stats?.pendingApproval?.toString() ?? '0'} icon={Clock} color={StatCardColors.amber} />
        <StatCard title="Completed" value={stats?.completed?.toString() ?? '0'} icon={CheckCircle} color={StatCardColors.green} />
        <StatCard title="Total Proceeds" value={stats ? formatCurrency(stats.totalProceeds) : `${currencySymbol}0`} icon={DollarSign} color={StatCardColors.purple} />
      </StatCardsGrid>

      <ErrorBanner message={error} onDismiss={() => setActionError(null)} />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search disposals..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border px-4 py-2">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="rounded-lg border px-4 py-2">
          <option value="all">All Types</option>
          <option value="sale">Sale</option>
          <option value="scrap">Scrap</option>
          <option value="donation">Donation</option>
          <option value="write_off">Write Off</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : disposals.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="No disposals found"
          description={search || statusFilter !== 'all' || typeFilter !== 'all' ? 'Try adjusting your search or filters' : undefined}
          action={!search && statusFilter === 'all' && typeFilter === 'all' && canCreate ? { label: 'New Disposal', icon: Plus, onClick: () => router.push('/assets/disposals/create') } : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium">Number</th>
                  <th className="text-left px-6 py-3 text-sm font-medium">Asset</th>
                  <th className="text-left px-6 py-3 text-sm font-medium">Type</th>
                  <th className="text-left px-6 py-3 text-sm font-medium">Date</th>
                  <th className="text-right px-6 py-3 text-sm font-medium">Book Value</th>
                  <th className="text-right px-6 py-3 text-sm font-medium">Proceeds</th>
                  <th className="text-right px-6 py-3 text-sm font-medium">Gain/Loss</th>
                  <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
                  <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {disposals.map((disposal) => (
                  <tr
                    key={disposal.id}
                    className={cn(
                      'hover:bg-muted/30 transition-colors cursor-pointer',
                      selectedDisposal?.id === disposal.id && 'bg-primary/5'
                    )}
                    onClick={() => openDetail(disposal.id)}
                  >
                    <td className="px-6 py-4 font-mono text-sm font-medium">{disposal.disposalNumber}</td>
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <div className="font-medium">{disposal.assetName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{disposal.assetCode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{disposalTypeLabels[disposal.disposalType] || disposal.disposalType}</td>
                    <td className="px-6 py-4 text-sm">{formatDate(disposal.disposalDate)}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">{formatCurrency(disposal.bookValueAtDisposal)}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">{formatCurrency(disposal.disposalProceeds)}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">
                      <span className={cn('inline-flex items-center gap-1', disposal.gainLoss >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {disposal.gainLoss >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {formatCurrency(Math.abs(disposal.gainLoss))}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', statusColors[disposal.status] || statusColors.draft)}>
                        {statusLabels[disposal.status] || disposal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openDetail(disposal.id)} className="p-2 rounded-lg hover:bg-muted" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        {disposal.status === 'draft' && (
                          <>
                            <button onClick={() => handleSubmit(disposal)} className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600" title="Submit for Approval">
                              <Send className="h-4 w-4" />
                            </button>
                            {canEdit && (
                              <button onClick={() => router.push(`/assets/disposals/${disposal.id}/edit`)} className="p-2 rounded-lg hover:bg-muted" title="Edit">
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDelete(disposal)} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600" title="Delete">
                                <Trash className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && total > limit && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border disabled:opacity-50 hover:bg-muted">Previous</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page * limit >= total} className="px-4 py-2 rounded-lg border disabled:opacity-50 hover:bg-muted">Next</button>
          </div>
        </div>
      )}

      {selectedDisposal && (
        <DisposalDetailViewer
          disposal={selectedDisposal}
          disposals={disposals}
          onClose={closeDetail}
          onDisposalSelect={handleEntitySelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
