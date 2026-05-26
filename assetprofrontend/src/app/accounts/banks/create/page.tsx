'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { Building2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { BankForm } from '../components/BankForm';
import { banksApi } from '@/lib/api/accounts';
import type { CreateBankDto, UpdateBankDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Bank Accounts', href: '/accounts/banks' },
  { title: 'Add Bank Account' },
];

// ============================================================================
// CREATE BANK PAGE
// ============================================================================

export default function CreateBankPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateBankDto | UpdateBankDto) => {
    await banksApi.create({ ...data, branchId: selectedBranchId } as CreateBankDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/accounts/banks');
  };

  const handleCancel = () => {
    router.push('/accounts/banks');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Building2}
        title="Add Bank Account"
        description="Create a new bank account for your organization"
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
        <BankForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Bank Account"
        />
      </div>
    </TenantLayout>
  );
}
