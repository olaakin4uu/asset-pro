'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Coins,
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowLeft,
  Check,
  Ban,
  ArrowRightLeft,
  Eye,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { LoadingSpinner } from '@/components/erp';;
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { currenciesApi, exchangeRatesApi } from '@/lib/api/accounts';
import { useEntityDetail, useEntityPermissions } from '@/hooks';
import type { Currency, ExchangeRate } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { CurrencyDetailViewer } from './components/CurrencyDetailViewer';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Currencies' },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function CurrenciesPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <CurrenciesPageContent />
    </Suspense>
  );
}

const fetchCurrencyDetail = (id: number) => currenciesApi.get(id);

function CurrenciesPageContent() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('accounts', 'currencies');

  // Data state
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'currencies' | 'rates'>('currencies');

  const {
    selectedEntity: selectedCurrency,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handleCurrencySelect,
  } = useEntityDetail({
    basePath: '/accounts/currencies',
    entities: currencies,
    fetchDetail: fetchCurrencyDetail,
  });

  // Load data
  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [currenciesResult, ratesResult] = await Promise.allSettled([
      currenciesApi.list(),
      exchangeRatesApi.list(),
    ]);

    if (currenciesResult.status === 'fulfilled') {
      setCurrencies(currenciesResult.value.data);
    } else {
      setError(extractErrorMessage(currenciesResult.reason, 'Failed to load currencies'));
    }

    if (ratesResult.status === 'fulfilled') {
      setExchangeRates(ratesResult.value.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter data
  const filteredCurrencies = currencies.filter(
    (currency) =>
      currency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      currency.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRates = exchangeRates.filter(
    (rate) =>
      rate.fromCurrencyCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.toCurrencyCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const activeCurrencies = currencies.filter((c) => c.isActive).length;
  const totalRates = exchangeRates.length;

  // Handle delete
  const handleDelete = (currency: Currency) => {
    confirmDialog({
      message: `Are you sure you want to delete "${currency.name}" (${currency.code})? This action cannot be undone.`,
      header: 'Delete Currency',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await currenciesApi.delete(currency.id);
          if (selectedCurrency?.id === currency.id) closeDetail();
          loadData();
        } catch (err: unknown) {
          setError(extractErrorMessage(err, 'Failed to delete currency'));
        }
      },
    });
  };

  // Page actions
  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/accounts'),
    },
    ...(canCreate ? [
      {
        id: 'rate',
        label: 'Add Rate',
        icon: ArrowRightLeft,
        variant: 'outline' as const,
        onClick: () => router.push('/accounts/exchange-rates/create'),
      },
      {
        id: 'create',
        label: 'Add Currency',
        icon: Plus,
        variant: 'default' as const,
        onClick: () => router.push('/accounts/currencies/create'),
      },
    ] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />

      <PageHeader
        icon={Coins}
        title="Currency Management"
        description="Manage currencies and exchange rates"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      {/* Stats */}
      <StatCardsGrid columns={3} className="mb-6">
        <StatCard
          title="Total Currencies"
          value={currencies.length.toString()}
          icon={Coins}
          color={StatCardColors.green}
        />
        <StatCard
          title="Active Currencies"
          value={activeCurrencies.toString()}
          subtitle={`of ${currencies.length} total`}
          icon={Check}
          color={StatCardColors.blue}
        />
        <StatCard
          title="Exchange Rates"
          value={totalRates.toString()}
          icon={ArrowRightLeft}
          color={StatCardColors.purple}
        />
      </StatCardsGrid>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('currencies')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'currencies'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Currencies
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'rates'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Exchange Rates
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={activeTab === 'currencies' ? 'Search currencies...' : 'Search rates...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && <LoadingSpinner fullPage />}

      {/* Currencies Table */}
      {!loading && activeTab === 'currencies' && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium">Currency</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Code</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Symbol</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Decimals</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCurrencies.map((currency) => (
                <tr
                  key={currency.id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors cursor-pointer',
                    selectedCurrency?.id === currency.id && 'bg-primary/5'
                  )}
                  onClick={() => openDetail(currency.id)}
                >
                  <td className="px-6 py-4 font-medium">{currency.name}</td>
                  <td className="px-6 py-4 font-mono text-sm">{currency.code}</td>
                  <td className="px-6 py-4">{currency.symbol || '-'}</td>
                  <td className="px-6 py-4 text-center">{currency.decimalPlaces}</td>
                  <td className="px-6 py-4 text-center">
                    {currency.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                        <Check className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                        <Ban className="h-3 w-3" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openDetail(currency.id)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => router.push(`/accounts/currencies/${currency.id}/edit`)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(currency)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCurrencies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    {searchTerm ? 'No currencies found matching your search' : 'No currencies yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Exchange Rates Table */}
      {!loading && activeTab === 'rates' && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium">From</th>
                <th className="text-left px-6 py-3 text-sm font-medium">To</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Rate</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Valid From</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Valid To</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRates.map((rate) => (
                <tr key={rate.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono">{rate.fromCurrencyCode}</span>
                    <span className="ml-2 text-muted-foreground text-sm">{rate.fromCurrencyName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono">{rate.toCurrencyCode}</span>
                    <span className="ml-2 text-muted-foreground text-sm">{rate.toCurrencyName}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">{Number(rate.rate).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}</td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(rate.validFrom).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {rate.validTo ? new Date(rate.validTo).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{rate.source || '-'}</td>
                </tr>
              ))}

              {filteredRates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    {searchTerm ? 'No exchange rates found matching your search' : 'No exchange rates yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedCurrency && (
        <CurrencyDetailViewer
          currency={selectedCurrency}
          currencies={currencies}
          onClose={closeDetail}
          onCurrencySelect={handleCurrencySelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
