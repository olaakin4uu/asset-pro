'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { StatCard, StatCardColors, StatCardsGrid } from '@/components/erp';
import { useCompanyContext } from '@/stores/company-context';
import { useTenantStore } from '@/store/tenantStore';
import { useQuery } from '@tanstack/react-query';
import {
  dashboardApi,
  type DashboardStat,
  type DashboardActivity,
  type DashboardAlert,
  type FmCashPosition,
} from '@/lib/api/core';
import { pendingApprovalsApi } from '@/lib/api/approvals';
import type { ApprovalStats } from '@/types/approvals';
import {
  DollarSign,
  ShoppingCart,
  Package,
  Receipt,
  TrendingUp,
  CheckCircle,
  Users,
  Clock,
  FileText,
  AlertCircle,
  Building2,
  Sparkles,
  Activity,
  ClipboardCheck,
  ArrowRight,
  ShieldCheck,
  PieChart,
  Landmark,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

// ============================================================================
// ICON MAP
// ============================================================================

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign, ShoppingCart, Package, Receipt, TrendingUp, CheckCircle,
  Users, Clock, FileText, AlertCircle,
};

// ============================================================================
// SECTION HEADER
// ============================================================================

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
        {title}
      </h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ============================================================================
// WELCOME HERO
// ============================================================================

function WelcomeHero({
  userName,
  companyName,
  businessType,
  currentDate,
  loading,
}: {
  userName: string;
  companyName: string;
  businessType?: string;
  currentDate: string;
  loading?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="welcome-hero p-5 md:p-6">
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: identity + greeting */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {loading ? (
              <div className="h-6 w-36 bg-primary/10 rounded-full animate-pulse" />
            ) : (
              <>
                <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 border border-primary/20">
                  <Landmark className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">{companyName}</span>
                </div>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                  {businessType || 'Fund Management'}
                </span>
              </>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-bold">
            Welcome back, <span className="animated-gradient-text">{userName}</span>
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" />
            {currentDate}
          </p>
        </div>

        {/* Right: quick actions */}
        <div className="flex flex-wrap gap-2">
          {[
            { href: '/fund-management',           icon: PieChart,     label: 'Fund Overview', primary: true },
            { href: '/fund-management/investors',  icon: Users,        label: 'Investors',     primary: false },
            { href: '/fund-management/nav',        icon: TrendingUp,   label: 'NAV Engine',    primary: false },
            { href: '/fund-management/compliance', icon: ShieldCheck,  label: 'Compliance',    primary: false },
          ].map(({ href, icon: Icon, label, primary }) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:shadow-md ${
                primary
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-card border border-border text-foreground hover:bg-accent'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STAT CARD FROM API DATA
// ============================================================================

function DashboardStatCard({ stat }: { stat: DashboardStat }) {
  const Icon = iconMap[stat.icon] || Wallet;
  const color = StatCardColors[stat.color] || StatCardColors.blue;
  return (
    <StatCard
      title={stat.title}
      value={stat.value}
      subtitle={stat.subtitle}
      icon={Icon}
      color={color}
      trend={stat.trend}
      progress={stat.progress}
      badge={stat.badge}
    />
  );
}

// ============================================================================
// CASH POSITION CARD
// ============================================================================

const CASH_AUM_LIMIT = 5;

function CashPositionCard({ cashPosition, loading }: { cashPosition: FmCashPosition; loading?: boolean }) {
  const fmt = (n: number) =>
    n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `₦${(n / 1_000).toFixed(1)}K` : `₦${n.toFixed(2)}`;

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 h-full">
        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  const pct = cashPosition.cashToAumPct;
  const breached = cashPosition.cashBreached;
  const barColor = breached ? 'bg-red-500' : pct >= 3 ? 'bg-amber-500' : 'bg-green-500';
  const pctColor = breached ? 'text-red-600 dark:text-red-400' : pct >= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400';
  const barWidth = `${Math.min(pct / CASH_AUM_LIMIT, 1) * 100}%`;

  return (
    <div className={`bg-card border rounded-xl p-5 fade-in h-full ${breached ? 'border-red-400 dark:border-red-600' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Cash Position</h3>
        </div>
        {breached && (
          <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-full animate-pulse">
            <AlertCircle className="w-3 h-3" /> Above 5%
          </span>
        )}
      </div>

      {/* Cash-to-AUM progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Cash / AUM ratio</span>
          <span className={`font-bold ${pctColor}`}>{pct.toFixed(2)}%</span>
        </div>
        <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: barWidth }} />
          <div className="absolute top-0 right-0 h-full w-0.5 bg-red-400/60" title="5% limit" />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
          <span>0%</span>
          <span className="text-red-500">Limit 5%</span>
        </div>
      </div>

      {/* Summary rows */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
          <span className="text-xs font-medium text-foreground">Total Bank Cash</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{fmt(cashPosition.totalBankBalance)}</span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30">
          <span className="text-xs font-medium text-foreground">Investee Outstanding</span>
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{fmt(cashPosition.investeeOutstanding)}</span>
        </div>
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
          <span className="text-xs text-muted-foreground">Total AUM</span>
          <span className="text-xs font-semibold text-foreground">{fmt(cashPosition.aum)}</span>
        </div>
      </div>

      {/* Bank breakdown */}
      {cashPosition.banks.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bank Breakdown</p>
          <div className="space-y-1.5">
            {cashPosition.banks.map((bank) => {
              const bankPct = cashPosition.totalBankBalance > 0 ? (bank.balance / cashPosition.totalBankBalance) * 100 : 0;
              return (
                <div key={bank.glCode} className="flex items-center gap-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <span className="truncate text-foreground font-medium">{bank.name}</span>
                      <span className="text-muted-foreground ml-2 flex-shrink-0">{fmt(bank.balance)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${bankPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPLIANCE SUMMARY CARD
// ============================================================================

function ComplianceSummaryCard({
  summary,
  loading,
}: {
  summary: { totalRules: number; passedChecks: number; failedChecks: number; breachCount: number };
  loading?: boolean;
}) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 h-full">
        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  const totalChecks = summary.passedChecks + summary.failedChecks;
  const passRate = totalChecks > 0 ? Math.round((summary.passedChecks / totalChecks) * 100) : 100;

  const items = [
    { label: 'Active Rules',    value: summary.totalRules,    color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Checks Passed',   value: summary.passedChecks,  color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' },
    { label: 'Checks Failed',   value: summary.failedChecks,  color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950/30' },
    { label: 'Active Breaches', value: summary.breachCount,   color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 fade-in h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Compliance</h3>
        </div>
        <Link href="/fund-management/compliance" className="flex items-center gap-1 text-xs text-primary hover:underline">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-1.5">
        {items.filter((i) => i.value > 0 || i.label === 'Active Rules').map((item) => (
          <div key={item.label} className={`flex items-center justify-between p-2.5 rounded-lg ${item.bg}`}>
            <span className="text-xs font-medium text-foreground">{item.label}</span>
            <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
          <span className="text-xs text-muted-foreground">Pass Rate (90d)</span>
          <span className={`text-xs font-medium ${passRate >= 90 ? 'text-green-600 dark:text-green-400' : passRate >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
            {passRate}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PENDING APPROVALS CARD
// ============================================================================

function PendingApprovalsCard({ loading }: { loading?: boolean }) {
  const { data: stats } = useQuery<ApprovalStats>({
    queryKey: ['approval-stats'],
    queryFn: () => pendingApprovalsApi.getStats(),
    staleTime: 60 * 1000,
  });

  if (loading || !stats) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 h-full">
        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  const items = [
    { label: 'Pending',        value: stats.pending,        color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Approved Today', value: stats.approvedToday,  color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-950/30' },
    { label: 'Rejected Today', value: stats.rejectedToday,  color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-950/30' },
    { label: 'Urgent',         value: stats.urgentCount,    color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' },
    { label: 'Overdue',        value: stats.overdueCount,   color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-950/30' },
  ].filter((i) => i.value > 0 || i.label === 'Pending');

  return (
    <div className="bg-card border border-border rounded-xl p-5 fade-in h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Approvals</h3>
        </div>
        <Link href="/approvals" className="flex items-center gap-1 text-xs text-primary hover:underline">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className={`flex items-center justify-between p-2.5 rounded-lg ${item.bg}`}>
            <span className="text-xs font-medium text-foreground">{item.label}</span>
            <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
          </div>
        ))}
        {stats.avgApprovalTimeHours > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
            <span className="text-xs text-muted-foreground">Avg. Approval Time</span>
            <span className="text-xs font-medium text-foreground">
              {stats.avgApprovalTimeHours < 1
                ? `${Math.round(stats.avgApprovalTimeHours * 60)}m`
                : `${stats.avgApprovalTimeHours.toFixed(1)}h`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

function RecentActivity({ activities, loading }: { activities: DashboardActivity[]; loading?: boolean }) {
  const getIcon = (type: DashboardActivity['type']) => {
    const map: Record<string, React.ReactNode> = {
      sale:      <TrendingUp className="w-3.5 h-3.5 text-red-500" />,
      purchase:  <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />,
      inventory: <PieChart className="w-3.5 h-3.5 text-purple-500" />,
      payment:   <DollarSign className="w-3.5 h-3.5 text-emerald-500" />,
      alert:     <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
      user:      <Users className="w-3.5 h-3.5 text-purple-500" />,
    };
    return map[type] || <FileText className="w-3.5 h-3.5 text-gray-500" />;
  };

  const getTypeBg = (type: DashboardActivity['type']) => {
    const map: Record<string, string> = {
      sale:      'bg-red-100 dark:bg-red-900/30',
      purchase:  'bg-blue-100 dark:bg-blue-900/30',
      inventory: 'bg-purple-100 dark:bg-purple-900/30',
      payment:   'bg-emerald-100 dark:bg-emerald-900/30',
      alert:     'bg-red-100 dark:bg-red-900/30',
      user:      'bg-purple-100 dark:bg-purple-900/30',
    };
    return map[type] || 'bg-gray-100 dark:bg-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="h-5 w-32 bg-muted rounded animate-pulse mb-3" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-foreground">Recent Activity</h3>
        <Link href="/fund-management" className="flex items-center gap-1 text-xs text-primary hover:underline">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No recent fund activity</p>
          </div>
        ) : activities.map((activity, idx) => (
          <div key={`${activity.type}-${activity.id}-${idx}`} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className={`p-1.5 rounded-full flex-shrink-0 ${getTypeBg(activity.type)}`}>
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{activity.title}</p>
              <p className="text-[10px] text-muted-foreground">{activity.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              {activity.amount && <p className="text-xs font-medium text-foreground">{activity.amount}</p>}
              <p className="text-[10px] text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ALERTS PANEL
// ============================================================================

function AlertsPanel({ alerts, loading }: { alerts: DashboardAlert[]; loading?: boolean }) {
  const router = useRouter();
  const actionAlerts = alerts.filter((a) => a.type !== 'success');

  const getAlertStyle = (type: DashboardAlert['type']) => {
    const map: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
      warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" /> },
      danger:  { bg: 'bg-red-50 dark:bg-red-950/30',     border: 'border-red-200 dark:border-red-800',     icon: <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" /> },
      info:    { bg: 'bg-blue-50 dark:bg-blue-950/30',    border: 'border-blue-200 dark:border-blue-800',   icon: <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" /> },
      success: { bg: 'bg-green-50 dark:bg-green-950/30',  border: 'border-green-200 dark:border-green-800', icon: <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> },
    };
    return map[type] || map.info;
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="h-5 w-40 bg-muted rounded animate-pulse mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse border" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-foreground">Alerts</h3>
        {actionAlerts.length > 0 && (
          <span className="px-2 py-0.5 text-[11px] font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full">
            {actionAlerts.length} active
          </span>
        )}
      </div>
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No alerts</p>
          </div>
        ) : alerts.map((alert) => {
          const style = getAlertStyle(alert.type);
          return (
            <div key={alert.id} className={`p-3 rounded-lg border ${style.bg} ${style.border}`}>
              <div className="flex items-start gap-2.5">
                {style.icon}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{alert.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{alert.message}</p>
                  {alert.action && (
                    <button
                      onClick={() => alert.actionUrl && router.push(alert.actionUrl)}
                      className="mt-1.5 text-[11px] font-medium text-primary hover:underline"
                    >
                      {alert.action} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FundManagementDashboard() {
  const { company, companyName, isLoading: contextLoading } = useCompanyContext();
  const user = useTenantStore((s) => s.user);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['fm-dashboard', company?.id],
    queryFn: () => dashboardApi.getFundManagementDashboard(),
  });

  const isLoading = dashboardLoading || contextLoading;

  const currentDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }, []);

  const userName = user?.name || 'User';

  return (
    <div className="space-y-5">
      {/* Welcome Hero */}
      <WelcomeHero
        userName={userName}
        companyName={dashboardData?.companyInfo?.displayName || dashboardData?.companyInfo?.name || companyName || 'Fund Manager'}
        businessType={dashboardData?.companyInfo?.businessType}
        currentDate={currentDate}
        loading={isLoading}
      />

      {/* AUM & Fund Stats */}
      {(() => {
        const aumStats = dashboardData?.aumStats || [];
        const aumCols = isLoading ? 4 : Math.min(Math.max(aumStats.length, 2), 4) as 2 | 3 | 4;
        return (
          <>
            <SectionHeader title="AUM & Financials" />
            <StatCardsGrid columns={aumCols}>
              {isLoading
                ? [1, 2, 3, 4].map((i) => <StatCard key={i} title="" value="" icon={Package} color={StatCardColors.green} loading />)
                : aumStats.map((stat, i) => <DashboardStatCard key={i} stat={stat} />)
              }
            </StatCardsGrid>
          </>
        );
      })()}

      {/* Operational Stats */}
      {(() => {
        const opStats = dashboardData?.operationalStats || [];
        const opCols = isLoading ? 4 : Math.min(Math.max(opStats.length, 2), 4) as 2 | 3 | 4;
        return (
          <>
            <SectionHeader title="Operations" />
            <StatCardsGrid columns={opCols}>
              {isLoading
                ? [1, 2, 3, 4].map((i) => <StatCard key={i} title="" value="" icon={Package} color={StatCardColors.indigo} loading />)
                : opStats.map((stat, i) => <DashboardStatCard key={i} stat={stat} />)
              }
            </StatCardsGrid>
          </>
        );
      })()}

      {/* Cash Position + Compliance + Approvals — equal 3-col */}
      <SectionHeader title="Position & Compliance" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <CashPositionCard
          cashPosition={dashboardData?.cashPosition ?? { totalBankBalance: 0, investeeOutstanding: 0, aum: 0, cashToAumPct: 0, cashBreached: false, banks: [] }}
          loading={isLoading}
        />
        <ComplianceSummaryCard
          summary={dashboardData?.complianceSummary || { totalRules: 0, passedChecks: 0, failedChecks: 0, breachCount: 0 }}
          loading={isLoading}
        />
        <PendingApprovalsCard loading={isLoading} />
      </div>

      {/* Activity + Alerts — 7:5 split */}
      <SectionHeader title="Activity" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <RecentActivity activities={dashboardData?.activities || []} loading={isLoading} />
        </div>
        <div className="lg:col-span-5">
          <AlertsPanel alerts={dashboardData?.alerts || []} loading={isLoading} />
        </div>
      </div>
    </div>
  );
}
