'use client';
import { extractErrorMessage } from '@/lib/utils';
import { useRouter, useParams } from 'next/navigation';
import { Scale, ArrowLeft } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { BranchSelector } from '@/components/erp';
import { BankReconciliationForm } from '../../components/BankReconciliationForm';
import { banksApi } from '@/lib/api/accounts';
import type { UpdateBankReconciliationDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useQuery } from '@tanstack/react-query';
import { useBranchAccess } from '@/hooks/useBranchAccess';

export default function EditBankReconciliationPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const reconciliationId = parseInt(params.id as string);

  const { data: entity, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['accounts-bank-reconciliation', reconciliationId],
    queryFn: () => banksApi.getReconciliation(reconciliationId),
    enabled: !!reconciliationId && !isNaN(reconciliationId),
  });

  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load reconciliation') : null;

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'Bank Reconciliation', href: '/accounts/bank-reconciliation' },
    { title: entity ? `#${entity.id}` : 'Loading...', href: `/accounts/bank-reconciliation/${reconciliationId}` },
    { title: 'Edit' },
  ];

  const handleSubmit = async (data: UpdateBankReconciliationDto) => {
    await banksApi.updateReconciliation(reconciliationId, data);
    router.push(`/accounts/bank-reconciliation/${reconciliationId}`);
  };

  const handleCancel = () => {
    router.push(`/accounts/bank-reconciliation/${reconciliationId}`);
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
          <p className="text-red-500 mb-4">{error || 'Reconciliation not found'}</p>
          <button onClick={() => router.push('/accounts/bank-reconciliation')} className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
            Back to Reconciliations
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Scale}
        title={`Edit Reconciliation #${entity.id}`}
        description="Update reconciliation details"
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
        <BankReconciliationForm
          entity={entity}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
