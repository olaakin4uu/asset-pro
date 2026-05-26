'use client';

import { useRouter, useParams } from 'next/navigation';
import { Calculator, ArrowLeft, Loader2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { BranchSelector } from '@/components/erp';
import { OpeningBalanceBulkForm } from '../../components/OpeningBalanceForm';
import { Button } from 'primereact/button';
import { openingBalancesApi } from '@/lib/api/accounts';
import { useEntityFetch } from '@/hooks';
import type { SetOpeningBalancesDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';

// ============================================================================
// EDIT OPENING BALANCES PAGE
// ============================================================================

export default function EditOpeningBalancePage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const balanceId = parseInt(params.id as string);

  // Fetch the single balance to determine year/period
  const { entity: balance, loading, error } = useEntityFetch({
    queryKey: 'accounts-opening-balances',
    id: balanceId,
    fetchFn: openingBalancesApi.get,
    errorMessage: 'Failed to load balance',
  });

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'Opening Balances', href: '/accounts/opening-balances' },
    { title: 'Edit Balances' },
  ];

  const handleSubmit = async (data: SetOpeningBalancesDto) => {
    const result = await openingBalancesApi.set(data);
    if (!result?.success || !result?.count) {
      throw new Error('Save returned unexpected result — balances may not have been saved');
    }
    router.push('/accounts/opening-balances');
  };

  const handleCancel = () => {
    router.push('/accounts/opening-balances');
  };

  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/accounts/opening-balances'),
    },
  ];

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </TenantLayout>
    );
  }

  if (error || !balance) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-muted-foreground">{error || 'Opening balance not found'}</p>
          <Button
            label="Back to Opening Balances"
            icon="pi pi-arrow-left"
            onClick={() => router.push('/accounts/opening-balances')}
          />
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Calculator}
        title="Edit Opening Balances"
        description={`Year ${balance.year}, Period ${balance.period === 0 ? 'Opening' : balance.period}`}
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />
        <BranchSelector
          branches={branches}
          value={selectedBranchId}
          onChange={setSelectedBranchId}
          hasSingleBranch={hasSingleBranch}
          className="mb-4"
        />

      <div className="max-w-5xl mx-auto">
        <OpeningBalanceBulkForm
          year={balance.year}
          period={balance.period}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Balances"
        />
      </div>
    </TenantLayout>
  );
}
