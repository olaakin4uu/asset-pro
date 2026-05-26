'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { Calculator } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, BranchSelector } from '@/components/erp';
import { DepreciationForm } from '../components/DepreciationForm';
import { assetDepreciationsApi } from '@/lib/api/assets';
import type { CreateAssetDepreciationDto, UpdateAssetDepreciationDto } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Assets', href: '/assets' },
  { title: 'Depreciation', href: '/assets/depreciations' },
  { title: 'New Entry' },
];

export default function CreateDepreciationPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateAssetDepreciationDto | UpdateAssetDepreciationDto) => {
    await assetDepreciationsApi.create({ ...data, branchId: selectedBranchId } as CreateAssetDepreciationDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/assets/depreciations');
  };

  const handleCancel = () => {
    router.push('/assets/depreciations');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Calculator}
        title="New Depreciation Entry"
        description="Create a new depreciation record"
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
        <DepreciationForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Entry"
        />
      </div>
    </TenantLayout>
  );
}
