'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Mail, Send, Save, X } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { messagesApi } from '@/lib/api/core';
import { employeesApi } from '@/lib/api/hrpayroll';
import type { BreadcrumbItem } from '@/types/core';
import { extractErrorMessage } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Messages', href: '/messages' },
  { title: 'Compose' },
];

interface Recipient {
  id: number;
  fullName: string;
  email?: string;
}

export default function ComposeMessagePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    recipientIds: [] as number[],
    subject: '',
    body: '',
  });

  const { data: employeesData } = useQuery({
    queryKey: ['hrpayroll-employees', 'active-recipients'],
    queryFn: () => employeesApi.list({ employmentStatus: 'ACTIVE', limit: 500 }),
  });

  const employees: Recipient[] = (employeesData?.data ?? []).map((e: Record<string, unknown>) => ({
    id: e.id as number,
    fullName: e.fullName as string,
    email: e.email as string | undefined,
  }));

  const handleRecipientToggle = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      recipientIds: prev.recipientIds.includes(id)
        ? prev.recipientIds.filter((r) => r !== id)
        : [...prev.recipientIds, id],
    }));
  };

  const handleSend = async () => {
    if (formData.recipientIds.length === 0) {
      setError('Please select at least one recipient');
      return;
    }
    if (!formData.subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!formData.body.trim()) {
      setError('Message body is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await messagesApi.send({
        recipientIds: formData.recipientIds,
        subject: formData.subject.trim(),
        body: formData.body.trim(),
      });
      router.push('/messages');
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to send message'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    setError(null);

    try {
      await messagesApi.saveDraft({
        recipientIds: formData.recipientIds,
        subject: formData.subject.trim(),
        body: formData.body.trim(),
      });
      router.push('/messages');
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to save draft'));
    } finally {
      setLoading(false);
    }
  };

  const selectedRecipientNames = employees
    .filter((e) => formData.recipientIds.includes(e.id))
    .map((e) => e.fullName);

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Mail}
        title="Compose Message"
        description="Send a message to employees"
        {...PageHeaderPresets.core}
      />

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              To <span className="text-red-500">*</span>
            </label>
            {selectedRecipientNames.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedRecipientNames.map((name, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {name}
                    <button
                      type="button"
                      onClick={() => handleRecipientToggle(formData.recipientIds[idx])}
                      className="hover:text-primary/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <select
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val) handleRecipientToggle(val);
                e.target.value = '';
              }}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">Add recipient...</option>
              {employees
                .filter((e) => !formData.recipientIds.includes(e.id))
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} {e.email ? `(${e.email})` : ''}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Message subject"
              maxLength={200}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Type your message here..."
              rows={10}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push('/messages')}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-muted"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-muted"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </TenantLayout>
  );
}
