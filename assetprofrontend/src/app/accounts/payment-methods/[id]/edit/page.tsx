'use client';
import { extractErrorMessage } from '@/lib/utils';
import { useEntityFetch } from '@/hooks';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CreditCard, Loader2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { PaymentMethodForm } from '../../components/PaymentMethodForm';
import { paymentMethodsApi } from '@/lib/api/accounts';
import type { PaymentMethod, UpdatePaymentMethodDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// EDIT PAYMENT METHOD PAGE
// ============================================================================

export default function EditPaymentMethodPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const methodId = parseInt(params.id as string);

  const { entity: paymentMethod, loading, error: fetchError } = useEntityFetch({
    queryKey: 'accounts-payment-methods',
    id: methodId,
    fetchFn: paymentMethodsApi.get,
    errorMessage: 'Failed to load payment method',
  });

  const [mutationError, setMutationError] = useState<string | null>(null);
  const error = fetchError || mutationError;

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'Payment Methods', href: '/accounts/payment-methods' },
    { title: paymentMethod?.name || 'Edit', href: `/accounts/payment-methods/${methodId}` },
    { title: 'Edit' },
  ];

  // Fetch payment method
  ;

  const handleSubmit = async (data: UpdatePaymentMethodDto) => {
    await paymentMethodsApi.update(methodId, { ...data, branchId: selectedBranchId });
    router.push(`/accounts/payment-methods/${methodId}`);
  };

  const handleCancel = () => {
    router.push(`/accounts/payment-methods/${methodId}`);
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
  if (error || !paymentMethod) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg text-muted-foreground mb-4">{error || 'Payment method not found'}</p>
          <button
            onClick={() => router.push('/accounts/payment-methods')}
            className="text-primary hover:underline"
          >
            Back to Payment Methods
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={CreditCard}
        title={`Edit ${paymentMethod.name}`}
        description="Update payment method details"
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
        <PaymentMethodForm
          paymentMethod={paymentMethod}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
