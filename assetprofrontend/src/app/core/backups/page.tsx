'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Database,
  Download,
  RotateCcw,
  Trash2,
  Plus,
  Clock,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Loader2,
  XCircle,
  Shield,
  Upload,
  FileUp,
} from 'lucide-react';
import { Toast } from 'primereact/toast';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { LoadingSpinner, EmptyState } from '@/components/erp';
import { tenantBackupsApi } from '@/lib/api/core';
import { useTenantStore } from '@/store/tenantStore';
import { extractErrorMessage, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/core';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Settings', href: '/core' },
  { title: 'Backups' },
];

// ============================================================================
// TYPES
// ============================================================================

interface Backup {
  id: number;
  filename: string;
  fileSize: number;
  sizeBytes?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  restoreStatus?: string | null;
  notes?: string;
  createdBy?: string;
  createdByUser?: { fullName: string };
  createdAt: string;
  completedAt?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
    completed: {
      label: 'Completed',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      icon: CheckCircle,
    },
    in_progress: {
      label: 'In Progress',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      icon: Loader2,
    },
    pending: {
      label: 'Pending',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      icon: Clock,
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      icon: XCircle,
    },
  };
  return map[status] || map.pending;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE = 10;

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function BackupsPage() {
  const queryClient = useQueryClient();
  const toast = useRef<Toast>(null);
  const user = useTenantStore((s) => s.user);
  const isSuperAdmin = user?.role === 'Super Admin';

  // State
  const [page, setPage] = useState(1);
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [restoreStep, setRestoreStep] = useState<1 | 2>(1);
  const [backupNotes, setBackupNotes] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Upload state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');

  // Super Admin override state
  const [overrideTarget, setOverrideTarget] = useState<Backup | null>(null);
  const [overrideMode, setOverrideMode] = useState<'choose' | 'approve' | 'override'>('choose');
  const [overrideReason, setOverrideReason] = useState('');

  // Fetch backups — auto-poll every 5 s while any backup is in_progress
  const { data: backupsData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['tenant-backups', page],
    queryFn: () => tenantBackupsApi.list({ skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    refetchInterval: (query) =>
      (query.state.data as typeof backupsData)?.data?.some((b: { status: string }) => b.status === 'in_progress')
        ? 5000 : false,
  });

  const backups = (backupsData?.data ?? []) as unknown as Backup[];
  const total = backupsData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load backups') : null;

  // Stats
  const completedCount = backups.filter((b) => b.status === 'completed').length;
  const latestBackup = backups.find((b) => b.status === 'completed');

  // Create backup mutation
  const createMutation = useMutation({
    mutationFn: (notes?: string) => tenantBackupsApi.create(notes),
    onSuccess: () => {
      toast.current?.show({ severity: 'success', summary: 'Backup Started', detail: 'A new backup is being created.', life: 4000 });
      queryClient.invalidateQueries({ queryKey: ['tenant-backups'] });
      setShowCreateDialog(false);
      setBackupNotes('');
    },
    onError: (err: unknown) => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: extractErrorMessage(err, 'Failed to create backup'), life: 5000 });
    },
  });

  // Upload backup mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, notes }: { file: File; notes?: string }) => tenantBackupsApi.upload(file, notes),
    onSuccess: () => {
      toast.current?.show({ severity: 'success', summary: 'Upload Complete', detail: 'External backup uploaded successfully.', life: 4000 });
      queryClient.invalidateQueries({ queryKey: ['tenant-backups'] });
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadNotes('');
    },
    onError: (err: unknown) => {
      toast.current?.show({ severity: 'error', summary: 'Upload Failed', detail: extractErrorMessage(err, 'Failed to upload backup'), life: 6000 });
    },
  });

  // Restore request mutation (submits for approval)
  const restoreMutation = useMutation({
    mutationFn: (id: number) => tenantBackupsApi.restore(id),
    onSuccess: (result: { success: boolean; message: string; status?: string }) => {
      if (result.status === 'PENDING_APPROVAL') {
        toast.current?.show({
          severity: 'info',
          summary: 'Approval Required',
          detail: 'Restore request submitted. A Super Admin must approve it before the restore executes.',
          life: 8000,
        });
      } else {
        toast.current?.show({ severity: 'success', summary: 'Restore Started', detail: result.message, life: 5000 });
      }
      queryClient.invalidateQueries({ queryKey: ['tenant-backups'] });
      setRestoreTarget(null);
      setRestoreStep(1);
      setRestoreConfirmText('');
    },
    onError: (err: unknown) => {
      toast.current?.show({ severity: 'error', summary: 'Restore Failed', detail: extractErrorMessage(err, 'Failed to submit restore request'), life: 5000 });
    },
  });

  // Super Admin approve step mutation
  const approveStepMutation = useMutation({
    mutationFn: (id: number) => tenantBackupsApi.restoreApprove(id),
    onSuccess: (result) => {
      toast.current?.show({ severity: 'success', summary: 'Restore Approved', detail: result.message, life: 5000 });
      queryClient.invalidateQueries({ queryKey: ['tenant-backups'] });
      closeOverrideModal();
    },
    onError: (err: unknown) => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: extractErrorMessage(err, 'Failed to approve restore'), life: 5000 });
    },
  });

  // Super Admin override mutation
  const overrideMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => tenantBackupsApi.restoreOverride(id, reason),
    onSuccess: (result) => {
      toast.current?.show({ severity: 'success', summary: 'Override Executed', detail: result.message, life: 5000 });
      queryClient.invalidateQueries({ queryKey: ['tenant-backups'] });
      closeOverrideModal();
    },
    onError: (err: unknown) => {
      toast.current?.show({ severity: 'error', summary: 'Override Failed', detail: extractErrorMessage(err, 'Failed to override restore'), life: 5000 });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => tenantBackupsApi.delete(id),
    onSuccess: () => {
      toast.current?.show({ severity: 'success', summary: 'Deleted', detail: 'Backup has been deleted.', life: 3000 });
      queryClient.invalidateQueries({ queryKey: ['tenant-backups'] });
    },
    onError: (err: unknown) => {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: extractErrorMessage(err, 'Failed to delete backup'), life: 5000 });
    },
  });

  // Download handler
  const handleDownload = async (backup: Backup) => {
    try {
      await tenantBackupsApi.download(backup.id);
      toast.current?.show({ severity: 'success', summary: 'Download Started', detail: `Downloading ${backup.filename}`, life: 3000 });
    } catch (err: unknown) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: extractErrorMessage(err, 'Failed to download backup'), life: 5000 });
    }
  };

  // Handle restore button click — Super Admin sees override modal for pending approvals
  const handleRestoreClick = (backup: Backup) => {
    if (isSuperAdmin && backup.restoreStatus === 'PENDING_APPROVAL') {
      setOverrideTarget(backup);
      setOverrideMode('choose');
      setOverrideReason('');
    } else {
      setRestoreTarget(backup);
    }
  };

  const closeOverrideModal = () => {
    setOverrideTarget(null);
    setOverrideMode('choose');
    setOverrideReason('');
  };

  // Page actions
  const pageActions = [
    {
      id: 'upload',
      label: 'Upload Backup',
      icon: Upload,
      variant: 'outline' as const,
      onClick: () => setShowUploadDialog(true),
    },
    {
      id: 'create',
      label: 'Create Backup',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => setShowCreateDialog(true),
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <Toast ref={toast} />

      <PageHeader
        {...PageHeaderPresets.core}
        icon={Database}
        title="Database Backups"
        description="Backup and restore your company data"
        actions={pageActions}
      />

      {/* ================================================================== */}
      {/* STATS CARDS                                                        */}
      {/* ================================================================== */}

      <StatCardsGrid>
        <StatCard
          title="Total Backups"
          value={total}
          icon={Database}
          color={StatCardColors.blue}
        />
        <StatCard
          title="Completed"
          value={completedCount}
          icon={CheckCircle}
          color={StatCardColors.green}
        />
        <StatCard
          title="Latest Backup"
          value={latestBackup ? formatDate(latestBackup.createdAt) : 'None'}
          icon={Clock}
          color={StatCardColors.purple}
        />
      </StatCardsGrid>

      {/* ================================================================== */}
      {/* CONTENT                                                            */}
      {/* ================================================================== */}

      <div className="mt-6">
        {loading ? (
          <LoadingSpinner fullPage />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-2" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        ) : backups.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No backups found"
            description="Create your first backup or upload an external one to protect your company data."
            action={{
              label: 'Create Backup',
              icon: Plus,
              onClick: () => setShowCreateDialog(true),
            }}
          />
        ) : (
          <>
            {/* Table */}
            <div className="rounded-xl border bg-card overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Filename</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Size</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Created By</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Created At</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {backups.map((backup) => {
                    const statusBadge = getStatusBadge(backup.status);
                    const StatusIcon = statusBadge.icon;
                    const isPendingApproval = backup.restoreStatus === 'PENDING_APPROVAL';
                    return (
                      <tr
                        key={backup.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">{backup.filename}</p>
                              {backup.notes && (
                                <p className="text-xs text-muted-foreground mt-0.5">{backup.notes}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {backup.fileSize ? formatFileSize(backup.fileSize) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
                              statusBadge.className,
                            )}>
                              <StatusIcon className={cn('h-3 w-3', backup.status === 'in_progress' && 'animate-spin')} />
                              {statusBadge.label}
                            </span>
                            {isPendingApproval && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                <Clock className="h-3 w-3" />
                                Restore Pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {backup.createdByUser?.fullName || backup.createdBy || 'System'}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(backup.createdAt, { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {backup.status === 'completed' && (
                              <>
                                <button
                                  onClick={() => handleDownload(backup)}
                                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                  title="Download backup"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                                {/* Restore button: Super Admin can act on pending approvals */}
                                <button
                                  onClick={() => handleRestoreClick(backup)}
                                  disabled={isPendingApproval && !isSuperAdmin}
                                  className={cn(
                                    'p-1.5 rounded-lg transition-colors',
                                    isPendingApproval && isSuperAdmin
                                      ? 'hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 hover:text-purple-700'
                                      : 'hover:bg-amber-100 dark:hover:bg-amber-900/30 text-muted-foreground hover:text-amber-600',
                                    isPendingApproval && !isSuperAdmin && 'opacity-40 cursor-not-allowed',
                                  )}
                                  title={
                                    isPendingApproval && isSuperAdmin
                                      ? 'Approve or override this restore request'
                                      : isPendingApproval
                                        ? 'Restore pending approval'
                                        : 'Restore from this backup'
                                  }
                                >
                                  {isPendingApproval && isSuperAdmin ? (
                                    <Shield className="h-4 w-4" />
                                  ) : (
                                    <RotateCcw className="h-4 w-4" />
                                  )}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
                                  deleteMutation.mutate(backup.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-muted-foreground hover:text-red-600"
                              title="Delete backup"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} backups
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium px-2">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================================================================== */}
      {/* CREATE BACKUP DIALOG                                               */}
      {/* ================================================================== */}

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateDialog(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Create Backup
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new backup of your company database. This may take a few minutes.
            </p>
            <div className="mt-4">
              <label htmlFor="backup-notes" className="block text-sm font-medium mb-1.5">
                Notes (optional)
              </label>
              <textarea
                id="backup-notes"
                value={backupNotes}
                onChange={(e) => setBackupNotes(e.target.value)}
                placeholder="e.g., Before quarterly close..."
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setBackupNotes('');
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(backupNotes || undefined)}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* UPLOAD EXTERNAL BACKUP DIALOG                                      */}
      {/* ================================================================== */}

      {showUploadDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowUploadDialog(false); setUploadFile(null); setUploadNotes(''); }}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileUp className="h-5 w-5 text-primary" />
              Upload External Backup
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a PostgreSQL custom-format backup file (.dump) to restore from.
            </p>

            {/* File drop zone */}
            <div className="mt-4">
              <label
                htmlFor="backup-file"
                className={cn(
                  'flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
                  uploadFile
                    ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10'
                    : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30',
                )}
              >
                {uploadFile ? (
                  <div className="text-center">
                    <CheckCircle className="mx-auto h-6 w-6 text-green-500 mb-1" />
                    <p className="text-sm font-medium">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(uploadFile.size)}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">Click to select a <strong>.dump</strong> file</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Max 500 MB</p>
                  </div>
                )}
                <input
                  id="backup-file"
                  type="file"
                  accept=".dump"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setUploadFile(file);
                  }}
                />
              </label>
            </div>

            <div className="mt-4">
              <label htmlFor="upload-notes" className="block text-sm font-medium mb-1.5">
                Notes (optional)
              </label>
              <textarea
                id="upload-notes"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="e.g., Production backup from March 2026..."
                rows={2}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowUploadDialog(false); setUploadFile(null); setUploadNotes(''); }}
                className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (uploadFile) {
                    uploadMutation.mutate({ file: uploadFile, notes: uploadNotes || undefined });
                  }
                }}
                disabled={!uploadFile || uploadMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {uploadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploadMutation.isPending ? 'Uploading...' : 'Upload Backup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* RESTORE CONFIRMATION DIALOG (non-Super Admin or new restore)       */}
      {/* ================================================================== */}

      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setRestoreTarget(null); setRestoreStep(1); setRestoreConfirmText(''); }}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`h-2 flex-1 rounded-full ${restoreStep >= 1 ? 'bg-amber-500' : 'bg-muted'}`} />
              <div className={`h-2 flex-1 rounded-full ${restoreStep >= 2 ? 'bg-red-500' : 'bg-muted'}`} />
            </div>

            {restoreStep === 1 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Restore Database</h3>
                    <p className="text-sm text-muted-foreground">Step 1 of 2 — Review details</p>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 mb-4">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>Warning:</strong> Restoring from this backup will overwrite all current data
                    in your database. Any changes made after{' '}
                    <strong>{formatDate(restoreTarget.createdAt)}</strong>{' '}
                    will be permanently lost.
                  </p>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{restoreTarget.filename}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span>{restoreTarget.fileSize ? formatFileSize(restoreTarget.fileSize) : 'Unknown size'}</span>
                    <span>Created {formatDate(restoreTarget.createdAt)}</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  A safety backup of your current data will be created automatically before restoring.
                </p>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setRestoreTarget(null); setRestoreStep(1); setRestoreConfirmText(''); }}
                    className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setRestoreStep(2)}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                  >
                    Continue to Confirmation
                  </button>
                </div>
              </>
            )}

            {restoreStep === 2 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Final Confirmation</h3>
                    <p className="text-sm text-muted-foreground">Step 2 of 2 — Type to confirm</p>
                  </div>
                </div>

                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 mb-4">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    {isSuperAdmin ? (
                      <>
                        <strong>This will execute the restore immediately.</strong> All current data will be replaced
                        with the backup from <strong>{formatDate(restoreTarget.createdAt)}</strong>.
                      </>
                    ) : (
                      <>
                        <strong>This will submit a restore request for approval.</strong> A Super Admin must approve
                        before the restore executes. All current data will be replaced with the backup from{' '}
                        <strong>{formatDate(restoreTarget.createdAt)}</strong>.
                      </>
                    )}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-red-600 dark:text-red-400">RESTORE</span> to {isSuperAdmin ? 'execute' : 'submit request'}
                  </label>
                  <input
                    type="text"
                    value={restoreConfirmText}
                    onChange={(e) => setRestoreConfirmText(e.target.value)}
                    placeholder="Type RESTORE here"
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-red-500"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setRestoreStep(1); setRestoreConfirmText(''); }}
                    className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => restoreMutation.mutate(restoreTarget.id)}
                    disabled={restoreConfirmText !== 'RESTORE' || restoreMutation.isPending}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {restoreMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSuperAdmin ? 'Execute Restore' : 'Submit Restore Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUPER ADMIN OVERRIDE MODAL (for pending restore requests)          */}
      {/* ================================================================== */}

      {overrideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeOverrideModal} />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">

            {/* Choose mode */}
            {overrideMode === 'choose' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Super Admin Action</h3>
                    <p className="text-sm text-muted-foreground">Pending restore for {overrideTarget.filename}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-3 mb-4">
                  <p className="text-sm text-purple-800 dark:text-purple-300">
                    A restore request is pending approval for this backup. As Super Admin, choose an action:
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Option 1: Approve Step */}
                  <button
                    onClick={() => setOverrideMode('approve')}
                    className="w-full flex items-start gap-3 p-4 rounded-lg border-2 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors text-left"
                  >
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Approve Restore</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Approve the pending restore request and execute the restore.
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Override All */}
                  <button
                    onClick={() => setOverrideMode('override')}
                    className="w-full flex items-start gap-3 p-4 rounded-lg border-2 border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors text-left"
                  >
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mt-0.5">
                      <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Override with Reason</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Skip all approval steps and execute the restore immediately. Requires a written justification.
                      </p>
                    </div>
                  </button>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={closeOverrideModal}
                    className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* Approve confirmation */}
            {overrideMode === 'approve' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Approve Restore</h3>
                    <p className="text-sm text-muted-foreground">Confirm approval</p>
                  </div>
                </div>

                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 mb-4">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    Approving will execute the restore from <strong>{overrideTarget.filename}</strong> immediately.
                    All current data will be replaced with the backup from{' '}
                    <strong>{formatDate(overrideTarget.createdAt)}</strong>.
                    A pre-restore safety backup will be created automatically.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setOverrideMode('choose')}
                    className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => approveStepMutation.mutate(overrideTarget.id)}
                    disabled={approveStepMutation.isPending}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {approveStepMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Approve & Execute Restore
                  </button>
                </div>
              </>
            )}

            {/* Override with reason */}
            {overrideMode === 'override' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Override Restore</h3>
                    <p className="text-sm text-muted-foreground">Provide justification</p>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 mb-4">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    This will <strong>skip all approval steps</strong> and execute the restore from{' '}
                    <strong>{overrideTarget.filename}</strong> immediately. The override reason will be
                    logged for audit purposes.
                  </p>
                </div>

                <div className="mb-4">
                  <label htmlFor="override-reason" className="block text-sm font-medium mb-1.5">
                    Override Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="override-reason"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Explain why you are overriding the approval process..."
                    rows={3}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    autoFocus
                  />
                  {overrideReason.length > 0 && overrideReason.length < 5 && (
                    <p className="text-xs text-red-500 mt-1">Minimum 5 characters required</p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setOverrideMode('choose'); setOverrideReason(''); }}
                    className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => overrideMutation.mutate({ id: overrideTarget.id, reason: overrideReason })}
                    disabled={overrideReason.trim().length < 5 || overrideMutation.isPending}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {overrideMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Override & Execute Restore
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
