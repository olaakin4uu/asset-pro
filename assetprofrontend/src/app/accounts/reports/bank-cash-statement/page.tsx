'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Download,
  Printer,
  Calendar,
  ChevronDown,
  ChevronRight,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, ReportHeader } from '@/components/erp';
import { LoadingSpinner } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { accountsReportsApi } from '@/lib/api/accounts-reports';
import { extractErrorMessage, formatDate } from '@/lib/utils';
import { getCurrencySymbol } from '@/hooks';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/core';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Reports', href: '/accounts/reports' },
  { title: 'Bank/Cash Statement' },
];

function fmtAmt(amount: number, currencyCode: string): string {
  const sym = getCurrencySymbol(currencyCode);
  return `${sym}${Number((amount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BankCashStatementPage() {
  const router = useRouter();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear(), 0, 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expandedBanks, setExpandedBanks] = useState<Set<number>>(new Set());

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['bank-cash-statement', startDate, endDate],
    queryFn: () => accountsReportsApi.getBankCashStatement({ startDate, endDate }),
  });

  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load bank statement') : null;

  const toggleBank = (bankId: number) => {
    setExpandedBanks((prev) => {
      const next = new Set(prev);
      if (next.has(bankId)) next.delete(bankId);
      else next.add(bankId);
      return next;
    });
  };

  const expandAll = () => {
    if (data) setExpandedBanks(new Set(data.banks.map((b) => b.bankId)));
  };

  const collapseAll = () => setExpandedBanks(new Set());

  const pageActions = [
    { id: 'print', label: 'Print', icon: Printer, variant: 'default' as const, onClick: () => window.print() },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Building2}
        title="Bank/Cash Account Statement"
        description="Transaction details for all bank and cash accounts"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <ReportHeader reportTitle="Bank/Cash Account Statement" />

      {/* Filters */}
      <div className="rounded-xl border bg-card p-6 mb-6 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">From:</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">To:</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={expandAll} className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-muted">Expand All</button>
            <button onClick={collapseAll} className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-muted">Collapse All</button>
          </div>
        </div>
      </div>

      {isLoading && <LoadingSpinner fullPage />}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 text-red-700">{error}</div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <StatCardsGrid columns={3} className="mb-6">
            <StatCard
              title="Total Cash Position"
              value={fmtAmt(data.totalCashPositionBase, data.baseCurrency)}
              subtitle={`Converted to ${data.baseCurrency}`}
              icon={Wallet}
              color={StatCardColors.green}
            />
            <StatCard
              title="Bank Accounts"
              value={data.banks.length.toString()}
              icon={Building2}
              color={StatCardColors.blue}
            />
            <StatCard
              title="Period"
              value={`${formatDate(data.startDate)} - ${formatDate(data.endDate)}`}
              icon={Calendar}
              color={StatCardColors.purple}
            />
          </StatCardsGrid>

          {/* Bank Statements */}
          <div className="space-y-4">
            {data.banks.map((bank) => {
              const isExpanded = expandedBanks.has(bank.bankId);
              const isForeign = bank.currencyCode !== data.baseCurrency;

              return (
                <div key={bank.bankId} className="rounded-xl border bg-card overflow-hidden">
                  {/* Bank Header */}
                  <button
                    onClick={() => toggleBank(bank.bankId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{bank.bankName}</span>
                          <span className="text-xs font-mono text-muted-foreground">({bank.accountNumber})</span>
                          <span className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                            isForeign ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
                          )}>
                            {getCurrencySymbol(bank.currencyCode)} {bank.currencyCode}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{bank.institutionName} {bank.glCode ? `| GL: ${bank.glCode}` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold font-mono">{fmtAmt(bank.closingBalance, bank.currencyCode)}</div>
                      <div className="text-xs text-muted-foreground">{bank.transactions.length} transactions</div>
                    </div>
                  </button>

                  {/* Transactions Table */}
                  {isExpanded && (
                    <div className="border-t">
                      {/* Opening Balance */}
                      <div className="flex justify-between px-6 py-2 bg-muted/50 text-sm font-medium">
                        <span>Opening Balance</span>
                        <span className="font-mono">{fmtAmt(bank.openingBalance, bank.currencyCode)}</span>
                      </div>

                      {bank.transactions.length > 0 ? (
                        <table className="w-full text-sm">
                          <thead className="bg-muted/30 border-b">
                            <tr>
                              <th className="text-left px-4 py-2 text-xs font-medium">Date</th>
                              <th className="text-left px-4 py-2 text-xs font-medium">Entry #</th>
                              <th className="text-left px-4 py-2 text-xs font-medium">Reference</th>
                              <th className="text-left px-4 py-2 text-xs font-medium">Narration</th>
                              <th className="text-right px-4 py-2 text-xs font-medium">Debit</th>
                              <th className="text-right px-4 py-2 text-xs font-medium">Credit</th>
                              <th className="text-right px-4 py-2 text-xs font-medium">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {bank.transactions.map((txn, idx) => (
                              <tr key={idx} className="hover:bg-muted/20">
                                <td className="px-4 py-2 text-xs">{formatDate(txn.date)}</td>
                                <td className="px-4 py-2 font-mono text-xs text-primary">{txn.entryNumber}</td>
                                <td className="px-4 py-2 text-xs text-muted-foreground">{txn.reference || '-'}</td>
                                <td className="px-4 py-2 text-xs max-w-xs truncate">{txn.narration}</td>
                                <td className="px-4 py-2 text-right font-mono text-xs">
                                  {txn.debit > 0 ? (
                                    <span className="text-green-600">
                                      {fmtAmt(txn.debit, bank.currencyCode)}
                                      {txn.foreignDebit && txn.foreignCurrency && txn.foreignCurrency !== bank.currencyCode && (
                                        <span className="block text-[10px] text-muted-foreground">
                                          {fmtAmt(txn.foreignDebit, txn.foreignCurrency)} @ {txn.exchangeRate}
                                        </span>
                                      )}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-xs">
                                  {txn.credit > 0 ? (
                                    <span className="text-red-600">
                                      {fmtAmt(txn.credit, bank.currencyCode)}
                                      {txn.foreignCredit && txn.foreignCurrency && txn.foreignCurrency !== bank.currencyCode && (
                                        <span className="block text-[10px] text-muted-foreground">
                                          {fmtAmt(txn.foreignCredit, txn.foreignCurrency)} @ {txn.exchangeRate}
                                        </span>
                                      )}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-xs font-medium">{fmtAmt(txn.balance, bank.currencyCode)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2 bg-muted/50">
                            <tr className="font-semibold">
                              <td colSpan={4} className="px-4 py-2 text-sm">Closing Balance</td>
                              <td className="px-4 py-2 text-right font-mono text-sm text-green-600">{fmtAmt(bank.totalDebit, bank.currencyCode)}</td>
                              <td className="px-4 py-2 text-right font-mono text-sm text-red-600">{fmtAmt(bank.totalCredit, bank.currencyCode)}</td>
                              <td className="px-4 py-2 text-right font-mono text-sm">{fmtAmt(bank.closingBalance, bank.currencyCode)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      ) : (
                        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                          No transactions in this period
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total Cash Position Footer */}
          <div className="mt-6 rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cash Position (all banks converted to {data.baseCurrency})</p>
                <p className="text-2xl font-bold mt-1">{fmtAmt(data.totalCashPositionBase, data.baseCurrency)}</p>
              </div>
              <Wallet className="h-10 w-10 text-primary/30" />
            </div>
            {data.banks.some((b) => b.currencyCode !== data.baseCurrency) && (
              <div className="mt-3 pt-3 border-t border-primary/20">
                <p className="text-xs text-muted-foreground mb-2">Breakdown by currency:</p>
                <div className="flex flex-wrap gap-3">
                  {data.banks.map((b) => (
                    <div key={b.bankId} className="inline-flex items-center gap-1.5 text-xs">
                      <span className="font-medium">{b.bankName}:</span>
                      <span className="font-mono">{fmtAmt(b.closingBalance, b.currencyCode)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </TenantLayout>
  );
}
