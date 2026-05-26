'use client';

import { Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { ErrorBanner, LoadingSpinner, EmptyState } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { assetClassesApi } from '@/lib/api/assets';
import { useEntityDetail, useEntityPermissions } from '@/hooks';
import type { AssetClass, AssetClassQuery } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { AssetClassDetailViewer } from './components/AssetClassDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Assets', href: '/assets' },
  { title: 'Asset Classes' },
];

const depreciationMethodLabels: Record<string, string> = {
  STRAIGHT_LINE: 'Straight Line',
  DECLINING_BALANCE: 'Declining Balance',
  UNITS_OF_PRODUCTION: 'Units of Production',
  SUM_OF_YEARS_DIGITS: 'Sum of Years Digits',
};

export default function AssetClassesPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <AssetClassesListContent />
    </Suspense>
  );
}

const fetchAssetClassDetail = (id: number) => assetClassesApi.get(id);

function AssetClassesListContent() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('assets', 'asset-classes');

  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const queryClient = useQueryClient();

  const { data: listData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['asset-classes', page, search, statusFilter],
    queryFn: async () => {
      const query: AssetClassQuery = {
        page,
        limit,
        search: search || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      };

      const [classesResult, statsResult] = await Promise.all([
        assetClassesApi.list(query),
        assetClassesApi.getStats(),
      ]);

      return { classesResult, statsResult };
    },
  });

  const assetClasses = listData?.classesResult.data ?? [];
  const total = listData?.classesResult.total ?? 0;
  const stats = listData?.statsResult ?? null;
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load asset classes') : actionError;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['asset-classes'] });

  const {
    selectedEntity: selectedAssetClass,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect,
  } = useEntityDetail({
    basePath: '/assets/asset-classes',
    entities: assetClasses,
    fetchDetail: fetchAssetClassDetail,
    onError: (msg) => setActionError(msg),
  });

  const handleDelete = async (assetClass: AssetClass) => {
    confirmDialog({
      message: `Are you sure you want to delete asset class "${assetClass.name}"?`,
      header: 'Delete Asset Class',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await assetClassesApi.delete(assetClass.id);
          if (selectedAssetClass?.id === assetClass.id) {
            closeDetail();
          }
          refresh();
        } catch (err) {
          setActionError(extractErrorMessage(err, 'Failed to delete asset class'));
        }
      },
    });
  };

  const pageActions = [
    ...(canCreate ? [{
      id: 'create',
      label: 'New Asset Class',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => router.push('/assets/asset-classes/create'),
    }] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />

      <PageHeader
        icon={Layers}
        title="Asset Classes"
        description="Manage asset classifications and depreciation policies"
        actions={pageActions}
        {...PageHeaderPresets.operations}
      />

      <StatCardsGrid columns={4} className="mb-6">
        <StatCard title="Total Classes" value={stats?.total?.toString() ?? '0'} icon={Layers} color={StatCardColors.blue} />
        <StatCard title="Active" value={stats?.active?.toString() ?? '0'} icon={CheckCircle} color={StatCardColors.green} />
        <StatCard title="Inactive" value={stats?.inactive?.toString() ?? '0'} icon={XCircle} color={StatCardColors.slate} />
        <StatCard title="Total Assets" value={stats?.totalAssets?.toString() ?? '0'} icon={Layers} color={StatCardColors.purple} />
      </StatCardsGrid>

      <ErrorBanner message={error} onDismiss={() => setActionError(null)} />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search asset classes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border px-4 py-2"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : assetClasses.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No asset classes found"
          description={search || statusFilter !== 'all' ? 'Try adjusting your search or filters' : undefined}
          action={!search && statusFilter === 'all' && canCreate ? { label: 'New Asset Class', icon: Plus, onClick: () => router.push('/assets/asset-classes/create') } : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium">Code</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Depreciation Method</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Useful Life</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Residual %</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Assets</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assetClasses.map((assetClass) => (
                <tr
                  key={assetClass.id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors cursor-pointer',
                    selectedAssetClass?.id === assetClass.id && 'bg-primary/5'
                  )}
                  onClick={() => openDetail(assetClass.id)}
                >
                  <td className="px-6 py-4 font-mono text-sm font-medium">{assetClass.code}</td>
                  <td className="px-6 py-4 text-sm">{assetClass.name}</td>
                  <td className="px-6 py-4 text-sm">
                    {depreciationMethodLabels[assetClass.depreciationMethod] || assetClass.depreciationMethod}
                  </td>
                  <td className="px-6 py-4 text-sm">{assetClass.usefulLifeYears} years</td>
                  <td className="px-6 py-4 text-sm">{assetClass.residualValuePercent}%</td>
                  <td className="px-6 py-4 text-center text-sm">{assetClass.assetCount || 0}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                        assetClass.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      )}
                    >
                      {assetClass.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openDetail(assetClass.id)} className="p-2 rounded-lg hover:bg-muted" title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEdit && (
                        <button onClick={() => router.push(`/assets/asset-classes/${assetClass.id}/edit`)} className="p-2 rounded-lg hover:bg-muted" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(assetClass)} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600" title="Delete">
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
      )}

      {!loading && total > limit && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border disabled:opacity-50 hover:bg-muted">
              Previous
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page * limit >= total} className="px-4 py-2 rounded-lg border disabled:opacity-50 hover:bg-muted">
              Next
            </button>
          </div>
        </div>
      )}

      {selectedAssetClass && (
        <AssetClassDetailViewer
          assetClass={selectedAssetClass}
          assetClasses={assetClasses}
          onClose={closeDetail}
          onAssetClassSelect={handleEntitySelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
