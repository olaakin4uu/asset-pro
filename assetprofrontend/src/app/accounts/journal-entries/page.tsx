'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  Clock,
  RotateCcw,
  Send,
  Undo2,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, StatCard, StatCardColors, ErrorBanner, LoadingSpinner, VoidWithDateDialog, type PageHeaderAction } from '@/components/erp';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { journalEntriesApi, type JournalEntry, type JournalEntryQuery } from '@/lib/api/accounts';
import {useEntityDetail, useEntityPermissions, useEntityList, useCurrencyFormat } from '@/hooks';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { JournalEntryDetailViewer } from './components/JournalEntryDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Journal Entries' },
];

export default function JournalEntriesPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <JournalEntriesListContent />
    </Suspense>
  );
}

const fetchJournalEntryDetail = (id: number) => journalEntriesApi.get(id);

const statusSeverity: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  posted: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  reversed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

interface JournalFilters {
  search: string;
  status: string;
  journalType: string;
  sourceType: string;
}

function JournalEntriesListContent() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('accounts', 'journal-entries');

  const {
    items: entries,
    loading,
    error,
    clearError,
    page,
    setPage,
    totalPages,
    filters,
    setFilters,
    refresh,
    total,
  } = useEntityList<JournalEntry, never, JournalFilters>({
    queryKey: 'journal-entries',
    fetchList: (params) => journalEntriesApi.list({
      search: params.search || undefined,
      status: params.status !== 'all' ? params.status : undefined,
      journalType: params.journalType !== 'all' ? params.journalType : undefined,
      sourceType: params.sourceType !== 'all' ? params.sourceType : undefined,
      page: params.page,
      limit: params.limit,
    }),
    defaultFilters: { search: '', status: 'all', journalType: 'all', sourceType: 'manual' },
    limit: 25,
  });

  // Detail viewer state
  const {
    selectedEntity: selectedEntry,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handleEntrySelect,
  } = useEntityDetail({
    basePath: '/accounts/journal-entries',
    entities: entries,
    fetchDetail: fetchJournalEntryDetail,
  });

  // Compute simple stats from current entries
  const stats = {
    total,
    draft: entries.filter((e) => e.status === 'draft').length,
    pending: entries.filter((e) => e.status === 'pending').length,
    posted: entries.filter((e) => e.status === 'posted').length,
    reversed: entries.filter((e) => e.status === 'reversed').length,
  };

  const handleDelete = (entry: JournalEntry) => {
    confirmDialog({
      message: `Are you sure you want to delete journal entry "${entry.entryNumber}"? This action cannot be undone.`,
      header: 'Delete Journal Entry',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await journalEntriesApi.delete(entry.id);
          if (selectedEntry?.id === entry.id) {
            closeDetail();
          }
          refresh();
        } catch (err: unknown) {
          extractErrorMessage(err, 'Failed to delete journal entry');
        }
      },
    });
  };

  const handlePost = (entry: JournalEntry) => {
    confirmDialog({
      message: `Are you sure you want to post journal entry "${entry.entryNumber}"? Once posted, the entry cannot be edited.`,
      header: 'Post Journal Entry',
      icon: 'pi pi-check-circle',
      accept: async () => {
        try {
          await journalEntriesApi.post(entry.id);
          refresh();
          // Re-fetch detail if open
          if (selectedEntry?.id === entry.id) {
            const updated = await journalEntriesApi.get(entry.id);
            handleEntrySelect(updated);
          }
        } catch (err: unknown) {
          extractErrorMessage(err, 'Failed to post journal entry');
        }
      },
    });
  };

  const [reverseTarget, setReverseTarget] = useState<JournalEntry | null>(null);
  const handleReverse = (entry: JournalEntry) => setReverseTarget(entry);

  const { formatCurrency } = useCurrencyFormat();

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const [limit, setLimit] = useState(25);

  const actions: PageHeaderAction[] = [
    {
      id: 'refresh',
      label: 'Refresh',
      icon: RefreshCw,
      variant: 'outline',
      onClick: refresh,
    },
    ...(canCreate
      ? [
          {
            id: 'add',
            label: 'New Entry',
            icon: Plus,
            variant: 'default' as const,
            onClick: () => router.push('/accounts/journal-entries/create'),
          },
        ]
      : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      <PageHeader
        {...PageHeaderPresets.financial}
        icon={FileText}
        title="Journal Entries"
        description="Create and manage journal entries"
        actions={actions}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard title="Total" value={stats.total} icon={FileText} color={StatCardColors.blue} />
        <StatCard title="Draft" value={stats.draft} icon={FileText} color={StatCardColors.slate} />
        <StatCard title="Pending" value={stats.pending} icon={Clock} color={StatCardColors.yellow} />
        <StatCard title="Posted" value={stats.posted} icon={CheckCircle} color={StatCardColors.green} />
        <StatCard title="Reversed" value={stats.reversed} icon={RotateCcw} color={StatCardColors.red} />
      </div>

      {/* Error Banner */}
      <ErrorBanner message={error} onDismiss={clearError} />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by entry number or reference..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background"
            />
          </div>
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-lg border px-4 py-2 bg-background"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="posted">Posted</option>
          <option value="reversed">Reversed</option>
        </select>
        <select
          value={filters.journalType}
          onChange={(e) => setFilters({ ...filters, journalType: e.target.value })}
          className="rounded-lg border px-4 py-2 bg-background"
        >
          <option value="all">All Types</option>
          <option value="general">General</option>
          <option value="adjusting">Adjusting</option>
          <option value="closing">Closing</option>
          <option value="opening">Opening</option>
        </select>
        <select
          value={filters.sourceType}
          onChange={(e) => setFilters({ ...filters, sourceType: e.target.value })}
          className="rounded-lg border px-4 py-2 bg-background"
        >
          <option value="manual">Manual Only</option>
          <option value="all">All Journals</option>
          <option value="sales_invoice">Sales Invoices</option>
          <option value="sales_delivery">Sales Deliveries</option>
          <option value="credit_note">Credit Notes</option>
          <option value="goods_received_note">GRN Accruals</option>
          <option value="purchase_invoice">Purchase Invoices</option>
          <option value="purchase_return">Purchase Returns</option>
          <option value="production_scrap">Production Scrap</option>
          <option value="production_labor">Production Labor</option>
          <option value="production_variance">Production Variance</option>
          <option value="payment">Payments</option>
        </select>
      </div>

      {/* Entries Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium">Entry #</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Date</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Reference</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Narration</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Type</th>
              <th className="text-right px-4 py-3 text-sm font-medium">Debit</th>
              <th className="text-right px-4 py-3 text-sm font-medium">Credit</th>
              <th className="text-center px-4 py-3 text-sm font-medium">Status</th>
              <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <LoadingSpinner tableRow colSpan={9} />
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  No journal entries found. Create your first entry to get started.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={cn(
                    'hover:bg-muted/50 cursor-pointer transition-colors',
                    selectedEntry?.id === entry.id && 'bg-primary/5'
                  )}
                  onClick={() => openDetail(entry.id)}
                >
                  <td className="px-4 py-3">
                    <code className="text-sm font-mono">{entry.entryNumber}</code>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDate(entry.entryDate)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {entry.reference || '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="line-clamp-1">{entry.narration || '\u2014'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {entry.journalType || 'general'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {formatCurrency(entry.totalDebit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {formatCurrency(entry.totalCredit)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                          statusSeverity[entry.status] || statusSeverity.draft
                        )}
                      >
                        {entry.status}
                      </span>
                      {entry.status === 'pending' && (entry as Record<string, unknown>).pendingStepName && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          Awaiting: {(entry as Record<string, unknown>).pendingStepName as string}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => openDetail(entry.id)}
                        className="p-2 rounded hover:bg-muted"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {entry.status === 'draft' && canEdit && (
                        <button
                          onClick={() =>
                            router.push(`/accounts/journal-entries/${entry.id}/edit`)
                          }
                          className="p-2 rounded hover:bg-muted"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {(entry.status === 'draft' || entry.status === 'pending') && canEdit && (
                        <button
                          onClick={() => handlePost(entry)}
                          className="p-2 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                          title="Post"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      {entry.status === 'posted' && canEdit && (
                        <button
                          onClick={() => handleReverse(entry)}
                          className="p-2 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600"
                          title="Reverse"
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      )}
                      {entry.status === 'draft' && canDelete && (
                        <button
                          onClick={() => handleDelete(entry)}
                          className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Viewer Panel */}
      {selectedEntry && (
        <JournalEntryDetailViewer
          entry={selectedEntry}
          entries={entries}
          onClose={closeDetail}
          onEntrySelect={handleEntrySelect}
          onDelete={handleDelete}
          onRefresh={refresh}
          onPost={handlePost}
          onReverse={handleReverse}
          loading={detailLoading}
        />
      )}

      {/* Reverse Dialog */}
      {reverseTarget && (
        <VoidWithDateDialog
          open={!!reverseTarget}
          title={`Reverse journal entry ${reverseTarget.entryNumber}`}
          actionLabel="Reverse"
          defaultDate={
            typeof reverseTarget.entryDate === 'string'
              ? reverseTarget.entryDate.slice(0, 10)
              : new Date().toISOString().slice(0, 10)
          }
          minDate={
            typeof reverseTarget.entryDate === 'string'
              ? reverseTarget.entryDate.slice(0, 10)
              : undefined
          }
          onCancel={() => setReverseTarget(null)}
          onConfirm={async (reason, date) => {
            const targetId = reverseTarget.id;
            await journalEntriesApi.reverse(targetId, date, reason);
            setReverseTarget(null);
            refresh();
            // Re-fetch detail if open
            if (selectedEntry?.id === targetId) {
              const updated = await journalEntriesApi.get(targetId);
              handleEntrySelect(updated);
            }
          }}
        />
      )}
    </TenantLayout>
  );
}
