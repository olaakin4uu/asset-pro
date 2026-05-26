'use client';

import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { CreditCard } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { PaymentMethodForm } from '../components/PaymentMethodForm';
import { paymentMethodsApi } from '@/lib/api/accounts';
import type { CreatePaymentMethodDto, UpdatePaymentMethodDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Payment Methods', href: '/accounts/payment-methods' },
  { title: 'Add Payment Method' },
];

// ============================================================================
// CREATE PAYMENT METHOD PAGE
// ============================================================================

export default function CreatePaymentMethodPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();

  const handleSubmit = async (data: CreatePaymentMethodDto | UpdatePaymentMethodDto) => {
    await paymentMethodsApi.create({ ...data, branchId: selectedBranchId } as CreatePaymentMethodDto);
    useFlashStore.getState().setFlash('Saved successfully');
    router.push('/accounts/payment-methods');
  };

  const handleCancel = () => {
    router.push('/accounts/payment-methods');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={CreditCard}
        title="Add Payment Method"
        description="Create a new payment method for transactions"
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
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Create Payment Method"
        />
      </div>
    </TenantLayout>
  );
}
