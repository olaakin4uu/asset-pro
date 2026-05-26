'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Upload,
  Search,
  Eye,
  Edit,
  Trash2,
  Shield,
  Building2,
  GitBranch,
  Key,
  Info,
  Mail,
  UserPlus,
} from 'lucide-react';
import { InviteUserModal } from './components/InviteUserModal';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, StatCard, StatCardColors, DetailShell, Toolbar, LoadingSpinner, EmptyState } from '@/components/erp';
import { usersApi, companiesApi, branchesApi } from '@/lib/api/core';
import { useEntityPermissions } from '@/hooks';
import type { User, Company, Branch, BreadcrumbItem, UserType } from '@/types/core';
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
  { title: 'Users' },
];

// ============================================================================
// USER SIDEBAR ITEM TYPE
// ============================================================================

interface UserSidebarItem extends SidebarItem {
  email: string;
  userType: string;
  rolesCount: number;
}

// ============================================================================
// USER DETAIL VIEWER
// ============================================================================

interface UserDetailViewerProps {
  user: User | null;
  users: User[];
  companies: Company[];
  branches: Branch[];
  onClose: () => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onSelectUser: (user: User) => void;
}

function UserDetailViewer({
  user,
  users,
  companies,
  branches,
  onClose,
  onEdit,
  onDelete,
  onSelectUser,
}: UserDetailViewerProps) {
  const router = useRouter();

  // Convert users to sidebar items
  const sidebarItems: UserSidebarItem[] = users.map((u) => ({
    id: u.id,
    title: u.name,
    subtitle: u.email,
    email: u.email,
    userType: u.userType,
    rolesCount: u.roles?.length || 0,
    badges:
      u.userType === 'ADMIN'
        ? [{ label: 'Admin', variant: 'default' as const }]
        : u.userType === 'MANAGER'
        ? [{ label: 'Manager', variant: 'warning' as const }]
        : undefined,
  }));

  // Sidebar hook for user list navigation
  const sidebar = useDetailSidebar({
    items: sidebarItems,
    selectedId: user?.id,
    searchKeys: ['title', 'subtitle', 'email'],
    onItemSelect: (item) => {
      const selectedUser = users.find((u) => u.id === item.id);
      if (selectedUser) onSelectUser(selectedUser);
    },
  });

  // Tabs hook
  const tabs = useDetailTabs({
    tabs: [
      { id: 'overview', label: 'Overview', icon: Info },
      { id: 'roles', label: 'Roles & Permissions', icon: Shield, badge: user?.roles?.length || 0 },
    ],
    defaultTab: 'overview',
  });

  // Toolbar hook
  const toolbar = useToolbar({
    entity: user || { id: '', name: '' },
    entityType: 'users',
    onEdit: (entity) => onEdit(entity as User),
    onDelete: async (entity) => {
      onDelete(entity as User);
    },
    onExport: async (format) => {
      console.log(`Exporting user as ${format}`);
    },
    onPrint: async (options) => {
      console.log('Printing with options:', options);
    },
  });

  // Get company and branch names
  const company = companies.find((c) => c.id === user?.companyId);
  const branch = branches.find((b) => b.id === user?.branchId);

  // Group permissions by module
  const permissionsByModule = (user?.permissions || []).reduce((acc, perm) => {
    const module = perm.split('.')[0] || 'other';
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {} as Record<string, string[]>);

  if (!user) return null;

  return (
    <DetailShell
      open={!!user}
      onOpenChange={(open) => !open && onClose()}
      title={user.name}
      subtitle={user.email}
      icon={
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-semibold text-primary">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
      }
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
        />
      }
    >
      <DetailShell.Layout>
        <DetailShell.Body>
          {/* Sidebar with users list */}
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
                    placeholder="Search users..."
                    value={sidebar.searchQuery}
                    onChange={(e) => sidebar.setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Users list */}
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
                      <div
                        className={cn(
                          'h-9 w-9 rounded-full flex items-center justify-center',
                          sidebar.isSelected(item) ? 'bg-primary/20' : 'bg-muted'
                        )}
                      >
                        <span className="text-sm font-semibold text-primary">
                          {item.title.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          {item.userType === 'ADMIN' && (
                            <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 text-[10px] font-medium">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{item.email}</p>
                      </div>
                    </div>
                  </button>
                ))}

                {sidebar.displayedItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No users found
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
                  {/* User Info Card */}
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-4">User Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium">{user.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">User Type</p>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                            user.userType === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              : user.userType === 'MANAGER'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          )}
                        >
                          {user.userType}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <p className="text-sm">{user.email}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                            user.emailVerifiedAt
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          )}
                        >
                          {user.emailVerifiedAt ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Organization Card */}
                  {(company || branch) && (
                    <div className="rounded-lg border p-4">
                      <h3 className="text-sm font-medium mb-4">Organization</h3>
                      <div className="space-y-4">
                        {company && (
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2">
                              <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Company</p>
                              <p className="font-medium">{company.name}</p>
                            </div>
                          </div>
                        )}
                        {branch && (
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-2">
                              <GitBranch className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Branch</p>
                              <p className="font-medium">{branch.name}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-500 p-2">
                          <Shield className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {user.roles?.length || 0}
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">Roles</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-500 p-2">
                          <Key className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {user.permissions?.length || 0}
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">Permissions</p>
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
                        <span>{new Date(user.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Updated</span>
                        <span>{new Date(user.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Roles & Permissions Tab */}
              {tabs.activeTab === 'roles' && (
                <div className="space-y-6">
                  {/* Roles */}
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-4">Assigned Roles</h3>
                    {user.roles && user.roles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
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

                  {/* Permissions by Module */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Permissions</h3>
                    {Object.keys(permissionsByModule).length > 0 ? (
                      Object.entries(permissionsByModule).map(([module, perms]) => (
                        <div key={module} className="rounded-lg border overflow-hidden">
                          <div className="bg-muted/50 px-4 py-2 border-b">
                            <h4 className="text-sm font-medium capitalize flex items-center gap-2">
                              <Key className="h-4 w-4 text-muted-foreground" />
                              {module}
                              <span className="text-xs text-muted-foreground">({perms.length})</span>
                            </h4>
                          </div>
                          <div className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {perms.map((perm) => (
                                <span
                                  key={perm}
                                  className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs"
                                >
                                  {perm.split('.').slice(1).join('.') || perm}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 rounded-lg border">
                        <Key className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">No direct permissions assigned</p>
                      </div>
                    )}
                  </div>
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

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('core', 'users');
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<number | ''>('');
  const [selectedUserType, setSelectedUserType] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch users with TanStack Query
  const { data: usersData, isLoading: loading, error: usersFetchError } = useQuery({
    queryKey: ['core-users', page, pageSize, search, selectedCompany, selectedUserType],
    queryFn: () => usersApi.list({
      page,
      limit: pageSize,
      search: search || undefined,
      companyId: selectedCompany || undefined,
      userType: (selectedUserType as UserType) || undefined,
    }),
  });

  const users = usersData?.data ?? [];
  const totalPages = usersData?.totalPages ?? 1;
  const error = usersFetchError ? extractErrorMessage(usersFetchError, 'Failed to load users') : null;

  // Calculate stats from fetched data
  const stats = useMemo(() => {
    const admins = users.filter((u) => u.userType === 'ADMIN').length;
    const managers = users.filter((u) => u.userType === 'MANAGER').length;
    const employees = users.filter((u) => u.userType === 'EMPLOYEE').length;
    return {
      total: usersData?.total ?? 0,
      admins,
      managers,
      employees,
    };
  }, [users, usersData?.total]);

  // Fetch reference data (companies + branches)
  const { data: companiesData } = useQuery({
    queryKey: ['core-companies-ref'],
    queryFn: () => companiesApi.list({ limit: 100 }),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['core-branches-ref'],
    queryFn: () => branchesApi.list({ limit: 100 }),
  });

  const companies = companiesData?.data ?? [];
  const branches = branchesData?.data ?? [];

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await usersApi.delete(selectedUser.id);
      setSelectedUser(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['core-users'] });
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const getCompanyName = (companyId?: number) => {
    if (!companyId) return '-';
    const company = companies.find((c) => c.id === companyId);
    return company?.name || 'Unknown';
  };

  const getBranchName = (branchId?: number) => {
    if (!branchId) return '-';
    const branch = branches.find((b) => b.id === branchId);
    return branch?.name || 'Unknown';
  };

  // Page actions
  const pageActions = [
    ...(canCreate ? [{
      id: 'import',
      label: 'Import',
      icon: Upload,
      variant: 'outline' as const,
      onClick: () => router.push('/core/users/import'),
    }] : []),
    ...(canCreate ? [{
      id: 'invite',
      label: 'Invite',
      icon: UserPlus,
      variant: 'outline' as const,
      onClick: () => setShowInviteModal(true),
    }] : []),
    ...(canCreate ? [{
      id: 'create',
      label: 'Add User',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => router.push('/core/users/create'),
    }] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Users}
        title="Users"
        description="Manage system users and their access"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Users"
          value={stats.total}
          icon={Users}
          color={StatCardColors.blue}
        />
        <StatCard
          title="Admins"
          value={stats.admins}
          icon={Shield}
          color={StatCardColors.purple}
        />
        <StatCard
          title="Managers"
          value={stats.managers}
          icon={Users}
          color={StatCardColors.green}
        />
        <StatCard
          title="Employees"
          value={stats.employees}
          icon={Users}
          color={StatCardColors.orange}
        />
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={selectedCompany}
            onChange={(e) => {
              setSelectedCompany(e.target.value ? Number(e.target.value) : '');
              setPage(1);
            }}
            className="rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <select
            value={selectedUserType}
            onChange={(e) => {
              setSelectedUserType(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Types</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Roles
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Users}
                      title="No users found"
                      description="Try adjusting your search or filters, or add a new user."
                      action={canCreate ? { label: 'Add User', onClick: () => router.push('/core/users/create'), icon: Plus } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{getCompanyName(user.companyId)}</td>
                    <td className="px-6 py-4 text-sm">{getBranchName(user.branchId)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          user.userType === 'ADMIN'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : user.userType === 'MANAGER'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        )}
                      >
                        {user.userType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles?.slice(0, 2).map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                          >
                            {role}
                          </span>
                        ))}
                        {user.roles && user.roles.length > 2 && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                            +{user.roles.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="rounded-lg p-2 hover:bg-muted transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/core/users/${user.id}/edit`)}
                          className="rounded-lg p-2 hover:bg-muted transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteConfirm(true);
                          }}
                          className="rounded-lg p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({usersData?.total ?? 0} total)
            </p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Show:</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded-lg border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </div>
          </div>
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
      </div>

      {/* Detail Viewer */}
      <UserDetailViewer
        user={showDeleteConfirm ? null : selectedUser}
        users={users}
        companies={companies}
        branches={branches}
        onClose={() => setSelectedUser(null)}
        onEdit={(user) => router.push(`/core/users/${user.id}/edit`)}
        onDelete={(user) => {
          setSelectedUser(user);
          setShowDeleteConfirm(true);
        }}
        onSelectUser={setSelectedUser}
      />

      {/* Delete Confirmation */}
      <InviteUserModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['core-users'] })}
      />

      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-md rounded-xl bg-background border shadow-lg m-4 p-6">
            <h3 className="text-lg font-semibold">Delete User</h3>
            <p className="mt-2 text-muted-foreground">
              Are you sure you want to delete "{selectedUser.name}"? This action cannot be undone.
            </p>
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
