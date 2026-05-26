'use client';

import React from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  FileText,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  DollarSign,
  Hash,
  Calendar,
} from 'lucide-react';
import {
  EntityDetailViewer,
  metadataTab,
  ApprovalPanel,
  COMMON_ACTIONS,
} from '@/components/erp';
import type { EntityDetailConfig, TabDef, ApprovalPanelConfig } from '@/components/erp';
import type { BankTransfer, BankTransferItem } from '@/lib/api/accounts';
import { banksApi } from '@/lib/api/accounts';
import {cn, formatCurrency} from '@/lib/utils';
import { useCurrencyFormat } from '@/hooks';

// ============================================================================
// STATUS STYLES
// ============================================================================

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  approved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  posted: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  draft: FileText,
  pending: Clock,
  approved: CheckCircle,
  posted: Send,
  completed: CheckCircle,
  cancelled: XCircle,
};

// ============================================================================
// FORMAT HELPERS
// ============================================================================



function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// CUSTOM RENDER: TRANSFER FLOW DIAGRAM
// ============================================================================

function TransferFlowDiagram({ transfer }: { transfer: BankTransfer }) {
  return (
    <div className="flex items-center justify-center gap-6 py-6 bg-muted/30 rounded-lg">
      <div className="text-center flex-1">
        <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <Building2 className="h-7 w-7 text-red-600 dark:text-red-400" />
        </div>
        <div className="text-xs text-muted-foreground">From</div>
        <div className="font-semibold text-sm">
          {transfer.fromBankName || `Bank #${transfer.fromBankId}`}
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          {formatCurrency(transfer.amount)}
        </div>
        <ArrowRight className="h-6 w-6 text-primary mt-1" />
      </div>

      <div className="text-center flex-1">
        <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Building2 className="h-7 w-7 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-xs text-muted-foreground">To</div>
        <div className="font-semibold text-sm">
          {transfer.toBankName || `Bank #${transfer.toBankId}`}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CUSTOM RENDER: TRANSFER SUMMARY ASIDE
// ============================================================================

function TransferSummary({ transfer }: { transfer: BankTransfer }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Amount</p>
          <p className="text-lg font-bold font-mono">{formatCurrency(transfer.amount)}</p>
        </div>
      </div>
      {transfer.totalAmount !== transfer.amount && (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(transfer.totalAmount)}</p>
          </div>
        </div>
      )}
      {transfer.exchangeRate && transfer.exchangeRate !== 1 && (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <ArrowLeftRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Exchange Rate</p>
            <p className="font-bold">{transfer.exchangeRate}</p>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <Hash className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Line Items</p>
          <p className="font-bold">{transfer.items?.length || 0}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CUSTOM RENDER: TRANSFER ITEMS TABLE
// ============================================================================

function TransferItemsTab({ transfer }: { transfer: BankTransfer }) {
  const items = transfer.items || [];

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <ArrowLeftRight className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">No Transfer Items</h3>
        <p className="text-sm text-muted-foreground mt-1">
          This transfer does not have detailed line items.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Transfer Items</h3>
        <span className="ml-auto text-sm text-muted-foreground">{items.length} items</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium">#</th>
              <th className="text-left px-6 py-3 text-sm font-medium">Type</th>
              <th className="text-left px-6 py-3 text-sm font-medium">Source Account</th>
              <th className="text-left px-6 py-3 text-sm font-medium">Destination Account</th>
              <th className="text-right px-6 py-3 text-sm font-medium">Amount</th>
              <th className="text-left px-6 py-3 text-sm font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item: BankTransferItem) => (
              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-3 text-sm text-muted-foreground">{item.lineNumber}</td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {item.transferType.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  {item.sourceAccountName || `Account #${item.sourceAccountId}`}
                </td>
                <td className="px-6 py-3 text-sm">
                  {item.destinationAccountName || `Account #${item.destinationAccountId}`}
                </td>
                <td className="px-6 py-3 text-right font-mono text-sm">
                  {formatCurrency(item.amount)}
                </td>
                <td className="px-6 py-3 text-sm text-muted-foreground">
                  {item.description || '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 bg-muted/30">
            <tr>
              <td colSpan={4} className="px-6 py-3 text-right font-semibold text-sm">
                Total
              </td>
              <td className="px-6 py-3 text-right font-mono font-semibold text-sm">
                {formatCurrency(items.reduce((sum, item) => sum + Number(item.amount), 0))}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIG
// ============================================================================

const bankTransferDetailConfig: EntityDetailConfig<BankTransfer> = {
  entityType: 'bank-transfers',
  basePath: '/accounts/bank-transfers',
  icon: ArrowLeftRight,
  title: (t) => t.transferNumber || t.reference || `Transfer #${t.id}`,
  subtitle: (t) => `${t.fromBankName || 'Source'} -> ${t.toBankName || 'Dest'} | ${formatCurrency(t.amount)}`,
  sidebar: {
    title: (t) => t.transferNumber || t.reference || `Transfer #${t.id}`,
    subtitle: (t) => formatDate(t.transferDate),
    searchKeys: ['title', 'subtitle'],
    badges: (t) => [
      {
        label: t.status,
        className: STATUS_STYLES[t.status] || STATUS_STYLES.draft,
      },
    ],
    statusIcon: (t) => {
      const Icon = STATUS_ICONS[t.status] || FileText;
      const colorMap: Record<string, string> = {
        draft: 'text-gray-400',
        pending: 'text-yellow-500',
        approved: 'text-blue-500',
        posted: 'text-green-500',
        completed: 'text-emerald-500',
        cancelled: 'text-red-500',
      };
      return <Icon className={cn('h-3.5 w-3.5', colorMap[t.status] || 'text-gray-400')} />;
    },
  },
  toolbar: {
    showExport: true,
    showPrint: true,
    showEdit: false, // Bank transfers are create-only
    showDelete: false,
  },
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      sections: [
        {
          title: 'Transfer Flow',
          span: 'full',
          render: (t) => <TransferFlowDiagram transfer={t} />,
        },
        {
          title: 'Transfer Information',
          span: 'main',
          fields: [
            {
              label: 'Transfer Number',
              value: (t) => t.transferNumber || '\u2014',
              mono: true,
            },
            { label: 'Transfer Date', value: (t) => formatDate(t.transferDate) },
            { label: 'Reference', value: (t) => t.reference || '\u2014' },
            {
              label: 'Status',
              value: (t) => {
                const Icon = STATUS_ICONS[t.status] || FileText;
                return (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize',
                      STATUS_STYLES[t.status] || STATUS_STYLES.draft
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.status}
                  </span>
                );
              },
            },
            {
              label: 'From Bank',
              value: (t) => t.fromBankName || `Bank #${t.fromBankId}`,
            },
            {
              label: 'To Bank',
              value: (t) => t.toBankName || `Bank #${t.toBankId}`,
            },
            {
              label: 'Description',
              value: (t) => (
                <span className="text-sm whitespace-pre-wrap">{t.description || '\u2014'}</span>
              ),
              span: 2,
              hidden: (t) => !t.description,
            },
            {
              label: 'Approved On',
              value: (t) => formatDateTime(t.approvedAt),
              hidden: (t) => !t.approvedAt,
            },
            {
              label: 'Approval Notes',
              value: (t) => t.approvalNotes || '\u2014',
              hidden: (t) => !t.approvalNotes,
            },
            {
              label: 'Posted On',
              value: (t) => formatDateTime(t.postedAt),
              hidden: (t) => !t.postedAt,
            },
            {
              label: 'Completed On',
              value: (t) => formatDateTime(t.completedAt),
              hidden: (t) => !t.completedAt,
            },
          ],
        },
        {
          title: 'Summary',
          span: 'aside',
          render: (t) => <TransferSummary transfer={t} />,
        },
      ],
    },
    {
      id: 'items',
      label: 'Items',
      icon: ArrowLeftRight,
      badge: (t) => t.items?.length || 0,
      hidden: (t) => !t.items || t.items.length === 0,
      render: (t) => <TransferItemsTab transfer={t} />,
    },
    metadataTab<BankTransfer>(),
  ],
};

// ============================================================================
// APPROVAL TAB
// ============================================================================

function BankTransferApprovalTab({ transfer, onRefresh, onClose }: { transfer: BankTransfer; onRefresh?: () => void; onClose?: () => void }) {
  const statusActions: Record<string, ReturnType<typeof COMMON_ACTIONS.submit>[]> = {
    draft: [COMMON_ACTIONS.submit('bank transfer')],
    pending: [COMMON_ACTIONS.approve('bank transfer'), COMMON_ACTIONS.reject('bank transfer')],
    // approved but not posted — allow approval actions if approval flow still has pending steps
    approved: [COMMON_ACTIONS.approve('bank transfer'), COMMON_ACTIONS.reject('bank transfer')],
  };

  const handleAction = async (actionId: string, comment?: string) => {
    const id = transfer.id;
    switch (actionId) {
      case 'submit':
        await banksApi.submitTransfer(id);
        break;
      case 'approve':
        await banksApi.approveTransfer(id, { notes: comment });
        break;
      case 'reject':
        await banksApi.rejectTransfer(id, { reason: comment || 'Rejected' });
        break;
    }
  };

  const approvalConfig: ApprovalPanelConfig = {
    status: transfer.status,
    entityLabel: 'Bank Transfer',
    entityType: 'bank_transfers',
    entityId: transfer.id,
    statusActions,
    onAction: handleAction,
    onActionComplete: () => {
      onRefresh?.();
      setTimeout(() => onClose?.(), 1500);
    },
    approvalDetails: {
      approvedAt: transfer.approvedAt,
      approvedBy: null,
    },
  };

  return <ApprovalPanel config={approvalConfig} />;
}

// ============================================================================
// COMPONENT (thin wrapper)
// ============================================================================

interface BankTransferDetailViewerProps {
  transfer: BankTransfer;
  transfers: BankTransfer[];
  onClose: () => void;
  onTransferSelect: (transfer: BankTransfer) => void;
  onDelete: (transfer: BankTransfer) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export function BankTransferDetailViewer({
  transfer,
  transfers,
  onClose,
  onTransferSelect,
  onDelete,
  onRefresh,
  loading,
}: BankTransferDetailViewerProps) {
  const configWithApproval: EntityDetailConfig<BankTransfer> = {
    ...bankTransferDetailConfig,
    tabs: [
      ...bankTransferDetailConfig.tabs.slice(0, -1), // all tabs except metadata
      {
        id: 'approval',
        label: 'Approval',
        icon: CheckCircle,
        render: (t) => <BankTransferApprovalTab transfer={t} onRefresh={onRefresh} onClose={onClose} />,
      } as TabDef<BankTransfer>,
      bankTransferDetailConfig.tabs[bankTransferDetailConfig.tabs.length - 1], // metadata tab last
    ],
  };

  return (
    <EntityDetailViewer
      config={configWithApproval}
      entity={transfer}
      entities={transfers}
      onClose={onClose}
      onEntitySelect={onTransferSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
