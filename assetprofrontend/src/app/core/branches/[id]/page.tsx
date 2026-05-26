'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  GitBranch,
  ArrowLeft,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Building2,
  Clock,
  Users,
  Warehouse,
  Globe,
  Calendar,
  Info,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { branchesApi, companiesApi } from '@/lib/api/core';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';

export default function BranchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = parseInt(params.id as string);

  const { data: branch, isLoading: branchLoading, error: branchError } = useQuery({
    queryKey: ['core-branches', branchId],
    queryFn: () => branchesApi.get(branchId),
    enabled: !!branchId && !isNaN(branchId),
  });

  const { data: company } = useQuery({
    queryKey: ['core-companies', branch?.companyId],
    queryFn: () => companiesApi.get(branch!.companyId),
    enabled: !!branch?.companyId,
  });

  const loading = branchLoading;
  const error = branchError ? extractErrorMessage(branchError, 'Failed to load branch') : null;

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Administration', href: '/core' },
    { title: 'Branches', href: '/core/branches' },
    { title: branch?.name || 'Loading...' },
  ];

  const handleDelete = () => {
    if (!branch) return;
    confirmDialog({
      message: `Are you sure you want to delete "${branch.name}"? This action cannot be undone.`,
      header: 'Delete Branch',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await branchesApi.delete(branch.id);
          router.push('/core/branches');
        } catch (error) {
          console.error('Failed to delete branch:', error);
        }
      },
    });
  };

  const getPageActions = () => {
    if (!branch) return [];
    return [
      {
        id: 'edit',
        label: 'Edit',
        icon: Pencil,
        variant: 'outline' as const,
        onClick: () => router.push(`/core/branches/${branchId}/edit`),
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive' as const,
        onClick: handleDelete,
      },
    ];
  };

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </TenantLayout>
    );
  }

  if (error || !branch) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-500 mb-4">{error || 'Branch not found'}</p>
          <button
            onClick={() => router.push('/core/branches')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Branches
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      <PageHeader
        icon={GitBranch}
        title={branch.name}
        description={branch.code || undefined}
        actions={getPageActions()}
        badge={{
          text: branch.isActive ? 'Active' : 'Inactive',
          variant: branch.isActive ? 'success' : 'destructive',
        }}
        {...PageHeaderPresets.core}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Header Card */}
        <div className="rounded-xl border bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 p-6 lg:col-span-2">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-xl shadow-lg',
                branch.isHeadOffice
                  ? 'bg-blue-100 dark:bg-blue-900/50'
                  : 'bg-green-100 dark:bg-green-900/50'
              )}
            >
              <GitBranch
                className={cn(
                  'h-8 w-8',
                  branch.isHeadOffice
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-green-600 dark:text-green-400'
                )}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{branch.name}</h3>
              {branch.code && <p className="text-sm text-muted-foreground">Code: {branch.code}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium',
                    branch.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                  )}
                >
                  {branch.isActive ? 'Active' : 'Inactive'}
                </span>
                {branch.isHeadOffice && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400 px-3 py-1 text-sm font-medium">
                    Headquarters
                  </span>
                )}
              </div>
            </div>
            {/* Stats */}
            <div className="flex gap-4">
              <div className="text-center p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{branch.userCount || 0}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Users</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Warehouse className="h-5 w-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-purple-900 dark:text-purple-100">{branch.warehouseCount || 0}</p>
                <p className="text-xs text-purple-700 dark:text-purple-300">Warehouses</p>
              </div>
            </div>
          </div>
        </div>

        {/* Parent Company */}
        {company && (
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Parent Company
            </h3>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="rounded-lg bg-blue-500 p-3">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-lg">{company.name}</p>
                {company.displayName && company.displayName !== company.name && (
                  <p className="text-sm text-muted-foreground">{company.displayName}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Contact Information
          </h3>
          <dl className="space-y-4">
            {branch.email && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd>
                    <a href={`mailto:${branch.email}`} className="text-sm text-blue-600 hover:underline">
                      {branch.email}
                    </a>
                  </dd>
                </div>
              </div>
            )}
            {branch.phone && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-2">
                  <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd>
                    <a href={`tel:${branch.phone}`} className="text-sm text-blue-600 hover:underline">
                      {branch.phone}
                    </a>
                  </dd>
                </div>
              </div>
            )}
            {!branch.email && !branch.phone && (
              <p className="text-sm text-muted-foreground">No contact information provided</p>
            )}
          </dl>
        </div>

        {/* Address */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address
          </h3>
          {branch.address || branch.city || branch.state || branch.country ? (
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-orange-500 p-2">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div className="text-sm space-y-1">
                  {branch.address && <p className="font-medium">{branch.address}</p>}
                  {(branch.city || branch.state || branch.postalCode) && (
                    <p className="text-muted-foreground">
                      {[branch.city, branch.state, branch.postalCode].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {branch.country && (
                    <p className="text-muted-foreground">{branch.country}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No address information provided</p>
          )}
        </div>

        {/* Timezone */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Regional Settings
          </h3>
          <dl className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Timezone</dt>
                <dd className="font-medium">{branch.timezone || 'Not specified'}</dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Timeline */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Created
              </dt>
              <dd className="text-sm">{new Date(branch.createdAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Last Updated
              </dt>
              <dd className="text-sm">{new Date(branch.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => router.push('/core/branches')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Branches
        </button>
      </div>
    </TenantLayout>
  );
}
