'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  Download,
  Search,
  Filter,
  DollarSign,
  Users,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, ReportHeader } from '@/components/erp';
import { StatCard, StatCardColors, StatCardsGrid } from '@/components/erp/StatCard';
import { journalEntriesApi, accountsApi } from '@/lib/api/accounts';
import type { JournalEntry, Account } from '@/lib/api/accounts';
import { extractErrorMessage, formatCurrency, formatDate } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/core';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Reports', href: '/accounts/reports' },
  { title: 'Account Schedules' },
];

interface ScheduleRow {
  accountId: number;
  accountCode: string;
  accountName: string;
  counterparty: string;
  current: number;
  days30: number;
  days60: number;
  days90Plus: number;
  total: number;
}

export default function AccountSchedulesPage() {
  const router = useRouter();

  // Filters
  const [accountType, setAccountType] = useState<'receivable' | 'payable'>('receivable');
  const [searchQuery, setSearchQuery] = useState('');

  // Load data via TanStack Query
  const { data: scheduleData = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['account-schedules', accountType],
    queryFn: async () => {
      // Load accounts of the selected type
      const accountResponse = await accountsApi.list({
        accountType: accountType === 'receivable' ? 'asset' : 'liability',
        isPosting: true,
        limit: 500,
      });
      const accountsList: Account[] = Array.isArray(accountResponse.data)
        ? accountResponse.data
        : Array.isArray(accountResponse) ? accountResponse as unknown as Account[] : [];

      // Filter to receivable/payable accounts by name convention
      const filteredAccounts = accountsList.filter((a) =>
        accountType === 'receivable'
          ? a.name.toLowerCase().includes('receivable') || a.accountType === 'asset'
          : a.name.toLowerCase().includes('payable') || a.accountType === 'liability'
      );

      // Load journal entries for aging calculations
      const now = new Date();
      const entriesResponse = await journalEntriesApi.list({
        status: 'posted',
        limit: 1000,
      });
      const entries: JournalEntry[] = entriesResponse.data || [];

      // Build schedule rows from accounts with journal entry lines
      const rows: ScheduleRow[] = filteredAccounts.slice(0, 50).map((account) => {
        // Find entries affecting this account
        const accountEntries = entries.filter(
          (entry) => entry.lines?.some((line) => line.accountId === account.id)
        );

        let current = 0;
        let days30 = 0;
        let days60 = 0;
        let days90Plus = 0;

        accountEntries.forEach((entry) => {
          const entryDate = new Date(entry.entryDate);
          const daysDiff = Math.floor(
            (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const entryLine = entry.lines?.find((l) => l.accountId === account.id);
          const amount =
            accountType === 'receivable'
              ? (entryLine?.debit || 0) - (entryLine?.credit || 0)
              : (entryLine?.credit || 0) - (entryLine?.debit || 0);

          if (daysDiff <= 0) current += amount;
          else if (daysDiff <= 30) days30 += amount;
          else if (daysDiff <= 60) days60 += amount;
          else days90Plus += amount;
        });

        const total = current + days30 + days60 + days90Plus;

        return {
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          counterparty: account.description || account.name,
          current,
          days30,
          days60,
          days90Plus,
          total,
        };
      }).filter((row) => row.total !== 0);

      return rows;
    },
  });

  const error = queryError ? extractErrorMessage(queryError, 'Failed to load account schedules') : null;

  // Export handler
  const handleExport = () => {
    const csvRows = [
      [
        'Account Code',
        'Account Name',
        'Customer/Supplier',
        'Current',
        '30 Days',
        '60 Days',
        '90+ Days',
        'Total',
      ],
      ...filteredRows.map((row) => [
        row.accountCode,
        row.accountName,
        row.counterparty,
        row.current.toString(),
        row.days30.toString(),
        row.days60.toString(),
        row.days90Plus.toString(),
        row.total.toString(),
      ]),
    ];
    const csvContent = csvRows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account-schedules-${accountType}.csv`;
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
      disabled: scheduleData.length === 0,
    },
  ];

  // Filter data based on search
  const filteredRows = scheduleData.filter((row) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.accountCode.toLowerCase().includes(query) ||
      row.accountName.toLowerCase().includes(query) ||
      row.counterparty.toLowerCase().includes(query)
    );
  });

  // Summary calculations
  const totalCurrent = filteredRows.reduce((sum, row) => sum + row.current, 0);
  const totalDays30 = filteredRows.reduce((sum, row) => sum + row.days30, 0);
  const totalDays60 = filteredRows.reduce((sum, row) => sum + row.days60, 0);
  const totalDays90Plus = filteredRows.reduce((sum, row) => sum + row.days90Plus, 0);
  const grandTotal = filteredRows.reduce((sum, row) => sum + row.total, 0);

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={ClipboardList}
        title="Account Schedules"
        description="Receivables and payables aging analysis with outstanding balance tracking"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <ReportHeader reportTitle="Account Schedules" subtitle="Receivables and payables aging analysis" />

      {/* Stats */}
      <StatCardsGrid columns={4} className="mb-6">
        <StatCard
          title="Total Accounts"
          value={filteredRows.length}
          icon={Users}
          color={StatCardColors.blue}
          loading={loading}
        />
        <StatCard
          title="Current Outstanding"
          value={formatCurrency(totalCurrent)}
          icon={DollarSign}
          color={StatCardColors.green}
          loading={loading}
        />
        <StatCard
          title="Overdue (30+ Days)"
          value={formatCurrency(totalDays30 + totalDays60 + totalDays90Plus)}
          icon={Clock}
          color={StatCardColors.orange}
          loading={loading}
        />
        <StatCard
          title="Grand Total"
          value={formatCurrency(grandTotal)}
          icon={AlertTriangle}
          color={StatCardColors.purple}
          loading={loading}
        />
      </StatCardsGrid>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Account Type Toggle */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Type:</span>
              <div className="flex rounded-md border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setAccountType('receivable')}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    accountType === 'receivable'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Receivables
                </button>
                <button
                  onClick={() => setAccountType('payable')}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    accountType === 'payable'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Payables
                </button>
              </div>
            </div>
          </div>

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
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Account Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Account Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {accountType === 'receivable' ? 'Customer' : 'Supplier'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Current
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    30 Days
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    60 Days
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    90+ Days
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <tr key={row.accountId} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <code className="text-xs font-mono text-gray-600">{row.accountCode}</code>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{row.accountName}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{row.counterparty}</td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-gray-900">
                        {row.current !== 0 ? formatCurrency(row.current) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-gray-900">
                        {row.days30 !== 0 ? formatCurrency(row.days30) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-orange-600">
                        {row.days60 !== 0 ? formatCurrency(row.days60) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-red-600">
                        {row.days90Plus !== 0 ? formatCurrency(row.days90Plus) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono font-semibold text-gray-900">
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                      No {accountType === 'receivable' ? 'receivable' : 'payable'} accounts found.
                    </td>
                  </tr>
                )}

                {/* Summary Row */}
                {filteredRows.length > 0 && (
                  <tr className="bg-gray-900 text-white font-bold">
                    <td colSpan={3} className="px-4 py-3 text-sm">
                      TOTAL
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(totalCurrent)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(totalDays30)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(totalDays60)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(totalDays90Plus)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(grandTotal)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
