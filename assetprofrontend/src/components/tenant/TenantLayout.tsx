'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTenantStore } from '@/store/tenantStore';
import { useCompanyContext } from '@/stores/company-context';
import { useFlashStore } from '@/stores/flash';
import { onAuthEvent, cancelProactiveRefresh } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, Info, X, ShieldAlert } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from '@/components/erp/Breadcrumbs';
import { TourOverlay } from '@/components/erp/TourOverlay';
import { CommandPalette } from '@/components/erp/CommandPalette';
import { CompanySwitchTransition } from '@/components/erp/CompanySwitchTransition';
import { IdleWarningDialog } from '@/components/erp/IdleWarningDialog';
import { useTour } from '@/hooks/useTour';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

const IDLE_TIMEOUT_MS = 45 * 60 * 1000;  // 45 minutes of inactivity
const IDLE_WARNING_MS = 60 * 1000;        // 60-second countdown before logout
import type { TourId } from '@/stores/tour';
import type { BreadcrumbItem } from '@/types/core';

interface TenantLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export function TenantLayout({ children, breadcrumbs }: TenantLayoutProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, tenant, isAuthenticated, logout } = useTenantStore();
  const { fetchContext, fetchModules, isLoading: contextLoading, company } = useCompanyContext();
  const { message: flashMessage, type: flashType, clearFlash } = useFlashStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [contextFetched, setContextFetched] = useState(false);

  const tour = useTour({ autoStart: 'welcome', autoStartDelay: 2000 });
  const palette = useCommandPalette();

  const handleStartTour = useCallback((tourId: TourId) => {
    tour.startTour(tourId);
  }, [tour]);

  const handleNavigateHelp = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  // Wait for Zustand hydration before checking auth
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Listen for auth:cleared events from the API layer (refresh failure,
  // cross-tab logout, etc.) and redirect immediately.
  useEffect(() => {
    const unsubscribe = onAuthEvent((event) => {
      if (event.type === 'auth:cleared') {
        cancelProactiveRefresh();
        if (event.reason === 'manual_logout') {
          // Manual logout — use Next.js router (app is in a clean state)
          router.push('/auth/login');
        }
        // Non-manual cases (refresh_failed, no_refresh_token, cross_tab)
        // are handled by clearAuthTokens() in api.ts with a hard redirect
      }
    });
    return unsubscribe;
  }, [router]);

  // After a company or branch switch, invalidate all cached data so pages
  // refetch with the new context, and re-fetch modules for sidebar filtering.
  useEffect(() => {
    const handleCompanySwitch = () => {
      queryClient.invalidateQueries();
      fetchModules();
      router.push('/dashboard');
    };

    const handleBranchSwitch = () => {
      queryClient.invalidateQueries();
    };

    window.addEventListener('company-switch-success', handleCompanySwitch);
    window.addEventListener('branch-switch-success', handleBranchSwitch);
    return () => {
      window.removeEventListener('company-switch-success', handleCompanySwitch);
      window.removeEventListener('branch-switch-success', handleBranchSwitch);
    };
  }, [queryClient, fetchModules, router]);

  // Fetch company context and modules when authenticated.
  // If context is already in Zustand (persisted from previous session),
  // unblock the layout immediately and refresh in the background —
  // this eliminates the "Loading workspace..." spinner on every navigation.
  useEffect(() => {
    if (isHydrated && isAuthenticated && !contextFetched) {
      if (company) {
        // Already have cached context — unblock now, refresh silently
        setContextFetched(true);
        Promise.all([fetchContext(), fetchModules()]).catch(() => {});
      } else {
        // No cached context — must wait for the API before showing content
        Promise.all([fetchContext(), fetchModules()])
          .then(() => setContextFetched(true))
          .catch(() => setContextFetched(true)); // always unblock — context errors are non-fatal
      }
    }
  }, [isHydrated, isAuthenticated, contextFetched, company, fetchContext, fetchModules]);

  useEffect(() => {
    // Check for mobile viewport
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Only redirect after hydration is complete
    if (isHydrated && !isAuthenticated) {
      window.location.href = '/auth/login';
    }
  }, [isHydrated, isAuthenticated]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/auth/login');
  }, [logout, router]);

  const { isWarning, secondsLeft, stayLoggedIn } = useIdleTimeout({
    idleMs: IDLE_TIMEOUT_MS,
    warningMs: IDLE_WARNING_MS,
    enabled: isAuthenticated,
    onLogout: handleLogout,
  });

  // Auto-dismiss flash message (warnings stay longer — they need to be read)
  useEffect(() => {
    if (flashMessage) {
      const duration = flashType === 'warning' || flashType === 'error' ? 6000 : 4000;
      const t = setTimeout(clearFlash, duration);
      return () => clearTimeout(t);
    }
  }, [flashMessage, flashType, clearFlash]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  // Show loading while hydrating, authenticating, or fetching context
  if (!isHydrated || !isAuthenticated || !user || (isAuthenticated && !contextFetched)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            {!isHydrated ? 'Loading...' : !contextFetched ? 'Loading workspace...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0 print:hidden ${
          isMobile
            ? mobileMenuOpen
              ? 'translate-x-0'
              : '-translate-x-full'
            : ''
        }`}
      >
        <Sidebar
          companyName={tenant?.companyName}
          collapsed={!isMobile && sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </div>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 print:ml-0 ${
          isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {/* Header */}
        <Header
          user={user}
          onLogout={handleLogout}
          onMenuToggle={toggleSidebar}
          showMenuButton={isMobile}
          onStartTour={handleStartTour}
          onNavigateHelp={handleNavigateHelp}
          onOpenSearch={palette.open}
        />

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 print:hidden">
              <div className="px-4 sm:px-6 lg:px-8 py-2">
                <Breadcrumbs items={breadcrumbs} />
              </div>
            </div>
          )}

          {/* Flash Banner */}
          {flashMessage && (
            <div className={`mx-4 sm:mx-6 lg:mx-8 mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm ${
              flashType === 'success'
                ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
                : flashType === 'error'
                ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                : flashType === 'warning'
                ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800'
                : 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800'
            }`}>
              {flashType === 'success' && <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />}
              {flashType === 'error' && <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />}
              {flashType === 'warning' && <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />}
              {flashType === 'info' && <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />}
              <span className={`text-sm flex-1 font-medium ${
                flashType === 'success' ? 'text-green-800 dark:text-green-300'
                : flashType === 'error' ? 'text-red-800 dark:text-red-300'
                : flashType === 'warning' ? 'text-amber-800 dark:text-amber-300'
                : 'text-blue-800 dark:text-blue-300'
              }`}>{flashMessage}</span>
              <button onClick={clearFlash} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Main Content with consistent padding (no top padding - PageHeader provides spacing) */}
          <div className="px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette palette={palette} />

      {/* Tour Guide Overlay */}
      <TourOverlay
        isRunning={tour.isRunning}
        currentStep={tour.currentStep}
        currentStepIndex={tour.currentStepIndex}
        totalSteps={tour.totalSteps}
        targetRect={tour.targetRect}
        popoverPlacement={tour.popoverPlacement}
        onNext={tour.next}
        onPrev={tour.prev}
        onSkip={tour.skip}
        canGoPrev={tour.canGoPrev}
        isLastStep={tour.isLastStep}
      />

      {/* Company Switch Transition Overlay */}
      <CompanySwitchTransition />

      {/* Idle session timeout warning */}
      <IdleWarningDialog
        open={isWarning}
        secondsLeft={secondsLeft}
        onStayLoggedIn={stayLoggedIn}
        onLogoutNow={handleLogout}
      />
    </div>
  );
}
