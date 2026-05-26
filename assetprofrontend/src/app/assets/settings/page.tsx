'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, Loader2, Calculator, Shield, Bell, Barcode, Save } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, LoadingSpinner } from '@/components/erp';
import { FormField } from '@/components/erp/FormField';
import { assetSettingsApi } from '@/lib/api/assets';
import type { DepreciationMethod } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { extractErrorMessage } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ============================================================================
// ZOD SCHEMA
// ============================================================================

const assetSettingsSchema = z.object({
  // Depreciation Settings
  defaultDepreciationMethod: z.enum(['STRAIGHT_LINE', 'DECLINING_BALANCE', 'UNITS_OF_PRODUCTION', 'SUM_OF_YEARS_DIGITS']),
  autoCalculateDepreciation: z.boolean(),
  depreciationFrequency: z.enum(['monthly', 'quarterly', 'annually']),
  prorationFirstYear: z.boolean(),
  prorationDisposalYear: z.boolean(),
  midMonthConvention: z.boolean(),
  // Approval Settings
  requireAssetApproval: z.boolean(),
  requireDisposalApproval: z.boolean(),
  requireTransferApproval: z.boolean(),
  requireMaintenanceApproval: z.boolean(),
  requireRevaluationApproval: z.boolean(),
  requirePhysicalVerification: z.boolean(),
  // Code Generation
  autoGenerateCode: z.boolean(),
  codePrefix: z.string(),
  codePadding: z.coerce.number().int().min(1).max(10),
  capitalizationThreshold: z.coerce.number().min(0),
  // Valuation
  allowRevaluation: z.boolean(),
  trackImpairment: z.boolean(),
  // Maintenance
  trackMaintenanceCosts: z.boolean(),
  maintenanceReminderDays: z.coerce.number().int().min(1),
  allowMaintenanceScheduling: z.boolean(),
  // Transfer
  allowInterCompanyTransfer: z.boolean(),
  allowInterBranchTransfer: z.boolean(),
  // Notifications
  notifyOnDepreciation: z.boolean(),
  notifyOnMaintenanceDue: z.boolean(),
  notifyOnWarrantyExpiry: z.boolean(),
  notifyOnDisposal: z.boolean(),
  warrantyExpiryReminderDays: z.coerce.number().int().min(1),
  // Barcode & Tracking
  enableBarcode: z.boolean(),
  enableQrCode: z.boolean(),
  barcodeFormat: z.string().optional(),
});

type AssetSettingsFormValues = z.infer<typeof assetSettingsSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }, { title: 'Assets', href: '/assets' }, { title: 'Settings' }];

const depreciationMethodOptions: { value: DepreciationMethod; label: string }[] = [
  { value: 'STRAIGHT_LINE', label: 'Straight Line' },
  { value: 'DECLINING_BALANCE', label: 'Declining Balance' },
  { value: 'UNITS_OF_PRODUCTION', label: 'Units of Production' },
  { value: 'SUM_OF_YEARS_DIGITS', label: 'Sum of Years Digits' },
];

const frequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const defaultValues: AssetSettingsFormValues = {
  defaultDepreciationMethod: 'STRAIGHT_LINE',
  autoCalculateDepreciation: true,
  depreciationFrequency: 'monthly',
  prorationFirstYear: true,
  prorationDisposalYear: true,
  midMonthConvention: false,
  requireAssetApproval: false,
  requireDisposalApproval: true,
  requireTransferApproval: true,
  requireMaintenanceApproval: false,
  requireRevaluationApproval: true,
  requirePhysicalVerification: false,
  autoGenerateCode: true,
  codePrefix: 'AST',
  codePadding: 5,
  capitalizationThreshold: 0,
  allowRevaluation: true,
  trackImpairment: true,
  trackMaintenanceCosts: true,
  maintenanceReminderDays: 7,
  allowMaintenanceScheduling: true,
  allowInterCompanyTransfer: false,
  allowInterBranchTransfer: true,
  notifyOnDepreciation: true,
  notifyOnMaintenanceDue: true,
  notifyOnWarrantyExpiry: true,
  notifyOnDisposal: true,
  warrantyExpiryReminderDays: 30,
  enableBarcode: false,
  enableQrCode: false,
  barcodeFormat: '',
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function AssetSettingsPage() {
  const [success, setSuccess] = useState(false);

  const { data: settings, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['asset-settings'],
    queryFn: () => assetSettingsApi.get(),
    staleTime: 60_000,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AssetSettingsFormValues>({
    resolver: zodResolver(assetSettingsSchema),
    defaultValues,
  });

  // Populate form when data loads — guard with !isDirty so a background
  // refetch doesn't silently discard the user's unsaved changes
  useEffect(() => {
    if (settings && !isDirty) {
      reset({
        defaultDepreciationMethod: settings.defaultDepreciationMethod,
        autoCalculateDepreciation: settings.autoCalculateDepreciation,
        depreciationFrequency: settings.depreciationFrequency,
        prorationFirstYear: settings.prorationFirstYear,
        prorationDisposalYear: settings.prorationDisposalYear,
        midMonthConvention: settings.midMonthConvention,
        requireAssetApproval: settings.requireAssetApproval,
        requireDisposalApproval: settings.requireDisposalApproval,
        requireTransferApproval: settings.requireTransferApproval,
        requireMaintenanceApproval: settings.requireMaintenanceApproval,
        requireRevaluationApproval: settings.requireRevaluationApproval,
        requirePhysicalVerification: settings.requirePhysicalVerification,
        autoGenerateCode: settings.autoGenerateCode,
        codePrefix: settings.codePrefix,
        codePadding: settings.codePadding,
        capitalizationThreshold: settings.capitalizationThreshold,
        allowRevaluation: settings.allowRevaluation,
        trackImpairment: settings.trackImpairment,
        trackMaintenanceCosts: settings.trackMaintenanceCosts,
        maintenanceReminderDays: settings.maintenanceReminderDays,
        allowMaintenanceScheduling: settings.allowMaintenanceScheduling,
        allowInterCompanyTransfer: settings.allowInterCompanyTransfer,
        allowInterBranchTransfer: settings.allowInterBranchTransfer,
        notifyOnDepreciation: settings.notifyOnDepreciation,
        notifyOnMaintenanceDue: settings.notifyOnMaintenanceDue,
        notifyOnWarrantyExpiry: settings.notifyOnWarrantyExpiry,
        notifyOnDisposal: settings.notifyOnDisposal,
        warrantyExpiryReminderDays: settings.warrantyExpiryReminderDays,
        enableBarcode: settings.enableBarcode,
        enableQrCode: settings.enableQrCode,
        barcodeFormat: settings.barcodeFormat ?? '',
      });
    }
  }, [settings, reset, isDirty]);

  const onSubmit = useCallback(async (data: AssetSettingsFormValues) => {
    try {
      clearErrors('root');
      setSuccess(false);
      await assetSettingsApi.update(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to save settings') });
    }
  }, [clearErrors, setError]);

  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load settings') : errors.root?.message ?? null;

  // Watched checkbox values
  const autoCalculateDepreciation = watch('autoCalculateDepreciation');
  const prorationFirstYear = watch('prorationFirstYear');
  const prorationDisposalYear = watch('prorationDisposalYear');
  const midMonthConvention = watch('midMonthConvention');
  const requireAssetApproval = watch('requireAssetApproval');
  const requireDisposalApproval = watch('requireDisposalApproval');
  const requireTransferApproval = watch('requireTransferApproval');
  const requireMaintenanceApproval = watch('requireMaintenanceApproval');
  const requireRevaluationApproval = watch('requireRevaluationApproval');
  const requirePhysicalVerification = watch('requirePhysicalVerification');
  const autoGenerateCode = watch('autoGenerateCode');
  const notifyOnDepreciation = watch('notifyOnDepreciation');
  const notifyOnMaintenanceDue = watch('notifyOnMaintenanceDue');
  const notifyOnWarrantyExpiry = watch('notifyOnWarrantyExpiry');
  const notifyOnDisposal = watch('notifyOnDisposal');
  const enableBarcode = watch('enableBarcode');
  const enableQrCode = watch('enableQrCode');
  const allowRevaluation = watch('allowRevaluation');
  const trackImpairment = watch('trackImpairment');
  const trackMaintenanceCosts = watch('trackMaintenanceCosts');
  const allowMaintenanceScheduling = watch('allowMaintenanceScheduling');
  const allowInterCompanyTransfer = watch('allowInterCompanyTransfer');
  const allowInterBranchTransfer = watch('allowInterBranchTransfer');

  if (loading) return <TenantLayout breadcrumbs={breadcrumbs}><LoadingSpinner fullPage /></TenantLayout>;
  if (error && !settings) return <TenantLayout breadcrumbs={breadcrumbs}><div className="flex items-center justify-center py-12"><p className="text-red-500">{error}</p></div></TenantLayout>;

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader icon={Settings} title="Asset Settings" description="Configure asset module preferences" {...PageHeaderPresets.operations} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Depreciation Settings */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Calculator className="h-5 w-5" />Depreciation Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField id="defaultDepreciationMethod" label="Default Method" error={errors.defaultDepreciationMethod?.message}>
              {(ariaProps) => (
                <select {...register('defaultDepreciationMethod')} {...ariaProps} className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                  {depreciationMethodOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              )}
            </FormField>
            <FormField id="depreciationFrequency" label="Frequency" error={errors.depreciationFrequency?.message}>
              {(ariaProps) => (
                <select {...register('depreciationFrequency')} {...ariaProps} className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                  {frequencyOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              )}
            </FormField>
            <div className="md:col-span-2 space-y-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={autoCalculateDepreciation} onChange={(e) => setValue('autoCalculateDepreciation', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Auto-calculate depreciation</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={prorationFirstYear} onChange={(e) => setValue('prorationFirstYear', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Prorate first year depreciation</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={prorationDisposalYear} onChange={(e) => setValue('prorationDisposalYear', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Prorate disposal year depreciation</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={midMonthConvention} onChange={(e) => setValue('midMonthConvention', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Use mid-month convention</span></label>
            </div>
          </div>
        </div>

        {/* Approval Settings */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Shield className="h-5 w-5" />Approval Requirements</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={requireAssetApproval} onChange={(e) => setValue('requireAssetApproval', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Require approval for new assets</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={requireDisposalApproval} onChange={(e) => setValue('requireDisposalApproval', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Require approval for disposals</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={requireTransferApproval} onChange={(e) => setValue('requireTransferApproval', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Require approval for transfers</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={requireMaintenanceApproval} onChange={(e) => setValue('requireMaintenanceApproval', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Require approval for maintenance</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={requireRevaluationApproval} onChange={(e) => setValue('requireRevaluationApproval', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Require approval for revaluation</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={requirePhysicalVerification} onChange={(e) => setValue('requirePhysicalVerification', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Require physical verification for transfers</span></label>
          </div>
        </div>

        {/* Code Generation */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4">Code Generation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="flex items-center gap-2"><input type="checkbox" checked={autoGenerateCode} onChange={(e) => setValue('autoGenerateCode', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Auto-generate asset codes</span></label>
            </div>
            <FormField id="codePrefix" label="Code Prefix" error={errors.codePrefix?.message}>
              {(ariaProps) => (
                <input type="text" {...register('codePrefix')} {...ariaProps} placeholder="e.g., AST" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              )}
            </FormField>
            <FormField id="codePadding" label="Code Padding" error={errors.codePadding?.message}>
              {(ariaProps) => (
                <input type="number" {...register('codePadding')} {...ariaProps} min="1" max="10" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              )}
            </FormField>
            <FormField id="capitalizationThreshold" label="Capitalization Threshold" error={errors.capitalizationThreshold?.message}>
              {(ariaProps) => (
                <input type="number" {...register('capitalizationThreshold')} {...ariaProps} min="0" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              )}
            </FormField>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Bell className="h-5 w-5" />Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={notifyOnDepreciation} onChange={(e) => setValue('notifyOnDepreciation', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Notify on depreciation run</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={notifyOnMaintenanceDue} onChange={(e) => setValue('notifyOnMaintenanceDue', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Notify on maintenance due</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={notifyOnWarrantyExpiry} onChange={(e) => setValue('notifyOnWarrantyExpiry', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Notify on warranty expiry</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={notifyOnDisposal} onChange={(e) => setValue('notifyOnDisposal', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Notify on disposal completion</span></label>
            </div>
            <div className="space-y-4">
              <FormField id="maintenanceReminderDays" label="Maintenance Reminder (Days)" error={errors.maintenanceReminderDays?.message}>
                {(ariaProps) => (
                  <input type="number" {...register('maintenanceReminderDays')} {...ariaProps} min="1" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
                )}
              </FormField>
              <FormField id="warrantyExpiryReminderDays" label="Warranty Expiry Reminder (Days)" error={errors.warrantyExpiryReminderDays?.message}>
                {(ariaProps) => (
                  <input type="number" {...register('warrantyExpiryReminderDays')} {...ariaProps} min="1" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
                )}
              </FormField>
            </div>
          </div>
        </div>

        {/* Barcode Settings */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Barcode className="h-5 w-5" />Barcode & Tracking</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={enableBarcode} onChange={(e) => setValue('enableBarcode', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Enable barcode scanning</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={enableQrCode} onChange={(e) => setValue('enableQrCode', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Enable QR code scanning</span></label>
            </div>
            <FormField id="barcodeFormat" label="Barcode Format" error={errors.barcodeFormat?.message}>
              {(ariaProps) => (
                <input type="text" {...register('barcodeFormat')} {...ariaProps} placeholder="e.g., CODE128" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              )}
            </FormField>
          </div>
        </div>

        {/* Transfer Settings */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4">Transfer Settings</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={allowInterCompanyTransfer} onChange={(e) => setValue('allowInterCompanyTransfer', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Allow inter-company transfers</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={allowInterBranchTransfer} onChange={(e) => setValue('allowInterBranchTransfer', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Allow inter-branch transfers</span></label>
          </div>
        </div>

        {/* Other Settings */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4">Other Settings</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={allowRevaluation} onChange={(e) => setValue('allowRevaluation', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Allow asset revaluation</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={trackImpairment} onChange={(e) => setValue('trackImpairment', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Track impairment losses</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={trackMaintenanceCosts} onChange={(e) => setValue('trackMaintenanceCosts', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Track maintenance costs</span></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={allowMaintenanceScheduling} onChange={(e) => setValue('allowMaintenanceScheduling', e.target.checked, { shouldDirty: true })} className="rounded" /><span className="text-sm">Allow maintenance scheduling</span></label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          {success && <span className="text-green-600 text-sm">Settings saved successfully!</span>}
          {error && <span className="text-red-500 text-sm">{error}</span>}
          <button type="submit" disabled={isSubmitting || !isDirty} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </button>
        </div>
      </form>
    </TenantLayout>
  );
}
