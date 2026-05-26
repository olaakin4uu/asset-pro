'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Users,
  Key,
  X,
  Check,
  Info,
  Lock,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, StatCard, StatCardColors, DetailShell, Toolbar, LoadingSpinner, EmptyState } from '@/components/erp';
import { rolesApi } from '@/lib/api/core';
import { useEntityPermissions } from '@/hooks';
import type { Role, BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { useToolbar } from '@/hooks/useToolbar';
import { useDetailTabs } from '@/hooks/useDetailTabs';
import { useDetailSidebar, type SidebarItem } from '@/hooks/useDetailSidebar';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Roles & Permissions' },
];

// ============================================================================
// ROLE SIDEBAR ITEM TYPE
// ============================================================================

interface RoleSidebarItem extends SidebarItem {
  isSystem: boolean;
  permissionsCount: number;
  userCount: number;
}

// ============================================================================
// ROLE DETAIL VIEWER
// ============================================================================

interface RoleDetailViewerProps {
  role: Role | null;
  roles: Role[];
  onClose: () => void;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  onSelectRole: (role: Role) => void;
}

function RoleDetailViewer({ role, roles, onClose, onEdit, onDelete, onSelectRole }: RoleDetailViewerProps) {
  const router = useRouter();

  // Convert roles to sidebar items
  const sidebarItems: RoleSidebarItem[] = roles.map((r) => ({
    id: r.id,
    title: r.name,
    subtitle: r.description || 'No description',
    isSystem: r.isSystem || false,
    permissionsCount: r.permissions?.length || 0,
    userCount: r.userCount || 0,
    badges: r.isSystem
      ? [{ label: 'System', variant: 'default' as const }]
      : undefined,
  }));

  // Sidebar hook for role list navigation
  const sidebar = useDetailSidebar({
    items: sidebarItems,
    selectedId: role?.id,
    searchKeys: ['title', 'subtitle'],
    onItemSelect: (item) => {
      const selectedRole = roles.find((r) => r.id === item.id);
      if (selectedRole) onSelectRole(selectedRole);
    },
  });

  // Tabs hook
  const tabs = useDetailTabs({
    tabs: [
      { id: 'overview', label: 'Overview', icon: Info },
      { id: 'permissions', label: 'Permissions', icon: Lock, badge: role?.permissions?.length || 0 },
    ],
    defaultTab: 'overview',
  });

  // Toolbar hook
  const toolbar = useToolbar({
    entity: role || { id: '', name: '' },
    entityType: 'roles',
    onEdit: (entity) => onEdit(entity as Role),
    onDelete: async (entity) => {
      onDelete(entity as Role);
    },
    onExport: async (format) => {
      console.log(`Exporting role as ${format}`);
      // TODO: Implement export
    },
    onPrint: async (options) => {
      console.log('Printing with options:', options);
      // TODO: Implement print
    },
  });

  // Group permissions by module
  const permissionsByModule = (role?.permissions || []).reduce((acc, perm) => {
    const module = perm.split('.')[0] || 'other';
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {} as Record<string, string[]>);

  if (!role) return null;

  return (
    <DetailShell
      open={!!role}
      onOpenChange={(open) => !open && onClose()}
      title={role.name}
      subtitle={role.description}
      icon={<Shield className="h-5 w-5" />}
      width="xl"
      showCloseButton={false}
      allowFullscreen={false}
      headerActions={
        <Toolbar
          toolbar={toolbar}
          onClose={onClose}
          showBookmark={false}
          showFavorite={false}
          showPrint={false}
          showDelete={!role.isSystem}
        />
      }
    >
      <DetailShell.Layout>
        <DetailShell.Body>
          {/* Sidebar with roles list */}
          <DetailShell.Sidebar
            collapsed={sidebar.isCollapsed}
            onToggle={sidebar.toggleSidebar}
            width="280px"
          >
            <div className="flex flex-col h-full">
              {/* Search */}
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search roles..."
                    value={sidebar.searchQuery}
                    onChange={(e) => sidebar.setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Roles list */}
              <div className="flex-1 overflow-auto p-2">
                {sidebar.displayedItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => sidebar.selectItem(item)}
                    className={cn(
                      'w-full rounded-lg p-3 text-left transition-colors mb-1',
                      sidebar.isSelected(item)
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'rounded-lg p-2',
                        sidebar.isSelected(item) ? 'bg-primary/20' : 'bg-muted'
                      )}>
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          {item.isSystem && (
                            <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 text-[10px] font-medium">
                              System
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {item.permissionsCount} permissions
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {item.userCount} users
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                {sidebar.displayedItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No roles found
                  </div>
                )}
              </div>
            </div>
          </DetailShell.Sidebar>

          {/* Main content area */}
          <DetailShell.Main>
            {/* Tabs */}
            <DetailShell.Tabs>
              {tabs.visibleTabs.map((tab) => (
                <DetailShell.Tab
                  key={tab.id}
                  active={tabs.isActive(tab.id)}
                  onClick={() => tabs.setActiveTab(tab.id)}
                  icon={tab.icon}
                  badge={tab.badge}
                >
                  {tab.label}
                </DetailShell.Tab>
              ))}
            </DetailShell.Tabs>

            {/* Content */}
            <DetailShell.Content>
              {/* Overview Tab */}
              {tabs.activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Role Info Card */}
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-4">Role Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium">{role.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Type</p>
                        <p>
                          {role.isSystem ? (
                            <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-0.5 text-xs font-medium">
                              System Role
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-0.5 text-xs font-medium">
                              Custom Role
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Description</p>
                        <p className="text-sm">{role.description || 'No description provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-900/20">
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
                    <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-500 p-2">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {role.userCount || 0}
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">Users Assigned</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-3">Timeline</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span>{new Date(role.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Updated</span>
                        <span>{new Date(role.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Permissions Tab */}
              {tabs.activeTab === 'permissions' && (
                <div className="space-y-4">
                  {Object.keys(permissionsByModule).length > 0 ? (
                    Object.entries(permissionsByModule).map(([module, perms]) => (
                      <div key={module} className="rounded-lg border overflow-hidden">
                        <div className="bg-muted/50 px-4 py-2 border-b">
                          <h4 className="text-sm font-medium capitalize flex items-center gap-2">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            {module}
                            <span className="text-xs text-muted-foreground">({perms.length})</span>
                          </h4>
                        </div>
                        <div className="p-4">
                          <div className="flex flex-wrap gap-2">
                            {perms.map((perm) => (
                              <span
                                key={perm}
                                className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-0.5 text-xs font-medium"
                              >
                                <Check className="h-3 w-3" />
                                {perm.split('.').slice(1).join('.') || perm}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 rounded-lg border">
                      <Lock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No permissions assigned to this role</p>
                    </div>
                  )}
                </div>
              )}
            </DetailShell.Content>
          </DetailShell.Main>
        </DetailShell.Body>
      </DetailShell.Layout>
    </DetailShell>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function RolesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('core', 'roles');
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch roles with TanStack Query
  const { data: rolesData, isLoading: loading, error: rolesFetchError } = useQuery({
    queryKey: ['core-roles', page, search],
    queryFn: () => rolesApi.list({
      page,
      limit: 10,
      search: search || undefined,
      includePermissions: true,
    }),
  });

  const roles = rolesData?.data ?? [];
  const totalPages = rolesData?.totalPages ?? 1;
  const error = rolesFetchError ? extractErrorMessage(rolesFetchError, 'Failed to load roles') : null;

  // Calculate stats from fetched data
  const stats = useMemo(() => {
    const systemRoles = roles.filter((r) => r.isSystem).length;
    return {
      total: rolesData?.total ?? 0,
      systemRoles,
      customRoles: (rolesData?.total ?? 0) - systemRoles,
    };
  }, [roles, rolesData?.total]);

  const handleDelete = async () => {
    if (!selectedRole) return;
    try {
      await rolesApi.delete(selectedRole.id);
      setSelectedRole(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['core-roles'] });
    } catch (err) {
      console.error('Failed to delete role:', err);
    }
  };

  // Page actions
  const pageActions = [
    ...(canCreate ? [{
      id: 'create',
      label: 'Add Role',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => router.push('/core/roles/create'),
    }] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Shield}
        title="Roles & Permissions"
        description="Manage user roles and access permissions"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Total Roles"
          value={stats.total}
          icon={Shield}
          color={StatCardColors.blue}
        />
        <StatCard
          title="System Roles"
          value={stats.systemRoles}
          icon={Key}
          color={StatCardColors.purple}
        />
        <StatCard
          title="Custom Roles"
          value={stats.customRoles}
          icon={Users}
          color={StatCardColors.green}
        />
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search roles..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <LoadingSpinner tableRow colSpan={6} />
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-red-500">{error}</td>
                </tr>
              ) : roles.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Shield}
                      title="No roles found"
                      description="Try adjusting your search or create a new role."
                      action={canCreate ? { label: 'Add Role', onClick: () => router.push('/core/roles/create'), icon: Plus } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <p className="font-medium">{role.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {role.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                        <Key className="h-3 w-3" />
                        {role.permissions?.length || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium">
                        <Users className="h-3 w-3" />
                        {role.userCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {role.isSystem ? (
                        <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-0.5 text-xs font-medium">
                          System
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-0.5 text-xs font-medium">
                          Custom
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedRole(role)}
                          className="rounded-lg p-2 hover:bg-muted transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/core/roles/${role.id}/edit`)}
                          className="rounded-lg p-2 hover:bg-muted transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {!role.isSystem && (
                          <button
                            onClick={() => {
                              setSelectedRole(role);
                              setShowDeleteConfirm(true);
                            }}
                            className="rounded-lg p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Viewer */}
      <RoleDetailViewer
        role={showDeleteConfirm ? null : selectedRole}
        roles={roles}
        onClose={() => setSelectedRole(null)}
        onEdit={(role) => router.push(`/core/roles/${role.id}/edit`)}
        onDelete={(role) => {
          setSelectedRole(role);
          setShowDeleteConfirm(true);
        }}
        onSelectRole={setSelectedRole}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-background border shadow-lg m-4 p-6">
            <h3 className="text-lg font-semibold">Delete Role</h3>
            <p className="mt-2 text-muted-foreground">
              Are you sure you want to delete "{selectedRole.name}"? This action cannot be undone.
            </p>
            {selectedRole.userCount && selectedRole.userCount > 0 && (
              <p className="mt-2 text-sm text-red-600">
                Warning: {selectedRole.userCount} users are assigned to this role.
              </p>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
