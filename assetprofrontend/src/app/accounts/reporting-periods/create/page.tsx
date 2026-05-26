'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { Calendar } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { ReportingPeriodForm } from '../components/ReportingPeriodForm';
import type { CreateReportingPeriodDto, UpdateReportingPeriodDto } from '../components/ReportingPeriodForm';
import { reportingPeriodsApi } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Reporting Periods', href: '/accounts/reporting-periods' },
  { title: 'New Period' },
];

export default function CreateReportingPeriodPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateReportingPeriodDto | UpdateReportingPeriodDto) => {
    await reportingPeriodsApi.create({ ...data, branchId: selectedBranchId } as CreateReportingPeriodDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/accounts/reporting-periods');
  };

  const handleCancel = () => {
    router.push('/accounts/reporting-periods');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Calendar}
        title="New Reporting Period"
        description="Create a new accounting reporting period"
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
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Period"
        />
      </div>
    </TenantLayout>
  );
}
