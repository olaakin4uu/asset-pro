'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Mail,
  ArrowLeft,
  Reply,
  Trash2,
  Clock,
  User,
  Users,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, type PageHeaderAction } from '@/components/erp';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { messagesApi } from '@/lib/api/core';
import type { BreadcrumbItem } from '@/types/core';
import { extractErrorMessage } from '@/lib/utils';

interface MessageDetail {
  id: number;
  subject: string;
  body: string;
  senderName?: string;
  senderId?: number;
  recipientNames?: string[];
  recipientIds?: number[];
  isRead: boolean;
  isDraft: boolean;
  sentAt?: string;
  createdAt: string;
}

export default function MessageDetailPage() {
  const router = useRouter();
  const params = useParams();
  const messageId = parseInt(params.id as string);

  const { data: message, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['messages', messageId],
    queryFn: () => messagesApi.get(messageId),
    enabled: !!messageId && !isNaN(messageId),
  });

  const [error, setError] = useState<string | null>(null);
  const displayError = fetchError ? extractErrorMessage(fetchError, 'Failed to load message') : error;

  // Mark as read when message loads
  useEffect(() => {
    if (message && !message.isRead) {
      messagesApi.markRead(messageId).catch(() => {});
    }
  }, [message, messageId]);

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Messages', href: '/messages' },
    { title: message?.subject || 'Loading...' },
  ];

  const handleDelete = () => {
    confirmDialog({
      message: 'Delete this message?',
      header: 'Delete Message',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await messagesApi.delete(messageId);
          router.push('/messages');
        } catch (err: unknown) {
          setError(extractErrorMessage(err, 'Failed to delete message'));
        }
      },
    });
  };

  const pageActions: PageHeaderAction[] = [
    { id: 'back', label: 'Back', icon: ArrowLeft, variant: 'outline', onClick: () => router.push('/messages') },
    { id: 'reply', label: 'Reply', icon: Reply, variant: 'outline', onClick: () => router.push(`/messages/compose?replyTo=${messageId}`) },
    { id: 'delete', label: 'Delete', icon: Trash2, variant: 'outline', onClick: handleDelete },
  ];

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </TenantLayout>
    );
  }

  if (displayError || !message) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <PageHeader icon={Mail} title="Message" {...PageHeaderPresets.core} actions={pageActions} />
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-600">
          {displayError || 'Message not found'}
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      <PageHeader
        icon={Mail}
        title={message.subject || '(No subject)'}
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      <div>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-6 border-b space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{message.senderName || 'Unknown Sender'}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(message.sentAt || message.createdAt).toLocaleString('en-NG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>

            {message.recipientNames && message.recipientNames.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>To: {message.recipientNames.join(', ')}</span>
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {message.body}
            </div>
          </div>
        </div>
      </div>
    </TenantLayout>
  );
}
