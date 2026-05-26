'use client';
import { extractErrorMessage } from '@/lib/utils';
import { useEntityFetch } from '@/hooks';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FileText, ArrowLeft, Loader2, Lock } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { JournalEntryForm } from '../../components/JournalEntryForm';
import { journalEntriesApi } from '@/lib/api/accounts';
import type { UpdateJournalEntryDto, JournalEntry } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';

// ============================================================================
// EDIT JOURNAL ENTRY PAGE
// ============================================================================

export default function EditJournalEntryPage() {
  const router = useRouter();
  const params = useParams();
  const entryId = parseInt(params.id as string);

  const { entity: entry, loading, error: fetchError } = useEntityFetch({
    queryKey: 'accounts-journal-entries',
    id: entryId,
    fetchFn: journalEntriesApi.get,
    errorMessage: 'Failed to load entry',
  });

  const [mutationError, setMutationError] = useState<string | null>(null);
  const error = fetchError || mutationError;

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'Journal Entries', href: '/accounts/journal-entries' },
    { title: entry?.entryNumber || 'Edit', href: `/accounts/journal-entries/${entryId}` },
    { title: 'Edit' },
  ];

  // Fetch entry
  ;

  const handleSubmit = async (data: UpdateJournalEntryDto) => {
    await journalEntriesApi.update(entryId, data);
    router.push('/accounts/journal-entries');
  };

  const handleCancel = () => {
    router.push('/accounts/journal-entries');
  };

  // Check if entry is editable
  const isEditable = entry && (entry.status === 'draft' || entry.status === 'pending');

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
  if (error || !entry) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg text-muted-foreground mb-4">{error || 'Journal entry not found'}</p>
          <button
            onClick={() => router.push('/accounts/journal-entries')}
            className="text-primary hover:underline"
          >
            Back to Journal Entries
          </button>
        </div>
      </TenantLayout>
    );
  }

  // Not editable state
  if (!isEditable) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <PageHeader
          icon={FileText}
          title={entry.entryNumber}
          description="This journal entry cannot be edited"
          actions={pageActions}
          {...PageHeaderPresets.financial}
        />

        <div className="mx-auto">
          <div className="rounded-xl border bg-card p-8 text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Entry is Not Editable</h3>
            <p className="text-muted-foreground mb-4">
              This journal entry has a status of <strong>{entry.status}</strong> and cannot be modified.
              {entry.status === 'posted' && ' Posted entries must be reversed to make corrections.'}
              {entry.status === 'reversed' && ' Reversed entries cannot be modified.'}
            </p>
            <button
              onClick={() => router.push('/accounts/journal-entries')}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Journal Entries
            </button>
          </div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={FileText}
        title={`Edit: ${entry.entryNumber}`}
        description={entry.narration || 'Journal entry'}
        actions={pageActions}
        badge={{
          text: entry.status.toUpperCase(),
          variant: entry.status === 'draft' ? 'secondary' : 'warning',
        }}
        {...PageHeaderPresets.financial}
      />

      <div className="max-w-6xl mx-auto">
        <JournalEntryForm
          journalEntry={entry}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Save Changes"
        />
      </div>
    </TenantLayout>
  );
}
