'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Building2,
  Wallet,
  Settings,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Package,
  BarChart3,
  Wrench,
  ArrowLeftRight,
  Trash2,
  BookOpen,
  Landmark,
  Receipt,
  CreditCard,
  FileText,
  Scale,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CompanySwitcher } from '@/components/erp/CompanySwitcher';
import { useTenantStore } from '@/store/tenantStore';
import { pendingApprovalsApi } from '@/lib/api/approvals';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    ],
  },
  {
    title: 'Fixed Assets',
    items: [
      { title: 'Assets', href: '/assets/assets', icon: Package },
      { title: 'Asset Classes', href: '/assets/asset-classes', icon: BookOpen },
      { title: 'Depreciations', href: '/assets/depreciations', icon: BarChart3 },
      { title: 'Disposals', href: '/assets/disposals', icon: Trash2 },
      { title: 'Transfers', href: '/assets/transfers', icon: ArrowLeftRight },
      { title: 'Maintenance', href: '/assets/maintenance', icon: Wrench },
      { title: 'Reports', href: '/assets/reports', icon: FileText },
    ],
  },
  {
    title: 'Accounts',
    items: [
      { title: 'Chart of Accounts', href: '/accounts/chart-of-accounts', icon: BookOpen },
      { title: 'Journal Entries', href: '/accounts/journal-entries', icon: FileText },
      { title: 'Fiscal Years', href: '/accounts/fiscal-years', icon: Scale },
      { title: 'Currencies', href: '/accounts/currencies', icon: Landmark },
      { title: 'Banks', href: '/accounts/banks', icon: Landmark },
      { title: 'Expense Requests', href: '/accounts/expense-requests', icon: Receipt },
      { title: 'Bank Transfers', href: '/accounts/bank-transfers', icon: ArrowLeftRight },
      { title: 'Payment Methods', href: '/accounts/payment-methods', icon: CreditCard },
      { title: 'VAT', href: '/accounts/vat', icon: Scale },
      { title: 'WHT', href: '/accounts/wht', icon: Scale },
      { title: 'Reports', href: '/accounts/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Administration',
    items: [
      { title: 'Users', href: '/core/users', icon: Users },
      { title: 'Companies', href: '/core/companies', icon: Building2 },
      { title: 'Branches', href: '/core/branches', icon: Building2 },
      { title: 'Roles', href: '/core/roles', icon: Settings },
    ],
  },
];

const footerNavItems: NavItem[] = [
  { title: 'Settings', href: '/settings', icon: Settings },
  { title: 'Approvals', href: '/approvals', icon: CheckCircle },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  useTenantStore((s) => s.user?.role);

  const { data: pendingCount } = useQuery({
    queryKey: ['pending-approvals-count'],
    queryFn: () => pendingApprovalsApi.getCount(),
    refetchInterval: 120_000,
    retry: false,
  });

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  };

  const isItemActive = (item: NavItem, siblings: NavItem[]) => {
    if (!isActive(item.href)) return false;
    return !siblings.some(
      (other) =>
        other !== item &&
        other.href.length > item.href.length &&
        pathname.startsWith(other.href),
    );
  };

  return (
    <aside
      data-sidebar
      data-collapsible="icon"
      data-state={collapsed ? 'collapsed' : 'expanded'}
      className={`flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 ease-linear ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      style={{ borderRight: '1px solid var(--sidebar-border)' }}
    >
      {/* Header */}
      <div className="flex h-16 items-center border-b px-3" style={{ borderColor: 'var(--sidebar-border)' }}>
        <CompanySwitcher showBranchSelector collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2" style={{ height: 'calc(100vh - 140px)' }}>
        {navGroups.map((group) => (
          <div key={group.title} className="mb-4">
            {!collapsed && (
              <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {group.title}
              </div>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item, group.items);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      data-nav-item
                      data-active={active ? '' : undefined}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      }`}
                      title={collapsed ? item.title : undefined}
                    >
                      <span
                        className={`absolute left-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-r-sm bg-sidebar-primary transition-transform duration-200 ${
                          active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'
                        }`}
                      />
                      <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-sidebar-primary' : ''}`} />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-2" style={{ borderColor: 'var(--sidebar-border)' }}>
        <ul className="mb-2 space-y-1">
          {footerNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`}
                  title={collapsed ? item.title : undefined}
                >
                  <span
                    className={`absolute left-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-r-sm bg-sidebar-primary transition-transform duration-200 ${
                      active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'
                    }`}
                  />
                  <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-sidebar-primary' : ''}`} />
                  {!collapsed && <span className="flex-1">{item.title}</span>}
                  {!collapsed && item.href === '/approvals' && (pendingCount ?? 0) > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                      {pendingCount}
                    </span>
                  )}
                  {collapsed && item.href === '/approvals' && (pendingCount ?? 0) > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-0.5 text-[9px] font-bold text-white">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {onToggle && (
          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
