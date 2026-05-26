'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, CheckCircle } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, LoadingSpinner } from '@/components/erp';
import { companySettingsApi } from '@/lib/api/accounts';
import type { CompanySettings } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { extractErrorMessage } from '@/lib/utils';

// ============================================================================
// CONSTANTS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Settings' },
];

// ============================================================================
// PAGE
// ============================================================================

export default function AccountsSettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    companySettingsApi.get()
      .then(setSettings)
      .catch((err) => setError(extractErrorMessage(err, 'Failed to load settings')))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleJournalApproval = async (value: boolean) => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      // Always send both booleans so backend transformation of unset fields
      // cannot silently overwrite the other toggle's value.
      const updated = await companySettingsApi.update({
        useExpenseApproval: settings.useExpenseApproval,
        requireJournalApproval: value,
      });
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to update'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleExpenseApproval = async (value: boolean) => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      // Always send both booleans so backend transformation of unset fields
      // cannot silently overwrite the other toggle's value.
      const updated = await companySettingsApi.update({
        useExpenseApproval: value,
        requireJournalApproval: settings.requireJournalApproval,
      });
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Settings}
        title="Accounts Settings"
        description="Configure accounting module behaviour"
        {...PageHeaderPresets.financial}
      />

      {loading ? (
        <LoadingSpinner fullPage />
      ) : (
        <div className="max-w-2xl space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {saved && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Settings saved successfully
            </div>
          )}

          {/* Approval Settings */}
          <div className="rounded-xl border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <Save className="h-4 w-4" /> Approval Settings
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-sm">Require Approval for Expense Requests</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When enabled, all expense requests must go through a configured approval flow before being approved.
                  When disabled, requests are approved immediately on submission and GL account fields are available from creation.
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleToggleExpenseApproval(!settings?.useExpenseApproval)}
                className={[
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  settings?.useExpenseApproval ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
                ].join(' ')}
                role="switch"
                aria-checked={settings?.useExpenseApproval}
              >
                <span
                  className={[
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200',
                    settings?.useExpenseApproval ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
                {saving && (
                  <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin text-white" />
                )}
              </button>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Current behaviour:</p>
              {settings?.useExpenseApproval ? (
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Submission triggers a configured approval flow</li>
                  <li>Submission is blocked if no approval flow is set up for expense requests</li>
                  <li>GL account fields are filled in at the Accountant step</li>
                </ul>
              ) : (
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Requests are approved immediately on submission</li>
                  <li>GL account and bank account fields are visible from creation</li>
                  <li>No approval flow is needed</li>
                </ul>
              )}
            </div>
          </div>

          {/* Journal Entry Approval */}
          <div className="rounded-xl border bg-card p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <Save className="h-4 w-4" /> Journal Entry Approval
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-sm">Require Approval for Manual Journal Entries</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When enabled, manual journal entries created through the Journal Entries page will require approval before they can be posted.
                  The creator cannot approve their own entries — a different user must review and post.
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleToggleJournalApproval(!settings?.requireJournalApproval)}
                className={[
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  settings?.requireJournalApproval ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
                ].join(' ')}
                role="switch"
                aria-checked={!!settings?.requireJournalApproval}
              >
                <span
                  className={[
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200',
                    settings?.requireJournalApproval ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
                {saving && (
                  <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin text-white" />
                )}
              </button>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Current behaviour:</p>
              {settings?.requireJournalApproval ? (
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Manual journal entries are created with <strong>Pending</strong> status</li>
                  <li>A different user must review and post the entry</li>
                  <li>The creator cannot post their own entries (segregation of duties)</li>
                  <li>System-generated entries (from invoices, deliveries, etc.) are not affected</li>
                </ul>
              ) : (
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Journal entries are created as <strong>Draft</strong></li>
                  <li>Any authorized user can post entries immediately</li>
                  <li>No approval step required</li>
                </ul>
              )}
            </div>
          </div>

        </div>
      )}
    </TenantLayout>
  );
}
