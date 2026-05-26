'use client';

import { Building2 } from 'lucide-react';
import { ModuleLayout, type ModuleItem, type ModuleInfo } from '@/components/erp/ModuleLayout';

// ============================================================================
// MODULE CONFIGURATION
// ============================================================================

const moduleInfo: ModuleInfo = {
  name: 'Accounts',
  icon: Building2,
  description:
    'Complete financial accounting system with IFRS package integration, fiscal year management, year-end closing wizard, compound journals, and approval workflows',
  group: 'Accounting & Treasury',
};

// ============================================================================
// TRANSACTIONS SECTION - Main accounting operations
// ============================================================================

const transactions: ModuleItem[] = [
  {
    title: 'Journal Entries',
    href: '/accounts/journal-entries',
    description: 'Manage journal entries with IFRS integration and approval workflows',
  },
  {
    title: 'Create Journal Entry',
    href: '/accounts/journal-entries/create',
    description: 'Create new manual journal entries with compound transaction support',
  },
  {
    title: 'Create Currency + Exchange Rate',
    href: '/accounts/currencies/create',
    description: 'Quick setup: Create currency with instant exchange rate configuration',
  },
  {
    title: 'Expense Requests',
    href: '/accounts/expense-requests',
    description: 'Manage expense requests with multi-level approval workflow and payment processing',
  },
  {
    title: 'Create Expense Request',
    href: '/accounts/expense-requests/create',
    description: 'Submit new expense request memo with line items and WHT calculations',
  },
  {
    title: 'Misc Receipts',
    href: '/accounts/misc-receipts',
    description: 'Record miscellaneous bank receipts not linked to any customer — interest income, rent, one-off inflows',
  },
  {
    title: 'Bank Transfer',
    href: '/accounts/bank-transfers',
    description: 'Transfer funds between bank accounts',
  },
  {
    title: 'Bank Reconciliation',
    href: '/accounts/bank-reconciliation',
    description: 'Reconcile bank statements with system transactions and identify discrepancies',
  },
  // Coming Soon - Additional transaction types
  // {
  //   title: 'Bank Account Payments Entry',
  //   href: '/accounts/bank-payments',
  //   description: 'Record payments from bank accounts',
  // },
  // {
  //   title: 'Bank Account Receipts Entry',
  //   href: '/accounts/bank-receipts',
  //   description: 'Record receipts to bank accounts',
  // },
];

// ============================================================================
// REPORTS SECTION - Financial reports and inquiries
// ============================================================================

const reports: ModuleItem[] = [
  {
    title: 'Trial Balance',
    href: '/accounts/reports?tab=trial-balance',
    description: 'Chart of Accounts with Debit and Credit Balances - Validation & Analysis',
  },
  {
    title: 'Statement of Financial Position',
    href: '/accounts/reports/balance-sheet',
    description: 'Statement of Financial Position with Assets, Liabilities, and Equity',
  },
  {
    title: 'Income Statements',
    href: '/accounts/reports?tab=income-statement',
    description: 'Statement of Comprehensive Income with Revenue and Expense Analysis',
  },
  {
    title: 'Account Statements',
    href: '/accounts/reports/account-statements',
    description: 'Detailed Account Transaction History with Running Balances',
  },
  {
    title: 'Account Schedules',
    href: '/accounts/reports/account-schedules',
    description: 'Receivables and Payables Aging Analysis with Outstanding Balance Tracking',
  },
  {
    title: 'Aging Schedules',
    href: '/accounts/reports/aging-schedules',
    description: 'Customer and Supplier Aging Analysis with Credit Risk Assessment',
  },
  {
    title: 'Period Summary Report',
    href: '/accounts/fiscal-years',
    description: 'Fiscal period overview with transaction summaries and status',
  },
  // Coming Soon - Additional reports
  // {
  //   title: 'Account Inquiry',
  //   href: '/accounts/reports/account-inquiry',
  //   description: 'Detailed account transaction history',
  // },
  // {
  //   title: 'General Ledger Journal Inquiry',
  //   href: '/accounts/reports/gl-journal-inquiry',
  //   description: 'General ledger journal entries',
  // },
  // {
  //   title: 'Statement of Cash Flows',
  //   href: '/accounts/reports/cash-flows',
  //   description: 'Cash flow statement',
  // },
];

// ============================================================================
// MAINTENANCE SECTION - Account setup and configuration
// ============================================================================

const maintenance: ModuleItem[] = [
  {
    title: 'Chart of Accounts',
    href: '/accounts/chart-of-accounts',
    description: 'Manage your complete chart of accounts and general ledger',
  },
  {
    title: 'Opening Balances',
    href: '/accounts/opening-balances',
    description: 'Set up initial account balances for chart of accounts with automatic debit/credit classification',
  },
  {
    title: 'Currencies',
    href: '/accounts/currencies',
    description: 'Manage currencies with ISO 4217 compliance and instant exchange rate setup',
  },
  {
    title: 'Exchange Rates',
    href: '/accounts/exchange-rates',
    description: 'Manage foreign exchange rates with temporal validity periods',
  },
  {
    title: 'VAT Management',
    href: '/accounts/vat',
    description: 'Manage Value Added Tax rates with output/input VAT configuration and validity periods',
  },
  {
    title: 'WHT Management',
    href: '/accounts/wht',
    description: 'Manage Withholding Tax rates with Nigeria FIRS compliance and GL account mapping',
  },
  {
    title: 'Payment Methods',
    href: '/accounts/payment-methods',
    description: 'Configure payment methods, transaction fees, and banking integration',
  },
  {
    title: 'Banks',
    href: '/accounts/banks',
    description: 'Manage company bank accounts and authorizations',
  },
  {
    title: 'Fiscal Period Management',
    href: '/accounts/fiscal-years',
    description: 'Manage fiscal years, reporting periods, and year-end closing processes',
  },
  {
    title: 'Fiscal Year-End Wizard',
    href: '/accounts/fiscal-year-end',
    description: 'Complete year-end closing process with IFRS compliance and validations',
  },
  {
    title: 'Unposted Accounting Entries',
    href: '/accounts/unposted-entries',
    description: 'Review and repost failed accounting entries with error diagnostics and resolution tools',
  },
  {
    title: 'Accounts Settings',
    href: '/accounts/settings',
    description: 'Configure accounting module behaviour, including expense request approval workflow settings',
  },
  // Coming Soon - Additional maintenance features
  // {
  //   title: 'GL Budgets',
  //   href: '/accounts/budgets',
  //   description: 'Manage general ledger budgets',
  // },
  // {
  //   title: 'GL Tags',
  //   href: '/accounts/tags',
  //   description: 'Manage account tags and labels',
  // },
  // {
  //   title: 'Journal Templates',
  //   href: '/accounts/journal-templates',
  //   description: 'Maintain recurring journal entry templates',
  // },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AccountsPage() {
  return (
    <ModuleLayout
      module={moduleInfo}
      transactions={transactions}
      reports={reports}
      maintenance={maintenance}
      headerPreset="financial"
    />
  );
}
