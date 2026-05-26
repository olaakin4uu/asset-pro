'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import { branchesApi } from '@/lib/api/core';
import { useCompanyContext } from '@/stores/company-context';
import type { Branch } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// SCHEMA
// ============================================================================

const quickBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required'),
  code: z.string().min(1, 'Branch code is required'),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

type QuickBranchFormValues = z.infer<typeof quickBranchSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface QuickCreateBranchFormProps {
  initialName: string;
  isExpanded: boolean;
  toggleExpand: () => void;
  onSave: (branch: Branch) => void;
  onCancel: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function QuickCreateBranchForm({
  initialName,
  isExpanded,
  toggleExpand,
  onSave,
  onCancel,
}: QuickCreateBranchFormProps) {
  const { companyId } = useCompanyContext();
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuickBranchFormValues>({
    resolver: zodResolver(quickBranchSchema),
    defaultValues: {
      name: initialName,
      code: initialName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10),
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: '',
    },
  });

  const nameValue = watch('name');

  useEffect(() => {
    if (!codeManuallyEdited && nameValue) {
      const suggested = nameValue.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
      setValue('code', suggested);
    }
  }, [nameValue, codeManuallyEdited, setValue]);

  const onFormSubmit = async (data: QuickBranchFormValues) => {
    if (!companyId) {
      setError('root', { message: 'No company selected. Please select a company first.' });
      return;
    }

    try {
      const created = await branchesApi.create({
        companyId,
        name: data.name,
        code: data.code.toUpperCase(),
        email: isExpanded ? (data.email || undefined) : undefined,
        phone: isExpanded ? (data.phone || undefined) : undefined,
        address: isExpanded ? (data.address || undefined) : undefined,
        city: isExpanded ? (data.city || undefined) : undefined,
        state: isExpanded ? (data.state || undefined) : undefined,
        country: isExpanded ? (data.country || undefined) : undefined,
      });
      onSave(created);
    } catch (err: unknown) {
      setError('root', {
        message: extractErrorMessage(err, 'Failed to create branch'),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {errors.root && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
          {errors.root.message}
        </div>
      )}

      <div className="space-y-4">
        {isExpanded ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField id="qc-branch-name" label="Name" required error={errors.name?.message}>
                {(fieldProps) => (
                  <input
                    {...fieldProps}
                    {...register('name')}
                    type="text"
                    placeholder="e.g., Lagos Branch"
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                      errors.name && 'border-red-500',
                    )}
                  />
                )}
              </FormField>

              <FormField id="qc-branch-code" label="Code" required error={errors.code?.message}>
                {(fieldProps) => (
                  <input
                    {...fieldProps}
                    {...register('code', {
                      setValueAs: (v: string) => v.toUpperCase(),
                      onChange: () => setCodeManuallyEdited(true),
                    })}
                    type="text"
                    placeholder="e.g., LG"
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono',
                      errors.code && 'border-red-500',
                    )}
                  />
                )}
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField id="qc-branch-email" label="Email">
                {(fieldProps) => (
                  <input
                    {...fieldProps}
                    {...register('email')}
                    type="email"
                    placeholder="branch@company.com"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </FormField>

              <FormField id="qc-branch-phone" label="Phone">
                {(fieldProps) => (
                  <input
                    {...fieldProps}
                    {...register('phone')}
                    type="text"
                    placeholder="+234..."
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </FormField>
            </div>

            <FormField id="qc-branch-address" label="Address">
              {(fieldProps) => (
                <input
                  {...fieldProps}
                  {...register('address')}
                  type="text"
                  placeholder="Street address"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
            </FormField>

            <div className="grid grid-cols-3 gap-4">
              <FormField id="qc-branch-city" label="City">
                {(fieldProps) => (
                  <input
                    {...fieldProps}
                    {...register('city')}
                    type="text"
                    placeholder="City"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </FormField>

              <FormField id="qc-branch-state" label="State">
                {(fieldProps) => (
                  <input
                    {...fieldProps}
                    {...register('state')}
                    type="text"
                    placeholder="State"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </FormField>

              <FormField id="qc-branch-country" label="Country">
                {(fieldProps) => (
                  <input
                    {...fieldProps}
                    {...register('country')}
                    type="text"
                    placeholder="Country"
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </FormField>
            </div>
          </>
        ) : (
          <>
            <FormField id="qc-branch-name" label="Name" required error={errors.name?.message}>
              {(fieldProps) => (
                <input
                  {...fieldProps}
                  {...register('name')}
                  type="text"
                  placeholder="e.g., Lagos Branch"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                    errors.name && 'border-red-500',
                  )}
                />
              )}
            </FormField>

            <FormField id="qc-branch-code" label="Code" required error={errors.code?.message}>
              {(fieldProps) => (
                <input
                  {...fieldProps}
                  {...register('code', {
                    setValueAs: (v: string) => v.toUpperCase(),
                    onChange: () => setCodeManuallyEdited(true),
                  })}
                  type="text"
                  placeholder="e.g., LG"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono',
                    errors.code && 'border-red-500',
                  )}
                />
              )}
            </FormField>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={toggleExpand}
        className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
      >
        {isExpanded ? (
          <>
            <ChevronLeft className="h-4 w-4" />
            Less Details
          </>
        ) : (
          <>
            <ChevronRight className="h-4 w-4" />
            More Details
          </>
        )}
      </button>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
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
            <Plus className="h-4 w-4" />
          )}
          Create Branch
        </button>
      </div>
    </form>
  );
}
