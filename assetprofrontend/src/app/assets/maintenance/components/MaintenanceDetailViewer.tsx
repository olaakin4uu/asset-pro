'use client';

import React from 'react';
import {
  Wrench,
  FileText,
  Clock,
  CheckCircle,
} from 'lucide-react';
import {
  EntityDetailViewer,
  metadataTab,
} from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { AssetMaintenance } from '@/types/assets';
import { getCurrencySymbol } from '@/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled', in_progress: 'In Progress', on_hold: 'On Hold',
  completed: 'Completed', cancelled: 'Cancelled',
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-gray-100 text-gray-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const PRIORITY_LABELS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700', medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700',
};

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  preventive: 'Preventive', corrective: 'Corrective', predictive: 'Predictive',
  condition_based: 'Condition Based', emergency: 'Emergency', routine: 'Routine',
};

const CONDITION_LABELS: Record<string, string> = {
  new: 'New', good: 'Good', fair: 'Fair', poor: 'Poor', damaged: 'Damaged',
};

function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '\u2014';
  const symbol = getCurrencySymbol('NGN');
  return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ============================================================================
// CONFIG
// ============================================================================

export const maintenanceDetailConfig: EntityDetailConfig<AssetMaintenance> = {
  entityType: 'maintenance',
  basePath: '/assets/maintenance',
  icon: Wrench,
  title: (m) => m.title,
  subtitle: (m) => m.maintenanceNumber,
  sidebar: {
    title: (m) => m.title,
    subtitle: (m) => m.maintenanceNumber,
    searchKeys: ['title', 'subtitle'],
    badges: (m) => [
      {
        label: STATUS_LABELS[m.status] || m.status,
        className: STATUS_STYLES[m.status] || 'bg-gray-100 text-gray-700',
      },
      {
        label: PRIORITY_LABELS[m.priority] || m.priority,
        className: PRIORITY_STYLES[m.priority] || 'bg-gray-100 text-gray-700',
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
          title: 'Details',
          span: 'main',
          fields: [
            { label: 'Asset Name', value: (m) => m.assetName || '\u2014' },
            { label: 'Asset Code', value: (m) => m.assetCode || '\u2014', mono: true },
            { label: 'Maintenance Type', value: (m) => MAINTENANCE_TYPE_LABELS[m.maintenanceType] || m.maintenanceType },
            {
              label: 'Priority',
              value: (m) => (
                <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', PRIORITY_STYLES[m.priority] || 'bg-gray-100 text-gray-700')}>
                  {PRIORITY_LABELS[m.priority] || m.priority}
                </span>
              ),
            },
            { label: 'Description', value: (m) => m.description || '\u2014', span: 2, hidden: (m) => !m.description },
          ],
        },
        {
          title: 'Schedule',
          span: 'aside',
          fields: [
            { label: 'Scheduled Date', value: (m) => formatDate(m.scheduledDate) },
            { label: 'Due Date', value: (m) => formatDate(m.dueDate) },
            { label: 'Started Date', value: (m) => formatDate(m.startedDate) },
            { label: 'Completed Date', value: (m) => formatDate(m.completedDate) },
            { label: 'Est. Duration', value: (m) => m.estimatedDurationHours ? `${m.estimatedDurationHours} hrs` : '\u2014' },
            { label: 'Actual Duration', value: (m) => m.actualDurationHours ? `${m.actualDurationHours} hrs` : '\u2014' },
            {
              label: 'Recurring',
              value: (m) => m.isRecurring
                ? `${(m.recurrenceFrequency || '').replace(/_/g, ' ')} (every ${m.recurrenceInterval || 1})`
                : 'No',
            },
          ],
        },
        {
          title: 'Costs',
          span: 'main',
          fields: [
            { label: 'Estimated Cost', value: (m) => formatCurrency(m.estimatedCost) },
            { label: 'Actual Cost', value: (m) => formatCurrency(m.actualCost) },
            { label: 'Labor Cost', value: (m) => formatCurrency(m.laborCost) },
            { label: 'Parts Cost', value: (m) => formatCurrency(m.partsCost) },
            { label: 'Vendor', value: (m) => m.vendorName || '\u2014', hidden: (m) => !m.vendorName },
            { label: 'Technician', value: (m) => m.technicianName || '\u2014', hidden: (m) => !m.technicianName },
          ],
        },
        {
          title: 'Status & Workflow',
          span: 'aside',
          fields: [
            {
              label: 'Status',
              value: (m) => (
                <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', STATUS_STYLES[m.status] || 'bg-gray-100 text-gray-700')}>
                  {STATUS_LABELS[m.status] || m.status}
                </span>
              ),
            },
            { label: 'Condition Before', value: (m) => CONDITION_LABELS[m.conditionBefore!] || '\u2014', hidden: (m) => !m.conditionBefore },
            { label: 'Condition After', value: (m) => CONDITION_LABELS[m.conditionAfter!] || '\u2014', hidden: (m) => !m.conditionAfter },
            { label: 'Requested By', value: (m) => m.requestedByUserName || '\u2014', hidden: (m) => !m.requestedByUserName },
            { label: 'Completed By', value: (m) => m.completedByUserName || '\u2014', hidden: (m) => !m.completedByUserName },
            {
              label: 'GL Posted',
              value: (m) => m.isPosted ? (
                <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> Yes \u2014 {formatDate(m.postedAt)}</span>
              ) : '\u2014',
              hidden: (m) => !m.isPosted,
            },
          ],
        },
        {
          title: 'Work Details',
          span: 'full',
          hidden: (m) => !m.workPerformed && !m.findings && !m.recommendations && !m.notes,
          render: (m) => (
            <div className="space-y-4">
              {m.workPerformed && (
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Work Performed</p>
                  <p className="whitespace-pre-wrap mt-1">{m.workPerformed}</p>
                </div>
              )}
              {m.findings && (
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Findings</p>
                  <p className="whitespace-pre-wrap mt-1">{m.findings}</p>
                </div>
              )}
              {m.recommendations && (
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Recommendations</p>
                  <p className="whitespace-pre-wrap mt-1">{m.recommendations}</p>
                </div>
              )}
              {m.notes && (
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Notes</p>
                  <p className="whitespace-pre-wrap mt-1">{m.notes}</p>
                </div>
              )}
            </div>
          ),
        },
      ],
    },
    metadataTab<AssetMaintenance>(),
  ],
};

// ============================================================================
// COMPONENT (thin wrapper)
// ============================================================================

interface MaintenanceDetailViewerProps {
  maintenance: AssetMaintenance;
  maintenances: AssetMaintenance[];
  onClose: () => void;
  onMaintenanceSelect: (maintenance: AssetMaintenance) => void;
  onDelete: (maintenance: AssetMaintenance) => void;
  loading?: boolean;
}

export function MaintenanceDetailViewer({
  maintenance,
  maintenances,
  onClose,
  onMaintenanceSelect,
  onDelete,
  loading,
}: MaintenanceDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={maintenanceDetailConfig}
      entity={maintenance}
      entities={maintenances}
      onClose={onClose}
      onEntitySelect={onMaintenanceSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
