'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { GitBranch } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { ApprovalFlowForm } from '../components/ApprovalFlowForm';
import { approvalFlowsApi } from '@/lib/api/approvals';
import type { CreateApprovalFlowDto, UpdateApprovalFlowDto, CreateApprovalFlowStepDto } from '@/types/approvals';
import type { BreadcrumbItem } from '@/types/core';
import { extractErrorMessage } from '@/lib/utils';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Approvals', href: '/core/approvals' },
  { title: 'Flows', href: '/core/approvals/flows' },
  { title: 'New Flow' },
];

export default function CreateApprovalFlowPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateApprovalFlowDto | UpdateApprovalFlowDto, steps?: CreateApprovalFlowStepDto[]) => {
    setError(null);
    try {
      // Create the flow
      const flow = await approvalFlowsApi.create({ ...data, branchId: selectedBranchId } as CreateApprovalFlowDto);

      // Add steps if provided
      if (steps && steps.length > 0) {
        for (const step of steps) {
          await approvalFlowsApi.addStep(flow.id, step);
        }
      }

      useFlashStore.getState().setFlash('Saved successfully');
      router.push('/core/approvals/flows');
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to create approval flow'));
      throw err;
    }
  };

  const handleCancel = () => {
    router.push('/core/approvals/flows');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={GitBranch}
        title="New Approval Flow"
        description="Create a new approval workflow for document processing"
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
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitLabel="Create Flow"
      />
    </TenantLayout>
  );
}
