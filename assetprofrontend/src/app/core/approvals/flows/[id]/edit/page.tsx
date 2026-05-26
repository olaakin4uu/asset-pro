'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { GitBranch } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { ApprovalFlowForm } from '../../components/ApprovalFlowForm';
import { approvalFlowsApi } from '@/lib/api/approvals';
import type { UpdateApprovalFlowDto, CreateApprovalFlowStepDto } from '@/types/approvals';
import type { BreadcrumbItem } from '@/types/core';
import { useEntityFetch } from '@/hooks';
import { extractErrorMessage } from '@/lib/utils';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';
import { useQueryClient } from '@tanstack/react-query';

export default function EditApprovalFlowPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const flowId = parseInt(params.id as string);

  const { entity: flow, loading, error: fetchError } = useEntityFetch({
    queryKey: 'core-approval-flows',
    id: flowId,
    fetchFn: approvalFlowsApi.get,
    errorMessage: 'Failed to load approval flow',
  });
  const [error, setError] = useState<string | null>(null);
  const displayError = fetchError || error;

  const handleSubmit = async (data: UpdateApprovalFlowDto, steps?: CreateApprovalFlowStepDto[]) => {
    if (!flow) return;
    setError(null);
    try {
      // Update the flow
      await approvalFlowsApi.update(flowId, { ...data, branchId: selectedBranchId });

      // Handle steps - diff existing vs new
      if (steps && flow.steps) {
        const lockedStepIds = new Set(
          flow.steps.filter(s => s.isLocked || s.isFinalStep).map(s => s.id),
        );

        // Delete non-locked existing steps (ignore 404 — step may already be gone from a prior partial save)
        for (const existingStep of flow.steps) {
          if (!lockedStepIds.has(existingStep.id)) {
            try {
              await approvalFlowsApi.deleteStep(flowId, existingStep.id);
            } catch (delErr: unknown) {
              const status = (delErr as { response?: { status?: number } })?.response?.status;
              if (status !== 404) throw delErr;
            }
          }
        }

        // Add/update steps
        for (const step of steps) {
          // Match locked/final steps by their DB id (preserved in form state)
          // or by isFinalStep flag as fallback
          const stepWithId = step as CreateApprovalFlowStepDto & { id?: number };
          const existingLocked = flow.steps.find(
            s => lockedStepIds.has(s.id) && (
              stepWithId.id === s.id ||
              (step.isFinalStep && s.isFinalStep)
            ),
          );
          if (existingLocked) {
            // Update only allowed fields on locked steps (no name, action, etc. — but stepNumber is ok)
            await approvalFlowsApi.updateStep(flowId, existingLocked.id, {
              stepNumber: step.stepNumber,
              approverType: step.approverType,
              approvalMode: step.approvalMode,
              approverIds: step.approverIds,
              branchScope: step.branchScope,
              branchId: step.branchId,
            });
          } else if (!step.isFinalStep || !flow.steps.some(s => s.isFinalStep)) {
            // Only add if it's not a final step that already exists in DB
            await approvalFlowsApi.addStep(flowId, step);
          }
        }
      }

      // Remove stale cache so the next visit fetches fresh data (prevents
      // useState lazy-init in ApprovalFlowForm from capturing old approverType)
      queryClient.removeQueries({ queryKey: ['core-approval-flows', flowId] });
      router.push(`/core/approvals/flows/${flowId}`);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to update approval flow'));
      // Invalidate stale cache so next attempt fetches current step IDs from DB
      queryClient.removeQueries({ queryKey: ['core-approval-flows', flowId] });
    }
  };

  const handleCancel = () => {
    router.push(`/core/approvals/flows/${flowId}`);
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Administration', href: '/core' },
    { title: 'Approvals', href: '/core/approvals' },
    { title: 'Flows', href: '/core/approvals/flows' },
    { title: flow?.name || 'Loading...', href: `/core/approvals/flows/${flowId}` },
    { title: 'Edit' },
  ];

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </TenantLayout>
    );
  }

  if (fetchError || !flow) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="text-center py-12">
          <p className="text-red-600">{fetchError || 'Flow not found'}</p>
          <button
            onClick={() => router.push('/core/approvals/flows')}
            className="mt-4 text-primary hover:underline"
          >
            Back to Flows
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={GitBranch}
        title={`Edit: ${flow.name}`}
        description="Modify approval workflow configuration"
        {...PageHeaderPresets.core}
      />
      <BranchSelector
        branches={branches}
        value={selectedBranchId}
        onChange={setSelectedBranchId}
        hasSingleBranch={hasSingleBranch}
        className="mb-4"
      />

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <ApprovalFlowForm
        flow={flow}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="Save Changes"
      />
    </TenantLayout>
  );
}
