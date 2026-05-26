'use client';

import { Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Plus, Search, Eye, Pencil, Trash2, CheckCircle, Clock, Send, Truck, XCircle } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { ErrorBanner, LoadingSpinner, EmptyState } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { assetTransfersApi } from '@/lib/api/assets';
import { useEntityDetail, useEntityPermissions } from '@/hooks';
import type { AssetTransfer, AssetTransferQuery } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { TransferDetailViewer } from './components/TransferDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Assets', href: '/assets' },
  { title: 'Transfers' },
];

const statusLabels: Record<string, string> = {
  draft: 'Draft', pending_approval: 'Pending Approval', approved: 'Approved',
  in_transit: 'In Transit', completed: 'Completed', cancelled: 'Cancelled',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  pending_approval: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  in_transit: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
};

const transferTypeLabels: Record<string, string> = {
  location: 'Location', department: 'Department', custodian: 'Custodian', branch: 'Branch', company: 'Company',
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function TransfersPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <TransfersListContent />
    </Suspense>
  );
}

const fetchTransferDetail = (id: number) => assetTransfersApi.get(id);

function TransfersListContent() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('assets', 'transfers');

  const [actionError, setActionError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const queryClient = useQueryClient();

  const { data: listData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['asset-transfers', page, statusFilter],
    queryFn: async () => {
      const query: AssetTransferQuery = { page, limit, status: statusFilter === 'all' ? undefined : (statusFilter as AssetTransferQuery['status']) };
      const [transferResult, statsResult] = await Promise.all([assetTransfersApi.list(query), assetTransfersApi.getStats()]);
      return { transferResult, statsResult };
    },
  });

  const transfers = listData?.transferResult.data ?? [];
  const total = listData?.transferResult.total ?? 0;
  const stats = listData?.statsResult ?? null;
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load transfers') : actionError;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['asset-transfers'] });

  const {
    selectedEntity: selectedTransfer,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect,
  } = useEntityDetail({
    basePath: '/assets/transfers',
    entities: transfers,
    fetchDetail: fetchTransferDetail,
    onError: (msg) => setActionError(msg),
  });

  const handleDelete = async (transfer: AssetTransfer) => {
    if (transfer.status !== 'draft') return;
    confirmDialog({
      message: `Delete transfer ${transfer.transferNumber}?`,
      header: 'Delete Transfer',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await assetTransfersApi.delete(transfer.id);
          if (selectedTransfer?.id === transfer.id) closeDetail();
          refresh();
        } catch (err) {
          setActionError(extractErrorMessage(err, 'Failed to delete transfer'));
        }
      },
    });
  };

  const handleSubmit = async (transfer: AssetTransfer) => {
    if (transfer.status !== 'draft') return;
    confirmDialog({
      message: `Submit transfer for approval?`,
      header: 'Submit Transfer',
      accept: async () => {
        try {
          await assetTransfersApi.submit(transfer.id);
          refresh();
        } catch (err) {
          setActionError(extractErrorMessage(err, 'Failed to submit transfer'));
        }
      },
    });
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      <PageHeader
        icon={ArrowLeftRight}
        title="Asset Transfers"
        description="Manage asset movement and transfers"
        actions={canCreate ? [{ id: 'create', label: 'New Transfer', icon: Plus, variant: 'default' as const, onClick: () => router.push('/assets/transfers/create') }] : []}
        {...PageHeaderPresets.operations}
      />

      <StatCardsGrid columns={4} className="mb-6">
        <StatCard title="Total Transfers" value={stats?.total?.toString() ?? '0'} icon={ArrowLeftRight} color={StatCardColors.blue} />
        <StatCard title="Pending Approval" value={stats?.pendingApproval?.toString() ?? '0'} icon={Clock} color={StatCardColors.amber} />
        <StatCard title="In Transit" value={stats?.inTransit?.toString() ?? '0'} icon={Truck} color={StatCardColors.purple} />
        <StatCard title="Completed" value={stats?.completed?.toString() ?? '0'} icon={CheckCircle} color={StatCardColors.green} />
      </StatCardsGrid>

      <ErrorBanner message={error} onDismiss={() => setActionError(null)} />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border px-4 py-2">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="in_transit">In Transit</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : transfers.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No transfers found"
          description={statusFilter !== 'all' ? 'Try adjusting your filters' : undefined}
          action={statusFilter === 'all' && canCreate ? { label: 'New Transfer', icon: Plus, onClick: () => router.push('/assets/transfers/create') } : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium">Number</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Asset</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Type</th>
                <th className="text-left px-6 py-3 text-sm font-medium">From</th>
                <th className="text-left px-6 py-3 text-sm font-medium">To</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Date</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transfers.map((transfer) => (
                <tr
                  key={transfer.id}
                  className={cn(
                    'hover:bg-muted/30 cursor-pointer',
                    selectedTransfer?.id === transfer.id && 'bg-primary/5'
                  )}
                  onClick={() => openDetail(transfer.id)}
                >
                  <td className="px-6 py-4 font-mono text-sm">{transfer.transferNumber}</td>
                  <td className="px-6 py-4 text-sm"><div className="font-medium">{transfer.assetName}</div><div className="text-xs text-muted-foreground">{transfer.assetCode}</div></td>
                  <td className="px-6 py-4 text-sm">{transferTypeLabels[transfer.transferType]}</td>
                  <td className="px-6 py-4 text-sm">{transfer.fromLocation || transfer.fromDepartment || '-'}</td>
                  <td className="px-6 py-4 text-sm">{transfer.toLocation || transfer.toDepartment || '-'}</td>
                  <td className="px-6 py-4 text-sm">{formatDate(transfer.transferDate)}</td>
                  <td className="px-6 py-4 text-center"><span className={cn('inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', statusColors[transfer.status])}>{statusLabels[transfer.status]}</span></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openDetail(transfer.id)} className="p-2 rounded-lg hover:bg-muted" title="View"><Eye className="h-4 w-4" /></button>
                      {transfer.status === 'draft' && (
                        <>
                          <button onClick={() => handleSubmit(transfer)} className="p-2 rounded-lg hover:bg-blue-100 text-blue-600" title="Submit"><Send className="h-4 w-4" /></button>
                          {canEdit && <button onClick={() => router.push(`/assets/transfers/${transfer.id}/edit`)} className="p-2 rounded-lg hover:bg-muted" title="Edit"><Pencil className="h-4 w-4" /></button>}
                          {canDelete && <button onClick={() => handleDelete(transfer)} className="p-2 rounded-lg hover:bg-red-100 text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>}
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

      {selectedTransfer && (
        <TransferDetailViewer
          transfer={selectedTransfer}
          transfers={transfers}
          onClose={closeDetail}
          onTransferSelect={handleEntitySelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
