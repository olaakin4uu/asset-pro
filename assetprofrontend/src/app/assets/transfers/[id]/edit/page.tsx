'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, ArrowLeft } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, BranchSelector } from '@/components/erp';
import { TransferForm } from '../../components/TransferForm';
import { assetTransfersApi } from '@/lib/api/assets';
import type { CreateAssetTransferDto, UpdateAssetTransferDto } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { extractErrorMessage } from '@/lib/utils';
import { useBranchAccess } from '@/hooks/useBranchAccess';

export default function EditTransferPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const transferId = parseInt(params.id as string);

  const { data: transferData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['assets-transfers', transferId],
    queryFn: () => assetTransfersApi.get(transferId),
    enabled: !!transferId && !isNaN(transferId),
  });

  const isNotDraft = transferData && transferData.status !== 'draft';
  const transfer = isNotDraft ? null : transferData ?? null;
  const error = isNotDraft
    ? 'Only draft transfers can be edited'
    : fetchError ? extractErrorMessage(fetchError, 'Failed to load transfer') : null;

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Assets', href: '/assets' },
    { title: 'Transfers', href: '/assets/transfers' },
    { title: transferData?.transferNumber || 'Loading...', href: `/assets/transfers/${transferId}` },
    { title: 'Edit' },
  ];

  const handleSubmit = async (data: CreateAssetTransferDto | UpdateAssetTransferDto) => {
    await assetTransfersApi.update(transferId, { ...data, branchId: selectedBranchId } as UpdateAssetTransferDto);
    router.push(`/assets/transfers/${transferId}`);
  };

  if (loading) return <TenantLayout breadcrumbs={breadcrumbs}><div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></TenantLayout>;
  if (error || !transfer) return <TenantLayout breadcrumbs={breadcrumbs}><div className="flex flex-col items-center justify-center py-12"><p className="text-red-500 mb-4">{error || 'Transfer not found'}</p><button onClick={() => router.push('/assets/transfers')} className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"><ArrowLeft className="h-4 w-4" />Back to Transfers</button></div></TenantLayout>;

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader icon={ArrowLeftRight} title={`Edit: ${transfer.transferNumber}`} description="Update transfer details" {...PageHeaderPresets.operations} />
        <BranchSelector
          branches={branches}
          value={selectedBranchId}
          onChange={setSelectedBranchId}
          hasSingleBranch={hasSingleBranch}
          className="mb-4"
        />
      <div>
        <TransferForm transfer={transfer} onSubmit={handleSubmit} onCancel={() => router.push(`/assets/transfers/${transferId}`)} submitLabel="Save Changes" />
      </div>
    </TenantLayout>
  );
}
