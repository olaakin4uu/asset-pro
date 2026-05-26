'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, ReportHeader } from '@/components/erp';
import { accountsApi } from '@/lib/api/accounts';
import { extractErrorMessage } from '@/lib/utils';
import {
  Building2,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { MultiSelect } from 'primereact/multiselect';
import { useCurrencyFormat } from '@/hooks';

const breadcrumbs = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Reports', href: '/accounts/reports' },
  { title: 'Consolidation Report' },
];

interface Company {
  id: number;
  name: string;
  code: string;
}

interface ConsolidationEntry {
  accountCode: string;
  accountName: string;
  companyBalances: { [companyId: number]: number };
  eliminations: number;
  consolidatedBalance: number;
  variancePercent: number;
}

interface ConsolidationReport {
  period: { startDate: Date; endDate: Date };
  companies: Company[];
  entries: ConsolidationEntry[];
  totalEliminations: number;
  totalConsolidated: number;
}

export default function ConsolidationReportPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<Date>(
    new Date(new Date().getFullYear(), 0, 1)
  );
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Report data
  const [report, setReport] = useState<ConsolidationReport | null>(null);

  // Load companies via TanStack Query
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['consolidation-companies'],
    queryFn: async () => {
      const data = await accountsApi.getCompanies();
      // Auto-select all companies on first load
      if (selectedCompanies.length === 0) {
        setSelectedCompanies(data.map((c: Company) => c.id));
      }
      return data as Company[];
    },
  });

  // Generate report mutation
  const generateMutation = useMutation({
    mutationFn: () => accountsApi.getConsolidationReport({
      companyIds: selectedCompanies,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
    onSuccess: (data) => {
      setReport(data);
      setError(null);
    },
    onError: (err: unknown) => {
      const msg = extractErrorMessage(err);
      // Avoid exposing internal API URLs in error messages
      setError(msg.includes('/api/') ? 'Consolidation report is not yet available. Please contact support.' : msg);
    },
  });

  const loading = companiesLoading || generateMutation.isPending;

  const generateReport = () => {
    generateMutation.mutate();
  };

  const exportToExcel = async () => {
    try {
      await accountsApi.exportConsolidationReport({
        companyIds: selectedCompanies,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        format: 'xlsx',
      });
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };
  const { formatCurrency } = useCurrencyFormat();
  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 5) return 'text-gray-600';
    return variance > 0 ? 'text-green-600' : 'text-red-600';
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
        icon={Building2}
        title="Consolidation Report"
        description="Multi-entity GL consolidation with inter-company eliminations"
        actions={pageActions}
      />

      <ReportHeader reportTitle="Consolidation Report" subtitle="Multi-entity GL consolidation" />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Report Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Companies
            </label>
            <MultiSelect
              value={selectedCompanies}
              onChange={(e) => setSelectedCompanies(e.value)}
              options={companies.map((c) => ({ label: c.name, value: c.id }))}
              placeholder="Select companies"
              display="chip"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <Calendar
              value={startDate}
              onChange={(e) => setStartDate(e.value as Date)}
              dateFormat="dd/mm/yy"
              showIcon
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <Calendar
              value={endDate}
              onChange={(e) => setEndDate(e.value as Date)}
              dateFormat="dd/mm/yy"
              showIcon
              className="w-full"
            />
          </div>
        </div>

        <div className="mt-4">
          <Button
            label="Generate Report"
            icon="pi pi-chart-bar"
            onClick={generateReport}
            loading={loading}
            disabled={selectedCompanies.length === 0}
          />
        </div>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Companies</span>
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {report.companies.length}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                Total Eliminations
              </span>
              <TrendingDown className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(report.totalEliminations)}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                Consolidated Balance
              </span>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(report.totalConsolidated)}
            </div>
          </div>
        </div>
      )}

      {/* Report Table */}
      {report && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Consolidated Balances</h3>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(report.period.startDate).toLocaleDateString()} -{' '}
              {new Date(report.period.endDate).toLocaleDateString()}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Account
                  </th>
                  {report.companies.map((company) => (
                    <th
                      key={company.id}
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                    >
                      {company.code}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Eliminations
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Consolidated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Variance %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.entries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {entry.accountCode}
                        </div>
                        <div className="text-sm text-gray-500">
                          {entry.accountName}
                        </div>
                      </div>
                    </td>
                    {report.companies.map((company) => (
                      <td
                        key={company.id}
                        className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900"
                      >
                        {formatCurrency(entry.companyBalances[company.id] || 0)}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-orange-600">
                      {formatCurrency(entry.eliminations)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(entry.consolidatedBalance)}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${getVarianceColor(
                        entry.variancePercent
                      )}`}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {Math.abs(entry.variancePercent) >= 5 && (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                        {entry.variancePercent.toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!report && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            No Report Generated
          </p>
          <p className="text-sm text-gray-600">
            Select companies and date range, then click "Generate Report"
          </p>
        </div>
      )}
    </TenantLayout>
  );
}
