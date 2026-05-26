'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  ArrowRight,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  ShoppingCart,
  Wallet,
  Users,
  Package,
  FileText,
  Settings,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { notificationsApi } from '@/lib/api/core';
import { cn } from '@/lib/utils';

/**
 * Activity feed sidebar — streams the latest notifications for the
 * current user. The notifications API already targets users by role
 * (cron jobs send to HR / Compliance / Sales / etc. based on the
 * recipient role), so the feed is automatically role-aware without
 * needing a separate filter.
 *
 * Distinct from:
 *  - The bell in the Header (popup, last 10, used for "did anything
 *    new arrive while I was away?")
 *  - /notifications full page (destination, all history, filterable)
 *
 * This widget is the "always visible" surface on the dashboard so users
 * can keep an eye on what needs their attention without leaving home.
 *
 * Auto-refreshes every 60s; pauses when the tab loses focus (TanStack
 * default). Click a row → marks read AND navigates to the linked entity
 * if data.url is set. Otherwise just marks read.
 */

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: { url?: string } & Record<string, unknown>;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ElementType> = {
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
  compliance_expiry: ShieldCheck,
  import_expiry: ShieldCheck,
  loading_order: Truck,
  credit_note: FileText,
};

const TYPE_BG: Record<string, string> = {
  info: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  sales: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  payment: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  hr: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  inventory: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  document: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  system: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  compliance_expiry: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  import_expiry: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  loading_order: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  credit_note: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604_800) return `${Math.floor(diff / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

export function NotificationsFeed({ limit = 8 }: { limit?: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-notifications-feed', limit],
    queryFn: () => notificationsApi.list({ limit }),
    // 60s — feed isn't time-critical; the header bell handles real-time pings.
    refetchInterval: 60_000,
  });

  const items: NotificationItem[] = (data?.data ?? []) as NotificationItem[];
  const hasUnread = items.some((n) => !n.isRead);

  const handleClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      try {
        await notificationsApi.markAsRead(n.id);
        queryClient.invalidateQueries({ queryKey: ['dashboard-notifications-feed'] });
        // Also bust the header bell's unread count so it stays in sync.
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      } catch {
        // non-fatal — the navigation matters more than the read state.
      }
    }
    if (n.data?.url) {
      router.push(n.data.url);
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationsApi.markAllAsRead();
      queryClient.invalidateQueries({ queryKey: ['dashboard-notifications-feed'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    } catch {
      // swallow — the user can retry
    }
  };

  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Notifications</h3>
          {hasUnread && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {items.filter((n) => !n.isRead).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasUnread && (
            <button
              onClick={handleMarkAll}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-3 h-3" />
              Mark all
            </button>
          )}
          <Link
            href="/notifications"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View all
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-xs">Failed to load notifications.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
          <p className="text-xs">You&rsquo;re all caught up.</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
          {items.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            const bg = TYPE_BG[n.type] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'w-full flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group relative',
                  !n.isRead && 'bg-blue-50/50 dark:bg-blue-950/20',
                )}
              >
                {!n.isRead && (
                  <span className="absolute left-0 top-3 h-2 w-1 rounded-r bg-blue-500" aria-hidden="true" />
                )}
                <div className={cn('p-1.5 rounded-full shrink-0', bg)}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs truncate', !n.isRead && 'font-semibold')}>
                    {n.title || n.message}
                  </p>
                  {n.title && n.message && (
                    <p className="text-[10px] text-muted-foreground truncate">{n.message}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                  {relativeTime(n.createdAt)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
