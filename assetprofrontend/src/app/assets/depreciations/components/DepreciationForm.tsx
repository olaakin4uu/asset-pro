'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Calculator, Calendar, FileText } from 'lucide-react';
import { assetsApi } from '@/lib/api/assets';
import type {
  AssetDepreciation,
  CreateAssetDepreciationDto,
  UpdateAssetDepreciationDto,
  Asset,
} from '@/types/assets';
import { extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// SCHEMAS
// ============================================================================

const depreciationSchema = z.object({
  assetId: z.coerce.number().min(1, 'Asset is required'),
  depreciationDate: z.string().min(1, 'Depreciation date is required'),
  fiscalYear: z.string().refine((v) => parseInt(v) >= 2000, 'Valid fiscal year is required'),
  fiscalPeriod: z.string().refine((v) => {
    const n = parseInt(v);
    return n >= 1 && n <= 12;
  }, 'Valid fiscal period (1-12) is required'),
  periodName: z.string(),
  depreciationAmount: z.string(),
  batchNumber: z.string(),
  isAdjustment: z.boolean(),
  adjustmentReason: z.string(),
}).refine(
  (data) => {
    if (data.isAdjustment && !data.adjustmentReason.trim()) return false;
    return true;
  },
  {
    message: 'Adjustment reason is required for adjustments',
    path: ['adjustmentReason'],
  }
);

type DepreciationFormValues = z.infer<typeof depreciationSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface DepreciationFormProps {
  depreciation?: AssetDepreciation;
  assetId?: number;
  onSubmit: (data: CreateAssetDepreciationDto | UpdateAssetDepreciationDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DepreciationForm({
  depreciation,
  assetId: initialAssetId,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}: DepreciationFormProps) {
  const isEditing = !!depreciation;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DepreciationFormValues>({
    resolver: zodResolver(depreciationSchema),
    defaultValues: {
      assetId: depreciation?.assetId || initialAssetId || 0,
      depreciationDate: depreciation?.depreciationDate?.split('T')[0] || '',
      fiscalYear: depreciation?.fiscalYear?.toString() || new Date().getFullYear().toString(),
      fiscalPeriod: depreciation?.fiscalPeriod?.toString() || (new Date().getMonth() + 1).toString(),
      periodName: depreciation?.periodName || '',
      depreciationAmount: depreciation?.depreciationAmount?.toString() || '',
      batchNumber: depreciation?.batchNumber || '',
      isAdjustment: depreciation?.isAdjustment || false,
      adjustmentReason: depreciation?.adjustmentReason || '',
    },
  });

  const watchedIsAdjustment = watch('isAdjustment');

  useEffect(() => {
    const loadAssets = async () => {
      try {
        setLoadingAssets(true);
        const activeAssets = await assetsApi.getActive();
        setAssets(activeAssets);
      } catch (error) {
        console.error('Failed to load assets:', error);
      } finally {
        setLoadingAssets(false);
      }
    };
    loadAssets();
  }, []);

  const onFormSubmit = async (data: DepreciationFormValues) => {
    try {
      const submitData: CreateAssetDepreciationDto | UpdateAssetDepreciationDto = {
        depreciationDate: data.depreciationDate,
        fiscalYear: parseInt(data.fiscalYear),
        fiscalPeriod: parseInt(data.fiscalPeriod),
        periodName: data.periodName || undefined,
        depreciationAmount: data.depreciationAmount ? parseFloat(data.depreciationAmount) : undefined,
        batchNumber: data.batchNumber || undefined,
        isAdjustment: data.isAdjustment,
        adjustmentReason: data.isAdjustment ? data.adjustmentReason : undefined,
      };

      if (!isEditing) {
        (submitData as CreateAssetDepreciationDto).assetId = data.assetId;
      }

      await onSubmit(submitData);
    } catch (error: unknown) {
      setError('root', { message: extractErrorMessage(error, 'Failed to save depreciation') });
    }
  };

  if (loadingAssets) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {errors.root && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      {/* Asset Selection */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Asset Selection
        </h3>
        <FormField id="assetId" label="Asset" required error={errors.assetId?.message}>
          {(props) => (
            <select
              {...props}
              {...register('assetId', { valueAsNumber: true })}
              disabled={isEditing}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value={0}>Select asset...</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetCode} - {asset.name}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </div>

      {/* Period Information */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Period Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField id="depreciationDate" label="Depreciation Date" required error={errors.depreciationDate?.message}>
            {(props) => (
              <input {...props} {...register('depreciationDate')} type="date" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
            )}
          </FormField>
          <FormField id="fiscalYear" label="Fiscal Year" required error={errors.fiscalYear?.message}>
            {(props) => (
              <input {...props} {...register('fiscalYear')} type="number" min="2000" max="2100" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
            )}
          </FormField>
          <FormField id="fiscalPeriod" label="Fiscal Period" required error={errors.fiscalPeriod?.message}>
            {(props) => (
              <select {...props} {...register('fiscalPeriod')} className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    Period {month}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField id="periodName" label="Period Name">
            {(props) => (
              <input {...props} {...register('periodName')} type="text" placeholder="e.g., January 2026" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
            )}
          </FormField>
        </div>
      </div>

      {/* Depreciation Details */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Depreciation Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="depreciationAmount" label="Depreciation Amount" description="Leave empty to auto-calculate based on asset depreciation method">
            {(props) => (
              <input {...props} {...register('depreciationAmount')} type="number" step="0.01" min="0" placeholder="Auto-calculated if empty" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
            )}
          </FormField>
          <FormField id="batchNumber" label="Batch Number">
            {(props) => (
              <input {...props} {...register('batchNumber')} type="text" placeholder="Optional batch reference" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
            )}
          </FormField>
        </div>
      </div>

      {/* Adjustment */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4">Adjustment</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('isAdjustment')} type="checkbox" className="rounded border-gray-300" />
            <span className="text-sm">This is an adjustment entry</span>
          </label>
          {watchedIsAdjustment && (
            <FormField id="adjustmentReason" label="Adjustment Reason" required error={errors.adjustmentReason?.message}>
              {(props) => (
                <textarea
                  {...props}
                  {...register('adjustmentReason')}
                  rows={3}
                  placeholder="Explain the reason for this adjustment"
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </FormField>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="px-4 py-2 rounded-lg border hover:bg-muted">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
