'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Wrench, ArrowLeft } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, BranchSelector } from '@/components/erp';
import { MaintenanceForm } from '../../components/MaintenanceForm';
import { assetMaintenancesApi } from '@/lib/api/assets';
import type { CreateAssetMaintenanceDto, UpdateAssetMaintenanceDto } from '@/types/assets';
import type { BreadcrumbItem } from '@/types/core';
import { extractErrorMessage } from '@/lib/utils';
import { useBranchAccess } from '@/hooks/useBranchAccess';

export default function EditMaintenancePage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const maintenanceId = parseInt(params.id as string);

  const { data: maintenanceData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['assets-maintenance', maintenanceId],
    queryFn: () => assetMaintenancesApi.get(maintenanceId),
    enabled: !!maintenanceId && !isNaN(maintenanceId),
  });

  const isNotScheduled = maintenanceData && maintenanceData.status !== 'scheduled';
  const maintenance = isNotScheduled ? null : maintenanceData ?? null;
  const error = isNotScheduled
    ? 'Only scheduled maintenance can be edited'
    : fetchError ? extractErrorMessage(fetchError, 'Failed to load maintenance') : null;

  const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }, { title: 'Assets', href: '/assets' }, { title: 'Maintenance', href: '/assets/maintenance' }, { title: maintenanceData?.maintenanceNumber || 'Loading...', href: `/assets/maintenance/${maintenanceId}` }, { title: 'Edit' }];

  const handleSubmit = async (data: CreateAssetMaintenanceDto | UpdateAssetMaintenanceDto) => { await assetMaintenancesApi.update(maintenanceId, { ...data, branchId: selectedBranchId } as UpdateAssetMaintenanceDto); router.push(`/assets/maintenance/${maintenanceId}`); };

  if (loading) return <TenantLayout breadcrumbs={breadcrumbs}><div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></TenantLayout>;
  if (error || !maintenance) return <TenantLayout breadcrumbs={breadcrumbs}><div className="flex flex-col items-center justify-center py-12"><p className="text-red-500 mb-4">{error || 'Maintenance not found'}</p><button onClick={() => router.push('/assets/maintenance')} className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"><ArrowLeft className="h-4 w-4" />Back</button></div></TenantLayout>;

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader icon={Wrench} title={`Edit: ${maintenance.title}`} description="Update maintenance details" {...PageHeaderPresets.operations} />
        <BranchSelector
          branches={branches}
          value={selectedBranchId}
          onChange={setSelectedBranchId}
          hasSingleBranch={hasSingleBranch}
          className="mb-4"
        />
      <div><MaintenanceForm maintenance={maintenance} onSubmit={handleSubmit} onCancel={() => router.push(`/assets/maintenance/${maintenanceId}`)} submitLabel="Save Changes" /></div>
    </TenantLayout>
  );
}
