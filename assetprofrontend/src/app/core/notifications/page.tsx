'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  ArrowLeft,
  CheckCheck,
  Search,
  Trash2,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  DollarSign,
  Package,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { notificationsApi } from '@/lib/api/core';
import { extractErrorMessage, formatRelativeTime } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/core';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Notifications' },
];

// ============================================================================
// TYPES
// ============================================================================

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

type FilterType = 'all' | 'unread';

// ============================================================================
// NOTIFICATION TYPE ICONS
// ============================================================================

function getNotificationIcon(type: string) {
  const iconMap: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
    info: { icon: Info, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
    warning: { icon: AlertTriangle, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
    error: { icon: AlertCircle, color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
    success: { icon: CheckCircle, color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
    security: { icon: ShieldAlert, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
    financial: { icon: DollarSign, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
    inventory: { icon: Package, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
    user: { icon: Users, color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' },
    system: { icon: Settings, color: 'bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400' },
  };

  return iconMap[type] || iconMap.info;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE = 20;

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filter state
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Fetch notifications with TanStack Query
  const { data: notificationsData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['core-notifications', page, filter, searchTerm],
    queryFn: () => {
      const params: Record<string, unknown> = {
        page,
        limit: PAGE_SIZE,
      };
      if (filter === 'unread') params.isRead = false;
      if (searchTerm) params.search = searchTerm;
      return notificationsApi.list(params);
    },
  });

  const notifications = notificationsData?.data ?? [];
  const total = notificationsData?.total ?? 0;
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load notifications') : mutationError;

  // Fetch stats with TanStack Query
  const { data: statsData } = useQuery({
    queryKey: ['core-notifications-stats'],
    queryFn: async () => {
      const [countRes, allRes] = await Promise.all([
        notificationsApi.getUnreadCount(),
        notificationsApi.list({ limit: 1 }),
      ]);
      return {
        unreadCount: countRes?.count ?? 0,
        totalNotifications: allRes?.total ?? 0,
      };
    },
  });

  const unreadCount = statsData?.unreadCount ?? 0;
  const totalNotifications = statsData?.totalNotifications ?? 0;

  // Search with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  // Handle mark as read
  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.isRead) return;
    try {
      await notificationsApi.markAsRead(notification.id);
      queryClient.invalidateQueries({ queryKey: ['core-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['core-notifications-stats'] });
    } catch (err: unknown) {
      setMutationError(extractErrorMessage(err, 'Failed to mark notification as read'));
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      queryClient.invalidateQueries({ queryKey: ['core-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['core-notifications-stats'] });
    } catch (err: unknown) {
      setMutationError(extractErrorMessage(err, 'Failed to mark all notifications as read'));
    }
  };

  // Handle delete
  const handleDelete = async (notificationId: string) => {
    try {
      await notificationsApi.delete(notificationId);
      queryClient.invalidateQueries({ queryKey: ['core-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['core-notifications-stats'] });
    } catch (err: unknown) {
      setMutationError(extractErrorMessage(err, 'Failed to delete notification'));
    }
  };

  // Pagination
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Filter tabs
  const filterTabs: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Unread', value: 'unread' },
  ];

  // Page actions
  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/core'),
    },
    ...(unreadCount > 0
      ? [
          {
            id: 'markAllRead',
            label: 'Mark All as Read',
            icon: CheckCheck,
            variant: 'outline' as const,
            onClick: handleMarkAllAsRead,
          },
        ]
      : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Bell}
        title="Notifications"
        description="View and manage system notifications and alerts"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      {/* Stats */}
      <StatCardsGrid columns={2} className="mb-6">
        <StatCard
          title="Total Notifications"
          value={totalNotifications.toString()}
          icon={Bell}
          color={StatCardColors.blue}
        />
        <StatCard
          title="Unread"
          value={unreadCount.toString()}
          icon={AlertCircle}
          color={unreadCount > 0 ? StatCardColors.red : StatCardColors.green}
          badge={unreadCount > 0 ? { label: 'New', variant: 'danger', pulse: true } : undefined}
        />
      </StatCardsGrid>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setFilter(tab.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === tab.value
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {tab.value === 'unread' && unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-red-500 text-white text-xs font-bold px-1">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
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

      {/* Notifications List */}
      {!loading && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="divide-y">
            {notifications.map((notification) => {
              const { icon: NotifIcon, color: iconColor } = getNotificationIcon(notification.type);

              return (
                <div
                  key={notification.id}
                  onClick={() => {
                    handleMarkAsRead(notification);
                    let url = notification.data?.url as string | undefined;
                    if (url) {
                      // Fix old-format URLs like /core/approvals/2 → /core/approvals?view=2
                      const oldApprovalMatch = url.match(/^\/core\/approvals\/(\d+)$/);
                      if (oldApprovalMatch) {
                        url = `/core/approvals?view=${oldApprovalMatch[1]}`;
                      }
                      router.push(url);
                    }
                  }}
                  className={`px-6 py-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 rounded-lg p-2.5 ${iconColor}`}>
                      <NotifIcon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-sm ${
                                !notification.isRead ? 'font-bold' : 'font-medium'
                              }`}
                            >
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification);
                              }}
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              title="Mark as read"
                            >
                              <CheckCheck className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {notifications.length === 0 && (
              <EmptyState
                icon={Bell}
                title={filter === 'unread' ? 'No unread notifications' : 'No notifications found'}
                description={
                  searchTerm
                    ? 'No notifications found matching your search.'
                    : filter === 'unread'
                      ? 'You are all caught up!'
                      : 'Notifications will appear here when system events occur.'
                }
              />
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1} to{' '}
                {Math.min(page * PAGE_SIZE, total)} of {total} notifications
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </TenantLayout>
  );
}
