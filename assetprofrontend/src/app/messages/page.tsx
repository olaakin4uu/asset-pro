'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Send,
  FileText,
  Plus,
  Search,
  CheckCheck,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, type PageHeaderAction, LoadingSpinner} from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { messagesApi } from '@/lib/api/core';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Messages' },
];

type TabType = 'inbox' | 'sent' | 'drafts';

interface Message {
  id: number;
  subject: string;
  body: string;
  senderName?: string;
  senderId?: number;
  recipientNames?: string[];
  isRead: boolean;
  isDraft: boolean;
  sentAt?: string;
  createdAt: string;
}

export default function MessagesPage() {
  const router = useRouter();

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const [search, setSearch] = useState('');

  const { data: messagesData, isLoading: loading } = useQuery({
    queryKey: ['messages', activeTab, search],
    queryFn: () => messagesApi.list({
      folder: activeTab,
      search: search || undefined,
    }),
  });

  const messages = messagesData?.data ?? [];

  const handleMarkRead = async (id: number) => {
    try {
      await messagesApi.markRead(id);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch (err) {
      console.error('Failed to mark message as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await messagesApi.markAllRead();
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };

  const unreadCount = messages.filter((m) => !m.isRead).length;

  const pageActions: PageHeaderAction[] = [
    { id: 'refresh', label: 'Refresh', icon: RefreshCw, variant: 'outline', onClick: handleRefresh },
    ...(activeTab === 'inbox' && unreadCount > 0
      ? [{ id: 'mark-all-read', label: 'Mark All Read', icon: CheckCheck, variant: 'outline' as const, onClick: handleMarkAllRead }]
      : []),
    { id: 'compose', label: 'Compose', icon: Plus, variant: 'default', onClick: () => router.push('/messages/compose') },
  ];

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'drafts', label: 'Drafts', icon: FileText },
  ];

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Mail}
        title="Messages"
        description="Internal messaging system"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      <StatCardsGrid columns={3} className="mb-6">
        <StatCard title="Inbox" value={messages.length} icon={Inbox} color={StatCardColors.blue} />
        <StatCard title="Unread" value={unreadCount} icon={Mail} color={StatCardColors.amber} />
        <StatCard title="Sent Today" value={0} icon={Send} color={StatCardColors.green} />
      </StatCardsGrid>

      <div className="mb-6">
        <div className="flex items-center gap-1 border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : messages.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No messages</h3>
          <p className="text-muted-foreground mt-1">
            {activeTab === 'inbox' ? 'Your inbox is empty' : activeTab === 'sent' ? 'No sent messages' : 'No draft messages'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden divide-y">
          {messages.map((message) => (
            <div
              key={message.id}
              onClick={() => router.push(`/messages/${message.id}`)}
              className={cn(
                'flex items-start gap-4 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors',
                !message.isRead && activeTab === 'inbox' && 'bg-blue-50/50 dark:bg-blue-900/10'
              )}
            >
              <div className="flex-shrink-0 mt-1">
                {!message.isRead && activeTab === 'inbox' ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                ) : (
                  <div className="h-2.5 w-2.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-sm truncate', !message.isRead && 'font-semibold')}>
                    {activeTab === 'inbox' ? message.senderName || 'Unknown' : (message.recipientNames?.join(', ') || 'No recipients')}
                  </p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(message.sentAt || message.createdAt)}
                  </span>
                </div>
                <p className={cn('text-sm truncate', !message.isRead ? 'font-medium' : 'text-muted-foreground')}>
                  {message.subject || '(No subject)'}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {message.body?.substring(0, 100) || ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </TenantLayout>
  );
}
