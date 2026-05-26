'use client';

import { useRouter } from 'next/navigation';

import { FileText, ArrowLeft } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { JournalEntryForm } from '../components/JournalEntryForm';
import { journalEntriesApi } from '@/lib/api/accounts';
import type { CreateJournalEntryDto, UpdateJournalEntryDto } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Journal Entries', href: '/accounts/journal-entries' },
  { title: 'Create Journal Entry' },
];

// ============================================================================
// CREATE JOURNAL ENTRY PAGE
// ============================================================================

export default function CreateJournalEntryPage() {
  const router = useRouter();

  const handleSubmit = async (data: CreateJournalEntryDto | UpdateJournalEntryDto) => {
    await journalEntriesApi.create(data as CreateJournalEntryDto);
    router.push('/accounts/journal-entries');
  };

  const handleSubmitAndPost = async (data: CreateJournalEntryDto | UpdateJournalEntryDto) => {
    const entry = await journalEntriesApi.create(data as CreateJournalEntryDto);
    if (entry.id) {
      await journalEntriesApi.post(entry.id);
    }
    router.push('/accounts/journal-entries');
  };

  const handleCancel = () => {
    router.push('/accounts/journal-entries');
  };

  // Page actions
  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/accounts/journal-entries'),
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={FileText}
        title="Create Journal Entry"
        description="Record a new journal entry with balanced debits and credits"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <div className="max-w-6xl mx-auto">
        <JournalEntryForm
          onSubmit={handleSubmit}
          onSubmitAndPost={handleSubmitAndPost}
          onCancel={handleCancel}
        />
      </div>
    </TenantLayout>
  );
}
