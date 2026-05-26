'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Package, DollarSign, User, FileText } from 'lucide-react';
import { assetsApi } from '@/lib/api/assets';
import type {
  AssetDisposal,
  CreateAssetDisposalDto,
  UpdateAssetDisposalDto,
  Asset,
  DisposalType,
} from '@/types/assets';
import { extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// SCHEMAS
// ============================================================================

const disposalSchema = z.object({
  assetId: z.coerce.number().min(1, 'Asset is required'),
  disposalDate: z.string().min(1, 'Disposal date is required'),
  disposalType: z.string().min(1, 'Disposal type is required'),
  disposalProceeds: z.string(),
  disposalCosts: z.string(),
  buyerName: z.string(),
  buyerContact: z.string(),
  buyerAddress: z.string(),
  saleAgreementNumber: z.string(),
  invoiceNumber: z.string(),
  paymentReceivedDate: z.string(),
  paymentMethod: z.string(),
  reason: z.string(),
  notes: z.string(),
});

type DisposalFormValues = z.infer<typeof disposalSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface DisposalFormProps {
  disposal?: AssetDisposal;
  assetId?: number;
  onSubmit: (data: CreateAssetDisposalDto | UpdateAssetDisposalDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const disposalTypeOptions: { value: DisposalType; label: string }[] = [
  { value: 'sale', label: 'Sale' },
  { value: 'scrap', label: 'Scrap' },
  { value: 'donation', label: 'Donation' },
  { value: 'trade_in', label: 'Trade In' },
  { value: 'theft', label: 'Theft' },
  { value: 'loss', label: 'Loss' },
  { value: 'write_off', label: 'Write Off' },
  { value: 'insurance_claim', label: 'Insurance Claim' },
  { value: 'other', label: 'Other' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function DisposalForm({
  disposal,
  assetId: initialAssetId,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}: DisposalFormProps) {
  const isEditing = !!disposal;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DisposalFormValues>({
    resolver: zodResolver(disposalSchema),
    defaultValues: {
      assetId: disposal?.assetId || initialAssetId || 0,
      disposalDate: disposal?.disposalDate?.split('T')[0] || '',
      disposalType: disposal?.disposalType || 'sale',
      disposalProceeds: disposal?.disposalProceeds?.toString() || '0',
      disposalCosts: disposal?.disposalCosts?.toString() || '0',
      buyerName: disposal?.buyerName || '',
      buyerContact: disposal?.buyerContact || '',
      buyerAddress: disposal?.buyerAddress || '',
      saleAgreementNumber: disposal?.saleAgreementNumber || '',
      invoiceNumber: disposal?.invoiceNumber || '',
      paymentReceivedDate: disposal?.paymentReceivedDate?.split('T')[0] || '',
      paymentMethod: disposal?.paymentMethod || '',
      reason: disposal?.reason || '',
      notes: disposal?.notes || '',
    },
  });

  const watchedDisposalType = watch('disposalType');
  const showBuyerFields = ['sale', 'trade_in', 'donation'].includes(watchedDisposalType);

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

  const onFormSubmit = async (data: DisposalFormValues) => {
    try {
      const submitData: CreateAssetDisposalDto | UpdateAssetDisposalDto = {
        disposalDate: data.disposalDate,
        disposalType: data.disposalType as DisposalType,
        disposalProceeds: parseFloat(data.disposalProceeds) || 0,
        disposalCosts: parseFloat(data.disposalCosts) || 0,
        buyerName: data.buyerName || undefined,
        buyerContact: data.buyerContact || undefined,
        buyerAddress: data.buyerAddress || undefined,
        saleAgreementNumber: data.saleAgreementNumber || undefined,
        invoiceNumber: data.invoiceNumber || undefined,
        paymentReceivedDate: data.paymentReceivedDate || undefined,
        paymentMethod: data.paymentMethod || undefined,
        reason: data.reason || undefined,
        notes: data.notes || undefined,
      };

      if (!isEditing) {
        (submitData as CreateAssetDisposalDto).assetId = data.assetId;
      }

      await onSubmit(submitData);
    } catch (error: unknown) {
      setError('root', { message: extractErrorMessage(error, 'Failed to save disposal') });
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
          <Package className="h-5 w-5" />
          Asset Selection
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
                  <option key={asset.id} value={asset.id}>
                    {asset.assetCode} - {asset.name}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField id="disposalType" label="Disposal Type" required error={errors.disposalType?.message}>
            {(props) => (
              <select
                {...props}
                {...register('disposalType')}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {disposalTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField id="disposalDate" label="Disposal Date" required error={errors.disposalDate?.message}>
            {(props) => (
              <input
                {...props}
                {...register('disposalDate')}
                type="date"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="reason" label="Reason">
            {(props) => (
              <input
                {...props}
                {...register('reason')}
                type="text"
                placeholder="Reason for disposal"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>
      </div>

      {/* Financial Details */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Financial Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="disposalProceeds" label="Disposal Proceeds">
            {(props) => (
              <input
                {...props}
                {...register('disposalProceeds')}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="disposalCosts" label="Disposal Costs">
            {(props) => (
              <input
                {...props}
                {...register('disposalCosts')}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="paymentReceivedDate" label="Payment Received Date">
            {(props) => (
              <input
                {...props}
                {...register('paymentReceivedDate')}
                type="date"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="paymentMethod" label="Payment Method">
            {(props) => (
              <input
                {...props}
                {...register('paymentMethod')}
                type="text"
                placeholder="e.g., Bank Transfer, Cash"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>
      </div>

      {/* Buyer Details */}
      {showBuyerFields && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Buyer Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField id="buyerName" label="Buyer Name">
              {(props) => (
                <input
                  {...props}
                  {...register('buyerName')}
                  type="text"
                  placeholder="Enter buyer name"
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </FormField>
            <FormField id="buyerContact" label="Buyer Contact">
              {(props) => (
                <input
                  {...props}
                  {...register('buyerContact')}
                  type="text"
                  placeholder="Phone or email"
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </FormField>
            <div className="md:col-span-2">
              <FormField id="buyerAddress" label="Buyer Address">
                {(props) => (
                  <textarea
                    {...props}
                    {...register('buyerAddress')}
                    rows={2}
                    placeholder="Enter buyer address"
                    className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </FormField>
            </div>
          </div>
        </div>
      )}

      {/* Documentation */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="saleAgreementNumber" label="Sale Agreement Number">
            {(props) => (
              <input
                {...props}
                {...register('saleAgreementNumber')}
                type="text"
                placeholder="Agreement reference"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="invoiceNumber" label="Invoice Number">
            {(props) => (
              <input
                {...props}
                {...register('invoiceNumber')}
                type="text"
                placeholder="Invoice reference"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <div className="md:col-span-2">
            <FormField id="notes" label="Notes">
              {(props) => (
                <textarea
                  {...props}
                  {...register('notes')}
                  rows={3}
                  placeholder="Additional notes..."
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </FormField>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg border hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
