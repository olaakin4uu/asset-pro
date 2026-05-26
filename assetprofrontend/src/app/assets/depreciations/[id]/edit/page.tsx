'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Calculator, ArrowLeft } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, BranchSelector } from '@/components/erp';
import { DepreciationForm } from '../../components/DepreciationForm';
import { assetDepreciationsApi } from '@/lib/api/assets';
import type { CreateAssetDepreciationDto, UpdateAssetDepreciationDto } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { extractErrorMessage } from '@/lib/utils';
import { useBranchAccess } from '@/hooks/useBranchAccess';

export default function EditDepreciationPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const depreciationId = parseInt(params.id as string);

  const { data: depreciationData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['assets-depreciations', depreciationId],
    queryFn: () => assetDepreciationsApi.get(depreciationId),
    enabled: !!depreciationId && !isNaN(depreciationId),
  });

  const isPosted = depreciationData?.isPosted;
  const depreciation = isPosted ? null : depreciationData ?? null;
  const error = isPosted
    ? 'Cannot edit a posted depreciation entry'
    : fetchError ? extractErrorMessage(fetchError, 'Failed to load depreciation') : null;

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Assets', href: '/assets' },
    { title: 'Depreciation', href: '/assets/depreciations' },
    { title: depreciationData?.assetName || 'Loading...', href: `/assets/depreciations/${depreciationId}` },
    { title: 'Edit' },
  ];

  const handleSubmit = async (data: CreateAssetDepreciationDto | UpdateAssetDepreciationDto) => {
    await assetDepreciationsApi.update(depreciationId, { ...data, branchId: selectedBranchId } as UpdateAssetDepreciationDto);
    router.push(`/assets/depreciations/${depreciationId}`);
  };

  const handleCancel = () => {
    router.push(`/assets/depreciations/${depreciationId}`);
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

  if (error || !depreciation) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-500 mb-4">{error || 'Depreciation not found'}</p>
          <button
            onClick={() => router.push('/assets/depreciations')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Depreciation
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Calculator}
        title={`Edit: ${depreciation.assetName}`}
        description="Update depreciation entry"
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
          depreciation={depreciation}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
