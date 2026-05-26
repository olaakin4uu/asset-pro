'use client';

import { Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Package,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Wrench,
  DollarSign,
  TrendingDown,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { ErrorBanner, LoadingSpinner, EmptyState } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { assetsApi, assetClassesApi } from '@/lib/api/assets';
import { useEntityDetail, useEntityPermissions } from '@/hooks';
import type { Asset, AssetQuery } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { useCurrencyFormat } from '@/hooks';
import { cn, extractErrorMessage } from '@/lib/utils';
import { AssetDetailViewer } from './components/AssetDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Assets', href: '/assets' },
  { title: 'Asset Register' },
];

const statusLabels: Record<string, string> = {
  active: 'Active', inactive: 'Inactive', under_maintenance: 'Under Maintenance',
  disposed: 'Disposed', lost: 'Lost', stolen: 'Stolen', written_off: 'Written Off',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  under_maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  disposed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  stolen: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  written_off: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
};

const conditionLabels: Record<string, string> = {
  new: 'New', good: 'Good', fair: 'Fair', poor: 'Poor', damaged: 'Damaged',
};

// formatCurrency is provided by useCurrencyFormat hook inside the component

export default function AssetsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <AssetsListContent />
    </Suspense>
  );
}

const fetchAssetDetail = (id: number) => assetsApi.get(id);

function AssetsListContent() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('assets', 'assets');
  const { formatCurrency, currencySymbol } = useCurrencyFormat();

  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const queryClient = useQueryClient();

  const { data: listData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['assets', page, search, statusFilter, classFilter],
    queryFn: async () => {
      const query: AssetQuery = {
        page, limit,
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : (statusFilter as AssetQuery['status']),
        assetClassId: classFilter === 'all' ? undefined : parseInt(classFilter),
      };

      const [assetsResult, statsResult, classesResult] = await Promise.all([
        assetsApi.list(query),
        assetsApi.getStats(),
        assetClassesApi.getActive(),
      ]);

      return { assetsResult, statsResult, classesResult };
    },
  });

  const assets = listData?.assetsResult.data ?? [];
  const total = listData?.assetsResult.total ?? 0;
  const stats = listData?.statsResult ?? null;
  const assetClasses = listData?.classesResult ?? [];
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load assets') : actionError;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['assets'] });

  const {
    selectedEntity: selectedAsset,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect,
  } = useEntityDetail({
    basePath: '/assets/assets',
    entities: assets,
    fetchDetail: fetchAssetDetail,
    onError: (msg) => setActionError(msg),
  });

  const handleDelete = async (asset: Asset) => {
    confirmDialog({
      message: `Are you sure you want to delete asset "${asset.name}"?`,
      header: 'Delete Asset',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await assetsApi.delete(asset.id);
          if (selectedAsset?.id === asset.id) closeDetail();
          refresh();
        } catch (err) {
          setActionError(extractErrorMessage(err, 'Failed to delete asset'));
        }
      },
    });
  };

  const pageActions = [
    ...(canCreate ? [{
      id: 'create', label: 'New Asset', icon: Plus, variant: 'default' as const,
      onClick: () => router.push('/assets/assets/create'),
    }] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />

      <PageHeader
        icon={Package}
        title="Asset Register"
        description="Manage fixed assets and track their lifecycle"
        actions={pageActions}
        {...PageHeaderPresets.operations}
      />

      <StatCardsGrid columns={4} className="mb-6">
        <StatCard title="Total Assets" value={stats?.total?.toString() ?? '0'} icon={Package} color={StatCardColors.blue} />
        <StatCard title="Active" value={stats?.active?.toString() ?? '0'} icon={CheckCircle} color={StatCardColors.green} />
        <StatCard title="Under Maintenance" value={stats?.underMaintenance?.toString() ?? '0'} icon={Wrench} color={StatCardColors.amber} />
        <StatCard title="Total Value" value={stats ? formatCurrency(stats.totalValue) : `${currencySymbol}0`} icon={DollarSign} color={StatCardColors.purple} />
      </StatCardsGrid>

      <StatCardsGrid columns={3} className="mb-6">
        <StatCard title="Net Book Value" value={stats ? formatCurrency(stats.totalNetBookValue) : `${currencySymbol}0`} icon={TrendingDown} color={StatCardColors.green} />
        <StatCard title="Accumulated Depreciation" value={stats ? formatCurrency(stats.totalAccumulatedDepreciation) : `${currencySymbol}0`} icon={TrendingDown} color={StatCardColors.slate} />
        <StatCard title="Disposed" value={stats?.disposed?.toString() ?? '0'} icon={XCircle} color={StatCardColors.red} />
      </StatCardsGrid>

      <ErrorBanner message={error} onDismiss={() => setActionError(null)} />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search assets..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border px-4 py-2">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="under_maintenance">Under Maintenance</option>
          <option value="disposed">Disposed</option>
        </select>
        <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1); }} className="rounded-lg border px-4 py-2">
          <option value="all">All Classes</option>
          {assetClasses.map((ac) => (
            <option key={ac.id} value={ac.id}>{ac.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : assets.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No assets found"
          description={search || statusFilter !== 'all' || classFilter !== 'all' ? 'Try adjusting your search or filters' : undefined}
          action={!search && statusFilter === 'all' && classFilter === 'all' && canCreate ? { label: 'New Asset', icon: Plus, onClick: () => router.push('/assets/assets/create') } : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium">Code</th>
                  <th className="text-left px-6 py-3 text-sm font-medium">Name</th>
                  <th className="text-left px-6 py-3 text-sm font-medium">Class</th>
                  <th className="text-left px-6 py-3 text-sm font-medium">Location</th>
                  <th className="text-right px-6 py-3 text-sm font-medium">Cost</th>
                  <th className="text-right px-6 py-3 text-sm font-medium">Book Value</th>
                  <th className="text-center px-6 py-3 text-sm font-medium">Condition</th>
                  <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
                  <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className={cn(
                      'hover:bg-muted/30 transition-colors cursor-pointer',
                      selectedAsset?.id === asset.id && 'bg-primary/5'
                    )}
                    onClick={() => openDetail(asset.id)}
                  >
                    <td className="px-6 py-4 font-mono text-sm font-medium">{asset.assetCode}</td>
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <div className="font-medium">{asset.name}</div>
                        {asset.serialNumber && <div className="text-xs text-muted-foreground">S/N: {asset.serialNumber}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{asset.assetClassName || asset.assetClassCode || '-'}</td>
                    <td className="px-6 py-4 text-sm">{asset.location || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">{formatCurrency(asset.acquisitionCost)}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">{formatCurrency(asset.bookValue)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs">{conditionLabels[asset.condition] || asset.condition}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', statusColors[asset.status] || statusColors.inactive)}>
                        {statusLabels[asset.status] || asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openDetail(asset.id)} className="p-2 rounded-lg hover:bg-muted" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        {canEdit && (
                          <button onClick={() => router.push(`/assets/assets/${asset.id}/edit`)} className="p-2 rounded-lg hover:bg-muted" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(asset)} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {selectedAsset && (
        <AssetDetailViewer
          asset={selectedAsset}
          assets={assets}
          onClose={closeDetail}
          onAssetSelect={handleEntitySelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
