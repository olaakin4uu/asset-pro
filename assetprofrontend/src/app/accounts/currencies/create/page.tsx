'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { Coins } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { CurrencyForm } from '../components/CurrencyForm';
import { currenciesApi } from '@/lib/api/accounts';
import type { CreateCurrencyDto, UpdateCurrencyDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Currencies', href: '/accounts/currencies' },
  { title: 'Add Currency' },
];

// ============================================================================
// CREATE CURRENCY PAGE
// ============================================================================

export default function CreateCurrencyPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateCurrencyDto | UpdateCurrencyDto) => {
    await currenciesApi.create({ ...data, branchId: selectedBranchId } as CreateCurrencyDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/accounts/currencies');
  };

  const handleCancel = () => {
    router.push('/accounts/currencies');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Coins}
        title="Add Currency"
        description="Create a new currency for multi-currency transactions"
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
        <CurrencyForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Currency"
        />
      </div>
    </TenantLayout>
  );
}
