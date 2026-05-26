'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Scale,
  Plus,
  Pencil,
  Eye,
  Trash2,
  Check,
  Clock,
  FileText,
  XCircle,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { ErrorBanner, LoadingSpinner } from '@/components/erp';;
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { banksApi } from '@/lib/api/accounts';
import {useEntityDetail, useCurrencyFormat } from '@/hooks';
import type {
  Bank,
  BankReconciliation,
} from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { BankReconciliationDetailViewer } from './components/BankReconciliationDetailViewer';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Bank Reconciliation' },
];

// ============================================================================
// WRAPPER WITH SUSPENSE
// ============================================================================

export default function BankReconciliationPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <BankReconciliationListContent />
    </Suspense>
  );
}

// ============================================================================
// fetchDetail OUTSIDE the component
// ============================================================================

const fetchReconciliationDetail = (id: number) => banksApi.getReconciliation(id);

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

function BankReconciliationListContent() {
  const router = useRouter();

  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedBankFilter, setSelectedBankFilter] = useState<number | null>(null);

  const { data: reconData, isLoading: reconLoading, error: reconFetchError } = useQuery({
    queryKey: ['accounts-bank-reconciliation', selectedBankFilter],
    queryFn: () => banksApi.getReconciliations({ bankId: selectedBankFilter || undefined }),
  });
  const reconciliations = reconData?.data ?? [];

  const { data: banksData, isLoading: banksLoading } = useQuery({
    queryKey: ['accounts-banks-list'],
    queryFn: () => banksApi.list(),
  });
  const banks = banksData?.data ?? [];

  const loading = reconLoading || banksLoading;
  const error = reconFetchError ? extractErrorMessage(reconFetchError, 'Failed to load reconciliations') : localError;

  // Detail viewer state - powered by useEntityDetail hook
  const {
    selectedEntity: selectedReconciliation,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handleReconciliationSelect,
  } = useEntityDetail({
    basePath: '/accounts/bank-reconciliation',
    entities: reconciliations,
    fetchDetail: fetchReconciliationDetail,
    onError: (msg) => setLocalError(msg),
  });

  // Format currency
  const { formatCurrency } = useCurrencyFormat();
  // Format date
  const formatDate = (date: string | null | undefined) => {
    if (!date) return '\u2014';
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate stats
  const completedCount = reconciliations.filter((r) => r.status === 'completed').length;
  const draftCount = reconciliations.filter((r) => r.status === 'draft').length;
  const inProgressCount = reconciliations.filter((r) => r.status === 'in_progress').length;

  // Handle delete
  const handleDelete = (reconciliation: BankReconciliation) => {
    if (reconciliation.status === 'completed') {
      setLocalError('Cannot delete a completed reconciliation');
      return;
    }

    const bankLabel = reconciliation.bankName || `Bank #${reconciliation.bankId}`;
    confirmDialog({
      message: `Delete reconciliation for "${bankLabel}" dated ${formatDate(reconciliation.reconciliationDate)}? This action cannot be undone.`,
      header: 'Delete Reconciliation',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await banksApi.deleteReconciliation(reconciliation.id);
          if (selectedReconciliation?.id === reconciliation.id) {
            closeDetail();
          }
          queryClient.invalidateQueries({ queryKey: ['accounts-bank-reconciliation'] });
        } catch (err: unknown) {
          setLocalError(extractErrorMessage(err, 'Failed to delete reconciliation'));
        }
      },
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400">
            <Check className="h-3 w-3" />
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
            <Clock className="h-3 w-3" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            <FileText className="h-3 w-3" />
            Draft
          </span>
        );
    }
  };

  // Page actions - navigate to route, no modal
  const pageActions = [
    {
      id: 'create',
      label: 'New Reconciliation',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => router.push('/accounts/bank-reconciliation/create'),
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      <PageHeader
        icon={Scale}
        title="Bank Reconciliation"
        description="Reconcile bank statements with book balances"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      {/* Stats */}
      <StatCardsGrid columns={4} className="mb-6">
        <StatCard
          title="Total Reconciliations"
          value={reconciliations.length.toString()}
          icon={Scale}
          color={StatCardColors.blue}
        />
        <StatCard
          title="Completed"
          value={completedCount.toString()}
          icon={Check}
          color={StatCardColors.green}
        />
        <StatCard
          title="In Progress"
          value={inProgressCount.toString()}
          icon={Clock}
          color={StatCardColors.amber}
        />
        <StatCard
          title="Draft"
          value={draftCount.toString()}
          icon={FileText}
          color={StatCardColors.purple}
        />
      </StatCardsGrid>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Bank:</label>
          <select
            value={selectedBankFilter || ''}
            onChange={(e) => setSelectedBankFilter(e.target.value ? parseInt(e.target.value) : null)}
            className="rounded-lg border px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Banks</option>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Banner */}
      <ErrorBanner message={error} onDismiss={() => setLocalError(null)} />

      {/* Loading State */}
      {loading && <LoadingSpinner fullPage />}

      {/* Reconciliations List */}
      {!loading && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium">Bank</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Reconciliation Date</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Statement Date</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Statement Balance</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Book Balance</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Difference</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reconciliations.map((reconciliation) => {
                const difference = reconciliation.difference ??
                  ((reconciliation.statementBalance || 0) - (reconciliation.bookBalance || 0));
                return (
                  <tr
                    key={reconciliation.id}
                    className={cn(
                      'hover:bg-muted/50 cursor-pointer transition-colors',
                      selectedReconciliation?.id === reconciliation.id && 'bg-primary/5'
                    )}
                    onClick={() => openDetail(reconciliation.id)}
                  >
                    <td className="px-6 py-4 font-medium">
                      {reconciliation.bankName || `Bank #${reconciliation.bankId}`}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {formatDate(reconciliation.reconciliationDate)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {formatDate(reconciliation.statementDate)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium tabular-nums">
                      {formatCurrency(reconciliation.statementBalance)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium tabular-nums">
                      {formatCurrency(reconciliation.bookBalance)}
                    </td>
                    <td
                      className={cn(
                        'px-6 py-4 text-right font-semibold tabular-nums',
                        Math.abs(difference) < 0.01
                          ? 'text-green-600'
                          : 'text-red-600'
                      )}
                    >
                      {formatCurrency(difference)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(reconciliation.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openDetail(reconciliation.id)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {reconciliation.status !== 'completed' && (
                          <button
                            onClick={() => router.push(`/accounts/bank-reconciliation/${reconciliation.id}/edit`)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {reconciliation.status !== 'completed' && (
                          <button
                            onClick={() => handleDelete(reconciliation)}
                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {reconciliations.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    No reconciliations yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Viewer Panel */}
      {selectedReconciliation && (
        <BankReconciliationDetailViewer
          reconciliation={selectedReconciliation}
          reconciliations={reconciliations}
          onClose={closeDetail}
          onReconciliationSelect={handleReconciliationSelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
