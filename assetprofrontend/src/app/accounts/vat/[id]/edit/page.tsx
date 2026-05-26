'use client';
import { extractErrorMessage } from '@/lib/utils';
import { useEntityFetch } from '@/hooks';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';
import { Receipt, Loader2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { VatForm } from '../../components/VatForm';
import { vatApi } from '@/lib/api/accounts';
import type { Vat, UpdateVatDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// EDIT VAT PAGE
// ============================================================================

export default function EditVatPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const vatId = parseInt(params.id as string);

  const { entity: vat, loading, error: fetchError } = useEntityFetch({
    queryKey: 'accounts-vat',
    id: vatId,
    fetchFn: vatApi.get,
    errorMessage: 'Failed to load vat',
  });

  const [mutationError, setMutationError] = useState<string | null>(null);
  const error = fetchError || mutationError;

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'VAT Management', href: '/accounts/vat' },
    { title: vat?.name || 'Edit', href: `/accounts/vat/${vatId}` },
    { title: 'Edit' },
  ];

  // Fetch VAT
  ;

  const handleSubmit = async (data: UpdateVatDto) => {
    await vatApi.update(vatId, { ...data, branchId: selectedBranchId });
    useFlashStore.getState().setFlash('VAT rate updated successfully');
    router.push(`/accounts/vat/${vatId}`);
  };

  const handleCancel = () => {
    router.push(`/accounts/vat/${vatId}`);
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
  if (error || !vat) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg text-muted-foreground mb-4">{error || 'VAT rate not found'}</p>
          <button
            onClick={() => router.push('/accounts/vat')}
            className="text-primary hover:underline"
          >
            Back to VAT Management
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Receipt}
        title={`Edit ${vat.name}`}
        description="Update VAT rate details"
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
        <VatForm
          vat={vat}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
