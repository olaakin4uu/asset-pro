'use client';

import { useRouter, useParams } from 'next/navigation';
import {
  Shield,
  ArrowLeft,
  Pencil,
  Trash2,
  Users,
  Key,
  Lock,
  Info,
  Calendar,
  Check,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { rolesApi } from '@/lib/api/core';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';
import { useEntityFetch } from '@/hooks';

export default function RoleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const roleId = parseInt(params.id as string);

  const { entity: role, loading, error } = useEntityFetch({
    queryKey: 'core-roles',
    id: roleId,
    fetchFn: rolesApi.get,
    errorMessage: 'Failed to load role',
  });

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Administration', href: '/core' },
    { title: 'Roles', href: '/core/roles' },
    { title: role?.name || 'Loading...' },
  ];

  const handleDelete = () => {
    if (!role || role.isSystem) return;
    confirmDialog({
      message: `Are you sure you want to delete "${role.name}"? This action cannot be undone.`,
      header: 'Delete Role',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await rolesApi.delete(role.id);
          router.push('/core/roles');
        } catch (error) {
          console.error('Failed to delete role:', error);
        }
      },
    });
  };

  const getPageActions = () => {
    if (!role) return [];
    const actions: Array<{
      id: string;
      label: string;
      icon: typeof Pencil;
      variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
      onClick: () => void;
    }> = [
      {
        id: 'edit',
        label: 'Edit',
        icon: Pencil,
        variant: 'outline',
        onClick: () => router.push(`/core/roles/${roleId}/edit`),
      },
    ];

    // Only allow delete for custom roles
    if (!role.isSystem) {
      actions.push({
        id: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive',
        onClick: handleDelete,
      });
    }

    return actions;
  };

  // Group permissions by module
  const permissionsByModule = (role?.permissions || []).reduce((acc, perm) => {
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

  if (error || !role) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-500 mb-4">{error || 'Role not found'}</p>
          <button
            onClick={() => router.push('/core/roles')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Roles
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      <PageHeader
        icon={Shield}
        title={role.name}
        description={role.description || undefined}
        actions={getPageActions()}
        badge={{
          text: role.isSystem ? 'System Role' : 'Custom Role',
          variant: role.isSystem ? 'default' : 'secondary',
        }}
        {...PageHeaderPresets.core}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Information */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Role Information
          </h3>
          <dl className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="font-medium">{role.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Type</dt>
                <dd>
                  {role.isSystem ? (
                    <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-0.5 text-xs font-medium">
                      System Role
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-0.5 text-xs font-medium">
                      Custom Role
                    </span>
                  )}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Description</dt>
              <dd className="text-sm">{role.description || 'No description provided'}</dd>
            </div>
            {role.isSystem && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
                <Lock className="inline h-4 w-4 mr-2" />
                This is a system role and cannot be deleted.
              </div>
            )}
          </dl>
        </div>

        {/* Statistics */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500 p-2">
                  <Key className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {role.permissions?.length || 0}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Permissions</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500 p-2">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {role.usersCount || 0}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">Users Assigned</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="text-sm">{new Date(role.createdAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">Last Updated</dt>
              <dd className="text-sm">{new Date(role.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        {/* Role ID */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Information
          </h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-muted-foreground">Role ID</dt>
              <dd className="font-mono text-sm">{role.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Guard Name</dt>
              <dd className="font-mono text-sm">{role.guardName || 'web'}</dd>
            </div>
          </dl>
        </div>

        {/* Permissions */}
        <div className="rounded-xl border bg-card p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Permissions
            <span className="text-sm text-muted-foreground">({role.permissions?.length || 0} total)</span>
          </h3>
          {Object.keys(permissionsByModule).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module} className="rounded-lg border overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b">
                    <h4 className="text-sm font-medium capitalize flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      {module}
                      <span className="text-xs text-muted-foreground">({perms.length})</span>
                    </h4>
                  </div>
                  <div className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {perms.map((perm) => (
                        <span
                          key={perm}
                          className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 text-xs font-medium"
                        >
                          <Check className="h-3 w-3" />
                          {perm.split('.').slice(1).join('.') || perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-lg bg-muted/50">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No permissions assigned to this role</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => router.push('/core/roles')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Roles
        </button>
      </div>
    </TenantLayout>
  );
}
