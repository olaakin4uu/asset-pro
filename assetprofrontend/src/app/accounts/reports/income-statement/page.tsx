'use client';

export const dynamic = 'force-dynamic';
import { extractErrorMessage } from '@/lib/utils';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { TrendingUp, Download, Printer, Calendar, ArrowUpRight, ArrowDownRight, GitCompareArrows } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, ReportHeader } from '@/components/erp';
import { accountsReportsApi } from '@/lib/api/accounts-reports';
import { exportIncomeStatementCsv } from '@/lib/report-export';
import type { IncomeStatement, IncomeStatementSection } from '@/types/accounts-reports';
import type { BreadcrumbItem } from '@/types/core';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Reports', href: '/accounts/reports' },
  { title: 'Income Statement' },
];

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-gray-400">-</span>;
  const change = current - previous;
  const pct = previous !== 0 ? ((change / Math.abs(previous)) * 100) : 0;
  if (change === 0) return <span className="text-gray-500 text-xs">0%</span>;
  const isPositive = change > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function IncomeStatementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const openAccountLedger = (accountId: number) => {
    const params = new URLSearchParams({ accountId: String(accountId) });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    router.push(`/accounts/reports/account-statements?${params.toString()}`);
  };

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(0, 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareStartDate, setCompareStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    d.setMonth(0, 1);
    return d.toISOString().split('T')[0];
  });
  const [compareEndDate, setCompareEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });

  // Main report
  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['income-statement', startDate, endDate],
    queryFn: () => accountsReportsApi.getIncomeStatement({ startDate, endDate }),
  });

  // Comparison report
  const { data: compareData, isLoading: compareLoading } = useQuery({
    queryKey: ['income-statement', compareStartDate, compareEndDate],
    queryFn: () => accountsReportsApi.getIncomeStatement({ startDate: compareStartDate, endDate: compareEndDate }),
    enabled: compareEnabled,
  });

  const error = queryError ? extractErrorMessage(queryError, 'Failed to load income statement') : null;

  const loadData = () => {
    queryClient.invalidateQueries({ queryKey: ['income-statement'] });
  };

  const handleExportPdf = () => { window.print(); };
  const handleExportExcel = () => { if (data) exportIncomeStatementCsv(data); };

  const pageActions = [
    { id: 'export-excel', label: 'Export CSV', icon: Download, variant: 'outline' as const, onClick: handleExportExcel },
    { id: 'print', label: 'Print', icon: Printer, variant: 'default' as const, onClick: handleExportPdf },
  ];

  const showComparison = compareEnabled && compareData && !compareLoading;

  // Helper to render a section with comparison columns
  const renderSection = (
    title: string,
    currentSection: IncomeStatementSection,
    previousSection: IncomeStatementSection | undefined,
    currency: string,
    isExpense: boolean = false,
  ) => {
    if (currentSection.items.length === 0 && (!previousSection || previousSection.items.length === 0)) return null;
    return (
      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
        <table className="w-full text-sm">
          <tbody>
            {currentSection.items.map((item) => {
              const prevItem = previousSection?.items.find((p) => p.accountId === item.accountId);
              const displayAmount = isExpense ? -item.amount : item.amount;
              const prevDisplayAmount = prevItem ? (isExpense ? -prevItem.amount : prevItem.amount) : 0;
              return (
                <tr
                  key={item.accountId}
                  className="hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                  onClick={() => openAccountLedger(item.accountId)}
                  title={`View transactions for ${item.accountCode} - ${item.accountName}`}
                >
                  <td className="py-1 pl-4">
                    <span className="text-blue-600 hover:text-blue-800 text-xs font-mono mr-2 underline decoration-dotted">{item.accountCode}</span>
                    <span className="text-gray-700 dark:text-gray-300">{item.accountName}</span>
                  </td>
                  <td className="py-1 text-right font-mono text-blue-600 hover:text-blue-800 w-40">
                    {isExpense ? '(' : ''}{currency} {Number(item.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{isExpense ? ')' : ''}
                  </td>
                  {showComparison && (
                    <>
                      <td className="py-1 text-right font-mono text-gray-500 w-40">
                        {prevItem ? (
                          <>{isExpense ? '(' : ''}{currency} {Number(prevItem.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{isExpense ? ')' : ''}</>
                        ) : '-'}
                      </td>
                      <td className="py-1 text-right w-20">
                        {prevItem ? <ChangeIndicator current={displayAmount} previous={prevDisplayAmount} /> : '-'}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            <tr className="font-semibold border-t">
              <td className="py-2 text-gray-900 dark:text-gray-100">Total {title}</td>
              <td className={`py-2 text-right font-mono ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                {isExpense ? '(' : ''}{currency} {Number(currentSection.subtotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{isExpense ? ')' : ''}
              </td>
              {showComparison && (
                <>
                  <td className="py-2 text-right font-mono text-gray-500">
                    {previousSection ? (
                      <>{isExpense ? '(' : ''}{currency} {Number(previousSection.subtotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{isExpense ? ')' : ''}</>
                    ) : '-'}
                  </td>
                  <td className="py-2 text-right">
                    {previousSection ? (
                      <ChangeIndicator
                        current={isExpense ? -currentSection.subtotal : currentSection.subtotal}
                        previous={isExpense ? -previousSection.subtotal : previousSection.subtotal}
                      />
                    ) : '-'}
                  </td>
                </>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderTotalRow = (label: string, current: number, previous: number | undefined, currency: string, marginLabel?: string) => (
    <table className="w-full">
      <tbody>
        <tr className="font-bold text-base border-t-2 border-gray-300 dark:border-gray-600">
          <td className="py-3 text-gray-900 dark:text-gray-100">
            {label}
            {marginLabel && <span className="text-xs text-gray-500 ml-2 font-normal">({marginLabel})</span>}
          </td>
          <td className={`py-3 text-right font-mono w-40 ${current >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {currency} {current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          {showComparison && (
            <>
              <td className={`py-3 text-right font-mono w-40 text-gray-500`}>
                {previous !== undefined ? `${currency} ${previous.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
              </td>
              <td className="py-3 text-right w-20">
                {previous !== undefined ? <ChangeIndicator current={current} previous={previous} /> : '-'}
              </td>
            </>
          )}
        </tr>
      </tbody>
    </table>
  );

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <PageHeader icon={TrendingUp} title="Income Statement" description="Profit & Loss Statement" actions={pageActions} {...PageHeaderPresets.financial} />
        <div className="space-y-4">
          <div className="h-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
          <div className="h-96 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
        </div>
      </TenantLayout>
    );
  }

  if (error || !data) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <PageHeader icon={TrendingUp} title="Income Statement" description="Profit & Loss Statement" actions={pageActions} {...PageHeaderPresets.financial} />
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Failed to load income statement'}</p>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader icon={TrendingUp} title="Income Statement" description="Profit & Loss Statement" actions={pageActions} {...PageHeaderPresets.financial} />

      <div className="report-print-root">

      {/* Report Header */}
      <ReportHeader
        reportTitle="Income Statement (Profit & Loss)"
        subtitle={`For the period ${new Date(data.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} to ${new Date(data.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}${showComparison ? ` vs ${new Date(compareStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} to ${new Date(compareEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}`}
      />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div></div>
          <div className="flex flex-wrap items-center gap-4 print:hidden">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">From:</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">To:</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <button onClick={loadData}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              Update
            </button>
          </div>
        </div>

        {/* Comparison Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 print:hidden">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={compareEnabled} onChange={(e) => setCompareEnabled(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <GitCompareArrows className="h-4 w-4" />
            <span>Compare with previous period</span>
          </label>
          {compareEnabled && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Compare:</span>
              <input type="date" value={compareStartDate} onChange={(e) => setCompareStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
              <span className="text-sm text-gray-500">to</span>
              <input type="date" value={compareEndDate} onChange={(e) => setCompareEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100" />
            </div>
          )}
        </div>
      </div>

      {compareLoading && compareEnabled && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6 print:hidden">
          <p className="text-sm text-blue-700 dark:text-blue-300">Loading comparison data...</p>
        </div>
      )}

      {/* Column Headers (when comparing) */}
      {showComparison && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 print:hidden">
          <div className="flex items-center justify-end gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="w-40 text-right">Current Period</span>
            <span className="w-40 text-right">Previous Period</span>
            <span className="w-20 text-right">Change</span>
          </div>
        </div>
      )}

      {/* Income Statement Layout */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 print:border print:border-gray-300">
        <div className="space-y-6">
          {renderSection('Revenue', data.revenue, compareData?.revenue, data.currency)}
          {renderSection('Cost of Sales', data.costOfSales, compareData?.costOfSales, data.currency, true)}
          {renderTotalRow('Gross Profit', data.grossProfit, compareData?.grossProfit, data.currency, `${data.grossProfitMargin.toFixed(1)}% margin`)}
          {renderSection('Operating Expenses', data.operatingExpenses, compareData?.operatingExpenses, data.currency, true)}
          {renderTotalRow('Operating Profit (EBIT)', data.operatingProfit, compareData?.operatingProfit, data.currency, `${data.operatingProfitMargin.toFixed(1)}% margin`)}
          {renderSection('Other Income', data.otherIncome, compareData?.otherIncome, data.currency)}
          {renderSection('Other Expenses', data.otherExpenses, compareData?.otherExpenses, data.currency, true)}
          {renderTotalRow('Profit Before Tax (PBT)', data.profitBeforeTax, compareData?.profitBeforeTax, data.currency)}

          {/* Tax Expense Row */}
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 pl-4 text-gray-700 dark:text-gray-300">Tax Expense</td>
                <td className="py-1 text-right font-mono text-gray-900 dark:text-gray-100 w-40">
                  ({data.currency} {Number(data.taxExpense ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </td>
                {showComparison && (
                  <>
                    <td className="py-1 text-right font-mono text-gray-500 w-40">
                      ({data.currency} {Number(compareData.taxExpense ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </td>
                    <td className="py-1 text-right w-20">
                      <ChangeIndicator current={-data.taxExpense} previous={-compareData.taxExpense} />
                    </td>
                  </>
                )}
              </tr>
            </tbody>
          </table>

          {/* Net Profit */}
          <div className="bg-gray-50 dark:bg-gray-800 -mx-6 px-6 py-4">
            <table className="w-full">
              <tbody>
                <tr className="font-bold text-lg border-t-2 border-gray-900 dark:border-gray-100">
                  <td className="py-4 text-gray-900 dark:text-gray-100">
                    Net Profit (PAT)
                    <span className="text-xs text-gray-500 ml-2 font-normal">({data.netProfitMargin.toFixed(1)}% net margin)</span>
                  </td>
                  <td className={`py-4 text-right font-mono w-40 ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.currency} {Number(data.netProfit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {showComparison && (
                    <>
                      <td className={`py-4 text-right font-mono w-40 ${compareData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.currency} {Number(compareData.netProfit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-right w-20">
                        <ChangeIndicator current={data.netProfit} previous={compareData.netProfit} />
                      </td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      </div>{/* end report-print-root */}
    </TenantLayout>
  );
}
