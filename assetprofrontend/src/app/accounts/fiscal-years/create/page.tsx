'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { Calendar } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { FiscalYearForm } from '../components/FiscalYearForm';
import { fiscalYearsApi } from '@/lib/api/accounts';
import type { CreateFiscalYearDto, UpdateFiscalYearDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Fiscal Years', href: '/accounts/fiscal-years' },
  { title: 'Create Fiscal Year' },
];

// ============================================================================
// CREATE FISCAL YEAR PAGE
// ============================================================================

export default function CreateFiscalYearPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateFiscalYearDto | UpdateFiscalYearDto) => {
    await fiscalYearsApi.create({ ...data, branchId: selectedBranchId } as CreateFiscalYearDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/accounts/fiscal-years');
  };

  const handleCancel = () => {
    router.push('/accounts/fiscal-years');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Calendar}
        title="Create Fiscal Year"
        description="Define a new accounting period"
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
        <FiscalYearForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Fiscal Year"
        />
      </div>
    </TenantLayout>
  );
}
