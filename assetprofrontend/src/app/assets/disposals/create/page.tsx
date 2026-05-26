'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { Trash2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, BranchSelector } from '@/components/erp';
import { DisposalForm } from '../components/DisposalForm';
import { assetDisposalsApi } from '@/lib/api/assets';
import type { CreateAssetDisposalDto, UpdateAssetDisposalDto } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Assets', href: '/assets' },
  { title: 'Disposals', href: '/assets/disposals' },
  { title: 'New Disposal' },
];

export default function CreateDisposalPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateAssetDisposalDto | UpdateAssetDisposalDto) => {
    await assetDisposalsApi.create({ ...data, branchId: selectedBranchId } as CreateAssetDisposalDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/assets/disposals');
  };

  const handleCancel = () => {
    router.push('/assets/disposals');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Trash2}
        title="New Asset Disposal"
        description="Create a new disposal request"
        {...PageHeaderPresets.operations}
      />
        <BranchSelector
          branches={branches}
          value={selectedBranchId}
          onChange={setSelectedBranchId}
          hasSingleBranch={hasSingleBranch}
          className="mb-4"
        />
      <div>
        <DisposalForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Disposal"
        />
      </div>
    </TenantLayout>
  );
}
