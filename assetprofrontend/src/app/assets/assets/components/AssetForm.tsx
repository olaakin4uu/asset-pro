'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Package, MapPin, DollarSign, Calculator, Shield, FileText, Users, Braces } from 'lucide-react';
import { assetClassesApi } from '@/lib/api/assets';
import type {
  Asset,
  AssetClass,
  CreateAssetDto,
  UpdateAssetDto,
  DepreciationMethod,
  AssetStatus,
  AssetCondition,
  AcquisitionMethod,
} from '@/types/assets';
import { extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp/FormField';

// ============================================================================
// SCHEMAS
// ============================================================================

const assetSchema = z.object({
  assetClassId: z.coerce.number().min(1, 'Asset class is required'),
  assetCode: z.string(),
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
  serialNumber: z.string(),
  barcode: z.string(),
  location: z.string(),
  department: z.string(),
  custodianUserId: z.string(),
  supplierId: z.string(),
  acquisitionDate: z.string(),
  acquisitionCost: z.string().refine((v) => v !== '' && parseFloat(v) > 0, 'Valid acquisition cost is required'),
  acquisitionMethod: z.string(),
  purchaseOrderNumber: z.string(),
  invoiceNumber: z.string(),
  depreciationMethod: z.string(),
  usefulLifeYears: z.string(),
  residualValue: z.string(),
  residualValuePercent: z.string(),
  depreciationStartDate: z.string(),
  status: z.string(),
  condition: z.string(),
  warrantyStartDate: z.string(),
  warrantyExpiryDate: z.string(),
  notes: z.string(),
  customFields: z.string(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface AssetFormProps {
  asset?: Asset;
  onSubmit: (data: CreateAssetDto | UpdateAssetDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const depreciationMethodOptions: { value: DepreciationMethod; label: string }[] = [
  { value: 'STRAIGHT_LINE', label: 'Straight Line' },
  { value: 'DECLINING_BALANCE', label: 'Declining Balance' },
  { value: 'UNITS_OF_PRODUCTION', label: 'Units of Production' },
  { value: 'SUM_OF_YEARS_DIGITS', label: 'Sum of Years Digits' },
];

const statusOptions: { value: AssetStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'under_maintenance', label: 'Under Maintenance' },
  { value: 'disposed', label: 'Disposed' },
];

const conditionOptions: { value: AssetCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' },
];

const acquisitionMethodOptions: { value: AcquisitionMethod; label: string }[] = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'donation', label: 'Donation' },
  { value: 'lease', label: 'Lease' },
  { value: 'construction', label: 'Construction' },
  { value: 'trade_in', label: 'Trade In' },
  { value: 'other', label: 'Other' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function AssetForm({ asset, onSubmit, onCancel, submitLabel = 'Save' }: AssetFormProps) {
  const isEditing = !!asset;

  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      assetClassId: asset?.assetClassId || 0,
      assetCode: asset?.assetCode || '',
      name: asset?.name || '',
      description: asset?.description || '',
      serialNumber: asset?.serialNumber || '',
      barcode: asset?.barcode || '',
      location: asset?.location || '',
      department: asset?.department || '',
      custodianUserId: asset?.custodianUserId?.toString() || '',
      supplierId: asset?.supplierId?.toString() || '',
      acquisitionDate: asset?.acquisitionDate?.split('T')[0] || '',
      acquisitionCost: asset?.acquisitionCost?.toString() || '',
      acquisitionMethod: asset?.acquisitionMethod || 'purchase',
      purchaseOrderNumber: asset?.purchaseOrderNumber || '',
      invoiceNumber: asset?.invoiceNumber || '',
      depreciationMethod: asset?.depreciationMethod || 'STRAIGHT_LINE',
      usefulLifeYears: asset?.usefulLifeYears?.toString() || '',
      residualValue: asset?.residualValue?.toString() || '',
      residualValuePercent: asset?.residualValuePercent?.toString() || '',
      depreciationStartDate: asset?.depreciationStartDate?.split('T')[0] || '',
      status: asset?.status || 'active',
      condition: asset?.condition || 'new',
      warrantyStartDate: asset?.warrantyStartDate?.split('T')[0] || '',
      warrantyExpiryDate: asset?.warrantyExpiryDate?.split('T')[0] || '',
      notes: asset?.notes || '',
      customFields: asset?.customFields ? JSON.stringify(asset.customFields, null, 2) : '',
    },
  });

  useEffect(() => {
    const loadAssetClasses = async () => {
      try {
        setLoadingClasses(true);
        const classes = await assetClassesApi.getActive();
        setAssetClasses(classes);

        // Pre-fill depreciation fields from first class
        if (!isEditing && classes.length > 0 && !asset?.assetClassId) {
          const firstClass = classes[0];
          setValue('assetClassId', firstClass.id);
          setValue('depreciationMethod', firstClass.depreciationMethod);
          setValue('usefulLifeYears', firstClass.usefulLifeYears.toString());
          setValue('residualValuePercent', firstClass.residualValuePercent.toString());
        }
      } catch (error) {
        console.error('Failed to load asset classes:', error);
      } finally {
        setLoadingClasses(false);
      }
    };
    loadAssetClasses();
  }, [isEditing, asset?.assetClassId, setValue]);

  const handleClassChange = (classId: number) => {
    const selectedClass = assetClasses.find((c) => c.id === classId);
    if (selectedClass) {
      setValue('assetClassId', classId);
      setValue('depreciationMethod', selectedClass.depreciationMethod);
      setValue('usefulLifeYears', selectedClass.usefulLifeYears.toString());
      setValue('residualValuePercent', selectedClass.residualValuePercent.toString());
    }
  };

  const onFormSubmit = async (data: AssetFormValues) => {
    // Validate custom fields JSON
    let parsedCustomFields: Record<string, unknown> | undefined;
    if (data.customFields.trim()) {
      try {
        parsedCustomFields = JSON.parse(data.customFields);
      } catch {
        setError('customFields', { message: 'Invalid JSON format' });
        return;
      }
    }

    try {
      const submitData: CreateAssetDto | UpdateAssetDto = {
        assetClassId: data.assetClassId,
        name: data.name,
        description: data.description || undefined,
        serialNumber: data.serialNumber || undefined,
        barcode: data.barcode || undefined,
        location: data.location || undefined,
        department: data.department || undefined,
        custodianUserId: data.custodianUserId ? parseInt(data.custodianUserId) : undefined,
        supplierId: data.supplierId ? parseInt(data.supplierId) : undefined,
        acquisitionDate: data.acquisitionDate || undefined,
        acquisitionCost: parseFloat(data.acquisitionCost),
        acquisitionMethod: data.acquisitionMethod as AcquisitionMethod,
        purchaseOrderNumber: data.purchaseOrderNumber || undefined,
        invoiceNumber: data.invoiceNumber || undefined,
        depreciationMethod: data.depreciationMethod as DepreciationMethod,
        usefulLifeYears: data.usefulLifeYears ? parseInt(data.usefulLifeYears) : undefined,
        residualValue: data.residualValue ? parseFloat(data.residualValue) : undefined,
        residualValuePercent: data.residualValuePercent
          ? parseFloat(data.residualValuePercent)
          : undefined,
        depreciationStartDate: data.depreciationStartDate || undefined,
        status: data.status as AssetStatus,
        condition: data.condition as AssetCondition,
        warrantyStartDate: data.warrantyStartDate || undefined,
        warrantyExpiryDate: data.warrantyExpiryDate || undefined,
        notes: data.notes || undefined,
        customFields: parsedCustomFields,
      };

      if (!isEditing) {
        (submitData as CreateAssetDto).assetCode = data.assetCode || undefined;
      }

      await onSubmit(submitData);
    } catch (error: unknown) {
      setError('root', { message: extractErrorMessage(error, 'Failed to save asset') });
    }
  };

  if (loadingClasses) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
      {errors.root && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      {/* Basic Information */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="assetClassId" label="Asset Class" required error={errors.assetClassId?.message}>
            {(ariaProps) => (
              <select
                {...ariaProps}
                {...register('assetClassId', {
                  valueAsNumber: true,
                  onChange: (e) => handleClassChange(parseInt(e.target.value)),
                })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={0}>Select asset class...</option>
                {assetClasses.map((ac) => (
                  <option key={ac.id} value={ac.id}>
                    {ac.code} - {ac.name}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          {!isEditing && (
            <FormField id="assetCode" label="Asset Code">
              {(ariaProps) => (
                <input
                  {...ariaProps}
                  {...register('assetCode')}
                  type="text"
                  placeholder="Auto-generated if empty"
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </FormField>
          )}
          <FormField id="name" label="Name" required error={errors.name?.message} className={!isEditing ? '' : 'md:col-span-2'}>
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('name')}
                type="text"
                placeholder="Enter asset name"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="serialNumber" label="Serial Number">
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('serialNumber')}
                type="text"
                placeholder="Enter serial number"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="barcode" label="Barcode">
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('barcode')}
                type="text"
                placeholder="Enter barcode"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="description" label="Description" className="md:col-span-2">
            {(ariaProps) => (
              <textarea
                {...ariaProps}
                {...register('description')}
                rows={3}
                placeholder="Enter description"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>
      </div>

      {/* Location & Custody */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location & Custody
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="location" label="Location">
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('location')}
                type="text"
                placeholder="Enter location"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="department" label="Department">
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('department')}
                type="text"
                placeholder="Enter department"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>
      </div>

      {/* Custodian & Supplier */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Custodian & Supplier
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="custodianUserId" label="Custodian User ID" error={errors.custodianUserId?.message}>
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('custodianUserId')}
                type="number"
                min="1"
                placeholder="Enter custodian user ID"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="supplierId" label="Supplier ID" error={errors.supplierId?.message}>
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('supplierId')}
                type="number"
                min="1"
                placeholder="Enter supplier ID"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>
      </div>

      {/* Acquisition */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Acquisition Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField id="acquisitionCost" label="Acquisition Cost" required error={errors.acquisitionCost?.message}>
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('acquisitionCost')}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="acquisitionDate" label="Acquisition Date">
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('acquisitionDate')}
                type="date"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="acquisitionMethod" label="Acquisition Method">
            {(ariaProps) => (
              <select
                {...ariaProps}
                {...register('acquisitionMethod')}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {acquisitionMethodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField id="purchaseOrderNumber" label="Purchase Order #">
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('purchaseOrderNumber')}
                type="text"
                placeholder="Enter PO number"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="invoiceNumber" label="Invoice #">
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('invoiceNumber')}
                type="text"
                placeholder="Enter invoice number"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>
      </div>

      {/* Depreciation */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Depreciation Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField id="depreciationMethod" label="Depreciation Method">
            {(ariaProps) => (
              <select
                {...ariaProps}
                {...register('depreciationMethod')}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {depreciationMethodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField id="usefulLifeYears" label="Useful Life (Years)">
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('usefulLifeYears')}
                type="number"
                min="1"
                placeholder="e.g., 5"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="residualValue" label="Residual Value" error={errors.residualValue?.message}>
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('residualValue')}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="residualValuePercent" label="Residual Value %">
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('residualValuePercent')}
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="e.g., 10"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="depreciationStartDate" label="Depreciation Start Date">
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('depreciationStartDate')}
                type="date"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>
      </div>

      {/* Status & Condition */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Status & Condition
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="status" label="Status">
            {(ariaProps) => (
              <select
                {...ariaProps}
                {...register('status')}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField id="condition" label="Condition">
            {(ariaProps) => (
              <select
                {...ariaProps}
                {...register('condition')}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {conditionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
      </div>

      {/* Warranty */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Warranty Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="warrantyStartDate" label="Warranty Start Date">
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('warrantyStartDate')}
                type="date"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="warrantyExpiryDate" label="Warranty Expiry Date">
            {(ariaProps) => (
              <input
                {...ariaProps}
                {...register('warrantyExpiryDate')}
                type="date"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4">Additional Notes</h3>
        <FormField id="notes" label="Notes">
          {(ariaProps) => (
            <textarea
              {...ariaProps}
              {...register('notes')}
              rows={4}
              placeholder="Enter any additional notes..."
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </FormField>
      </div>

      {/* Custom Fields */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Braces className="h-5 w-5" />
          Custom Fields
        </h3>
        <FormField id="customFields" label="Custom Fields (JSON)" error={errors.customFields?.message} description="Enter custom fields as JSON">
          {(ariaProps) => (
            <textarea
              {...ariaProps}
              {...register('customFields')}
              rows={4}
              placeholder='{"key": "value"}'
              className="w-full rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </FormField>
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
