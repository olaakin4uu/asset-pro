'use client';
import { extractErrorMessage } from '@/lib/utils';
import { useEntityFetch } from '@/hooks';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Calendar, ArrowLeft } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { ReportingPeriodForm } from '../../components/ReportingPeriodForm';
import type { ReportingPeriod, UpdateReportingPeriodDto } from '../../components/ReportingPeriodForm';
import { reportingPeriodsApi } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

export default function EditReportingPeriodPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const periodId = parseInt(params.id as string);

  const { entity: entity, loading, error: fetchError } = useEntityFetch({
    queryKey: 'accounts-reporting-periods',
    id: periodId,
    fetchFn: reportingPeriodsApi.get,
    errorMessage: 'Failed to load entity',
  });

  const [mutationError, setMutationError] = useState<string | null>(null);
  const error = fetchError || mutationError;

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'Reporting Periods', href: '/accounts/reporting-periods' },
    { title: entity ? `P${entity.number} — ${entity.label}` : 'Loading...', href: `/accounts/reporting-periods/${periodId}` },
    { title: 'Edit' },
  ];

  const handleSubmit = async (data: UpdateReportingPeriodDto) => {
    await reportingPeriodsApi.update(periodId, { ...data, branchId: selectedBranchId });
    router.push(`/accounts/reporting-periods/${periodId}`);
  };

  const handleCancel = () => {
    router.push(`/accounts/reporting-periods/${periodId}`);
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
          <p className="text-red-500 mb-4">{error || 'Reporting period not found'}</p>
          <button onClick={() => router.push('/accounts/reporting-periods')} className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
            Back to Reporting Periods
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Calendar}
        title={`Edit: P${entity.number} — ${entity.label}`}
        description="Update reporting period details"
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
        <ReportingPeriodForm
          entity={entity}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
