'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { ArrowLeftRight } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, BranchSelector } from '@/components/erp';
import { TransferForm } from '../components/TransferForm';
import { assetTransfersApi } from '@/lib/api/assets';
import type { CreateAssetTransferDto, UpdateAssetTransferDto } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Assets', href: '/assets' },
  { title: 'Transfers', href: '/assets/transfers' },
  { title: 'New Transfer' },
];

export default function CreateTransferPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateAssetTransferDto | UpdateAssetTransferDto) => {
    await assetTransfersApi.create({ ...data, branchId: selectedBranchId } as CreateAssetTransferDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/assets/transfers');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader icon={ArrowLeftRight} title="New Asset Transfer" description="Create a new transfer request" {...PageHeaderPresets.operations} />
        <BranchSelector
          branches={branches}
          value={selectedBranchId}
          onChange={setSelectedBranchId}
          hasSingleBranch={hasSingleBranch}
          className="mb-4"
        />
      <div>
        <TransferForm onSubmit={handleSubmit} onCancel={() => router.push('/assets/transfers')} submitLabel="Create Transfer" />
      </div>
    </TenantLayout>
  );
}
