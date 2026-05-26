'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { ArrowRightLeft } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { ExchangeRateForm } from '../components/ExchangeRateForm';
import { exchangeRatesApi } from '@/lib/api/accounts';
import type { CreateExchangeRateDto, UpdateExchangeRateDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Exchange Rates', href: '/accounts/exchange-rates' },
  { title: 'New Rate' },
];

export default function CreateExchangeRatePage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateExchangeRateDto | UpdateExchangeRateDto) => {
    await exchangeRatesApi.create({ ...data, branchId: selectedBranchId } as CreateExchangeRateDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/accounts/exchange-rates');
  };

  const handleCancel = () => {
    router.push('/accounts/exchange-rates');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={ArrowRightLeft}
        title="New Exchange Rate"
        description="Create a new currency exchange rate"
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
        <ExchangeRateForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Exchange Rate"
        />
      </div>
    </TenantLayout>
  );
}
