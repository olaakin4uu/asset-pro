'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calculator, ArrowLeft, Loader2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { BranchSelector } from '@/components/erp';
import { OpeningBalanceBulkForm } from '../components/OpeningBalanceForm';
import { openingBalancesApi } from '@/lib/api/accounts';
import type { SetOpeningBalancesDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { useFlashStore } from '@/stores/flash';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Opening Balances', href: '/accounts/opening-balances' },
  { title: 'Add Balances' },
];

// ============================================================================
// INNER CONTENT (uses useSearchParams)
// ============================================================================

function CreateOpeningBalancesContent() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const searchParams = useSearchParams();

  const yearParam = searchParams.get('year');
  const periodParam = searchParams.get('period');

  const [year] = useState<number>(yearParam ? parseInt(yearParam) : new Date().getFullYear());
  const [period] = useState<number>(periodParam ? parseInt(periodParam) : 0);

  const handleSubmit = async (data: SetOpeningBalancesDto) => {
    const result = await openingBalancesApi.set(data);
    if (!result?.success || !result?.count) {
      throw new Error('Save returned unexpected result — balances may not have been saved. Please check and try again.');
    }
    useFlashStore.getState().setFlash('Opening balances saved successfully');
    router.push('/accounts/opening-balances');
  };

  const handleCancel = () => {
    router.push('/accounts/opening-balances');
  };

  // Page actions
  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/accounts/opening-balances'),
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Calculator}
        title="Add Opening Balances"
        description={`Year ${year}, Period ${period === 0 ? 'Opening' : period}`}
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
          year={year}
          period={period}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Balances"
        />
      </div>
    </TenantLayout>
  );
}

// ============================================================================
// CREATE OPENING BALANCES PAGE (with Suspense wrapper)
// ============================================================================

export default function CreateOpeningBalancesPage() {
  return (
    <Suspense
      fallback={
        <TenantLayout breadcrumbs={breadcrumbs}>
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </TenantLayout>
      }
    >
      <CreateOpeningBalancesContent />
    </Suspense>
  );
}
