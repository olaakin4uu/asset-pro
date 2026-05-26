'use client';

import { useRouter } from 'next/navigation';
import { Inbox } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { useQueryClient } from '@tanstack/react-query';
import { miscReceiptsApi, type CreateMiscReceiptDto } from '@/lib/api/accounts';
import { MiscReceiptForm } from '../components/MiscReceiptForm';
import type { BreadcrumbItem } from '@/types/core';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Misc Receipts', href: '/accounts/misc-receipts' },
  { title: 'New Receipt' },
];

export default function CreateMiscReceiptPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSubmit = async (data: CreateMiscReceiptDto) => {
    await miscReceiptsApi.create(data);
    queryClient.invalidateQueries({ queryKey: ['misc-receipts'] });
    queryClient.invalidateQueries({ queryKey: ['misc-receipts-stats'] });
    router.push('/accounts/misc-receipts');
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Inbox}
        title="New Miscellaneous Receipt"
        description="Record a bank receipt with no customer attached"
        {...PageHeaderPresets.financial}
      />
      <div className="max-w-3xl mx-auto">
        <MiscReceiptForm
          onSubmit={handleSubmit}
          onCancel={() => router.push('/accounts/misc-receipts')}
          submitLabel="Create Receipt"
        />
      </div>
    </TenantLayout>
  );
}
