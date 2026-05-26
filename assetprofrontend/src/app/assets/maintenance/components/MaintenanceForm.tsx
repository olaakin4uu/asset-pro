'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Wrench, Calendar, DollarSign, FileText } from 'lucide-react';
import { assetsApi } from '@/lib/api/assets';
import type { AssetMaintenance, CreateAssetMaintenanceDto, UpdateAssetMaintenanceDto, Asset, MaintenanceType, MaintenancePriority, RecurrenceFrequency } from '@/types/assets';
import { extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// SCHEMAS
// ============================================================================

const maintenanceSchema = z.object({
  assetId: z.coerce.number().min(1, 'Asset is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  maintenanceType: z.string().min(1, 'Maintenance type is required'),
  priority: z.string(),
  scheduledDate: z.string(),
  dueDate: z.string(),
  estimatedDurationHours: z.string(),
  isRecurring: z.boolean(),
  recurrenceFrequency: z.string(),
  recurrenceInterval: z.string(),
  vendorName: z.string(),
  vendorContact: z.string(),
  technicianName: z.string(),
  estimatedCost: z.string(),
  notes: z.string(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface MaintenanceFormProps {
  maintenance?: AssetMaintenance;
  assetId?: number;
  onSubmit: (data: CreateAssetMaintenanceDto | UpdateAssetMaintenanceDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const maintenanceTypeOptions: { value: MaintenanceType; label: string }[] = [
  { value: 'preventive', label: 'Preventive' }, { value: 'corrective', label: 'Corrective' },
  { value: 'predictive', label: 'Predictive' }, { value: 'condition_based', label: 'Condition Based' },
  { value: 'emergency', label: 'Emergency' }, { value: 'routine', label: 'Routine' },
];

const priorityOptions: { value: MaintenancePriority; label: string }[] = [
  { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' },
];

const frequencyOptions: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-Weekly' }, { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' }, { value: 'semi_annually', label: 'Semi-Annually' },
  { value: 'annually', label: 'Annually' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function MaintenanceForm({ maintenance, assetId: initialAssetId, onSubmit, onCancel, submitLabel = 'Save' }: MaintenanceFormProps) {
  const isEditing = !!maintenance;
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      assetId: maintenance?.assetId || initialAssetId || 0,
      title: maintenance?.title || '',
      description: maintenance?.description || '',
      maintenanceType: maintenance?.maintenanceType || 'preventive',
      priority: maintenance?.priority || 'medium',
      scheduledDate: maintenance?.scheduledDate?.split('T')[0] || '',
      dueDate: maintenance?.dueDate?.split('T')[0] || '',
      estimatedDurationHours: maintenance?.estimatedDurationHours?.toString() || '',
      isRecurring: maintenance?.isRecurring || false,
      recurrenceFrequency: maintenance?.recurrenceFrequency || 'monthly',
      recurrenceInterval: maintenance?.recurrenceInterval?.toString() || '1',
      vendorName: maintenance?.vendorName || '',
      vendorContact: maintenance?.vendorContact || '',
      technicianName: maintenance?.technicianName || '',
      estimatedCost: maintenance?.estimatedCost?.toString() || '',
      notes: maintenance?.notes || '',
    },
  });

  const watchedIsRecurring = watch('isRecurring');

  useEffect(() => {
    const loadAssets = async () => {
      try {
        setLoadingAssets(true);
        const activeAssets = await assetsApi.getActive();
        setAssets(activeAssets);
      } catch (error) { console.error('Failed to load assets:', error); }
      finally { setLoadingAssets(false); }
    };
    loadAssets();
  }, []);

  const onFormSubmit = async (data: MaintenanceFormValues) => {
    try {
      const submitData: CreateAssetMaintenanceDto | UpdateAssetMaintenanceDto = {
        title: data.title,
        description: data.description || undefined,
        maintenanceType: data.maintenanceType as MaintenanceType,
        priority: data.priority as MaintenancePriority,
        scheduledDate: data.scheduledDate || undefined,
        dueDate: data.dueDate || undefined,
        estimatedDurationHours: data.estimatedDurationHours ? parseFloat(data.estimatedDurationHours) : undefined,
        isRecurring: data.isRecurring,
        recurrenceFrequency: data.isRecurring ? data.recurrenceFrequency as RecurrenceFrequency : undefined,
        recurrenceInterval: data.isRecurring && data.recurrenceInterval ? parseInt(data.recurrenceInterval) : undefined,
        vendorName: data.vendorName || undefined,
        vendorContact: data.vendorContact || undefined,
        technicianName: data.technicianName || undefined,
        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : undefined,
        notes: data.notes || undefined,
      };
      if (!isEditing) (submitData as CreateAssetMaintenanceDto).assetId = data.assetId;
      await onSubmit(submitData);
    } catch (error: unknown) {
      setError('root', { message: extractErrorMessage(error, 'Failed to save maintenance record') });
    }
  };

  if (loadingAssets) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {errors.root && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Wrench className="h-5 w-5" />Maintenance Details</h3>
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
                {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.assetCode} - {asset.name}</option>)}
              </select>
            )}
          </FormField>
          <FormField id="title" label="Title" required error={errors.title?.message}>
            {(props) => (
              <input
                {...props}
                {...register('title')}
                type="text"
                placeholder="Maintenance title"
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </FormField>
          <FormField id="maintenanceType" label="Type" required error={errors.maintenanceType?.message}>
            {(props) => (
              <select
                {...props}
                {...register('maintenanceType')}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {maintenanceTypeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            )}
          </FormField>
          <FormField id="priority" label="Priority">
            {(props) => (
              <select
                {...props}
                {...register('priority')}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {priorityOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            )}
          </FormField>
          <div className="md:col-span-2">
            <FormField id="description" label="Description">
              {(props) => (
                <textarea
                  {...props}
                  {...register('description')}
                  rows={3}
                  placeholder="Describe the maintenance work"
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </FormField>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="h-5 w-5" />Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField id="scheduledDate" label="Scheduled Date">
            {(props) => <input {...props} {...register('scheduledDate')} type="date" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />}
          </FormField>
          <FormField id="dueDate" label="Due Date">
            {(props) => <input {...props} {...register('dueDate')} type="date" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />}
          </FormField>
          <FormField id="estimatedDurationHours" label="Est. Duration (Hours)">
            {(props) => <input {...props} {...register('estimatedDurationHours')} type="number" step="0.5" min="0" placeholder="e.g., 2" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />}
          </FormField>
        </div>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('isRecurring')} type="checkbox" className="rounded border-gray-300" />
            <span className="text-sm">This is a recurring maintenance</span>
          </label>
          {watchedIsRecurring && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
              <FormField id="recurrenceFrequency" label="Frequency">
                {(props) => (
                  <select {...props} {...register('recurrenceFrequency')} className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                    {frequencyOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                )}
              </FormField>
              <FormField id="recurrenceInterval" label="Interval">
                {(props) => <input {...props} {...register('recurrenceInterval')} type="number" min="1" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />}
              </FormField>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5" />Vendor & Cost</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="vendorName" label="Vendor Name">
            {(props) => <input {...props} {...register('vendorName')} type="text" placeholder="Service provider" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />}
          </FormField>
          <FormField id="vendorContact" label="Vendor Contact">
            {(props) => <input {...props} {...register('vendorContact')} type="text" placeholder="Phone or email" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />}
          </FormField>
          <FormField id="technicianName" label="Technician Name">
            {(props) => <input {...props} {...register('technicianName')} type="text" placeholder="Assigned technician" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />}
          </FormField>
          <FormField id="estimatedCost" label="Estimated Cost">
            {(props) => <input {...props} {...register('estimatedCost')} type="number" step="0.01" min="0" placeholder="0.00" className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />}
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4">Notes</h3>
        <textarea {...register('notes')} id="notes" rows={3} placeholder="Additional notes..." className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div className="flex items-center justify-end gap-4">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="px-4 py-2 rounded-lg border hover:bg-muted">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitLabel}</button>
      </div>
    </form>
  );
}
