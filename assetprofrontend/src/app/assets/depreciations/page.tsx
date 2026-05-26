'use client';

import { Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Calculator,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Play,
  DollarSign,
  Clock,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { ErrorBanner, LoadingSpinner } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { assetDepreciationsApi } from '@/lib/api/assets';
import { useEntityDetail, useEntityPermissions } from '@/hooks';
import type { AssetDepreciation, AssetDepreciationStats, AssetDepreciationQuery } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { useCurrencyFormat } from '@/hooks';
import { cn, extractErrorMessage } from '@/lib/utils';
import { DepreciationDetailViewer } from './components/DepreciationDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Assets', href: '/assets' },
  { title: 'Depreciation' },
];

const statusLabels: Record<string, string> = {
  draft: 'Draft', pending: 'Pending', approved: 'Approved', posted: 'Posted', reversed: 'Reversed',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  posted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  reversed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
};

// formatCurrency is provided by useCurrencyFormat hook inside the component

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DepreciationsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <DepreciationsListContent />
    </Suspense>
  );
}

const fetchDepreciationDetail = (id: number) => assetDepreciationsApi.get(id);

function DepreciationsListContent() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete, canApprove } = useEntityPermissions('assets', 'depreciations');
  const { formatCurrency, currencySymbol } = useCurrencyFormat();

  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [postedFilter, setPostedFilter] = useState<string>('all');
  const [fiscalYear, setFiscalYear] = useState<string>(new Date().getFullYear().toString());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const queryClient = useQueryClient();

  const { data: listData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['asset-depreciations', page, statusFilter, postedFilter, fiscalYear],
    queryFn: async () => {
      const query: AssetDepreciationQuery = {
        page, limit,
        status: statusFilter === 'all' ? undefined : (statusFilter as any),
        isPosted: postedFilter === 'all' ? undefined : postedFilter === 'posted',
        fiscalYear: fiscalYear ? parseInt(fiscalYear) : undefined,
      };

      const [depResult, statsResult] = await Promise.all([
        assetDepreciationsApi.list(query),
        assetDepreciationsApi.getStats(),
      ]);

      return { depResult, statsResult };
    },
  });

  const depreciations = listData?.depResult.data ?? [];
  const total = listData?.depResult.total ?? 0;
  const stats = listData?.statsResult ?? null;
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load depreciations') : actionError;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['asset-depreciations'] });

  const {
    selectedEntity: selectedDepreciation,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect,
  } = useEntityDetail({
    basePath: '/assets/depreciations',
    entities: depreciations,
    fetchDetail: fetchDepreciationDetail,
    onError: (msg) => setActionError(msg),
  });

  const handleDelete = async (depreciation: AssetDepreciation) => {
    if (depreciation.isPosted) return;
    confirmDialog({
      message: `Are you sure you want to delete this depreciation record?`,
      header: 'Delete Depreciation',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await assetDepreciationsApi.delete(depreciation.id);
          if (selectedDepreciation?.id === depreciation.id) closeDetail();
          refresh();
        } catch (err) {
          setActionError(extractErrorMessage(err, 'Failed to delete depreciation'));
        }
      },
    });
  };

  const handlePost = async (depreciation: AssetDepreciation) => {
    if (depreciation.isPosted) return;
    confirmDialog({
      message: `Are you sure you want to post this depreciation to the General Ledger?`,
      header: 'Post Depreciation',
      icon: 'pi pi-check-circle',
      accept: async () => {
        try {
          await assetDepreciationsApi.post(depreciation.id);
          refresh();
        } catch (err) {
          setActionError(extractErrorMessage(err, 'Failed to post depreciation'));
        }
      },
    });
  };

  const pageActions = [
    ...(canCreate ? [{
      id: 'create', label: 'New Entry', icon: Plus, variant: 'default' as const,
      onClick: () => router.push('/assets/depreciations/create'),
    }] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />

      <PageHeader
        icon={Calculator}
        title="Asset Depreciation"
        description="Manage and post depreciation entries"
        actions={pageActions}
        {...PageHeaderPresets.operations}
      />

      <StatCardsGrid columns={4} className="mb-6">
        <StatCard title="Total Entries" value={stats?.total?.toString() ?? '0'} icon={Calculator} color={StatCardColors.blue} />
        <StatCard title="Draft" value={stats?.draft?.toString() ?? '0'} icon={Clock} color={StatCardColors.slate} />
        <StatCard title="Posted" value={stats?.posted?.toString() ?? '0'} icon={CheckCircle} color={StatCardColors.green} />
        <StatCard title="Total Amount" value={stats ? formatCurrency(stats.totalAmount) : `${currencySymbol}0.00`} icon={DollarSign} color={StatCardColors.purple} />
      </StatCardsGrid>

      <ErrorBanner message={error} onDismiss={() => setActionError(null)} />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search by asset..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select value={fiscalYear} onChange={(e) => { setFiscalYear(e.target.value); setPage(1); }} className="rounded-lg border px-4 py-2">
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
            <option key={year} value={year}>FY {year}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border px-4 py-2">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="posted">Posted</option>
        </select>
        <select value={postedFilter} onChange={(e) => { setPostedFilter(e.target.value); setPage(1); }} className="rounded-lg border px-4 py-2">
          <option value="all">All Posting Status</option>
          <option value="posted">Posted to GL</option>
          <option value="unposted">Not Posted</option>
        </select>
      </div>

      {loading && <LoadingSpinner fullPage />}

      {!loading && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium">Asset</th>
                  <th className="text-left px-6 py-3 text-sm font-medium">Period</th>
                  <th className="text-left px-6 py-3 text-sm font-medium">Date</th>
                  <th className="text-right px-6 py-3 text-sm font-medium">Opening Value</th>
                  <th className="text-right px-6 py-3 text-sm font-medium">Depreciation</th>
                  <th className="text-right px-6 py-3 text-sm font-medium">Closing Value</th>
                  <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
                  <th className="text-center px-6 py-3 text-sm font-medium">Posted</th>
                  <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {depreciations.map((dep) => (
                  <tr
                    key={dep.id}
                    className={cn(
                      'hover:bg-muted/30 transition-colors cursor-pointer',
                      selectedDepreciation?.id === dep.id && 'bg-primary/5'
                    )}
                    onClick={() => openDetail(dep.id)}
                  >
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <div className="font-medium">{dep.assetName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{dep.assetCode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {dep.periodName || `${dep.fiscalYear}-${dep.fiscalPeriod.toString().padStart(2, '0')}`}
                    </td>
                    <td className="px-6 py-4 text-sm">{formatDate(dep.depreciationDate)}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">{formatCurrency(dep.openingBookValue)}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono text-red-600">{formatCurrency(dep.depreciationAmount)}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">{formatCurrency(dep.closingBookValue)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', statusColors[dep.status] || statusColors.draft)}>
                        {statusLabels[dep.status] || dep.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {dep.isPosted ? (
                        <CheckCircle className="h-4 w-4 text-green-600 inline" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground inline" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openDetail(dep.id)} className="p-2 rounded-lg hover:bg-muted" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        {!dep.isPosted && (
                          <>
                            {canApprove && (
                              <button onClick={() => handlePost(dep)} className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600" title="Post to GL">
                                <Play className="h-4 w-4" />
                              </button>
                            )}
                            {canEdit && (
                              <button onClick={() => router.push(`/assets/depreciations/${dep.id}/edit`)} className="p-2 rounded-lg hover:bg-muted" title="Edit">
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDelete(dep)} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600" title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {depreciations.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">No depreciation entries found</td>
                  </tr>
                )}
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

      {selectedDepreciation && (
        <DepreciationDetailViewer
          depreciation={selectedDepreciation}
          depreciations={depreciations}
          onClose={closeDetail}
          onDepreciationSelect={handleEntitySelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
