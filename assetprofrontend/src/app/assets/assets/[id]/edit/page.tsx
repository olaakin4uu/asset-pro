'use client';

import { useRouter, useParams } from 'next/navigation';
import { Package, ArrowLeft } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, BranchSelector } from '@/components/erp';
import { AssetForm } from '../../components/AssetForm';
import { assetsApi } from '@/lib/api/assets';
import type { CreateAssetDto, UpdateAssetDto } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { useEntityFetch } from '@/hooks';
import { useBranchAccess } from '@/hooks/useBranchAccess';

export default function EditAssetPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const assetId = parseInt(params.id as string);

  const { entity: asset, loading, error } = useEntityFetch({
    queryKey: 'assets-assets',
    id: assetId,
    fetchFn: assetsApi.get,
    errorMessage: 'Failed to load asset',
  });

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Assets', href: '/assets' },
    { title: 'Asset Register', href: '/assets/assets' },
    { title: asset?.name || 'Loading...', href: `/assets/assets/${assetId}` },
    { title: 'Edit' },
  ];

  const handleSubmit = async (data: CreateAssetDto | UpdateAssetDto) => {
    await assetsApi.update(assetId, { ...data, branchId: selectedBranchId } as UpdateAssetDto);
    router.push(`/assets/assets/${assetId}`);
  };

  const handleCancel = () => {
    router.push(`/assets/assets/${assetId}`);
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

  if (error || !asset) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-500 mb-4">{error || 'Asset not found'}</p>
          <button
            onClick={() => router.push('/assets/assets')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assets
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Package}
        title={`Edit: ${asset.name}`}
        description="Update asset details"
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
          asset={asset}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
