'use client';

import { useRouter, useParams } from 'next/navigation';
import { Layers, ArrowLeft } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, BranchSelector } from '@/components/erp';
import { AssetClassForm } from '../../components/AssetClassForm';
import { assetClassesApi } from '@/lib/api/assets';
import type { CreateAssetClassDto, UpdateAssetClassDto } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { useEntityFetch } from '@/hooks';
import { useBranchAccess } from '@/hooks/useBranchAccess';

export default function EditAssetClassPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const assetClassId = parseInt(params.id as string);

  const { entity: assetClass, loading, error } = useEntityFetch({
    queryKey: 'assets-asset-classes',
    id: assetClassId,
    fetchFn: assetClassesApi.get,
    errorMessage: 'Failed to load asset class',
  });

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Assets', href: '/assets' },
    { title: 'Asset Classes', href: '/assets/asset-classes' },
    { title: assetClass?.name || 'Loading...', href: `/assets/asset-classes/${assetClassId}` },
    { title: 'Edit' },
  ];

  const handleSubmit = async (data: CreateAssetClassDto | UpdateAssetClassDto) => {
    await assetClassesApi.update(assetClassId, { ...data, branchId: selectedBranchId } as UpdateAssetClassDto);
    router.push(`/assets/asset-classes/${assetClassId}`);
  };

  const handleCancel = () => {
    router.push(`/assets/asset-classes/${assetClassId}`);
  };

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </TenantLayout>
    );
  }

  if (error || !assetClass) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-500 mb-4">{error || 'Asset class not found'}</p>
          <button
            onClick={() => router.push('/assets/asset-classes')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Asset Classes
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Layers}
        title={`Edit: ${assetClass.name}`}
        description="Update asset class details"
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
          assetClass={assetClass}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
