'use client';

export const dynamic = 'force-dynamic';
import { extractErrorMessage } from '@/lib/utils';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PieChart, Download, Printer, Calendar, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, GitCompareArrows } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, ReportHeader } from '@/components/erp';
import { accountsReportsApi } from '@/lib/api/accounts-reports';
import { exportBalanceSheetCsv } from '@/lib/report-export';
import type { BalanceSheet, BalanceSheetSection } from '@/types/accounts-reports';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Reports', href: '/accounts/reports' },
  { title: 'Statement of Financial Position' },
];

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-muted-foreground">-</span>;
  const change = current - previous;
  const pct = previous !== 0 ? ((change / Math.abs(previous)) * 100) : 0;
  if (change === 0) return <span className="text-muted-foreground text-xs">0%</span>;
  const isPositive = change > 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function formatAmount(amount: number | null | undefined, currency: string): string {
  return `${currency} ${Number((amount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SectionBlock({
  title,
  section,
  previousSection,
  currency,
  showComparison,
  borderColor = 'border-primary',
  onAccountClick,
}: {
  title: string;
  section: BalanceSheetSection;
  previousSection?: BalanceSheetSection;
  currency: string;
  showComparison: boolean;
  borderColor?: string;
  onAccountClick?: (accountId: number) => void;
}) {
  if (!section.items || section.items.length === 0) return null;
  return (
    <div className="mb-1">
      <table className="w-full text-sm">
        <tbody>
          {section.items.map((item) => {
            const prevItem = previousSection?.items.find((p) => p.accountId === item.accountId);
            return (
              <tr
                key={item.accountId}
                className="hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                onClick={() => onAccountClick?.(item.accountId)}
                title={`View transactions for ${item.accountCode} - ${item.accountName}`}
              >
                <td className="py-1.5 pl-6 pr-2">
                  <span className="text-blue-600 hover:text-blue-800 text-xs font-mono mr-2 underline decoration-dotted">{item.accountCode}</span>
                  <span className="text-foreground">{item.accountName}</span>
                </td>
                <td className="py-1.5 text-right font-mono w-56 whitespace-nowrap pr-2 text-blue-600 hover:text-blue-800">
                  {formatAmount(item.balance, currency)}
                </td>
                {showComparison && (
                  <>
                    <td className="py-1.5 text-right font-mono text-muted-foreground w-56 whitespace-nowrap pr-2">
                      {prevItem ? formatAmount(prevItem.balance, currency) : '-'}
                    </td>
                    <td className="py-1.5 text-right w-20">
                      {prevItem ? <ChangeIndicator current={item.balance} previous={prevItem.balance} /> : '-'}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
          <tr className="font-semibold border-t">
            <td className="py-2 pl-4 text-foreground">{title}</td>
            <td className="py-2 text-right font-mono w-56 whitespace-nowrap pr-2">{formatAmount(section.subtotal, currency)}</td>
            {showComparison && (
              <>
                <td className="py-2 text-right font-mono text-muted-foreground w-56 whitespace-nowrap pr-2">
                  {previousSection ? formatAmount(previousSection.subtotal, currency) : '-'}
                </td>
                <td className="py-2 text-right w-20">
                  {previousSection ? <ChangeIndicator current={section.subtotal} previous={previousSection.subtotal} /> : '-'}
                </td>
              </>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function StatementOfFinancialPositionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const openAccountLedger = (accountId: number) => {
    const params = new URLSearchParams({ accountId: String(accountId) });
    if (asOfDate) {
      const startOfYear = new Date(asOfDate);
      startOfYear.setMonth(0, 1);
      params.set('startDate', startOfYear.toISOString().split('T')[0]);
      params.set('endDate', asOfDate);
    }
    router.push(`/accounts/reports/account-statements?${params.toString()}`);
  };

  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareDate, setCompareDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['balance-sheet', asOfDate],
    queryFn: () => accountsReportsApi.getBalanceSheet({ asOfDate }),
  });

  const { data: compareData, isLoading: compareLoading } = useQuery({
    queryKey: ['balance-sheet', compareDate],
    queryFn: () => accountsReportsApi.getBalanceSheet({ asOfDate: compareDate }),
    enabled: compareEnabled,
  });

  const error = queryError ? extractErrorMessage(queryError, 'Failed to load statement') : null;
  const loadData = () => { queryClient.invalidateQueries({ queryKey: ['balance-sheet'] }); };
  const handleExportPdf = () => { window.print(); };
  const handleExportExcel = () => { if (data) exportBalanceSheetCsv(data); };

  const pageActions = [
    { id: 'export-excel', label: 'Export CSV', icon: Download, variant: 'outline' as const, onClick: handleExportExcel },
    { id: 'print', label: 'Print', icon: Printer, variant: 'default' as const, onClick: handleExportPdf },
  ];

  const title = 'Statement of Financial Position';

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <PageHeader icon={PieChart} title={title} description="IFRS 18 Presentation" actions={pageActions} {...PageHeaderPresets.financial} />
        <div className="space-y-4">
          <div className="h-16 rounded-xl border bg-muted/50 animate-pulse" />
          <div className="h-96 rounded-xl border bg-muted/50 animate-pulse" />
        </div>
      </TenantLayout>
    );
  }

  if (error || !data) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <PageHeader icon={PieChart} title={title} description="IFRS 18 Presentation" actions={pageActions} {...PageHeaderPresets.financial} />
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error || 'Failed to load statement'}</p>
        </div>
      </TenantLayout>
    );
  }

  const showComparison = compareEnabled && !!compareData && !compareLoading;

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader icon={PieChart} title={title} description="IFRS 18 Presentation" actions={pageActions} {...PageHeaderPresets.financial} />

      <div className="report-print-root">

      {/* Report Header */}
      <ReportHeader
        reportTitle={title}
        subtitle={`As at ${new Date(data.asOfDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}${showComparison ? ` vs ${new Date(compareDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}`}
      />

      {/* Filters */}
      <div className="rounded-xl border bg-card p-6 mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div></div>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background" />
            <button onClick={loadData} className="px-4 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90">Update</button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 print:hidden">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={compareEnabled} onChange={(e) => setCompareEnabled(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
            <GitCompareArrows className="h-4 w-4" />
            <span>Compare with previous period</span>
          </label>
          {compareEnabled && (
            <input type="date" value={compareDate} onChange={(e) => setCompareDate(e.target.value)} className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background" />
          )}
        </div>

        <div className={cn('flex items-center gap-2 text-sm mt-4', data.isBalanced ? 'text-green-600' : 'text-red-600')}>
          {data.isBalanced ? (
            <><CheckCircle2 className="h-4 w-4" /><span>Statement is balanced (Assets = Equity + Liabilities)</span></>
          ) : (
            <><XCircle className="h-4 w-4" /><span>Statement is not balanced — review your entries</span></>
          )}
        </div>
      </div>

      {compareLoading && compareEnabled && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 p-3 mb-6 print:hidden">
          <p className="text-sm text-blue-600">Loading comparison data...</p>
        </div>
      )}

      {/* IFRS 18 Single-Column Presentation */}
      <div className="rounded-xl border bg-card overflow-hidden print:border-gray-300">

        {/* Column Headers */}
        <div className="bg-muted/50 border-b px-6 py-3">
          <div className="flex items-center">
            <div className="flex-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-56 whitespace-nowrap text-right pr-2">
              {new Date(data.asOfDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            {showComparison && (
              <>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-56 whitespace-nowrap text-right pr-2">
                  {new Date(compareDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20 text-right">Change</div>
              </>
            )}
          </div>
        </div>

        <div className="p-6 space-y-2">

          {/* ──────── ASSETS ──────── */}
          <div className="border-l-4 border-blue-500 pl-4 mb-4">
            <h3 className="text-base font-bold uppercase tracking-wide mb-2">Assets</h3>

            <div className="mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 pl-2">Non-Current Assets</h4>
              <SectionBlock title="Total Non-Current Assets" section={data.nonCurrentAssets} previousSection={compareData?.nonCurrentAssets} currency={data.currency} showComparison={showComparison} onAccountClick={openAccountLedger} />
            </div>

            <div className="mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 pl-2">Current Assets</h4>
              <SectionBlock title="Total Current Assets" section={data.currentAssets} previousSection={compareData?.currentAssets} currency={data.currency} showComparison={showComparison} onAccountClick={openAccountLedger} />
            </div>

            {/* Total Assets */}
            <div className="border-t-2 border-blue-500 pt-2">
              <div className="flex items-center font-bold text-base">
                <div className="flex-1">TOTAL ASSETS</div>
                <div className="font-mono w-56 whitespace-nowrap text-right pr-2">{formatAmount(data.totalAssets, data.currency)}</div>
                {showComparison && (
                  <>
                    <div className="font-mono text-muted-foreground w-56 whitespace-nowrap text-right pr-2">{formatAmount(compareData?.totalAssets, data.currency)}</div>
                    <div className="w-20 text-right"><ChangeIndicator current={data.totalAssets} previous={compareData?.totalAssets ?? 0} /></div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ──────── EQUITY ──────── */}
          <div className="border-l-4 border-emerald-500 pl-4 mb-4">
            <h3 className="text-base font-bold uppercase tracking-wide mb-2">Equity</h3>
            <SectionBlock title="Total Equity" section={data.equity} previousSection={compareData?.equity} currency={data.currency} showComparison={showComparison} onAccountClick={openAccountLedger} />
          </div>

          {/* ──────── LIABILITIES ──────── */}
          <div className="border-l-4 border-amber-500 pl-4 mb-4">
            <h3 className="text-base font-bold uppercase tracking-wide mb-2">Liabilities</h3>

            <div className="mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 pl-2">Non-Current Liabilities</h4>
              <SectionBlock title="Total Non-Current Liabilities" section={data.nonCurrentLiabilities} previousSection={compareData?.nonCurrentLiabilities} currency={data.currency} showComparison={showComparison} onAccountClick={openAccountLedger} />
            </div>

            <div className="mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 pl-2">Current Liabilities</h4>
              <SectionBlock title="Total Current Liabilities" section={data.currentLiabilities} previousSection={compareData?.currentLiabilities} currency={data.currency} showComparison={showComparison} onAccountClick={openAccountLedger} />
            </div>

            {/* Total Liabilities */}
            <div className="border-t border-amber-300 pt-2">
              <div className="flex items-center font-semibold">
                <div className="flex-1">Total Liabilities</div>
                <div className="font-mono w-56 whitespace-nowrap text-right pr-2">{formatAmount(data.totalLiabilities, data.currency)}</div>
                {showComparison && (
                  <>
                    <div className="font-mono text-muted-foreground w-56 whitespace-nowrap text-right pr-2">{formatAmount(compareData?.totalLiabilities, data.currency)}</div>
                    <div className="w-20 text-right"><ChangeIndicator current={data.totalLiabilities} previous={compareData?.totalLiabilities ?? 0} /></div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ──────── TOTAL EQUITY + LIABILITIES ──────── */}
          <div className="border-t-2 border-foreground pt-3 mt-4">
            <div className="flex items-center font-bold text-base">
              <div className="flex-1">TOTAL EQUITY AND LIABILITIES</div>
              <div className="font-mono w-56 whitespace-nowrap text-right pr-2">{formatAmount(data.totalLiabilitiesAndEquity, data.currency)}</div>
              {showComparison && (
                <>
                  <div className="font-mono text-muted-foreground w-56 whitespace-nowrap text-right pr-2">{formatAmount(compareData?.totalLiabilitiesAndEquity, data.currency)}</div>
                  <div className="w-20 text-right"><ChangeIndicator current={data.totalLiabilitiesAndEquity} previous={compareData?.totalLiabilitiesAndEquity ?? 0} /></div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      </div>{/* end report-print-root */}
    </TenantLayout>
  );
}
