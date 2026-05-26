'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Calendar, Loader2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { FiscalYearForm } from '../../components/FiscalYearForm';
import { fiscalYearsApi } from '@/lib/api/accounts';
import type { FiscalYear, UpdateFiscalYearDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useEntityFetch } from '@/hooks';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// EDIT FISCAL YEAR PAGE
// ============================================================================

export default function EditFiscalYearPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const fiscalYearId = parseInt(params.id as string);

  const { entity: fiscalYear, loading, error } = useEntityFetch<FiscalYear>({
    queryKey: 'accounts-fiscal-years',
    id: fiscalYearId,
    fetchFn: fiscalYearsApi.get,
    errorMessage: 'Failed to load fiscal year',
  });

  // Check if closed - redirect if so
  useEffect(() => {
    if (fiscalYear && fiscalYear.status === 'closed') {
      router.push(`/accounts/fiscal-years/${fiscalYearId}`);
    }
  }, [fiscalYear, fiscalYearId, router]);

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'Fiscal Years', href: '/accounts/fiscal-years' },
    { title: fiscalYear?.name || 'Edit', href: `/accounts/fiscal-years/${fiscalYearId}` },
    { title: 'Edit' },
  ];

  const handleSubmit = async (data: UpdateFiscalYearDto) => {
    await fiscalYearsApi.update(fiscalYearId, { ...data, branchId: selectedBranchId });
    router.push(`/accounts/fiscal-years/${fiscalYearId}`);
  };

  const handleCancel = () => {
    router.push(`/accounts/fiscal-years/${fiscalYearId}`);
  };

  // Loading state
  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </TenantLayout>
    );
  }

  // Error state
  if (error || !fiscalYear) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg text-muted-foreground mb-4">{error || 'Fiscal year not found'}</p>
          <button
            onClick={() => router.push('/accounts/fiscal-years')}
            className="text-primary hover:underline"
          >
            Back to Fiscal Years
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Calendar}
        title={`Edit ${fiscalYear.name}`}
        description="Update fiscal year details"
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
          fiscalYear={fiscalYear}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
