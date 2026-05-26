'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Package, TrendingDown, Wrench, ArrowRightLeft, Trash2,
  AlertCircle, Clock, CheckCircle, Building2, ArrowRight,
  RefreshCw, Plus, BarChart3, Activity,
} from 'lucide-react';
import { StatCard, StatCardColors, StatCardsGrid } from '@/components/erp';
import { useCompanyContext } from '@/stores/company-context';
import { useTenantStore } from '@/store/tenantStore';
import { NotificationsFeed } from '@/components/dashboard/NotificationsFeed';
import { pendingApprovalsApi } from '@/lib/api/approvals';
import {
  assetsApi,
  assetDepreciationsApi,
  assetMaintenancesApi,
  assetDisposalsApi,
  assetTransfersApi,
} from '@/lib/api/assets';
import type { AssetMaintenance } from '@/types/assets';
import type { ApprovalStats, ApprovalStatsByFlow } from '@/types/approvals';
import { cn, formatCurrency } from '@/lib/utils';
import { brand } from '@/lib/brand';

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME HERO
// ─────────────────────────────────────────────────────────────────────────────

function WelcomeHero({
  userName, companyName, currentDate, loading,
}: { userName: string; companyName: string; currentDate: string; loading?: boolean }) {
  const router = useRouter();

  const quickActions = [
    { label: 'New Asset', href: '/assets/assets/create', primary: true },
    { label: 'Run Depreciation', href: '/assets/depreciations/create', primary: false },
    { label: 'New Maintenance', href: '/assets/maintenance/create', primary: false },
  ];

  return (
    <div className="welcome-hero p-5 md:p-6">
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {loading ? (
              <div className="h-6 w-32 bg-primary/10 rounded-full animate-pulse" />
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 border border-primary/20">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">{companyName}</span>
              </div>
            )}
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
              Asset Management
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold">
            Welcome back, <span className="animated-gradient-text">{userName}</span>
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" />{currentDate}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <button
              key={a.href}
              onClick={() => router.push(a.href)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:shadow-md',
                a.primary
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-card border border-border text-foreground hover:bg-accent',
              )}
            >
              <Plus className="h-3.5 w-3.5" />{a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERTS — overdue maintenance + pending disposals
// ─────────────────────────────────────────────────────────────────────────────

function AlertsPanel({ overdueCount, pendingDisposals }: { overdueCount: number; pendingDisposals: number }) {
  const router = useRouter();
  const alerts: Array<{ id: string; type: 'warning' | 'danger'; title: string; message: string; action: string; href: string }> = [];

  if (overdueCount > 0) {
    alerts.push({
      id: 'overdue-maintenance',
      type: 'danger',
      title: `${overdueCount} Overdue Maintenance`,
      message: overdueCount === 1 ? '1 asset is past its maintenance due date.' : `${overdueCount} assets are past their maintenance due dates.`,
      action: 'View',
      href: '/assets/maintenance',
    });
  }
  if (pendingDisposals > 0) {
    alerts.push({
      id: 'pending-disposals',
      type: 'warning',
      title: `${pendingDisposals} Disposal${pendingDisposals > 1 ? 's' : ''} Pending Approval`,
      message: 'Asset disposal request(s) are awaiting approval.',
      action: 'Review',
      href: '/assets/disposals',
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg border',
            alert.type === 'danger'
              ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
          )}
        >
          <AlertCircle className={cn('w-4 h-4 flex-shrink-0', alert.type === 'danger' ? 'text-red-500' : 'text-amber-500')} />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium">{alert.title}</span>
            <span className="text-xs text-muted-foreground ml-2">{alert.message}</span>
          </div>
          <button onClick={() => router.push(alert.href)} className="text-xs font-medium text-primary hover:underline whitespace-nowrap">
            {alert.action}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSET STATUS DONUT
// ─────────────────────────────────────────────────────────────────────────────

function AssetStatusDonut({ active, inactive, underMaintenance, disposed }: {
  active: number; inactive: number; underMaintenance: number; disposed: number;
}) {
  const data = [
    { label: 'Active', value: active, color: '#22c55e' },
    { label: 'Inactive', value: inactive, color: '#94a3b8' },
    { label: 'Maintenance', value: underMaintenance, color: '#f59e0b' },
    { label: 'Disposed', value: disposed, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 flex items-center justify-center min-h-[180px]">
        <div className="text-center text-muted-foreground">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">No assets recorded yet</p>
        </div>
      </div>
    );
  }

  const cx = 80, cy = 80, outerR = 70, innerR = 48;
  let currentAngle = -Math.PI / 2;

  const slices = data.map((d) => {
    const pct = d.value / total;
    const angle = pct * 2 * Math.PI;
    const start = currentAngle;
    const end = currentAngle + angle;
    currentAngle = end;
    const largeArc = angle > Math.PI ? 1 : 0;
    const ox1 = cx + outerR * Math.cos(start), oy1 = cy + outerR * Math.sin(start);
    const ox2 = cx + outerR * Math.cos(end), oy2 = cy + outerR * Math.sin(end);
    const ix1 = cx + innerR * Math.cos(end), iy1 = cy + innerR * Math.sin(end);
    const ix2 = cx + innerR * Math.cos(start), iy2 = cy + innerR * Math.sin(start);
    return {
      path: `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`,
      ...d, pct,
    };
  });

  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Asset Status</h4>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg viewBox="0 0 160 160" className="w-32 h-32">
            {slices.map((s, i) => (
              <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth={1.5} className="hover:opacity-80 transition-opacity">
                <title>{`${s.label}: ${s.value} (${(s.pct * 100).toFixed(0)}%)`}</title>
              </path>
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold">{total}</span>
            <span className="text-[9px] text-muted-foreground">total</span>
          </div>
        </div>
        <div className="space-y-1.5 flex-1 min-w-0">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-muted-foreground flex-1">{s.label}</span>
              <span className="font-mono font-medium">{s.value}</span>
              <span className="text-muted-foreground w-8 text-right">{(s.pct * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPCOMING MAINTENANCE LIST
// ─────────────────────────────────────────────────────────────────────────────

function UpcomingMaintenance({ items, loading }: { items: AssetMaintenance[]; loading?: boolean }) {
  const router = useRouter();

  const priorityColor: Record<string, string> = {
    critical: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
    high: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30',
    medium: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
    low: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30',
  };

  if (loading) {
    return (
      <div className="bg-card border rounded-xl p-5">
        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Upcoming Maintenance</h3>
        </div>
        <Link href="/assets/maintenance" className="flex items-center gap-1 text-xs text-primary hover:underline">
          View all<ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="w-6 h-6 mx-auto mb-1 opacity-50" />
            <p className="text-xs">No upcoming maintenance in next 30 days</p>
          </div>
        ) : (
          items.slice(0, 8).map((m) => (
            <button
              key={m.id}
              onClick={() => router.push(`/assets/maintenance/${m.id}`)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <div className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 capitalize', priorityColor[m.priority] || priorityColor.low)}>
                {m.priority}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{m.assetName || m.assetCode}</p>
                <p className="text-[10px] text-muted-foreground truncate">{m.title}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-muted-foreground">
                  {m.dueDate ? new Date(m.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '—'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PENDING APPROVALS (asset-focused)
// ─────────────────────────────────────────────────────────────────────────────

function buildFlowHref(flow: ApprovalStatsByFlow): string {
  return `/approvals?type=${encodeURIComponent(flow.approvableType)}&scope=all`;
}

function PendingApprovalsCard({ loading }: { loading?: boolean }) {
  const router = useRouter();
  const { data: stats } = useQuery<ApprovalStats>({
    queryKey: ['approval-stats'],
    queryFn: () => pendingApprovalsApi.getStats(),
    staleTime: 60_000,
  });

  if (loading || !stats) {
    return (
      <div className="bg-card border rounded-xl p-5">
        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />)}</div>
      </div>
    );
  }

  const byFlow = (stats.byFlow ?? []).filter((f) => (f.count ?? 0) > 0);

  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Pending Approvals</h3>
        </div>
        <Link href="/approvals" className="flex items-center gap-1 text-xs text-primary hover:underline">
          View all<ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: 'Pending', value: stats.pending, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Urgent', value: stats.urgentCount, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' },
        ].map((item) => (
          <div key={item.label} className={`flex flex-col p-2.5 rounded-lg ${item.bg}`}>
            <span className={`text-lg font-bold ${item.color}`}>{(item.value ?? 0).toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {byFlow.length > 0 ? (
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {byFlow.map((f) => (
            <button
              key={f.approvableType}
              onClick={() => router.push(buildFlowHref(f))}
              className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <span className="text-xs font-medium truncate flex-1">{f.flowName}</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">{(f.count ?? 0).toLocaleString()}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          <CheckCircle className="w-5 h-5 mx-auto mb-1 opacity-40" />
          <p className="text-xs">No pending approvals</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AssetManagementDashboard() {
  const { companyName, isLoading: contextLoading } = useCompanyContext();
  const user = useTenantStore((s) => s.user);

  const { data: assetStats, isLoading: assetsLoading } = useQuery({
    queryKey: ['asset-stats'],
    queryFn: () => assetsApi.getStats(),
    staleTime: 60_000,
  });

  const { data: deprStats, isLoading: deprLoading } = useQuery({
    queryKey: ['depreciation-stats'],
    queryFn: () => assetDepreciationsApi.getStats(),
    staleTime: 60_000,
  });

  const { data: maintStats, isLoading: maintLoading } = useQuery({
    queryKey: ['maintenance-stats'],
    queryFn: () => assetMaintenancesApi.getStats(),
    staleTime: 60_000,
  });

  const { data: disposalStats } = useQuery({
    queryKey: ['disposal-stats'],
    queryFn: () => assetDisposalsApi.getStats(),
    staleTime: 60_000,
  });

  const { data: transferStats } = useQuery({
    queryKey: ['transfer-stats'],
    queryFn: () => assetTransfersApi.getStats(),
    staleTime: 60_000,
  });

  const { data: upcomingMaintenance, isLoading: upcomingLoading } = useQuery({
    queryKey: ['maintenance-upcoming'],
    queryFn: () => assetMaintenancesApi.getUpcoming(30),
    staleTime: 60_000,
  });

  const { data: dataUpdatedAt } = useQuery({
    queryKey: ['asset-stats'],
    queryFn: () => assetsApi.getStats(),
    select: () => Date.now(),
    staleTime: 60_000,
  });

  const isLoading = assetsLoading || contextLoading;

  const currentDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, []);

  const userName = user?.name?.split(' ')[0] || 'User';

  const kpi1 = [
    {
      title: 'Total Assets',
      value: isLoading ? '—' : (assetStats?.total ?? 0).toLocaleString(),
      subtitle: `${assetStats?.active ?? 0} active`,
      icon: Package,
      color: StatCardColors.blue,
      link: '/assets/assets',
    },
    {
      title: 'Total Asset Value',
      value: isLoading ? '—' : formatCurrency(assetStats?.totalValue ?? 0),
      subtitle: 'at cost',
      icon: BarChart3,
      color: StatCardColors.green,
      link: '/assets/assets',
    },
    {
      title: 'Net Book Value',
      value: isLoading ? '—' : formatCurrency(assetStats?.totalNetBookValue ?? 0),
      subtitle: `Accum. depr: ${formatCurrency(assetStats?.totalAccumulatedDepreciation ?? 0)}`,
      icon: TrendingDown,
      color: StatCardColors.purple,
      link: '/assets/depreciations',
    },
    {
      title: 'Under Maintenance',
      value: isLoading ? '—' : (assetStats?.underMaintenance ?? 0).toLocaleString(),
      subtitle: `${maintStats?.overdue ?? 0} overdue`,
      icon: Wrench,
      color: (maintStats?.overdue ?? 0) > 0 ? StatCardColors.red : StatCardColors.orange,
      link: '/assets/maintenance',
    },
  ];

  const kpi2 = [
    {
      title: 'Depreciations',
      value: deprLoading ? '—' : (deprStats?.total ?? 0).toLocaleString(),
      subtitle: `${deprStats?.draft ?? 0} draft · ${deprStats?.posted ?? 0} posted`,
      icon: TrendingDown,
      color: StatCardColors.indigo,
      link: '/assets/depreciations',
    },
    {
      title: 'Disposals',
      value: disposalStats ? (disposalStats.total ?? 0).toLocaleString() : '—',
      subtitle: `${disposalStats?.pendingApproval ?? 0} pending approval`,
      icon: Trash2,
      color: (disposalStats?.pendingApproval ?? 0) > 0 ? StatCardColors.orange : StatCardColors.gray,
      link: '/assets/disposals',
    },
    {
      title: 'Transfers',
      value: transferStats ? (transferStats.total ?? 0).toLocaleString() : '—',
      subtitle: `${transferStats?.inTransit ?? 0} in transit`,
      icon: ArrowRightLeft,
      color: StatCardColors.cyan,
      link: '/assets/transfers',
    },
    {
      title: 'Maintenance Jobs',
      value: maintLoading ? '—' : (maintStats?.total ?? 0).toLocaleString(),
      subtitle: `${maintStats?.inProgress ?? 0} in progress · ${maintStats?.scheduled ?? 0} scheduled`,
      icon: Wrench,
      color: StatCardColors.blue,
      link: '/assets/maintenance',
    },
  ];

  return (
    <div className="space-y-5">
      <WelcomeHero
        userName={userName}
        companyName={companyName || brand.appName}
        currentDate={currentDate}
        loading={isLoading}
      />

      <AlertsPanel
        overdueCount={maintStats?.overdue ?? 0}
        pendingDisposals={disposalStats?.pendingApproval ?? 0}
      />

      <SectionHeader title="Asset Portfolio" />
      <StatCardsGrid columns={4}>
        {kpi1.map((k, i) => (
          <div key={i} onClick={() => k.link && window.location.assign(k.link)} className="cursor-pointer group">
            <StatCard title={k.title} value={k.value} subtitle={k.subtitle} icon={k.icon} color={k.color} loading={isLoading} />
          </div>
        ))}
      </StatCardsGrid>

      <SectionHeader title="Activity Overview" />
      <StatCardsGrid columns={4}>
        {kpi2.map((k, i) => (
          <div key={i} onClick={() => k.link && window.location.assign(k.link)} className="cursor-pointer group">
            <StatCard title={k.title} value={k.value} subtitle={k.subtitle} icon={k.icon} color={k.color} />
          </div>
        ))}
      </StatCardsGrid>

      <SectionHeader title="Analytics & Activity" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AssetStatusDonut
          active={assetStats?.active ?? 0}
          inactive={assetStats?.inactive ?? 0}
          underMaintenance={assetStats?.underMaintenance ?? 0}
          disposed={assetStats?.disposed ?? 0}
        />
        <div className="rounded-xl border bg-card p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Depreciation Summary</h4>
          <div className="space-y-2">
            {[
              { label: 'Draft', value: deprStats?.draft ?? 0, color: 'bg-slate-400' },
              { label: 'Pending', value: deprStats?.pending ?? 0, color: 'bg-amber-400' },
              { label: 'Posted', value: deprStats?.posted ?? 0, color: 'bg-green-500' },
            ].map((row) => {
              const total = (deprStats?.total ?? 0) || 1;
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-14 text-xs text-muted-foreground">{row.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.min(100, (row.value / total) * 100)}%` }} />
                  </div>
                  <span className="w-6 text-xs font-mono text-right">{row.value}</span>
                </div>
              );
            })}
            {(deprStats?.totalAmount ?? 0) > 0 && (
              <div className="pt-2 border-t text-xs text-muted-foreground flex justify-between">
                <span>Total depreciation amount</span>
                <span className="font-medium text-foreground">{formatCurrency(deprStats?.totalAmount ?? 0)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <SectionHeader title="Maintenance & Approvals" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
          <UpcomingMaintenance items={upcomingMaintenance ?? []} loading={upcomingLoading} />
        </div>
        <div className="lg:col-span-4">
          <PendingApprovalsCard />
        </div>
        <div className="lg:col-span-3">
          <NotificationsFeed />
        </div>
      </div>

      {(dataUpdatedAt ?? 0) > 0 && (
        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground pt-2">
          <RefreshCw className="h-3 w-3" />
          Auto-refreshes every minute
        </div>
      )}
    </div>
  );
}
