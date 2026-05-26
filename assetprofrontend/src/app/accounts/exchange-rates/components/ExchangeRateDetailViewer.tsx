'use client';

import React from 'react';
import {
  ArrowRightLeft,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  EntityDetailViewer,
  metadataTab,
} from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { ExchangeRate } from '@/lib/api/accounts';
import { cn } from '@/lib/utils';

// ============================================================================
// CONFIG
// ============================================================================

export const exchangeRateDetailConfig: EntityDetailConfig<ExchangeRate> = {
  entityType: 'exchange-rates',
  basePath: '/accounts/exchange-rates',
  icon: ArrowRightLeft,
  title: (r) =>
    `${r.fromCurrencyCode || 'N/A'} / ${r.toCurrencyCode || 'N/A'}`,
  subtitle: (r) => `Rate: ${Number(r.rate).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`,
  sidebar: {
    title: (r) =>
      `${r.fromCurrencyCode || '?'} / ${r.toCurrencyCode || '?'}`,
    subtitle: (r) => Number(r.rate).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 }),
    searchKeys: ['title', 'subtitle'],
    badges: (r) => [
      {
        label: r.isActive ? 'Active' : 'Inactive',
        className: r.isActive
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
      },
    ],
    statusIcon: (r) =>
      r.isActive ? (
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
          title: 'Rate Details',
          span: 'main',
          fields: [
            {
              label: 'From Currency',
              value: (r) => (
                <span>
                  <span className="font-mono">{r.fromCurrencyCode}</span>
                  {r.fromCurrencyName && (
                    <span className="ml-2 text-muted-foreground">
                      {r.fromCurrencyName}
                    </span>
                  )}
                </span>
              ),
            },
            {
              label: 'To Currency',
              value: (r) => (
                <span>
                  <span className="font-mono">{r.toCurrencyCode}</span>
                  {r.toCurrencyName && (
                    <span className="ml-2 text-muted-foreground">
                      {r.toCurrencyName}
                    </span>
                  )}
                </span>
              ),
            },
            {
              label: 'Exchange Rate',
              value: (r) => (
                <span className="text-lg font-mono font-bold">
                  {Number(r.rate).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}
                </span>
              ),
            },
            {
              label: 'Source',
              value: (r) => r.source || <span className="text-muted-foreground">Not specified</span>,
            },
            {
              label: 'Status',
              value: (r) => (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
                    r.isActive
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}
                >
                  {r.isActive ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {r.isActive ? 'Active' : 'Inactive'}
                </span>
              ),
            },
          ],
        },
        {
          title: 'Validity Period',
          span: 'aside',
          icon: Calendar,
          fields: [
            {
              label: 'Valid From',
              value: (r) =>
                new Date(r.validFrom).toLocaleDateString('en-NG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }),
            },
            {
              label: 'Valid To',
              value: (r) =>
                r.validTo
                  ? new Date(r.validTo).toLocaleDateString('en-NG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Open-ended',
            },
          ],
        },
      ],
    },
    metadataTab<ExchangeRate>(),
  ],
};

// ============================================================================
// COMPONENT (thin wrapper)
// ============================================================================

interface ExchangeRateDetailViewerProps {
  exchangeRate: ExchangeRate;
  exchangeRates: ExchangeRate[];
  onClose: () => void;
  onExchangeRateSelect: (rate: ExchangeRate) => void;
  onDelete: (rate: ExchangeRate) => void;
  loading?: boolean;
}

export function ExchangeRateDetailViewer({
  exchangeRate,
  exchangeRates,
  onClose,
  onExchangeRateSelect,
  onDelete,
  loading,
}: ExchangeRateDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={exchangeRateDetailConfig}
      entity={exchangeRate}
      entities={exchangeRates}
      onClose={onClose}
      onEntitySelect={onExchangeRateSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
