'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Check, XCircle, Clock, Wallet, Calendar, DollarSign, List,
  CheckCircle, User, Building2, CreditCard, AlertCircle, Ban, RotateCcw, FileDown, Send, Paperclip,
} from 'lucide-react';
import { EntityDetailViewer, metadataTab, ApprovalPanel, COMMON_ACTIONS, EntityCombobox, ApprovalCelebration } from '@/components/erp';
import type { EntityDetailConfig, TabDef, ApprovalPanelConfig } from '@/components/erp';
import type { ExpenseRequest, Account, Wht } from '@/lib/api/accounts';
import { expenseRequestsApi, banksApi, accountsApi, whtApi } from '@/lib/api/accounts';
import { approvalActionsApi } from '@/lib/api/approvals';
import type { ApprovalStatusRecord } from '@/types/approvals';
import { useCurrencyFormat, useIsSuperAdmin } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { extractErrorMessage } from '@/lib/utils';

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Status labels match actual backend expense_requests.status values.
// Step-level detail comes from the configurable approval system (currentStep).
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  pending:   { label: 'Pending',   cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  approved:  { label: 'Approved',  cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  paid:      { label: 'Paid',      cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  rejected:  { label: 'Rejected',  cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500' },
};

const STAGE_LABELS: Record<string, string> = {
  hod: 'HOD Approval',
  audit: 'Audit Review',
  accountant: 'Accountant Processing',
  management: 'Management Approval',
  cashier: 'Cashier / Payment',
};

// ============================================================================
// LINE ITEMS TAB
// ============================================================================

function LineItemsTab({ request }: { request: ExpenseRequest }) {
  const lines = request.lines || [];
  const hasWht = lines.some(l => l.whtApplicable);

  if (lines.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No line items</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="text-left px-4 py-3">Description</th>
            <th className="text-left px-4 py-3">Account</th>
            <th className="text-right px-4 py-3">Qty</th>
            <th className="text-right px-4 py-3">Unit Price</th>
            <th className="text-right px-4 py-3">Amount</th>
            {hasWht && <th className="text-right px-4 py-3">WHT</th>}
            {hasWht && <th className="text-right px-4 py-3">Net</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {lines.map((line) => (
            <tr key={line.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                {line.description}
                {line.remarks && <p className="text-xs text-muted-foreground mt-0.5">{line.remarks}</p>}
              </td>
              <td className="px-4 py-3">
                {line.accountCode ? (
                  <div>
                    <span className="font-mono text-xs">{line.accountCode}</span>
                    {line.accountName && <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{line.accountName}</p>}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">{Number((line.quantity ?? 0)).toLocaleString()}</td>
              <td className="px-4 py-3 text-right">₦{Number((line.unitPrice ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="px-4 py-3 text-right font-medium">₦{Number((line.amount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              {hasWht && <td className="px-4 py-3 text-right text-orange-600">{line.whtApplicable ? '₦' + Number((line.whtAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</td>}
              {hasWht && <td className="px-4 py-3 text-right font-medium text-green-600">₦{line.whtApplicable ? Number((line.netAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Number((line.amount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-muted/30 border-t font-semibold">
          <tr>
            <td colSpan={hasWht ? 4 : 4} className="px-4 py-3 text-right">Total:</td>
            <td className="px-4 py-3 text-right">₦{Number((request.totalAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            {hasWht && <td className="px-4 py-3 text-right text-orange-600">₦{Number((request.whtAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
            {hasWht && <td className="px-4 py-3 text-right text-green-600">₦{Number((request.netAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ============================================================================
// GL ACCOUNT SEARCHABLE SELECT
// ============================================================================

function GLAccountSelect({ value, onChange, accounts }: { value: number | null; onChange: (id: number) => void; accounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  const selected = accounts.find(a => a.id === value);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q));
  }, [accounts, search]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="w-full text-left rounded border px-2 py-1.5 text-xs bg-background hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary truncate"
      >
        {selected ? (
          <span><span className="font-mono text-muted-foreground">{selected.code}</span> — {selected.name}</span>
        ) : (
          <span className="text-muted-foreground">Select GL Account...</span>
        )}
      </button>
      {open && (
        <div className="fixed z-[9999] w-80 rounded-lg border bg-background shadow-2xl" style={{
          top: ref.current ? ref.current.getBoundingClientRect().bottom + 4 : 0,
          left: ref.current ? Math.min(ref.current.getBoundingClientRect().left, window.innerWidth - 330) : 0,
        }}>
          <div className="p-2 border-b">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or code..."
              className="w-full rounded border px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">No accounts found</p>
            ) : (
              filtered.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { onChange(a.id); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/10 cursor-pointer transition-colors ${a.id === value ? 'bg-primary/10 font-medium' : ''}`}
                >
                  <span className="font-mono text-muted-foreground mr-2">{a.code}</span>
                  {a.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// APPROVAL TIMELINE TAB
// ============================================================================

function ApprovalTimelineTab({ request, onRefresh }: { request: ExpenseRequest; onRefresh?: () => void }) {
  const router = useRouter();

  // Configurable approval status
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatusRecord | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Payment / bank state
  const [banks, setBanks] = useState<Array<{ id: number; bankName: string; accountNumber: string; [key: string]: unknown }>>([]);
  const [bankId, setBankId] = useState<number | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Shared action state
  const [comment, setComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Super Admin reset
  const isSuperAdmin = useIsSuperAdmin();
  const currentUser = useAuthStore(s => s.user);
  const isRequester = currentUser?.employeeId === request.requesterId;
  const canEditRejected = isRequester || isSuperAdmin;
  // Requesters can also edit a pending request that no approver has acted
  // on yet. Backend enforces the same rule — this flag just controls button
  // visibility so we don't tease an edit path that would fail.
  const canEditPendingNoApprovals =
    (isRequester || isSuperAdmin) &&
    request.status === 'pending' &&
    !request.approvalsStarted;
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Accountant GL account allocations: lineId → accountId
  const [lineAccounts, setLineAccounts] = useState<Record<number, number>>({});
  // WHT: lineId → { whtId, applicable }
  const [lineWht, setLineWht] = useState<Record<number, { whtId: number | null; applicable: boolean }>>({});
  const [whtRates, setWhtRates] = useState<Wht[]>([]);
  const [glAccounts, setGlAccounts] = useState<Account[]>([]);

  // Signature file for approval
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  const isPending = request.status === 'pending';
  const isDraft = request.status === 'draft';

  // Determine current step from configurable system (falls back to request.status)
  const currentStepName = approvalStatus?.currentStep?.name?.toLowerCase() || '';
  const currentStepOrder = approvalStatus?.currentStep?.stepNumber ?? 0;
  const currentStepType = approvalStatus?.currentStep?.stepType || 'approve';
  // HARDCODED STEPS — detected by stepType field (not name or position):
  // Account/Finance Coding → stepType: 'accountant' (GL coding + WHT application)
  // Payment Process → stepType: 'payment' (bank selection + payment processing)
  // Also detect: all approvals done but expense still pending = payment not processed
  const allApprovalsDone = approvalStatus?.status === 'approved' && request.status === 'pending';
  const isAccountantStep = currentStepType === 'accountant';
  const isCashierStep = currentStepType === 'payment' || allApprovalsDone;

  // Approver visibility: backend tells us if the current user can approve
  const currentStep = approvalStatus?.currentStep;
  const approverNames = currentStep?.approverNames ?? [];
  const isDesignatedApprover = approvalStatus?.canCurrentUserApprove ?? false;

  // Load approval status + GL accounts + WHT rates + banks all in parallel
  const loadApprovalStatus = useCallback(async () => {
    if (!request.id || isDraft) return;
    setApprovalLoading(true);
    try {
      const [status, accounts, whts, banksList] = await Promise.all([
        approvalActionsApi.getStatus('expense_requests', request.id).catch(() => null),
        accountsApi.list({ limit: 500 }).then(r => r.data ?? []).catch(() => [] as Account[]),
        whtApi.getActive().catch(() => []),
        banksApi.getAuthorizedBanks().then(list => list.length > 0 ? list : banksApi.list({ limit: 100 }).then(r => r.data ?? [])).catch(() => []),
      ]);
      setApprovalStatus(status);
      setGlAccounts(accounts);
      setWhtRates(whts);
      setBanks(banksList);

      // Pre-fill existing line allocations
      const existingAccounts: Record<number, number> = {};
      const existingWht: Record<number, { whtId: number | null; applicable: boolean }> = {};
      (request.lines ?? []).forEach(l => {
        if (l.id && l.accountId) existingAccounts[l.id] = l.accountId;
        if (l.id) existingWht[l.id] = { whtId: l.whtId ?? null, applicable: l.whtApplicable ?? false };
      });
      setLineAccounts(existingAccounts);
      setLineWht(existingWht);
    } finally {
      setApprovalLoading(false);
    }
  }, [request.id, isDraft, request.lines]);

  useEffect(() => {
    loadApprovalStatus();
  }, [loadApprovalStatus]);

  const handleAction = async (action: 'approve' | 'reject') => {
    setActionLoading(true);
    setActionError(null);
    try {
      const id = request.id;
      if (action === 'approve') {
        // Account/Finance Coding step: save GL + WHT before approving
        if (isAccountantStep && (request.lines ?? []).length > 0) {
          const codingLines = (request.lines ?? []).map(line => {
            const whtEntry = lineWht[line.id] ?? { whtId: null, applicable: false };
            return {
              lineId: line.id,
              accountId: lineAccounts[line.id] || undefined,
              whtId: whtEntry.applicable ? whtEntry.whtId : null,
              whtApplicable: whtEntry.applicable,
            };
          });
          await expenseRequestsApi.saveLineCoding(id, codingLines);
        }

        if (isCashierStep) {
          // Special: cashier processes payment
          if (!bankId) { setActionError('Please select a bank account'); return; }
          if (!paymentDate) { setActionError('Please select a payment date'); return; }
          await expenseRequestsApi.processPayment(id, {
            bankAccountId: bankId,
            paymentDate,
            paymentReference: paymentRef || undefined,
            notes: paymentNotes || undefined,
          });
        } else {
          // ALL expense request steps route through domain-specific approve endpoint.
          // This ensures: authority check, accountant GL/budget logic, status sync to 'approved' on final step.
          await expenseRequestsApi.approve(id, { comments: comment || undefined });
        }
      } else {
        const reason = rejectionReason.trim() || 'Rejected';
        // ALL expense request rejections route through domain-specific endpoint
        // This ensures: authority check, status sync, notification to requester
        await expenseRequestsApi.reject(id, { reason });
      }
      setComment('');
      setRejectionReason('');
      setSignatureFile(null);
      await loadApprovalStatus();
      onRefresh?.();

      // Show success feedback
      if (action === 'approve') {
        const stepName = approvalStatus?.currentStep?.name || 'Step';
        setSuccessMsg(`${stepName} approved successfully!`);
      } else {
        setSuccessMsg('Request has been rejected.');
      }
    } catch (err: unknown) {
      setActionError(extractErrorMessage(err, 'Action failed'));
    } finally {
      setActionLoading(false);
    }
  };

  // Build timeline from configurable system if available, else from hardcoded approvals
  const configSteps = approvalStatus ? (() => {
    try {
      const stepsRaw = (approvalStatus as unknown as { steps?: unknown }).steps;
      if (Array.isArray(stepsRaw)) return stepsRaw as Array<Record<string, unknown>>;
    } catch { /* ignore */ }
    return [];
  })() : [];

  const legacyApprovals = request.approvals ?? [];
  const STAGES = ['hod', 'audit', 'accountant', 'management', 'cashier'];

  return (
    <div className="space-y-6">
      {/* Success celebration — navigates to dashboard after dismissal */}
      {successMsg && (
        <ApprovalCelebration
          message={successMsg}
          onClose={() => {
            setSuccessMsg(null);
            router.push('/accounts/expense-requests');
          }}
        />
      )}

      {/* Rejection reason banner */}
      {request.status === 'rejected' && request.rejectionReason && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Request Rejected</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{request.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Cancellation banner */}
      {request.status === 'cancelled' && (
        <div className="flex items-center gap-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <Ban className="h-5 w-5 text-gray-500 shrink-0" />
          <p className="text-sm text-gray-600 dark:text-gray-400">This request has been cancelled.</p>
        </div>
      )}

      {/* Approval timeline — configurable flow if available, else legacy */}
      {configSteps.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Approval Flow</p>
          {configSteps.map((step, i) => {
            const st = (step['status'] as string || 'WAITING').toUpperCase();
            return (
              <div key={i} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    st === 'APPROVED' ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-400' :
                    st === 'REJECTED' || st === 'OVERRIDDEN' ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:border-red-400' :
                    st === 'PENDING' ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 animate-pulse' :
                    'bg-muted border-muted-foreground/30 text-muted-foreground'
                  }`}>
                    {st === 'APPROVED' ? <Check className="h-4 w-4" /> :
                     st === 'REJECTED' ? <XCircle className="h-4 w-4" /> :
                     st === 'PENDING' ? <Clock className="h-4 w-4" /> :
                     i + 1}
                  </div>
                  {i < configSteps.length - 1 && (
                    <div className={`w-0.5 h-6 mt-1 ${st === 'APPROVED' ? 'bg-green-400' : 'bg-muted-foreground/20'}`} />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{step['name'] as string || `Step ${i + 1}`}</p>
                    {st !== 'WAITING' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        st === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        st === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {st === 'APPROVED' ? 'Approved' : st === 'REJECTED' ? 'Rejected' : 'In Progress'}
                      </span>
                    )}
                  </div>
                  {(step['approvedBy'] as string | undefined) ? (
                    <>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step['approvedBy'] as string}
                        {step['approvedAt'] ? ` — ${formatDate(step['approvedAt'] as string)}` : ''}
                      </p>
                      {/* Show comment from matching approval action */}
                      {(() => {
                        const matchingAction = approvalStatus?.actions?.find(
                          a => a.stepName === (step['name'] as string) && a.comment
                        );
                        return matchingAction?.comment ? (
                          <p className="text-xs text-muted-foreground italic mt-0.5">&ldquo;{matchingAction.comment}&rdquo;</p>
                        ) : null;
                      })()}
                    </>
                  ) : (step['roleName'] as string | undefined) ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Assigned to: <span className="font-medium text-amber-600 dark:text-amber-400">{step['roleName'] as string}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : legacyApprovals.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Approval Pipeline</p>
          {STAGES.map((stage, i) => {
            const approval = legacyApprovals.find(a => a.approvalType === stage);
            const st = approval
              ? approval.status === 'approved' ? 'approved'
              : approval.status === 'rejected' ? 'rejected'
              : 'pending'
              : 'waiting';
            return (
              <div key={stage} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    st === 'approved' ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-400' :
                    st === 'rejected' ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:border-red-400' :
                    st === 'pending' ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 animate-pulse' :
                    'bg-muted border-muted-foreground/30 text-muted-foreground'
                  }`}>
                    {st === 'approved' ? <Check className="h-4 w-4" /> :
                     st === 'rejected' ? <XCircle className="h-4 w-4" /> :
                     st === 'pending' ? <Clock className="h-4 w-4" /> :
                     i + 1}
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={`w-0.5 h-6 mt-1 ${st === 'approved' ? 'bg-green-400' : 'bg-muted-foreground/20'}`} />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{STAGE_LABELS[stage]}</p>
                    {st !== 'waiting' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        st === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        st === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {st === 'approved' ? 'Approved' : st === 'rejected' ? 'Rejected' : 'In Progress'}
                      </span>
                    )}
                  </div>
                  {approval?.approverName && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {approval.approverName}{approval.approverTitle ? ` · ${approval.approverTitle}` : ''}
                      {approval.approvedAt ? ` — ${formatDate(approval.approvedAt)}` : ''}
                    </p>
                  )}
                  {approval?.comments && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">"{approval.comments}"</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Rejection banner */}
      {request.status === 'rejected' && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Request Returned</p>
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                  Returned to: {request.requesterName || `Employee #${request.requesterId}`}
                </span>
              </div>
              {request.rejectionReason && (
                <p className="text-sm text-red-700 dark:text-red-400 mt-2">
                  Reason: <span className="font-medium">{request.rejectionReason}</span>
                </p>
              )}
            </div>
          </div>
          {canEditRejected ? (
            <button
              onClick={() => router.push(`/accounts/expense-requests/${request.id}/edit`)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
            >
              <Send className="h-4 w-4" />
              Edit &amp; Resubmit
            </button>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Only {request.requesterName || 'the original requester'} can edit and resubmit this request.
            </p>
          )}
        </div>
      )}

      {/* Pending-with-no-approvals banner — the requester can still edit.
          Sits above the approver-info banner because the edit window is the
          more actionable next step for the requester. */}
      {canEditPendingNoApprovals && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">You can still edit this request</p>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                No approver has acted on it yet. Once someone approves or rejects, the edit window closes.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/accounts/expense-requests/${request.id}/edit`)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
          >
            <FileText className="h-4 w-4" />
            Edit Request
          </button>
        </div>
      )}

      {/* Super Admin override banner — editable even while approved / in-flight */}
      {isSuperAdmin && (request.status === 'approved' || (request.status === 'pending' && request.approvalsStarted)) && (
        <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">Super Admin — Force Edit</p>
              <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                You can edit this request without restarting the approval flow. Use with care.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/accounts/expense-requests/${request.id}/edit`)}
            className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm font-medium"
          >
            <FileText className="h-4 w-4" />
            Edit Request
          </button>
        </div>
      )}

      {/* Approver info banner — shows who should approve, even to non-approvers */}
      {isPending && approverNames.length > 0 && !isDesignatedApprover && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <span className="font-medium">Awaiting: {currentStep?.name}</span>
              {' — Assigned to: '}
              <span className="font-semibold">{approverNames.join(', ')}</span>
            </p>
          </div>
        </div>
      )}

      {/* Accountant GL Coding — always visible when request is at accountant step, regardless of approver */}
      {isPending && isAccountantStep && (request.lines ?? []).length > 0 && (() => {
        const fmt = (n: number) => '₦' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const lines = request.lines ?? [];
        const grossTotal = lines.reduce((sum, l) => sum + Number(l.amount ?? 0), 0);
        const lineBreakdown = lines.map(line => {
          const whtEntry = lineWht[line.id] ?? { whtId: null, applicable: false };
          const amount = Number(line.amount ?? 0);
          let whtRate = 0;
          let whtAmount = 0;
          if (whtEntry.applicable && whtEntry.whtId) {
            const rateObj = whtRates.find(w => w.id === whtEntry.whtId);
            whtRate = rateObj?.rate ?? 0;
            whtAmount = (amount * whtRate) / 100;
          }
          return { ...line, whtApplied: whtEntry.applicable, whtRate, whtAmount, netAmount: amount - whtAmount };
        });
        const totalWht = lineBreakdown.reduce((sum, l) => sum + l.whtAmount, 0);
        const netPayable = grossTotal - totalWht;

        return (
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">GL Coding &amp; WHT Application</p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Description</th>
                    <th className="text-right px-3 py-2 font-medium">Amount</th>
                    <th className="text-left px-3 py-2 font-medium">GL Account</th>
                    <th className="text-center px-3 py-2 font-medium">WHT</th>
                    <th className="text-right px-3 py-2 font-medium">WHT Amt</th>
                    <th className="text-right px-3 py-2 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lineBreakdown.map(line => {
                    const whtEntry = lineWht[line.id] ?? { whtId: null, applicable: false };
                    return (
                      <tr key={line.id}>
                        <td className="px-3 py-2 max-w-[180px] truncate">{line.description}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(Number(line.amount ?? 0))}</td>
                        <td className="px-3 py-2">
                          <GLAccountSelect
                            value={lineAccounts[line.id] ?? null}
                            onChange={(id) => setLineAccounts(prev => ({ ...prev, [line.id]: id }))}
                            accounts={glAccounts}
                          />
                          {lineAccounts[line.id] && (() => {
                            const acct = glAccounts.find(a => a.id === lineAccounts[line.id]);
                            return acct ? <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{acct.name}</p> : null;
                          })()}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={whtEntry.applicable}
                              onChange={e => setLineWht(prev => ({
                                ...prev,
                                [line.id]: { ...prev[line.id], applicable: e.target.checked, whtId: e.target.checked ? prev[line.id]?.whtId ?? null : null },
                              }))}
                              className="rounded border-gray-300"
                            />
                            {whtEntry.applicable && (
                              <select
                                value={whtEntry.whtId ?? ''}
                                onChange={e => setLineWht(prev => ({
                                  ...prev,
                                  [line.id]: { ...prev[line.id], whtId: Number(e.target.value) || null },
                                }))}
                                className="w-28 rounded border px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="">— Rate —</option>
                                {whtRates.map(w => (
                                  <option key={w.id} value={w.id}>{w.name} ({w.rate}%)</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-orange-600">
                          {line.whtAmount > 0 ? fmt(line.whtAmount) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                          {fmt(line.netAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gross Total</span>
                <span className="font-medium tabular-nums">{fmt(grossTotal)}</span>
              </div>
              {totalWht > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-orange-600">Less: Withholding Tax (WHT)</span>
                  <span className="font-medium tabular-nums text-orange-600">({fmt(totalWht)})</span>
                </div>
              )}
              <div className="border-t pt-2 flex items-center justify-between text-sm">
                <span className="font-semibold">Net Payable</span>
                <span className="font-bold tabular-nums text-green-700 dark:text-green-400 text-base">{fmt(netPayable)}</span>
              </div>
            </div>
            {/* Rejection reason — shown in accountant step so they can record reason before clicking Reject */}
            <div>
              <label className="block text-xs font-medium mb-1">Reason for Rejection (required if rejecting)</label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                rows={2}
                placeholder="State reason for rejection..."
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            {/* Action buttons — Save coding (anyone) + Approve (backend validates authority) */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  setActionLoading(true);
                  setActionError(null);
                  try {
                    const codingLines = (request.lines ?? []).map(line => {
                      const whtEntry = lineWht[line.id] ?? { whtId: null, applicable: false };
                      return { lineId: line.id, accountId: lineAccounts[line.id] || undefined, whtId: whtEntry.applicable ? whtEntry.whtId : null, whtApplicable: whtEntry.applicable };
                    });
                    await expenseRequestsApi.saveLineCoding(request.id, codingLines);
                    onRefresh?.();
                    setSuccessMsg('GL coding saved successfully');
                  } catch (e: unknown) {
                    setActionError(extractErrorMessage(e, 'Failed to save GL coding'));
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-xl border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {actionLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /> : <Check className="h-4 w-4" />}
                Save GL Coding
              </button>
              <button
                onClick={async () => {
                  setActionLoading(true);
                  setActionError(null);
                  try {
                    // Save coding first, then approve (advances to next step)
                    const codingLines = (request.lines ?? []).map(line => {
                      const whtEntry = lineWht[line.id] ?? { whtId: null, applicable: false };
                      return { lineId: line.id, accountId: lineAccounts[line.id] || undefined, whtId: whtEntry.applicable ? whtEntry.whtId : null, whtApplicable: whtEntry.applicable };
                    });
                    await expenseRequestsApi.saveLineCoding(request.id, codingLines);
                    await expenseRequestsApi.approve(request.id, { comments: comment || undefined });
                    setComment('');
                    await loadApprovalStatus();
                    onRefresh?.();
                    setSuccessMsg('Accountant coding approved — advanced to next step!');
                  } catch (e: unknown) {
                    setActionError(extractErrorMessage(e, 'Failed to approve'));
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {actionLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <CheckCircle className="h-4 w-4" />}
                Save &amp; Approve
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
            {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
          </div>
        );
      })()}

      {/* Read-only GL coding summary — shown at steps AFTER accountant when lines have been coded */}
      {isPending && !isAccountantStep && (request.lines ?? []).some(l => l.accountCode) && (() => {
        const fmt = (n: number) => '₦' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const lines = request.lines ?? [];
        const hasWht = lines.some(l => l.whtApplicable);
        return (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">GL Coding (by Accountant)</p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-left px-3 py-2">GL Account</th>
                    {hasWht && <th className="text-right px-3 py-2">WHT</th>}
                    {hasWht && <th className="text-right px-3 py-2">Net</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map(line => (
                    <tr key={line.id}>
                      <td className="px-3 py-2">{line.description}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(Number(line.amount ?? 0))}</td>
                      <td className="px-3 py-2">
                        {line.accountCode ? (
                          <span><span className="font-mono">{line.accountCode}</span> — {line.accountName}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      {hasWht && <td className="px-3 py-2 text-right tabular-nums text-orange-600">{line.whtApplicable ? fmt(Number(line.whtAmount ?? 0)) : '—'}</td>}
                      {hasWht && <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(Number(line.netAmount ?? line.amount ?? 0))}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold border-t pt-2">
              <span>Net Payable</span>
              <span className="tabular-nums text-green-700 dark:text-green-400">{fmt(Number(request.netAmount ?? request.totalAmount ?? 0))}</span>
            </div>
          </div>
        );
      })()}

      {/* Payment Processing — always visible when request is at payment step */}
      {isPending && isCashierStep && (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Processing</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Bank Account (Source) *</label>
              <EntityCombobox
                value={bankId}
                onChange={(id) => setBankId(id)}
                items={banks.filter(b => (b.currencyCode as string || 'NGN') === 'NGN')}
                labelKey="bankName"
                subtitleKey="accountNumber"
                searchKeys={['bankName', 'accountNumber', 'name']}
                placeholder="— Select NGN bank account —"
                required
              />
            </div>

            {/* Generate Transfer Request PDF */}
            {bankId && (
              <button
                onClick={async () => {
                  try {
                    setActionLoading(true);
                    const blob = await expenseRequestsApi.generateTransferRequest(request.id, bankId);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Transfer-Request-${request.requestNumber}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (e: unknown) {
                    setActionError(extractErrorMessage(e, 'Failed to generate transfer request'));
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-xl border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                <FileDown className="h-4 w-4" />
                Generate Transfer Request PDF
              </button>
            )}

            <div>
              <label className="block text-xs font-medium mb-1">Payment Date *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Payment Reference</label>
              <input
                type="text"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="Cheque no / transfer ref..."
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Payment Notes</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Rejection reason — shown in payment step so cashier can record reason before clicking Reject */}
          <div>
            <label className="block text-xs font-medium mb-1">Reason for Rejection (required if rejecting)</label>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={2}
              placeholder="State reason for rejection..."
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          {/* Process Payment + Reject buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                setActionLoading(true);
                setActionError(null);
                try {
                  if (!bankId) { setActionError('Please select a bank account'); setActionLoading(false); return; }
                  if (!paymentDate) { setActionError('Please select a payment date'); setActionLoading(false); return; }
                  await expenseRequestsApi.processPayment(request.id, {
                    bankAccountId: bankId,
                    paymentDate,
                    paymentReference: paymentRef || undefined,
                    notes: paymentNotes || undefined,
                  });
                  await loadApprovalStatus();
                  onRefresh?.();
                  setSuccessMsg('Payment processed successfully!');
                } catch (e: unknown) {
                  setActionError(extractErrorMessage(e, 'Failed to process payment'));
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {actionLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Wallet className="h-4 w-4" />}
              Process Payment
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
          </div>
          {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
        </div>
      )}

      {/* Supporting Documents — visible to all viewers including approvers */}
      {request.attachments && request.attachments.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Paperclip className="h-3.5 w-3.5" /> Supporting Documents
          </p>
          <ul className="space-y-2">
            {request.attachments.map((att) => {
              const sizeKb = att.size ? Math.round(att.size / 1024) : null;
              const isPdf = att.mimeType?.includes('pdf');
              const isImage = att.mimeType?.startsWith('image/');
              return (
                <li key={att.id} className="flex items-center gap-3">
                  <FileText className={`h-4 w-4 flex-shrink-0 ${isPdf ? 'text-red-500' : isImage ? 'text-blue-500' : 'text-muted-foreground'}`} />
                  <div className="min-w-0 flex-1">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline truncate block"
                    >
                      {att.originalName}
                    </a>
                    {sizeKb && <p className="text-xs text-muted-foreground">{sizeKb} KB</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Reprint documents — visible after payment is processed */}
      {request.status === 'paid' && request.bankAccountId && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reprint Documents</p>
          <button
            onClick={async () => {
              try {
                setActionLoading(true);
                setActionError(null);
                const blob = await expenseRequestsApi.generateTransferRequest(request.id, request.bankAccountId!);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Transfer-Request-${request.requestNumber}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e: unknown) {
                // Response is a Blob (responseType: 'blob'), so server error JSON
                // arrives as a Blob and extractErrorMessage can't read it. Read it manually.
                const axiosErr = e as { response?: { data?: unknown } };
                const data = axiosErr?.response?.data;
                if (data instanceof Blob) {
                  try {
                    const text = await data.text();
                    const parsed = JSON.parse(text) as { message?: string };
                    setActionError(parsed.message || 'Failed to reprint transfer request');
                  } catch {
                    setActionError('Failed to reprint transfer request');
                  }
                } else {
                  setActionError(extractErrorMessage(e, 'Failed to reprint transfer request'));
                }
              } finally {
                setActionLoading(false);
              }
            }}
            disabled={actionLoading}
            className="flex items-center gap-2 rounded-xl border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <FileDown className="h-4 w-4" />
            Reprint Transfer Request
          </button>
          {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}
        </div>
      )}

      {/* Action panel — for draft submit and generic approve steps (not accountant or cashier) */}
      {((isDraft && (isRequester || isSuperAdmin)) || (isPending && isDesignatedApprover && !isAccountantStep && !isCashierStep)) && (
        <div className="rounded-xl border bg-card p-4 space-y-4">
          {/* Approver confirmation banner */}
          {isPending && isDesignatedApprover && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2">
              <User className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <span className="font-medium">Your action is required</span> — {currentStep?.name}
              </p>
            </div>
          )}
          <p className="text-sm font-medium">
            {isDraft ? 'Submit for Approval' : 'Take Action'}
          </p>

          {isDraft ? (
            <button
              onClick={async () => {
                setActionLoading(true);
                try {
                  await expenseRequestsApi.submit(request.id);
                  await loadApprovalStatus();
                  onRefresh?.();
                } catch(e: unknown) {
                  setActionError(extractErrorMessage(e, 'Failed to submit'));
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {actionLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check className="h-4 w-4" />}
              Submit for Approval
            </button>
          ) : (
            <>
              {/* Note / rejection reason */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Note (optional)</label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={2}
                    placeholder="Add a note..."
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Reason for Rejection (if rejecting)</label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    rows={2}
                    placeholder="State reason for rejection..."
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
              </div>

              {/* Signature upload (optional for all steps) */}
              <div>
                <label className="block text-xs font-medium mb-1">Signature (optional)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSignatureFile(e.target.files?.[0] ?? null)}
                    className="text-sm file:mr-3 file:rounded-lg file:border file:border-gray-200 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted/80"
                  />
                  {signatureFile && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> {signatureFile.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Check className="h-4 w-4" />}
                  {isCashierStep ? 'Process Payment' : isAccountantStep ? 'Process & Advance' : 'Approve'}
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            </>
          )}

          {actionError && (
            <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
          )}
        </div>
      )}

      {/* Super Admin: Reset to Step 1 — only show when flow has advanced past step 1 */}
      {isSuperAdmin && isPending && configSteps.some(s => (s['status'] as string)?.toUpperCase() === 'APPROVED') && (
        <div className="rounded-xl border border-dashed border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/10 p-4 space-y-3">
          <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Super Admin Actions</p>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                setResetLoading(true);
                setResetError(null);
                try {
                  await expenseRequestsApi.resetApproval(request.id);
                  await loadApprovalStatus();
                  onRefresh?.();
                } catch (e: unknown) {
                  setResetError(extractErrorMessage(e, 'Failed to reset approval'));
                } finally {
                  setResetLoading(false);
                }
              }}
              disabled={resetLoading}
              className="flex items-center gap-2 rounded-xl border border-orange-400 text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30 px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {resetLoading
                ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
                : <RotateCcw className="h-4 w-4" />}
              Reset to Step 1
            </button>
            <p className="text-xs text-orange-600 dark:text-orange-400">Resets the approval flow back to the first step.</p>
          </div>
          {resetError && (
            <p className="text-sm text-red-600 dark:text-red-400">{resetError}</p>
          )}
        </div>
      )}

      {/* Payment details — when paid */}
      {request.status === 'paid' && (
        <div className="rounded-xl border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium text-sm">
              <Wallet className="h-4 w-4" /> Payment Completed
            </div>
            <button
              onClick={async () => {
                try {
                  setActionLoading(true);
                  const blob = await expenseRequestsApi.getPaymentVoucher(request.id);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Payment-Voucher-${request.paymentVoucherNumber || request.requestNumber}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e: unknown) {
                  setActionError(extractErrorMessage(e, 'Failed to generate payment voucher'));
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50 transition-colors"
            >
              <FileDown className="h-3.5 w-3.5" />
              Print Payment Voucher
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {request.paymentVoucherNumber && <div><span className="text-muted-foreground">Voucher #:</span> <span className="font-mono font-medium">{request.paymentVoucherNumber}</span></div>}
            {request.paymentDate && <div><span className="text-muted-foreground">Date:</span> {formatDate(request.paymentDate)}</div>}
            {request.paymentReference && <div><span className="text-muted-foreground">Reference:</span> {request.paymentReference}</div>}
            {(request.bankName || request.bankAccountNumber) && (
              <div className="col-span-2"><span className="text-muted-foreground">Bank Paid From:</span> {request.bankName}{request.bankAccountNumber ? ` — ${request.bankAccountNumber}` : ''}</div>
            )}
            {(request.expenseAccountName || request.expenseAccountCode) && (
              <div className="col-span-2"><span className="text-muted-foreground">Expense Account:</span> {request.expenseAccountCode ? `${request.expenseAccountCode} · ` : ''}{request.expenseAccountName}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DETAIL CONFIG
// ============================================================================

const expenseRequestDetailConfig: EntityDetailConfig<ExpenseRequest> = {
  entityType: 'expense-requests',
  basePath: '/accounts/expense-requests',
  icon: FileText,
  title: (r) => r.requestNumber,
  subtitle: (r) => r.subject || r.description,
  sidebar: {
    title: (r) => r.requestNumber,
    subtitle: (r) => '₦' + Number((r.totalAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    searchKeys: ['title', 'subtitle'],
    badges: (r) => [{
      label: STATUS_MAP[r.status]?.label || r.status,
      className: STATUS_MAP[r.status]?.cls || '',
    }],
    statusIcon: (r) => {
      if (r.status === 'paid') return <Wallet className="h-3.5 w-3.5 text-green-500" />;
      if (r.status === 'rejected' || r.status === 'cancelled') return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      if (r.status === 'draft') return <FileText className="h-3.5 w-3.5 text-gray-400" />;
      return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
    },
  },
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      sections: [
        {
          title: 'Request Information',
          fields: [
            { label: 'Request Number', value: (r) => r.requestNumber, mono: true },
            { label: 'Request Date', value: (r) => <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{formatDate(r.requestDate)}</span> },
            { label: 'Requester', value: (r) => r.requesterName || `Employee #${r.requesterId}` },
            {
              label: 'Status',
              value: (r) => {
                const s = STATUS_MAP[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-600' };
                return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
              },
            },
            { label: 'Total Amount', value: (r) => <span className="text-lg font-semibold">₦{Number((r.totalAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
            { label: 'Net Payable', value: (r) => <span className="font-medium text-green-600">₦{Number((r.netAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>, hidden: (r) => !r.whtAmount },
            { label: 'WHT Amount', value: (r) => <span className="text-orange-600">₦{Number((r.whtAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>, hidden: (r) => !r.whtAmount },
            { label: 'Description', value: (r) => r.description, span: 2 },
            { label: 'Notes', value: (r) => r.notes, span: 2, hidden: (r) => !r.notes },
            { label: 'Rejection Reason', value: (r) => <span className="text-red-600">{r.rejectionReason}</span>, span: 2, hidden: (r) => !r.rejectionReason },
          ],
        },
        {
          title: 'Memo',
          hidden: (r) => !r.memoFrom && !r.memoTo && !r.subject && !r.background,
          fields: [
            { label: 'FROM', value: (r) => r.memoFrom, hidden: (r) => !r.memoFrom },
            { label: 'TO', value: (r) => r.memoTo, hidden: (r) => !r.memoTo },
            { label: 'SUBJECT', value: (r) => r.subject, span: 2, hidden: (r) => !r.subject },
            { label: 'Background', value: (r) => r.background, span: 2, hidden: (r) => !r.background },
            { label: 'Justification', value: (r) => r.justification, span: 2, hidden: (r) => !r.justification },
            { label: 'Prayer', value: (r) => r.prayer, span: 2, hidden: (r) => !r.prayer },
          ],
        },
        {
          title: 'Beneficiary',
          hidden: (r) => !r.beneficiaryName && !r.beneficiaryAccountNumber,
          fields: [
            { label: 'Beneficiary Name', value: (r) => r.beneficiaryName, hidden: (r) => !r.beneficiaryName },
            { label: 'Bank', value: (r) => r.beneficiaryBankName, hidden: (r) => !r.beneficiaryBankName },
            { label: 'Account Number', value: (r) => r.beneficiaryAccountNumber, mono: true, hidden: (r) => !r.beneficiaryAccountNumber },
          ],
        },
        {
          title: 'Payment Details',
          hidden: (r) => !r.paymentVoucherNumber && !r.paidAt,
          fields: [
            { label: 'Voucher Number', value: (r) => r.paymentVoucherNumber, mono: true, hidden: (r) => !r.paymentVoucherNumber },
            { label: 'Payment Date', value: (r) => formatDate(r.paymentDate), hidden: (r) => !r.paymentDate },
            { label: 'Payment Reference', value: (r) => r.paymentReference, hidden: (r) => !r.paymentReference },
            { label: 'Paid On', value: (r) => formatDate(r.paidAt), hidden: (r) => !r.paidAt },
          ],
        },
      ],
    },
    {
      id: 'lines',
      label: 'Line Items',
      icon: List,
      badge: (r) => r.lines?.length || undefined,
      render: (r) => <LineItemsTab request={r} />,
    } as TabDef<ExpenseRequest>,
    metadataTab<ExpenseRequest>(),
  ],
};

// ============================================================================
// VIEWER COMPONENT
// ============================================================================

interface ExpenseRequestDetailViewerProps {
  expenseRequest: ExpenseRequest;
  expenseRequests: ExpenseRequest[];
  onClose: () => void;
  onRequestSelect: (request: ExpenseRequest) => void;
  onDelete: (request: ExpenseRequest) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export function ExpenseRequestDetailViewer({
  expenseRequest,
  expenseRequests,
  onClose,
  onRequestSelect,
  onDelete,
  onRefresh,
  loading,
}: ExpenseRequestDetailViewerProps) {
  const configWithApproval: EntityDetailConfig<ExpenseRequest> = {
    ...expenseRequestDetailConfig,
    tabs: [
      ...expenseRequestDetailConfig.tabs.slice(0, -1), // all tabs except metadata
      {
        id: 'approval',
        label: 'Approvals',
        icon: CheckCircle,
        badge: (r) => {
          return r.status === 'pending' ? '!' : undefined;
        },
        render: (r) => <ApprovalTimelineTab request={r} onRefresh={onRefresh} />,
      } as TabDef<ExpenseRequest>,
      expenseRequestDetailConfig.tabs[expenseRequestDetailConfig.tabs.length - 1],
    ],
  };

  return (
    <EntityDetailViewer
      config={configWithApproval}
      entity={expenseRequest}
      entities={expenseRequests}
      onClose={onClose}
      onEntitySelect={onRequestSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
