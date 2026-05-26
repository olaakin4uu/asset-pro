'use client';

import React, { Suspense } from 'react';
import { extractErrorMessage } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  ArrowLeft,
  Check,
  XCircle,
  Clock,
  DollarSign,
  Send,
  Eye,
  Trash2,
  Wallet,
  Printer,
  FileDown,
  Upload,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { LoadingSpinner } from '@/components/erp';;
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { expenseRequestsApi } from '@/lib/api/accounts';
import {useEntityDetail, useEntityPermissions, useCurrencyFormat } from '@/hooks';
import type { ExpenseRequest, ExpenseRequestStats } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';
import { ExpenseRequestDetailViewer } from './components/ExpenseRequestDetailViewer';
import { BatchImportModal } from './components/BatchImportModal';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Expense Requests' },
];

export default function ExpenseRequestsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <ExpenseRequestsPageContent />
    </Suspense>
  );
}

const fetchRequestDetail = (id: number) => expenseRequestsApi.get(id);

function ExpenseRequestsPageContent() {
  const router = useRouter();
  const { canCreate, canDelete, canApprove } = useEntityPermissions('accounts', 'expense-requests');

  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [stats, setStats] = useState<ExpenseRequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 500, 1000];
  const [importOpen, setImportOpen] = useState(false);

  const {
    selectedEntity: selectedRequest,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handleRequestSelect,
  } = useEntityDetail({
    basePath: '/accounts/expense-requests',
    entities: requests,
    fetchDetail: fetchRequestDetail,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [requestsResponse, statsResponse] = await Promise.all([
        expenseRequestsApi.list({
          status: statusFilter || undefined,
          search: searchTerm || undefined,
          minAmount: minAmount ? parseFloat(minAmount) : undefined,
          maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
          page,
          limit,
        }),
        expenseRequestsApi.getStats(),
      ]);

      setRequests(requestsResponse.data);
      setTotal(requestsResponse.total);
      setStats(statsResponse);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to load expense requests'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, searchTerm, minAmount, maxAmount, page, limit]);
  const { formatCurrency } = useCurrencyFormat();
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Status labels match the actual backend expense_requests.status values.
  // The step-level detail (HOD, Audit, Accountant, etc.) comes from pendingStepName/pendingRoleName.
  const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    draft:     { label: 'Draft',            icon: <FileText className="h-3 w-3" />, cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
    pending:   { label: 'Pending Approval', icon: <Clock className="h-3 w-3" />,    cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
    approved:  { label: 'Approved',         icon: <Check className="h-3 w-3" />,    cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    paid:      { label: 'Paid',             icon: <Wallet className="h-3 w-3" />,   cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    rejected:  { label: 'Rejected',         icon: <XCircle className="h-3 w-3" />,  cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    cancelled: { label: 'Cancelled',        icon: <XCircle className="h-3 w-3" />,  cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500' },
  };

  const getStatusBadge = (status: string, pendingStepName?: string | null, pendingRoleName?: string | null, requesterName?: string | null) => {
    const s = STATUS_LABELS[status] ?? { label: status, icon: <Clock className="h-3 w-3" />, cls: 'bg-gray-100 text-gray-600' };
    const isPending = status.startsWith('pending') || status === 'pending';
    const isRejected = status === 'rejected';
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${s.cls}`}>
          {s.icon} {isRejected ? 'Returned' : s.label}
        </span>
        {isRejected && requesterName && (
          <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">
            To: {requesterName}
          </span>
        )}
        {isPending && pendingStepName && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            Awaiting: {pendingStepName}
          </span>
        )}
        {isPending && pendingRoleName && (
          <span className="text-[10px] text-muted-foreground">
            Role: {pendingRoleName}
          </span>
        )}
      </div>
    );
  };

  const handleSubmit = async (request: ExpenseRequest, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionLoading(true);
      await expenseRequestsApi.submit(request.id);
      loadData();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to submit expense request'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (request: ExpenseRequest) => {
    confirmDialog({
      message: `Are you sure you want to delete expense request "${request.requestNumber}"? This action cannot be undone.`,
      header: 'Delete Expense Request',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await expenseRequestsApi.delete(request.id);
          if (selectedRequest?.id === request.id) closeDetail();
          loadData();
        } catch (err: unknown) {
          setError(extractErrorMessage(err, 'Failed to delete expense request'));
        }
      },
    });
  };

  const handlePay = async (request: ExpenseRequest, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setActionLoading(true);
      await expenseRequestsApi.markAsPaid(request.id);
      loadData();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to mark as paid'));
    } finally {
      setActionLoading(false);
    }
  };

  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/accounts'),
    },
    {
      id: 'batch-transfer',
      label: 'Batch Transfer',
      icon: FileText,
      variant: 'outline' as const,
      onClick: () => router.push('/accounts/expense-requests/batch-transfer'),
      tooltip: 'Generate batch bank transfer request',
    },
    ...(canCreate ? [{
      id: 'import',
      label: 'Import',
      icon: Upload,
      variant: 'outline' as const,
      onClick: () => setImportOpen(true),
      tooltip: 'Batch upload expense requests from a CSV',
    }] : []),
    ...(canCreate ? [{
      id: 'create',
      label: 'New Request',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => router.push('/accounts/expense-requests/create'),
    }] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />

      <PageHeader
        icon={FileText}
        title="Expense Requests"
        description="Manage employee expense requests and approvals"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <StatCardsGrid columns={4} className="mb-6">
        <StatCard title="Total Requests" value={(stats?.total || 0).toString()} icon={FileText} color={StatCardColors.blue} />
        <StatCard title="Pending Approval" value={(stats?.pending || 0).toString()} icon={Clock} color={StatCardColors.amber} />
        <StatCard title="Approved" value={(stats?.approved || 0).toString()} icon={Check} color={StatCardColors.green} />
        <StatCard title="Total Amount" value={formatCurrency(stats?.totalAmount || 0)} icon={DollarSign} color={StatCardColors.purple} />
      </StatCardsGrid>

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Min amount"
            value={minAmount}
            onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
            className="w-32 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Max amount"
            value={maxAmount}
            onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
            className="w-32 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && <LoadingSpinner fullPage />}

      {!loading && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium">Request #</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Date</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Requester</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Description</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Amount</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors cursor-pointer',
                    selectedRequest?.id === request.id && 'bg-primary/5'
                  )}
                  onClick={() => openDetail(request.id)}
                >
                  <td className="px-6 py-4 font-mono text-sm">{request.requestNumber}</td>
                  <td className="px-6 py-4 text-sm">{formatDate(request.requestDate)}</td>
                  <td className="px-6 py-4">{request.requesterName || `Employee #${request.requesterId}`}</td>
                  <td className="px-6 py-4 text-sm max-w-xs truncate">{request.description}</td>
                  <td className="px-6 py-4 text-right font-semibold">{formatCurrency(request.totalAmount)}</td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(request.status, request.pendingStepName, request.pendingRoleName, request.requesterName)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openDetail(request.id)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {request.status === 'draft' && (
                        <>
                          <button
                            onClick={(e) => handleSubmit(request, e)}
                            disabled={actionLoading}
                            className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-colors disabled:opacity-50"
                            title="Submit for Approval"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(request); }}
                              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}

                      {request.status === 'pending' && canApprove && (
                        <button
                          onClick={() => openDetail(request.id)}
                          className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors"
                          title="Review (Approve/Reject)"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}

                      {request.status === 'approved' && canApprove && (
                        <button
                          onClick={(e) => handlePay(request, e)}
                          disabled={actionLoading}
                          className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-colors disabled:opacity-50"
                          title="Mark as Paid"
                        >
                          <Wallet className="h-4 w-4" />
                        </button>
                      )}

                      {(request.status === 'approved' || request.status === 'paid' || (request.pendingStepName ?? '').toLowerCase().includes('payment')) && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const blob = await expenseRequestsApi.getMemo(request.id);
                              const url = URL.createObjectURL(blob);
                              window.open(url, '_blank');
                            } catch {}
                          }}
                          className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 transition-colors"
                          title="Print Memo"
                        >
                          <FileDown className="h-4 w-4" />
                        </button>
                      )}

                      {request.status === 'paid' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const blob = await expenseRequestsApi.getPaymentVoucher(request.id);
                              const url = URL.createObjectURL(blob);
                              window.open(url, '_blank');
                            } catch {}
                          }}
                          className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors"
                          title="Print Payment Voucher"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No expense requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {total > 0 && (
            <div className="border-t px-6 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
                </span>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded border px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
              {total > limit && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded border disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * limit >= total}
                    className="px-3 py-1 rounded border disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedRequest && (
        <ExpenseRequestDetailViewer
          expenseRequest={selectedRequest}
          expenseRequests={requests}
          onClose={closeDetail}
          onRequestSelect={handleRequestSelect}
          onDelete={handleDelete}
          onRefresh={() => loadData()}
          loading={detailLoading}
        />
      )}

      <BatchImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onCommitted={() => {
          // Refresh list + stats after a successful commit so the user sees
          // the new rows without a hard reload. Keep the modal open so they
          // can see the per-group report before manually closing.
          loadData();
        }}
      />
    </TenantLayout>
  );
}
