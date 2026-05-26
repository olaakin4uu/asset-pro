'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TenantLayout } from '@/components/tenant';
import { StatCard, StatCardColors, StatCardsGrid } from '@/components/erp';
import { useCompanyContext, useCompanyContextStore } from '@/stores/company-context';
import { useTenantStore } from '@/store/tenantStore';
import { useQuery } from '@tanstack/react-query';
import {
  dashboardApi,
  type DashboardStat,
  type DashboardActivity,
  type DashboardAlert,
  type ChartConfig,
  type QuickAction,
} from '@/lib/api/core';
import { pendingApprovalsApi } from '@/lib/api/approvals';
import { NotificationsFeed } from '@/components/dashboard/NotificationsFeed';
import type { ApprovalStats, ApprovalStatsByFlow } from '@/types/approvals';
import {
  DollarSign, ShoppingCart, Package, Receipt, TrendingUp, CheckCircle,
  Users, Clock, FileText, AlertCircle, Building2, Sparkles, Activity,
  ClipboardCheck, ArrowRight, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';
import { brand } from '@/lib/brand';
import { detectDashboardProfile } from './components/DashboardProfileDetector';
import FundManagementDashboard from './components/FundManagementDashboard';
import FleetManagementDashboard from './components/FleetManagementDashboard';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard' }];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign, ShoppingCart, Package, Receipt, TrendingUp, CheckCircle,
  Users, Clock, FileText, AlertCircle, Sparkles,
};

// ============================================================================
// WELCOME HERO (compact)
// ============================================================================

function WelcomeHero({ userName, companyName, businessType, currentDate, quickActions, loading }: {
  userName: string; companyName: string; businessType?: string; currentDate: string; quickActions: QuickAction[]; loading?: boolean;
}) {
  const router = useRouter();
  return (
    <div className="welcome-hero p-5 md:p-6">
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {loading ? <div className="h-6 w-32 bg-primary/10 rounded-full animate-pulse" /> : (
              <>
                <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 border border-primary/20">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">{companyName}</span>
                </div>
                {businessType && <span className="rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:text-purple-300">{businessType}</span>}
              </>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-bold">Welcome back, <span className="animated-gradient-text">{userName}</span></h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" />{currentDate}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => {
            const Icon = iconMap[a.icon] || Sparkles;
            return (
              <button key={a.href} onClick={() => router.push(a.href)}
                className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:shadow-md',
                  a.variant === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-card border border-border text-foreground hover:bg-accent')}>
                <Icon className="h-3.5 w-3.5" />{a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CLICKABLE STAT CARD
// ============================================================================

function DashboardStatCard({ stat }: { stat: DashboardStat }) {
  const router = useRouter();
  const Icon = iconMap[stat.icon] || Package;
  const color = StatCardColors[stat.color] || StatCardColors.blue;

  return (
    <div onClick={() => stat.link && router.push(stat.link)} className={stat.link ? 'cursor-pointer group' : ''}>
      <StatCard title={stat.title} value={stat.value} subtitle={stat.subtitle} icon={Icon} color={color}
        trend={stat.trend} progress={stat.progress} badge={stat.badge} />
    </div>
  );
}

// ============================================================================
// PENDING APPROVALS (hide zeros)
// ============================================================================

function buildFlowHref(flow: ApprovalStatsByFlow): string {
  // Dashboard counts are company-wide; scope=all matches the displayed total so
  // clicking a row lands on the same dataset (admin view).
  return `/core/approvals/pending?type=${encodeURIComponent(flow.approvableType)}&scope=all`;
}

function PendingApprovalsCard({ loading }: { loading?: boolean }) {
  const router = useRouter();
  const { data: stats } = useQuery<ApprovalStats>({
    queryKey: ['approval-stats'],
    queryFn: () => pendingApprovalsApi.getStats(),
    staleTime: 60 * 1000,
  });

  if (loading || !stats) {
    return (
      <div className="bg-card border rounded-xl p-5">
        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}</div>
      </div>
    );
  }

  const items = [
    { label: 'Pending', value: stats.pending, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Approved Today', value: stats.approvedToday, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
    { label: 'Rejected Today', value: stats.rejectedToday, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
    { label: 'Urgent', value: stats.urgentCount, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' },
    { label: 'Overdue', value: stats.overdueCount, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
  ].filter((i) => i.value > 0 || i.label === 'Pending'); // Hide zeros except Pending

  const byFlow = (stats.byFlow ?? []).filter((f) => (f.count ?? 0) > 0);

  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-primary" /><h3 className="font-semibold text-sm">Approvals</h3></div>
        <Link href="/approvals" className="flex items-center gap-1 text-xs text-primary hover:underline">View all<ArrowRight className="w-3 h-3" /></Link>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className={`flex items-center justify-between p-2.5 rounded-lg ${item.bg}`}>
            <span className="text-xs font-medium">{item.label}</span>
            <span className={`text-sm font-bold ${item.color}`}>{(item.value ?? 0).toLocaleString()}</span>
          </div>
        ))}
        {stats.avgApprovalTimeHours > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
            <span className="text-xs text-muted-foreground">Avg. Time</span>
            <span className="text-xs font-medium">{stats.avgApprovalTimeHours < 1 ? `${Math.round(stats.avgApprovalTimeHours * 60)}m` : `${stats.avgApprovalTimeHours.toFixed(1)}h`}</span>
          </div>
        )}
      </div>

      {byFlow.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">By Flow Type</div>
          <div className="space-y-1 max-h-[260px] overflow-y-auto">
            {byFlow.map((f) => (
              <button
                key={f.approvableType}
                onClick={() => router.push(buildFlowHref(f))}
                className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                title={`View pending ${f.flowName}`}
              >
                <span className="text-xs font-medium truncate flex-1">{f.flowName}</span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {(f.count ?? 0).toLocaleString()}
                </span>
                <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RECENT ACTIVITY (max-height scroll)
// ============================================================================

function RecentActivity({ activities, loading }: { activities: DashboardActivity[]; loading?: boolean }) {
  const getIcon = (type: string) => {
    const map: Record<string, React.ReactNode> = {
      sale: <ShoppingCart className="w-3.5 h-3.5 text-green-500" />,
      purchase: <Package className="w-3.5 h-3.5 text-blue-500" />,
      inventory: <Package className="w-3.5 h-3.5 text-orange-500" />,
      payment: <DollarSign className="w-3.5 h-3.5 text-emerald-500" />,
      alert: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
      user: <Users className="w-3.5 h-3.5 text-purple-500" />,
    };
    return map[type] || <FileText className="w-3.5 h-3.5 text-gray-500" />;
  };
  const getTypeBg = (type: string) => {
    const map: Record<string, string> = { sale: 'bg-green-100 dark:bg-green-900/30', purchase: 'bg-blue-100 dark:bg-blue-900/30', inventory: 'bg-orange-100 dark:bg-orange-900/30', payment: 'bg-emerald-100 dark:bg-emerald-900/30', alert: 'bg-red-100 dark:bg-red-900/30', user: 'bg-purple-100 dark:bg-purple-900/30' };
    return map[type] || 'bg-gray-100 dark:bg-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-card border rounded-xl p-5">
        <div className="h-5 w-32 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-muted/30 rounded animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Recent Activity</h3>
        <Link href="/core/audit-logs" className="flex items-center gap-1 text-xs text-primary hover:underline">View all<ArrowRight className="w-3 h-3" /></Link>
      </div>
      <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground"><Activity className="w-6 h-6 mx-auto mb-1 opacity-50" /><p className="text-xs">No recent activity</p></div>
        ) : activities.map((a, idx) => (
          <div key={`${a.type}-${a.id}-${idx}`} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className={`p-1.5 rounded-full ${getTypeBg(a.type)}`}>{getIcon(a.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{a.title}</p>
              <p className="text-[10px] text-muted-foreground">{a.description}</p>
            </div>
            <div className="text-right">
              {a.amount && <p className="text-xs font-medium">{a.amount}</p>}
              <p className="text-[10px] text-muted-foreground">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ALERTS (critical alerts only, no "all clear" noise)
// ============================================================================

function AlertsPanel({ alerts }: { alerts: DashboardAlert[] }) {
  const router = useRouter();
  const actionAlerts = alerts.filter((a) => a.type !== 'success');
  if (actionAlerts.length === 0) return null; // No noise when everything is fine

  const getStyle = (type: string) => {
    const map: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
      warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: <AlertCircle className="w-4 h-4 text-amber-500" /> },
      danger: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
      info: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', icon: <Clock className="w-4 h-4 text-blue-500" /> },
    };
    return map[type] || map.info;
  };

  return (
    <div className="space-y-2">
      {actionAlerts.map((alert) => {
        const style = getStyle(alert.type);
        return (
          <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}>
            {style.icon}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium">{alert.title}</span>
              <span className="text-xs text-muted-foreground ml-2">{alert.message}</span>
            </div>
            {alert.action && (
              <button onClick={() => alert.actionUrl && router.push(alert.actionUrl)} className="text-xs font-medium text-primary hover:underline whitespace-nowrap">
                {alert.action}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// SVG BAR CHART (consistent width)
// ============================================================================

function BarChart({ config }: { config: ChartConfig }) {
  const { data } = config;
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const w = 600, h = 200, mt = 10, mb = 45, ml = 50, mr = 10;
  const plotH = h - mt - mb;
  const plotW = w - ml - mr;
  const barWidth = Math.min(50, (plotW / data.length) * 0.7);
  const gap = plotW / data.length;

  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{config.title}</h4>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = mt + plotH * (1 - pct);
          const val = maxVal * pct;
          return (
            <g key={pct}>
              <line x1={ml} y1={y} x2={w - mr} y2={y} stroke="currentColor" className="text-muted/10" strokeWidth={0.5} />
              <text x={ml - 5} y={y + 4} textAnchor="end" className="fill-muted-foreground" fontSize={9}>{val >= 1e6 ? `${(val / 1e6).toFixed(1)}M` : val >= 1e3 ? `${(val / 1e3).toFixed(0)}K` : val.toFixed(0)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const barH = Math.max(2, (d.value / maxVal) * plotH);
          const x = ml + i * gap + (gap - barWidth) / 2;
          const y = mt + plotH - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} rx={3} fill={d.color || '#6366f1'} className="hover:opacity-80"><title>{`${d.label}: ${d.value.toLocaleString()}`}</title></rect>
              <text x={x + barWidth / 2} y={h - mb + 14} textAnchor="middle" className="fill-muted-foreground" fontSize={8}>{d.label.length > 10 ? d.label.slice(0, 9) + '...' : d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================================================
// SVG DONUT CHART (with center total)
// ============================================================================

function DonutChart({ config }: { config: ChartConfig }) {
  const { data } = config;
  if (data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const cx = 80, cy = 80, outerR = 70, innerR = 45;
  let currentAngle = -Math.PI / 2;
  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

  const slices = data.map((d, i) => {
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

    const path = `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
    const color = d.color || colors[i % colors.length];
    return { path, color, label: d.label, value: d.value, pct };
  });

  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{config.title}</h4>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg viewBox="0 0 160 160" className="w-32 h-32">
            {slices.map((s, i) => (
              <path key={i} d={s.path} fill={s.color} className="hover:opacity-80 transition-opacity" stroke="white" strokeWidth={1.5}>
                <title>{`${s.label}: ${s.value} (${(s.pct * 100).toFixed(0)}%)`}</title>
              </path>
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold">{total}</span>
            <span className="text-[9px] text-muted-foreground">total</span>
          </div>
        </div>
        <div className="space-y-1 flex-1 min-w-0">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-muted-foreground truncate flex-1">{s.label}</span>
              <span className="font-mono font-medium">{s.value}</span>
              <span className="text-muted-foreground w-8 text-right">{(s.pct * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION HEADER
// ============================================================================

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

// ============================================================================
// GENERAL DASHBOARD (default ERP view)
// ============================================================================

function GeneralDashboard() {
  const router = useRouter();
  const { company, companyName, isLoading: contextLoading } = useCompanyContext();
  const user = useTenantStore((s) => s.user);

  const { data: dashboardData, isLoading: dashboardLoading, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard', company?.id],
    queryFn: () => dashboardApi.getDashboard(),
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const isLoading = dashboardLoading || contextLoading;
  const charts = dashboardData?.charts || [];
  const alerts = dashboardData?.alerts || [];

  const currentDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, []);

  const userName = user?.name || 'User';

  return (
      <div className="space-y-5">
        {/* Welcome Hero (compact + adaptive quick actions) */}
        <WelcomeHero
          userName={userName}
          companyName={dashboardData?.companyInfo?.displayName || dashboardData?.companyInfo?.name || companyName || brand.appName}
          businessType={dashboardData?.companyInfo?.businessType}
          currentDate={currentDate}
          quickActions={dashboardData?.quickActions || []}
          loading={isLoading}
        />

        {/* Alerts (moved up — critical items first) */}
        {!isLoading && <AlertsPanel alerts={alerts} />}

        {/* KPI Stats (single row of 4 — clickable) */}
        <SectionHeader title="Key Metrics" />
        <StatCardsGrid columns={4}>
          {isLoading
            ? [1, 2, 3, 4].map((i) => <StatCard key={i} title="" value="" icon={Package} color={StatCardColors.blue} loading />)
            : (dashboardData?.stats || []).map((stat, i) => <DashboardStatCard key={i} stat={stat} />)
          }
        </StatCardsGrid>

        {/* Performance row (if data exists) */}
        {!isLoading && (dashboardData?.performanceStats || []).length > 0 && (
          <>
            <SectionHeader title="Performance" />
            <StatCardsGrid columns={4}>
              {(dashboardData?.performanceStats || []).map((stat, i) => <DashboardStatCard key={i} stat={stat} />)}
            </StatCardsGrid>
          </>
        )}

        {/* Charts */}
        {!isLoading && charts.length > 0 && (
          <>
            <SectionHeader title="Analytics" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {charts.map((chart, i) => chart.type === 'bar' ? <BarChart key={i} config={chart} /> : <DonutChart key={i} config={chart} />)}
            </div>
          </>
        )}

        {/* Approvals + Activity + Notifications (5:4:3 split) */}
        <SectionHeader title="Activity" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5">
            <PendingApprovalsCard loading={isLoading} />
          </div>
          <div className="lg:col-span-4">
            <RecentActivity activities={dashboardData?.activities || []} loading={isLoading} />
          </div>
          <div className="lg:col-span-3">
            <NotificationsFeed />
          </div>
        </div>

        {/* Refresh indicator */}
        {dataUpdatedAt > 0 && (
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground pt-2">
            <RefreshCw className="h-3 w-3" />
            Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()} &middot; Auto-refreshes every minute
          </div>
        )}
      </div>
  );
}

// ============================================================================
// MAIN PAGE — routes to the correct dashboard by business profile
// ============================================================================

export default function TenantDashboardPage() {
  const enabledModules = useCompanyContextStore((s) => s.enabledModules);
  const profile = useMemo(() => detectDashboardProfile(enabledModules), [enabledModules]);

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      {profile === 'fund-management' ? (
        <FundManagementDashboard />
      ) : profile === 'fleet-management' ? (
        <FleetManagementDashboard />
      ) : (
        <GeneralDashboard />
      )}
    </TenantLayout>
  );
}
