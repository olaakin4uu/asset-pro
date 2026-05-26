'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  History,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Clock,
  User,
  Globe,
  Database,
  GitCompare,
  FileJson,
  Code,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { auditLogsApi } from '@/lib/api/audit-logs';
import type { AuditLog, AuditEvent, AuditChange } from '@/types/audit-logs';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';
import { useEntityFetch } from '@/hooks';

// ============================================================================
// HELPERS
// ============================================================================

const eventLabels: Record<AuditEvent, string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  restored: 'Restored',
};

const eventColors: Record<AuditEvent, string> = {
  created: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  restored: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
};

const eventIconColors: Record<AuditEvent, string> = {
  created: 'bg-green-500',
  updated: 'bg-blue-500',
  deleted: 'bg-red-500',
  restored: 'bg-purple-500',
};

const eventHeaderColors: Record<AuditEvent, string> = {
  created: 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-900/20 dark:to-emerald-900/20',
  updated: 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20',
  deleted: 'border-red-200 bg-gradient-to-r from-red-50 to-rose-50 dark:border-red-800 dark:from-red-900/20 dark:to-rose-900/20',
  restored: 'border-purple-200 bg-gradient-to-r from-purple-50 to-violet-50 dark:border-purple-800 dark:from-purple-900/20 dark:to-violet-900/20',
};

function getEventIcon(event: AuditEvent) {
  switch (event) {
    case 'created':
      return Plus;
    case 'updated':
      return Pencil;
    case 'deleted':
      return Trash2;
    case 'restored':
      return RotateCcw;
    default:
      return History;
  }
}

function formatFieldLabel(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function isJsonValue(value: unknown): boolean {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null;
    } catch {
      return false;
    }
  }
  return typeof value === 'object' && value !== null;
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function AuditLogDetailPage() {
  const router = useRouter();
  const params = useParams();
  const auditId = parseInt(params.id as string);

  const { entity: audit, loading, error } = useEntityFetch({
    queryKey: 'core-audit-logs',
    id: auditId,
    fetchFn: auditLogsApi.get,
    errorMessage: 'Failed to load audit log',
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'changes' | 'raw'>('overview');

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Administration', href: '/core' },
    { title: 'Audit Trail', href: '/core/audit-logs' },
    { title: audit ? `#${audit.id}` : 'Loading...' },
  ];

  const pageActions = [
    ...(audit?.previousAuditId
      ? [
          {
            id: 'previous',
            label: 'Previous',
            icon: ChevronLeft,
            variant: 'outline' as const,
            onClick: () => router.push(`/core/audit-logs/${audit.previousAuditId}`),
            tooltip: 'View previous audit for this entity',
          },
        ]
      : []),
    ...(audit?.nextAuditId
      ? [
          {
            id: 'next',
            label: 'Next',
            icon: ChevronRight,
            variant: 'outline' as const,
            onClick: () => router.push(`/core/audit-logs/${audit.nextAuditId}`),
            tooltip: 'View next audit for this entity',
          },
        ]
      : []),
    {
      id: 'back',
      label: 'Back to List',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/core/audit-logs'),
    },
  ];

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </TenantLayout>
    );
  }

  if (error || !audit) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="rounded-xl border bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error || 'Audit log not found'}</p>
          <button
            onClick={() => router.push('/core/audit-logs')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to List
          </button>
        </div>
      </TenantLayout>
    );
  }

  const EventIcon = getEventIcon(audit.event);

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={History}
        title="Audit Log Details"
        description="View audit trail information"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      <div className="space-y-6">
        {/* Event Summary Header */}
        <div className={cn('rounded-xl border p-6', eventHeaderColors[audit.event])}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-xl',
                  eventIconColors[audit.event]
                )}
              >
                <EventIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium',
                      eventColors[audit.event]
                    )}
                  >
                    {eventLabels[audit.event]}
                  </span>
                  <h1 className="text-2xl font-bold">{audit.auditableTypeLabel}</h1>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Record ID: #{audit.auditableId}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Audit Log #{audit.id}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('changes')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'changes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Changes
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'raw'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Raw Data
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* User Information */}
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center">
                <User className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold">Modified By</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xl font-semibold text-primary">
                    {audit.user?.initials || 'SY'}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-medium">{audit.user?.name || 'System'}</p>
                  {audit.user?.email && (
                    <p className="text-sm text-muted-foreground">{audit.user.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Timestamp Information */}
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center">
                <Clock className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold">Timestamp</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                  <p className="mt-1">{audit.createdAtFormatted || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Relative Time</label>
                  <p className="mt-1">{audit.createdAtRelative || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center">
                <Globe className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold">Request Details</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                  <p className="mt-1 font-mono">{audit.ipAddress || 'Not recorded'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Browser</label>
                  <p className="mt-1">{audit.userAgentShort || 'Not recorded'}</p>
                </div>
                {audit.url && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">URL</label>
                    <p className="mt-1 break-all text-sm">{audit.url}</p>
                  </div>
                )}
                {audit.tags && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tags</label>
                    <p className="mt-1">{audit.tags}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Entity Information */}
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center">
                <Database className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold">Entity Information</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entity Type</label>
                  <p className="mt-1">{audit.auditableTypeLabel}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entity ID</label>
                  <p className="mt-1 font-mono">#{audit.auditableId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Model Path</label>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                    {audit.auditableType}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'changes' && (
          <div className="space-y-6">
            {/* Changes Header */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <GitCompare className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold">Field Changes</h3>
                </div>
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {audit.changes?.length || 0} field(s) modified
                </span>
              </div>
            </div>

            {/* Changes List */}
            {audit.changes && audit.changes.length > 0 ? (
              <div className="space-y-4">
                {audit.changes.map((change, index) => (
                  <div key={index} className="rounded-xl border bg-card p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-lg font-medium">{change.fieldLabel}</span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          change.type === 'added' && 'bg-green-100 text-green-800',
                          change.type === 'removed' && 'bg-red-100 text-red-800',
                          change.type === 'modified' && 'bg-blue-100 text-blue-800'
                        )}
                      >
                        {change.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* Old Value */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-red-600 dark:text-red-400">
                          Previous Value
                        </label>
                        <div
                          className={cn(
                            'rounded-lg bg-red-50 dark:bg-red-950/30 p-4',
                            change.oldValue === null && 'italic text-muted-foreground'
                          )}
                        >
                          {isJsonValue(change.oldValue) ? (
                            <pre className="whitespace-pre-wrap text-sm text-red-700 dark:text-red-300">
                              {formatValue(change.oldValue)}
                            </pre>
                          ) : (
                            <span className="text-sm text-red-700 dark:text-red-300">
                              {formatValue(change.oldValue)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* New Value */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-green-600 dark:text-green-400">
                          New Value
                        </label>
                        <div
                          className={cn(
                            'rounded-lg bg-green-50 dark:bg-green-950/30 p-4',
                            change.newValue === null && 'italic text-muted-foreground'
                          )}
                        >
                          {isJsonValue(change.newValue) ? (
                            <pre className="whitespace-pre-wrap text-sm text-green-700 dark:text-green-300">
                              {formatValue(change.newValue)}
                            </pre>
                          ) : (
                            <span className="text-sm text-green-700 dark:text-green-300">
                              {formatValue(change.newValue)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border bg-card p-8">
                {audit.event === 'created' ? (
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <Plus className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold">Record Created</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A new {audit.auditableTypeLabel} record was created
                    </p>
                    {audit.newValues && Object.keys(audit.newValues).length > 0 && (
                      <div className="mt-6 text-left">
                        <h4 className="mb-3 text-sm font-semibold">Initial Values:</h4>
                        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
                          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {Object.entries(audit.newValues).map(([key, value]) => (
                              <div key={key} className="rounded-lg bg-white dark:bg-gray-800 p-3">
                                <dt className="text-xs font-medium text-muted-foreground">
                                  {formatFieldLabel(key)}
                                </dt>
                                <dd className="mt-1 text-sm">{formatValue(value)}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </div>
                    )}
                  </div>
                ) : audit.event === 'deleted' ? (
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                      <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold">Record Deleted</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This {audit.auditableTypeLabel} record was deleted
                    </p>
                    {audit.oldValues && Object.keys(audit.oldValues).length > 0 && (
                      <div className="mt-6 text-left">
                        <h4 className="mb-3 text-sm font-semibold">Values at Deletion:</h4>
                        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-4">
                          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {Object.entries(audit.oldValues).map(([key, value]) => (
                              <div key={key} className="rounded-lg bg-white dark:bg-gray-800 p-3">
                                <dt className="text-xs font-medium text-muted-foreground">
                                  {formatFieldLabel(key)}
                                </dt>
                                <dd className="mt-1 text-sm">{formatValue(value)}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                      <History className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">No Changes Recorded</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      No field changes were captured for this audit entry
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="space-y-6">
            {/* Old Values */}
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center">
                <FileJson className="mr-2 h-5 w-5 text-red-600 dark:text-red-400" />
                <h3 className="text-lg font-semibold">Old Values (Raw JSON)</h3>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <pre className="overflow-auto whitespace-pre-wrap text-sm">
                  {audit.oldValues ? JSON.stringify(audit.oldValues, null, 2) : 'null'}
                </pre>
              </div>
            </div>

            {/* New Values */}
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center">
                <FileJson className="mr-2 h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-semibold">New Values (Raw JSON)</h3>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <pre className="overflow-auto whitespace-pre-wrap text-sm">
                  {audit.newValues ? JSON.stringify(audit.newValues, null, 2) : 'null'}
                </pre>
              </div>
            </div>

            {/* Full Audit Record */}
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center">
                <Code className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold">Full Audit Record</h3>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <pre className="overflow-auto whitespace-pre-wrap text-sm">
                  {JSON.stringify(audit, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </TenantLayout>
  );
}
