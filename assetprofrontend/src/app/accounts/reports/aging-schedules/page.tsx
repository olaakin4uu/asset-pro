'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Download,
  Calendar,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  Users,
  TrendingDown,
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
  { title: 'Aging Schedules' },
];

interface AgingRow {
  id: number;
  name: string;
  accountCode: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90Plus: number;
  total: number;
}

export default function AgingSchedulesPage() {
  const router = useRouter();

  // Filters
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [agingType, setAgingType] = useState<'receivables' | 'payables'>('receivables');
  const [searchQuery, setSearchQuery] = useState('');

  // Load data via TanStack Query
  const { data: agingData = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['aging-schedules', asOfDate, agingType],
    queryFn: async () => {
      const asOf = new Date(asOfDate);

      // Load accounts based on type
      const accountResponse = await accountsApi.list({
        accountType: agingType === 'receivables' ? 'asset' : 'liability',
        isPosting: true,
        limit: 500,
      });
      const accountsList: Account[] = Array.isArray(accountResponse.data)
        ? accountResponse.data
        : Array.isArray(accountResponse) ? accountResponse as unknown as Account[] : [];

      // Filter to receivable/payable specific accounts
      const relevantAccounts = accountsList.filter((a) =>
        agingType === 'receivables'
          ? a.name.toLowerCase().includes('receivable') ||
            a.name.toLowerCase().includes('customer') ||
            a.name.toLowerCase().includes('debtor')
          : a.name.toLowerCase().includes('payable') ||
            a.name.toLowerCase().includes('supplier') ||
            a.name.toLowerCase().includes('creditor')
      );

      // Load posted journal entries
      const entriesResponse = await journalEntriesApi.list({
        status: 'posted',
        limit: 1000,
      });
      const entries: JournalEntry[] = entriesResponse.data || [];

      // Build aging rows
      const rows: AgingRow[] = relevantAccounts.map((account) => {
        const accountEntries = entries.filter(
          (entry) => entry.lines?.some((line) => line.accountId === account.id)
        );

        let current = 0;
        let days1to30 = 0;
        let days31to60 = 0;
        let days61to90 = 0;
        let days90Plus = 0;

        accountEntries.forEach((entry) => {
          const entryDate = new Date(entry.entryDate);
          const daysDiff = Math.floor(
            (asOf.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const entryLine = entry.lines?.find((l) => l.accountId === account.id);
          const amount =
            agingType === 'receivables'
              ? (entryLine?.debit || 0) - (entryLine?.credit || 0)
              : (entryLine?.credit || 0) - (entryLine?.debit || 0);

          if (daysDiff <= 0) current += amount;
          else if (daysDiff <= 30) days1to30 += amount;
          else if (daysDiff <= 60) days31to60 += amount;
          else if (daysDiff <= 90) days61to90 += amount;
          else days90Plus += amount;
        });

        const total = current + days1to30 + days31to60 + days61to90 + days90Plus;

        return {
          id: account.id,
          name: account.name,
          accountCode: account.code,
          current,
          days1to30,
          days31to60,
          days61to90,
          days90Plus,
          total,
        };
      }).filter((row) => row.total !== 0);

      return rows;
    },
  });

  const error = queryError ? extractErrorMessage(queryError, 'Failed to load aging schedules') : null;

  // Export handler
  const handleExport = () => {
    const csvRows = [
      [
        agingType === 'receivables' ? 'Customer' : 'Supplier',
        'Account Code',
        'Current',
        '1-30 Days',
        '31-60 Days',
        '61-90 Days',
        '90+ Days',
        'Total',
      ],
      ...filteredRows.map((row) => [
        row.name,
        row.accountCode,
        row.current.toString(),
        row.days1to30.toString(),
        row.days31to60.toString(),
        row.days61to90.toString(),
        row.days90Plus.toString(),
        row.total.toString(),
      ]),
    ];
    const csvContent = csvRows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aging-schedule-${agingType}-${asOfDate}.csv`;
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
      disabled: agingData.length === 0,
    },
  ];

  // Filter data
  const filteredRows = agingData.filter((row) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.name.toLowerCase().includes(query) || row.accountCode.toLowerCase().includes(query)
    );
  });

  // Summary calculations
  const totalOutstanding = filteredRows.reduce((sum, row) => sum + row.total, 0);
  const overdueAmount = filteredRows.reduce(
    (sum, row) => sum + row.days1to30 + row.days31to60 + row.days61to90 + row.days90Plus,
    0
  );
  const overdueAccounts = filteredRows.filter(
    (row) => row.days1to30 + row.days31to60 + row.days61to90 + row.days90Plus > 0
  ).length;

  // Aging distribution for progress bars
  const totalCurrent = filteredRows.reduce((sum, row) => sum + row.current, 0);
  const total1to30 = filteredRows.reduce((sum, row) => sum + row.days1to30, 0);
  const total31to60 = filteredRows.reduce((sum, row) => sum + row.days31to60, 0);
  const total61to90 = filteredRows.reduce((sum, row) => sum + row.days61to90, 0);
  const total90Plus = filteredRows.reduce((sum, row) => sum + row.days90Plus, 0);

  const getPercentage = (value: number) =>
    totalOutstanding > 0 ? ((value / totalOutstanding) * 100).toFixed(1) : '0.0';

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Clock}
        title="Aging Schedules"
        description="Customer and supplier aging analysis with credit risk assessment"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <ReportHeader reportTitle="Aging Schedules" subtitle="Customer and supplier aging analysis" />

      {/* Stats */}
      <StatCardsGrid columns={3} className="mb-6">
        <StatCard
          title="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          icon={DollarSign}
          color={StatCardColors.blue}
          loading={loading}
        />
        <StatCard
          title="Overdue Amount"
          value={formatCurrency(overdueAmount)}
          subtitle={`${overdueAccounts} overdue account${overdueAccounts !== 1 ? 's' : ''}`}
          icon={AlertTriangle}
          color={StatCardColors.red}
          loading={loading}
        />
        <StatCard
          title="Accounts"
          value={filteredRows.length}
          subtitle={`${overdueAccounts} with overdue balances`}
          icon={Users}
          color={StatCardColors.purple}
          loading={loading}
        />
      </StatCardsGrid>

      {/* Aging Distribution */}
      {!loading && totalOutstanding > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Aging Distribution</h3>
          <div className="space-y-3">
            {[
              { label: 'Current', value: totalCurrent, color: 'bg-green-500' },
              { label: '1-30 Days', value: total1to30, color: 'bg-yellow-500' },
              { label: '31-60 Days', value: total31to60, color: 'bg-orange-500' },
              { label: '61-90 Days', value: total61to90, color: 'bg-red-400' },
              { label: '90+ Days', value: total90Plus, color: 'bg-red-600' },
            ].map((bucket) => (
              <div key={bucket.label} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-24">{bucket.label}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${bucket.color}`}
                    style={{
                      width: `${Math.max(parseFloat(getPercentage(bucket.value)), 0)}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-mono text-gray-700 w-32 text-right">
                  {formatCurrency(bucket.value)}
                </span>
                <span className="text-xs text-gray-500 w-12 text-right">
                  {getPercentage(bucket.value)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* As of Date */}
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

            {/* Type Toggle */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <div className="flex rounded-md border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setAgingType('receivables')}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    agingType === 'receivables'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Receivables
                </button>
                <button
                  onClick={() => setAgingType('payables')}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    agingType === 'payables'
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
              placeholder={`Search ${agingType === 'receivables' ? 'customers' : 'suppliers'}...`}
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
                    {agingType === 'receivables' ? 'Customer' : 'Supplier'} Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Current
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    1-30 Days
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    31-60 Days
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    61-90 Days
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
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {row.name}
                      </td>
                      <td className="px-4 py-2">
                        <code className="text-xs font-mono text-gray-600">{row.accountCode}</code>
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-green-700">
                        {row.current !== 0 ? formatCurrency(row.current) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-yellow-700">
                        {row.days1to30 !== 0 ? formatCurrency(row.days1to30) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-orange-600">
                        {row.days31to60 !== 0 ? formatCurrency(row.days31to60) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-red-500">
                        {row.days61to90 !== 0 ? formatCurrency(row.days61to90) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono text-red-700 font-semibold">
                        {row.days90Plus !== 0 ? formatCurrency(row.days90Plus) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-mono font-bold text-gray-900">
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                      No aging data found for the selected criteria.
                    </td>
                  </tr>
                )}

                {/* Total Row */}
                {filteredRows.length > 0 && (
                  <tr className="bg-gray-900 text-white font-bold">
                    <td colSpan={2} className="px-4 py-3 text-sm">
                      TOTAL
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(totalCurrent)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(total1to30)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(total31to60)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(total61to90)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(total90Plus)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      {formatCurrency(totalOutstanding)}
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
