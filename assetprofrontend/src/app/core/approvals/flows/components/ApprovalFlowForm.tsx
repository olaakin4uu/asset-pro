'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, GitBranch, Lock } from 'lucide-react';
import { approvableEntitiesApi } from '@/lib/api/approvals';
import { rolesApi, branchesApi } from '@/lib/api/core';
import { employeesApi } from '@/lib/api/hrpayroll';
import type { Branch } from '@/types/core';
import type {
  ApprovalFlow,
  CreateApprovalFlowDto,
  UpdateApprovalFlowDto,
  CreateApprovalFlowStepDto,
  ApprovableEntityType,
  ApproverType,
  ApprovalMode,
  ApprovalActionType,
} from '@/types/approvals';
import type { Role } from '@/types/core';
import type { Employee } from '@/types/hrpayroll';
import { cn, extractErrorMessage } from '@/lib/utils';
import { FormField } from '@/components/erp';

// ============================================================================
// SCHEMAS
// ============================================================================

const flowSchema = z.object({
  name: z.string().min(1, 'Flow name is required'),
  description: z.string(),
  entitySlug: z.string(), // validation handled in onFormSubmit (optional when editing)
  entityType: z.string(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  priority: z.coerce.number().min(1).max(100),
  autoSubmit: z.boolean(),
  parallelApproval: z.boolean(),
});

type FlowFormValues = z.infer<typeof flowSchema>;

// ============================================================================
// TYPES
// ============================================================================

interface ApprovalFlowFormProps {
  flow?: ApprovalFlow;
  onSubmit: (data: CreateApprovalFlowDto | UpdateApprovalFlowDto, steps?: CreateApprovalFlowStepDto[]) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

interface StepFormData {
  id?: number;
  stepNumber: number;
  name: string;
  description: string;
  approverType: ApproverType;
  approverIds: number[];
  approvalMode: ApprovalMode;
  action: ApprovalActionType;
  isRequired: boolean;
  timeoutHours: number | null;
  escalationUserId: number | null;
  isActive: boolean;
  isExpanded: boolean;
  // Branch scope
  branchScope: string; // 'all' | 'specific'
  branchId: number | null;
  // Protected flags
  isLocked: boolean;
  isFinalStep: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

// Entity types that require a hardcoded final processing step.
// This step is always last, locked, and not editable by the user.
const HARDCODED_FINAL_STEPS: Record<string, { name: string; description: string }> = {
  bank_transfers: { name: 'Transfer Processing', description: 'Final step: post the transfer to GL and update bank balances' },
  supplier_payments: { name: 'Payment Processing', description: 'Final step: cashier selects bank, payment method, and processes payment' },
};

export function ApprovalFlowForm({
  flow,
  onSubmit,
  onCancel,
  submitLabel = 'Save Flow',
}: ApprovalFlowFormProps) {
  const isEditing = !!flow;

  // Master data
  const [entityTypes, setEntityTypes] = useState<ApprovableEntityType[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingMasterData, setLoadingMasterData] = useState(true);

  // Steps managed outside react-hook-form due to complex reordering, expansion,
  // and nested checkbox selection that don't map well to useFieldArray
  const [steps, setSteps] = useState<StepFormData[]>(() => {
    const mapped: StepFormData[] = flow?.steps?.map((s, idx) => ({
      id: s.id,
      stepNumber: s.stepNumber,
      name: s.name,
      description: s.description || '',
      approverType: s.approverType,
      approverIds: s.approverIds ?? [],
      approvalMode: s.approvalMode,
      action: s.action || 'APPROVE',
      isRequired: s.isRequired ?? true,
      timeoutHours: s.timeoutHours || null,
      escalationUserId: s.escalationUserId || null,
      isActive: s.isActive,
      isExpanded: idx === 0,
      branchScope: s.branchScope || 'all',
      branchId: s.branchId || null,
      isLocked: s.isLocked ?? false,
      isFinalStep: s.isFinalStep ?? false,
    })) ?? [];

    // Auto-inject hardcoded final step if the entity type requires one but flow doesn't have it
    if (flow?.entityType) {
      const finalDef = HARDCODED_FINAL_STEPS[flow.entityType];
      if (finalDef && !mapped.some((s) => s.isFinalStep)) {
        mapped.push({
          stepNumber: mapped.length + 1,
          name: finalDef.name,
          description: finalDef.description,
          approverType: 'role',
          approverIds: [],
          approvalMode: 'any',
          action: 'APPROVE',
          isRequired: true,
          timeoutHours: null,
          escalationUserId: null,
          isActive: true,
          isExpanded: false,
          branchScope: 'all',
          branchId: null,
          isLocked: true,
          isFinalStep: true,
        });
      }
    }

    return mapped;
  });

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FlowFormValues>({
    resolver: zodResolver(flowSchema),
    defaultValues: {
      name: flow?.name ?? '',
      description: flow?.description ?? '',
      entityType: flow?.entityType ?? '',
      entitySlug: flow?.entitySlug ?? '',
      isActive: flow?.isActive ?? true,
      isDefault: flow?.isDefault ?? false,
      priority: flow?.priority ?? 10,
      autoSubmit: flow?.autoSubmit ?? false,
      parallelApproval: flow?.parallelApproval ?? false,
    },
  });

  // Re-initialize steps when the server data updates (guards against stale TanStack Query cache
  // being used as the lazy-init value for useState, then the fresh fetch arriving too late)
  const flowUpdatedAt = flow?.updatedAt;
  const flowId = flow?.id;
  useEffect(() => {
    if (!flow?.steps) return;
    const mapped: StepFormData[] = flow.steps.map((s, idx) => ({
      id: s.id,
      stepNumber: s.stepNumber,
      name: s.name,
      description: s.description || '',
      approverType: s.approverType,
      approverIds: s.approverIds ?? [],
      approvalMode: s.approvalMode,
      action: s.action || 'APPROVE',
      isRequired: s.isRequired ?? true,
      timeoutHours: s.timeoutHours || null,
      escalationUserId: s.escalationUserId || null,
      isActive: s.isActive,
      isExpanded: idx === 0,
      branchScope: s.branchScope || 'all',
      branchId: s.branchId || null,
      isLocked: s.isLocked ?? false,
      isFinalStep: s.isFinalStep ?? false,
    }));
    setSteps(mapped);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, flowUpdatedAt]);

  // Load master data
  useEffect(() => {
    const loadMasterData = async () => {
      setLoadingMasterData(true);
      try {
        const [entitiesResult, rolesResult, employeesResult, branchesResult] = await Promise.allSettled([
          approvableEntitiesApi.list(),
          rolesApi.list({ limit: 100 }),
          employeesApi.list({ limit: 500 }),
          branchesApi.list({ limit: 200 }),
        ]);

        if (entitiesResult.status === 'fulfilled') {
          setEntityTypes(entitiesResult.value);
          // Auto-populate entitySlug when editing a flow that has entityType but no entitySlug
          // (e.g. seeded flows that only have approvableType set in the DB)
          if (isEditing && !flow?.entitySlug && flow?.entityType) {
            const match = entitiesResult.value.find(
              (e) => e.entityType === flow.entityType || e.entitySlug === flow.entityType,
            );
            if (match) {
              setValue('entitySlug', match.entitySlug);
              setValue('entityType', match.entityType);
            }
          }
        }
        if (rolesResult.status === 'fulfilled') setRoles(rolesResult.value.data);
        if (employeesResult.status === 'fulfilled') setEmployees(employeesResult.value.data);
        if (branchesResult.status === 'fulfilled') setBranches(branchesResult.value.data);
      } catch (err: unknown) {
        console.error('Failed to load master data', err);
      } finally {
        setLoadingMasterData(false);
      }
    };
    loadMasterData();
  }, []);

  // Handle entity type selection
  const handleEntityTypeChange = (entitySlug: string) => {
    const entity = entityTypes.find((e) => e.entitySlug === entitySlug);
    if (entity) {
      setValue('entityType', entity.entityType);
      setValue('entitySlug', entity.entitySlug);

      // Auto-inject hardcoded final step when entity type requires one
      const finalDef = HARDCODED_FINAL_STEPS[entity.entityType];
      const hasFinal = steps.some((s) => s.isFinalStep);
      if (finalDef && !hasFinal) {
        setSteps((prev) => [
          ...prev,
          {
            ...newStepDefaults(prev.length + 1),
            name: finalDef.name,
            description: finalDef.description,
            isLocked: true,
            isFinalStep: true,
            isExpanded: false,
          },
        ]);
      }
      // Remove hardcoded final step if switching away from an entity type that had one
      if (!finalDef && hasFinal) {
        setSteps((prev) => {
          const filtered = prev.filter((s) => !s.isFinalStep);
          filtered.forEach((s, i) => { s.stepNumber = i + 1; });
          return filtered;
        });
      }
    }
  };

  // Step management
  const newStepDefaults = (stepNumber: number): StepFormData => ({
    stepNumber,
    name: `Step ${stepNumber}`,
    description: '',
    approverType: 'role',
    approverIds: [],
    approvalMode: 'any',
    action: 'APPROVE',
    isRequired: true,
    timeoutHours: null,
    escalationUserId: null,
    isActive: true,
    isExpanded: true,
    branchScope: 'all',
    branchId: null,
    isLocked: false,
    isFinalStep: false,
  });

  // Insert a new step at a specific index (before the item currently at that index)
  const insertStepAt = (insertIndex: number) => {
    const updated = [...steps];
    updated.splice(insertIndex, 0, newStepDefaults(insertIndex + 1));
    updated.forEach((s, i) => { s.stepNumber = i + 1; });
    setSteps(updated);
  };

  // Default "Add Step" inserts before the isFinalStep (or at the end if none)
  const addStep = () => {
    const finalIdx = steps.findIndex((s) => s.isFinalStep);
    insertStepAt(finalIdx >= 0 ? finalIdx : steps.length);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index);
    updated.forEach((s, i) => {
      s.stepNumber = i + 1;
    });
    setSteps(updated);
  };

  const updateStep = (index: number, updates: Partial<StepFormData>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const toggleStepExpanded = (index: number) => {
    const updated = [...steps];
    updated[index].isExpanded = !updated[index].isExpanded;
    setSteps(updated);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const updated = [...steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    updated.forEach((s, i) => {
      s.stepNumber = i + 1;
    });
    setSteps(updated);
  };

  const getApproverOptions = (type: ApproverType) => {
    switch (type) {
      case 'employee':
        return employees.map((e) => ({
          id: e.id,
          name: e.fullName,
          subtitle: e.employeeCode,
        }));
      case 'role':
      case 'any_of_role':
        return roles.map((r) => ({ id: r.id, name: r.name, subtitle: undefined }));
      case 'department_head':
        return [];
      default:
        return [];
    }
  };

  const getApproverLabel = (type: ApproverType) => {
    switch (type) {
      case 'employee':
        return 'Employees';
      case 'role':
      case 'any_of_role':
        return 'Roles';
      default:
        return '';
    }
  };

  const showApproverList = (type: ApproverType) => type !== 'department_head';
  const showApprovalMode = (type: ApproverType) => type === 'role' || type === 'employee';

  const onFormSubmit = async (data: FlowFormValues) => {
    // Entity type required only when creating a new flow
    if (!isEditing && !data.entitySlug) {
      setError('entitySlug', { message: 'Entity type is required' });
      return;
    }

    // Validate steps
    if (steps.length === 0) {
      setError('root', { message: 'At least one approval step is required' });
      return;
    }

    for (const step of steps) {
      if (!step.name.trim()) {
        setError('root', { message: 'All steps must have a name' });
        return;
      }
      if (step.approverType !== 'department_head' && step.approverIds.length === 0) {
        setError('root', { message: `Step "${step.name}" must have at least one approver` });
        return;
      }
    }

    try {
      const flowData: CreateApprovalFlowDto | UpdateApprovalFlowDto = {
        name: data.name,
        description: data.description || undefined,
        entityType: data.entityType,
        entitySlug: data.entitySlug,
        isActive: data.isActive,
        isDefault: data.isDefault,
        priority: data.priority,
        autoSubmit: data.autoSubmit,
        parallelApproval: data.parallelApproval,
      };

      const stepsData: (CreateApprovalFlowStepDto & { id?: number })[] = steps.map((s) => ({
        id: s.id, // Preserve DB id for locked/final step matching during edit
        stepNumber: s.stepNumber,
        name: s.name,
        description: s.description || undefined,
        approverType: s.approverType,
        approverIds: s.approverIds,
        approvalMode: s.approvalMode,
        action: s.action,
        isRequired: s.isRequired,
        timeoutHours: s.timeoutHours || undefined,
        escalationUserId: s.escalationUserId || undefined,
        isActive: s.isActive,
        branchScope: s.branchScope,
        branchId: s.branchScope === 'specific' ? (s.branchId || undefined) : undefined,
        isLocked: s.isLocked,
        isFinalStep: s.isFinalStep,
      }));

      await onSubmit(flowData, stepsData);
    } catch (err: unknown) {
      setError('root', { message: extractErrorMessage(err, 'Failed to save approval flow') });
    }
  };

  if (loadingMasterData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

      {/* Basic Information */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FormField id="name" label="Flow Name" required error={errors.name?.message}>
              {(props) => (
                <input
                  {...props}
                  {...register('name')}
                  type="text"
                  placeholder="e.g., Payment Approval - Standard"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2',
                    errors.name && 'border-red-500',
                  )}
                />
              )}
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField id="description" label="Description">
              {(props) => (
                <textarea
                  {...props}
                  {...register('description')}
                  placeholder="Describe when this flow should be used..."
                  rows={2}
                  className="w-full rounded-lg border px-3 py-2"
                />
              )}
            </FormField>
          </div>

          <FormField id="entitySlug" label="Entity Type" required error={errors.entitySlug?.message}>
            {(props) => (
              <>
                <select
                  {...props}
                  {...register('entitySlug', {
                    onChange: (e) => handleEntityTypeChange(e.target.value),
                  })}
                  disabled={isEditing}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2',
                    isEditing && 'bg-muted cursor-not-allowed',
                    errors.entitySlug && 'border-red-500',
                  )}
                >
                  <option value="">Select entity type...</option>
                  {entityTypes.map((e) => (
                    <option key={e.entitySlug} value={e.entitySlug}>
                      {e.moduleName} - {e.displayName}
                    </option>
                  ))}
                </select>
                {isEditing && (
                  <p className="text-xs text-muted-foreground mt-1">Entity type cannot be changed after creation</p>
                )}
              </>
            )}
          </FormField>

          <FormField id="priority" label="Priority" description="Lower number = higher priority when conditions match">
            {(props) => (
              <input
                {...props}
                {...register('priority', { valueAsNumber: true })}
                type="number"
                min={1}
                max={100}
                className="w-full rounded-lg border px-3 py-2"
              />
            )}
          </FormField>
        </div>

        {/* Options row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('isActive')}
              className="rounded"
            />
            <span className="text-sm">Active</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('isDefault')}
              className="rounded"
            />
            <span className="text-sm">Default for this entity</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('autoSubmit')}
              className="rounded"
            />
            <span className="text-sm">Auto-submit</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('parallelApproval')}
              className="rounded"
            />
            <span className="text-sm">Parallel approval</span>
          </label>
        </div>
      </div>

      {/* Approval Steps */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Approval Steps</h3>
          <button
            type="button"
            onClick={addStep}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Add Step
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No approval steps defined yet.</p>
            <button
              type="button"
              onClick={addStep}
              className="mt-2 text-primary hover:underline"
            >
              Add the first step
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, idx) => {
              const finalIdx = steps.findIndex((s) => s.isFinalStep);
              const finalStepCount = steps.filter((s) => s.isFinalStep).length;
              // isLocked (not final) cannot go to the last position — disable down when it would land at last
              const isLockedNotFinal = step.isLocked && !step.isFinalStep;
              const wouldBeLastIfMovedDown = idx === steps.length - 2;
              const canMoveUp = !step.isFinalStep && idx > 0;
              const canMoveDown = !step.isFinalStep && idx < steps.length - 1 && !(isLockedNotFinal && wouldBeLastIfMovedDown);
              // Allow deleting duplicate final steps (keep at least one)
              const isDuplicateFinal = step.isFinalStep && finalStepCount > 1;
              const canDelete = (!step.isLocked && !step.isFinalStep) || isDuplicateFinal;

              return (
              <div key={idx}>
                {/* Insert-between button (shown above each step except the very first) */}
                {idx > 0 && !step.isFinalStep && (
                  <div className="flex justify-center my-1">
                    <button
                      type="button"
                      onClick={() => insertStepAt(idx)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary px-3 py-0.5 rounded-full border border-dashed hover:border-primary transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Insert step here
                    </button>
                  </div>
                )}
                {/* Also show insert before isFinalStep when the previous step is not itself locked-final */}
                {step.isFinalStep && (
                  <div className="flex justify-center my-1">
                    <button
                      type="button"
                      onClick={() => insertStepAt(idx)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary px-3 py-0.5 rounded-full border border-dashed hover:border-primary transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Insert step here
                    </button>
                  </div>
                )}

              <div className={cn('rounded-lg border bg-background', step.isLocked && 'border-amber-200 dark:border-amber-800')}>
                {/* Step Header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => toggleStepExpanded(idx)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                    step.isFinalStep ? 'bg-green-600 text-white' : step.isLocked ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground',
                  )}>
                    {step.isFinalStep ? <Lock className="h-3 w-3" /> : step.isLocked ? <Lock className="h-3 w-3" /> : step.stepNumber}
                  </div>
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{step.name || `Step ${step.stepNumber}`}</span>
                    {step.isLocked && (
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1',
                        step.isFinalStep
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
                      )}>
                        <Lock className="h-3 w-3" />
                        {step.isFinalStep ? 'Final · Protected' : 'Protected'}
                      </span>
                    )}
                    {!step.isLocked && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {step.action}
                      </span>
                    )}
                    {step.approverIds.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        ({step.approverIds.length} {getApproverLabel(step.approverType).toLowerCase()})
                      </span>
                    )}
                    {!step.isLocked && !step.isRequired && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                        Optional
                      </span>
                    )}
                    {step.branchScope === 'specific' && step.branchId && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {branches.find(b => b.id === step.branchId)?.name ?? `Branch #${step.branchId}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canMoveUp && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveStep(idx, 'up'); }}
                        className="p-1 hover:bg-muted rounded"
                        title="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                    )}
                    {canMoveDown && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveStep(idx, 'down'); }}
                        className="p-1 hover:bg-muted rounded"
                        title="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    )}
                    {!canMoveUp && !canMoveDown && !step.isFinalStep && (
                      <div className="w-8" /> // spacer to keep alignment
                    )}
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeStep(idx); }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                        title="Delete step"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="w-6" /> // spacer where delete would be
                    )}
                    {step.isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Step Details */}
                {step.isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t space-y-4">
                    {step.isLocked && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        This is a protected step. Only <strong>Approver Type</strong>, <strong>Approval Mode</strong>, and <strong>Branch Scope</strong> can be changed.
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Row 1: Step Name + Action */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Step Name</label>
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => !step.isLocked && updateStep(idx, { name: e.target.value })}
                          placeholder="e.g., Manager Approval"
                          disabled={step.isLocked}
                          className={cn('w-full rounded-lg border px-3 py-2', step.isLocked && 'bg-muted cursor-not-allowed text-muted-foreground')}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Action</label>
                        <select
                          value={step.action}
                          onChange={(e) => !step.isLocked && updateStep(idx, { action: e.target.value as StepFormData['action'] })}
                          disabled={step.isLocked}
                          className={cn('w-full rounded-lg border px-3 py-2', step.isLocked && 'bg-muted cursor-not-allowed text-muted-foreground')}
                        >
                          <option value="APPROVE">Approve</option>
                          <option value="VERIFY">Verify</option>
                          <option value="CHECK">Check</option>
                        </select>
                      </div>

                      {/* Row 2: Approver Type + Approval Mode */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Approver Type</label>
                        <select
                          value={step.approverType}
                          onChange={(e) => updateStep(idx, { approverType: e.target.value as StepFormData['approverType'], approverIds: [] })}
                          className="w-full rounded-lg border px-3 py-2"
                        >
                          <option value="role">By Role</option>
                          <option value="employee">Specific Employees</option>
                          <option value="any_of_role">Any of Role</option>
                          <option value="department_head">Department Head</option>
                        </select>
                      </div>

                      {showApprovalMode(step.approverType) && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Approval Mode</label>
                          <select
                            value={step.approvalMode}
                            onChange={(e) => updateStep(idx, { approvalMode: e.target.value as StepFormData['approvalMode'] })}
                            className="w-full rounded-lg border px-3 py-2"
                          >
                            <option value="any">Any approver (first to act)</option>
                            <option value="all">All approvers must approve</option>
                          </select>
                        </div>
                      )}

                      {/* Row 3: Approver selection (full width) */}
                      {showApproverList(step.approverType) && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">
                            Select {getApproverLabel(step.approverType)}
                          </label>
                          <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                            {getApproverOptions(step.approverType).map((option) => (
                              <label key={option.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-muted rounded">
                                <input
                                  type="checkbox"
                                  checked={step.approverIds.includes(option.id)}
                                  onChange={(e) => {
                                    const newIds = e.target.checked
                                      ? [...step.approverIds, option.id]
                                      : step.approverIds.filter((id) => id !== option.id);
                                    updateStep(idx, { approverIds: newIds });
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm">{option.name}</span>
                                {option.subtitle && (
                                  <span className="text-xs text-muted-foreground">({option.subtitle})</span>
                                )}
                              </label>
                            ))}
                            {getApproverOptions(step.approverType).length === 0 && (
                              <p className="text-sm text-muted-foreground py-2 text-center">
                                No {getApproverLabel(step.approverType).toLowerCase()} available
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Row 4: Timeout + Description (non-locked only) */}
                      {!step.isLocked && (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-1">Timeout (hours)</label>
                            <input
                              type="number"
                              value={step.timeoutHours || ''}
                              onChange={(e) => updateStep(idx, { timeoutHours: e.target.value ? parseInt(e.target.value) : null })}
                              placeholder="Optional"
                              min={1}
                              className="w-full rounded-lg border px-3 py-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Auto-escalate after this time</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <input
                              type="text"
                              value={step.description}
                              onChange={(e) => updateStep(idx, { description: e.target.value })}
                              placeholder="Optional description for this step..."
                              className="w-full rounded-lg border px-3 py-2"
                            />
                          </div>
                        </>
                      )}

                      {/* Row 5: Checkboxes (non-locked only) */}
                      {!step.isLocked && (
                        <div className="md:col-span-2 flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={step.isActive}
                              onChange={(e) => updateStep(idx, { isActive: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-sm">Step is active</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={step.isRequired}
                              onChange={(e) => updateStep(idx, { isRequired: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-sm">Step is required</span>
                          </label>
                        </div>
                      )}

                      {/* Row 6: Branch Scope */}
                      <div className="md:col-span-2">
                        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <GitBranch className="h-4 w-4" />
                            Branch Scope
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`branchScope-${idx}`}
                                value="all"
                                checked={step.branchScope === 'all'}
                                onChange={() => updateStep(idx, { branchScope: 'all', branchId: null })}
                                className="rounded"
                              />
                              <span className="text-sm">All Branches</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`branchScope-${idx}`}
                                value="specific"
                                checked={step.branchScope === 'specific'}
                                onChange={() => updateStep(idx, { branchScope: 'specific' })}
                                className="rounded"
                              />
                              <span className="text-sm">Specific Branch</span>
                            </label>
                          </div>
                          {step.branchScope === 'specific' && (
                            <div>
                              <select
                                value={step.branchId || ''}
                                onChange={(e) => updateStep(idx, { branchId: e.target.value ? Number(e.target.value) : null })}
                                className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                              >
                                <option value="">— Select branch —</option>
                                {branches.map((b) => (
                                  <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                              </select>
                              <p className="text-xs text-muted-foreground mt-1">
                                Only approvers belonging to this branch can act on this step
                              </p>
                            </div>
                          )}
                          {step.branchScope === 'all' && (
                            <p className="text-xs text-muted-foreground">
                              Approvers from any branch can act on this step
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-muted"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
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
