'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ArrowLeft,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, StatCard, StatCardsGrid, StatCardColors, ErrorBanner, LoadingSpinner} from '@/components/erp';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { reportingPeriodsApi } from '@/lib/api/accounts';
import { useEntityDetail } from '@/hooks';
import type { ReportingPeriod } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { ReportingPeriodDetailViewer } from './components/ReportingPeriodDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Reporting Periods' },
];

const statusColors: Record<string, string> = {
  OPEN: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  ADJUSTING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  CLOSED: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
};

const statusIcons: Record<string, typeof CheckCircle> = {
  OPEN: CheckCircle,
  ADJUSTING: Clock,
  CLOSED: Lock,
};

export default function ReportingPeriodsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <ReportingPeriodsListContent />
    </Suspense>
  );
}

const fetchReportingPeriodDetail = (id: number) => reportingPeriodsApi.get(id);

function ReportingPeriodsListContent() {
  const router = useRouter();

  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: periodsData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['accounts-reporting-periods'],
    queryFn: () => reportingPeriodsApi.list({ limit: 100 }),
  });
  const periods = periodsData?.data ?? [];
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load reporting periods') : localError;

  // Detail viewer state - powered by useEntityDetail hook
  const {
    selectedEntity: selectedPeriod,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handlePeriodSelect,
  } = useEntityDetail({
    basePath: '/accounts/reporting-periods',
    entities: periods,
    fetchDetail: fetchReportingPeriodDetail,
    onError: (msg) => setLocalError(msg),
  });

  const filteredPeriods = periods.filter(
    (p) =>
      p.calendarYear.toString().includes(searchTerm) ||
      p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (period: ReportingPeriod) => {
    confirmDialog({
      message: `Delete period P${period.number} — ${period.label} (${period.calendarYear})?`,
      header: 'Delete Reporting Period',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await reportingPeriodsApi.delete(period.id);
          if (selectedPeriod?.id === period.id) {
            closeDetail();
          }
          queryClient.invalidateQueries({ queryKey: ['accounts-reporting-periods'] });
        } catch (err) {
          setLocalError(extractErrorMessage(err, 'Failed to delete reporting period'));
        }
      },
    });
  };

  const handleClose = (period: ReportingPeriod) => {
    confirmDialog({
      message: `Close period P${period.number} — ${period.label}? All prior periods must be closed first.`,
      header: 'Close Period',
      icon: 'pi pi-lock',
      accept: async () => {
        try {
          await reportingPeriodsApi.close(period.id);
          queryClient.invalidateQueries({ queryKey: ['accounts-reporting-periods'] });
        } catch (err) {
          setLocalError(extractErrorMessage(err, 'Failed to close reporting period'));
        }
      },
    });
  };

  const handleReopen = (period: ReportingPeriod) => {
    confirmDialog({
      message: `Reopen period P${period.number} — ${period.label} for adjustments? No later periods can be closed.`,
      header: 'Reopen Period',
      icon: 'pi pi-unlock',
      accept: async () => {
        try {
          await reportingPeriodsApi.reopen(period.id);
          queryClient.invalidateQueries({ queryKey: ['accounts-reporting-periods'] });
        } catch (err) {
          setLocalError(extractErrorMessage(err, 'Failed to reopen reporting period'));
        }
      },
    });
  };

  const openCount = periods.filter((p) => p.status === 'OPEN').length;
  const closedCount = periods.filter((p) => p.status === 'CLOSED').length;
  const adjustingCount = periods.filter((p) => p.status === 'ADJUSTING').length;

  const pageActions = [
    { id: 'back', label: 'Back', icon: ArrowLeft, variant: 'outline' as const, onClick: () => router.push('/accounts') },
    { id: 'create', label: 'New Period', icon: Plus, variant: 'default' as const, onClick: () => router.push('/accounts/reporting-periods/create') },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      <PageHeader
        icon={Calendar}
        title="Reporting Periods"
        description="Manage monthly accounting reporting periods"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <StatCardsGrid columns={4} className="mb-6">
        <StatCard title="Total Periods" value={periods.length.toString()} icon={Calendar} color={StatCardColors.blue} />
        <StatCard title="Open" value={openCount.toString()} icon={CheckCircle} color={StatCardColors.green} />
        <StatCard title="Adjusting" value={adjustingCount.toString()} icon={Clock} color={StatCardColors.amber} />
        <StatCard title="Closed" value={closedCount.toString()} icon={Lock} color={StatCardColors.slate} />
      </StatCardsGrid>

      {/* Error Banner */}
      <ErrorBanner message={error} onDismiss={() => setLocalError(null)} />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by year, month label, or status..."
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
              <th className="text-center px-4 py-3 text-sm font-medium w-16">#</th>
              <th className="text-left px-6 py-3 text-sm font-medium">Period</th>
              <th className="text-left px-6 py-3 text-sm font-medium">Date Range</th>
              <th className="text-center px-6 py-3 text-sm font-medium">Year</th>
              <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
              <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <LoadingSpinner tableRow colSpan={6} />
            ) : filteredPeriods.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  {searchTerm ? 'No reporting periods found matching your search' : 'No reporting periods yet — create a fiscal year to auto-generate them'}
                </td>
              </tr>
            ) : (
              filteredPeriods.map((period) => {
                const StatusIcon = statusIcons[period.status] || Clock;
                return (
                  <tr
                    key={period.id}
                    className={cn(
                      'hover:bg-muted/30 transition-colors cursor-pointer',
                      selectedPeriod?.id === period.id && 'bg-primary/5'
                    )}
                    onClick={() => openDetail(period.id)}
                  >
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                        period.status === 'CLOSED'
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          : 'bg-primary/10 text-primary'
                      )}>
                        {period.number}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium">{period.label}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {new Date(period.startDate).toLocaleDateString()} – {new Date(period.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-center font-medium">{period.calendarYear}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium', statusColors[period.status] || statusColors.OPEN)}>
                        <StatusIcon className="h-3 w-3" />
                        {period.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openDetail(period.id)}
                          className="p-2 rounded-lg hover:bg-muted"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {period.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleClose(period)}
                            className="p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600"
                            title="Close Period"
                          >
                            <Lock className="h-4 w-4" />
                          </button>
                        )}
                        {period.status === 'CLOSED' && (
                          <button
                            onClick={() => handleReopen(period)}
                            className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                            title="Reopen Period"
                          >
                            <Unlock className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/accounts/reporting-periods/${period.id}/edit`)}
                          className="p-2 rounded-lg hover:bg-muted"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {period.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleDelete(period)}
                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Viewer Panel */}
      {selectedPeriod && (
        <ReportingPeriodDetailViewer
          reportingPeriod={selectedPeriod}
          reportingPeriods={periods}
          onClose={closeDetail}
          onReportingPeriodSelect={handlePeriodSelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
