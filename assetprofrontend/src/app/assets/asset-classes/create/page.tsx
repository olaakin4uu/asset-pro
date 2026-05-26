'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { Layers } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, BranchSelector } from '@/components/erp';
import { AssetClassForm } from '../components/AssetClassForm';
import { assetClassesApi } from '@/lib/api/assets';
import type { CreateAssetClassDto, UpdateAssetClassDto } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Assets', href: '/assets' },
  { title: 'Asset Classes', href: '/assets/asset-classes' },
  { title: 'New Asset Class' },
];

export default function CreateAssetClassPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateAssetClassDto | UpdateAssetClassDto) => {
    await assetClassesApi.create({ ...data, branchId: selectedBranchId } as CreateAssetClassDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/assets/asset-classes');
  };

  const handleCancel = () => {
    router.push('/assets/asset-classes');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Layers}
        title="New Asset Class"
        description="Create a new asset classification"
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
        <AssetClassForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Asset Class"
        />
      </div>
    </TenantLayout>
  );
}
