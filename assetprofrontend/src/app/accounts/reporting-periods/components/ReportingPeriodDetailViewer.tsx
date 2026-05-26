'use client';

import React from 'react';
import {
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  Lock,
} from 'lucide-react';
import {
  EntityDetailViewer,
  metadataTab,
} from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { ReportingPeriod } from '@/lib/api/accounts';
import { cn } from '@/lib/utils';

// ============================================================================
// STYLES
// ============================================================================

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  ADJUSTING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  CLOSED: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  OPEN: CheckCircle,
  ADJUSTING: Clock,
  CLOSED: Lock,
};

// ============================================================================
// CONFIG
// ============================================================================

export const reportingPeriodDetailConfig: EntityDetailConfig<ReportingPeriod> = {
  entityType: 'reporting-periods',
  basePath: '/accounts/reporting-periods',
  icon: Calendar,
  title: (p) => `P${p.number} — ${p.label}`,
  subtitle: (p) => `${p.calendarYear}`,
  sidebar: {
    title: (p) => `P${p.number} — ${p.label}`,
    subtitle: (p) => `${p.calendarYear}`,
    searchKeys: ['title', 'subtitle'],
    badges: (p) => [
      {
        label: p.status,
        className: STATUS_STYLES[p.status] || STATUS_STYLES.OPEN,
      },
    ],
    statusIcon: (p) => {
      const Icon = STATUS_ICONS[p.status] || Clock;
      const colorClass =
        p.status === 'OPEN'
          ? 'text-green-500'
          : p.status === 'CLOSED'
          ? 'text-gray-400'
          : 'text-amber-500';
      return <Icon className={cn('h-3.5 w-3.5', colorClass)} />;
    },
  },
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      sections: [
        {
          title: 'Period Details',
          span: 'main',
          fields: [
            {
              label: 'Calendar Year',
              value: (p) => (
                <span className="text-lg font-bold">{p.calendarYear}</span>
              ),
            },
            {
              label: 'Period Number',
              value: (p) => `P${p.number}`,
            },
            {
              label: 'Label',
              value: (p) => p.label,
            },
            {
              label: 'Date Range',
              value: (p) => `${new Date(p.startDate).toLocaleDateString()} – ${new Date(p.endDate).toLocaleDateString()}`,
            },
            {
              label: 'Status',
              value: (p) => {
                const Icon = STATUS_ICONS[p.status] || Clock;
                return (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
                      STATUS_STYLES[p.status] || STATUS_STYLES.OPEN
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {p.status}
                  </span>
                );
              },
            },
          ],
        },
      ],
    },
    metadataTab<ReportingPeriod>(),
  ],
};

// ============================================================================
// COMPONENT (thin wrapper)
// ============================================================================

interface ReportingPeriodDetailViewerProps {
  reportingPeriod: ReportingPeriod;
  reportingPeriods: ReportingPeriod[];
  onClose: () => void;
  onReportingPeriodSelect: (period: ReportingPeriod) => void;
  onDelete: (period: ReportingPeriod) => void;
  loading?: boolean;
}

export function ReportingPeriodDetailViewer({
  reportingPeriod,
  reportingPeriods,
  onClose,
  onReportingPeriodSelect,
  onDelete,
  loading,
}: ReportingPeriodDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={reportingPeriodDetailConfig}
      entity={reportingPeriod}
      entities={reportingPeriods}
      onClose={onClose}
      onEntitySelect={onReportingPeriodSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
