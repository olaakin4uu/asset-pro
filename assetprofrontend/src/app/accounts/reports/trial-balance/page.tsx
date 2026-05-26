'use client';

export const dynamic = 'force-dynamic';
import { extractErrorMessage } from '@/lib/utils';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { BarChart3, Download, Printer, Calendar, Search, CheckCircle2, XCircle } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, ReportHeader } from '@/components/erp';
import { accountsReportsApi } from '@/lib/api/accounts-reports';
import { exportTrialBalanceCsv } from '@/lib/report-export';
import type { TrialBalance } from '@/types/accounts-reports';
import type { BreadcrumbItem } from '@/types/core';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Reports', href: '/accounts/reports' },
  { title: 'Trial Balance' },
];

export default function TrialBalancePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters
  const [asOfDate, setAsOfDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  const [hideZeroBalances, setHideZeroBalances] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load data via TanStack Query
  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['trial-balance', asOfDate, hideZeroBalances],
    queryFn: () => accountsReportsApi.getTrialBalance({ asOfDate, hideZeroBalances }),
  });

  const error = queryError ? extractErrorMessage(queryError, 'Failed to load trial balance') : null;

  const loadData = () => {
    queryClient.invalidateQueries({ queryKey: ['trial-balance', asOfDate, hideZeroBalances] });
  };

  // Export handlers
  const handleExportPdf = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (data) exportTrialBalanceCsv(data);
  };

  // Page actions
  const pageActions = [
    {
      id: 'export-excel',
      label: 'Export Excel',
      icon: Download,
      variant: 'outline' as const,
      onClick: handleExportExcel,
    },
    {
      id: 'print',
      label: 'Print',
      icon: Printer,
      variant: 'default' as const,
      onClick: handleExportPdf,
    },
  ];

  // Filter groups based on search and zero balance toggle
  const filteredGroups = data?.groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      // Client-side zero balance filter
      if (hideZeroBalances) {
        const hasBalance = (item.debit ?? 0) !== 0 || (item.credit ?? 0) !== 0;
        if (!hasBalance) return false;
      }
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.accountCode.toLowerCase().includes(query) ||
        item.accountName.toLowerCase().includes(query) ||
        item.accountType.toLowerCase().includes(query)
      );
    }),
  }));

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

  // Loading state
  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <PageHeader
          icon={BarChart3}
          title="Trial Balance"
          description="Verification of Debit and Credit Balances"
          actions={pageActions}
          {...PageHeaderPresets.financial}
        />
        <div className="space-y-4">
          <div className="h-16 bg-gray-100 animate-pulse rounded-lg" />
          <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
        </div>
      </TenantLayout>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <PageHeader
          icon={BarChart3}
          title="Trial Balance"
          description="Verification of Debit and Credit Balances"
          actions={pageActions}
          {...PageHeaderPresets.financial}
        />
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Failed to load trial balance'}</p>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={BarChart3}
        title="Trial Balance"
        description="Verification of Debit and Credit Balances"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <div className="report-print-root">

      {/* Report Header */}
      <ReportHeader reportTitle="Trial Balance" subtitle={`As of ${new Date(data.asOfDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`} />

      {/* Filters */}
      <div className="bg-white dark:bg-card rounded-lg shadow-sm p-6 mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="print:hidden"></div>
          <div className="flex flex-wrap items-center gap-4 print:hidden">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">As of:</span>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadData}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Update
            </button>
          </div>
        </div>

        {/* Balance Validation & Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
          <div className={`flex items-center gap-2 text-sm ${data.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
            {data.isBalanced ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Trial Balance is balanced</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                <span>Trial Balance is not balanced - review your entries</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            {/* Hide Zero Balances Toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hideZeroBalances}
                onChange={(e) => setHideZeroBalances(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Hide zero balances</span>
            </label>
          </div>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden print:shadow-none print:border print:border-gray-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Account Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Debit ({data.currency})
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Credit ({data.currency})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredGroups?.map((group) => (
                <React.Fragment key={group.category}>
                  {/* Category Header */}
                  {group.items.length > 0 && (
                    <>
                      <tr className="bg-gray-100">
                        <td colSpan={5} className="px-4 py-2 font-semibold text-sm text-gray-900">
                          {group.category}
                        </td>
                      </tr>

                      {/* Category Items */}
                      {group.items.map((item) => (
                        <tr
                          key={item.accountId}
                          className="hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                          onClick={() => openAccountLedger(item.accountId)}
                          title={`View transactions for ${item.accountCode} - ${item.accountName}`}
                        >
                          <td className="px-4 py-2">
                            <code className="text-xs font-mono text-blue-600 hover:text-blue-800 underline decoration-dotted">{item.accountCode}</code>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.accountName}</td>
                          <td className="px-4 py-2 text-xs text-gray-600 capitalize">{item.accountType}</td>
                          <td className="px-4 py-2 text-sm text-right font-mono text-blue-600 hover:text-blue-800">
                            {item.debit > 0 ? item.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-mono text-blue-600 hover:text-blue-800">
                            {item.credit > 0 ? item.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </td>
                        </tr>
                      ))}

                      {/* Category Subtotals */}
                      <tr className="bg-gray-50 font-semibold text-sm">
                        <td colSpan={3} className="px-4 py-2 text-gray-700">
                          {group.category} Subtotal
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-gray-900 border-t border-gray-300">
                          {Number((group.debitTotal ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-gray-900 border-t border-gray-300">
                          {Number((group.creditTotal ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </>
                  )}
                </React.Fragment>
              ))}

              {/* Grand Totals */}
              <tr className="bg-gray-900 text-white font-bold">
                <td colSpan={3} className="px-4 py-3 text-base">
                  TOTAL
                </td>
                <td className="px-4 py-3 text-right font-mono text-base">
                  {Number((data.totalDebit ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right font-mono text-base">
                  {Number((data.totalCredit ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Balance Difference (if not balanced) */}
              {!data.isBalanced && (
                <tr className="bg-red-50">
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-red-800">
                    Difference (Out of Balance)
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-right font-mono text-sm font-semibold text-red-800">
                    {Math.abs((data.totalDebit ?? 0) - (data.totalCredit ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      </div>{/* end report-print-root */}
    </TenantLayout>
  );
}
