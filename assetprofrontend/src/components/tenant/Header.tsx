'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  User,
  LogOut,
  Settings,
  HelpCircle,
  ChevronDown,
  Menu,
  Plus,
  Bot,
  Sparkles,
  Calendar,
  Lock,
  Unlock,
  Package,
  ShoppingCart,
  Users,
  FileText,
  CreditCard,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { TourSelector } from '@/components/erp/TourSelector';
import { useTourStore } from '@/stores/tour';
import type { TourId } from '@/stores/tour';
import { tourDefinitions } from '@/lib/tour-definitions';
import { notificationsApi } from '@/lib/api/core';
import { fiscalYearsApi, reportingPeriodsApi, type FiscalYear, type ReportingPeriod } from '@/lib/api/accounts';
import { useCompanyContextStore } from '@/stores/company-context';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { extractErrorMessage } from '@/lib/utils';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  href: string | null;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function useTourSelectorData() {
  const completedTours = useTourStore((s) => s.completedTours);
  const resetAllTours = useTourStore((s) => s.resetAllTours);

  const availableTours = tourDefinitions.map((tour) => ({
    id: tour.id,
    name: tour.name,
    description: tour.description,
    completed: !!completedTours[tour.id],
  }));

  return { availableTours, resetAllTours };
}

// ============================================================================
// REPORTING PERIOD HELPERS
// ============================================================================

function formatPeriodDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function isReportingPeriodCurrent(period: ReportingPeriod): boolean {
  const now = new Date();
  return now >= new Date(period.startDate) && now <= new Date(period.endDate);
}

// ============================================================================
// TYPES & CONFIG
// ============================================================================

interface HeaderProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  companyName?: string;
  onLogout: () => void;
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
  onStartTour?: (tourId: TourId) => void;
  onNavigateHelp?: (path: string) => void;
  onOpenSearch?: () => void;
}

// Quick Actions Menu Items with module slugs for permission filtering
interface QuickActionItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  moduleSlug: string;
}

interface QuickActionGroup {
  title: string;
  items: QuickActionItem[];
}

const allQuickActionGroups: QuickActionGroup[] = [
  {
    title: 'Procurement',
    items: [
      { label: 'New Purchase Order', icon: Package, href: '/purchase/orders/create', moduleSlug: 'purchase' },
      { label: 'New Supplier', icon: Users, href: '/purchase/suppliers/create', moduleSlug: 'purchase' },
    ],
  },
  {
    title: 'Sales & Finance',
    items: [
      { label: 'New Sales Order', icon: ShoppingCart, href: '/sales/orders/create', moduleSlug: 'sales' },
      { label: 'New Invoice', icon: FileText, href: '/sales/invoices/create', moduleSlug: 'sales' },
      { label: 'Record Payment', icon: CreditCard, href: '/receivables/receipts/create', moduleSlug: 'receivables' },
      { label: 'Expense Request', icon: FileText, href: '/accounts/expense-requests/create', moduleSlug: 'accounts' },
    ],
  },
  {
    title: 'Master Data',
    items: [
      { label: 'New Customer', icon: Users, href: '/sales/customers/create', moduleSlug: 'sales' },
      { label: 'New Product', icon: Package, href: '/inventory/items/create', moduleSlug: 'inventory' },
    ],
  },
];

// ============================================================================
// HEADER COMPONENT
// ============================================================================

export function Header({ user, onLogout, onMenuToggle, showMenuButton, onStartTour, onNavigateHelp, onOpenSearch }: HeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showTourSelector, setShowTourSelector] = useState(false);
  const [showFiscalYear, setShowFiscalYear] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);
  const tourSelectorRef = useRef<HTMLDivElement>(null);
  const fiscalYearRef = useRef<HTMLDivElement>(null);

  const { availableTours, resetAllTours } = useTourSelectorData();

  // Fiscal year from API
  const { data: currentFY } = useQuery<FiscalYear | null>({
    queryKey: ['current-fiscal-year'],
    queryFn: () => fiscalYearsApi.getCurrent(),
    staleTime: 5 * 60 * 1000,
  });

  // All fiscal years (for the dropdown)
  const { data: allFiscalYears } = useQuery({
    queryKey: ['fiscal-years-list'],
    queryFn: () => fiscalYearsApi.list({ limit: 20 }),
    staleTime: 5 * 60 * 1000,
    enabled: showFiscalYear,
  });

  // Reporting periods (monthly, 12 per fiscal year)
  const queryClient = useQueryClient();
  const canManageReportingPeriods = useFeatureAccess('accounts', 'accounts.reporting_periods');

  const currentFYYear = currentFY ? new Date(currentFY.startDate).getFullYear() : undefined;

  const { data: reportingPeriodsData } = useQuery({
    queryKey: ['reporting-periods-topbar', currentFYYear],
    queryFn: () => reportingPeriodsApi.list({ calendarYear: currentFYYear, limit: 13 }),
    staleTime: 5 * 60 * 1000,
    enabled: showFiscalYear && !!currentFY,
  });

  const periods = reportingPeriodsData?.data ?? [];
  // Current period = the one whose date range includes today
  const currentPeriod = periods.find((p) => isReportingPeriodCurrent(p));
  const [periodActionLoading, setPeriodActionLoading] = useState<number | 'closeFY' | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['reporting-periods-topbar'] });
    queryClient.invalidateQueries({ queryKey: ['accounts-reporting-periods'] });
    queryClient.invalidateQueries({ queryKey: ['current-fiscal-year'] });
    queryClient.invalidateQueries({ queryKey: ['fiscal-years-list'] });
  }, [queryClient]);

  // Close the entire fiscal year (all periods must already be auto-closed)
  const handleCloseFiscalYear = useCallback(async () => {
    if (!currentFY) return;
    setPeriodActionLoading('closeFY');
    setPeriodError(null);
    try {
      await fiscalYearsApi.close(currentFY.id, true);
      invalidateAll();
    } catch (err: unknown) {
      setPeriodError(extractErrorMessage(err, 'Failed to close fiscal year'));
    } finally {
      setPeriodActionLoading(null);
    }
  }, [currentFY, invalidateAll]);

  // Close an adjusting period back to CLOSED
  const handleCloseReportingPeriod = useCallback(async (rp: ReportingPeriod) => {
    setPeriodActionLoading(rp.id);
    setPeriodError(null);
    try {
      await reportingPeriodsApi.close(rp.id);
      invalidateAll();
    } catch (err: unknown) {
      setPeriodError(extractErrorMessage(err, 'Failed to close reporting period'));
    } finally {
      setPeriodActionLoading(null);
    }
  }, [invalidateAll]);

  // Reopen a closed reporting period for adjustments
  const handleReopenPeriod = useCallback(async (rp: ReportingPeriod) => {
    setPeriodActionLoading(rp.id);
    setPeriodError(null);
    try {
      await reportingPeriodsApi.reopen(rp.id);
      invalidateAll();
    } catch (err: unknown) {
      setPeriodError(extractErrorMessage(err, 'Failed to reopen reporting period'));
    } finally {
      setPeriodActionLoading(null);
    }
  }, [invalidateAll]);

  // Permission-aware Quick Add filtering
  const enabledModules = useCompanyContextStore((s) => s.enabledModules);
  const quickActionGroups = allQuickActionGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!enabledModules.length) return true;
        const mod = enabledModules.find((m) => m.slug === item.moduleSlug);
        return mod?.isEnabled !== false;
      }),
    }))
    .filter((group) => group.items.length > 0);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  // Fetch unread count on mount and periodically
  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await notificationsApi.getUnreadCount();
      setUnreadCount(result.count);
    } catch {
      // Silently fail — non-critical
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch notifications when dropdown opens
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const result = await notificationsApi.list({ limit: 10 });
      interface NotificationApiItem {
        id: string;
        type: string;
        data?: { title?: string; message?: string; description?: string; url?: string; href?: string };
        createdAt: string;
        readAt: string | null;
      }
      const items: NotificationItem[] = (result.data || []).map((n: NotificationApiItem) => ({
        id: n.id,
        type: n.type,
        title: n.data?.title || n.type || 'Notification',
        description: n.data?.message || n.data?.description || '',
        time: formatTimeAgo(n.createdAt),
        unread: !n.readAt,
        href: n.data?.url || n.data?.href || null,
      }));
      setNotifications(items);
    } catch {
      // Keep existing state
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const handleToggleNotifications = useCallback(() => {
    const willOpen = !showNotifications;
    setShowNotifications(willOpen);
    if (willOpen) fetchNotifications();
  }, [showNotifications, fetchNotifications]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, []);

  // Close all dropdowns
  const closeAllDropdowns = useCallback(() => {
    setShowUserMenu(false);
    setShowNotifications(false);
    setShowQuickActions(false);
    setShowHelpMenu(false);
    setShowTourSelector(false);
    setShowFiscalYear(false);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setShowUserMenu(false);
      if (notificationsRef.current && !notificationsRef.current.contains(target)) setShowNotifications(false);
      if (quickActionsRef.current && !quickActionsRef.current.contains(target)) setShowQuickActions(false);
      if (helpMenuRef.current && !helpMenuRef.current.contains(target)) setShowHelpMenu(false);
      if (tourSelectorRef.current && !tourSelectorRef.current.contains(target)) setShowTourSelector(false);
      if (fiscalYearRef.current && !fiscalYearRef.current.contains(target)) setShowFiscalYear(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeAllDropdowns();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeAllDropdowns]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-3 backdrop-blur-sm sm:h-16 sm:px-6 md:px-8 print:hidden"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Left Section */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Menu Toggle */}
        {showMenuButton && onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-accent lg:hidden"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
        )}

        {/* Fiscal Year / Period Manager (Desktop) */}
        <div ref={fiscalYearRef} data-tour="fiscal-year" className="relative hidden md:block">
          <button
            onClick={() => setShowFiscalYear(!showFiscalYear)}
            aria-expanded={showFiscalYear}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 transition-colors hover:bg-muted/50"
            title={currentFY ? `Fiscal Year: ${currentFY.name} (${currentFY.status})` : 'Fiscal Years'}
          >
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {currentFY?.name || 'No FY'}
            </span>
            <div className="mx-0.5 h-4 w-px bg-border" />
            {currentFY?.status === 'open' ? (
              <Unlock className="h-3.5 w-3.5 text-green-500" />
            ) : currentFY?.status === 'adjusting' ? (
              <Lock className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Lock className="h-3.5 w-3.5 text-red-500" />
            )}
            {currentPeriod && (
              <span className="text-xs font-medium text-muted-foreground">
                P{currentPeriod.number}
              </span>
            )}
            <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${showFiscalYear ? 'rotate-180' : ''}`} />
          </button>

          {/* Fiscal Year Period Dropdown */}
          {showFiscalYear && (
            <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg">
              {/* Header — FY info + reporting period status & controls */}
              <div className="border-b p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Accounting Periods</h3>
                    <p className="text-xs text-muted-foreground">
                      {currentFY?.name || 'No fiscal year'} &middot;{' '}
                      <span className={
                        currentFY?.status === 'open' ? 'text-green-600 dark:text-green-400' :
                        currentFY?.status === 'adjusting' ? 'text-amber-600 dark:text-amber-400' :
                        'text-red-600 dark:text-red-400'
                      }>
                        {currentFY?.status || 'N/A'}
                      </span>
                    </p>
                  </div>
                  <Link
                    href="/accounts/fiscal-years"
                    onClick={() => setShowFiscalYear(false)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Manage
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                {/* Close Fiscal Year control */}
                {canManageReportingPeriods && currentFY?.status === 'open' && (
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      onClick={handleCloseFiscalYear}
                      disabled={periodActionLoading !== null}
                      className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      title={`Close fiscal year ${currentFY.name}`}
                    >
                      {periodActionLoading === 'closeFY' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      Close Fiscal Year
                    </button>
                  </div>
                )}

                {periodError && (
                  <p className="mt-1.5 rounded-md bg-red-50 dark:bg-red-900/20 px-2 py-1 text-xs text-red-600 dark:text-red-400">{periodError}</p>
                )}
              </div>

              {/* Monthly Periods List */}
              {periods.length > 0 ? (
                <div className="max-h-72 overflow-y-auto p-2">
                  {periods.map((period) => {
                    const isCurrent = isReportingPeriodCurrent(period);
                    const isClosed = period.status === 'CLOSED';
                    const isAdjusting = period.status === 'ADJUSTING';
                    return (
                      <div
                        key={period.id}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                          isCurrent
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          isClosed
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            : isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {period.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : isClosed ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {period.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatPeriodDate(period.startDate)} – {formatPeriodDate(period.endDate)}
                          </p>
                        </div>
                        {isClosed ? (
                          canManageReportingPeriods ? (
                            <button
                              onClick={() => handleReopenPeriod(period)}
                              disabled={periodActionLoading !== null}
                              className="flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
                              title="Reopen for adjustments"
                            >
                              {periodActionLoading === period.id ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <Lock className="h-2.5 w-2.5" />
                              )}
                              Closed
                            </button>
                          ) : (
                            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                              Closed
                            </span>
                          )
                        ) : isAdjusting ? (
                          canManageReportingPeriods ? (
                            <button
                              onClick={() => handleCloseReportingPeriod(period)}
                              disabled={periodActionLoading !== null}
                              className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                              title="Close period after adjustments"
                            >
                              {periodActionLoading === period.id ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <Lock className="h-2.5 w-2.5" />
                              )}
                              Adjusting
                            </button>
                          ) : (
                            <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                              Adjusting
                            </span>
                          )
                        ) : isCurrent ? (
                          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            Current
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {currentFY ? 'No periods — edit or recreate the fiscal year to generate them' : 'No fiscal year selected'}
                </div>
              )}

              {/* Other Fiscal Years */}
              {allFiscalYears && allFiscalYears.data.length > 1 && (
                <div className="border-t p-2">
                  <p className="mb-1 px-3 text-xs font-medium text-muted-foreground">Other Fiscal Years</p>
                  {allFiscalYears.data
                    .filter((fy) => fy.id !== currentFY?.id)
                    .slice(0, 5)
                    .map((fy) => (
                      <button
                        key={fy.id}
                        onClick={async () => {
                          await fiscalYearsApi.setCurrent(fy.id);
                          setShowFiscalYear(false);
                          // Force refetch
                          window.location.reload();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                      >
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{fy.name}</span>
                        <span className={`text-xs capitalize ${
                          fy.status === 'open' ? 'text-green-600 dark:text-green-400' :
                          fy.status === 'adjusting' ? 'text-amber-600 dark:text-amber-400' :
                          'text-muted-foreground'
                        }`}>
                          {fy.status}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center Section - Search (opens command palette) */}
      <div data-tour="search" className="mx-4 hidden max-w-sm flex-1 sm:block sm:max-w-md lg:max-w-lg">
        <button
          onClick={onOpenSearch}
          className="relative flex h-8 w-full items-center rounded-lg border border-primary/20 bg-muted/30 pl-10 pr-3 text-sm text-muted-foreground transition-all hover:border-primary/50 hover:bg-background sm:h-10 lg:pr-20"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <span className="truncate">Search orders, customers, products...</span>
          <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 lg:flex">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              Ctrl
            </kbd>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Quick Actions */}
        {quickActionGroups.length > 0 && (
          <div ref={quickActionsRef} data-tour="quick-actions" className="relative">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              aria-expanded={showQuickActions}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2 text-primary transition-colors hover:bg-primary/20 sm:px-3"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden text-sm font-medium sm:inline">Quick Add</span>
            </button>

            {showQuickActions && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-card shadow-lg">
                {quickActionGroups.map((group, idx) => (
                  <div key={group.title}>
                    {idx > 0 && <div className="mx-2 border-t border-border" />}
                    <div className="p-2">
                      <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.title}
                      </p>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setShowQuickActions(false)}
                            className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                          >
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Configuration Guide / Tour Selector */}
        <div ref={tourSelectorRef} data-tour="config-guide" className="relative hidden sm:block">
          <button
            onClick={() => setShowTourSelector(!showTourSelector)}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-primary/10"
            title="Configuration Guide"
          >
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </button>
          {showTourSelector && (
            <TourSelector
              tours={availableTours}
              onStartTour={(tourId) => onStartTour?.(tourId)}
              onResetAll={resetAllTours}
              onClose={() => setShowTourSelector(false)}
            />
          )}
        </div>

        {/* Notifications */}
        <div ref={notificationsRef} data-tour="notifications" className="relative">
          <button
            onClick={handleToggleNotifications}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-accent"
            title="Notifications"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b border-border p-3">
                <h3 className="font-semibold text-foreground">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        {unreadCount} new
                      </span>
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-medium text-primary hover:text-primary/80"
                      >
                        Mark all read
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifLoading && notifications.length === 0 && (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
                {!notifLoading && notifications.length === 0 && (
                  <div className="py-8 text-center">
                    <Bell className="mx-auto h-8 w-8 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">No notifications yet</p>
                  </div>
                )}
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => {
                      if (notification.unread) handleMarkAsRead(notification.id);
                      if (notification.href) {
                        setShowNotifications(false);
                        router.push(notification.href);
                      }
                    }}
                    className={`w-full border-b border-border/50 p-3 text-left transition-colors hover:bg-accent/50 ${
                      notification.unread ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {notification.unread && (
                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                      )}
                      <div className={notification.unread ? '' : 'ml-5'}>
                        <p className="text-sm font-medium text-foreground">{notification.title}</p>
                        {notification.description && (
                          <p className="text-xs text-muted-foreground">{notification.description}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground/70">{notification.time}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="border-t border-border p-2">
                <Link
                  href="/core/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="block w-full rounded-lg py-2 text-center text-sm font-medium text-primary hover:bg-primary/10"
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* AI Assistant */}
        <button
          data-tour="ai-assistant"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-accent"
          title="AI Assistant"
          onClick={() => router.push('/ai')}
        >
          <Bot className="h-5 w-5 text-muted-foreground" />
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
          </span>
        </button>

        {/* Help Menu (Desktop) */}
        <div ref={helpMenuRef} data-tour="help-menu" className="relative hidden md:block">
          <button
            onClick={() => setShowHelpMenu(!showHelpMenu)}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-accent"
            title="Help"
          >
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </button>

          {showHelpMenu && (
            <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border bg-card shadow-lg">
              <div className="border-b border-border p-3">
                <h3 className="font-semibold text-foreground">Help & Support</h3>
              </div>
              <div className="p-2">
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Getting Started
                </p>
                <button
                  onClick={() => { setShowHelpMenu(false); onNavigateHelp?.('/help/drawer'); }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Documentation
                </button>
                <button
                  onClick={() => { setShowHelpMenu(false); onNavigateHelp?.('/help'); }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  Browse Help Center
                </button>
              </div>
              <div className="border-t border-border p-2">
                <button
                  onClick={() => { setShowHelpMenu(false); onNavigateHelp?.('/help/support/create'); }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  Contact Support
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div ref={userMenuRef} data-tour="user-menu" className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg border border-border/50 px-2 py-1 transition-colors hover:bg-accent sm:px-3 sm:py-1.5"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-2 ring-transparent transition-all focus-within:ring-primary sm:h-8 sm:w-8">
              <span className="text-xs font-semibold sm:text-sm">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="hidden max-w-[120px] flex-col items-start sm:flex">
              <span className="truncate w-full text-sm font-medium text-foreground" title={user.name}>{user.name}</span>
              <span className="truncate w-full text-xs text-muted-foreground" title={user.role}>{user.role}</span>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg">
              <div className="border-b border-border p-3">
                <p className="font-medium text-foreground">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="p-2">
                <button
                  onClick={() => { setShowUserMenu(false); router.push('/settings/profile'); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); router.push('/settings'); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); onStartTour?.('welcome'); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  Start Tour
                </button>
                <hr className="my-2 border-border" />
                <button
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
