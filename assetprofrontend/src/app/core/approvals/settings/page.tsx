'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  ArrowLeft,
  Clock,
  Bell,
  Mail,
  AlertTriangle,
  Save,
  RotateCcw,
  Check,
  Users,
  GitBranch,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { FormField } from '@/components/erp/FormField';
import { approvalFlowsApi, approvableEntitiesApi } from '@/lib/api/approvals';
import type { ApprovableEntityType } from '@/types/approvals';
import type { BreadcrumbItem } from '@/types/core';
import { extractErrorMessage } from '@/lib/utils';

// ============================================================================
// SCHEMA
// ============================================================================

const approvalSettingsSchema = z.object({
  enableEmailNotifications: z.boolean(),
  enableInAppNotifications: z.boolean(),
  reminderIntervalHours: z.number().int().min(0),
  escalationEnabled: z.boolean(),
  escalationDelayHours: z.number().int().min(4),
  autoRejectAfterDays: z.number().int().min(0),
  requireCommentOnReject: z.boolean(),
  requireCommentOnReturn: z.boolean(),
  allowSelfApproval: z.boolean(),
  defaultTimeoutHours: z.number().int().min(0),
});

type ApprovalSettingsFormValues = z.infer<typeof approvalSettingsSchema>;

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Approvals', href: '/core/approvals' },
  { title: 'Settings' },
];

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function ApprovalSettingsPage() {
  const router = useRouter();

  const [scanning, setScanning] = useState(false);
  const [localEntityTypes, setLocalEntityTypes] = useState<ApprovableEntityType[] | null>(null);

  const {
    setValue,
    watch,
    reset,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApprovalSettingsFormValues>({
    resolver: zodResolver(approvalSettingsSchema),
    defaultValues: {
      enableEmailNotifications: true,
      enableInAppNotifications: true,
      reminderIntervalHours: 24,
      escalationEnabled: true,
      escalationDelayHours: 48,
      autoRejectAfterDays: 0,
      requireCommentOnReject: true,
      requireCommentOnReturn: true,
      allowSelfApproval: false,
      defaultTimeoutHours: 72,
    },
  });

  const { data: entityTypesData, isLoading: entitiesLoading } = useQuery({
    queryKey: ['core-approvable-entities'],
    queryFn: () => approvableEntitiesApi.list(),
  });

  const { data: flowStats, isLoading: statsLoading } = useQuery({
    queryKey: ['core-approval-flow-stats'],
    queryFn: () => approvalFlowsApi.getStats(),
  });

  const loading = entitiesLoading || statsLoading;
  const entityTypes = localEntityTypes ?? entityTypesData ?? [];

  // Watch all form values for controlled rendering
  const enableEmailNotifications = watch('enableEmailNotifications');
  const enableInAppNotifications = watch('enableInAppNotifications');
  const reminderIntervalHours = watch('reminderIntervalHours');
  const escalationEnabled = watch('escalationEnabled');
  const escalationDelayHours = watch('escalationDelayHours');
  const defaultTimeoutHours = watch('defaultTimeoutHours');
  const requireCommentOnReject = watch('requireCommentOnReject');
  const requireCommentOnReturn = watch('requireCommentOnReturn');
  const allowSelfApproval = watch('allowSelfApproval');

  const handleScanEntities = async () => {
    setScanning(true);
    try {
      const result = await approvableEntitiesApi.scan();
      setLocalEntityTypes([...entityTypes, ...result.registered]);
      alert(`Discovered ${result.discovered} entities, registered ${result.registered.length} new ones.`);
    } catch (err: unknown) {
      console.error('Failed to scan entities', err);
    } finally {
      setScanning(false);
    }
  };

  const onSave = async (data: ApprovalSettingsFormValues) => {
    try {
      // TODO: Implement settings save API
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulated save
      alert('Settings saved successfully');
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to save settings') });
    }
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Settings}
        title="Approval Settings"
        description="Configure approval workflow settings"
        actions={[
          {
            id: 'save',
            label: 'Save Changes',
            icon: Save,
            variant: 'default',
            onClick: handleSubmit(onSave),
          },
        ]}
        {...PageHeaderPresets.core}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Root Error */}
          {errors.root?.message && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
              {errors.root.message}
            </div>
          )}

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{flowStats?.totalFlows ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Total Flows</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{flowStats?.activeFlows ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Active Flows</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{entityTypes.length}</p>
                  <p className="text-sm text-muted-foreground">Entity Types</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{flowStats?.avgStepsPerFlow?.toFixed(1) ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Avg Steps/Flow</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Send email when approval is required</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableEmailNotifications}
                  onChange={(e) => setValue('enableEmailNotifications', e.target.checked, { shouldDirty: true })}
                  className="h-5 w-5 rounded border-gray-300"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">In-App Notifications</p>
                    <p className="text-sm text-muted-foreground">Show notifications in the application</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableInAppNotifications}
                  onChange={(e) => setValue('enableInAppNotifications', e.target.checked, { shouldDirty: true })}
                  className="h-5 w-5 rounded border-gray-300"
                />
              </label>

              <div className="p-3 rounded-lg border">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Reminder Interval</p>
                    <p className="text-sm text-muted-foreground">Hours between reminder notifications</p>
                  </div>
                </div>
                <FormField
                  id="reminderIntervalHours"
                  label="Reminder Interval"
                  error={errors.reminderIntervalHours?.message}
                  className="sr-only-label"
                >
                  {(ariaProps) => (
                    <select
                      {...ariaProps}
                      value={reminderIntervalHours}
                      onChange={(e) => setValue('reminderIntervalHours', parseInt(e.target.value), { shouldDirty: true })}
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value={0}>Disabled</option>
                      <option value={1}>1 hour</option>
                      <option value={2}>2 hours</option>
                      <option value={4}>4 hours</option>
                      <option value={6}>6 hours</option>
                      <option value={8}>8 hours</option>
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours</option>
                      <option value={48}>48 hours</option>
                      <option value={72}>72 hours</option>
                    </select>
                  )}
                </FormField>
              </div>
            </div>
          </div>

          {/* Escalation Settings */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Escalation Settings
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <div>
                  <p className="font-medium">Enable Escalation</p>
                  <p className="text-sm text-muted-foreground">Auto-escalate when approval times out</p>
                </div>
                <input
                  type="checkbox"
                  checked={escalationEnabled}
                  onChange={(e) => setValue('escalationEnabled', e.target.checked, { shouldDirty: true })}
                  className="h-5 w-5 rounded border-gray-300"
                />
              </label>

              {escalationEnabled && (
                <div className="p-3 rounded-lg border">
                  <div className="mb-3">
                    <p className="font-medium">Escalation Delay</p>
                    <p className="text-sm text-muted-foreground">Hours before escalating to next level</p>
                  </div>
                  <FormField
                    id="escalationDelayHours"
                    label="Escalation Delay"
                    error={errors.escalationDelayHours?.message}
                    className="sr-only-label"
                  >
                    {(ariaProps) => (
                      <select
                        {...ariaProps}
                        value={escalationDelayHours}
                        onChange={(e) => setValue('escalationDelayHours', parseInt(e.target.value), { shouldDirty: true })}
                        className="w-full rounded-lg border px-3 py-2"
                      >
                        <option value={4}>4 hours</option>
                        <option value={8}>8 hours</option>
                        <option value={12}>12 hours</option>
                        <option value={24}>24 hours</option>
                        <option value={48}>48 hours</option>
                        <option value={72}>72 hours</option>
                        <option value={96}>96 hours</option>
                        <option value={168}>1 week</option>
                      </select>
                    )}
                  </FormField>
                </div>
              )}

              <div className="p-3 rounded-lg border">
                <div className="mb-3">
                  <p className="font-medium">Default Step Timeout</p>
                  <p className="text-sm text-muted-foreground">Default timeout for approval steps (can be overridden per step)</p>
                </div>
                <FormField
                  id="defaultTimeoutHours"
                  label="Default Timeout"
                  error={errors.defaultTimeoutHours?.message}
                  className="sr-only-label"
                >
                  {(ariaProps) => (
                    <select
                      {...ariaProps}
                      value={defaultTimeoutHours}
                      onChange={(e) => setValue('defaultTimeoutHours', parseInt(e.target.value), { shouldDirty: true })}
                      className="w-full rounded-lg border px-3 py-2"
                    >
                      <option value={0}>No timeout</option>
                      <option value={24}>24 hours</option>
                      <option value={48}>48 hours</option>
                      <option value={72}>72 hours</option>
                      <option value={168}>1 week</option>
                    </select>
                  )}
                </FormField>
              </div>
            </div>
          </div>

          {/* Approval Rules */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Check className="h-5 w-5" />
              Approval Rules
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <div>
                  <p className="font-medium">Require Comment on Reject</p>
                  <p className="text-sm text-muted-foreground">Approvers must provide a reason when rejecting</p>
                </div>
                <input
                  type="checkbox"
                  checked={requireCommentOnReject}
                  onChange={(e) => setValue('requireCommentOnReject', e.target.checked, { shouldDirty: true })}
                  className="h-5 w-5 rounded border-gray-300"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <div>
                  <p className="font-medium">Require Comment on Return</p>
                  <p className="text-sm text-muted-foreground">Approvers must provide a reason when returning</p>
                </div>
                <input
                  type="checkbox"
                  checked={requireCommentOnReturn}
                  onChange={(e) => setValue('requireCommentOnReturn', e.target.checked, { shouldDirty: true })}
                  className="h-5 w-5 rounded border-gray-300"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <div>
                  <p className="font-medium">Allow Self Approval</p>
                  <p className="text-sm text-muted-foreground">Allow users to approve their own submissions</p>
                </div>
                <input
                  type="checkbox"
                  checked={allowSelfApproval}
                  onChange={(e) => setValue('allowSelfApproval', e.target.checked, { shouldDirty: true })}
                  className="h-5 w-5 rounded border-gray-300"
                />
              </label>
            </div>
          </div>

          {/* Approvable Entity Types */}
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Approvable Entity Types
              </h2>
              <button
                onClick={handleScanEntities}
                disabled={scanning}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RotateCcw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
                {scanning ? 'Scanning...' : 'Scan for New Entities'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Module</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Slug</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Flows</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entityTypes.map((entity) => (
                    <tr key={entity.entitySlug} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">{entity.moduleName}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{entity.displayName}</p>
                        <p className="text-xs text-muted-foreground">{entity.pluralName}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{entity.entitySlug}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                          {entity.flowCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entity.hasActiveFlow ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-400">
                            No Flow
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {entityTypes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No approvable entities found. Click &quot;Scan for New Entities&quot; to discover them.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={() => router.push('/core/approvals')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Approvals
        </button>
      </div>
    </TenantLayout>
  );
}
