'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  RotateCcw,
  ArrowLeft,
  Check,
  X,
  Clock,
  Search,
  Calendar,
  User,
  FileText,
  ArrowRight,
  Filter,
  Download,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { approvalActionsApi, approvableEntitiesApi } from '@/lib/api/approvals';
import type { ApprovalStatusRecord, ApprovalStatus, ApprovableEntityType } from '@/types/approvals';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Approvals', href: '/core/approvals' },
  { title: 'History' },
];

// ============================================================================
// STATUS HELPERS
// ============================================================================

const statusConfig: Record<ApprovalStatus, { label: string; color: string; icon: typeof Check }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: FileText },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: Check },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: X },
  returned: { label: 'Returned', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: RotateCcw },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: Check },
};

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function ApprovalHistoryPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: historyData, isLoading: loading } = useQuery({
    queryKey: ['core-approval-history', page, filterEntityType, filterStatus, dateFrom, dateTo],
    queryFn: () => approvalActionsApi.getAllHistory({
      page,
      limit: 20,
      entityType: filterEntityType || undefined,
      status: filterStatus || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
  });

  const { data: entityTypes = [] } = useQuery({
    queryKey: ['core-approvable-entities'],
    queryFn: () => approvableEntitiesApi.list(),
  });

  const records = historyData?.data ?? [];
  const totalPages = historyData?.totalPages ?? 1;
  const total = historyData?.total ?? 0;

  // Calculate stats from current data
  const stats = {
    approved: records.filter((r) => r.status === 'approved' || r.status === 'completed').length,
    rejected: records.filter((r) => r.status === 'rejected').length,
    returned: records.filter((r) => r.status === 'returned').length,
    total,
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Export functionality coming soon');
  };

  const getEntityTypeName = (entityType: string) => {
    const entity = entityTypes.find((e) => e.entityType === entityType);
    return entity?.displayName || entityType;
  };

  const pageActions = [
    {
      id: 'export',
      label: 'Export',
      icon: Download,
      variant: 'outline' as const,
      onClick: handleExport,
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={RotateCcw}
        title="Approval History"
        description="View past approval activities"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      {/* Stats */}
      <StatCardsGrid columns={4} className="mb-6">
        <StatCard
          title="Total Records"
          value={stats.total}
          icon={FileText}
          color={StatCardColors.blue}
        />
        <StatCard
          title="Approved"
          value={stats.approved}
          icon={Check}
          color={StatCardColors.green}
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          icon={X}
          color={StatCardColors.red}
        />
        <StatCard
          title="Returned"
          value={stats.returned}
          icon={RotateCcw}
          color={StatCardColors.orange}
        />
      </StatCardsGrid>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm"
            />
          </div>

          <select
            value={filterEntityType}
            onChange={(e) => {
              setFilterEntityType(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {entityTypes.map((e) => (
              <option key={e.entitySlug} value={e.entityType}>
                {e.displayName}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as ApprovalStatus | '');
              setPage(1);
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="returned">Returned</option>
            <option value="completed">Completed</option>
          </select>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Submitted By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Last Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No approval records found
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const config = statusConfig[record.status];
                  const lastAction = record.actions?.[record.actions.length - 1];
                  const StatusIcon = config.icon;

                  return (
                    <tr key={record.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">#{record.entityId}</p>
                        {record.flow && (
                          <p className="text-xs text-muted-foreground">{record.flow.name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{getEntityTypeName(record.entityType)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{record.submittedByName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {lastAction ? (
                          <div>
                            <p className="text-sm capitalize">{lastAction.action}</p>
                            <p className="text-xs text-muted-foreground">by {lastAction.userName}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{new Date(record.updatedAt).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">{new Date(record.updatedAt).toLocaleTimeString()}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            // Navigate to entity detail page
                            const entityPath = record.flow?.entitySlug?.replace('.', '/') || record.entityType.toLowerCase();
                            router.push(`/${entityPath}/${record.entityId}`);
                          }}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          View
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={() => router.push('/core/approvals')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Approvals
        </button>
      </div>
    </TenantLayout>
  );
}
