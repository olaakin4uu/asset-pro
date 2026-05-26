'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  FileText,
  CheckCircle,
  Lock,
  Clock,
  Play,
  Hash,
} from 'lucide-react';
import { EntityDetailViewer, metadataTab } from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { FiscalYear } from '@/lib/api/accounts';
import { reportingPeriodsApi } from '@/lib/api/accounts';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  open: {
    label: 'Open',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  adjusting: {
    label: 'Adjusting',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  closed: {
    label: 'Closed',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
};

const statusIcons: Record<string, React.ReactNode> = {
  open: <Play className="h-3.5 w-3.5 text-green-500" />,
  adjusting: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  closed: <Lock className="h-3.5 w-3.5 text-gray-400" />,
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================================
// REPORTING PERIODS TAB COMPONENT
// ============================================================================

const periodStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  OPEN: {
    label: 'Open',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  ADJUSTING: {
    label: 'Adjusting',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  CLOSED: {
    label: 'Closed',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
};

function ReportingPeriodsTab({ fiscalYear }: { fiscalYear: FiscalYear }) {
  const router = useRouter();
  const calendarYear = new Date(fiscalYear.startDate).getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ['reporting-periods-fy', calendarYear],
    queryFn: () => reportingPeriodsApi.list({ calendarYear, limit: 13 }),
  });

  const periods = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (periods.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <Hash className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No reporting periods found for {calendarYear}</p>
      </div>
    );
  }

  const openCount = periods.filter((p) => p.status === 'OPEN').length;
  const closedCount = periods.filter((p) => p.status === 'CLOSED').length;
  const adjustingCount = periods.filter((p) => p.status === 'ADJUSTING').length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">{periods.length} periods</span>
        {openCount > 0 && (
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
            <Play className="h-3 w-3" /> {openCount} open
          </span>
        )}
        {adjustingCount > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" /> {adjustingCount} adjusting
          </span>
        )}
        {closedCount > 0 && (
          <span className="inline-flex items-center gap-1 text-gray-500">
            <Lock className="h-3 w-3" /> {closedCount} closed
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-16">#</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date Range</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => {
              const ps = periodStatusConfig[period.status] || periodStatusConfig.OPEN;
              return (
                <tr
                  key={period.id}
                  className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/accounts/reporting-periods?view=${period.id}`)}
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {period.number}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{period.label}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(period.startDate)} — {formatDate(period.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      ps.bgColor, ps.color,
                    )}>
                      {ps.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// FISCAL YEAR DETAIL CONFIG
// ============================================================================

const fiscalYearDetailConfig: EntityDetailConfig<FiscalYear> = {
  entityType: 'fiscal-years',
  basePath: '/accounts/fiscal-years',
  icon: Calendar,
  title: (fy) => fy.name,
  subtitle: (fy) => `${formatDate(fy.startDate)} - ${formatDate(fy.endDate)}`,
  sidebar: {
    title: (fy) => fy.name,
    subtitle: (fy) => `${formatDate(fy.startDate)} - ${formatDate(fy.endDate)}`,
    searchKeys: ['title', 'subtitle'],
    badges: (fy) => [
      ...(fy.isCurrent
        ? [{ label: 'Current', className: 'bg-primary text-primary-foreground' }]
        : []),
      {
        label: statusConfig[fy.status]?.label || fy.status,
        className: `${statusConfig[fy.status]?.bgColor || ''} ${statusConfig[fy.status]?.color || ''}`,
      },
    ],
    statusIcon: (fy) => statusIcons[fy.status] || statusIcons.open,
  },
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      sections: [
        {
          title: 'Fiscal Year Information',
          fields: [
            { label: 'Name', value: (fy) => fy.name },
            {
              label: 'Status',
              value: (fy) => {
                const s = statusConfig[fy.status] || statusConfig.open;
                return (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${s.bgColor} ${s.color}`}>
                    {s.label}
                  </span>
                );
              },
            },
            {
              label: 'Start Date',
              value: (fy) => (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(fy.startDate)}
                </span>
              ),
            },
            {
              label: 'End Date',
              value: (fy) => (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(fy.endDate)}
                </span>
              ),
            },
            {
              label: 'Current Year',
              value: (fy) =>
                fy.isCurrent ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Yes
                  </span>
                ) : (
                  'No'
                ),
            },
            {
              label: 'Closed On',
              value: (fy) => (
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  {formatDate(fy.closedAt!)}
                </span>
              ),
              hidden: (fy) => !fy.closedAt,
            },
          ],
        },
      ],
    },
    {
      id: 'periods',
      label: 'Reporting Periods',
      icon: Hash,
      render: (fy) => <ReportingPeriodsTab fiscalYear={fy} />,
    },
    metadataTab<FiscalYear>(),
  ],
};

interface FiscalYearDetailViewerProps {
  fiscalYear: FiscalYear;
  fiscalYears: FiscalYear[];
  onClose: () => void;
  onFiscalYearSelect: (fy: FiscalYear) => void;
  onDelete: (fy: FiscalYear) => void;
  loading?: boolean;
}

export function FiscalYearDetailViewer({
  fiscalYear,
  fiscalYears,
  onClose,
  onFiscalYearSelect,
  onDelete,
  loading,
}: FiscalYearDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={fiscalYearDetailConfig}
      entity={fiscalYear}
      entities={fiscalYears}
      onClose={onClose}
      onEntitySelect={onFiscalYearSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
