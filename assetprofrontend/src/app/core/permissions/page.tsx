'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Key,
  Search,
  Shield,
  ChevronDown,
  ChevronRight,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Check,
  Settings,
  FileText,
  Download,
  Filter,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, StatCard, StatCardsGrid, StatCardColors, LoadingSpinner, EmptyState } from '@/components/erp';
import { permissionsApi, rolesApi } from '@/lib/api/core';
import type { Permission, GroupedPermissions, Role, BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Permission Matrix' },
];

// ============================================================================
// PERMISSION ACTION ICONS
// ============================================================================

const actionIcons: Record<string, typeof Eye> = {
  view: Eye,
  list: Eye,
  read: Eye,
  create: Plus,
  store: Plus,
  add: Plus,
  edit: Pencil,
  update: Pencil,
  modify: Pencil,
  delete: Trash2,
  remove: Trash2,
  destroy: Trash2,
  approve: Check,
  manage: Settings,
  export: Download,
  access: Key,
};

const actionColors: Record<string, string> = {
  view: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  list: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  read: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  store: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  add: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  edit: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  update: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  modify: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  remove: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  destroy: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  approve: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  manage: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  export: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  access: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

// ============================================================================
// HELPERS
// ============================================================================

function getActionFromPermission(permissionName: string): string {
  const parts = permissionName.split('.');
  return parts[parts.length - 1] || 'access';
}

function getActionIcon(action: string): typeof Eye {
  const lowerAction = action.toLowerCase();
  return actionIcons[lowerAction] || Key;
}

function getActionColor(action: string): string {
  const lowerAction = action.toLowerCase();
  return actionColors[lowerAction] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function PermissionMatrixPage() {
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch permissions with TanStack Query
  const { data: groupedPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['core-permissions-grouped'],
    queryFn: () => permissionsApi.listGrouped(),
  });

  // Fetch roles with TanStack Query
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['core-roles-ref'],
    queryFn: () => rolesApi.list({ limit: 100 }),
  });

  const roles = rolesData?.data ?? [];
  const loading = permissionsLoading || rolesLoading;

  // Expand all modules by default once data is loaded
  useMemo(() => {
    if (groupedPermissions && expandedModules.size === 0) {
      setExpandedModules(new Set(Object.keys(groupedPermissions.data)));
    }
  }, [groupedPermissions]);

  // Get list of modules for filter
  const modules = useMemo(() => {
    if (!groupedPermissions) return [];
    return Object.keys(groupedPermissions.data).sort();
  }, [groupedPermissions]);

  // Filter permissions based on search and module filter
  const filteredData = useMemo(() => {
    if (!groupedPermissions) return {};

    const filtered: Record<string, Record<string, Permission[]>> = {};

    Object.entries(groupedPermissions.data).forEach(([module, categories]) => {
      // Apply module filter
      if (filterModule && module !== filterModule) return;

      const filteredCategories: Record<string, Permission[]> = {};

      Object.entries(categories).forEach(([category, permissions]) => {
        // Apply search filter
        const filteredPerms = permissions.filter((p) => {
          if (!search) return true;
          const searchLower = search.toLowerCase();
          return (
            p.name.toLowerCase().includes(searchLower) ||
            (p.description?.toLowerCase().includes(searchLower))
          );
        });

        if (filteredPerms.length > 0) {
          filteredCategories[category] = filteredPerms;
        }
      });

      if (Object.keys(filteredCategories).length > 0) {
        filtered[module] = filteredCategories;
      }
    });

    return filtered;
  }, [groupedPermissions, search, filterModule]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!groupedPermissions) return { total: 0, modules: 0, categories: 0 };

    let totalCategories = 0;
    Object.values(groupedPermissions.data).forEach((categories) => {
      totalCategories += Object.keys(categories).length;
    });

    return {
      total: groupedPermissions.total,
      modules: groupedPermissions.moduleCount,
      categories: totalCategories,
    };
  }, [groupedPermissions]);

  // Toggle module expansion
  const toggleModule = (module: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  // Toggle category expansion
  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Expand/collapse all
  const expandAll = () => {
    setExpandedModules(new Set(Object.keys(filteredData)));
    const allCategories = new Set<string>();
    Object.entries(filteredData).forEach(([module, categories]) => {
      Object.keys(categories).forEach((category) => {
        allCategories.add(`${module}-${category}`);
      });
    });
    setExpandedCategories(allCategories);
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
    setExpandedCategories(new Set());
  };

  const pageActions = [
    {
      id: 'expand',
      label: 'Expand All',
      icon: ChevronDown,
      variant: 'outline' as const,
      onClick: expandAll,
    },
    {
      id: 'collapse',
      label: 'Collapse All',
      icon: ChevronRight,
      variant: 'outline' as const,
      onClick: collapseAll,
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Key}
        title="Permission Matrix"
        description="View all system permissions organized by module"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      {/* Stats */}
      <StatCardsGrid columns={4} className="mb-6">
        <StatCard
          title="Total Permissions"
          value={stats.total}
          icon={Key}
          color={StatCardColors.blue}
        />
        <StatCard
          title="Modules"
          value={stats.modules}
          icon={FileText}
          color={StatCardColors.purple}
        />
        <StatCard
          title="Categories"
          value={stats.categories}
          icon={Filter}
          color={StatCardColors.green}
        />
        <StatCard
          title="Roles"
          value={roles.length}
          icon={Shield}
          color={StatCardColors.orange}
        />
      </StatCardsGrid>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm bg-background"
            />
          </div>

          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm bg-background"
          >
            <option value="">All Modules</option>
            {modules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
        <LoadingSpinner fullPage />
      ) : Object.keys(filteredData).length === 0 ? (
          <EmptyState
            icon={Key}
            title="No permissions found"
            description="Try adjusting your search or module filter."
          />
        ) : (
          <div className="divide-y">
            {Object.entries(filteredData).map(([module, categories]) => {
              const isModuleExpanded = expandedModules.has(module);
              const modulePermCount = Object.values(categories).reduce(
                (acc, perms) => acc + perms.length,
                0
              );

              return (
                <div key={module}>
                  {/* Module Header */}
                  <button
                    onClick={() => toggleModule(module)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isModuleExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-semibold">{module}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {modulePermCount} permissions
                    </span>
                  </button>

                  {/* Module Content */}
                  {isModuleExpanded && (
                    <div className="pl-8 divide-y">
                      {Object.entries(categories).map(([category, permissions]) => {
                        const categoryKey = `${module}-${category}`;
                        const isCategoryExpanded = expandedCategories.has(categoryKey);

                        return (
                          <div key={categoryKey}>
                            {/* Category Header */}
                            <button
                              onClick={() => toggleCategory(categoryKey)}
                              className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isCategoryExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="font-medium text-sm">{category}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {permissions.length} permissions
                              </span>
                            </button>

                            {/* Permissions List */}
                            {isCategoryExpanded && (
                              <div className="pl-6 py-2 space-y-1.5">
                                {permissions.map((permission) => {
                                  const action = getActionFromPermission(permission.name);
                                  const ActionIcon = getActionIcon(action);
                                  const colorClass = getActionColor(action);

                                  return (
                                    <div
                                      key={permission.id}
                                      className="flex items-center justify-between px-4 py-2 rounded-lg bg-muted/30"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span
                                          className={cn(
                                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                                            colorClass
                                          )}
                                        >
                                          <ActionIcon className="h-3 w-3" />
                                          {action}
                                        </span>
                                        <div>
                                          <p className="text-sm font-medium font-mono">
                                            {permission.name}
                                          </p>
                                          {permission.description && (
                                            <p className="text-xs text-muted-foreground">
                                              {permission.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {permission.guardName && (
                                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                            {permission.guardName}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Roles with Permissions Summary */}
      {roles.length > 0 && (
        <div className="mt-6 rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles Overview
              <span className="text-sm font-normal text-muted-foreground">
                ({roles.length} roles)
              </span>
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'rounded-lg p-2',
                        role.isSystem
                          ? 'bg-purple-100 dark:bg-purple-900/30'
                          : 'bg-green-100 dark:bg-green-900/30'
                      )}
                    >
                      <Shield
                        className={cn(
                          'h-4 w-4',
                          role.isSystem
                            ? 'text-purple-700 dark:text-purple-400'
                            : 'text-green-700 dark:text-green-400'
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{role.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {role.isSystem ? 'System Role' : 'Custom Role'}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-primary">
                    {role.permissions?.length || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  );
}
