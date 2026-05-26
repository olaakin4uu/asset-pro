'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Inbox } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { LoadingSpinner } from '@/components/erp';
import { useQueryClient } from '@tanstack/react-query';
import { miscReceiptsApi, type MiscReceipt, type CreateMiscReceiptDto } from '@/lib/api/accounts';
import { MiscReceiptForm } from '../../components/MiscReceiptForm';
import { extractErrorMessage } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/core';

export default function EditMiscReceiptPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  const queryClient = useQueryClient();

  const [receipt, setReceipt] = useState<MiscReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'Misc Receipts', href: '/accounts/misc-receipts' },
    { title: receipt ? `Edit ${receipt.receiptNumber}` : 'Edit' },
  ];

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await miscReceiptsApi.get(id);
      setReceipt(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load receipt'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) load(); }, [load, id]);

  const handleSubmit = async (data: CreateMiscReceiptDto) => {
    await miscReceiptsApi.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['misc-receipts'] });
    router.push('/accounts/misc-receipts');
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (error || !receipt) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 p-4 text-red-700 dark:text-red-400">
          {error || 'Receipt not found'}
        </div>
      </TenantLayout>
    );
  }
  if (receipt.status === 'posted') {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 p-4 text-amber-700 dark:text-amber-400">
          Posted receipts cannot be edited.
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Inbox}
        title={`Edit ${receipt.receiptNumber}`}
        description="Update miscellaneous receipt details"
        {...PageHeaderPresets.financial}
      />
      <div className="max-w-3xl mx-auto">
        <MiscReceiptForm
          receipt={receipt}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/accounts/misc-receipts')}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
