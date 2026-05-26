'use client';

import React from 'react';
import {
  Coins,
  FileText,
  ArrowRightLeft,
  Check,
  Ban,
} from 'lucide-react';
import { EntityDetailViewer, metadataTab } from '@/components/erp';
import type { EntityDetailConfig, TabDef } from '@/components/erp';
import type { Currency, ExchangeRate } from '@/lib/api/accounts';

// Extended currency type that may include exchange rates from detail fetch
interface CurrencyWithRates extends Currency {
  exchangeRates?: ExchangeRate[];
}

function ExchangeRatesTab({ currency }: { currency: CurrencyWithRates }) {
  const rates = currency.exchangeRates || [];

  if (rates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No exchange rates defined for this currency</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <table className="w-full">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="text-left px-6 py-3 text-sm font-medium">To Currency</th>
            <th className="text-right px-6 py-3 text-sm font-medium">Rate</th>
            <th className="text-left px-6 py-3 text-sm font-medium">Valid From</th>
            <th className="text-left px-6 py-3 text-sm font-medium">Valid To</th>
            <th className="text-left px-6 py-3 text-sm font-medium">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rates.map((rate) => (
            <tr key={rate.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-6 py-4">
                <span className="font-mono">{rate.toCurrencyCode}</span>
                <span className="ml-2 text-muted-foreground text-sm">{rate.toCurrencyName}</span>
              </td>
              <td className="px-6 py-4 text-right font-mono">{Number(rate.rate).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}</td>
              <td className="px-6 py-4 text-sm">{new Date(rate.validFrom).toLocaleDateString()}</td>
              <td className="px-6 py-4 text-sm">{rate.validTo ? new Date(rate.validTo).toLocaleDateString() : '-'}</td>
              <td className="px-6 py-4 text-sm text-muted-foreground">{rate.source || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const currencyDetailConfig: EntityDetailConfig<CurrencyWithRates> = {
  entityType: 'currencies',
  basePath: '/accounts/currencies',
  icon: Coins,
  title: (c) => c.name,
  subtitle: (c) => c.code,
  sidebar: {
    title: (c) => c.name,
    subtitle: (c) => c.code,
    searchKeys: ['title', 'subtitle'],
    statusIcon: (c) =>
      c.isActive ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Ban className="h-3.5 w-3.5 text-gray-400" />
      ),
  },
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      sections: [
        {
          title: 'Currency Information',
          fields: [
            { label: 'Name', value: (c) => c.name },
            { label: 'Code', value: (c) => c.code, mono: true },
            { label: 'Symbol', value: (c) => c.symbol || '-' },
            { label: 'Decimal Places', value: (c) => c.decimalPlaces },
          ],
        },
      ],
    },
    {
      id: 'rates',
      label: 'Exchange Rates',
      icon: ArrowRightLeft,
      badge: (c) => c.exchangeRates?.length || undefined,
      render: (c) => <ExchangeRatesTab currency={c} />,
    } as TabDef<CurrencyWithRates>,
    metadataTab<CurrencyWithRates>(),
  ],
};

interface CurrencyDetailViewerProps {
  currency: CurrencyWithRates;
  currencies: Currency[];
  onClose: () => void;
  onCurrencySelect: (currency: Currency) => void;
  onDelete: (currency: Currency) => void;
  loading?: boolean;
}

export function CurrencyDetailViewer({
  currency,
  currencies,
  onClose,
  onCurrencySelect,
  onDelete,
  loading,
}: CurrencyDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={currencyDetailConfig}
      entity={currency}
      entities={currencies as CurrencyWithRates[]}
      onClose={onClose}
      onEntitySelect={onCurrencySelect as (c: CurrencyWithRates) => void}
      onDelete={onDelete as (c: CurrencyWithRates) => void}
      loading={loading}
    />
  );
}
