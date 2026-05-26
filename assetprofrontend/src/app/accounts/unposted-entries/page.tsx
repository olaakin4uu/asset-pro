'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileWarning,
  Download,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  FileText,
  Send,
  Loader2,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { StatCard, StatCardColors, StatCardsGrid } from '@/components/erp/StatCard';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { journalEntriesApi, fiscalYearsApi } from '@/lib/api/accounts';
import type { JournalEntry, FiscalYear } from '@/lib/api/accounts';
import { extractErrorMessage, formatCurrency, formatDate } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/core';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Unposted Entries' },
];

export default function UnpostedEntriesPage() {
  const router = useRouter();

  const queryClient = useQueryClient();

  // UI state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [posting, setPosting] = useState(false);
  const [postingResult, setPostingResult] = useState<{ success: number; failed: number } | null>(
    null
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'pending'>('all');
  const [fiscalYearFilter, setFiscalYearFilter] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Load fiscal years
  const { data: fiscalYearsData } = useQuery({
    queryKey: ['accounts-fiscal-years-list'],
    queryFn: () => fiscalYearsApi.list({ limit: 50 }),
  });
  const fiscalYears = fiscalYearsData?.data ?? [];

  // Build shared query params
  const sharedParams: Record<string, string | number> = {
    page,
    limit: pageSize,
    ...(fiscalYearFilter && { fiscalYearId: Number(fiscalYearFilter) }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(searchQuery && { search: searchQuery }),
  };

  // Load entries via TanStack Query
  const { data: entriesData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['accounts-unposted-entries', statusFilter, fiscalYearFilter, startDate, endDate, searchQuery, page],
    queryFn: async () => {
      if (statusFilter === 'draft') {
        const response = await journalEntriesApi.list({ ...sharedParams, status: 'draft' });
        return { entries: response.data || [], total: response.total || 0 };
      } else if (statusFilter === 'pending') {
        const response = await journalEntriesApi.list({ ...sharedParams, status: 'pending' });
        return { entries: response.data || [], total: response.total || 0 };
      } else {
        const [draftRes, pendingRes] = await Promise.all([
          journalEntriesApi.list({ ...sharedParams, status: 'draft' }),
          journalEntriesApi.list({ ...sharedParams, status: 'pending' }),
        ]);
        return {
          entries: [...(draftRes.data || []), ...(pendingRes.data || [])],
          total: (draftRes.total || 0) + (pendingRes.total || 0),
        };
      }
    },
  });
  const entries = entriesData?.entries ?? [];
  const totalCount = entriesData?.total ?? 0;
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load unposted entries') : null;

  // Selection handlers
  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  };

  // Post selected entries
  const handlePostSelected = async () => {
    if (selectedIds.size === 0) return;

    setPosting(true);
    setPostingResult(null);
    let success = 0;
    let failed = 0;

    for (const id of selectedIds) {
      try {
        await journalEntriesApi.post(id);
        success++;
      } catch {
        failed++;
      }
    }

    setPostingResult({ success, failed });
    setPosting(false);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['accounts-unposted-entries'] });
  };

  // Export handler
  const handleExport = () => {
    const csvRows = [
      ['Entry Number', 'Date', 'Description', 'Total Debit', 'Total Credit', 'Status', 'Created At'],
      ...entries.map((entry) => [
        entry.entryNumber,
        entry.entryDate,
        entry.narration || '',
        entry.totalDebit.toString(),
        entry.totalCredit.toString(),
        entry.status,
        entry.createdAt,
      ]),
    ];
    const csvContent = csvRows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unposted-entries.csv';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Page actions
  const pageActions = [
    {
      id: 'export',
      label: 'Export CSV',
      icon: Download,
      variant: 'outline' as const,
      onClick: handleExport,
      disabled: entries.length === 0,
    },
  ];

  // Stats
  const draftCount = entries.filter((e) => e.status === 'draft').length;
  const pendingCount = entries.filter((e) => e.status === 'pending').length;
  const totalAmount = entries.reduce((sum, e) => sum + e.totalDebit, 0);

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
            Draft
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={FileWarning}
        title="Unposted Accounting Entries"
        description="Review and post draft or pending journal entries"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      {/* Stats */}
      <StatCardsGrid columns={4} className="mb-6">
        <StatCard
          title="Total Unposted"
          value={totalCount}
          icon={FileText}
          color={StatCardColors.blue}
          loading={loading}
        />
        <StatCard
          title="Draft Entries"
          value={draftCount}
          icon={FileWarning}
          color={StatCardColors.orange}
          loading={loading}
        />
        <StatCard
          title="Pending Entries"
          value={pendingCount}
          icon={AlertTriangle}
          color={StatCardColors.amber}
          loading={loading}
        />
        <StatCard
          title="Total Amount"
          value={formatCurrency(totalAmount)}
          icon={DollarSign}
          color={StatCardColors.purple}
          loading={loading}
        />
      </StatCardsGrid>

      {/* Posting Result */}
      {postingResult && (
        <div
          className={`rounded-lg p-4 mb-6 ${
            postingResult.failed === 0
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {postingResult.failed === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            <p
              className={`text-sm ${
                postingResult.failed === 0 ? 'text-green-800' : 'text-yellow-800'
              }`}
            >
              {postingResult.success} entries posted successfully
              {postingResult.failed > 0 && `, ${postingResult.failed} entries failed`}.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Fiscal Year Filter */}
            <select
              value={fiscalYearFilter}
              onChange={(e) =>
                setFiscalYearFilter(e.target.value ? Number(e.target.value) : '')
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Fiscal Years</option>
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.name}
                </option>
              ))}
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Start date"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="End date"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
              />
            </div>

            {/* Post Selected Button */}
            {selectedIds.size > 0 && (
              <button
                onClick={handlePostSelected}
                disabled={posting}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {posting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Post Selected ({selectedIds.size})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={entries.length > 0 && selectedIds.size === entries.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Entry Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Total Debit
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Total Credit
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.length > 0 ? (
                  entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`hover:bg-gray-50 ${
                        selectedIds.has(entry.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={() => toggleSelection(entry.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() =>
                            router.push(`/accounts/journal-entries/${entry.id}`)
                          }
                          className="text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {entry.entryNumber}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {formatDate(entry.entryDate)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                        {entry.narration || entry.reference || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-gray-900">
                        {formatCurrency(entry.totalDebit)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-gray-900">
                        {formatCurrency(entry.totalCredit)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {getStatusBadge(entry.status)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={async () => {
                            try {
                              await journalEntriesApi.post(entry.id);
                              queryClient.invalidateQueries({ queryKey: ['accounts-unposted-entries'] });
                            } catch (err: unknown) {
                              alert(extractErrorMessage(err, 'Failed to post entry'));
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                        >
                          <Send className="h-3 w-3" />
                          Post
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-4" />
                      <p className="text-sm font-medium text-gray-900">All entries are posted</p>
                      <p className="text-xs text-gray-500 mt-1">
                        There are no draft or pending journal entries.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, totalCount)} of {totalCount} entries
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * pageSize >= totalCount}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </TenantLayout>
  );
}
