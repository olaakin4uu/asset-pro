'use client';

import React from 'react';
import {
  Scale,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  Landmark,
} from 'lucide-react';
import {
  EntityDetailViewer,
  metadataTab,
} from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { BankReconciliation } from '@/lib/api/accounts';
import {cn, formatCurrency} from '@/lib/utils';
import { useCurrencyFormat } from '@/hooks';

// ============================================================================
// HELPERS
// ============================================================================



function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  draft: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  draft: 'Draft',
};

// ============================================================================
// CUSTOM RENDER: BALANCE SUMMARY PANEL
// ============================================================================

function ReconciliationSummaryPanel({ entity }: { entity: BankReconciliation }) {
  const difference = entity.difference ?? ((entity.statementBalance || 0) - (entity.bookBalance || 0));
  const isBalanced = Math.abs(difference) < 0.01;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Statement Balance</p>
          <p className="text-xl font-bold">{formatCurrency(entity.statementBalance)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <DollarSign className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Book Balance</p>
          <p className="text-lg font-semibold">{formatCurrency(entity.bookBalance)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          isBalanced ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
        )}>
          {isBalanced ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Difference</p>
          <p className={cn(
            'text-lg font-semibold',
            isBalanced ? 'text-green-600' : 'text-red-600'
          )}>
            {formatCurrency(difference)}
          </p>
        </div>
      </div>
      {entity.itemCount !== undefined && (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Reconciliation Items</p>
            <p className="font-medium">{entity.itemCount}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONFIG
// ============================================================================

export const bankReconciliationDetailConfig: EntityDetailConfig<BankReconciliation> = {
  entityType: 'bank-reconciliation',
  basePath: '/accounts/bank-reconciliation',
  icon: Scale,
  title: (r) => r.bankName ? `${r.bankName} Reconciliation` : `Reconciliation #${r.id}`,
  subtitle: (r) => formatDate(r.reconciliationDate),
  sidebar: {
    title: (r) => r.bankName || `Reconciliation #${r.id}`,
    subtitle: (r) => formatDate(r.reconciliationDate),
    searchKeys: ['title', 'subtitle'],
    badges: (r) => [
      {
        label: STATUS_LABELS[r.status] || r.status,
        className: STATUS_STYLES[r.status] || STATUS_STYLES.draft,
      },
    ],
    statusIcon: (r) =>
      r.status === 'completed' ? (
        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
      ) : r.status === 'in_progress' ? (
        <Clock className="h-3.5 w-3.5 text-blue-500" />
      ) : (
        <FileText className="h-3.5 w-3.5 text-gray-400" />
      ),
  },
  toolbar: {
    showEdit: true,
    showDelete: true,
    showExport: false,
    showShare: false,
    showPrint: false,
    showBookmark: false,
    showFavorite: false,
  },
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      sections: [
        {
          title: 'Reconciliation Details',
          span: 'main',
          fields: [
            {
              label: 'Bank',
              value: (r) => (
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                  {r.bankName || `Bank #${r.bankId}`}
                  {r.bankCode && (
                    <span className="text-xs text-muted-foreground font-mono">({r.bankCode})</span>
                  )}
                </span>
              ),
            },
            {
              label: 'Status',
              value: (r) => (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize',
                    STATUS_STYLES[r.status] || STATUS_STYLES.draft
                  )}
                >
                  {r.status === 'completed' && <CheckCircle className="h-3.5 w-3.5" />}
                  {r.status === 'in_progress' && <Clock className="h-3.5 w-3.5" />}
                  {r.status === 'draft' && <FileText className="h-3.5 w-3.5" />}
                  {STATUS_LABELS[r.status] || r.status}
                </span>
              ),
            },
            { label: 'Reconciliation Date', value: (r) => formatDate(r.reconciliationDate) },
            { label: 'Statement Date', value: (r) => formatDate(r.statementDate) },
            { label: 'Statement Balance', value: (r) => formatCurrency(r.statementBalance), mono: true },
            { label: 'Book Balance', value: (r) => formatCurrency(r.bookBalance), mono: true },
            {
              label: 'Reconciled Balance',
              value: (r) => r.reconciledBalance != null ? formatCurrency(r.reconciledBalance) : '\u2014',
              mono: true,
              hidden: (r) => r.reconciledBalance == null,
            },
            {
              label: 'Difference',
              value: (r) => {
                const diff = r.difference ?? ((r.statementBalance || 0) - (r.bookBalance || 0));
                const isBalanced = Math.abs(diff) < 0.01;
                return (
                  <span className={cn('font-semibold', isBalanced ? 'text-green-600' : 'text-red-600')}>
                    {formatCurrency(diff)}
                  </span>
                );
              },
              mono: true,
            },
            {
              label: 'Notes',
              value: (r) => <span className="text-sm whitespace-pre-wrap">{r.notes}</span>,
              span: 2,
              hidden: (r) => !r.notes,
            },
          ],
        },
        {
          title: 'Summary',
          span: 'aside',
          render: (r) => <ReconciliationSummaryPanel entity={r} />,
        },
      ],
    },
    {
      id: 'completion',
      label: 'Completion',
      icon: CheckCircle,
      hidden: (r) => r.status !== 'completed',
      sections: [
        {
          title: 'Completion Details',
          fields: [
            { label: 'Completed At', value: (r) => formatDate(r.completedAt) },
            {
              label: 'Completed By',
              value: (r) => r.completedBy ? `User #${r.completedBy}` : '\u2014',
            },
            {
              label: 'Reconciled Balance',
              value: (r) => r.reconciledBalance != null ? formatCurrency(r.reconciledBalance) : '\u2014',
              mono: true,
            },
            {
              label: 'Final Difference',
              value: (r) => {
                const diff = r.difference ?? 0;
                const isBalanced = Math.abs(diff) < 0.01;
                return (
                  <span className={cn('font-semibold', isBalanced ? 'text-green-600' : 'text-red-600')}>
                    {formatCurrency(diff)}
                  </span>
                );
              },
              mono: true,
            },
          ],
        },
      ],
    },
    metadataTab<BankReconciliation>(),
  ],
};

// ============================================================================
// COMPONENT (thin wrapper)
// ============================================================================

interface BankReconciliationDetailViewerProps {
  reconciliation: BankReconciliation;
  reconciliations: BankReconciliation[];
  onClose: () => void;
  onReconciliationSelect: (reconciliation: BankReconciliation) => void;
  onDelete: (reconciliation: BankReconciliation) => void;
  loading?: boolean;
}

export function BankReconciliationDetailViewer({
  reconciliation,
  reconciliations,
  onClose,
  onReconciliationSelect,
  onDelete,
  loading,
}: BankReconciliationDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={bankReconciliationDetailConfig}
      entity={reconciliation}
      entities={reconciliations}
      onClose={onClose}
      onEntitySelect={onReconciliationSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
