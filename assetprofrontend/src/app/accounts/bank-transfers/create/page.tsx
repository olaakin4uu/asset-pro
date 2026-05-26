'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { ArrowLeftRight } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { BranchSelector } from '@/components/erp';
import { BankTransferForm } from '../components/BankTransferForm';
import { banksApi } from '@/lib/api/accounts';
import type { BankTransferDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Bank Transfers', href: '/accounts/bank-transfers' },
  { title: 'New Transfer' },
];

// ============================================================================
// CREATE BANK TRANSFER PAGE
// ============================================================================

export default function CreateBankTransferPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  // Create and auto-submit for approval
  const handleSubmit = async (data: BankTransferDto) => {
    const transfer = await banksApi.createTransfer(data);
    try {
      await banksApi.submitTransfer(transfer.id);
      useFlashStore.getState().setFlash('Bank transfer created and submitted for approval');
    } catch {
      useFlashStore.getState().setFlash('Bank transfer created as draft (auto-submit failed)', 'warning');
    }
    router.push('/accounts/bank-transfers');
  };

  // Save as draft only
  const handleSaveDraft = async (data: BankTransferDto) => {
    await banksApi.createTransfer(data);
    useFlashStore.getState().setFlash('Bank transfer saved as draft');
    router.push('/accounts/bank-transfers');
  };

  const handleCancel = () => {
    router.push('/accounts/bank-transfers');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={ArrowLeftRight}
        title="New Bank Transfer"
        description="Transfer funds between bank accounts"
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
        <BankTransferForm
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          onCancel={handleCancel}
          submitLabel="Create Transfer"
        />
      </div>
    </TenantLayout>
  );
}
