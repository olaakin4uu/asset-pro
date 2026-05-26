'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { Package } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, BranchSelector } from '@/components/erp';
import { AssetForm } from '../components/AssetForm';
import { assetsApi } from '@/lib/api/assets';
import type { CreateAssetDto, UpdateAssetDto } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Assets', href: '/assets' },
  { title: 'Asset Register', href: '/assets/assets' },
  { title: 'New Asset' },
];

export default function CreateAssetPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateAssetDto | UpdateAssetDto) => {
    await assetsApi.create({ ...data, branchId: selectedBranchId } as CreateAssetDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/assets/assets');
  };

  const handleCancel = () => {
    router.push('/assets/assets');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Package}
        title="New Asset"
        description="Register a new fixed asset"
        {...PageHeaderPresets.operations}
      />
        <BranchSelector
          branches={branches}
          value={selectedBranchId}
          onChange={setSelectedBranchId}
          hasSingleBranch={hasSingleBranch}
          className="mb-4"
        />
      <div className="max-w-5xl">
        <AssetForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Asset"
        />
      </div>
    </TenantLayout>
  );
}
