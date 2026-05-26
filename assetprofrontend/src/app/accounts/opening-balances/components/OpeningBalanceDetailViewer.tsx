'use client';

import React from 'react';
import {
  Calculator,
  FileText,
  Banknote,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  EntityDetailViewer,
  metadataTab,
} from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { OpeningBalance } from '@/lib/api/accounts';
import {cn, formatCurrency} from '@/lib/utils';

// ============================================================================
// HELPERS
// ============================================================================



const ACCOUNT_TYPE_STYLES: Record<string, string> = {
  asset: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  liability: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  equity: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  revenue: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  expense: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
};

const BALANCE_TYPE_STYLES: Record<string, string> = {
  debit: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  credit: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
};

// ============================================================================
// CUSTOM RENDER: BALANCE SUMMARY PANEL
// ============================================================================

function BalanceSummaryPanel({ balance }: { balance: OpeningBalance }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Banknote className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Balance Amount</p>
          <p className="text-xl font-bold">{formatCurrency(balance.balance)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <Calendar className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Fiscal Period</p>
          <p className="font-medium">
            Year {balance.year}, {balance.period === 0 ? 'Opening' : `Period ${balance.period}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          {balance.balanceType === 'debit' ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          )}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Balance Type</p>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
              BALANCE_TYPE_STYLES[balance.balanceType] || 'bg-gray-100 text-gray-700'
            )}
          >
            {balance.balanceType}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIG
// ============================================================================

export const openingBalanceDetailConfig: EntityDetailConfig<OpeningBalance> = {
  entityType: 'opening-balances',
  basePath: '/accounts/opening-balances',
  icon: Calculator,
  title: (b) => `${b.accountCode || 'Account'} - ${b.accountName || 'Unknown'}`,
  subtitle: (b) => `Year ${b.year}, ${b.period === 0 ? 'Opening' : `Period ${b.period}`}`,
  sidebar: {
    title: (b) => `${b.accountCode || ''} - ${b.accountName || ''}`,
    subtitle: (b) => `${b.balanceType === 'debit' ? 'Dr' : 'Cr'} ${formatCurrency(b.balance)}`,
    searchKeys: ['title', 'subtitle'],
    badges: (b) => [
      {
        label: b.accountType || 'unknown',
        className: ACCOUNT_TYPE_STYLES[b.accountType || ''] || 'bg-gray-100 text-gray-700',
      },
      {
        label: b.balanceType,
        className: BALANCE_TYPE_STYLES[b.balanceType] || 'bg-gray-100 text-gray-700',
      },
    ],
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
          title: 'Account Information',
          span: 'main',
          fields: [
            { label: 'Account Code', value: (b) => b.accountCode || '—', mono: true },
            { label: 'Account Name', value: (b) => b.accountName || '—' },
            {
              label: 'Account Type',
              value: (b) => (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize',
                    ACCOUNT_TYPE_STYLES[b.accountType || ''] || 'bg-gray-100 text-gray-700'
                  )}
                >
                  {b.accountType || 'Unknown'}
                </span>
              ),
            },
            {
              label: 'Balance Type',
              value: (b) => (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize',
                    BALANCE_TYPE_STYLES[b.balanceType] || 'bg-gray-100 text-gray-700'
                  )}
                >
                  {b.balanceType}
                </span>
              ),
            },
            { label: 'Balance Amount', value: (b) => formatCurrency(b.balance), mono: true },
            { label: 'Fiscal Year', value: (b) => b.year.toString() },
            {
              label: 'Period',
              value: (b) => b.period === 0 ? 'Opening' : `Period ${b.period}`,
            },
          ],
        },
        {
          title: 'Summary',
          span: 'aside',
          render: (b) => <BalanceSummaryPanel balance={b} />,
        },
      ],
    },
    metadataTab<OpeningBalance>(),
  ],
};

// ============================================================================
// COMPONENT (thin wrapper)
// ============================================================================

interface OpeningBalanceDetailViewerProps {
  balance: OpeningBalance;
  balances: OpeningBalance[];
  onClose: () => void;
  onBalanceSelect: (balance: OpeningBalance) => void;
  onDelete: (balance: OpeningBalance) => void;
  loading?: boolean;
}

export function OpeningBalanceDetailViewer({
  balance,
  balances,
  onClose,
  onBalanceSelect,
  onDelete,
  loading,
}: OpeningBalanceDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={openingBalanceDetailConfig}
      entity={balance}
      entities={balances}
      onClose={onClose}
      onEntitySelect={onBalanceSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
