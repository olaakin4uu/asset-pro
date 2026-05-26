'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
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
  Key,
  ShieldAlert,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { useImportPermissions } from '@/hooks';
import { usersApi, rolesApi, branchesApi } from '@/lib/api/core';
import type { ImportUserItem, ImportUsersResult, UserSeatInfo, Role, Branch } from '@/types/core';
import { extractErrorMessage } from '@/lib/utils';
import { ImportOverwriteDialog } from '@/components/erp';
import type { BreadcrumbItem } from '@/types/core';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Users', href: '/core/users' },
  { title: 'Import' },
];

type ImportMode = 'skip' | 'update' | 'overwrite';
type PasswordMode = 'temp_password' | 'default_password';

const IMPORT_MODES: { value: ImportMode; label: string; description: string; color: string }[] = [
  {
    value: 'skip',
    label: 'Skip Existing',
    description: 'Leave existing users unchanged. Only new email addresses are imported.',
    color: 'blue',
  },
  {
    value: 'update',
    label: 'Update Existing',
    description: 'Update name, role, and branch for existing emails. Password is not changed.',
    color: 'yellow',
  },
  {
    value: 'overwrite',
    label: 'Overwrite All',
    description: 'Delete all existing users (except you) and replace with imported data.',
    color: 'red',
  },
];

function emptyRow(): ImportUserItem {
  return { name: '', email: '', roleName: '', branchName: '', isActive: true };
}

export default function ImportUsersPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canImport, canOverwrite } = useImportPermissions('users');

  const [rows, setRows] = useState<ImportUserItem[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [importMode, setImportMode] = useState<ImportMode>('skip');
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('temp_password');
  const [defaultPassword, setDefaultPassword] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportUsersResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  const [seatInfo, setSeatInfo] = useState<UserSeatInfo | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Load seat info, roles, branches on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [seat, rolesRes, branchesRes] = await Promise.all([
          usersApi.getSeatInfo(),
          rolesApi.list({ limit: 200 }),
          branchesApi.list({ limit: 200 }),
        ]);
        setSeatInfo(seat);
        setRoles(rolesRes.data ?? []);
        setBranches(branchesRes.data ?? []);
      } catch (err: unknown) {
        setError(extractErrorMessage(err, 'Failed to load configuration'));
      }
    };
    load();
  }, []);

  const addRow = () => setRows([...rows, emptyRow()]);

  const removeRow = (index: number) => {
    if (rows.length > 1) setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof ImportUserItem, value: string | boolean) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleDownloadTemplate = async () => {
    try {
      const template = await usersApi.getImportTemplate();
      const csvContent = [
        template.headers.join(','),
        ...template.sampleRows.map(row => row.map(v => `"${v}"`).join(',')),
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users-import-template.csv';
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
      const nameIdx = headers.indexOf('name');
      const emailIdx = headers.indexOf('email');
      const roleIdx = headers.indexOf('rolename');
      const branchIdx = headers.indexOf('branchname');
      const activeIdx = headers.indexOf('isactive');

      if (nameIdx === -1 || emailIdx === -1) {
        setError('CSV must have columns: name, email');
        return;
      }

      const parsedRows: ImportUserItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (!values[nameIdx] || !values[emailIdx]) continue;
        parsedRows.push({
          name: values[nameIdx],
          email: values[emailIdx],
          roleName: roleIdx >= 0 ? values[roleIdx] : '',
          branchName: branchIdx >= 0 ? values[branchIdx] : '',
          isActive: activeIdx >= 0 ? values[activeIdx]?.toLowerCase() !== 'false' : true,
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
    const validRows = rows.filter(r => r.name.trim() && r.email.trim());
    try {
      setImporting(true);
      setError(null);
      setResult(null);
      const importResult = await usersApi.importUsers(
        validRows,
        importMode,
        passwordMode,
        passwordMode === 'default_password' ? defaultPassword : undefined,
      );
      setResult(importResult);
      // Refresh seat info
      const updatedSeat = await usersApi.getSeatInfo();
      setSeatInfo(updatedSeat);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Import failed'));
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    const validRows = rows.filter(r => r.name.trim() && r.email.trim());
    if (validRows.length === 0) {
      setError('No valid rows to import. Fill in at least name and email.');
      return;
    }
    if (passwordMode === 'default_password' && defaultPassword.length < 8) {
      setError('Default password must be at least 8 characters');
      return;
    }

    if (importMode === 'overwrite') {
      setShowOverwriteConfirm(true);
      return;
    }

    executeImport();
  };

  const validCount = rows.filter(r => r.name.trim() && r.email.trim()).length;

  const pageActions = [
    {
      id: 'download-template',
      label: 'Download Template',
      icon: Download,
      variant: 'outline' as const,
      onClick: handleDownloadTemplate,
    },
  ];

  const seatPct = seatInfo ? Math.min(100, Math.round((seatInfo.used / seatInfo.max) * 100)) : 0;
  const seatWarning = seatInfo && seatInfo.available <= 0;
  const seatCaution = seatInfo && !seatWarning && seatInfo.available <= 2;

  if (!canImport) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <PageHeader icon={Upload} title="Import System Users" {...PageHeaderPresets.core} />
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
        entityName="user"
        itemCount={validCount}
      />
      <PageHeader
        icon={Users}
        title="Import System Users"
        description="Bulk import user accounts with role and branch assignments"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      {/* Seat Limit Banner */}
      {seatInfo && (
        <div className={`rounded-lg border p-4 mb-6 ${
          seatWarning
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : seatCaution
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {seatWarning
                  ? <ShieldAlert className="h-4 w-4 text-red-500" />
                  : <Users className="h-4 w-4 text-gray-500" />
                }
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {seatInfo.planName} Plan — User Seats
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  seatWarning
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    : seatCaution
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {seatInfo.used} / {seatInfo.max} seats
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                <div
                  className={`h-2 rounded-full transition-all ${
                    seatWarning ? 'bg-red-500' : seatCaution ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${seatPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {seatWarning
                  ? 'No seats remaining. Upgrade your plan to add more users.'
                  : `${seatInfo.available} seat${seatInfo.available !== 1 ? 's' : ''} available for new users`}
              </p>
            </div>
            {seatWarning && (
              <button
                onClick={() => router.push('/billing')}
                className="shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>
      )}

      {/* Import Mode Selector */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Duplicate Handling Mode</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {IMPORT_MODES.map((mode) => {
            const isSelected = importMode === mode.value;
            const cls =
              mode.color === 'blue' ? (isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700') :
              mode.color === 'yellow' ? (isSelected ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-700') :
              (isSelected ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700');
            const iconCls =
              mode.color === 'blue' ? 'text-blue-500' :
              mode.color === 'yellow' ? 'text-yellow-500' : 'text-red-500';
            const badgeCls =
              mode.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
              mode.color === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
              'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
            return (
              <button key={mode.value} onClick={() => {
                  if (mode.value === 'overwrite' && !canOverwrite) return;
                  setImportMode(mode.value);
                }}
                disabled={mode.value === 'overwrite' && !canOverwrite}
                className={`text-left p-4 border-2 rounded-lg transition-all ${cls} ${mode.value === 'overwrite' && !canOverwrite ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  {mode.value === 'skip' && <SkipForward className={`h-4 w-4 ${iconCls}`} />}
                  {mode.value === 'update' && <RefreshCw className={`h-4 w-4 ${iconCls}`} />}
                  {mode.value === 'overwrite' && <Upload className={`h-4 w-4 ${iconCls}`} />}
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{mode.label}</span>
                  {isSelected && <span className={`ml-auto text-xs font-medium px-1.5 py-0.5 rounded ${badgeCls}`}>Selected</span>}
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

      {/* Password Options */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Key className="h-4 w-4 text-gray-400" />
          Password Setup (applies to new users only)
        </h3>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="passwordMode"
              value="temp_password"
              checked={passwordMode === 'temp_password'}
              onChange={() => setPasswordMode('temp_password')}
              className="mt-0.5 h-4 w-4 text-blue-600"
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Auto-generate temporary passwords</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">A unique password is generated per user and shown in the import result — share with each user</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="passwordMode"
              value="default_password"
              checked={passwordMode === 'default_password'}
              onChange={() => setPasswordMode('default_password')}
              className="mt-0.5 h-4 w-4 text-blue-600"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Set a default password for all</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">All imported users get the same password — ask them to change it after first login</p>
              {passwordMode === 'default_password' && (
                <input
                  type="password"
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full max-w-xs px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              )}
            </div>
          </label>
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <FileSpreadsheet className="h-8 w-8 text-green-500" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Upload CSV File</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Required columns: name, email — Optional: roleName, branchName, isActive</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
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
            Users to Import ({validCount} valid)
          </h3>
          <button onClick={addRow}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
            <Plus className="h-3.5 w-3.5" /> Add Row
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-3 py-2 font-medium text-gray-500 w-44">Full Name *</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 w-52">Email *</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 w-40">Role</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500 w-40">Branch</th>
                <th className="text-center px-2 py-2 font-medium text-gray-500 w-16">Active</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-2 py-1">
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(index, 'name', e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={row.email}
                      onChange={(e) => updateRow(index, 'email', e.target.value)}
                      placeholder="john@company.com"
                      type="email"
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={row.roleName || ''}
                      onChange={(e) => updateRow(index, 'roleName', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">No role</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={row.branchName || ''}
                      onChange={(e) => updateRow(index, 'branchName', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">No branch</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
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
                    <button onClick={() => removeRow(index)}
                      className="p-1 text-red-400 hover:text-red-600 rounded" title="Remove row">
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
            {result.errors.length === 0
              ? <CheckCircle2 className="h-8 w-8 text-green-500" />
              : <AlertTriangle className="h-8 w-8 text-yellow-500" />
            }
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Import Complete</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {result.imported} imported · {result.updated} updated · {result.skipped} skipped · {result.errors.length} errors
                {' '}· Seats: {result.seatsUsed} / {result.seatsMax}
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

          {/* Temp Passwords */}
          {Object.keys(result.tempPasswords).length > 0 && (
            <div className="border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 border-b border-blue-200 dark:border-blue-800 flex items-center gap-2">
                <Key className="h-3.5 w-3.5 text-blue-600" />
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Temporary Passwords — Share with each user</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {Object.entries(result.tempPasswords).map(([email, pass]) => (
                  <div key={email} className="px-4 py-2 text-xs border-b border-blue-100 dark:border-blue-900 last:border-b-0 flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">{email}</span>
                    <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{pass}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    <span className="text-gray-700 dark:text-gray-300">{err.email}</span>
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
          onClick={() => router.push('/core/users')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </button>
        <button
          onClick={handleImport}
          disabled={importing || validCount === 0 || (seatInfo?.available === 0 && importMode === 'skip')}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Importing...</>
          ) : (
            <><Upload className="h-4 w-4" />Import {validCount > 0 ? `${validCount} Users` : 'Users'}</>
          )}
        </button>
      </div>
    </TenantLayout>
  );
}
