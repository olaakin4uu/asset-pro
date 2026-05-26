'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  Plus,
  Search,
  ArrowLeft,
  ArrowRight,
  Calendar,
  DollarSign,
  Eye,
  XCircle,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, StatCard, StatCardsGrid, StatCardColors, type PageHeaderAction, ErrorBanner, LoadingSpinner} from '@/components/erp';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { banksApi } from '@/lib/api/accounts';
import {useEntityDetail, useEntityPermissions, useCurrencyFormat } from '@/hooks';
import type { Bank, BankTransfer } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { BankTransferDetailViewer } from './components/BankTransferDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Bank Transfers' },
];

export default function BankTransfersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <BankTransfersListContent />
    </Suspense>
  );
}

const fetchTransferDetail = (id: number) => banksApi.getTransfer(id);

function BankTransfersListContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canCreate } = useEntityPermissions('accounts', 'bank-transfers');

  const [localError, setLocalError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBankFilter, setSelectedBankFilter] = useState<number | null>(null);

  const { data: transfersRaw, isLoading: transfersLoading, error: transfersFetchError } = useQuery({
    queryKey: ['accounts-bank-transfers', selectedBankFilter],
    queryFn: () => banksApi.getTransfers(selectedBankFilter || undefined),
  });
  const transfers = transfersRaw ?? [];

  const { data: banksData, isLoading: banksLoading } = useQuery({
    queryKey: ['accounts-banks-list'],
    queryFn: () => banksApi.list(),
  });
  const banks = banksData?.data ?? [];

  const loading = transfersLoading || banksLoading;
  const error = transfersFetchError ? extractErrorMessage(transfersFetchError, 'Failed to load bank transfers') : localError;

  // Detail viewer state
  const {
    selectedEntity: selectedTransfer,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handleTransferSelect,
  } = useEntityDetail({
    basePath: '/accounts/bank-transfers',
    entities: transfers,
    fetchDetail: fetchTransferDetail,
    onError: (msg) => setLocalError(msg),
  });

  // Get bank name by ID
  const getBankName = (bankId: number): string => {
    const bank = banks.find((b) => b.id === bankId);
    return bank ? bank.name : `Bank #${bankId}`;
  };

  // Format currency
  const { formatCurrency } = useCurrencyFormat();
  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter transfers
  const filteredTransfers = transfers.filter((transfer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      getBankName(transfer.fromBankId).toLowerCase().includes(searchLower) ||
      getBankName(transfer.toBankId).toLowerCase().includes(searchLower) ||
      transfer.reference?.toLowerCase().includes(searchLower) ||
      transfer.description?.toLowerCase().includes(searchLower) ||
      transfer.transferNumber?.toLowerCase().includes(searchLower)
    );
  });

  // Calculate stats
  const totalTransferred = transfers.reduce((sum, t) => sum + Number(t.amount), 0);
  const thisMonthTransfers = transfers.filter((t) => {
    const date = new Date(t.transferDate);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const thisMonthAmount = thisMonthTransfers.reduce((sum, t) => sum + Number(t.amount), 0);

  // Bank transfers are create-only; delete is a no-op stub for the EntityDetailViewer
  const handleDelete = () => {
    // Bank transfers cannot be deleted after creation
  };

  // Page actions
  const pageActions: PageHeaderAction[] = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline',
      onClick: () => router.push('/accounts'),
    },
    ...(canCreate
      ? [
          {
            id: 'create',
            label: 'New Transfer',
            icon: Plus,
            variant: 'default' as const,
            onClick: () => router.push('/accounts/bank-transfers/create'),
          },
        ]
      : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      <PageHeader
        icon={ArrowLeftRight}
        title="Bank Transfers"
        description="Manage inter-bank transfers"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      {/* Stats */}
      <StatCardsGrid columns={3} className="mb-6">
        <StatCard
          title="Total Transfers"
          value={transfers.length.toString()}
          icon={ArrowLeftRight}
          color={StatCardColors.blue}
        />
        <StatCard
          title="Total Amount"
          value={formatCurrency(totalTransferred)}
          icon={DollarSign}
          color={StatCardColors.green}
        />
        <StatCard
          title="This Month"
          value={formatCurrency(thisMonthAmount)}
          subtitle={`${thisMonthTransfers.length} transfers`}
          icon={Calendar}
          color={StatCardColors.purple}
        />
      </StatCardsGrid>

      {/* Error Banner */}
      <ErrorBanner message={error} onDismiss={() => setLocalError(null)} />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Bank:</label>
          <select
            value={selectedBankFilter || ''}
            onChange={(e) =>
              setSelectedBankFilter(e.target.value ? parseInt(e.target.value) : null)
            }
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

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transfers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border pl-10 pr-4 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Transfers Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium">Date</th>
              <th className="text-left px-4 py-3 text-sm font-medium">From</th>
              <th className="text-center px-4 py-3 text-sm font-medium" />
              <th className="text-left px-4 py-3 text-sm font-medium">To</th>
              <th className="text-right px-4 py-3 text-sm font-medium">Amount</th>
              <th className="text-right px-4 py-3 text-sm font-medium">Commission</th>
              <th className="text-right px-4 py-3 text-sm font-medium">Total</th>
              <th className="text-right px-4 py-3 text-sm font-medium">Destination</th>
              <th className="text-center px-4 py-3 text-sm font-medium">Status</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Reference</th>
              <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <LoadingSpinner tableRow colSpan={11} />
            ) : filteredTransfers.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                  {searchTerm
                    ? 'No transfers found matching your search'
                    : 'No bank transfers yet'}
                </td>
              </tr>
            ) : (
              filteredTransfers.map((transfer) => (
                <tr
                  key={transfer.id}
                  className={cn(
                    'hover:bg-muted/50 cursor-pointer transition-colors',
                    selectedTransfer?.id === transfer.id && 'bg-primary/5'
                  )}
                  onClick={() => openDetail(transfer.id)}
                >
                  <td className="px-4 py-3 text-sm">{formatDate(transfer.transferDate)}</td>
                  <td className="px-4 py-3 font-medium text-sm">
                    {transfer.fromBankName || getBankName(transfer.fromBankId)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground inline" />
                  </td>
                  <td className="px-4 py-3 font-medium text-sm">
                    {transfer.toBankName || getBankName(transfer.toBankId)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {formatCurrency(Number(transfer.amount))}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">
                    {Number((transfer as Record<string, unknown>).bankCharges || 0) > 0
                      ? formatCurrency(Number((transfer as Record<string, unknown>).bankCharges))
                      : '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-primary font-mono text-sm">
                    {formatCurrency(Number(transfer.amount) + Number((transfer as Record<string, unknown>).bankCharges || 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {(transfer as Record<string, unknown>).transferType === 'foreign' && Number((transfer as Record<string, unknown>).destinationAmount) > 0 ? (
                      <span className="text-green-600 font-medium">
                        {Number((transfer as Record<string, unknown>).destinationAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        {' '}
                        <span className="text-xs text-muted-foreground">{(transfer as Record<string, unknown>).toBankCurrency as string || ''}</span>
                      </span>
                    ) : '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        transfer.status === 'posted' ? 'bg-green-100 text-green-700' :
                        transfer.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        transfer.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        transfer.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                        'bg-red-100 text-red-700'
                      )}>
                        {transfer.status === 'posted' ? 'Posted' :
                         transfer.status === 'approved' ? 'Approved' :
                         transfer.status === 'pending' ? 'Pending' :
                         transfer.status === 'draft' ? 'Draft' :
                         transfer.status}
                      </span>
                      {transfer.status === 'pending' && (transfer as Record<string, unknown>).pendingStepName && (
                        <span className="text-[10px] text-amber-600 font-medium">
                          Awaiting: {(transfer as Record<string, unknown>).pendingStepName as string}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {transfer.reference || '\u2014'}
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => openDetail(transfer.id)}
                        className="p-2 rounded hover:bg-muted"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Viewer Panel */}
      {selectedTransfer && (
        <BankTransferDetailViewer
          transfer={selectedTransfer}
          transfers={filteredTransfers}
          onClose={closeDetail}
          onTransferSelect={handleTransferSelect}
          onDelete={handleDelete}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['accounts-bank-transfers'] })}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
