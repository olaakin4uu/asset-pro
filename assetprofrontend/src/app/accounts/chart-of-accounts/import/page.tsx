'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Trash2,
  Plus,
  RefreshCw,
  SkipForward,
  ShieldAlert,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { useImportPermissions } from '@/hooks';
import { accountsApi } from '@/lib/api/accounts';
import type { ImportAccountItem, ImportAccountsResult } from '@/lib/api/accounts';
import { extractErrorMessage } from '@/lib/utils';
import { ImportOverwriteDialog } from '@/components/erp';
import type { BreadcrumbItem } from '@/types/core';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Chart of Accounts', href: '/accounts/chart-of-accounts' },
  { title: 'Import' },
];

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const CATEGORY_TYPES = [
  'non_current_asset', 'contra_asset', 'inventory', 'bank', 'current_asset',
  'receivable', 'non_current_liability', 'control', 'current_liability',
  'payable', 'equity', 'operating_revenue', 'operating_expense',
  'non_operating_revenue', 'direct_expense', 'overhead_expense',
  'other_expense', 'reconciliation',
];
const IFRS18_TYPES = ['operating', 'investing', 'financing'];

type ImportMode = 'skip' | 'update' | 'overwrite';

const IMPORT_MODES: { value: ImportMode; label: string; description: string; color: string }[] = [
  {
    value: 'skip',
    label: 'Skip Existing',
    description: 'Leave existing accounts unchanged. Only new codes are imported.',
    color: 'blue',
  },
  {
    value: 'update',
    label: 'Update Existing',
    description: 'Update name, description, category, and parent for existing codes. Account type is preserved.',
    color: 'yellow',
  },
  {
    value: 'overwrite',
    label: 'Overwrite All',
    description: 'Delete all existing accounts and replace with imported data.',
    color: 'red',
  },
];

function emptyRow(): ImportAccountItem {
  return {
    code: '', name: '', accountType: 'asset', categoryType: '', parentCode: '',
    description: '', isPosting: true, ifrs18AccountType: '', closingRate: false, isActive: true,
  };
}

export default function ImportAccountsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canImport, canOverwrite } = useImportPermissions('accounts');

  const [rows, setRows] = useState<ImportAccountItem[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [importMode, setImportMode] = useState<ImportMode>('skip');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportAccountsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  const addRow = () => setRows([...rows, emptyRow()]);

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index: number, field: keyof ImportAccountItem, value: string | boolean) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleDownloadTemplate = async () => {
    try {
      const template = await accountsApi.getImportTemplate();
      const csvContent = [
        template.headers.join(','),
        ...template.sampleRows.map(row => row.map(v => `"${v}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chart-of-accounts-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to download template'));
    }
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        setError('File must have a header row and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
      const codeIdx = headers.indexOf('code');
      const nameIdx = headers.indexOf('name');
      const typeIdx = headers.indexOf('accounttype');
      const catIdx = headers.indexOf('categorytype');
      const parentIdx = headers.indexOf('parentcode');
      const descIdx = headers.indexOf('description');
      const postingIdx = headers.indexOf('isposting');
      const ifrs18Idx = headers.indexOf('ifrs18accounttype');
      const closingRateIdx = headers.indexOf('closingrate');
      const isActiveIdx = headers.indexOf('isactive');

      if (codeIdx === -1 || nameIdx === -1 || typeIdx === -1) {
        setError('CSV must have columns: code, name, accountType');
        return;
      }

      const parsedRows: ImportAccountItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (!values[codeIdx] || !values[nameIdx]) continue;

        parsedRows.push({
          code: values[codeIdx],
          name: values[nameIdx],
          accountType: values[typeIdx] || 'asset',
          categoryType: catIdx >= 0 ? values[catIdx] : '',
          parentCode: parentIdx >= 0 ? values[parentIdx] : '',
          description: descIdx >= 0 ? values[descIdx] : '',
          isPosting: postingIdx >= 0 ? values[postingIdx]?.toLowerCase() !== 'false' : true,
          ifrs18AccountType: ifrs18Idx >= 0 ? values[ifrs18Idx] : '',
          closingRate: closingRateIdx >= 0 ? values[closingRateIdx]?.toLowerCase() === 'true' : false,
          isActive: isActiveIdx >= 0 ? values[isActiveIdx]?.toLowerCase() !== 'false' : true,
        });
      }

      if (parsedRows.length === 0) {
        setError('No valid data rows found in the file');
        return;
      }

      setRows(parsedRows);
      setError(null);
      setResult(null);
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const executeImport = async () => {
    const validRows = rows.filter(r => r.code.trim() && r.name.trim());
    try {
      setImporting(true);
      setError(null);
      setResult(null);
      const importResult = await accountsApi.importAccounts(validRows, importMode);
      setResult(importResult);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Import failed'));
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    const validRows = rows.filter(r => r.code.trim() && r.name.trim());
    if (validRows.length === 0) {
      setError('No valid rows to import. Fill in at least code, name, and account type.');
      return;
    }

    if (importMode === 'overwrite') {
      setShowOverwriteConfirm(true);
      return;
    }

    executeImport();
  };

  const pageActions = [
    {
      id: 'download-template',
      label: 'Download Template',
      icon: Download,
      variant: 'outline' as const,
      onClick: handleDownloadTemplate,
    },
  ];

  const validCount = rows.filter(r => r.code.trim() && r.name.trim()).length;

  if (!canImport) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <PageHeader icon={Upload} title="Import Chart of Accounts" {...PageHeaderPresets.financial} />
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Access Denied</h3>
          <p className="text-sm text-red-600 dark:text-red-400">You do not have permission to import records. Contact your administrator to request access.</p>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ImportOverwriteDialog
        open={showOverwriteConfirm}
        onConfirm={() => { setShowOverwriteConfirm(false); executeImport(); }}
        onCancel={() => setShowOverwriteConfirm(false)}
        entityName="chart of accounts"
        itemCount={rows.filter(r => r.code.trim() && r.name.trim()).length}
      />
      <PageHeader
        icon={Upload}
        title="Import Chart of Accounts"
        description="Import accounts from CSV file or enter them manually"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      {/* Import Mode Selector */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Duplicate Handling Mode</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {IMPORT_MODES.map((mode) => {
            const isSelected = importMode === mode.value;
            const borderColor =
              mode.color === 'blue' ? (isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700') :
              mode.color === 'yellow' ? (isSelected ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-700') :
              (isSelected ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700');
            const iconColor =
              mode.color === 'blue' ? 'text-blue-500' :
              mode.color === 'yellow' ? 'text-yellow-500' : 'text-red-500';

            return (
              <button
                key={mode.value}
                onClick={() => {
                  if (mode.value === 'overwrite' && !canOverwrite) return;
                  setImportMode(mode.value);
                }}
                disabled={mode.value === 'overwrite' && !canOverwrite}
                className={`text-left p-4 border-2 rounded-lg transition-all ${borderColor} ${mode.value === 'overwrite' && !canOverwrite ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {mode.value === 'skip' && <SkipForward className={`h-4 w-4 ${iconColor}`} />}
                  {mode.value === 'update' && <RefreshCw className={`h-4 w-4 ${iconColor}`} />}
                  {mode.value === 'overwrite' && <Upload className={`h-4 w-4 ${iconColor}`} />}
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{mode.label}</span>
                  {isSelected && <span className={`ml-auto text-xs font-medium px-1.5 py-0.5 rounded ${
                    mode.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                    mode.color === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                    'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}>Selected</span>}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{mode.description}</p>
                {mode.value === 'overwrite' && !canOverwrite && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Requires permission
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Import Instructions</h4>
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
          <li>Download the template CSV and fill in your accounts, or paste data directly below</li>
          <li>Required fields: <strong>Code</strong>, <strong>Name</strong>, <strong>Account Type</strong> (asset, liability, equity, revenue, expense)</li>
          <li>Optional: Category Type, Parent Code (for sub-accounts), Description, IFRS 18 Type, Closing Rate, Active</li>
          <li>Parent codes must exist already or appear earlier in the import list</li>
          <li><strong>IFRS 18 Account Type</strong>: operating | investing | financing (applies to revenue/expense accounts)</li>
        </ul>
      </div>

      {/* File Upload */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <FileSpreadsheet className="h-8 w-8 text-green-500" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Upload CSV File</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Upload a CSV file with account data to auto-populate the table below</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            Choose File
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Accounts to Import ({validCount} valid)
          </h3>
          <button
            onClick={addRow}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
          >
            <Plus className="h-3.5 w-3.5" /> Add Row
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-3 py-2 font-medium text-gray-500 w-20">Code *</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 w-44">Name *</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 w-28">Type *</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 w-36">Category</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 w-20">Parent</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 w-28">IFRS 18</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 w-44">Description</th>
                <th className="text-center px-2 py-2 font-medium text-gray-500 w-16">Posting</th>
                <th className="text-center px-2 py-2 font-medium text-gray-500 w-16">Closing</th>
                <th className="text-center px-2 py-2 font-medium text-gray-500 w-14">Active</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-2 py-1">
                    <input
                      value={row.code}
                      onChange={(e) => updateRow(index, 'code', e.target.value)}
                      placeholder="1000"
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(index, 'name', e.target.value)}
                      placeholder="Account name"
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={row.accountType}
                      onChange={(e) => updateRow(index, 'accountType', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      {ACCOUNT_TYPES.map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={row.categoryType || ''}
                      onChange={(e) => updateRow(index, 'categoryType', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">None</option>
                      {CATEGORY_TYPES.map(t => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={row.parentCode || ''}
                      onChange={(e) => updateRow(index, 'parentCode', e.target.value)}
                      placeholder="Parent"
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={row.ifrs18AccountType || ''}
                      onChange={(e) => updateRow(index, 'ifrs18AccountType', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">None</option>
                      {IFRS18_TYPES.map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={row.description || ''}
                      onChange={(e) => updateRow(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={row.isPosting !== false}
                      onChange={(e) => updateRow(index, 'isPosting', e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={row.closingRate === true}
                      onChange={(e) => updateRow(index, 'closingRate', e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={row.isActive !== false}
                      onChange={(e) => updateRow(index, 'isActive', e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <button
                      onClick={() => removeRow(index)}
                      className="p-1 text-red-400 hover:text-red-600 rounded"
                      title="Remove row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Import Result */}
      {result && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            {result.errors.length === 0 ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            )}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Import Complete</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {result.imported} imported, {result.updated} updated, {result.skipped} skipped, {result.errors.length} errors
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{result.imported}</p>
              <p className="text-xs text-green-600 dark:text-green-500">Imported</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{result.updated}</p>
              <p className="text-xs text-blue-600 dark:text-blue-500">Updated</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{result.skipped}</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500">Skipped</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{result.errors.length}</p>
              <p className="text-xs text-red-600 dark:text-red-500">Errors</p>
            </div>
          </div>

          {/* Error Details */}
          {result.errors.length > 0 && (
            <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
              <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 border-b border-red-200 dark:border-red-800">
                <p className="text-xs font-semibold text-red-800 dark:text-red-300">Error Details</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <div key={i} className="px-4 py-2 text-xs border-b border-red-100 dark:border-red-900 last:border-b-0">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Row {err.row}</span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span className="font-mono text-gray-700 dark:text-gray-300">{err.code}</span>
                    <span className="mx-2 text-gray-400">|</span>
                    <span className="text-red-700 dark:text-red-400">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/accounts/chart-of-accounts')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chart of Accounts
        </button>
        <button
          onClick={handleImport}
          disabled={importing || validCount === 0}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Import {validCount > 0 ? `${validCount} Accounts` : 'Accounts'}
            </>
          )}
        </button>
      </div>
    </TenantLayout>
  );
}
