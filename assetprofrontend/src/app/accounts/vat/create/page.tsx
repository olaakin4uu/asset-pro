'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { Receipt } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { VatForm } from '../components/VatForm';
import { vatApi } from '@/lib/api/accounts';
import type { CreateVatDto, UpdateVatDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'VAT Management', href: '/accounts/vat' },
  { title: 'Add VAT Rate' },
];

// ============================================================================
// CREATE VAT PAGE
// ============================================================================

export default function CreateVatPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateVatDto | UpdateVatDto) => {
    await vatApi.create({ ...data, branchId: selectedBranchId } as CreateVatDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/accounts/vat');
  };

  const handleCancel = () => {
    router.push('/accounts/vat');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Receipt}
        title="Add VAT Rate"
        description="Create a new VAT rate for transactions"
        {...PageHeaderPresets.financial}
      />
        <BranchSelector
          branches={branches}
          value={selectedBranchId}
          onChange={setSelectedBranchId}
          hasSingleBranch={hasSingleBranch}
          className="mb-4"
        />

      <div>
        <VatForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create VAT Rate"
        />
      </div>
    </TenantLayout>
  );
}
