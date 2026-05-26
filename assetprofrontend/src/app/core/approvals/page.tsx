'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle,
  Clock,
  GitBranch,
  Settings,
  FileText,
  AlertTriangle,
  Check,
  X,
  ArrowRight,
  RotateCcw,
  Search,
  Filter,
  User,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { pendingApprovalsApi, approvableEntitiesApi } from '@/lib/api/approvals';
import { api } from '@/lib/api';
import type { PendingApproval, ApprovalStats, ApprovableEntityType } from '@/types/approvals';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';
import { useCurrencyFormat } from '@/hooks';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Approvals' },
];

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function ApprovalsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <ApprovalsPage />
    </Suspense>
  );
}

function ApprovalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currencySymbol } = useCurrencyFormat();

  // If ?view=<id> is in the URL, resolve the entity and redirect to its detail page
  const viewId = searchParams.get('view');
  useEffect(() => {
    if (!viewId) return;
    api.get(`/core/approvals/resolve/${viewId}`)
      .then((res) => {
        const url = res.data?.url;
        if (url) router.replace(url);
      })
      .catch(() => { /* no matching approval — stay on page */ });
  }, [viewId, router]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [sortBy, setSortBy] = useState<'submittedAt' | 'entityAmount' | 'daysWaiting'>('submittedAt');

  // Fetch pending approvals
  const { data: approvalsData, isLoading: approvalsLoading } = useQuery({
    queryKey: ['core-approvals-pending', search, filterEntityType, sortBy],
    queryFn: () =>
      pendingApprovalsApi.list({
        search: search || undefined,
        entityType: filterEntityType || undefined,
        sortBy,
        sortOrder: 'desc',
        limit: 20,
      }),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['core-approvals-stats'],
    queryFn: () => pendingApprovalsApi.getStats(),
  });

  // Fetch entity types
  const { data: entityTypes = [] } = useQuery({
    queryKey: ['core-approvable-entities'],
    queryFn: () => approvableEntitiesApi.list(),
  });

  const pendingApprovals = approvalsData?.data ?? [];
  const loading = approvalsLoading;

  const handleApprovalClick = (approval: PendingApproval) => {
    // Navigate to the entity's detail page with approval context
    const entityPath = approval.entitySlug.replace('.', '/');
    router.push(`/${entityPath}/${approval.entityId}?approval=pending`);
  };

  const pageActions = [
    {
      id: 'flows',
      label: 'Manage Flows',
      icon: GitBranch,
      variant: 'outline' as const,
      onClick: () => router.push('/core/approvals/flows'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      variant: 'outline' as const,
      onClick: () => router.push('/core/approvals/settings'),
    },
  ];

  const getEntityIcon = (entitySlug: string) => {
    const iconMap: Record<string, typeof FileText> = {
      'payables.payments': FileText,
      'purchase.orders': FileText,
      'sales.orders': FileText,
    };
    return iconMap[entitySlug] || FileText;
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={CheckCircle}
        title="Approvals"
        description="Review and approve pending documents"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      {/* Stats */}
      <StatCardsGrid columns={4} className="mb-6">
        <StatCard
          title="Pending Approvals"
          value={stats?.pending ?? '-'}
          icon={Clock}
          color={StatCardColors.amber}
        />
        <StatCard
          title="Approved Today"
          value={stats?.approvedToday ?? '-'}
          icon={Check}
          color={StatCardColors.green}
        />
        <StatCard
          title="Rejected Today"
          value={stats?.rejectedToday ?? '-'}
          icon={X}
          color={StatCardColors.red}
        />
        <StatCard
          title="Urgent"
          value={stats?.urgentCount ?? '-'}
          subtitle="Require immediate attention"
          icon={AlertTriangle}
          color={StatCardColors.red}
        />
      </StatCardsGrid>

      {/* Quick Access Cards */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => router.push('/core/approvals/flows')}
          className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors text-left"
        >
          <div className="p-3 rounded-lg bg-purple-500">
            <GitBranch className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Approval Flows</h3>
            <p className="text-sm text-muted-foreground">Configure approval workflows</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </button>

        <button
          onClick={() => router.push('/core/approvals/history')}
          className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors text-left"
        >
          <div className="p-3 rounded-lg bg-blue-500">
            <RotateCcw className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Approval History</h3>
            <p className="text-sm text-muted-foreground">View past approvals</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </button>

        <button
          onClick={() => router.push('/core/approvals/settings')}
          className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors text-left"
        >
          <div className="p-3 rounded-lg bg-gray-500">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Settings</h3>
            <p className="text-sm text-muted-foreground">Configure approval settings</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Pending Approvals Section */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Pending Approvals</h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 rounded-lg border pl-9 pr-3 py-1.5 text-sm"
              />
            </div>

            <select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              <option value="">All Types</option>
              {entityTypes.map((e) => (
                <option key={e.entitySlug} value={e.entityType}>
                  {e.displayName}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              <option value="submittedAt">Newest First</option>
              <option value="daysWaiting">Oldest First</option>
              <option value="entityAmount">Amount</option>
            </select>
          </div>
        </div>

        {loading ? (
        <LoadingSpinner fullPage />
      ) : pendingApprovals.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="All caught up!"
            description="No pending approvals at the moment."
          />
        ) : (
          <div className="divide-y">
            {pendingApprovals.map((approval) => {
              const EntityIcon = getEntityIcon(approval.entitySlug);
              const entityType = entityTypes.find((e) => e.entitySlug === approval.entitySlug);

              return (
                <button
                  key={approval.id}
                  onClick={() => handleApprovalClick(approval)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div
                    className={cn(
                      'p-2.5 rounded-lg',
                      approval.isUrgent
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-amber-100 dark:bg-amber-900/30'
                    )}
                  >
                    <EntityIcon
                      className={cn(
                        'h-5 w-5',
                        approval.isUrgent
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium">{approval.entityReference}</span>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {entityType?.displayName || approval.entityType}
                      </span>
                      {approval.isUrgent && (
                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{approval.entityDescription}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {approval.submittedByName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {approval.daysWaiting === 0
                          ? 'Today'
                          : approval.daysWaiting === 1
                          ? '1 day ago'
                          : `${approval.daysWaiting} days ago`}
                      </span>
                      <span>Step: {approval.currentStepName}</span>
                    </div>
                  </div>

                  {approval.entityAmount && (
                    <div className="text-right">
                      <p className="font-mono font-medium">
                        {approval.currency || `${currencySymbol}`}
                        {Number((approval.entityAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}

                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}

        {pendingApprovals.length > 0 && (
          <div className="p-4 border-t text-center">
            <button
              onClick={() => router.push('/core/approvals/pending')}
              className="text-primary hover:underline text-sm"
            >
              View all pending approvals
            </button>
          </div>
        )}
      </div>
    </TenantLayout>
  );
}
