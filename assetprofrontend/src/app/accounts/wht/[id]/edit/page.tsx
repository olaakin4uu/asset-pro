'use client';
import { extractErrorMessage } from '@/lib/utils';
import { useEntityFetch } from '@/hooks';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FileText, Loader2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { WhtForm } from '../../components/WhtForm';
import { whtApi } from '@/lib/api/accounts';
import type { Wht, UpdateWhtDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// EDIT WHT PAGE
// ============================================================================

export default function EditWhtPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const whtId = parseInt(params.id as string);

  const { entity: wht, loading, error: fetchError } = useEntityFetch({
    queryKey: 'accounts-wht',
    id: whtId,
    fetchFn: whtApi.get,
    errorMessage: 'Failed to load wht',
  });

  const [mutationError, setMutationError] = useState<string | null>(null);
  const error = fetchError || mutationError;

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'WHT Management', href: '/accounts/wht' },
    { title: wht?.name || 'Edit', href: `/accounts/wht/${whtId}` },
    { title: 'Edit' },
  ];

  // Fetch WHT
  ;

  const handleSubmit = async (data: UpdateWhtDto) => {
    await whtApi.update(whtId, { ...data, branchId: selectedBranchId });
    router.push(`/accounts/wht/${whtId}`);
  };

  const handleCancel = () => {
    router.push(`/accounts/wht/${whtId}`);
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
  if (error || !wht) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg text-muted-foreground mb-4">{error || 'WHT rate not found'}</p>
          <button
            onClick={() => router.push('/accounts/wht')}
            className="text-primary hover:underline"
          >
            Back to WHT Management
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={FileText}
        title={`Edit ${wht.name}`}
        description="Update Withholding Tax rate details"
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
        <WhtForm
          wht={wht}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
