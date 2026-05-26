'use client';
import { extractErrorMessage } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FileText, Loader2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { BranchSelector } from '@/components/erp';
import { ExpenseRequestForm } from '../../components/ExpenseRequestForm';
import { expenseRequestsApi, companySettingsApi } from '@/lib/api/accounts';
import type { ExpenseRequest, UpdateExpenseRequestDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useEntityFetch, useIsSuperAdmin } from '@/hooks';
import { useBranchAccess } from '@/hooks/useBranchAccess';

// ============================================================================
// EDIT EXPENSE REQUEST PAGE
// ============================================================================

export default function EditExpenseRequestPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const requestId = parseInt(params.id as string);

  const [useExpenseApproval, setUseExpenseApproval] = useState<boolean>(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    companySettingsApi.get()
      .then(s => setUseExpenseApproval(s.useExpenseApproval))
      .catch(() => {/* default true */});
  }, []);

  const { entity: expenseRequest, loading, error } = useEntityFetch<ExpenseRequest>({
    queryKey: 'accounts-expense-requests',
    id: requestId,
    fetchFn: expenseRequestsApi.get,
    errorMessage: 'Failed to load expense request',
  });

  const isSuperAdmin = useIsSuperAdmin();

  // Edit is permitted when: draft, rejected, pending-before-any-approval, OR
  // Super Admin editing any non-finalised status (approved / pending-in-flight
  // are allowed; paid and cancelled are finalised and locked even for SA).
  const canEditHere =
    !!expenseRequest &&
    (expenseRequest.status === 'draft' ||
      expenseRequest.status === 'rejected' ||
      (expenseRequest.status === 'pending' && !expenseRequest.approvalsStarted) ||
      (isSuperAdmin && !['paid', 'cancelled'].includes(expenseRequest.status)));

  useEffect(() => {
    if (expenseRequest && !canEditHere) {
      router.push(`/accounts/expense-requests/${requestId}`);
    }
  }, [expenseRequest, canEditHere, requestId, router]);

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'Expense Requests', href: '/accounts/expense-requests' },
    { title: expenseRequest?.requestNumber || 'Edit', href: `/accounts/expense-requests/${requestId}` },
    { title: 'Edit' },
  ];

  const handleSubmit = async (data: UpdateExpenseRequestDto) => {
    setSubmitError(null);
    try {
      await expenseRequestsApi.update(requestId, { ...data, branchId: selectedBranchId });

      // Auto-resubmit if the request was rejected — resets approval to step 1
      if (expenseRequest?.status === 'rejected') {
        await expenseRequestsApi.resubmit(requestId);
      }

      router.push('/accounts/expense-requests');
    } catch (err: unknown) {
      setSubmitError(extractErrorMessage(err, 'Failed to save expense request'));
    }
  };

  const handleCancel = () => {
    router.push(`/accounts/expense-requests/${requestId}`);
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
  if (error || !expenseRequest) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg text-muted-foreground mb-4">{error || 'Expense request not found'}</p>
          <button
            onClick={() => router.push('/accounts/expense-requests')}
            className="text-primary hover:underline"
          >
            Back to Expense Requests
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={FileText}
        title={`Edit ${expenseRequest.requestNumber}`}
        description="Update expense request details"
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
        {submitError && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submitError}
          </div>
        )}
        <ExpenseRequestForm
          expenseRequest={expenseRequest}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
          useExpenseApproval={useExpenseApproval}
        />
      </div>
    </TenantLayout>
  );
}
