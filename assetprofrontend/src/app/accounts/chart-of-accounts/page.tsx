'use client';

import { Suspense, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Plus,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  RefreshCw,
  Upload,
  Printer,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, type PageHeaderAction, ErrorBanner, LoadingSpinner, DataTable } from '@/components/erp';
import { useDataTable, type DataTableColumn } from '@/hooks/useDataTable';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Menu } from 'primereact/menu';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { accountsApi, type Account, type AccountQuery } from '@/lib/api/accounts';
import { companiesApi } from '@/lib/api/core';
import { useEntityPermissions, useEntityDetail } from '@/hooks';
import { useCompanyContext } from '@/stores/company-context';
import { cn, extractErrorMessage } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/core';
import { AccountDetailViewer } from './components/AccountDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Chart of Accounts' },
];

const accountTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'asset', label: 'Assets' },
  { value: 'liability', label: 'Liabilities' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expenses' },
];

const accountTypeSeverity: Record<string, 'info' | 'danger' | 'success' | 'warning' | 'secondary' | null | undefined> = {
  asset: 'info',
  liability: 'danger',
  equity: 'secondary',
  revenue: 'success',
  expense: 'warning',
};

interface AccountTreeItem extends Account {
  children: AccountTreeItem[];
  expanded?: boolean;
  level: number;
}

// fetchDetail defined OUTSIDE component for stable reference
const fetchAccountDetail = (id: number) => accountsApi.get(id);

function buildAccountTree(accounts: Account[]): AccountTreeItem[] {
  const accountMap = new Map<number, AccountTreeItem>();
  const roots: AccountTreeItem[] = [];

  accounts.forEach(account => {
    accountMap.set(account.id, { ...account, children: [], level: 0 });
  });

  accounts.forEach(account => {
    const node = accountMap.get(account.id)!;
    if (account.parentId && accountMap.has(account.parentId)) {
      const parent = accountMap.get(account.parentId)!;
      parent.children.push(node);
      node.level = parent.level + 1;
    } else {
      roots.push(node);
    }
  });

  const sortByCode = (a: AccountTreeItem, b: AccountTreeItem) => a.code.localeCompare(b.code);
  roots.sort(sortByCode);
  const sortChildren = (items: AccountTreeItem[]) => {
    items.sort(sortByCode);
    items.forEach(item => sortChildren(item.children));
  };
  sortChildren(roots);
  return roots;
}

function flattenTree(items: AccountTreeItem[], expandedIds: Set<number>, result: AccountTreeItem[] = []): AccountTreeItem[] {
  items.forEach(item => {
    result.push(item);
    if (expandedIds.has(item.id) && item.children.length > 0) {
      flattenTree(item.children, expandedIds, result);
    }
  });
  return result;
}

export default function ChartOfAccountsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <ChartOfAccountsContent />
    </Suspense>
  );
}

// Cast type for useDataTable (needs Record<string, unknown>)
type AccountRow = AccountTreeItem & Record<string, unknown>;

const columns: DataTableColumn<AccountRow>[] = [
  {
    id: 'expand',
    header: '',
    width: '48px',
    sortable: false,
    hideable: false,
    export: { include: false },
  },
  {
    id: 'code',
    header: 'Code',
    accessorKey: 'code',
    sortable: true,
    width: '120px',
  },
  {
    id: 'name',
    header: 'Account Name',
    accessorKey: 'name',
    sortable: true,
  },
  {
    id: 'accountType',
    header: 'Type',
    accessorKey: 'accountType',
    sortable: true,
    width: '120px',
  },
  {
    id: 'isPosting',
    header: 'Posting',
    accessorKey: 'isPosting',
    align: 'center',
    sortable: false,
    width: '100px',
  },
  {
    id: 'isActive',
    header: 'Status',
    accessorKey: 'isActive',
    align: 'center',
    sortable: false,
    width: '100px',
  },
  {
    id: 'actions',
    header: '',
    width: '64px',
    sortable: false,
    hideable: false,
    export: { include: false },
  },
];

function computeLevels(accounts: Account[]): Map<number, number> {
  const levelMap = new Map<number, number>();
  const compute = (id: number): number => {
    if (levelMap.has(id)) return levelMap.get(id)!;
    const acc = accounts.find((a) => a.id === id);
    if (!acc || !acc.parentId) { levelMap.set(id, 0); return 0; }
    const level = compute(acc.parentId) + 1;
    levelMap.set(id, level);
    return level;
  };
  accounts.forEach((a) => compute(a.id));
  return levelMap;
}

function printCOA(accounts: Account[], company: Record<string, unknown>) {
  const levels = computeLevels(accounts);

  const typeOrder = ['asset', 'liability', 'equity', 'revenue', 'expense'];
  const sorted = [...accounts].sort((a, b) => {
    const ta = typeOrder.indexOf(a.accountType);
    const tb = typeOrder.indexOf(b.accountType);
    if (ta !== tb) return ta - tb;
    return a.code.localeCompare(b.code);
  });

  const typeLabel: Record<string, string> = {
    asset: 'Assets',
    liability: 'Liabilities',
    equity: 'Equity',
    revenue: 'Revenue',
    expense: 'Expenses',
  };

  let lastType = '';
  let rows = '';
  for (const acc of sorted) {
    if (acc.accountType !== lastType) {
      lastType = acc.accountType;
      rows += `<tr class="type-header"><td colspan="4">${typeLabel[acc.accountType] ?? acc.accountType}</td></tr>`;
    }
    const indent = `padding-left:${(levels.get(acc.id) ?? 0) * 16 + 4}px`;
    const inactive = !acc.isActive ? 'style="color:#999;text-decoration:line-through"' : '';
    rows += `
      <tr>
        <td><code>${acc.code}</code></td>
        <td style="${indent}" ${inactive}>${acc.name}</td>
        <td class="center">${acc.isPosting ? 'Yes' : 'No'}</td>
        <td class="center ${acc.isActive ? 'active' : 'inactive'}">${acc.isActive ? 'Active' : 'Inactive'}</td>
      </tr>`;
  }

  const name = (company.displayName || company.name || '') as string;
  const logoUrl = company.logoUrl as string | undefined;
  const addressParts = [company.address, company.city, company.state, company.country].filter(Boolean);
  const address = addressParts.join(', ');
  const tax = company.taxNumber ? `TIN: ${company.taxNumber}` : '';
  const rc = company.registrationNumber ? `RC: ${company.registrationNumber}` : '';
  const phone = company.phone ? `Tel: ${company.phone}` : '';
  const email = company.email ? `Email: ${company.email}` : '';
  const printDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="logo" style="max-height:64px;max-width:160px;object-fit:contain" />`
    : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Chart of Accounts — ${name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px 28px; }
  .company-header { display: flex; flex-direction: column; align-items: center; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; gap: 8px; }
  .company-info { }
  .company-name { font-size: 18px; font-weight: 700; color: #1e40af; }
  .company-meta { font-size: 10px; color: #555; margin-top: 4px; line-height: 1.6; }
  .report-title { text-align: center; font-size: 14px; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
  .report-date { text-align: center; font-size: 10px; color: #666; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e40af; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  th.center, td.center { text-align: center; }
  td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }
  tr:hover td { background: #f8faff; }
  tr.type-header td { background: #dbeafe; color: #1e3a8a; font-weight: 700; font-size: 11px; padding: 6px 8px; border-top: 1px solid #93c5fd; border-bottom: 1px solid #93c5fd; }
  code { font-family: monospace; font-size: 10px; }
  .active { color: #16a34a; font-weight: 600; }
  .inactive { color: #dc2626; }
  .footer { margin-top: 16px; font-size: 9px; color: #999; text-align: right; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  @media print { body { padding: 10px; } @page { margin: 12mm; size: A4 portrait; } }
</style></head><body>
<div class="company-header">
  ${logoHtml ? `<div>${logoHtml}</div>` : ''}
  <div class="company-info">
    <div class="company-name">${name}</div>
    <div class="company-meta">
      ${address ? `<div>${address}</div>` : ''}
      <div>${[phone, email].filter(Boolean).join(' &nbsp;|&nbsp; ')}</div>
      <div>${[tax, rc].filter(Boolean).join(' &nbsp;|&nbsp; ')}</div>
    </div>
  </div>
</div>
<div class="report-title">Chart of Accounts</div>
<div class="report-date">As at ${printDate} &nbsp;&mdash;&nbsp; ${sorted.length} accounts</div>
<table>
  <thead><tr>
    <th style="width:90px">Code</th>
    <th>Account Name</th>
    <th class="center" style="width:70px">Posting</th>
    <th class="center" style="width:70px">Status</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">Printed on ${new Date().toLocaleString()} &mdash; AssetPro</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

function ChartOfAccountsContent() {
  const router = useRouter();
  const { companyId } = useCompanyContext();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('accounts', 'chart-of-accounts');
  const menuRef = useRef<Menu>(null);
  const [menuItems, setMenuItems] = useState<Array<{ label?: string; icon?: string; command?: () => void; className?: string; separator?: boolean }>>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<string>('all');
  const [printing, setPrinting] = useState(false);

  const { data: accounts = [], isLoading: loading, refetch: fetchAccounts } = useQuery({
    queryKey: ['chart-of-accounts', accountType],
    queryFn: async () => {
      const query: AccountQuery = {
        accountType: accountType !== 'all' ? accountType : undefined,
        limit: 500,
      };
      const response = await accountsApi.list(query);
      return response.data;
    },
  });

  const treeAccounts = useMemo(() => buildAccountTree(accounts), [accounts]);

  // Flatten tree respecting expanded state — this is the data for the table
  const visibleAccounts = useMemo(
    () => flattenTree(treeAccounts, expandedIds) as AccountRow[],
    [treeAccounts, expandedIds]
  );

  // DataTable hook — search + pagination + sort + export, no selection
  const table = useDataTable<AccountRow>({
    data: visibleAccounts,
    columns,
    idKey: 'id',
    pagination: { pageSize: 50, pageSizeOptions: [10, 25, 50, 100, 200, 300, 500] },
    sort: false, // tree is already sorted by code
    selection: false,
    filters: { searchableColumns: ['code', 'name', 'accountType'] },
    columnSettings: {},
    export: { defaultFilename: 'chart-of-accounts' },
  });

  // Detail viewer
  const {
    selectedEntity: selectedAccount,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handleAccountSelect,
  } = useEntityDetail({
    basePath: '/accounts/chart-of-accounts',
    entities: accounts,
    fetchDetail: fetchAccountDetail,
    onError: (msg) => setError(msg),
  });

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleDelete = (account: Account) => {
    confirmDialog({
      message: `Are you sure you want to delete the account "${account.name}"? This action cannot be undone.`,
      header: 'Delete Account',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await accountsApi.delete(account.id);
          if (selectedAccount?.id === account.id) {
            closeDetail();
          }
          fetchAccounts();
        } catch (err) {
          setError(extractErrorMessage(err, 'Failed to delete account'));
        }
      },
    });
  };

  const getMenuItems = (account: Account) => {
    const items: Array<{ label?: string; icon?: string; command?: () => void; className?: string; separator?: boolean }> = [
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        command: () => openDetail(account.id),
      },
    ];

    if (canEdit) {
      items.push({
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => router.push(`/accounts/chart-of-accounts/${account.id}/edit`),
      });
    }

    if (canDelete) {
      items.push(
        { separator: true },
        {
          label: 'Delete',
          icon: 'pi pi-trash',
          className: 'text-red-600',
          command: () => handleDelete(account),
        }
      );
    }

    return items;
  };

  const handlePrint = useCallback(async () => {
    if (!companyId || printing) return;
    setPrinting(true);
    try {
      const allAccounts = await accountsApi.list({ limit: 1000 }).then((r) => r.data);
      const company = await companiesApi.get(companyId);
      printCOA(allAccounts, company as unknown as Record<string, unknown>);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to prepare print'));
    } finally {
      setPrinting(false);
    }
  }, [companyId, printing]);

  const actions: PageHeaderAction[] = [
    {
      id: 'refresh',
      label: 'Refresh',
      icon: RefreshCw,
      variant: 'outline',
      onClick: () => fetchAccounts(),
    },
    {
      id: 'print',
      label: printing ? 'Preparing...' : 'Print COA',
      icon: Printer,
      variant: 'outline' as const,
      onClick: handlePrint,
      disabled: printing,
      tooltip: 'Print Chart of Accounts with company details',
    },
    ...(canCreate ? [
      {
        id: 'import',
        label: 'Import',
        icon: Upload,
        variant: 'outline' as const,
        onClick: () => router.push('/accounts/chart-of-accounts/import'),
      },
      {
        id: 'add',
        label: 'New Account',
        icon: Plus,
        variant: 'default' as const,
        onClick: () => router.push('/accounts/chart-of-accounts/create'),
      },
    ] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      <Menu
        model={menuItems}
        popup
        ref={menuRef}
        id="account_context_menu"
      />
      <div className="space-y-6">
        <PageHeader
          {...PageHeaderPresets.financial}
          icon={BookOpen}
          title="Chart of Accounts"
          description="Manage your general ledger accounts structure"
          actions={actions}
        />

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <DataTable table={table}>
          {/* Toolbar: search + account type filter + expand/collapse + columns + export */}
          <DataTable.Toolbar
            showSearch
            searchPlaceholder="Search by code, name, or type..."
            showColumnToggle
            showExport
          >
            <Dropdown
              value={accountType}
              onChange={(e) => {
                setAccountType(e.value);
                table.pagination.firstPage();
              }}
              options={accountTypeOptions}
              optionLabel="label"
              optionValue="value"
              className="w-full md:w-48"
            />
          </DataTable.Toolbar>

          {/* Table */}
          <DataTable.Container aria-label="Chart of Accounts">
            <DataTable.Header>
              {table.columns.visibleColumns.map((col) => (
                <DataTable.ColumnHeader key={col.id} column={col} />
              ))}
            </DataTable.Header>

            <DataTable.Body<AccountRow>
              renderRow={(account, index, { focused, ref }) => (
                <DataTable.FocusableRow
                  key={account.id}
                  ref={ref}
                  focused={focused}
                  rowIndex={index}
                  selected={selectedAccount?.id === account.id}
                  onClick={() => openDetail(account.id)}
                  className="group"
                >
                  {/* Expand/Collapse */}
                  {table.columns.isColumnVisible('expand') && (
                    <DataTable.Cell>
                      <div style={{ paddingLeft: `${account.level * 20}px` }} className="flex items-center">
                        {account.children.length > 0 ? (
                          <button
                            className="p-1 rounded hover:bg-muted transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(account.id);
                            }}
                          >
                            {expandedIds.has(account.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <div className="w-6" />
                        )}
                      </div>
                    </DataTable.Cell>
                  )}

                  {/* Code */}
                  {table.columns.isColumnVisible('code') && (
                    <DataTable.Cell>
                      <code className="text-sm font-mono">{account.code}</code>
                    </DataTable.Cell>
                  )}

                  {/* Account Name */}
                  {table.columns.isColumnVisible('name') && (
                    <DataTable.Cell>
                      <div className="flex items-center gap-2">
                        {account.isPosting ? (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Folder className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={cn(!account.isActive && 'text-muted-foreground line-through')}>
                          {account.name}
                        </span>
                      </div>
                    </DataTable.Cell>
                  )}

                  {/* Type */}
                  {table.columns.isColumnVisible('accountType') && (
                    <DataTable.Cell>
                      <Tag
                        value={account.accountType}
                        severity={accountTypeSeverity[account.accountType]}
                        className="capitalize"
                      />
                    </DataTable.Cell>
                  )}

                  {/* Posting */}
                  {table.columns.isColumnVisible('isPosting') && (
                    <DataTable.Cell align="center">
                      <Tag
                        value={account.isPosting ? 'Yes' : 'No'}
                        severity={account.isPosting ? 'success' : 'secondary'}
                      />
                    </DataTable.Cell>
                  )}

                  {/* Status */}
                  {table.columns.isColumnVisible('isActive') && (
                    <DataTable.Cell align="center">
                      <Tag
                        value={account.isActive ? 'Active' : 'Inactive'}
                        severity={account.isActive ? 'success' : 'danger'}
                      />
                    </DataTable.Cell>
                  )}

                  {/* Actions */}
                  {table.columns.isColumnVisible('actions') && (
                    <DataTable.Cell>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Button
                          icon="pi pi-ellipsis-v"
                          rounded
                          text
                          severity="secondary"
                          size="small"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            setMenuItems(getMenuItems(account));
                            menuRef.current?.toggle(e);
                          }}
                        />
                      </div>
                    </DataTable.Cell>
                  )}
                </DataTable.FocusableRow>
              )}
              onRowClick={(row) => openDetail(row.id)}
              emptyMessage={loading ? 'Loading accounts...' : 'No accounts found. Create your first account to get started.'}
            />
          </DataTable.Container>

          {/* Pagination */}
          <DataTable.Pagination showPageSize showPageInfo showPageNumbers />
        </DataTable>
      </div>

      {/* Detail Viewer Panel */}
      {selectedAccount && (
        <AccountDetailViewer
          account={selectedAccount}
          accounts={accounts}
          onClose={closeDetail}
          onAccountSelect={handleAccountSelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
