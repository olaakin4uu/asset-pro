'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRightLeft,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, StatCard, StatCardsGrid, StatCardColors, ErrorBanner, LoadingSpinner} from '@/components/erp';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { exchangeRatesApi } from '@/lib/api/accounts';
import { useEntityDetail } from '@/hooks';
import type { ExchangeRate } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { ExchangeRateDetailViewer } from './components/ExchangeRateDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Exchange Rates' },
];

export default function ExchangeRatesPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <ExchangeRatesListContent />
    </Suspense>
  );
}

const fetchExchangeRateDetail = (id: number) => exchangeRatesApi.get(id);

function ExchangeRatesListContent() {
  const router = useRouter();

  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: ratesData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['accounts-exchange-rates'],
    queryFn: () => exchangeRatesApi.list(),
  });
  const rates = ratesData?.data ?? [];
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load exchange rates') : localError;

  // Detail viewer state - powered by useEntityDetail hook
  const {
    selectedEntity: selectedRate,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handleRateSelect,
  } = useEntityDetail({
    basePath: '/accounts/exchange-rates',
    entities: rates,
    fetchDetail: fetchExchangeRateDetail,
    onError: (msg) => setLocalError(msg),
  });

  const filteredRates = rates.filter(
    (rate) =>
      rate.fromCurrencyCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.toCurrencyCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.source?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (rate: ExchangeRate) => {
    confirmDialog({
      message: `Delete exchange rate ${rate.fromCurrencyCode} to ${rate.toCurrencyCode}?`,
      header: 'Delete Exchange Rate',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await exchangeRatesApi.delete(rate.id);
          if (selectedRate?.id === rate.id) {
            closeDetail();
          }
          queryClient.invalidateQueries({ queryKey: ['accounts-exchange-rates'] });
        } catch (err) {
          setLocalError(extractErrorMessage(err, 'Failed to delete exchange rate'));
        }
      },
    });
  };

  const activeCount = rates.filter((r) => r.isActive).length;

  const pageActions = [
    { id: 'back', label: 'Back', icon: ArrowLeft, variant: 'outline' as const, onClick: () => router.push('/accounts') },
    { id: 'create', label: 'New Rate', icon: Plus, variant: 'default' as const, onClick: () => router.push('/accounts/exchange-rates/create') },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      <PageHeader
        icon={ArrowRightLeft}
        title="Exchange Rates"
        description="Manage currency exchange rates"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <StatCardsGrid columns={3} className="mb-6">
        <StatCard title="Total Rates" value={rates.length.toString()} icon={ArrowRightLeft} color={StatCardColors.blue} />
        <StatCard title="Active" value={activeCount.toString()} icon={CheckCircle} color={StatCardColors.green} />
        <StatCard title="Unique Pairs" value={new Set(rates.map((r) => `${r.fromCurrencyId}-${r.toCurrencyId}`)).size.toString()} icon={ArrowRightLeft} color={StatCardColors.purple} />
      </StatCardsGrid>

      {/* Error Banner */}
      <ErrorBanner message={error} onDismiss={() => setLocalError(null)} />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search exchange rates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

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
              <th className="text-center px-6 py-3 text-sm font-medium">Active</th>
              <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <LoadingSpinner tableRow colSpan={8} />
            ) : filteredRates.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                  {searchTerm ? 'No exchange rates found matching your search' : 'No exchange rates yet'}
                </td>
              </tr>
            ) : (
              filteredRates.map((rate) => (
                <tr
                  key={rate.id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors cursor-pointer',
                    selectedRate?.id === rate.id && 'bg-primary/5'
                  )}
                  onClick={() => openDetail(rate.id)}
                >
                  <td className="px-6 py-4">
                    <span className="font-mono">{rate.fromCurrencyCode}</span>
                    <span className="ml-2 text-muted-foreground text-sm">{rate.fromCurrencyName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono">{rate.toCurrencyCode}</span>
                    <span className="ml-2 text-muted-foreground text-sm">{rate.toCurrencyName}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">{Number(rate.rate).toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}</td>
                  <td className="px-6 py-4 text-sm">{new Date(rate.validFrom).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm">{rate.validTo ? new Date(rate.validTo).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{rate.source || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    {rate.isActive ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400 mx-auto" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openDetail(rate.id)}
                        className="p-2 rounded-lg hover:bg-muted"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/accounts/exchange-rates/${rate.id}/edit`)}
                        className="p-2 rounded-lg hover:bg-muted"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rate)}
                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Viewer Panel */}
      {selectedRate && (
        <ExchangeRateDetailViewer
          exchangeRate={selectedRate}
          exchangeRates={rates}
          onClose={closeDetail}
          onExchangeRateSelect={handleRateSelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
