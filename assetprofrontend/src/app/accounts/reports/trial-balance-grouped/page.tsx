'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, ReportHeader } from '@/components/erp';
import { accountsApi } from '@/lib/api/accounts';
import {extractErrorMessage, formatCurrency} from '@/lib/utils';
import {
  BarChart3,
  Download,
  Filter,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';

const breadcrumbs = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Reports', href: '/accounts/reports' },
  { title: 'Grouped Trial Balance' },
];

interface GroupedAccount {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

interface AccountGroup {
  groupName: string;
  accountType: string;
  accounts: GroupedAccount[];
  totalDebit: number;
  totalCredit: number;
  totalBalance: number;
}

interface TrialBalanceGrouped {
  asOfDate: string;
  companyName: string;
  groupedBy: string;
  sections: AccountGroup[];
  totals: { debit: number; credit: number; balance: number };
  isBalanced: boolean;
  generatedAt: string;
}

const groupingOptions = [
  { label: 'Group by Account Type', value: 'type' },
  { label: 'Group by Category', value: 'category' },
  { label: 'Group by Parent Account', value: 'parent' },
];

export default function GroupedTrialBalancePage() {
  const router = useRouter();

  const openAccountLedger = (accountId: number) => {
    const params = new URLSearchParams({ accountId: String(accountId) });
    const dateStr = asOfDate instanceof Date ? asOfDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const startOfYear = new Date(dateStr);
    startOfYear.setMonth(0, 1);
    params.set('startDate', startOfYear.toISOString().split('T')[0]);
    params.set('endDate', dateStr);
    router.push(`/accounts/reports/account-statements?${params.toString()}`);
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [groupBy, setGroupBy] = useState('type');

  // Report data
  const [report, setReport] = useState<TrialBalanceGrouped | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  useEffect(() => {
    generateReport();
  }, [asOfDate, groupBy]);

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await accountsApi.getGroupedTrialBalance({
        asOfDate: asOfDate.toISOString(),
        groupBy,
      });
      const typedData = data as unknown as TrialBalanceGrouped;
      setReport(typedData);
      // Expand all groups by default
      setExpandedGroups(new Set(typedData.sections.map((_: AccountGroup, i: number) => i)));
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const exportToExcel = async () => {
    try {
      await accountsApi.exportGroupedTrialBalance({
        asOfDate: asOfDate.toISOString(),
        groupBy,
        format: 'xlsx',
      });
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };

  const formatCurrency = (amount: number) => {
    return formatCurrency(amount);
  };

  const getGroupColor = (groupType: string) => {
    switch (groupType.toUpperCase()) {
      case 'ASSET':
        return 'bg-blue-50 border-blue-200';
      case 'LIABILITY':
        return 'bg-red-50 border-red-200';
      case 'EQUITY':
        return 'bg-purple-50 border-purple-200';
      case 'REVENUE':
        return 'bg-green-50 border-green-200';
      case 'EXPENSE':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const pageActions = [
    {
      id: 'export',
      label: 'Export Excel',
      icon: Download,
      variant: 'outline' as const,
      onClick: exportToExcel,
      disabled: !report,
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        {...PageHeaderPresets.financial}
        icon={BarChart3}
        title="Grouped Trial Balance"
        description="Trial balance grouped by account category/type with expandable groups"
        actions={pageActions}
      />

      <ReportHeader reportTitle="Grouped Trial Balance" subtitle={report ? `As of ${new Date(report.asOfDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : undefined} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Report Options</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              As Of Date
            </label>
            <Calendar
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.value as Date)}
              dateFormat="dd/mm/yy"
              showIcon
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group By
            </label>
            <Dropdown
              value={groupBy}
              onChange={(e) => setGroupBy(e.value)}
              options={groupingOptions}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Debits</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(report.totals.debit)}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Credits</span>
              <TrendingDown className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(report.totals.credit)}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Difference</span>
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(Math.abs(report.totals.balance))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Status</span>
            </div>
            <div className="text-2xl font-bold">
              {report.isBalanced ? (
                <span className="text-green-600">Balanced</span>
              ) : (
                <span className="text-red-600">Unbalanced</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grouped Trial Balance */}
      {report && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Trial Balance Groups</h3>
            <p className="text-sm text-gray-600 mt-1">
              As of {new Date(report.asOfDate).toLocaleDateString()}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Account
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Debit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Credit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.sections.map((group, sectionIdx) => {
                  const isExpanded = expandedGroups.has(sectionIdx);
                  return (
                    <React.Fragment key={sectionIdx}>
                      {/* Group Header */}
                      <tr
                        className={`border-t-2 border-gray-300 ${getGroupColor(
                          group.accountType
                        )} cursor-pointer hover:opacity-80`}
                        onClick={() => toggleGroup(sectionIdx)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            )}
                            <span className="font-bold text-gray-900">
                              {group.groupName}
                            </span>
                            <span className="text-xs text-gray-600 ml-2">
                              ({group.accounts.length} accounts)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          {formatCurrency(group.totalDebit)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          {formatCurrency(group.totalCredit)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          {formatCurrency(group.totalBalance)}
                        </td>
                      </tr>

                      {/* Group Accounts (if expanded) */}
                      {isExpanded &&
                        group.accounts.map((account, idx) => (
                          <tr
                            key={`${sectionIdx}-${idx}`}
                            className="border-b border-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                            onClick={() => openAccountLedger(account.accountId)}
                            title={`View transactions for ${account.accountCode} - ${account.accountName}`}
                          >
                            <td className="px-6 py-3 pl-16">
                              <div>
                                <div className="text-sm font-medium text-blue-600 hover:text-blue-800 underline decoration-dotted">
                                  {account.accountCode}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {account.accountName}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right text-sm text-blue-600 hover:text-blue-800">
                              {account.debit > 0
                                ? formatCurrency(account.debit)
                                : '-'}
                            </td>
                            <td className="px-6 py-3 text-right text-sm text-blue-600 hover:text-blue-800">
                              {account.credit > 0
                                ? formatCurrency(account.credit)
                                : '-'}
                            </td>
                            <td className="px-6 py-3 text-right text-sm text-blue-600 hover:text-blue-800">
                              {formatCurrency(account.balance)}
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}

                {/* Grand Totals */}
                <tr className="border-t-4 border-gray-900 bg-gray-100 font-bold">
                  <td className="px-6 py-4 text-gray-900">GRAND TOTAL</td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {formatCurrency(report.totals.debit)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {formatCurrency(report.totals.credit)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {formatCurrency(report.totals.balance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!report && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            No Report Generated
          </p>
          <p className="text-sm text-gray-600">
            Adjust filters to generate grouped trial balance
          </p>
        </div>
      )}
    </TenantLayout>
  );
}
