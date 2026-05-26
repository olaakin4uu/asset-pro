'use client';

import React from 'react';
import {
  Trash2,
  FileText,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  User,
} from 'lucide-react';
import {
  EntityDetailViewer,
  metadataTab,
  approvalSection,
} from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { AssetDisposal } from '@/types/assets';
import { getCurrencySymbol } from '@/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', pending_approval: 'Pending Approval', approved: 'Approved',
  completed: 'Completed', cancelled: 'Cancelled',
};

const DISPOSAL_TYPE_LABELS: Record<string, string> = {
  sale: 'Sale', scrap: 'Scrap', donation: 'Donation', trade_in: 'Trade In',
  theft: 'Theft', loss: 'Loss', write_off: 'Write Off', insurance_claim: 'Insurance Claim', other: 'Other',
};

function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '\u2014';
  const symbol = getCurrencySymbol('NGN');
  return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ============================================================================
// FINANCIAL IMPACT PANEL
// ============================================================================

function FinancialImpact({ disposal }: { disposal: AssetDisposal }) {
  const isGain = disposal.gainLoss >= 0;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Book Value at Disposal</p>
          <p className="text-lg font-bold font-mono">{formatCurrency(disposal.bookValueAtDisposal)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Disposal Proceeds</p>
          <p className="text-lg font-bold font-mono">{formatCurrency(disposal.disposalProceeds)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', isGain ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
          {isGain ? (
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{isGain ? 'Gain' : 'Loss'} on Disposal</p>
          <p className={cn('text-lg font-bold font-mono', isGain ? 'text-green-600' : 'text-red-600')}>
            {formatCurrency(Math.abs(disposal.gainLoss))}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIG
// ============================================================================

export const disposalDetailConfig: EntityDetailConfig<AssetDisposal> = {
  entityType: 'disposals',
  basePath: '/assets/disposals',
  icon: Trash2,
  title: (d) => d.assetName || d.disposalNumber,
  subtitle: (d) => d.disposalNumber,
  sidebar: {
    title: (d) => d.assetName || d.disposalNumber,
    subtitle: (d) => d.disposalNumber,
    searchKeys: ['title', 'subtitle'],
    badges: (d) => [
      {
        label: STATUS_LABELS[d.status] || d.status,
        className: STATUS_STYLES[d.status] || 'bg-gray-100 text-gray-700',
      },
      {
        label: DISPOSAL_TYPE_LABELS[d.disposalType] || d.disposalType,
        className: 'bg-indigo-100 text-indigo-700',
      },
    ],
  },
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      sections: [
        {
          title: 'Disposal Information',
          span: 'main',
          fields: [
            { label: 'Disposal Number', value: (d) => d.disposalNumber, mono: true },
            { label: 'Asset Name', value: (d) => d.assetName || '\u2014' },
            { label: 'Asset Code', value: (d) => d.assetCode || '\u2014', mono: true },
            { label: 'Disposal Date', value: (d) => formatDate(d.disposalDate) },
            {
              label: 'Disposal Type',
              value: (d) => (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700">
                  {DISPOSAL_TYPE_LABELS[d.disposalType] || d.disposalType}
                </span>
              ),
            },
            {
              label: 'Status',
              value: (d) => (
                <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', STATUS_STYLES[d.status] || 'bg-gray-100 text-gray-700')}>
                  {STATUS_LABELS[d.status] || d.status}
                </span>
              ),
            },
          ],
        },
        {
          title: 'Financial Impact',
          span: 'aside',
          render: (d) => <FinancialImpact disposal={d} />,
        },
        {
          title: 'Cost Breakdown',
          span: 'main',
          fields: [
            { label: 'Accumulated Depreciation', value: (d) => <span className="font-mono">{formatCurrency(d.accumulatedDepreciation)}</span> },
            { label: 'Disposal Costs', value: (d) => <span className="font-mono">{formatCurrency(d.disposalCosts)}</span> },
          ],
        },
        {
          title: 'Buyer Details',
          span: 'aside',
          hidden: (d) => !d.buyerName,
          fields: [
            { label: 'Buyer Name', value: (d) => d.buyerName || '\u2014' },
            { label: 'Contact', value: (d) => d.buyerContact || '\u2014', hidden: (d) => !d.buyerContact },
            { label: 'Address', value: (d) => d.buyerAddress || '\u2014', hidden: (d) => !d.buyerAddress },
          ],
        },
        {
          title: 'Documentation',
          span: 'main',
          hidden: (d) => !d.saleAgreementNumber && !d.invoiceNumber && !d.paymentReceivedDate,
          fields: [
            { label: 'Sale Agreement', value: (d) => d.saleAgreementNumber || '\u2014', mono: true, hidden: (d) => !d.saleAgreementNumber },
            { label: 'Invoice Number', value: (d) => d.invoiceNumber || '\u2014', mono: true, hidden: (d) => !d.invoiceNumber },
            { label: 'Payment Received', value: (d) => formatDate(d.paymentReceivedDate), hidden: (d) => !d.paymentReceivedDate },
            { label: 'Payment Method', value: (d) => d.paymentMethod || '\u2014', hidden: (d) => !d.paymentMethod },
          ],
        },
        {
          title: 'Workflow',
          span: 'aside',
          fields: [
            { label: 'Requested By', value: (d) => d.requestedByUserName || '\u2014', hidden: (d) => !d.requestedByUserName },
            { label: 'Approved By', value: (d) => d.approvedByUserName || '\u2014', hidden: (d) => !d.approvedByUserName },
            { label: 'Approved At', value: (d) => formatDate(d.approvedAt), hidden: (d) => !d.approvedAt },
            { label: 'Completed At', value: (d) => formatDate(d.completedAt), hidden: (d) => !d.completedAt },
            {
              label: 'GL Posted',
              value: (d) => d.isPosted ? (
                <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> Yes</span>
              ) : (
                <span className="flex items-center gap-1 text-gray-500"><XCircle className="h-4 w-4" /> No</span>
              ),
            },
          ],
        },
        {
          title: 'Notes',
          span: 'full',
          hidden: (d) => !d.reason && !d.notes,
          fields: [
            { label: 'Reason', value: (d) => <span className="text-sm whitespace-pre-wrap">{d.reason}</span>, hidden: (d) => !d.reason, span: 2 },
            { label: 'Notes', value: (d) => <span className="text-sm whitespace-pre-wrap">{d.notes}</span>, hidden: (d) => !d.notes, span: 2 },
          ],
        },
      ],
    },
    metadataTab<AssetDisposal>(),
  ],
};

// ============================================================================
// COMPONENT (thin wrapper)
// ============================================================================

interface DisposalDetailViewerProps {
  disposal: AssetDisposal;
  disposals: AssetDisposal[];
  onClose: () => void;
  onDisposalSelect: (disposal: AssetDisposal) => void;
  onDelete: (disposal: AssetDisposal) => void;
  loading?: boolean;
}

export function DisposalDetailViewer({
  disposal,
  disposals,
  onClose,
  onDisposalSelect,
  onDelete,
  loading,
}: DisposalDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={disposalDetailConfig}
      entity={disposal}
      entities={disposals}
      onClose={onClose}
      onEntitySelect={onDisposalSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
