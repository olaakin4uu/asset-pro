'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  RefreshCw,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingCart,
  Wallet,
  Users,
  Package,
  FileText,
  Settings,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, type PageHeaderAction, LoadingSpinner} from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { notificationsApi } from '@/lib/api/core';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Notifications' },
];

interface Notification {
  id: number;
  type: string;
  title?: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  link?: string;
}

const typeIcons: Record<string, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
  sales: ShoppingCart,
  payment: Wallet,
  hr: Users,
  inventory: Package,
  document: FileText,
  system: Settings,
};

const typeColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-600',
  warning: 'bg-amber-100 text-amber-600',
  success: 'bg-green-100 text-green-600',
  error: 'bg-red-100 text-red-600',
  sales: 'bg-purple-100 text-purple-600',
  payment: 'bg-emerald-100 text-emerald-600',
  hr: 'bg-orange-100 text-orange-600',
  inventory: 'bg-cyan-100 text-cyan-600',
  document: 'bg-indigo-100 text-indigo-600',
  system: 'bg-gray-100 text-gray-600',
};

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const { data: notificationsResult, isLoading: loading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notificationsApi.list({
      isRead: filter === 'all' ? undefined : filter === 'read',
    }),
  });
  const notifications: Notification[] = notificationsResult?.data ?? [];

  const handleMarkRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkRead(notification.id);
    }
    let link = notification.link || (notification.data?.url as string | undefined);
    if (link) {
      // Fix old-format URLs like /core/approvals/2 → /core/approvals?view=2
      const oldApprovalMatch = link.match(/^\/core\/approvals\/(\d+)$/);
      if (oldApprovalMatch) {
        link = `/core/approvals?view=${oldApprovalMatch[1]}`;
      }
      router.push(link);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const pageActions: PageHeaderAction[] = [
    { id: 'refresh', label: 'Refresh', icon: RefreshCw, variant: 'outline', onClick: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) },
    ...(unreadCount > 0
      ? [{ id: 'mark-all', label: 'Mark All Read', icon: CheckCheck, variant: 'outline' as const, onClick: handleMarkAllRead }]
      : []),
  ];

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Bell}
        title="Notifications"
        description="Stay updated with system alerts and events"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      <StatCardsGrid columns={3} className="mb-6">
        <StatCard title="Total" value={notifications.length} icon={Bell} color={StatCardColors.blue} />
        <StatCard title="Unread" value={unreadCount} icon={Clock} color={StatCardColors.amber} />
        <StatCard title="Read" value={notifications.length - unreadCount} icon={CheckCircle} color={StatCardColors.green} />
      </StatCardsGrid>

      <div className="mb-6 flex items-center gap-2">
        {(['all', 'unread', 'read'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No notifications</h3>
          <p className="text-muted-foreground mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden divide-y">
          {notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            const colorClass = typeColors[notification.type] || typeColors.info;
            return (
              <div
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={cn(
                  'flex items-start gap-4 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors',
                  !notification.isRead && 'bg-blue-50/50 dark:bg-blue-900/10'
                )}
              >
                <div className={cn('flex-shrink-0 mt-0.5 h-9 w-9 rounded-full flex items-center justify-center', colorClass)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('text-sm', !notification.isRead && 'font-semibold')}>
                      {notification.title || notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                </div>
                {!notification.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkRead(notification.id);
                    }}
                    className="flex-shrink-0 p-1 text-muted-foreground hover:text-primary"
                    title="Mark as read"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </TenantLayout>
  );
}
