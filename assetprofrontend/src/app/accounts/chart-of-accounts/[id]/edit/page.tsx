'use client';
import { extractErrorMessage } from '@/lib/utils';
import { useEntityFetch } from '@/hooks';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';
import { BookOpen, ArrowLeft, Loader2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { AccountForm } from '../../components/AccountForm';
import { accountsApi } from '@/lib/api/accounts';
import type { UpdateAccountDto, Account } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// EDIT ACCOUNT PAGE
// ============================================================================

export default function EditAccountPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const accountId = parseInt(params.id as string);

  const { entity: account, loading, error: fetchError } = useEntityFetch({
    queryKey: 'accounts-chart-of-accounts',
    id: accountId,
    fetchFn: accountsApi.get,
    errorMessage: 'Failed to load account',
  });

  const [mutationError, setMutationError] = useState<string | null>(null);
  const error = fetchError || mutationError;

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'Chart of Accounts', href: '/accounts/chart-of-accounts' },
    { title: account?.code || 'Edit', href: `/accounts/chart-of-accounts/${accountId}` },
    { title: 'Edit' },
  ];

  const handleSubmit = async (data: UpdateAccountDto) => {
    await accountsApi.update(accountId, { ...data, branchId: selectedBranchId });
    useFlashStore.getState().setFlash('Account updated successfully');
    router.push('/accounts/chart-of-accounts');
  };

  const handleCancel = () => {
    router.push('/accounts/chart-of-accounts');
  };

  // Page actions
  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/accounts/chart-of-accounts'),
    },
  ];

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
  if (error || !account) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg text-muted-foreground mb-4">{error || 'Account not found'}</p>
          <button
            onClick={() => router.push('/accounts/chart-of-accounts')}
            className="text-primary hover:underline"
          >
            Back to Chart of Accounts
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={BookOpen}
        title={`Edit: ${account.code}`}
        description={account.name}
        actions={pageActions}
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
        <AccountForm
          account={account}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
