'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  ArrowLeft,
  Send,
  Inbox,
  FileEdit,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MailOpen,
  Reply,
  Trash2,
  Plus,
  Clock,
  User,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { messagesApi, usersApi } from '@/lib/api/core';
import { extractErrorMessage, formatRelativeTime } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/core';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Messages' },
];

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: number;
  subject: string;
  body: string;
  senderId: number;
  senderName?: string;
  recipientIds?: number[];
  recipientNames?: string[];
  isRead?: boolean;
  isDraft?: boolean;
  createdAt: string;
  updatedAt: string;
  parentId?: number | null;
  replies?: Message[];
}

interface UserOption {
  id: number;
  name: string;
  email: string;
}

type TabId = 'inbox' | 'sent' | 'drafts';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE = 20;

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileEdit },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function MessagesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('inbox');

  // Data state
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeRecipients, setComposeRecipients] = useState<number[]>([]);
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  // Selected message state (for reading and replying)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replySending, setReplySending] = useState(false);

  // Fetch users for compose form
  const { data: usersData } = useQuery({
    queryKey: ['core-users-ref-messages'],
    queryFn: async () => {
      const res = await usersApi.list({ limit: 500 });
      return res.data.map((u: { id: number; name?: string; firstName?: string; lastName?: string; email: string }) => ({
        id: u.id,
        name: u.name || (u.firstName ? u.firstName + ' ' + (u.lastName || '') : u.email),
        email: u.email,
      }));
    },
  });

  const users: UserOption[] = usersData ?? [];

  // Fetch messages with TanStack Query
  const { data: messagesData, isLoading: loading, error: messagesFetchError } = useQuery({
    queryKey: ['core-messages', activeTab, page, searchTerm],
    queryFn: () => {
      const params: Record<string, unknown> = {
        page,
        limit: PAGE_SIZE,
      };
      if (searchTerm) params.search = searchTerm;

      switch (activeTab) {
        case 'inbox':
          return messagesApi.listInbox(params);
        case 'sent':
          return messagesApi.listSent(params);
        case 'drafts':
          return messagesApi.listDrafts(params);
      }
    },
  });

  const messages = messagesData?.data ?? [];
  const total = messagesData?.total ?? 0;
  const error = messagesFetchError ? extractErrorMessage(messagesFetchError, 'Failed to load messages') : mutationError;

  // Fetch stats with TanStack Query
  const { data: statsData } = useQuery({
    queryKey: ['core-messages-stats'],
    queryFn: async () => {
      const [inboxRes, sentRes] = await Promise.all([
        messagesApi.listInbox({ limit: 1 }),
        messagesApi.listSent({ limit: 1 }),
      ]);
      const inboxAll = await messagesApi.listInbox({ limit: 1000 });
      const unread = (inboxAll?.data ?? []).filter((m: Message) => !m.isRead).length;
      return {
        inboxTotal: inboxRes?.total ?? 0,
        sentTotal: sentRes?.total ?? 0,
        unreadCount: unread,
      };
    },
  });

  const inboxTotal = statsData?.inboxTotal ?? 0;
  const sentTotal = statsData?.sentTotal ?? 0;
  const unreadCount = statsData?.unreadCount ?? 0;

  // Search with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  // Handle tab change
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedMessage(null);
    setSearchTerm('');
  };

  // Handle message click
  const handleMessageClick = async (message: Message) => {
    setSelectedMessage(message);
    setReplyBody('');

    // Mark as read if inbox and unread
    if (activeTab === 'inbox' && !message.isRead) {
      try {
        await messagesApi.markAsRead(message.id);
        queryClient.invalidateQueries({ queryKey: ['core-messages'] });
        queryClient.invalidateQueries({ queryKey: ['core-messages-stats'] });
      } catch {
        // Silently fail
      }
    }
  };

  // Handle send message
  const handleSend = async (isDraft: boolean = false) => {
    if (!composeSubject.trim() || composeRecipients.length === 0) {
      setComposeError('Please enter a subject and select at least one recipient.');
      return;
    }

    try {
      setComposeSending(true);
      setComposeError(null);
      await messagesApi.send({
        recipientIds: composeRecipients,
        subject: composeSubject,
        body: composeBody,
        isDraft,
      });
      setShowCompose(false);
      setComposeSubject('');
      setComposeBody('');
      setComposeRecipients([]);
      queryClient.invalidateQueries({ queryKey: ['core-messages'] });
      queryClient.invalidateQueries({ queryKey: ['core-messages-stats'] });
    } catch (err: unknown) {
      setComposeError(extractErrorMessage(err, 'Failed to send message'));
    } finally {
      setComposeSending(false);
    }
  };

  // Handle reply
  const handleReply = async () => {
    if (!selectedMessage || !replyBody.trim()) return;

    try {
      setReplySending(true);
      await messagesApi.reply(selectedMessage.id, { body: replyBody });
      setReplyBody('');
      // Refresh the message
      const updated = await messagesApi.get(selectedMessage.id);
      setSelectedMessage(updated);
      queryClient.invalidateQueries({ queryKey: ['core-messages'] });
    } catch (err: unknown) {
      setMutationError(extractErrorMessage(err, 'Failed to send reply'));
    } finally {
      setReplySending(false);
    }
  };

  // Handle delete
  const handleDelete = async (messageId: number) => {
    try {
      await messagesApi.delete(messageId);
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
      queryClient.invalidateQueries({ queryKey: ['core-messages'] });
      queryClient.invalidateQueries({ queryKey: ['core-messages-stats'] });
    } catch (err: unknown) {
      setMutationError(extractErrorMessage(err, 'Failed to delete message'));
    }
  };

  // Pagination
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Page actions
  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/core'),
    },
    {
      id: 'compose',
      label: 'Compose',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => {
        setShowCompose(true);
        setSelectedMessage(null);
      },
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Mail}
        title="Internal Messages"
        description="Send and receive messages between team members"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      {/* Stats */}
      <StatCardsGrid columns={3} className="mb-6">
        <StatCard
          title="Unread Messages"
          value={unreadCount.toString()}
          icon={MailOpen}
          color={unreadCount > 0 ? StatCardColors.red : StatCardColors.green}
          badge={unreadCount > 0 ? { label: 'New', variant: 'danger', pulse: true } : undefined}
        />
        <StatCard
          title="Total Inbox"
          value={inboxTotal.toString()}
          icon={Inbox}
          color={StatCardColors.blue}
        />
        <StatCard
          title="Total Sent"
          value={sentTotal.toString()}
          icon={Send}
          color={StatCardColors.purple}
        />
      </StatCardsGrid>

      {/* Compose Form */}
      {showCompose && (
        <div className="mb-6 rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">New Message</h3>
            <button
              onClick={() => setShowCompose(false)}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {composeError && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
              {composeError}
            </div>
          )}

          <div className="space-y-4">
            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <select
                multiple
                value={composeRecipients.map(String)}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (o) =>
                    parseInt(o.value)
                  );
                  setComposeRecipients(selected);
                }}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary h-24"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Hold Ctrl/Cmd to select multiple recipients
              </p>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Message subject..."
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Type your message..."
                rows={6}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSend(false)}
                disabled={composeSending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {composeSending ? 'Sending...' : 'Send'}
              </button>
              <button
                onClick={() => handleSend(true)}
                disabled={composeSending}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                <FileEdit className="h-4 w-4" />
                Save Draft
              </button>
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1 w-fit mb-6">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'inbox' && unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-red-500 text-white text-xs font-bold px-1">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && <LoadingSpinner fullPage />}

      {/* Messages List + Selected Message */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages List */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="divide-y">
              {messages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => handleMessageClick(message)}
                  className={`px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedMessage?.id === message.id
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : ''
                  } ${
                    activeTab === 'inbox' && !message.isRead
                      ? 'bg-blue-50/50 dark:bg-blue-950/20'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm truncate ${
                            activeTab === 'inbox' && !message.isRead
                              ? 'font-bold'
                              : 'font-medium'
                          }`}
                        >
                          {activeTab === 'inbox'
                            ? message.senderName || 'Unknown Sender'
                            : message.recipientNames?.join(', ') || 'Unknown Recipient'}
                        </span>
                        <span className="flex-shrink-0 text-xs text-muted-foreground">
                          {formatRelativeTime(message.createdAt)}
                        </span>
                      </div>
                      <p
                        className={`text-sm truncate ${
                          activeTab === 'inbox' && !message.isRead
                            ? 'font-semibold text-foreground'
                            : 'text-foreground'
                        }`}
                      >
                        {message.subject || '(No Subject)'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {message.body
                          ? message.body.substring(0, 80) + (message.body.length > 80 ? '...' : '')
                          : '(No content)'}
                      </p>
                    </div>
                    {activeTab === 'inbox' && !message.isRead && (
                      <div className="flex-shrink-0 mt-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {messages.length === 0 && (
                <EmptyState
                  icon={activeTab === 'inbox' ? Inbox : activeTab === 'sent' ? Send : FileEdit}
                  title={
                    searchTerm
                      ? 'No messages found'
                      : activeTab === 'inbox'
                        ? 'Your inbox is empty'
                        : activeTab === 'sent'
                          ? 'No sent messages'
                          : 'No drafts'
                  }
                  description={
                    searchTerm
                      ? 'No messages found matching your search.'
                      : 'Messages will appear here.'
                  }
                />
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-2">
                <p className="text-xs text-muted-foreground">
                  {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded hover:bg-muted disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 rounded hover:bg-muted disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Selected Message Detail */}
          <div className="rounded-xl border bg-card overflow-hidden">
            {selectedMessage ? (
              <div className="flex flex-col h-full">
                {/* Message Header */}
                <div className="border-b px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {selectedMessage.subject || '(No Subject)'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {selectedMessage.senderName || 'Unknown Sender'}
                        </span>
                        <span>&middot;</span>
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatRelativeTime(selectedMessage.createdAt)}</span>
                      </div>
                      {selectedMessage.recipientNames && selectedMessage.recipientNames.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          To: {selectedMessage.recipientNames.join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(selectedMessage.id)}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Message Body */}
                <div className="flex-1 px-6 py-4 overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {selectedMessage.body || '(No content)'}
                  </div>

                  {/* Replies */}
                  {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                    <div className="mt-6 space-y-4 border-t pt-4">
                      <h4 className="text-sm font-semibold text-muted-foreground">Replies</h4>
                      {selectedMessage.replies.map((reply) => (
                        <div key={reply.id} className="rounded-lg bg-muted/50 p-4">
                          <div className="flex items-center gap-2 mb-2 text-sm">
                            <span className="font-medium">
                              {reply.senderName || 'Unknown'}
                            </span>
                            <span className="text-muted-foreground">
                              {formatRelativeTime(reply.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                {activeTab === 'inbox' && (
                  <div className="border-t px-6 py-4">
                    <div className="flex gap-2">
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Write a reply..."
                        rows={2}
                        className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                      />
                      <button
                        onClick={handleReply}
                        disabled={replySending || !replyBody.trim()}
                        className="self-end inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Reply className="h-4 w-4" />
                        {replySending ? '...' : 'Reply'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Mail className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Select a message to read</p>
              </div>
            )}
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
