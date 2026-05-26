'use client';
import { extractErrorMessage } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Coins, Loader2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { CurrencyForm } from '../../components/CurrencyForm';
import { currenciesApi } from '@/lib/api/accounts';
import type { Currency, UpdateCurrencyDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// EDIT CURRENCY PAGE
// ============================================================================

export default function EditCurrencyPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const currencyId = parseInt(params.id as string);

  const [currency, setCurrency] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'Currencies', href: '/accounts/currencies' },
    { title: currency?.code || 'Edit Currency' },
  ];

  // Load currency
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        setLoading(true);
        const data = await currenciesApi.get(currencyId);
        setCurrency(data);
      } catch (err: unknown) {
        console.error('Failed to load currency:', err);
        setError(extractErrorMessage(err, 'Failed to load currency'));
      } finally {
        setLoading(false);
      }
    };

    if (currencyId) {
      loadCurrency();
    }
  }, [currencyId]);

  const handleSubmit = async (data: UpdateCurrencyDto) => {
    await currenciesApi.update(currencyId, { ...data, branchId: selectedBranchId });
    router.push('/accounts/currencies');
  };

  const handleCancel = () => {
    router.push('/accounts/currencies');
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
  if (error || !currency) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg text-muted-foreground mb-4">{error || 'Currency not found'}</p>
          <button
            onClick={() => router.push('/accounts/currencies')}
            className="text-primary hover:underline"
          >
            Back to Currencies
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Coins}
        title={`Edit: ${currency.code}`}
        description={`Update ${currency.name} currency settings`}
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
        <CurrencyForm
          currency={currency}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
