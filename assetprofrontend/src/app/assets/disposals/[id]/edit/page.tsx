'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Trash2, ArrowLeft } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, BranchSelector } from '@/components/erp';
import { DisposalForm } from '../../components/DisposalForm';
import { assetDisposalsApi } from '@/lib/api/assets';
import type { CreateAssetDisposalDto, UpdateAssetDisposalDto } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { extractErrorMessage } from '@/lib/utils';
import { useBranchAccess } from '@/hooks/useBranchAccess';

export default function EditDisposalPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const disposalId = parseInt(params.id as string);

  const { data: disposalData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['assets-disposals', disposalId],
    queryFn: () => assetDisposalsApi.get(disposalId),
    enabled: !!disposalId && !isNaN(disposalId),
  });

  const isNotDraft = disposalData && disposalData.status !== 'draft';
  const disposal = isNotDraft ? null : disposalData ?? null;
  const error = isNotDraft
    ? 'Only draft disposals can be edited'
    : fetchError ? extractErrorMessage(fetchError, 'Failed to load disposal') : null;

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Assets', href: '/assets' },
    { title: 'Disposals', href: '/assets/disposals' },
    { title: disposalData?.disposalNumber || 'Loading...', href: `/assets/disposals/${disposalId}` },
    { title: 'Edit' },
  ];

  const handleSubmit = async (data: CreateAssetDisposalDto | UpdateAssetDisposalDto) => {
    await assetDisposalsApi.update(disposalId, { ...data, branchId: selectedBranchId } as UpdateAssetDisposalDto);
    router.push(`/assets/disposals/${disposalId}`);
  };

  const handleCancel = () => {
    router.push(`/assets/disposals/${disposalId}`);
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

  if (error || !disposal) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-500 mb-4">{error || 'Disposal not found'}</p>
          <button
            onClick={() => router.push('/assets/disposals')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Disposals
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Trash2}
        title={`Edit: ${disposal.disposalNumber}`}
        description="Update disposal details"
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
          disposal={disposal}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
