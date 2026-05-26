'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  ArrowLeft,
  Pencil,
  Trash2,
  Shield,
  Building2,
  GitBranch,
  Key,
  Info,
  Mail,
  Calendar,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { usersApi, companiesApi, branchesApi } from '@/lib/api/core';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';

const userTypeColors: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  EMPLOYEE: 'bg-gray-100 text-gray-800',
};

const userTypeLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = parseInt(params.id as string);

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['core-users', userId],
    queryFn: () => usersApi.get(userId),
    enabled: !!userId && !isNaN(userId),
  });

  const { data: company } = useQuery({
    queryKey: ['core-companies', user?.companyId],
    queryFn: () => companiesApi.get(user!.companyId),
    enabled: !!user?.companyId,
  });

  const { data: branch } = useQuery({
    queryKey: ['core-branches', user?.branchId],
    queryFn: () => branchesApi.get(user!.branchId),
    enabled: !!user?.branchId,
  });

  const loading = userLoading;
  const error = userError ? extractErrorMessage(userError, 'Failed to load user') : null;

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Administration', href: '/core' },
    { title: 'Users', href: '/core/users' },
    { title: user?.name || 'Loading...' },
  ];

  const handleDelete = () => {
    if (!user) return;
    confirmDialog({
      message: `Are you sure you want to delete "${user.name}"? This action cannot be undone.`,
      header: 'Delete User',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await usersApi.delete(user.id);
          router.push('/core/users');
        } catch (error) {
          console.error('Failed to delete user:', error);
        }
      },
    });
  };

  const getPageActions = () => {
    if (!user) return [];
    return [
      {
        id: 'edit',
        label: 'Edit',
        icon: Pencil,
        variant: 'outline' as const,
        onClick: () => router.push(`/core/users/${userId}/edit`),
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

  // Group permissions by module
  const permissionsByModule = (user?.permissions || []).reduce((acc, perm) => {
    const module = perm.split('.')[0] || 'other';
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {} as Record<string, string[]>);

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </TenantLayout>
    );
  }

  if (error || !user) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-500 mb-4">{error || 'User not found'}</p>
          <button
            onClick={() => router.push('/core/users')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      <PageHeader
        icon={Users}
        title={user.name}
        description={user.email}
        actions={getPageActions()}
        badge={{
          text: userTypeLabels[user.userType] || user.userType,
          variant: user.userType === 'ADMIN' ? 'default' : user.userType === 'MANAGER' ? 'secondary' : 'outline',
        }}
        {...PageHeaderPresets.core}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Information */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" />
            User Information
          </h3>
          <dl className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">Name</dt>
                <dd className="font-medium">{user.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">User Type</dt>
                <dd>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                      userTypeColors[user.userType] || 'bg-gray-100 text-gray-800'
                    )}
                  >
                    {userTypeLabels[user.userType] || user.userType}
                  </span>
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Email Status</dt>
              <dd>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                    user.emailVerifiedAt
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  )}
                >
                  {user.emailVerifiedAt ? 'Verified' : 'Pending Verification'}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Organization */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization
          </h3>
          <dl className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="rounded-lg bg-blue-500 p-2">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Company</dt>
                <dd className="font-medium">{company?.name || 'Not assigned'}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="rounded-lg bg-green-500 p-2">
                <GitBranch className="h-5 w-5 text-white" />
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Branch</dt>
                <dd className="font-medium">{branch?.name || 'Not assigned'}</dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Roles */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Assigned Roles
            <span className="text-sm text-muted-foreground">({user.roles?.length || 0})</span>
          </h3>
          {user.roles && user.roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                >
                  <Shield className="h-3 w-3" />
                  {role}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No roles assigned</p>
          )}
        </div>

        {/* Timeline */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </h3>
          <dl className="space-y-4">
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="text-sm">{new Date(user.createdAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">Last Updated</dt>
              <dd className="text-sm">{new Date(user.updatedAt).toLocaleString()}</dd>
            </div>
            {user.emailVerifiedAt && (
              <div className="flex justify-between items-center">
                <dt className="text-sm text-muted-foreground">Email Verified</dt>
                <dd className="text-sm">{new Date(user.emailVerifiedAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Permissions */}
        {Object.keys(permissionsByModule).length > 0 && (
          <div className="rounded-xl border bg-card p-6 lg:col-span-2">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Key className="h-5 w-5" />
              Permissions
              <span className="text-sm text-muted-foreground">({user.permissions?.length || 0})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module} className="rounded-lg border overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b">
                    <h4 className="text-sm font-medium capitalize flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      {module}
                      <span className="text-xs text-muted-foreground">({perms.length})</span>
                    </h4>
                  </div>
                  <div className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {perms.map((perm) => (
                        <span
                          key={perm}
                          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"
                        >
                          {perm.split('.').slice(1).join('.') || perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={() => router.push('/core/users')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </button>
      </div>
    </TenantLayout>
  );
}
