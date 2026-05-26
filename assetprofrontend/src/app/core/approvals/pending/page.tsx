'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  ArrowLeft,
  Check,
  X,
  Search,
  User,
  FileText,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { LoadingSpinner, EmptyState, ApprovalCelebration } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { pendingApprovalsApi, approvableEntitiesApi, approvalActionsApi } from '@/lib/api/approvals';
import type { PendingApproval, ApprovalStats, ApprovableEntityType } from '@/types/approvals';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { useCurrencyFormat } from '@/hooks';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Approvals', href: '/core/approvals' },
  { title: 'Pending' },
];

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function PendingApprovalsPage() {
  // useSearchParams() must be inside Suspense for static rendering (Next.js 15+).
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <PendingApprovalsContent />
    </Suspense>
  );
}

function PendingApprovalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currencySymbol } = useCurrencyFormat();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);

  // Filters (entity type is driven by ?type=<approvableType> URL param)
  const [search, setSearch] = useState('');
  const [filterEntityType, setFilterEntityType] = useState(searchParams?.get('type') ?? '');
  const [sortBy, setSortBy] = useState<'submittedAt' | 'entityAmount' | 'daysWaiting'>('submittedAt');
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  // 'mine' (default) shows the current user's queue; 'all' shows every pending
  // approval in the company. Driven by ?scope= URL param so dashboard click-through
  // can land on either view.
  const [scope, setScope] = useState<'mine' | 'all'>(
    searchParams?.get('scope') === 'all' ? 'all' : 'mine',
  );

  // Re-sync filter when the URL ?type= param changes (e.g. user clicks a different
  // flow row on the dashboard while already on this page — useState initializer
  // only runs once on mount, so we need to mirror searchParams updates explicitly).
  useEffect(() => {
    const urlType = searchParams?.get('type') ?? '';
    setFilterEntityType((prev) => {
      if (prev === urlType) return prev;
      setPage(1);
      return urlType;
    });
  }, [searchParams]);

  // Action state
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'return'>('approve');
  const [actionComment, setActionComment] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);

  // Fetch pending approvals
  const { data: approvalsData, isLoading: approvalsLoading } = useQuery({
    queryKey: ['core-pending-approvals', page, search, filterEntityType, sortBy, showUrgentOnly, scope],
    queryFn: () =>
      pendingApprovalsApi.list({
        page,
        limit: 20,
        search: search || undefined,
        entityType: filterEntityType || undefined,
        scope,
        sortBy,
        sortOrder: 'desc',
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

  const rawApprovals = approvalsData?.data ?? [];
  const approvals = showUrgentOnly ? rawApprovals.filter((a) => a.isUrgent) : rawApprovals;
  const totalPages = approvalsData?.totalPages ?? 1;
  const total = approvalsData?.total ?? 0;
  const loading = approvalsLoading;

  const handleAction = async () => {
    if (!selectedApproval) return;

    setActionLoading(selectedApproval.statusId);
    setModalError(null);
    try {
      await approvalActionsApi.action(selectedApproval.statusId, {
        action: actionType,
        comment: actionComment || undefined,
      });
      const stepName = selectedApproval.currentStepName || 'Step';
      const ref = selectedApproval.entityReference || '';
      setShowActionModal(false);
      setActionComment('');
      setSelectedApproval(null);
      queryClient.invalidateQueries({ queryKey: ['core-pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['core-approvals-stats'] });
      if (actionType === 'approve') {
        setCelebrationMsg(`${stepName} for ${ref} approved successfully!`);
      }
    } catch (err: unknown) {
      setModalError(extractErrorMessage(err, 'Failed to perform action'));
    } finally {
      setActionLoading(null);
    }
  };

  const openActionModal = (approval: PendingApproval, action: 'approve' | 'reject' | 'return') => {
    setSelectedApproval(approval);
    setActionType(action);
    setActionComment('');
    setModalError(null);
    setShowActionModal(true);
  };

  const handleApprovalClick = (approval: PendingApproval) => {
    const entityPath = approval.entitySlug.replace('.', '/');
    router.push(`/${entityPath}/${approval.entityId}?approval=pending`);
  };

  const getEntityIcon = (entitySlug: string) => {
    return FileText;
  };

  const getEntityTypeName = (entitySlug: string) => {
    const entity = entityTypes.find((e) => e.entitySlug === entitySlug);
    return entity?.displayName || entitySlug;
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      {celebrationMsg && (
        <ApprovalCelebration
          message={celebrationMsg}
          onClose={() => setCelebrationMsg(null)}
        />
      )}

      <PageHeader
        icon={Clock}
        title="Pending Approvals"
        description="Review and process pending approval requests"
        {...PageHeaderPresets.core}
      />

      {/* Stats */}
      <StatCardsGrid columns={4} className="mb-6">
        <StatCard
          title="Pending"
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
          icon={AlertTriangle}
          color={StatCardColors.red}
        />
      </StatCardsGrid>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search approvals..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm"
            />
          </div>

          <select
            value={filterEntityType}
            onChange={(e) => {
              const next = e.target.value;
              setFilterEntityType(next);
              setPage(1);
              // Mirror the selection in the URL so the page is shareable / bookmarkable
              // and the browser back-button retraces the user's filter trail.
              const params = new URLSearchParams(searchParams?.toString() ?? '');
              if (next) {
                params.set('type', next);
              } else {
                params.delete('type');
              }
              const qs = params.toString();
              router.replace(qs ? `/core/approvals/pending?${qs}` : '/core/approvals/pending');
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
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as typeof sortBy);
              setPage(1);
            }}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="submittedAt">Newest First</option>
            <option value="daysWaiting">Oldest First</option>
            <option value="entityAmount">Highest Amount</option>
          </select>

          <div className="inline-flex rounded-lg border bg-muted/30 p-0.5 text-xs">
            {(['mine', 'all'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (scope === s) return;
                  setScope(s);
                  setPage(1);
                  // Mirror in URL so the toggle state survives reloads / share links
                  const params = new URLSearchParams(searchParams?.toString() ?? '');
                  if (s === 'all') {
                    params.set('scope', 'all');
                  } else {
                    params.delete('scope');
                  }
                  const qs = params.toString();
                  router.replace(qs ? `/core/approvals/pending?${qs}` : '/core/approvals/pending');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-md font-medium transition-colors',
                  scope === s
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title={s === 'mine' ? 'Only items you can approve' : 'Every pending approval (admin view)'}
              >
                {s === 'mine' ? 'My Queue' : 'All Pending'}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUrgentOnly}
              onChange={(e) => {
                setShowUrgentOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Urgent only</span>
          </label>
        </div>
      </div>

      {/* Approvals List */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
        <LoadingSpinner fullPage />
      ) : approvals.length === 0 ? (
          <EmptyState
            icon={Check}
            title="All caught up!"
            description={showUrgentOnly ? 'No urgent approvals at the moment.' : 'No pending approvals at the moment.'}
          />
        ) : (
          <div className="divide-y">
            {approvals.map((approval) => {
              const EntityIcon = getEntityIcon(approval.entitySlug);

              return (
                <div
                  key={approval.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        'p-2.5 rounded-lg flex-shrink-0',
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

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => handleApprovalClick(approval)}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {approval.entityReference}
                        </button>
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {getEntityTypeName(approval.entitySlug)}
                        </span>
                        {approval.isUrgent && (
                          <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {approval.entityDescription}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                        {approval.supplierName && (
                          <span>Supplier: {approval.supplierName}</span>
                        )}
                        {approval.customerName && (
                          <span>Customer: {approval.customerName}</span>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    {approval.entityAmount && (
                      <div className="text-right flex-shrink-0">
                        <p className="font-mono font-medium">
                          {approval.currency || `${currencySymbol}`}
                          {Number((approval.entityAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openActionModal(approval, 'approve')}
                        disabled={actionLoading === approval.statusId}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => openActionModal(approval, 'reject')}
                        disabled={actionLoading === approval.statusId}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                      <button
                        onClick={() => openActionModal(approval, 'return')}
                        disabled={actionLoading === approval.statusId}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted disabled:opacity-50 transition-colors"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Return
                      </button>
                      <button
                        onClick={() => handleApprovalClick(approval)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="View Details"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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

      {/* Action Modal */}
      {showActionModal && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowActionModal(false)}
          />
          <div className="relative w-full max-w-md rounded-xl bg-background border shadow-lg m-4 p-6">
            <h3 className="text-lg font-semibold capitalize mb-2">
              {actionType} Approval
            </h3>
            <p className="text-muted-foreground mb-4">
              {actionType === 'approve' && `Approve ${selectedApproval.entityReference}?`}
              {actionType === 'reject' && `Reject ${selectedApproval.entityReference}? Please provide a reason.`}
              {actionType === 'return' && `Return ${selectedApproval.entityReference} for revision? Please provide a reason.`}
            </p>

            <textarea
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              placeholder={actionType === 'approve' ? 'Optional comment...' : 'Reason (required)...'}
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm mb-4 resize-none"
            />

            {modalError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowActionModal(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading !== null || (actionType !== 'approve' && !actionComment.trim())}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50',
                  actionType === 'approve' && 'bg-green-600 hover:bg-green-700',
                  actionType === 'reject' && 'bg-red-600 hover:bg-red-700',
                  actionType === 'return' && 'bg-orange-600 hover:bg-orange-700'
                )}
              >
                {actionLoading ? 'Processing...' : `Confirm ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
      )}

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
