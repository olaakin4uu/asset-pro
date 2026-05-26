'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { FileText } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { WhtForm } from '../components/WhtForm';
import { whtApi } from '@/lib/api/accounts';
import type { CreateWhtDto, UpdateWhtDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'WHT Management', href: '/accounts/wht' },
  { title: 'Add WHT Rate' },
];

// ============================================================================
// CREATE WHT PAGE
// ============================================================================

export default function CreateWhtPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateWhtDto | UpdateWhtDto) => {
    await whtApi.create({ ...data, branchId: selectedBranchId } as CreateWhtDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/accounts/wht');
  };

  const handleCancel = () => {
    router.push('/accounts/wht');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={FileText}
        title="Add WHT Rate"
        description="Create a new Withholding Tax rate for transactions"
        {...PageHeaderPresets.financial}
      />
        <BranchSelector
          branches={branches}
          value={selectedBranchId}
          onChange={setSelectedBranchId}
          hasSingleBranch={hasSingleBranch}
          className="mb-4"
        />

      <div>
        <WhtForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create WHT Rate"
        />
      </div>
    </TenantLayout>
  );
}
