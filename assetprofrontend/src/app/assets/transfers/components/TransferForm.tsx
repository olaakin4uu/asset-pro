'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Package, MapPin, FileText } from 'lucide-react';
import { assetsApi } from '@/lib/api/assets';
import type {
  AssetTransfer,
  CreateAssetTransferDto,
  UpdateAssetTransferDto,
  Asset,
  TransferType,
  AssetCondition,
} from '@/types/assets';
import { extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// SCHEMAS
// ============================================================================

const transferSchema = z.object({
  assetId: z.coerce.number().min(1, 'Asset is required'),
  transferDate: z.string().min(1, 'Transfer date is required'),
  effectiveDate: z.string(),
  transferType: z.string().min(1, 'Transfer type is required'),
  toLocation: z.string(),
  toDepartment: z.string(),
  conditionAtTransfer: z.string(),
  conditionNotes: z.string(),
  reason: z.string(),
  notes: z.string(),
});

type TransferFormValues = z.infer<typeof transferSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface TransferFormProps {
  transfer?: AssetTransfer;
  assetId?: number;
  onSubmit: (data: CreateAssetTransferDto | UpdateAssetTransferDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const transferTypeOptions: { value: TransferType; label: string }[] = [
  { value: 'location', label: 'Location Transfer' },
  { value: 'department', label: 'Department Transfer' },
  { value: 'custodian', label: 'Custodian Transfer' },
  { value: 'branch', label: 'Branch Transfer' },
  { value: 'company', label: 'Company Transfer' },
];

const conditionOptions: { value: AssetCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function TransferForm({
  transfer,
  assetId: initialAssetId,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}: TransferFormProps) {
  const isEditing = !!transfer;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      assetId: transfer?.assetId || initialAssetId || 0,
      transferDate: transfer?.transferDate?.split('T')[0] || '',
      effectiveDate: transfer?.effectiveDate?.split('T')[0] || '',
      transferType: transfer?.transferType || 'location',
      toLocation: transfer?.toLocation || '',
      toDepartment: transfer?.toDepartment || '',
      conditionAtTransfer: transfer?.conditionAtTransfer || 'good',
      conditionNotes: transfer?.conditionNotes || '',
      reason: transfer?.reason || '',
      notes: transfer?.notes || '',
    },
  });

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

  const onFormSubmit = async (data: TransferFormValues) => {
    try {
      const submitData: CreateAssetTransferDto | UpdateAssetTransferDto = {
        transferDate: data.transferDate,
        effectiveDate: data.effectiveDate || undefined,
        transferType: data.transferType as TransferType,
        toLocation: data.toLocation || undefined,
        toDepartment: data.toDepartment || undefined,
        conditionAtTransfer: data.conditionAtTransfer as AssetCondition,
        conditionNotes: data.conditionNotes || undefined,
        reason: data.reason || undefined,
        notes: data.notes || undefined,
      };

      if (!isEditing) {
        (submitData as CreateAssetTransferDto).assetId = data.assetId;
      }

      await onSubmit(submitData);
    } catch (error: unknown) {
      setError('root', { message: extractErrorMessage(error, 'Failed to save transfer') });
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

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Transfer Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <option key={asset.id} value={asset.id}>{asset.assetCode} - {asset.name}</option>
                ))}
              </select>
            )}
          </FormField>
          <FormField id="transferType" label="Transfer Type" required error={errors.transferType?.message}>
            {(props) => (
              <select
                {...props}
                {...register('transferType')}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {transferTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
          </FormField>
          <FormField id="transferDate" label="Transfer Date" required error={errors.transferDate?.message}>
            {(props) => (
              <input
                {...props}
                {...register('transferDate')}
                type="date"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="effectiveDate" label="Effective Date">
            {(props) => (
              <input
                {...props}
                {...register('effectiveDate')}
                type="date"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Destination
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="toLocation" label="To Location">
            {(props) => (
              <input {...props} {...register('toLocation')} type="text" placeholder="New location" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
            )}
          </FormField>
          <FormField id="toDepartment" label="To Department">
            {(props) => (
              <input {...props} {...register('toDepartment')} type="text" placeholder="New department" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
            )}
          </FormField>
          <FormField id="conditionAtTransfer" label="Condition at Transfer">
            {(props) => (
              <select {...props} {...register('conditionAtTransfer')} className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                {conditionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
          </FormField>
          <FormField id="conditionNotes" label="Condition Notes">
            {(props) => (
              <input {...props} {...register('conditionNotes')} type="text" placeholder="Any condition notes" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
            )}
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Additional Information
        </h3>
        <div className="space-y-4">
          <FormField id="reason" label="Reason for Transfer">
            {(props) => (
              <input {...props} {...register('reason')} type="text" placeholder="Why is this asset being transferred?" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
            )}
          </FormField>
          <FormField id="notes" label="Notes">
            {(props) => (
              <textarea {...props} {...register('notes')} rows={3} placeholder="Additional notes..." className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
            )}
          </FormField>
        </div>
      </div>

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
