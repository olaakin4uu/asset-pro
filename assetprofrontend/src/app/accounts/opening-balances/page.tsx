'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calculator,
  Plus,
  Check,
  AlertCircle,
  DollarSign,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { ErrorBanner, LoadingSpinner } from '@/components/erp';;
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { openingBalancesApi } from '@/lib/api/accounts';
import { useEntityDetail, useEntityPermissions } from '@/hooks';
import type {
  OpeningBalance,
  OpeningBalanceSummary,
} from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import type { PageHeaderAction } from '@/components/erp/PageHeader';
import { cn, extractErrorMessage } from '@/lib/utils';
import { OpeningBalanceDetailViewer } from './components/OpeningBalanceDetailViewer';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Opening Balances' },
];

// ============================================================================
// CONSTANTS
// ============================================================================

const accountTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'asset', label: 'Assets' },
  { value: 'liability', label: 'Liabilities' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expenses' },
];

const periodOptions = [...Array(13)].map((_, i) => ({
  value: i,
  label: i === 0 ? 'Opening' : `Period ${i}`,
}));

const yearOptions = [...Array(10)].map((_, i) => {
  const year = new Date().getFullYear() - 5 + i;
  return { value: year, label: year.toString() };
});

const accountTypeSeverity: Record<string, 'info' | 'danger' | 'success' | 'warning' | 'secondary' | null | undefined> = {
  asset: 'info',
  liability: 'danger',
  equity: 'secondary',
  revenue: 'success',
  expense: 'warning',
};

// ============================================================================
// WRAPPER WITH SUSPENSE
// ============================================================================

export default function OpeningBalancesPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <OpeningBalancesListContent />
    </Suspense>
  );
}

// ============================================================================
// fetchDetail OUTSIDE the component
// ============================================================================

const fetchBalanceDetail = (id: number) => openingBalancesApi.get(id);

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

function OpeningBalancesListContent() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('accounts', 'opening-balances');

  // Data state
  const [balances, setBalances] = useState<OpeningBalance[]>([]);
  const [summary, setSummary] = useState<OpeningBalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('');

  // Import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importingOB, setImportingOB] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; totalDebit: number; totalCredit: number; difference: number; errors: string[] } | null>(null);

  // Detail viewer state - powered by useEntityDetail hook
  const {
    selectedEntity: selectedBalance,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handleBalanceSelect,
  } = useEntityDetail({
    basePath: '/accounts/opening-balances',
    entities: balances,
    fetchDetail: fetchBalanceDetail,
    onError: (msg) => setError(msg),
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await openingBalancesApi.list({
        year: selectedYear,
        period: selectedPeriod,
        accountType: accountTypeFilter || undefined,
      });

      setBalances(response.data);
      setSummary(response.summary);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to load opening balances'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedPeriod, accountTypeFilter]);

  // Filter balances by search
  const filteredBalances = balances.filter(
    (balance) =>
      !searchTerm ||
      balance.accountCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      balance.accountName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Handle delete
  const handleDelete = (balance: OpeningBalance) => {
    confirmDialog({
      message: `Are you sure you want to delete the opening balance for "${balance.accountCode} - ${balance.accountName}"? This action cannot be undone.`,
      header: 'Delete Opening Balance',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await openingBalancesApi.delete(balance.id);
          if (selectedBalance?.id === balance.id) {
            closeDetail();
          }
          loadData();
        } catch (err: unknown) {
          setError(extractErrorMessage(err, 'Failed to delete opening balance'));
        }
      },
    });
  };

  // Download CSV template
  const handleDownloadTemplate = async () => {
    try {
      const template = await openingBalancesApi.getImportTemplate();
      const csvRows = [
        template.headers.join(','),
        ...template.accounts.map((a) =>
          [a.code, `"${a.name}"`, a.accountType, a.normalBalance, '', ''].join(',')
        ),
      ];
      const instructions = template.instructions.map((i) => `# ${i}`).join('\n');
      const csv = instructions + '\n' + csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opening_balances_template_${selectedYear}_P${selectedPeriod}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to download template'));
    }
  };

  // Parse CSV and import
  const handleImportOB = async () => {
    if (!importFile) return;
    setImportingOB(true);
    setImportResult(null);
    try {
      const text = await importFile.text();
      const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
      if (lines.length < 2) {
        setError('CSV file must have a header row and at least one data row');
        setImportingOB(false);
        return;
      }
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        return {
          accountCode: cols[0] || '',
          debit: parseFloat(cols[4]) || 0,
          credit: parseFloat(cols[5]) || 0,
        };
      }).filter((r) => r.accountCode && (r.debit > 0 || r.credit > 0));

      const result = await openingBalancesApi.importBalances({
        year: selectedYear,
        period: selectedPeriod,
        rows,
      });

      setImportResult(result);
      if (result.imported > 0) {
        loadData();
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Import failed'));
    } finally {
      setImportingOB(false);
    }
  };

  // Page actions
  const pageActions: PageHeaderAction[] = [
    {
      id: 'refresh',
      label: 'Refresh',
      icon: RefreshCw,
      variant: 'outline',
      onClick: loadData,
    },
    ...(canCreate ? [
      {
        id: 'import',
        label: 'Import CSV',
        icon: FileSpreadsheet,
        variant: 'outline' as const,
        onClick: () => setShowImportDialog(true),
      },
      {
        id: 'add',
        label: 'Add Balances',
        icon: Plus,
        variant: 'default' as const,
        onClick: () =>
          router.push(
            `/accounts/opening-balances/create?year=${selectedYear}&period=${selectedPeriod}`,
          ),
      },
    ] : []),
  ];

  // Table templates
  const accountCodeTemplate = (rowData: OpeningBalance) => (
    <code className="text-sm font-mono">{rowData.accountCode}</code>
  );

  const accountTypeTemplate = (rowData: OpeningBalance) => (
    <Tag
      value={rowData.accountType ? rowData.accountType.charAt(0).toUpperCase() + rowData.accountType.slice(1) : ''}
      severity={accountTypeSeverity[rowData.accountType || ''] ?? null}
    />
  );

  const debitTemplate = (rowData: OpeningBalance) => (
    <span className="font-medium">
      {rowData.balanceType === 'debit' ? formatCurrency(Number(rowData.balance)) : '-'}
    </span>
  );

  const creditTemplate = (rowData: OpeningBalance) => (
    <span className="font-medium">
      {rowData.balanceType === 'credit' ? formatCurrency(Number(rowData.balance)) : '-'}
    </span>
  );

  const actionsTemplate = (rowData: OpeningBalance) => (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Button
        icon="pi pi-eye"
        rounded
        text
        severity="secondary"
        size="small"
        tooltip="View"
        tooltipOptions={{ position: 'top' }}
        onClick={() => openDetail(rowData.id)}
      />
      {canEdit && (
        <Button
          icon="pi pi-pencil"
          rounded
          text
          severity="secondary"
          size="small"
          tooltip="Edit"
          tooltipOptions={{ position: 'top' }}
          onClick={() => router.push(`/accounts/opening-balances/${rowData.id}/edit`)}
        />
      )}
      {canDelete && (
        <Button
          icon="pi pi-trash"
          rounded
          text
          severity="danger"
          size="small"
          tooltip="Delete"
          tooltipOptions={{ position: 'top' }}
          onClick={() => handleDelete(rowData)}
        />
      )}
    </div>
  );

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />

      <div className="space-y-6">
        <PageHeader
          icon={Calculator}
          title="Opening Balances"
          description="Manage account opening balances for fiscal periods"
          actions={pageActions}
          {...PageHeaderPresets.financial}
        />

        {/* Stats */}
        <StatCardsGrid columns={4}>
          <StatCard
            title="Total Debit"
            value={formatCurrency(summary?.totalDebit || 0)}
            icon={DollarSign}
            color={StatCardColors.green}
          />
          <StatCard
            title="Total Credit"
            value={formatCurrency(summary?.totalCredit || 0)}
            icon={DollarSign}
            color={StatCardColors.blue}
          />
          <StatCard
            title="Balance Status"
            value={summary?.isBalanced ? 'Balanced' : 'Unbalanced'}
            icon={summary?.isBalanced ? Check : AlertCircle}
            color={summary?.isBalanced ? StatCardColors.green : StatCardColors.red}
          />
          <StatCard
            title="Accounts"
            value={(summary?.accountCount || 0).toString()}
            icon={FileSpreadsheet}
            color={StatCardColors.purple}
          />
        </StatCardsGrid>

        {/* Filters */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Year:</label>
              <Dropdown
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.value)}
                options={yearOptions}
                optionLabel="label"
                optionValue="value"
                className="w-full md:w-32"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Period:</label>
              <Dropdown
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.value)}
                options={periodOptions}
                optionLabel="label"
                optionValue="value"
                className="w-full md:w-40"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Type:</label>
              <Dropdown
                value={accountTypeFilter}
                onChange={(e) => setAccountTypeFilter(e.value)}
                options={accountTypeOptions}
                optionLabel="label"
                optionValue="value"
                className="w-full md:w-40"
              />
            </div>

            <div className="relative flex-1">
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search" />
                <InputText
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </span>
            </div>
          </div>
        </div>

        {/* Balance Warning */}
        {summary && !summary.isBalanced && (
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 text-yellow-700 dark:text-yellow-400 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>
              Opening balances are not balanced. Difference:{' '}
              <strong>
                {formatCurrency(Math.abs((summary.totalDebit || 0) - (summary.totalCredit || 0)))}
              </strong>
            </span>
          </div>
        )}

        {/* Error Banner */}
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* Balances Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <DataTable
            value={filteredBalances}
            loading={loading}
            emptyMessage={
              searchTerm
                ? 'No opening balances found matching your search'
                : 'No opening balances set for this period'
            }
            stripedRows
            rowHover
            size="normal"
            onRowClick={(e) => openDetail((e.data as OpeningBalance).id)}
            rowClassName={(rowData) =>
              cn(
                'cursor-pointer',
                selectedBalance?.id === (rowData as OpeningBalance).id && 'bg-primary/5'
              )
            }
          >
            <Column
              field="accountCode"
              header="Account Code"
              body={accountCodeTemplate}
              sortable
            />
            <Column field="accountName" header="Account Name" sortable />
            <Column
              field="accountType"
              header="Type"
              body={accountTypeTemplate}
              sortable
            />
            <Column
              header="Debit"
              body={debitTemplate}
              alignHeader="right"
              align="right"
              sortable
              sortField="balance"
            />
            <Column
              header="Credit"
              body={creditTemplate}
              alignHeader="right"
              align="right"
              sortable
              sortField="balance"
            />
            <Column
              header=""
              body={actionsTemplate}
              align="right"
              style={{ width: '10rem' }}
            />
          </DataTable>

          {/* Totals Row */}
          {filteredBalances.length > 0 && (
            <div className="border-t bg-muted/30 px-6 py-3 flex font-semibold text-sm">
              <span className="flex-1">Totals</span>
              <span className="w-32 text-right">{formatCurrency(summary?.totalDebit || 0)}</span>
              <span className="w-32 text-right">{formatCurrency(summary?.totalCredit || 0)}</span>
              <span className="w-32"></span>
            </div>
          )}
        </div>
      </div>

      {/* Detail Viewer Panel */}
      {selectedBalance && (
        <OpeningBalanceDetailViewer
          balance={selectedBalance}
          balances={balances}
          onClose={closeDetail}
          onBalanceSelect={handleBalanceSelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowImportDialog(false); setImportFile(null); setImportResult(null); }} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-1">Import Opening Balances</h3>
            <p className="text-sm text-muted-foreground mb-4">Year: {selectedYear}, Period: {selectedPeriod === 0 ? 'Opening' : `Period ${selectedPeriod}`}</p>

            <div className="space-y-4">
              <div>
                <button onClick={handleDownloadTemplate} className="text-sm text-primary hover:underline flex items-center gap-1">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Download CSV Template (pre-filled with your Chart of Accounts)
                </button>
                <p className="text-xs text-muted-foreground mt-1">
                  Columns: Account Code, Account Name, Account Type, Normal Balance, Debit Amount, Credit Amount
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Upload CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportResult(null); }}
                  className="w-full text-sm rounded-lg border px-3 py-2 bg-background"
                />
              </div>

              {importResult && (
                <div className={`rounded-lg p-3 text-sm ${importResult.imported > 0 && importResult.difference === 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'}`}>
                  <p className="font-medium">Imported: {importResult.imported} | Skipped: {importResult.skipped}</p>
                  <div className="mt-2 text-xs space-y-0.5">
                    <p>Total Debits: <span className="font-mono font-medium">{formatCurrency(importResult.totalDebit)}</span></p>
                    <p>Total Credits: <span className="font-mono font-medium">{formatCurrency(importResult.totalCredit)}</span></p>
                    {importResult.difference > 0 && (
                      <p className="text-red-600 dark:text-red-400 font-medium">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        Out of balance by: {formatCurrency(importResult.difference)}
                      </p>
                    )}
                  </div>
                  {importResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs max-h-32 overflow-y-auto">
                      {importResult.errors.map((err, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" /> {err}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setShowImportDialog(false); setImportFile(null); setImportResult(null); }} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted">
                  {importResult?.imported ? 'Close' : 'Cancel'}
                </button>
                {(!importResult || importResult.imported === 0) && (
                  <button
                    onClick={handleImportOB}
                    disabled={!importFile || importingOB}
                    className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {importingOB ? 'Importing...' : 'Import'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
