'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  Download,
  Calendar,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  BookOpen,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, ReportHeader } from '@/components/erp';
import { StatCard, StatCardColors, StatCardsGrid } from '@/components/erp/StatCard';
import { accountsApi, reportsApi } from '@/lib/api/accounts';
import type { Account, GeneralLedgerReport } from '@/lib/api/accounts';
import { extractErrorMessage, formatCurrency, formatDate } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/core';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Reports', href: '/accounts/reports' },
  { title: 'Account Statements' },
];

export default function AccountStatementsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <AccountStatementsPage />
    </Suspense>
  );
}

function AccountStatementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Filters — initialize from URL params if present
  const [selectedAccountId, setSelectedAccountId] = useState<number | ''>(() => {
    const paramId = searchParams.get('accountId');
    return paramId ? Number(paramId) : '';
  });
  const [startDate, setStartDate] = useState(() => {
    const param = searchParams.get('startDate');
    if (param) return param;
    const date = new Date();
    date.setFullYear(date.getFullYear(), 0, 1); // Start of current year
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return searchParams.get('endDate') || new Date().toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Load accounts for dropdown via TanStack Query
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts-list-posting'],
    queryFn: async () => {
      const response = await accountsApi.list({ isPosting: true, limit: 1000 });
      const accountsList = response.data || response;
      return Array.isArray(accountsList) ? accountsList as Account[] : [];
    },
  });

  // Load report data via TanStack Query
  const { data: report, isLoading: loading, error: reportError } = useQuery({
    queryKey: ['account-statement', selectedAccountId, startDate, endDate],
    queryFn: () => reportsApi.getGeneralLedger(
      Number(selectedAccountId),
      startDate,
      endDate
    ),
    enabled: !!selectedAccountId,
  });

  const error = reportError ? extractErrorMessage(reportError, 'Failed to load account statement') : null;

  const loadReport = () => {
    if (!selectedAccountId) return;
    queryClient.invalidateQueries({ queryKey: ['account-statement', selectedAccountId, startDate, endDate] });
  };

  // Export handler
  const handleExport = () => {
    if (!report) return;
    const csvRows = [
      ['Date', 'Transaction No', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'],
      ...report.entries.map((entry) => [
        entry.date,
        entry.transactionNo,
        entry.reference || '',
        entry.narration,
        entry.debit?.toString() || '',
        entry.credit?.toString() || '',
        entry.balance.toString(),
      ]),
    ];
    const csvContent = csvRows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account-statement-${report.accountCode}-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Page actions
  const pageActions = [
    {
      id: 'export',
      label: 'Export CSV',
      icon: Download,
      variant: 'outline' as const,
      onClick: handleExport,
      disabled: !report,
    },
  ];

  // Filter entries based on search
  const filteredEntries = report?.entries.filter((entry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.transactionNo.toLowerCase().includes(query) ||
      (entry.reference || '').toLowerCase().includes(query) ||
      entry.narration.toLowerCase().includes(query)
    );
  });

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={FileText}
        title="Account Statements"
        description="Detailed account transaction history with running balances"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <ReportHeader reportTitle="Account Statements" subtitle="Detailed transaction history with running balances" />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Account Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GL Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={accountsLoading}
            >
              <option value="">Select an account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={loadReport}
              disabled={!selectedAccountId || loading}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {loading ? 'Loading...' : 'Generate Statement'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* No account selected */}
      {!selectedAccountId && !report && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Account</h3>
          <p className="text-sm text-gray-500">
            Choose a GL account and date range to generate the account statement.
          </p>
        </div>
      )}

      {/* Report Content */}
      {report && (
        <>
          {/* Stats */}
          <StatCardsGrid columns={4} className="mb-6">
            <StatCard
              title="Opening Balance"
              value={formatCurrency(report.openingBalance)}
              icon={DollarSign}
              color={StatCardColors.blue}
            />
            <StatCard
              title="Total Debits"
              value={formatCurrency(report.totalDebit)}
              icon={ArrowUpRight}
              color={StatCardColors.green}
            />
            <StatCard
              title="Total Credits"
              value={formatCurrency(report.totalCredit)}
              icon={ArrowDownRight}
              color={StatCardColors.red}
            />
            <StatCard
              title="Closing Balance"
              value={formatCurrency(report.closingBalance)}
              icon={DollarSign}
              color={StatCardColors.purple}
            />
          </StatCardsGrid>

          {/* Account Header */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {report.accountCode} - {report.accountName}
                </h2>
                <p className="text-sm text-gray-600 capitalize">
                  Type: {report.accountType} | Period: {formatDate(report.startDate)} to{' '}
                  {formatDate(report.endDate)}
                </p>
              </div>
              <div className="mt-2 md:mt-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Transaction No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Credit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Opening Balance Row */}
                  <tr className="bg-blue-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {formatDate(report.startDate)}
                    </td>
                    <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-blue-800">
                      Opening Balance
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-mono text-gray-900">-</td>
                    <td className="px-4 py-2 text-sm text-right font-mono text-gray-900">-</td>
                    <td className="px-4 py-2 text-sm text-right font-mono font-semibold text-blue-800">
                      {formatCurrency(report.openingBalance)}
                    </td>
                  </tr>

                  {/* Transaction Entries */}
                  {filteredEntries && filteredEntries.length > 0 ? (
                    filteredEntries.map((entry, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-4 py-2">
                          <code className="text-xs font-mono text-blue-600">
                            {entry.transactionNo}
                          </code>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {entry.reference || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {entry.narration}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-mono text-gray-900">
                          {entry.debit ? formatCurrency(entry.debit) : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-mono text-gray-900">
                          {entry.credit ? formatCurrency(entry.credit) : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-mono font-medium text-gray-900">
                          {formatCurrency(entry.balance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                        No transactions found for the selected period.
                      </td>
                    </tr>
                  )}

                  {/* Closing Balance Row */}
                  <tr className="bg-gray-900 text-white font-bold">
                    <td className="px-4 py-3 text-sm" />
                    <td colSpan={3} className="px-4 py-3 text-sm">
                      Closing Balance
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(report.totalDebit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(report.totalCredit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(report.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </TenantLayout>
  );
}
