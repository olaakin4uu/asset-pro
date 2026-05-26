'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Plus,
  Pencil,
  CheckCircle,
  Lock,
  Clock,
  ArrowLeft,
  Play,
  Eye,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { LoadingSpinner, ErrorBanner } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { fiscalYearsApi } from '@/lib/api/accounts';
import { useEntityDetail, useEntityPermissions } from '@/hooks';
import type { FiscalYear } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FiscalYearDetailViewer } from './components/FiscalYearDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Fiscal Years' },
];

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bgColor: string }> = {
  open: {
    label: 'Open',
    icon: Play,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  adjusting: {
    label: 'Adjusting',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  closed: {
    label: 'Closed',
    icon: Lock,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
};

export default function FiscalYearsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <FiscalYearsPageContent />
    </Suspense>
  );
}

const fetchFiscalYearDetail = (id: number) => fiscalYearsApi.get(id);

function FiscalYearsPageContent() {
  const router = useRouter();
  const { canCreate, canEdit } = useEntityPermissions('accounts', 'fiscal-years');

  const queryClient = useQueryClient();

  const { data: fiscalYearsData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['accounts-fiscal-years'],
    queryFn: () => fiscalYearsApi.list(),
  });

  const fiscalYears = fiscalYearsData?.data ?? [];
  const [actionError, setActionError] = useState<string | null>(null);
  const error = fetchError
    ? extractErrorMessage(fetchError, 'Failed to load fiscal years')
    : actionError;

  const {
    selectedEntity: selectedFiscalYear,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handleFiscalYearSelect,
  } = useEntityDetail({
    basePath: '/accounts/fiscal-years',
    entities: fiscalYears,
    fetchDetail: fetchFiscalYearDetail,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['accounts-fiscal-years'] });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const setCurrentMutation = useMutation({
    mutationFn: (yearId: number) => fiscalYearsApi.setCurrent(yearId),
    onSuccess: () => { setActionError(null); refresh(); },
    onError: (err: unknown) => setActionError(extractErrorMessage(err, 'Failed to set current fiscal year')),
  });

  const handleSetCurrent = (year: FiscalYear, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMutation.mutate(year.id);
  };

  const handleDeleteFiscalYear = (fy: FiscalYear) => {
    // Fiscal years typically aren't deleted, but close detail if selected
    if (selectedFiscalYear?.id === fy.id) closeDetail();
  };

  const openYears = fiscalYears.filter((fy) => fy.status === 'open').length;
  const closedYears = fiscalYears.filter((fy) => fy.status === 'closed').length;
  const currentYear = fiscalYears.find((fy) => fy.isCurrent);

  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/accounts'),
    },
    ...(canCreate ? [{
      id: 'create',
      label: 'New Fiscal Year',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => router.push('/accounts/fiscal-years/create'),
    }] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Calendar}
        title="Fiscal Years"
        description="Manage your accounting periods"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <StatCardsGrid columns={3} className="mb-6">
        <StatCard title="Total Fiscal Years" value={fiscalYears.length.toString()} icon={Calendar} color={StatCardColors.blue} />
        <StatCard title="Open Years" value={openYears.toString()} subtitle={`${closedYears} closed`} icon={Play} color={StatCardColors.green} />
        <StatCard title="Current Year" value={currentYear?.name || 'Not set'} icon={CheckCircle} color={StatCardColors.purple} />
      </StatCardsGrid>

      <ErrorBanner message={error} />

      {loading && <LoadingSpinner fullPage />}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fiscalYears.map((year) => {
            const status = statusConfig[year.status] || statusConfig.open;
            const StatusIcon = status.icon;

            return (
              <div
                key={year.id}
                onClick={() => openDetail(year.id)}
                className={cn(
                  'rounded-xl border bg-card p-6 relative overflow-hidden transition-all hover:shadow-md cursor-pointer',
                  year.isCurrent && 'ring-2 ring-primary',
                  selectedFiscalYear?.id === year.id && 'bg-primary/5'
                )}
              >
                {year.isCurrent && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      <CheckCircle className="h-3 w-3" />
                      Current
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{year.name}</h3>
                  <div className={cn('inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs', status.bgColor, status.color)}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="font-medium">{formatDate(year.startDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">End Date</span>
                    <span className="font-medium">{formatDate(year.endDate)}</span>
                  </div>
                  {year.closedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Closed On</span>
                      <span className="font-medium">{formatDate(year.closedAt)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openDetail(year.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>

                  {year.status !== 'closed' && canEdit && (
                    <>
                      <button
                        onClick={() => router.push(`/accounts/fiscal-years/${year.id}/edit`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>

                      {!year.isCurrent && (
                        <button
                          onClick={(e) => handleSetCurrent(year, e)}
                          disabled={setCurrentMutation.isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Set Current
                        </button>
                      )}
                    </>
                  )}

                  {year.status === 'closed' && (
                    <span className="text-sm text-muted-foreground">
                      Closed
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {fiscalYears.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Fiscal Years</h3>
              <p className="text-muted-foreground mt-1">
                Create your first fiscal year to start tracking accounting periods
              </p>
              <button
                onClick={() => router.push('/accounts/fiscal-years/create')}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Create Fiscal Year
              </button>
            </div>
          )}
        </div>
      )}

      {selectedFiscalYear && (
        <FiscalYearDetailViewer
          fiscalYear={selectedFiscalYear}
          fiscalYears={fiscalYears}
          onClose={closeDetail}
          onFiscalYearSelect={handleFiscalYearSelect}
          onDelete={handleDeleteFiscalYear}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
