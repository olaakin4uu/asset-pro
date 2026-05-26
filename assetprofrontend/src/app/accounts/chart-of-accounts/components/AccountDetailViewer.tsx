'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  FileText,
  Folder,
  Info,
  List,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  EntityDetailViewer,
  metadataTab,
} from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { Account, Category } from '@/lib/api/accounts';
import { accountsApi, categoriesApi } from '@/lib/api/accounts';
import {cn, extractErrorMessage, formatCurrency} from '@/lib/utils';
import { useCurrencyFormat } from '@/hooks';

// ============================================================================
// HELPER TYPES
// ============================================================================

interface AccountBalance {
  balance: number;
  debitTotal: number;
  creditTotal: number;
}

// Extended account that carries derived data for the detail viewer
export interface AccountWithDetail extends Account {
  _balance?: AccountBalance | null;
  _category?: Category | null;
  _parentAccount?: Account | null;
  _childAccounts?: Account[];
  _allAccounts?: Account[];
}

// ============================================================================
// ACCOUNT TYPE STYLES
// ============================================================================

const ACCOUNT_TYPE_STYLES: Record<string, string> = {
  asset: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  liability: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  equity: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  revenue: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expense: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const IFRS18_LABELS: Record<string, string> = {
  operating: 'Operating',
  investing: 'Investing',
  financing: 'Financing',
};

// ============================================================================
// CUSTOM RENDER: BALANCE SUMMARY
// ============================================================================

function BalanceSummary({ account }: { account: AccountWithDetail }) {
  const balance = account._balance;
  if (!balance) {
    return (
      <div className="text-sm text-muted-foreground">
        Balance information not available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="text-xl font-semibold">{formatCurrency(balance.balance)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Debits</p>
            <p className="text-xl font-semibold">{formatCurrency(balance.debitTotal)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
            <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Credits</p>
            <p className="text-xl font-semibold">{formatCurrency(balance.creditTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CUSTOM RENDER: SUB-ACCOUNTS TAB
// ============================================================================

function SubAccountsTab({
  account,
  onSelectAccount,
}: {
  account: AccountWithDetail;
  onSelectAccount?: (id: number) => void;
}) {
  const children = account._childAccounts ?? [];

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Folder className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No Sub-Accounts</p>
        <p className="text-sm mt-1">This account does not have any child accounts.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <table className="w-full">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 text-sm font-medium">Code</th>
            <th className="text-left px-4 py-3 text-sm font-medium">Name</th>
            <th className="text-left px-4 py-3 text-sm font-medium">Type</th>
            <th className="text-center px-4 py-3 text-sm font-medium">Posting</th>
            <th className="text-center px-4 py-3 text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {children.map((child) => (
            <tr
              key={child.id}
              className="hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onSelectAccount?.(child.id)}
            >
              <td className="px-4 py-3">
                <code className="text-sm font-mono">{child.code}</code>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {child.isPosting ? (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Folder className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={cn(!child.isActive && 'text-muted-foreground line-through')}>
                    {child.name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                    ACCOUNT_TYPE_STYLES[child.accountType] || 'bg-gray-100 text-gray-700'
                  )}
                >
                  {child.accountType}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    child.isPosting
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  )}
                >
                  {child.isPosting ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    child.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  )}
                >
                  {child.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// CUSTOM RENDER: TRANSACTIONS TAB
// ============================================================================

function TransactionsTab({ account }: { account: AccountWithDetail }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <DollarSign className="h-12 w-12 mb-4" />
      <p className="text-lg font-medium">Transaction Ledger</p>
      <p className="text-sm mt-1">
        View the general ledger for this account from the{' '}
        <a href="/accounts/reports" className="text-primary hover:underline">
          Reports
        </a>{' '}
        section.
      </p>
    </div>
  );
}

// ============================================================================
// CONFIG
// ============================================================================

export const accountDetailConfig: EntityDetailConfig<AccountWithDetail> = {
  entityType: 'accounts',
  basePath: '/accounts/chart-of-accounts',
  icon: BookOpen,
  title: (a) => a.name,
  subtitle: (a) =>
    `${a.code} - ${a.accountType.charAt(0).toUpperCase() + a.accountType.slice(1)} Account`,
  sidebar: {
    title: (a) => a.name,
    subtitle: (a) => a.code,
    searchKeys: ['title', 'subtitle'],
    badges: (a) => [
      {
        label: a.accountType,
        className: ACCOUNT_TYPE_STYLES[a.accountType] || 'bg-gray-100 text-gray-700',
      },
      ...(a.isActive
        ? []
        : [
            {
              label: 'Inactive',
              className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            },
          ]),
    ],
    statusIcon: (a) =>
      a.isPosting ? (
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <Folder className="h-3.5 w-3.5 text-muted-foreground" />
      ),
  },
  toolbar: {
    showExport: false,
    showShare: false,
    showPrint: false,
    showBookmark: false,
    showFavorite: false,
    showEdit: true,
    showDelete: true,
  },
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: Info,
      render: (a) => (
        <div className="space-y-6">
          {/* Balance Summary */}
          <BalanceSummary account={a} />

          {/* Account Information */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Account Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Account Code</p>
                    <div className="font-medium font-mono">{a.code}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Name</p>
                    <div className="font-medium">{a.name}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Type</p>
                    <div>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize',
                          ACCOUNT_TYPE_STYLES[a.accountType] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {a.accountType}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="flex items-center gap-2">
                      {a.isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                          a.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        )}
                      >
                        {a.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Posting Account</p>
                    <div>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                          a.isPosting
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        )}
                      >
                        {a.isPosting ? 'Yes (Posting)' : 'No (Group)'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Closing Rate</p>
                    <div>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                          a.closingRate
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        )}
                      >
                        {a.closingRate ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  {a.description && (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">Description</p>
                      <div className="font-medium">{a.description}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Classification */}
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Folder className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Classification</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Parent Account</p>
                    <div className="font-medium">
                      {a._parentAccount ? (
                        <span className="text-primary">
                          {a._parentAccount.code} - {a._parentAccount.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None (Top Level)</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <div className="font-medium">
                      {a._category ? (
                        a._category.name
                      ) : (
                        <span className="text-muted-foreground">Uncategorized</span>
                      )}
                    </div>
                  </div>
                  {a.ifrs18AccountType && (
                    <div>
                      <p className="text-sm text-muted-foreground">IFRS 18 Classification</p>
                      <div>
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {IFRS18_LABELS[a.ifrs18AccountType] || a.ifrs18AccountType}
                        </span>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Sub-Accounts</p>
                    <div className="font-medium">
                      {(a._childAccounts?.length ?? 0) > 0 ? (
                        <span>
                          {a._childAccounts!.length} sub-account
                          {a._childAccounts!.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No sub-accounts</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Sidebar */}
            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Quick Info</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      {a.isPosting ? (
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Folder className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Type</p>
                      <p className="font-medium capitalize">
                        {a.isPosting ? 'Posting' : 'Group'} / {a.accountType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <List className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sub-Accounts</p>
                      <p className="font-medium">{a._childAccounts?.length ?? 0}</p>
                    </div>
                  </div>
                  {a._balance && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Current Balance</p>
                        <p className="font-medium">{formatCurrency(a._balance.balance)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'children',
      label: 'Sub-Accounts',
      icon: List,
      badge: (a) => (a._childAccounts?.length || undefined),
      render: (a) => <SubAccountsTab account={a} />,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: DollarSign,
      render: (a) => <TransactionsTab account={a} />,
    },
    metadataTab<AccountWithDetail>(),
  ],
};

// ============================================================================
// DATA ENRICHMENT HOOK
// ============================================================================

export function useAccountDetailEnrichment(
  account: Account | null,
  allAccounts: Account[]
): AccountWithDetail | null {
  const [enriched, setEnriched] = useState<AccountWithDetail | null>(null);

  const enrich = useCallback(async () => {
    if (!account) {
      setEnriched(null);
      return;
    }

    // Derive children and parent from allAccounts list
    const childAccounts = allAccounts.filter((a) => a.parentId === account.id);
    const parentAccount = account.parentId
      ? allAccounts.find((a) => a.id === account.parentId) || null
      : null;

    // Build initial enriched object
    const base: AccountWithDetail = {
      ...account,
      _childAccounts: childAccounts,
      _parentAccount: parentAccount,
      _balance: null,
      _category: null,
    };
    setEnriched(base);

    // Fetch balance and category in parallel
    const promises: Promise<void>[] = [];

    promises.push(
      accountsApi
        .getBalance(account.id)
        .then((b) => {
          setEnriched((prev) => (prev && prev.id === account.id ? { ...prev, _balance: b } : prev));
        })
        .catch(() => {
          // Balance not available; keep null
        })
    );

    if (account.categoryId) {
      promises.push(
        categoriesApi
          .get(account.categoryId)
          .then((c) => {
            setEnriched((prev) =>
              prev && prev.id === account.id ? { ...prev, _category: c } : prev
            );
          })
          .catch(() => {
            // Category not available; keep null
          })
      );
    }

    await Promise.all(promises);
  }, [account, allAccounts]);

  useEffect(() => {
    enrich();
  }, [enrich]);

  return enriched;
}

// ============================================================================
// COMPONENT (thin wrapper)
// ============================================================================

interface AccountDetailViewerProps {
  account: Account;
  accounts: Account[];
  onClose: () => void;
  onAccountSelect: (account: Account) => void;
  onDelete: (account: Account) => void;
  loading?: boolean;
}

export function AccountDetailViewer({
  account,
  accounts,
  onClose,
  onAccountSelect,
  onDelete,
  loading,
}: AccountDetailViewerProps) {
  const enrichedAccount = useAccountDetailEnrichment(account, accounts);

  if (!enrichedAccount) {
    return null;
  }

  // Wrap accounts as AccountWithDetail for the sidebar
  const enrichedAccounts: AccountWithDetail[] = accounts.map((a) => ({
    ...a,
    _balance: null,
    _category: null,
    _parentAccount: null,
    _childAccounts: [],
  }));

  return (
    <EntityDetailViewer
      config={accountDetailConfig}
      entity={enrichedAccount}
      entities={enrichedAccounts}
      onClose={onClose}
      onEntitySelect={(ent) => {
        // Find original account from the accounts array
        const original = accounts.find((a) => a.id === ent.id);
        if (original) onAccountSelect(original);
      }}
      onDelete={(ent) => {
        const original = accounts.find((a) => a.id === ent.id);
        if (original) onDelete(original);
      }}
      loading={loading}
    />
  );
}
