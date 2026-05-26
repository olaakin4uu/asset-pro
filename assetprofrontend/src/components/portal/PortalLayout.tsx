'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { usePortalAuthStore } from '@/stores/portal-auth';
import { portalApi } from '@/lib/api/portal';
import {
  LayoutDashboard, Wallet, ArrowUpRight, ArrowDownLeft, Landmark,
  FileText, Bell, User, LogOut, Menu, X, Truck, CalendarPlus, Receipt,
} from 'lucide-react';

// ============================================================================
// NAV CONFIG
// ============================================================================

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** If set, nav item only shows when the customer's role includes one of these. */
  requiresRole?: Array<'investor' | 'investee' | 'both'>;
  /** If set, nav item only shows when userType matches. */
  requiresUserType?: string[];
};

const navItems: NavItem[] = [
  { href: '/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresUserType: ['INVESTOR'] },
  { href: '/portal/investments', label: 'My Investments', icon: Wallet, requiresRole: ['investor', 'both'], requiresUserType: ['INVESTOR'] },
  { href: '/portal/subscriptions', label: 'Investment Booking', icon: ArrowUpRight, requiresRole: ['investor', 'both'], requiresUserType: ['INVESTOR'] },
  { href: '/portal/redemptions', label: 'Liquidations', icon: ArrowDownLeft, requiresRole: ['investor', 'both'], requiresUserType: ['INVESTOR'] },
  { href: '/portal/facilities', label: 'My Facilities', icon: Landmark, requiresRole: ['investee', 'both'], requiresUserType: ['INVESTOR'] },
  { href: '/portal/documents', label: 'Documents', icon: FileText, requiresUserType: ['INVESTOR'] },
  { href: '/portal/notifications', label: 'Notifications', icon: Bell, requiresUserType: ['INVESTOR'] },
  { href: '/portal/profile', label: 'Profile', icon: User, requiresUserType: ['INVESTOR'] },
  // Fleet customer portal nav
  { href: '/portal/fleet/bookings', label: 'My Bookings', icon: Truck, requiresUserType: ['CUSTOMER'] },
  { href: '/portal/fleet/invoices', label: 'My Invoices', icon: Receipt, requiresUserType: ['CUSTOMER'] },
  { href: '/portal/fleet/bookings/new', label: 'New Request', icon: CalendarPlus, requiresUserType: ['CUSTOMER'] },
];

function filterNavByRole(items: NavItem[], customerRole: string | null | undefined, userType?: string): NavItem[] {
  return items.filter((item) => {
    if (item.requiresUserType && userType && !item.requiresUserType.includes(userType)) return false;
    if (!item.requiresRole) return true;
    const effectiveRole = (customerRole as 'investor' | 'investee' | 'both') || 'investor';
    return item.requiresRole.includes(effectiveRole);
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout, loadFromStorage } = usePortalAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFromStorage();
    setLoaded(true);
  }, [loadFromStorage]);

  useEffect(() => {
    if (loaded && !isAuthenticated && !pathname.includes('/portal/login')) {
      router.push('/portal/login');
    }
  }, [loaded, isAuthenticated, pathname, router]);

  // Fetch investor profile to get customerRole — used to filter nav.
  // Must be declared BEFORE any early return to satisfy the rules of hooks.
  const { data: profile } = useQuery({
    queryKey: ['portal-profile'],
    queryFn: () => portalApi.getProfile(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const handleLogout = () => {
    logout();
    router.push('/portal/login');
  };

  // Don't show layout on login page
  if (pathname.includes('/portal/login')) {
    return <>{children}</>;
  }

  if (!loaded || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const visibleNavItems = filterNavByRole(navItems, profile?.customerRole, user?.userType);
  const investorName = user?.name || 'Portal User';

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between">
            {/* Logo + App Name */}
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-1.5 rounded-md hover:bg-muted"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Link href={user?.userType === 'CUSTOMER' ? '/portal/fleet/bookings' : '/portal/dashboard'} className="flex items-center gap-2">
                {user?.userType === 'CUSTOMER' ? (
                  <Truck className="h-6 w-6 text-primary" />
                ) : (
                  <Landmark className="h-6 w-6 text-primary" />
                )}
                <span className="font-bold text-foreground hidden sm:inline">
                  {user?.userType === 'CUSTOMER' ? 'Fleet Portal' : 'Investor Portal'}
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {visibleNavItems.slice(0, 5).map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Notifications + Profile */}
            <div className="flex items-center gap-2">
              <Link href="/portal/notifications" className="p-2 rounded-md hover:bg-muted relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </Link>
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l">
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{investorName}</p>
                  <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                </div>
                <button onClick={handleLogout} className="p-2 rounded-md hover:bg-muted" title="Logout">
                  <LogOut className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-64 bg-card h-full shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 pb-4 border-b">
              <p className="text-sm font-medium">{investorName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <nav className="space-y-1">
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                      isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-6 pt-4 border-t">
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-red-500 hover:bg-red-50 w-full">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
