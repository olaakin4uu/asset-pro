'use client';

export const dynamic = 'force-dynamic';
import { extractErrorMessage } from '@/lib/utils';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Download, Printer, Calendar } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, ReportHeader } from '@/components/erp';
import { accountsReportsApi } from '@/lib/api/accounts-reports';
import { exportCashFlowCsv } from '@/lib/report-export';
import type { CashFlowStatement } from '@/types/accounts-reports';
import type { BreadcrumbItem } from '@/types/core';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Reports', href: '/accounts/reports' },
  { title: 'Cash Flow Statement' },
];

export default function CashFlowPage() {
  const queryClient = useQueryClient();

  // Date range state (default: current year)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(0, 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });

  // Load data via TanStack Query
  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['cash-flow', startDate, endDate],
    queryFn: () => accountsReportsApi.getCashFlow({ startDate, endDate }),
  });

  const error = queryError ? extractErrorMessage(queryError, 'Failed to load cash flow statement') : null;

  const loadData = () => {
    queryClient.invalidateQueries({ queryKey: ['cash-flow', startDate, endDate] });
  };

  // Export handlers
  const handleExportPdf = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (data) exportCashFlowCsv(data);
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

  // Loading state
  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <PageHeader
          icon={Activity}
          title="Cash Flow Statement"
          description="Statement of Cash Flows"
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
          icon={Activity}
          title="Cash Flow Statement"
          description="Statement of Cash Flows"
          actions={pageActions}
          {...PageHeaderPresets.financial}
        />
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Failed to load cash flow statement'}</p>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Activity}
        title="Cash Flow Statement"
        description="Statement of Cash Flows"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <div className="report-print-root">

      {/* Report Header */}
      <ReportHeader
        reportTitle="Cash Flow Statement"
        subtitle={`For the period ${new Date(data.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} to ${new Date(data.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      />

      {/* Filters */}
      <div className="bg-white dark:bg-card rounded-lg shadow-sm p-6 mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div></div>
          <div className="flex flex-wrap items-center gap-4 print:hidden">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
      </div>

      {/* Cash Flow Statement Layout */}
      <div className="bg-white rounded-lg shadow-sm p-6 print:shadow-none print:border print:border-gray-300">
        <div className="space-y-6">
          {/* Operating Activities Section */}
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
              Cash Flows from Operating Activities
            </h3>
            <div className="space-y-2">
              {data.operatingActivities.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm pl-4">
                  <span className="text-gray-700">{item.description}</span>
                  <span className={`font-mono ${item.amount >= 0 ? 'text-gray-900' : 'text-gray-900'}`}>
                    {item.amount >= 0 ? '' : '('}
                    {(data.currency || 'NGN')} {Math.abs(Number(item.amount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {item.amount >= 0 ? '' : ')'}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-sm border-t-2 border-gray-300 pt-2 mt-2">
                <span className="text-gray-900">Net Cash from Operating Activities</span>
                <span className={`font-mono ${data.operatingActivities.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.operatingActivities.total >= 0 ? '' : '('}
                  {(data.currency || 'NGN')} {Math.abs(Number(data.operatingActivities.total ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {data.operatingActivities.total >= 0 ? '' : ')'}
                </span>
              </div>
            </div>
          </div>

          {/* Investing Activities Section */}
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
              Cash Flows from Investing Activities
            </h3>
            <div className="space-y-2">
              {data.investingActivities.items.length > 0 ? (
                <>
                  {data.investingActivities.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm pl-4">
                      <span className="text-gray-700">{item.description}</span>
                      <span className={`font-mono ${item.amount >= 0 ? 'text-gray-900' : 'text-gray-900'}`}>
                        {item.amount >= 0 ? '' : '('}
                        {(data.currency || 'NGN')} {Math.abs(Number(item.amount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {item.amount >= 0 ? '' : ')'}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold text-sm border-t-2 border-gray-300 pt-2 mt-2">
                    <span className="text-gray-900">Net Cash from Investing Activities</span>
                    <span className={`font-mono ${data.investingActivities.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.investingActivities.total >= 0 ? '' : '('}
                      {(data.currency || 'NGN')} {Math.abs(Number(data.investingActivities.total ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {data.investingActivities.total >= 0 ? '' : ')'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 pl-4 italic">No investing activities for this period</p>
              )}
            </div>
          </div>

          {/* Financing Activities Section */}
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-600">
              Cash Flows from Financing Activities
            </h3>
            <div className="space-y-2">
              {data.financingActivities.items.length > 0 ? (
                <>
                  {data.financingActivities.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm pl-4">
                      <span className="text-gray-700">{item.description}</span>
                      <span className={`font-mono ${item.amount >= 0 ? 'text-gray-900' : 'text-gray-900'}`}>
                        {item.amount >= 0 ? '' : '('}
                        {(data.currency || 'NGN')} {Math.abs(Number(item.amount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {item.amount >= 0 ? '' : ')'}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold text-sm border-t-2 border-gray-300 pt-2 mt-2">
                    <span className="text-gray-900">Net Cash from Financing Activities</span>
                    <span className={`font-mono ${data.financingActivities.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.financingActivities.total >= 0 ? '' : '('}
                      {(data.currency || 'NGN')} {Math.abs(Number(data.financingActivities.total ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {data.financingActivities.total >= 0 ? '' : ')'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 pl-4 italic">No financing activities for this period</p>
              )}
            </div>
          </div>

          {/* Net Increase in Cash */}
          <div className="flex justify-between font-bold text-base border-t-2 border-gray-900 pt-3">
            <span className="text-gray-900">Net Increase/(Decrease) in Cash</span>
            <span className={`font-mono ${data.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.netCashFlow >= 0 ? '' : '('}
              {(data.currency || 'NGN')} {Math.abs(Number(data.netCashFlow ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {data.netCashFlow >= 0 ? '' : ')'}
            </span>
          </div>

          {/* Opening and Closing Cash */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Cash and Cash Equivalents at Beginning of Period</span>
              <span className="font-mono text-gray-900">
                {(data.currency || 'NGN')} {Number((data.openingCashBalance ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between font-bold text-base border-t-2 border-gray-900 pt-3 bg-gray-50 -mx-6 px-6 py-4">
              <span className="text-gray-900">Cash and Cash Equivalents at End of Period</span>
              <span className="font-mono text-blue-600">
                {(data.currency || 'NGN')} {Number((data.closingCashBalance ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      </div>{/* end report-print-root */}
    </TenantLayout>
  );
}
