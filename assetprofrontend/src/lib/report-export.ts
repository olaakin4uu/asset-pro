/**
 * Client-side report export utilities
 * Generates CSV files from financial report data
 */

import type {
  TrialBalance,
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
} from '@/types/accounts-reports';

function escapeCsvValue(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function exportTrialBalanceCsv(data: TrialBalance) {
  const rows: (string | number)[][] = [
    [data.companyName],
    ['Trial Balance'],
    [`As of ${data.asOfDate}`],
    [],
    ['Code', 'Account Name', 'Type', `Debit (${data.currency})`, `Credit (${data.currency})`],
  ];

  for (const group of data.groups) {
    if (group.items.length === 0) continue;
    rows.push([group.category, '', '', '', '']);
    for (const item of group.items) {
      rows.push([item.accountCode, item.accountName, item.accountType, item.debit || '', item.credit || '']);
    }
    rows.push([`${group.category} Subtotal`, '', '', group.debitTotal, group.creditTotal]);
    rows.push([]);
  }

  rows.push(['TOTAL', '', '', data.totalDebit, data.totalCredit]);
  if (!data.isBalanced) {
    rows.push(['Difference', '', '', Math.abs(data.totalDebit - data.totalCredit), '']);
  }

  downloadCsv(buildCsv(rows), `trial-balance-${data.asOfDate}.csv`);
}

export function exportBalanceSheetCsv(data: BalanceSheet) {
  const rows: (string | number)[][] = [
    [data.companyName],
    ['Balance Sheet'],
    [`As of ${data.asOfDate}`],
    [],
    ['Account Code', 'Account Name', `Amount (${data.currency})`],
    [],
    ['ASSETS', '', ''],
    [],
    ['Non-Current Assets', '', ''],
  ];

  for (const item of data.nonCurrentAssets.items) {
    rows.push([item.accountCode, item.accountName, item.balance]);
  }
  rows.push(['', 'Total Non-Current Assets', data.nonCurrentAssets.subtotal]);
  rows.push([]);
  rows.push(['Current Assets', '', '']);
  for (const item of data.currentAssets.items) {
    rows.push([item.accountCode, item.accountName, item.balance]);
  }
  rows.push(['', 'Total Current Assets', data.currentAssets.subtotal]);
  rows.push([]);
  rows.push(['', 'TOTAL ASSETS', data.totalAssets]);
  rows.push([]);
  rows.push(['LIABILITIES & EQUITY', '', '']);
  rows.push([]);
  rows.push(['Non-Current Liabilities', '', '']);
  for (const item of data.nonCurrentLiabilities.items) {
    rows.push([item.accountCode, item.accountName, item.balance]);
  }
  rows.push(['', 'Total Non-Current Liabilities', data.nonCurrentLiabilities.subtotal]);
  rows.push([]);
  rows.push(['Current Liabilities', '', '']);
  for (const item of data.currentLiabilities.items) {
    rows.push([item.accountCode, item.accountName, item.balance]);
  }
  rows.push(['', 'Total Current Liabilities', data.currentLiabilities.subtotal]);
  rows.push([]);
  rows.push(['', 'Total Liabilities', data.totalLiabilities]);
  rows.push([]);
  rows.push(['Equity', '', '']);
  for (const item of data.equity.items) {
    rows.push([item.accountCode, item.accountName, item.balance]);
  }
  rows.push(['', 'Total Equity', data.totalEquity]);
  rows.push([]);
  rows.push(['', 'TOTAL LIABILITIES & EQUITY', data.totalLiabilitiesAndEquity]);

  downloadCsv(buildCsv(rows), `balance-sheet-${data.asOfDate}.csv`);
}

export function exportIncomeStatementCsv(data: IncomeStatement) {
  const rows: (string | number)[][] = [
    [data.companyName],
    ['Income Statement (Profit & Loss)'],
    [`For the period ${data.startDate} to ${data.endDate}`],
    [],
    ['Account Code', 'Account Name', `Amount (${data.currency})`],
    [],
    ['Revenue', '', ''],
  ];

  for (const item of data.revenue.items) {
    rows.push([item.accountCode, item.accountName, item.amount]);
  }
  rows.push(['', 'Total Revenue', data.revenue.subtotal]);
  rows.push([]);
  rows.push(['Cost of Sales', '', '']);
  for (const item of data.costOfSales.items) {
    rows.push([item.accountCode, item.accountName, -item.amount]);
  }
  rows.push(['', 'Total Cost of Sales', -data.costOfSales.subtotal]);
  rows.push([]);
  rows.push(['', 'Gross Profit', data.grossProfit]);
  rows.push([]);
  rows.push(['Operating Expenses', '', '']);
  for (const item of data.operatingExpenses.items) {
    rows.push([item.accountCode, item.accountName, -item.amount]);
  }
  rows.push(['', 'Total Operating Expenses', -data.operatingExpenses.subtotal]);
  rows.push([]);
  rows.push(['', 'Operating Profit (EBIT)', data.operatingProfit]);

  if (data.otherIncome.items.length > 0) {
    rows.push([]);
    rows.push(['Other Income', '', '']);
    for (const item of data.otherIncome.items) {
      rows.push([item.accountCode, item.accountName, item.amount]);
    }
    rows.push(['', 'Total Other Income', data.otherIncome.subtotal]);
  }

  if (data.otherExpenses.items.length > 0) {
    rows.push([]);
    rows.push(['Other Expenses', '', '']);
    for (const item of data.otherExpenses.items) {
      rows.push([item.accountCode, item.accountName, -item.amount]);
    }
    rows.push(['', 'Total Other Expenses', -data.otherExpenses.subtotal]);
  }

  rows.push([]);
  rows.push(['', 'Profit Before Tax', data.profitBeforeTax]);
  rows.push(['', 'Tax Expense', -data.taxExpense]);
  rows.push([]);
  rows.push(['', 'NET PROFIT', data.netProfit]);

  downloadCsv(buildCsv(rows), `income-statement-${data.startDate}-to-${data.endDate}.csv`);
}

export function exportCashFlowCsv(data: CashFlowStatement) {
  const rows: (string | number)[][] = [
    [data.companyName],
    ['Cash Flow Statement'],
    [`For the period ${data.startDate} to ${data.endDate}`],
    [],
    ['Description', `Amount (${data.currency})`],
    [],
    ['Cash Flows from Operating Activities', ''],
  ];

  for (const item of data.operatingActivities.items) {
    rows.push([item.description, item.amount]);
  }
  rows.push(['Net Cash from Operating Activities', data.operatingActivities.total]);
  rows.push([]);
  rows.push(['Cash Flows from Investing Activities', '']);
  for (const item of data.investingActivities.items) {
    rows.push([item.description, item.amount]);
  }
  rows.push(['Net Cash from Investing Activities', data.investingActivities.total]);
  rows.push([]);
  rows.push(['Cash Flows from Financing Activities', '']);
  for (const item of data.financingActivities.items) {
    rows.push([item.description, item.amount]);
  }
  rows.push(['Net Cash from Financing Activities', data.financingActivities.total]);
  rows.push([]);
  rows.push(['Net Increase/(Decrease) in Cash', data.netCashFlow]);
  rows.push([]);
  rows.push(['Opening Cash Balance', data.openingCashBalance]);
  rows.push(['Closing Cash Balance', data.closingCashBalance]);

  downloadCsv(buildCsv(rows), `cash-flow-${data.startDate}-to-${data.endDate}.csv`);
}
