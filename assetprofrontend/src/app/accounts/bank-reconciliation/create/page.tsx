'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { Scale } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { BranchSelector } from '@/components/erp';
import { BankReconciliationForm } from '../components/BankReconciliationForm';
import { banksApi } from '@/lib/api/accounts';
import type { CreateBankReconciliationDto, UpdateBankReconciliationDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Bank Reconciliation', href: '/accounts/bank-reconciliation' },
  { title: 'New Reconciliation' },
];

export default function CreateBankReconciliationPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateBankReconciliationDto | UpdateBankReconciliationDto) => {
    await banksApi.createReconciliation(data as CreateBankReconciliationDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/accounts/bank-reconciliation');
  };

  const handleCancel = () => {
    router.push('/accounts/bank-reconciliation');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Scale}
        title="New Bank Reconciliation"
        description="Create a new bank reconciliation"
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
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Reconciliation"
        />
      </div>
    </TenantLayout>
  );
}
