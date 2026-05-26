'use client';
import { useEntityFetch } from '@/hooks';
import { useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { BankForm } from '../../components/BankForm';
import { banksApi } from '@/lib/api/accounts';
import type { UpdateBankDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';

// ============================================================================
// EDIT BANK PAGE
// ============================================================================

export default function EditBankPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const bankId = parseInt(params.id as string);

  const { entity: bank, loading, error } = useEntityFetch({
    queryKey: 'accounts-banks',
    id: bankId,
    fetchFn: banksApi.get,
    errorMessage: 'Failed to load bank',
  });

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'Bank Accounts', href: '/accounts/banks' },
    { title: bank?.name || 'Edit', href: `/accounts/banks/${bankId}` },
    { title: 'Edit' },
  ];

  const handleSubmit = async (data: UpdateBankDto) => {
    await banksApi.update(bankId, data);
    queryClient.invalidateQueries({ queryKey: ['accounts-banks'] });
    router.push(`/accounts/banks/${bankId}`);
  };

  const handleCancel = () => {
    router.push(`/accounts/banks/${bankId}`);
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
  if (error || !bank) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg text-muted-foreground mb-4">{error || 'Bank account not found'}</p>
          <button
            onClick={() => router.push('/accounts/banks')}
            className="text-primary hover:underline"
          >
            Back to Bank Accounts
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Building2}
        title={`Edit ${bank.name}`}
        description="Update bank account details"
        {...PageHeaderPresets.financial}
      />
      <div>
        <BankForm
          bank={bank}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
