'use client';

import { Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Wrench, Plus, Search, Eye, Pencil, Trash2, CheckCircle, Clock, Play, Pause, DollarSign, AlertTriangle, XCircle } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { ErrorBanner, LoadingSpinner, EmptyState } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { assetMaintenancesApi } from '@/lib/api/assets';
import { useEntityDetail, useEntityPermissions } from '@/hooks';
import type { AssetMaintenance, AssetMaintenanceQuery } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { MaintenanceDetailViewer } from './components/MaintenanceDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }, { title: 'Assets', href: '/assets' }, { title: 'Maintenance' }];

const statusLabels: Record<string, string> = { scheduled: 'Scheduled', in_progress: 'In Progress', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled' };
const statusColors: Record<string, string> = { scheduled: 'bg-amber-100 text-amber-800', in_progress: 'bg-blue-100 text-blue-800', on_hold: 'bg-gray-100 text-gray-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' };
const priorityColors: Record<string, string> = { low: 'text-gray-500', medium: 'text-blue-500', high: 'text-amber-500', critical: 'text-red-500' };
const maintenanceTypeLabels: Record<string, string> = { preventive: 'Preventive', corrective: 'Corrective', predictive: 'Predictive', condition_based: 'Condition Based', emergency: 'Emergency', routine: 'Routine' };

function formatDate(dateString: string | undefined) { if (!dateString) return '-'; return new Date(dateString).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' }); }

export default function MaintenancePage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <MaintenanceListContent />
    </Suspense>
  );
}

const fetchMaintenanceDetail = (id: number) => assetMaintenancesApi.get(id);

function MaintenanceListContent() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('assets', 'maintenance');

  const [actionError, setActionError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const queryClient = useQueryClient();

  const { data: listData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['asset-maintenances', page, statusFilter],
    queryFn: async () => {
      const query: AssetMaintenanceQuery = { page, limit, status: statusFilter === 'all' ? undefined : (statusFilter as AssetMaintenanceQuery['status']) };
      const [maintenanceResult, statsResult] = await Promise.all([assetMaintenancesApi.list(query), assetMaintenancesApi.getStats()]);
      return { maintenanceResult, statsResult };
    },
  });

  const maintenances = listData?.maintenanceResult.data ?? [];
  const total = listData?.maintenanceResult.total ?? 0;
  const stats = listData?.statsResult ?? null;
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load maintenances') : actionError;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['asset-maintenances'] });

  const {
    selectedEntity: selectedMaintenance,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect,
  } = useEntityDetail({
    basePath: '/assets/maintenance',
    entities: maintenances,
    fetchDetail: fetchMaintenanceDetail,
    onError: (msg) => setActionError(msg),
  });

  const handleDelete = async (maintenance: AssetMaintenance) => {
    if (maintenance.status !== 'scheduled') return;
    confirmDialog({
      message: `Delete maintenance "${maintenance.title}"?`,
      header: 'Delete Maintenance',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await assetMaintenancesApi.delete(maintenance.id);
          if (selectedMaintenance?.id === maintenance.id) closeDetail();
          refresh();
        } catch (err) {
          setActionError(extractErrorMessage(err, 'Failed to delete maintenance'));
        }
      },
    });
  };

  const handleStart = async (maintenance: AssetMaintenance) => {
    if (maintenance.status !== 'scheduled') return;
    confirmDialog({
      message: `Start this maintenance?`,
      header: 'Start Maintenance',
      accept: async () => {
        try {
          await assetMaintenancesApi.start(maintenance.id);
          refresh();
        } catch (err) {
          setActionError(extractErrorMessage(err, 'Failed to start maintenance'));
        }
      },
    });
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      <PageHeader icon={Wrench} title="Asset Maintenance" description="Track and manage maintenance activities" actions={canCreate ? [{ id: 'create', label: 'New Maintenance', icon: Plus, variant: 'default' as const, onClick: () => router.push('/assets/maintenance/create') }] : []} {...PageHeaderPresets.operations} />

      <StatCardsGrid columns={4} className="mb-6">
        <StatCard title="Total Records" value={stats?.total?.toString() ?? '0'} icon={Wrench} color={StatCardColors.blue} />
        <StatCard title="Scheduled" value={stats?.scheduled?.toString() ?? '0'} icon={Clock} color={StatCardColors.amber} />
        <StatCard title="In Progress" value={stats?.inProgress?.toString() ?? '0'} icon={Play} color={StatCardColors.purple} />
        <StatCard title="Overdue" value={stats?.overdue?.toString() ?? '0'} icon={AlertTriangle} color={StatCardColors.red} />
      </StatCardsGrid>

      <ErrorBanner message={error} onDismiss={() => setActionError(null)} />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border px-4 py-2">
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : maintenances.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No maintenance records found"
          description={statusFilter !== 'all' ? 'Try adjusting your filters' : undefined}
          action={statusFilter === 'all' && canCreate ? { label: 'New Maintenance', icon: Plus, onClick: () => router.push('/assets/maintenance/create') } : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium">Number</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Title</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Asset</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Type</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Scheduled</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Priority</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {maintenances.map((m) => (
                <tr
                  key={m.id}
                  className={cn(
                    'hover:bg-muted/30 cursor-pointer',
                    selectedMaintenance?.id === m.id && 'bg-primary/5'
                  )}
                  onClick={() => openDetail(m.id)}
                >
                  <td className="px-6 py-4 font-mono text-sm">{m.maintenanceNumber}</td>
                  <td className="px-6 py-4 text-sm font-medium">{m.title}</td>
                  <td className="px-6 py-4 text-sm"><div>{m.assetName}</div><div className="text-xs text-muted-foreground">{m.assetCode}</div></td>
                  <td className="px-6 py-4 text-sm">{maintenanceTypeLabels[m.maintenanceType]}</td>
                  <td className="px-6 py-4 text-sm">{formatDate(m.scheduledDate)}</td>
                  <td className="px-6 py-4 text-center"><span className={cn('text-xs font-medium uppercase', priorityColors[m.priority])}>{m.priority}</span></td>
                  <td className="px-6 py-4 text-center"><span className={cn('inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', statusColors[m.status])}>{statusLabels[m.status]}</span></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openDetail(m.id)} className="p-2 rounded-lg hover:bg-muted" title="View"><Eye className="h-4 w-4" /></button>
                      {m.status === 'scheduled' && (
                        <>
                          <button onClick={() => handleStart(m)} className="p-2 rounded-lg hover:bg-green-100 text-green-600" title="Start"><Play className="h-4 w-4" /></button>
                          {canEdit && <button onClick={() => router.push(`/assets/maintenance/${m.id}/edit`)} className="p-2 rounded-lg hover:bg-muted" title="Edit"><Pencil className="h-4 w-4" /></button>}
                          {canDelete && <button onClick={() => handleDelete(m)} className="p-2 rounded-lg hover:bg-red-100 text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>}
                        </>
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
          <p className="text-sm text-muted-foreground">Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-lg border disabled:opacity-50 hover:bg-muted">Previous</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page * limit >= total} className="px-4 py-2 rounded-lg border disabled:opacity-50 hover:bg-muted">Next</button>
          </div>
        </div>
      )}

      {selectedMaintenance && (
        <MaintenanceDetailViewer
          maintenance={selectedMaintenance}
          maintenances={maintenances}
          onClose={closeDetail}
          onMaintenanceSelect={handleEntitySelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
