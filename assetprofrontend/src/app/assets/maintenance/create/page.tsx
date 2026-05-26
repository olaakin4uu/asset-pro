'use client';

import { useRouter } from 'next/navigation';
import { Wrench } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, BranchSelector } from '@/components/erp';
import { MaintenanceForm } from '../components/MaintenanceForm';
import { assetMaintenancesApi } from '@/lib/api/assets';
import type { CreateAssetMaintenanceDto, UpdateAssetMaintenanceDto } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }, { title: 'Assets', href: '/assets' }, { title: 'Maintenance', href: '/assets/maintenance' }, { title: 'New Maintenance' }];

export default function CreateMaintenancePage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const handleSubmit = async (data: CreateAssetMaintenanceDto | UpdateAssetMaintenanceDto) => { await assetMaintenancesApi.create({ ...data, branchId: selectedBranchId } as CreateAssetMaintenanceDto); router.push('/assets/maintenance'); };
  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader icon={Wrench} title="New Maintenance" description="Schedule a new maintenance activity" {...PageHeaderPresets.operations} />
        <BranchSelector
          branches={branches}
          value={selectedBranchId}
          onChange={setSelectedBranchId}
          hasSingleBranch={hasSingleBranch}
          className="mb-4"
        />
      <div><MaintenanceForm onSubmit={handleSubmit} onCancel={() => router.push('/assets/maintenance')} submitLabel="Create Maintenance" /></div>
    </TenantLayout>
  );
}
