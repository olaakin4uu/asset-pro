'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { BookOpen, ArrowLeft } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { AccountForm } from '../components/AccountForm';
import { accountsApi } from '@/lib/api/accounts';
import type { CreateAccountDto, UpdateAccountDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Chart of Accounts', href: '/accounts/chart-of-accounts' },
  { title: 'Create Account' },
];

// ============================================================================
// CREATE ACCOUNT PAGE
// ============================================================================

export default function CreateAccountPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreateAccountDto | UpdateAccountDto) => {
    await accountsApi.create({ ...data, branchId: selectedBranchId } as CreateAccountDto);
    useFlashStore.getState().setFlash('Account created successfully');
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

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={BookOpen}
        title="Create Account"
        description="Add a new account to the chart of accounts"
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
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Account"
        />
      </div>
    </TenantLayout>
  );
}
