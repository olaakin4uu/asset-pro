'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { FileText } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { BranchSelector } from '@/components/erp';
import { ExpenseRequestForm } from '../components/ExpenseRequestForm';
import { expenseRequestsApi, companySettingsApi } from '@/lib/api/accounts';
import type { CreateExpenseRequestDto, UpdateExpenseRequestDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Expense Requests', href: '/accounts/expense-requests' },
  { title: 'New Request' },
];

// ============================================================================
// CREATE EXPENSE REQUEST PAGE
// ============================================================================

export default function CreateExpenseRequestPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const [useExpenseApproval, setUseExpenseApproval] = useState<boolean>(true);

  useEffect(() => {
    companySettingsApi.get()
      .then(s => setUseExpenseApproval(s.useExpenseApproval))
      .catch(() => {/* default true */});
  }, []);

  // Create and auto-submit for approval
  const handleSubmit = async (data: CreateExpenseRequestDto | UpdateExpenseRequestDto) => {
    const request = await expenseRequestsApi.create({ ...data, branchId: selectedBranchId } as CreateExpenseRequestDto);
    try {
      await expenseRequestsApi.submit(request.id);
      useFlashStore.getState().setFlash('Expense request created and submitted for approval');
    } catch {
      useFlashStore.getState().setFlash('Expense request created as draft (auto-submit failed)', 'warning');
    }
    router.push('/accounts/expense-requests');
  };

  // Save as draft only
  const handleSaveDraft = async (data: CreateExpenseRequestDto | UpdateExpenseRequestDto) => {
    await expenseRequestsApi.create({ ...data, branchId: selectedBranchId } as CreateExpenseRequestDto);
    useFlashStore.getState().setFlash('Expense request saved as draft');
    router.push('/accounts/expense-requests');
  };

  const handleCancel = () => {
    router.push('/accounts/expense-requests');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={FileText}
        title="New Expense Request"
        description="Create a new expense request for approval"
        {...PageHeaderPresets.financial}
      />
        <BranchSelector
          branches={branches}
          value={selectedBranchId}
          onChange={setSelectedBranchId}
          hasSingleBranch={hasSingleBranch}
          className="mb-4"
        />

      <div className="mx-auto">
        <ExpenseRequestForm
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          onCancel={handleCancel}
          submitLabel="Create Request"
          useExpenseApproval={useExpenseApproval}
        />
      </div>
    </TenantLayout>
  );
}
