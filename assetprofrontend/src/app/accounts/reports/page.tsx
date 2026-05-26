'use client';
import { extractErrorMessage, formatPercent } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Download,
  ArrowRight,
  Layers,
  Wallet,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { useQuery } from '@tanstack/react-query';
import { accountsReportsApi } from '@/lib/api/accounts-reports';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Financial Reports' },
];

function formatCurrency(value: number | null | undefined, currency = 'NGN'): string {
  const num = value ?? 0;
  const formatted = Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency} ${num < 0 ? '-' : ''}${formatted}`;
}

function formatFull(value: number | null | undefined, currency = 'NGN'): string {
  return `${currency} ${Number((value ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MetricCard({ label, value, subtitle, icon: Icon, color, trend }: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('rounded-lg p-2.5', color)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
            trend.value >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}>
            {trend.value >= 0 ? '+' : ''}{formatPercent(trend.value)}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight mb-0.5">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

function ReportCard({ title, description, icon: Icon, href, gradient }: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  gradient: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      className="rounded-xl border bg-card p-5 hover:shadow-lg hover:border-primary/30 transition-all text-left group relative overflow-hidden"
    >
      <div className={cn('absolute top-0 right-0 w-24 h-24 rounded-bl-[60px] opacity-10', gradient)} />
      <div className={cn('inline-flex p-2.5 rounded-lg mb-3', gradient.replace('bg-gradient-to-br', 'bg-gradient-to-r'))}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <h3 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        View Report <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
}

export default function FinancialReportsPage() {
  const router = useRouter();

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: reportData, isLoading: loading, error: fetchError, refetch } = useQuery({
    queryKey: ['accounts-reports-summary', startDate, endDate],
    queryFn: async () => {
      const [summaryData, metricsData] = await Promise.all([
        accountsReportsApi.getFinancialSummary({ startDate, endDate }),
        accountsReportsApi.getKeyMetrics({ startDate, endDate }),
      ]);
      return { summary: summaryData, metrics: metricsData };
    },
  });
  const summary = reportData?.summary ?? null;
  const metrics = reportData?.metrics ?? null;
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load financial data') : null;
  const currency = summary?.currency || 'NGN';

  const handleExport = async () => {
    try {
      const blob = await accountsReportsApi.exportToCsv('financial-summary', { startDate, endDate });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-summary-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const pageActions = [
    { id: 'export', label: 'Export', icon: Download, variant: 'outline' as const, onClick: handleExport },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={BarChart3}
        title="Financial Reports"
        description="Comprehensive financial reporting and analysis"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      {/* Period Selector */}
      <div className="rounded-xl border bg-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Period:</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background" />
          <span className="text-muted-foreground text-sm">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background" />
          <button onClick={() => refetch()} className="px-4 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors">
            Update
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl border bg-muted/50 animate-pulse" />)}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4 mb-6">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {summary && metrics && (
        <>
          {/* Profit & Loss Summary */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Profit & Loss</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Revenue"
                value={formatCurrency(summary.revenue, currency)}
                icon={TrendingUp}
                color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
              />
              <MetricCard
                label="Expenses"
                value={formatCurrency(summary.expenses, currency)}
                icon={TrendingDown}
                color="bg-red-100 dark:bg-red-900/30 text-red-600"
              />
              <MetricCard
                label="Net Profit"
                value={formatCurrency(summary.profit, currency)}
                subtitle={`Margin: ${formatPercent(summary.profitMargin ?? 0)}`}
                icon={DollarSign}
                color={(summary.profit ?? 0) >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}
              />
              <MetricCard
                label="Cash Position"
                value={formatCurrency(summary.cash, currency)}
                icon={Wallet}
                color="bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                trend={summary.cashChangePercentage ? { value: summary.cashChangePercentage, label: 'vs prior' } : undefined}
              />
            </div>
          </div>

          {/* Balance Sheet Summary */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Financial Position</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600"><Layers className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Assets</p>
                    <p className="text-xl font-bold">{formatFull(summary.assets, currency)}</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600"><TrendingDown className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Liabilities</p>
                    <p className="text-xl font-bold">{formatFull(summary.liabilities, currency)}</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${summary.assets ? Math.min(100, ((summary.liabilities ?? 0) / summary.assets) * 100) : 0}%` }} />
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-lg p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"><TrendingUp className="h-5 w-5" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Equity</p>
                    <p className="text-xl font-bold">{formatFull(summary.equity, currency)}</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${summary.assets ? Math.min(100, ((summary.equity ?? 0) / summary.assets) * 100) : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Key Ratios */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Key Ratios</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Current Ratio', value: Number(metrics.currentRatio ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), good: (metrics.currentRatio ?? 0) >= 1.5 },
                { label: 'Gross Margin', value: formatPercent(metrics.grossProfitMargin ?? 0), good: (metrics.grossProfitMargin ?? 0) > 0 },
                { label: 'Net Margin', value: formatPercent(metrics.netProfitMargin ?? 0), good: (metrics.netProfitMargin ?? 0) > 0 },
                { label: 'ROE', value: formatPercent(metrics.returnOnEquity ?? 0), good: (metrics.returnOnEquity ?? 0) > 0 },
                { label: 'ROA', value: formatPercent(metrics.returnOnAssets ?? 0), good: (metrics.returnOnAssets ?? 0) > 0 },
                { label: 'Debt/Equity', value: Number(metrics.debtToEquity ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), good: (metrics.debtToEquity ?? 0) <= 1 },
              ].map((ratio) => (
                <div key={ratio.label} className="rounded-xl border bg-card p-4 text-center">
                  <p className="text-2xl font-bold mb-1">{ratio.value}</p>
                  <p className="text-xs text-muted-foreground">{ratio.label}</p>
                  <div className={cn('mt-2 h-1 rounded-full', ratio.good ? 'bg-emerald-500' : 'bg-amber-500')} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Report Links */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Available Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ReportCard title="Internal Controls & Risk" description="Settings audit, GL gaps, inspections, credit risk, segregation of duties" icon={ShieldCheck} href="/accounts/reports/internal-controls" gradient="bg-gradient-to-br from-red-500 to-red-600" />
          <ReportCard title="Statement of Financial Position" description="Assets, Equity & Liabilities per IFRS 18" icon={PieChart} href="/accounts/reports/balance-sheet" gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
          <ReportCard title="Income Statement" description="Revenue, Expenses & Profitability for a period" icon={TrendingUp} href="/accounts/reports/income-statement" gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
          <ReportCard title="Trial Balance" description="Verification of all Debit and Credit balances" icon={BarChart3} href="/accounts/reports/trial-balance" gradient="bg-gradient-to-br from-purple-500 to-purple-600" />
          <ReportCard title="Grouped Trial Balance" description="Trial balance grouped by account category" icon={Layers} href="/accounts/reports/trial-balance-grouped" gradient="bg-gradient-to-br from-indigo-500 to-indigo-600" />
          <ReportCard title="Cash Flow Statement" description="Operating, Investing & Financing cash activities" icon={Activity} href="/accounts/reports/cash-flow" gradient="bg-gradient-to-br from-orange-500 to-orange-600" />
          <ReportCard title="Bank/Cash Statement" description="Transaction details for all bank and cash accounts" icon={Building2} href="/accounts/reports/bank-cash-statement" gradient="bg-gradient-to-br from-teal-500 to-teal-600" />
          <ReportCard title="Consolidated Reports" description="Multi-entity financial consolidation" icon={FileText} href="/accounts/reports/consolidation" gradient="bg-gradient-to-br from-cyan-500 to-cyan-600" />
        </div>
      </div>
    </TenantLayout>
  );
}
