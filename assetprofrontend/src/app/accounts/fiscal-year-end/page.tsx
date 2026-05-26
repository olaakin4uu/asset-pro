'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Lock,
  ArrowRight,
  Shield,
  FileText,
  TrendingUp,
  Hash,
  ArrowLeft,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { StatCard, StatCardColors, StatCardsGrid } from '@/components/erp/StatCard';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fiscalYearsApi } from '@/lib/api/accounts';
import type { FiscalYear, YearEndChecklist, YearEndChecklistItem } from '@/lib/api/accounts';
import {extractErrorMessage, formatDate, formatCurrency} from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/core';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Fiscal Year-End Wizard' },
];

type WizardStep = 1 | 2 | 3;

export default function FiscalYearEndPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // State
  const [selectedYearId, setSelectedYearId] = useState<number | ''>('');
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [closing, setClosing] = useState(false);
  const [closeSuccess, setCloseSuccess] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [createOpeningBalances, setCreateOpeningBalances] = useState(true);
  const [closingNotes, setClosingNotes] = useState('');

  // Load fiscal years (open + adjusting)
  const { data: fiscalYearsData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['accounts-fiscal-years-closeable'],
    queryFn: async () => {
      const [openResponse, adjustingResponse] = await Promise.all([
        fiscalYearsApi.list({ status: 'open' }),
        fiscalYearsApi.list({ status: 'adjusting' }),
      ]);
      const openYears: FiscalYear[] = openResponse.data || [];
      const adjustingYears: FiscalYear[] = adjustingResponse.data || [];
      return [...openYears, ...adjustingYears];
    },
  });
  const fiscalYears = fiscalYearsData ?? [];
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load fiscal years') : null;

  const selectedYear = fiscalYears.find((fy) => fy.id === selectedYearId) || null;

  // Load real checklist from backend
  const {
    data: checklistData,
    isLoading: checklistLoading,
    error: checklistError,
    refetch: refetchChecklist,
  } = useQuery({
    queryKey: ['fiscal-year-checklist', selectedYearId],
    queryFn: () => fiscalYearsApi.getChecklist(Number(selectedYearId)),
    enabled: currentStep === 2 && !!selectedYearId,
  });

  const checklist: YearEndChecklistItem[] = checklistData?.checks ?? [];
  const summary = checklistData?.summary;

  // Handle step navigation
  const goToStep = (step: WizardStep) => {
    if (step === 2 && selectedYearId) {
      setCurrentStep(2);
    } else if (step === 3) {
      setCurrentStep(3);
    } else if (step === 1) {
      setCurrentStep(1);
      setCloseSuccess(false);
      setCloseError(null);
    }
  };

  // Handle close fiscal year
  const handleClose = async () => {
    if (!selectedYearId) return;

    try {
      setClosing(true);
      setCloseError(null);
      await fiscalYearsApi.close(Number(selectedYearId), createOpeningBalances, closingNotes || undefined);
      setCloseSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['accounts-fiscal-years-closeable'] });
    } catch (err: unknown) {
      setCloseError(extractErrorMessage(err, 'Failed to close fiscal year'));
    } finally {
      setClosing(false);
    }
  };

  const hasFailures = checklist.some((item) => item.status === 'fail');
  const hasWarnings = checklist.some((item) => item.status === 'warning');

  // Step indicator
  const steps = [
    { number: 1, label: 'Select Fiscal Year' },
    { number: 2, label: 'Review Checklist' },
    { number: 3, label: 'Confirm & Close' },
  ];

  


  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={CalendarCheck}
        title="Fiscal Year-End Wizard"
        description="Complete year-end closing process with IFRS compliance and validations"
        {...PageHeaderPresets.financial}
      />

      {/* Step Indicator */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    currentStep === step.number
                      ? 'bg-blue-600 text-white'
                      : currentStep > step.number
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  {currentStep > step.number ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`ml-3 text-sm font-medium hidden sm:block ${
                    currentStep === step.number
                      ? 'text-blue-600'
                      : currentStep > step.number
                        ? 'text-green-600'
                        : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="h-5 w-5 text-gray-300 mx-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Step 1: Select Fiscal Year */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Calendar className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Select Fiscal Year to Close
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose the fiscal year you want to close. Only open or adjusting fiscal years are
              shown.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : fiscalYears.length === 0 ? (
            <div className="text-center py-8">
              <Lock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No open fiscal years found.</p>
              <button
                onClick={() => router.push('/accounts/fiscal-years')}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Go to Fiscal Year Management
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {fiscalYears.map((fy) => (
                <label
                  key={fy.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedYearId === fy.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="fiscalYear"
                      value={fy.id}
                      checked={selectedYearId === fy.id}
                      onChange={() => setSelectedYearId(fy.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{fy.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(fy.startDate)} to {formatDate(fy.endDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        fy.status === 'open'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {fy.status}
                    </span>
                    {fy.isCurrent && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Current
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-8">
            <button
              onClick={() => goToStep(2)}
              disabled={!selectedYearId}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Review Checklist
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review Checklist */}
      {currentStep === 2 && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 text-center">
            <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Pre-Closing Checklist</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review the following validations before closing{' '}
              <strong>{selectedYear?.name}</strong>.
            </p>
          </div>

          {/* Summary Statistics */}
          {summary && (
            <StatCardsGrid>
              <StatCard
                icon={FileText}
                title="Total Entries"
                value={summary.totalEntries.toString()}
                color={StatCardColors.blue}
              />
              <StatCard
                icon={TrendingUp}
                title="Total Debit"
                value={formatCurrency(summary.totalDebit)}
                color={StatCardColors.green}
              />
              <StatCard
                icon={TrendingUp}
                title="Total Credit"
                value={formatCurrency(summary.totalCredit)}
                color={StatCardColors.purple}
              />
              <StatCard
                icon={Hash}
                title="TB Difference"
                value={formatCurrency(summary.trialBalanceDiff)}
                color={summary.trialBalanceDiff === 0 ? StatCardColors.green : StatCardColors.red}
              />
            </StatCardsGrid>
          )}

          {/* Fiscal Year Details */}
          {selectedYear && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Fiscal Year:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedYear.name}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
                    {selectedYear.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Start:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {formatDate(selectedYear.startDate)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">End:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {formatDate(selectedYear.endDate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Checklist Items */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Validation Results
                {checklistLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
              </h3>
            </div>

            {checklistLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : checklistError ? (
              <div className="p-6 text-center">
                <XCircle className="h-10 w-10 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {extractErrorMessage(checklistError, 'Failed to load checklist')}
                </p>
                <button
                  onClick={() => refetchChecklist()}
                  className="mt-3 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 px-6 py-4 ${
                      item.status === 'pass'
                        ? 'bg-green-50/50 dark:bg-green-900/10'
                        : item.status === 'fail'
                          ? 'bg-red-50/50 dark:bg-red-900/10'
                          : 'bg-yellow-50/50 dark:bg-yellow-900/10'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {item.status === 'pass' && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {item.status === 'fail' && <XCircle className="h-5 w-5 text-red-500" />}
                      {item.status === 'warning' && (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</p>
                      {item.detail && (
                        <p
                          className={`text-xs mt-1 font-medium ${
                            item.status === 'pass'
                              ? 'text-green-700 dark:text-green-400'
                              : item.status === 'fail'
                                ? 'text-red-700 dark:text-red-400'
                                : 'text-yellow-700 dark:text-yellow-400'
                          }`}
                        >
                          {item.detail}
                        </p>
                      )}
                    </div>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="flex-shrink-0 inline-flex items-center justify-center h-6 min-w-[24px] rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {item.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warnings/Failures */}
          {hasWarnings && !hasFailures && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  There are warnings. You can still proceed, but review the items above carefully.
                </p>
              </div>
            </div>
          )}

          {hasFailures && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-800 dark:text-red-300">
                  There are critical failures. Please resolve these issues before closing the fiscal
                  year.
                </p>
              </div>
            </div>
          )}

          {/* Year-End Guidelines */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Year-End Processing Guidelines</h4>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
              <li>Ensure all journal entries for the period have been posted</li>
              <li>Review and approve any pending adjusting entries</li>
              <li>Verify the trial balance is balanced (debits = credits)</li>
              <li>Close all reporting periods for the fiscal year</li>
              <li>Back up your data before proceeding with the close</li>
              <li>Opening balances for the next year will be created automatically if selected</li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => goToStep(1)}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => goToStep(3)}
              disabled={hasFailures || checklistLoading}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Confirm & Close
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm and Close */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
          {closeSuccess ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Fiscal Year Closed Successfully
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                <strong>{selectedYear?.name}</strong> has been closed.
                {createOpeningBalances &&
                  ' Opening balances have been created for the next fiscal year.'}
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => router.push('/accounts/fiscal-years')}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Go to Fiscal Years
                </button>
                <button
                  onClick={() => {
                    setCurrentStep(1);
                    setSelectedYearId('');
                    setCloseSuccess(false);
                    setCloseError(null);
                    queryClient.invalidateQueries({ queryKey: ['accounts-fiscal-years-closeable'] });
                  }}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Close Another Year
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirm Fiscal Year Close</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This action is irreversible. Please confirm you want to close this fiscal year.
                </p>
              </div>

              {/* Summary */}
              {selectedYear && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">You are about to close:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-red-600 dark:text-red-400">Fiscal Year:</span>
                      <span className="ml-2 font-medium text-red-900 dark:text-red-200">{selectedYear.name}</span>
                    </div>
                    <div>
                      <span className="text-red-600 dark:text-red-400">Period:</span>
                      <span className="ml-2 font-medium text-red-900 dark:text-red-200">
                        {formatDate(selectedYear.startDate)} - {formatDate(selectedYear.endDate)}
                      </span>
                    </div>
                  </div>
                  {summary && (
                    <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-700 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-red-600 dark:text-red-400">Total Entries:</span>
                        <span className="ml-2 font-medium text-red-900 dark:text-red-200">{summary.totalEntries}</span>
                      </div>
                      <div>
                        <span className="text-red-600 dark:text-red-400">TB Difference:</span>
                        <span className="ml-2 font-medium text-red-900 dark:text-red-200">{formatCurrency(summary.trialBalanceDiff)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Options */}
              <div className="space-y-4 mb-6">
                <label className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={createOpeningBalances}
                    onChange={(e) => setCreateOpeningBalances(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Create Opening Balances for Next Year
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Automatically create opening balance entries for the next fiscal year based on balance sheet account balances
                    </p>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Closing Notes (optional)
                  </label>
                  <textarea
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any notes about this fiscal year closing..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Close Error */}
              {closeError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-800 dark:text-red-300">{closeError}</p>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => goToStep(2)}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleClose}
                  disabled={closing}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {closing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Closing...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Close Fiscal Year
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </TenantLayout>
  );
}
