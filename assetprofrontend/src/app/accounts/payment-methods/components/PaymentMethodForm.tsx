'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X, CreditCard, Banknote, Smartphone, Building2 } from 'lucide-react';
import type { PaymentMethod, CreatePaymentMethodDto, UpdatePaymentMethodDto } from '@/lib/api/accounts';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// PAYMENT TYPES
// ============================================================================

const PAYMENT_TYPES = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
  { value: 'cheque', label: 'Cheque', icon: CreditCard },
];

// ============================================================================
// SCHEMA
// ============================================================================

const paymentMethodSchema = (isEditing: boolean) =>
  z.object({
    name: z.string().min(1, 'Name is required'),
    code: isEditing
      ? z.string()
      : z.string().min(1, 'Code is required'),
    description: z.string(),
    type: z.string().min(1, 'Type is required'),
    isActive: z.boolean(),
    requiresRef: z.boolean(),
  });

type PaymentMethodFormValues = z.infer<ReturnType<typeof paymentMethodSchema>>;

// ============================================================================
// TYPES
// ============================================================================

interface PaymentMethodFormProps {
  paymentMethod?: PaymentMethod;
  onSubmit: (data: CreatePaymentMethodDto | UpdatePaymentMethodDto) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

// ============================================================================
// PAYMENT METHOD FORM COMPONENT
// ============================================================================

export function PaymentMethodForm({
  paymentMethod,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}: PaymentMethodFormProps) {
  const isEditing = !!paymentMethod;

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(paymentMethodSchema(isEditing)),
    defaultValues: {
      name: paymentMethod?.name ?? '',
      code: paymentMethod?.code ?? '',
      description: paymentMethod?.description ?? '',
      type: paymentMethod?.type ?? 'cash',
      isActive: paymentMethod?.isActive ?? true,
      requiresRef: paymentMethod?.requiresRef ?? false,
    },
  });

  // Handle submit
  const onFormSubmit = async (formData: PaymentMethodFormValues) => {
    try {
      if (isEditing) {
        // Update - don't send code
        const updateData: UpdatePaymentMethodDto = {
          name: formData.name,
          description: formData.description || undefined,
          type: formData.type,
          isActive: formData.isActive,
          requiresRef: formData.requiresRef,
        };
        await onSubmit(updateData);
      } else {
        // Create
        const createData: CreatePaymentMethodDto = {
          name: formData.name,
          code: formData.code,
          description: formData.description || undefined,
          type: formData.type,
          isActive: formData.isActive,
          requiresRef: formData.requiresRef,
        };
        await onSubmit(createData);
      }
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to save payment method') });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Error Banner */}
      {errors.root && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 space-y-6">
        {/* Name and Code */}
        <div className="grid grid-cols-2 gap-4">
          <FormField id="name" label="Name" required error={errors.name?.message}>
            {(ariaProps) => (
              <input
                {...ariaProps}
                type="text"
                {...register('name')}
                placeholder="e.g., Cash"
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                  errors.name && 'border-red-500'
                )}
              />
            )}
          </FormField>

          <FormField
            id="code"
            label="Code"
            required={!isEditing}
            error={errors.code?.message}
            description={isEditing ? 'Code cannot be changed' : undefined}
          >
            {(ariaProps) => (
              <input
                {...ariaProps}
                type="text"
                {...register('code', {
                  onChange: (e) => {
                    setValue('code', e.target.value.toUpperCase(), { shouldValidate: true });
                  },
                })}
                placeholder="e.g., CASH"
                disabled={isEditing}
                className={cn(
                  'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary font-mono',
                  isEditing && 'bg-muted cursor-not-allowed',
                  errors.code && 'border-red-500'
                )}
              />
            )}
          </FormField>
        </div>

        {/* Type */}
        <FormField id="type" label="Type" required error={errors.type?.message}>
          {(ariaProps) => (
            <select
              {...ariaProps}
              {...register('type')}
              className={cn(
                'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                errors.type && 'border-red-500'
              )}
            >
              {PAYMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          )}
        </FormField>

        {/* Description */}
        <FormField id="description" label="Description">
          {(ariaProps) => (
            <textarea
              {...ariaProps}
              {...register('description')}
              placeholder="Optional description..."
              rows={3}
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </FormField>

        {/* Checkboxes */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="isActive"
              {...register('isActive')}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">Active</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="requiresRef"
              {...register('requiresRef')}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">Requires Reference Number</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
