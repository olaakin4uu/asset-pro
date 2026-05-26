'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  X,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Inbox,
  Check,
  Ban,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { LoadingSpinner, EmptyState, ApprovalCelebration } from '@/components/erp';
import { inboxApi, approvalActionsApi } from '@/lib/api/approvals';
import type { InboxGroup, InboxItem } from '@/lib/api/approvals';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { useCurrencyFormat } from '@/hooks';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Approvals Inbox' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Flow group header colours by entity type
// ─────────────────────────────────────────────────────────────────────────────

const flowColour: Record<string, string> = {
  expense_requests:       'bg-amber-50 border-amber-200 text-amber-800',
  sales_orders:           'bg-blue-50 border-blue-200 text-blue-800',
  sales_invoices:         'bg-cyan-50 border-cyan-200 text-cyan-800',
  purchase_requisitions:  'bg-purple-50 border-purple-200 text-purple-800',
  purchase_orders:        'bg-violet-50 border-violet-200 text-violet-800',
  supplier_payments:      'bg-rose-50 border-rose-200 text-rose-800',
  journal_entries:        'bg-slate-50 border-slate-200 text-slate-800',
  bank_transfers:         'bg-emerald-50 border-emerald-200 text-emerald-800',
  customer_receipts:      'bg-teal-50 border-teal-200 text-teal-800',
  credit_notes:           'bg-orange-50 border-orange-200 text-orange-800',
  inventory_transfers:    'bg-lime-50 border-lime-200 text-lime-800',
  inventory_adjustments:  'bg-green-50 border-green-200 text-green-800',
  internal_stock_requests:'bg-yellow-50 border-yellow-200 text-yellow-800',
  leave_requests:         'bg-sky-50 border-sky-200 text-sky-800',
  payroll_runs:           'bg-indigo-50 border-indigo-200 text-indigo-800',
  employee_loans:         'bg-pink-50 border-pink-200 text-pink-800',
  investor_onboarding:    'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800',
  vehicle_bookings:       'bg-stone-50 border-stone-200 text-stone-800',
  loading_orders:         'bg-blue-50 border-blue-200 text-blue-800',
};

// ─────────────────────────────────────────────────────────────────────────────
// Single item row
// ─────────────────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onApprove,
  onReject,
  loading,
}: {
  item: InboxItem;
  onApprove: (item: InboxItem) => void;
  onReject: (item: InboxItem) => void;
  loading: boolean;
}) {
  const { currencySymbol } = useCurrencyFormat();

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/30',
      item.isOverdue && 'border-red-200 bg-red-50/30',
    )}>
      {/* Overdue dot */}
      {item.isOverdue && (
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
      )}

      {/* Reference + description */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{item.reference}</span>
          {item.daysPending > 0 && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
              item.isOverdue ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground',
            )}>
              <Clock className="h-2.5 w-2.5" />
              {item.daysPending}d
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{item.description}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Step: <span className="font-medium text-foreground">{item.currentStep.name}</span>
          {item.requester && <> · By {item.requester}</>}
        </p>
      </div>

      {/* Amount */}
      {item.amount != null && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">
            {item.currency ?? currencySymbol}{(item.amount ?? 0).toLocaleString()}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => window.open(item.entityUrl, '_blank', 'noopener,noreferrer')}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Open in new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button
          disabled={loading}
          onClick={() => onApprove(item)}
          className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
        >
          <Check className="h-3 w-3" />
          Approve
        </button>
        <button
          disabled={loading}
          onClick={() => onReject(item)}
          className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <Ban className="h-3 w-3" />
          Reject
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow group (collapsible)
// ─────────────────────────────────────────────────────────────────────────────

function FlowGroup({
  group,
  onApprove,
  onReject,
  loadingId,
}: {
  group: InboxGroup;
  onApprove: (item: InboxItem) => void;
  onReject: (item: InboxItem) => void;
  loadingId: number | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const colour = flowColour[group.approvableType] || 'bg-muted/30 border-border text-foreground';

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Group header */}
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className={cn(
          'flex w-full items-center gap-3 border-b px-4 py-3 text-left',
          colour,
        )}
      >
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-sm font-semibold">{group.flowName}</span>
        <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold">
          {group.count}
        </span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="space-y-2 p-3">
          {group.items.map(item => (
            <ItemRow
              key={item.approvalStatusId}
              item={item}
              onApprove={onApprove}
              onReject={onReject}
              loading={loadingId === item.approvalStatusId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reject dialog
// ─────────────────────────────────────────────────────────────────────────────

function RejectDialog({
  item,
  onConfirm,
  onCancel,
  loading,
  error,
}: {
  item: InboxItem;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-2">
          <X className="h-5 w-5 text-red-500" />
          <h3 className="text-lg font-semibold">Reject — {item.reference}</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{item.description}</p>
        <label className="mb-1 block text-sm font-medium">Reason for rejection</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="Enter reason..."
          className="mb-4 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            disabled={loading || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function ApprovalsInboxPage() {
  const queryClient = useQueryClient();

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<InboxItem | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['approvals-inbox'],
    queryFn: () => inboxApi.getMyPending(),
    refetchInterval: 60_000, // auto-refresh every minute
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['approvals-inbox'] });
    queryClient.invalidateQueries({ queryKey: ['pending-approvals-count'] });
  };

  const handleApprove = async (item: InboxItem) => {
    setActionLoading(item.approvalStatusId);
    setGlobalError(null);
    try {
      await approvalActionsApi.action(item.approvalStatusId, { action: 'approve' });
      invalidate();
      setCelebrationMsg(`${item.reference} approved!`);
      setTimeout(() => setCelebrationMsg(null), 3000);
    } catch (err: unknown) {
      setGlobalError(extractErrorMessage(err, 'Failed to approve'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.approvalStatusId);
    setRejectError(null);
    try {
      await approvalActionsApi.action(rejectTarget.approvalStatusId, { action: 'reject', comment: reason });
      setRejectTarget(null);
      invalidate();
    } catch (err: unknown) {
      setRejectError(extractErrorMessage(err, 'Failed to reject'));
    } finally {
      setActionLoading(null);
    }
  };

  const isEmpty = !isLoading && (!data || data.totalPending === 0);

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        {...PageHeaderPresets.core}
        icon={Inbox}
        title="Approvals Inbox"
        description="All pending approvals waiting for your action, grouped by workflow"
        badge={data?.totalPending ? { label: `${data.totalPending} pending`, variant: 'warning' } : undefined}
      />

      {globalError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {globalError}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner fullPage />
      ) : fetchError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Failed to load inbox"
          description={extractErrorMessage(fetchError, 'Could not load pending approvals')}
        />
      ) : isEmpty ? (
        <EmptyState
          icon={CheckCircle}
          title="All caught up!"
          description="You have no pending approvals right now."
        />
      ) : (
        <div className="space-y-4">
          {data!.groups.map(group => (
            <FlowGroup
              key={group.approvableType}
              group={group}
              onApprove={handleApprove}
              onReject={item => { setRejectTarget(item); setRejectError(null); }}
              loadingId={actionLoading}
            />
          ))}
        </div>
      )}

      {rejectTarget && (
        <RejectDialog
          item={rejectTarget}
          onConfirm={handleRejectConfirm}
          onCancel={() => { setRejectTarget(null); setRejectError(null); }}
          loading={actionLoading === rejectTarget.approvalStatusId}
          error={rejectError}
        />
      )}

      {celebrationMsg && (
        <ApprovalCelebration message={celebrationMsg} />
      )}
    </TenantLayout>
  );
}
