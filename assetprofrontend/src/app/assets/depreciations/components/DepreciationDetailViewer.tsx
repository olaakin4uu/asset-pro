'use client';

import React from 'react';
import {
  Calculator,
  FileText,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  EntityDetailViewer,
  metadataTab,
} from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { AssetDepreciation } from '@/types/assets';
import { getCurrencySymbol } from '@/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  posted: 'bg-green-100 text-green-700',
  reversed: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', pending: 'Pending', approved: 'Approved', posted: 'Posted', reversed: 'Reversed',
};

const DEPRECIATION_METHOD_LABELS: Record<string, string> = {
  STRAIGHT_LINE: 'Straight Line',
  DECLINING_BALANCE: 'Declining Balance',
  UNITS_OF_PRODUCTION: 'Units of Production',
  SUM_OF_YEARS_DIGITS: 'Sum of Years Digits',
};

function formatCurrency(value: number): string {
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
// CONFIG
// ============================================================================

export const depreciationDetailConfig: EntityDetailConfig<AssetDepreciation> = {
  entityType: 'depreciations',
  basePath: '/assets/depreciations',
  icon: Calculator,
  title: (d) => d.assetName || 'Depreciation',
  subtitle: (d) => d.periodName || `${d.fiscalYear}-${d.fiscalPeriod}`,
  sidebar: {
    title: (d) => d.assetName || 'Depreciation',
    subtitle: (d) => d.periodName || `${d.fiscalYear}-${d.fiscalPeriod}`,
    searchKeys: ['title', 'subtitle'],
    badges: (d) => [
      {
        label: STATUS_LABELS[d.status] || d.status,
        className: STATUS_STYLES[d.status] || 'bg-gray-100 text-gray-700',
      },
      {
        label: d.isPosted ? 'Posted' : 'Not Posted',
        className: d.isPosted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700',
      },
    ],
    statusIcon: (d) =>
      d.isPosted ? (
        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-gray-400" />
      ),
  },
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      sections: [
        {
          title: 'Asset Information',
          span: 'main',
          fields: [
            { label: 'Asset Name', value: (d) => d.assetName || '\u2014' },
            { label: 'Asset Code', value: (d) => d.assetCode || '\u2014', mono: true },
            { label: 'Depreciation Method', value: (d) => DEPRECIATION_METHOD_LABELS[d.depreciationMethod] || d.depreciationMethod },
            { label: 'Useful Life', value: (d) => `${d.usefulLifeYears} years` },
            { label: 'Residual Value', value: (d) => formatCurrency(d.residualValue) },
          ],
        },
        {
          title: 'Period Information',
          span: 'aside',
          fields: [
            { label: 'Depreciation Date', value: (d) => formatDate(d.depreciationDate) },
            { label: 'Fiscal Year', value: (d) => String(d.fiscalYear) },
            { label: 'Fiscal Period', value: (d) => String(d.fiscalPeriod) },
            { label: 'Period Name', value: (d) => d.periodName || '\u2014', hidden: (d) => !d.periodName },
            { label: 'Batch Number', value: (d) => d.batchNumber || '\u2014', mono: true, hidden: (d) => !d.batchNumber },
          ],
        },
        {
          title: 'Financial Details',
          span: 'main',
          fields: [
            { label: 'Opening Book Value', value: (d) => <span className="font-mono">{formatCurrency(d.openingBookValue)}</span> },
            { label: 'Depreciation Amount', value: (d) => <span className="font-mono text-red-600">{formatCurrency(d.depreciationAmount)}</span> },
            { label: 'Closing Book Value', value: (d) => <span className="font-mono text-green-600">{formatCurrency(d.closingBookValue)}</span> },
            { label: 'Accumulated Depreciation', value: (d) => <span className="font-mono">{formatCurrency(d.accumulatedDepreciation)}</span> },
            { label: 'Annual Rate', value: (d) => d.annualDepreciationRate ? `${d.annualDepreciationRate}%` : '\u2014', hidden: (d) => !d.annualDepreciationRate },
          ],
        },
        {
          title: 'Posting Status',
          span: 'aside',
          fields: [
            {
              label: 'Status',
              value: (d) => (
                <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', STATUS_STYLES[d.status] || 'bg-gray-100 text-gray-700')}>
                  {STATUS_LABELS[d.status] || d.status}
                </span>
              ),
            },
            {
              label: 'Posted to GL',
              value: (d) => (
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', d.isPosted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')}>
                  {d.isPosted ? <><CheckCircle className="h-3.5 w-3.5" /> Posted</> : <><XCircle className="h-3.5 w-3.5" /> Not Posted</>}
                </span>
              ),
            },
            { label: 'Posted Date', value: (d) => formatDate(d.postedAt), hidden: (d) => !d.isPosted || !d.postedAt },
            { label: 'Posted By', value: (d) => d.postedByUserName || '\u2014', hidden: (d) => !d.isPosted },
            { label: 'Transaction ID', value: (d) => <span className="font-mono">#{d.transactionId}</span>, hidden: (d) => !d.isPosted || !d.transactionId },
          ],
        },
        {
          title: 'Adjustment',
          span: 'full',
          hidden: (d) => !d.isAdjustment,
          fields: [
            { label: 'Adjustment Reason', value: (d) => <span className="text-sm whitespace-pre-wrap">{d.adjustmentReason || '\u2014'}</span>, span: 2 },
          ],
        },
      ],
    },
    metadataTab<AssetDepreciation>(),
  ],
};

// ============================================================================
// COMPONENT (thin wrapper)
// ============================================================================

interface DepreciationDetailViewerProps {
  depreciation: AssetDepreciation;
  depreciations: AssetDepreciation[];
  onClose: () => void;
  onDepreciationSelect: (depreciation: AssetDepreciation) => void;
  onDelete: (depreciation: AssetDepreciation) => void;
  loading?: boolean;
}

export function DepreciationDetailViewer({
  depreciation,
  depreciations,
  onClose,
  onDepreciationSelect,
  onDelete,
  loading,
}: DepreciationDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={depreciationDetailConfig}
      entity={depreciation}
      entities={depreciations}
      onClose={onClose}
      onEntitySelect={onDepreciationSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
