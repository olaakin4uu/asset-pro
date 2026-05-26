'use client';
import { extractErrorMessage } from '@/lib/utils';
import { useEntityFetch } from '@/hooks';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowRightLeft, ArrowLeft } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { ExchangeRateForm } from '../../components/ExchangeRateForm';
import { exchangeRatesApi } from '@/lib/api/accounts';
import type { UpdateExchangeRateDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

export default function EditExchangeRatePage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const rateId = parseInt(params.id as string);

  const { entity: entity, loading, error: fetchError } = useEntityFetch({
    queryKey: 'accounts-exchange-rates',
    id: rateId,
    fetchFn: exchangeRatesApi.get,
    errorMessage: 'Failed to load entity',
  });

  const [mutationError, setMutationError] = useState<string | null>(null);
  const error = fetchError || mutationError;

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'Exchange Rates', href: '/accounts/exchange-rates' },
    { title: entity ? `${entity.fromCurrencyCode}/${entity.toCurrencyCode}` : 'Loading...', href: `/accounts/exchange-rates/${rateId}` },
    { title: 'Edit' },
  ];

  const handleSubmit = async (data: UpdateExchangeRateDto) => {
    await exchangeRatesApi.update(rateId, { ...data, branchId: selectedBranchId });
    router.push(`/accounts/exchange-rates/${rateId}`);
  };

  const handleCancel = () => {
    router.push(`/accounts/exchange-rates/${rateId}`);
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

  if (error || !entity) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-500 mb-4">{error || 'Exchange rate not found'}</p>
          <button onClick={() => router.push('/accounts/exchange-rates')} className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
            Back to Exchange Rates
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={ArrowRightLeft}
        title={`Edit: ${entity.fromCurrencyCode}/${entity.toCurrencyCode}`}
        description="Update exchange rate details"
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
          entity={entity}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
