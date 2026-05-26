'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  Search,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Clock,
  User,
  Globe,
  ChevronRight,
  Download,
  X,
  Filter,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { auditLogsApi } from '@/lib/api/audit-logs';
import { useEntityPermissions } from '@/hooks';
import type { AuditLog, AuditLogStats, AuditLogQuery, AuditLogEntityType, AuditEvent } from '@/types/audit-logs';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Audit Trail' },
];

// ============================================================================
// HELPERS
// ============================================================================

const eventLabels: Record<AuditEvent, string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  restored: 'Restored',
};

const eventColors: Record<AuditEvent, string> = {
  created: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  restored: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
};

const eventIconColors: Record<AuditEvent, string> = {
  created: 'bg-green-500',
  updated: 'bg-blue-500',
  deleted: 'bg-red-500',
  restored: 'bg-purple-500',
};

function getEventIcon(event: AuditEvent) {
  switch (event) {
    case 'created':
      return Plus;
    case 'updated':
      return Pencil;
    case 'deleted':
      return Trash2;
    case 'restored':
      return RotateCcw;
    default:
      return History;
  }
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function AuditLogsPage() {
  const router = useRouter();
  const { canExport } = useEntityPermissions('core', 'audit-logs');

  // Filters
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const hasActiveFilters = search || eventFilter || entityTypeFilter || userFilter || dateFrom || dateTo;

  // Fetch audit logs with TanStack Query
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['core-audit-logs', page, search, eventFilter, entityTypeFilter, userFilter, dateFrom, dateTo],
    queryFn: () => {
      const query: AuditLogQuery = {
        page,
        limit,
        search: search || undefined,
        event: eventFilter as AuditEvent || undefined,
        entityType: entityTypeFilter || undefined,
        userId: userFilter ? parseInt(userFilter) : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };
      return auditLogsApi.list(query);
    },
  });

  const logs = logsData?.data ?? [];
  const total = logsData?.total ?? 0;
  const totalPages = logsData?.totalPages ?? 0;

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['core-audit-logs-stats'],
    queryFn: () => auditLogsApi.getStats(),
  });

  // Fetch entity types for filter
  const { data: entityTypes = [] } = useQuery({
    queryKey: ['core-audit-logs-entity-types'],
    queryFn: () => auditLogsApi.getEntityTypes(),
  });

  // Fetch users for filter
  const { data: users = [] } = useQuery({
    queryKey: ['core-audit-logs-users'],
    queryFn: () => auditLogsApi.getUsers(),
  });

  const loading = logsLoading;

  // Search with debounce
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const clearFilters = () => {
    setSearch('');
    setEventFilter('');
    setEntityTypeFilter('');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleExport = () => {
    auditLogsApi.exportCsv({
      search: search || undefined,
      event: eventFilter as AuditEvent || undefined,
      entityType: entityTypeFilter || undefined,
      userId: userFilter ? parseInt(userFilter) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  };

  const pageActions = [
    ...(canExport ? [{
      id: 'export',
      label: 'Export CSV',
      icon: Download,
      variant: 'outline' as const,
      onClick: handleExport,
    }] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={History}
        title="Audit Trail"
        description="Track all changes made to your system records"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      {/* Statistics */}
      <StatCardsGrid columns={3} className="mb-6">
        <StatCard
          title="Total Entries"
          value={stats?.total?.toString() ?? '0'}
          icon={History}
          color={StatCardColors.blue}
        />
        <StatCard
          title="Today"
          value={stats?.today?.toString() ?? '0'}
          icon={Clock}
          color={StatCardColors.purple}
        />
        <StatCard
          title="This Week"
          value={stats?.thisWeek?.toString() ?? '0'}
          icon={History}
          color={StatCardColors.slate}
        />
        <StatCard
          title="Created"
          value={stats?.created?.toString() ?? '0'}
          icon={Plus}
          color={StatCardColors.green}
        />
        <StatCard
          title="Updated"
          value={stats?.updated?.toString() ?? '0'}
          icon={Pencil}
          color={StatCardColors.amber}
        />
        <StatCard
          title="Deleted"
          value={stats?.deleted?.toString() ?? '0'}
          icon={Trash2}
          color={StatCardColors.red}
        />
      </StatCardsGrid>

      {/* Filters */}
      <div className="mb-6 rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search audits..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border pl-10 pr-4 py-2"
              />
            </div>
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Event Type</label>
            <select
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">All Events</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="restored">Restored</option>
            </select>
          </div>

          {/* Entity Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Entity Type</label>
            <select
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">All Types</option>
              {entityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* User */}
          <div className="space-y-2">
            <label className="text-sm font-medium">User</label>
            <select
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="space-y-2">
            <label className="text-sm font-medium">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <label className="text-sm font-medium">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && <LoadingSpinner fullPage />}

      {/* Audit Entries */}
      {!loading && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Audit Log Entries</h3>
              <p className="text-sm text-muted-foreground">{total} total entries</p>
            </div>
          </div>

          {logs.length === 0 ? (
            <EmptyState
              icon={History}
              title="No audit logs found"
              description={
                hasActiveFilters
                  ? 'Try adjusting your filters.'
                  : 'Audit logs will appear here when changes are made.'
              }
            />
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const EventIcon = getEventIcon(log.event);
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/core/audit-logs/${log.id}`)}
                  >
                    {/* Event Icon */}
                    <div
                      className={cn(
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                        eventIconColors[log.event]
                      )}
                    >
                      <EventIcon className="h-5 w-5 text-white" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            eventColors[log.event]
                          )}
                        >
                          {eventLabels[log.event]}
                        </span>
                        <span className="text-sm font-medium">
                          {log.auditableTypeLabel}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          #{log.auditableId}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {log.userName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {log.createdAtRelative}
                        </div>
                        {log.ipAddress && (
                          <div className="flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5" />
                            {log.ipAddress}
                          </div>
                        )}
                      </div>
                      {/* Changes Preview */}
                      {log.changes && log.changes.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-muted-foreground">
                            {log.changes.length} field{log.changes.length > 1 ? 's' : ''} changed:{' '}
                            {log.changes.slice(0, 3).map((c) => c.fieldLabel).join(', ')}
                            {log.changes.length > 3 && ` and ${log.changes.length - 3} more`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border disabled:opacity-50 hover:bg-muted"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg border disabled:opacity-50 hover:bg-muted"
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
