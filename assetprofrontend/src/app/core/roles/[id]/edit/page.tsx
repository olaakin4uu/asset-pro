'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Shield,
  ArrowLeft,
  Save,
  X,
  Search,
  Eye,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Filter,
  Download,
  Loader2,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { rolesApi, permissionsApi } from '@/lib/api/core';
import type { Role, UpdateRoleDto, Permission, BreadcrumbItem, GroupedPermissions } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// FORM TABS
// ============================================================================

const tabs = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'permissions', label: 'Permissions' },
];

// ============================================================================
// ACTION CONFIG - Colors and Icons for each action type (matching create page)
// ============================================================================

const actionConfig: Record<string, { icon: typeof Eye; color: string; bgColor: string; borderColor: string; label: string }> = {
  view:    { icon: Eye,          color: 'text-blue-600',   bgColor: 'bg-blue-100',   borderColor: 'border-blue-300',   label: 'View' },
  create:  { icon: Plus,         color: 'text-green-600',  bgColor: 'bg-green-100',  borderColor: 'border-green-300',  label: 'Create' },
  edit:    { icon: Pencil,       color: 'text-amber-600',  bgColor: 'bg-amber-100',  borderColor: 'border-amber-300',  label: 'Edit' },
  delete:  { icon: Trash2,       color: 'text-red-600',    bgColor: 'bg-red-100',    borderColor: 'border-red-300',    label: 'Delete' },
  approve: { icon: CheckCircle,  color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-300', label: 'Approve' },
  manage:  { icon: ShieldCheck,  color: 'text-indigo-600', bgColor: 'bg-indigo-100', borderColor: 'border-indigo-300', label: 'Manage' },
  export:  { icon: Download,     color: 'text-cyan-600',   bgColor: 'bg-cyan-100',   borderColor: 'border-cyan-300',   label: 'Export' },
  access:  { icon: Shield,       color: 'text-gray-600',   bgColor: 'bg-gray-100',   borderColor: 'border-gray-300',   label: 'Access' },
};

function getActionFromPermission(permissionName: string): string {
  return permissionName.split(' ')[0];
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function EditRolePage() {
  const router = useRouter();
  const { branches, selectedBranchId, setSelectedBranchId, hasSingleBranch } = useBranchAccess();
  const params = useParams();
  const roleId = Number(params.id);

  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [role, setRole] = useState<Role | null>(null);

  // Permissions state (mirrors create page)
  const [groupedPermissions, setGroupedPermissions] = useState<GroupedPermissions | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  // UI state
  const [permissionSearch, setPermissionSearch] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [moduleFilter, setModuleFilter] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState<UpdateRoleDto>({
    name: '',
    description: '',
    permissionIds: [],
  });

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Administration', href: '/core' },
    { title: 'Roles & Permissions', href: '/core/roles' },
    { title: role?.name || 'Edit Role' },
  ];

  // Load role data
  useEffect(() => {
    const loadRole = async () => {
      try {
        setLoading(true);
        const [roleData, rolePermissions] = await Promise.all([
          rolesApi.get(roleId),
          rolesApi.getPermissions(roleId),
        ]);
        setRole(roleData);
        setFormData({
          name: roleData.name || '',
          description: roleData.description || '',
          permissionIds: rolePermissions.map((p) => p.id),
        });
      } catch (err: unknown) {
        setErrors({ load: extractErrorMessage(err, 'Failed to load role') });
      } finally {
        setLoading(false);
      }
    };
    if (roleId) loadRole();
  }, [roleId]);

  // Load permissions grouped by Module → Category (same as create page)
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        setPermissionsLoading(true);
        setPermissionsError(null);

        const response = await permissionsApi.listGrouped();
        setGroupedPermissions(response);

        // Flatten all permissions for quick lookup
        const allPerms: Permission[] = [];
        if (response.data) {
          Object.values(response.data).forEach((categories) => {
            Object.values(categories).forEach((perms) => {
              allPerms.push(...perms);
            });
          });
        }
        setAllPermissions(allPerms);

        // Expand all modules by default
        if (response.data) {
          setExpandedModules(new Set(Object.keys(response.data)));
        }
      } catch (err: unknown) {
        setPermissionsError(extractErrorMessage(err, 'Failed to load permissions'));
      } finally {
        setPermissionsLoading(false);
      }
    };
    loadPermissions();
  }, []);

  // Get all modules
  const modules = useMemo(() => {
    if (!groupedPermissions?.data) return [];
    return Object.keys(groupedPermissions.data).sort();
  }, [groupedPermissions]);

  // Filter modules based on search and filter
  const filteredModules = useMemo(() => {
    if (!groupedPermissions?.data) return {};

    let result = groupedPermissions.data;

    if (moduleFilter.size > 0) {
      result = Object.fromEntries(
        Object.entries(result).filter(([module]) => moduleFilter.has(module))
      );
    }

    if (permissionSearch) {
      const search = permissionSearch.toLowerCase();
      const filtered: typeof result = {};

      Object.entries(result).forEach(([module, categories]) => {
        const filteredCategories: typeof categories = {};

        Object.entries(categories).forEach(([category, perms]) => {
          const matchingPerms = perms.filter(
            (p) =>
              p.name.toLowerCase().includes(search) ||
              category.toLowerCase().includes(search) ||
              module.toLowerCase().includes(search)
          );
          if (matchingPerms.length > 0) {
            filteredCategories[category] = matchingPerms;
          }
        });

        if (Object.keys(filteredCategories).length > 0) {
          filtered[module] = filteredCategories;
        }
      });

      result = filtered;
    }

    return result;
  }, [groupedPermissions, moduleFilter, permissionSearch]);

  // Permission helpers (mirrors create page)
  const isPermissionSelected = (permId: number) =>
    (formData.permissionIds || []).includes(permId);

  const togglePermission = (permId: number) => {
    setFormData((prev) => ({
      ...prev,
      permissionIds: (prev.permissionIds || []).includes(permId)
        ? (prev.permissionIds || []).filter((id) => id !== permId)
        : [...(prev.permissionIds || []), permId],
    }));
  };

  const getModulePermissionIds = (categories: Record<string, Permission[]>) => {
    const ids: number[] = [];
    Object.values(categories).forEach((perms) => ids.push(...perms.map((p) => p.id)));
    return ids;
  };

  const setCategoryReadOnly = (permissions: Permission[]) => {
    const viewPerms = permissions.filter((p) => getActionFromPermission(p.name) === 'view');
    const otherPerms = permissions.filter((p) => getActionFromPermission(p.name) !== 'view');
    const otherIds = otherPerms.map((p) => p.id);
    const viewIds = viewPerms.map((p) => p.id);
    setFormData((prev) => ({
      ...prev,
      permissionIds: [
        ...(prev.permissionIds || []).filter((id) => !otherIds.includes(id)),
        ...viewIds.filter((id) => !(prev.permissionIds || []).includes(id)),
      ],
    }));
  };

  const setCategoryFullAccess = (permissions: Permission[]) => {
    const ids = permissions.map((p) => p.id);
    setFormData((prev) => ({
      ...prev,
      permissionIds: [...new Set([...(prev.permissionIds || []), ...ids])],
    }));
  };

  const clearCategoryPermissions = (permissions: Permission[]) => {
    const ids = permissions.map((p) => p.id);
    setFormData((prev) => ({
      ...prev,
      permissionIds: (prev.permissionIds || []).filter((id) => !ids.includes(id)),
    }));
  };

  const setModuleReadOnly = (categories: Record<string, Permission[]>) => {
    Object.values(categories).forEach((perms) => setCategoryReadOnly(perms));
  };

  const setModuleFullAccess = (categories: Record<string, Permission[]>) => {
    const ids = getModulePermissionIds(categories);
    setFormData((prev) => ({
      ...prev,
      permissionIds: [...new Set([...(prev.permissionIds || []), ...ids])],
    }));
  };

  const clearModulePermissions = (categories: Record<string, Permission[]>) => {
    const ids = getModulePermissionIds(categories);
    setFormData((prev) => ({
      ...prev,
      permissionIds: (prev.permissionIds || []).filter((id) => !ids.includes(id)),
    }));
  };

  const selectAllPermissions = () => {
    setFormData((prev) => ({ ...prev, permissionIds: allPermissions.map((p) => p.id) }));
  };

  const selectAllReadOnly = () => {
    const viewPerms = allPermissions.filter((p) => getActionFromPermission(p.name) === 'view');
    setFormData((prev) => ({ ...prev, permissionIds: viewPerms.map((p) => p.id) }));
  };

  const clearAllPermissions = () => {
    setFormData((prev) => ({ ...prev, permissionIds: [] }));
  };

  const toggleModuleExpand = (module: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(module)) newSet.delete(module);
      else newSet.add(module);
      return newSet;
    });
  };

  const toggleModuleFilter = (module: string) => {
    setModuleFilter((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(module)) newSet.delete(module);
      else newSet.add(module);
      return newSet;
    });
  };

  const getModuleSelectedCount = (categories: Record<string, Permission[]>) => {
    const ids = getModulePermissionIds(categories);
    return ids.filter((id) => (formData.permissionIds || []).includes(id)).length;
  };

  const getCategorySelectedCount = (permissions: Permission[]) =>
    permissions.filter((p) => (formData.permissionIds || []).includes(p.id)).length;

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = 'Role name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setActiveTab('basic');
      return;
    }
    try {
      setSaving(true);
      await rolesApi.update(roleId, { ...formData, branchId: selectedBranchId });
      if (formData.permissionIds) {
        await rolesApi.assignPermissions(roleId, formData.permissionIds);
      }
      router.push('/core/roles');
    } catch (err: unknown) {
      setErrors({ submit: extractErrorMessage(err, 'Failed to update role') });
    } finally {
      setSaving(false);
    }
  };

  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/core/roles'),
    },
  ];

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading role...</span>
          </div>
        </div>
      </TenantLayout>
    );
  }

  if (errors.load) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-red-600">{errors.load}</p>
            <button
              onClick={() => router.push('/core/roles')}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Return to Roles
            </button>
          </div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Shield}
        title={`Edit: ${role?.name}`}
        description={role?.isSystem ? 'System role - some settings may be restricted' : 'Update role settings and permissions'}
        actions={pageActions}
        {...PageHeaderPresets.core}
      />
      <BranchSelector
        branches={branches}
        value={selectedBranchId}
        onChange={setSelectedBranchId}
        hasSingleBranch={hasSingleBranch}
        className="mb-4"
      />

      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit}>
          {/* Tabs */}
          <div className="mb-6 border-b">
            <div className="flex gap-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                  {tab.id === 'permissions' && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                      {formData.permissionIds?.length || 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* System Role Warning */}
          {role?.isSystem && (
            <div className="mb-6 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 text-yellow-700 dark:text-yellow-400">
              This is a system role. The role name cannot be changed.
            </div>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
              {errors.submit}
            </div>
          )}

          {/* Tab Content */}
          <div className="rounded-xl border bg-card">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className="p-6 space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Role Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    aria-required="true"
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Sales Manager"
                    disabled={role?.isSystem}
                    className={cn(
                      'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                      errors.name && 'border-red-500',
                      role?.isSystem && 'bg-muted cursor-not-allowed'
                    )}
                  />
                  {errors.name && (
                    <p id="name-error" role="alert" className="mt-1 text-sm text-red-500">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe what this role is for..."
                    rows={3}
                    className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {role && (
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Role Statistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-2xl font-bold">{role.usersCount || 0}</p>
                        <p className="text-sm text-muted-foreground">Users assigned</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="text-2xl font-bold">{formData.permissionIds?.length || 0}</p>
                        <p className="text-sm text-muted-foreground">Permissions</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Permissions Tab */}
            {activeTab === 'permissions' && (
              <div className="p-6 space-y-6">
                {/* Module Filter Bar */}
                <div className="flex flex-wrap items-center gap-2 pb-4 border-b">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground mr-2">Filter:</span>
                  {modules.map((module) => (
                    <button
                      key={module}
                      type="button"
                      onClick={() => toggleModuleFilter(module)}
                      className={cn(
                        'px-3 py-1 text-xs rounded-full border transition-colors',
                        moduleFilter.has(module)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border'
                      )}
                    >
                      {module}
                    </button>
                  ))}
                  {moduleFilter.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setModuleFilter(new Set())}
                      className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear filter
                    </button>
                  )}
                </div>

                {/* Search and Quick Actions */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search permissions..."
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllReadOnly}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                      title="Select only view permissions"
                    >
                      <Eye className="h-4 w-4 text-blue-500" />
                      Read-Only
                    </button>
                    <button
                      type="button"
                      onClick={selectAllPermissions}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                      title="Select all permissions"
                    >
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      Full Access
                    </button>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                      title="Clear all permissions"
                    >
                      <X className="h-4 w-4 text-red-500" />
                      Clear
                    </button>
                  </div>
                </div>

                {/* Loading State */}
                {permissionsLoading && (
                  <div className="text-center py-12">
                    <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="mt-2 text-muted-foreground">Loading permissions...</p>
                  </div>
                )}

                {/* Error State */}
                {permissionsError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
                    {permissionsError}
                  </div>
                )}

                {/* Permissions by Module → Category */}
                {!permissionsLoading && !permissionsError && (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {Object.entries(filteredModules).map(([module, categories]) => {
                      const modulePermCount = getModulePermissionIds(categories).length;
                      const moduleSelectedCount = getModuleSelectedCount(categories);
                      const isExpanded = expandedModules.has(module);

                      return (
                        <div key={module} className="rounded-lg border">
                          {/* Module Header */}
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleModuleExpand(module)}
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                              <span className="font-semibold">{module}</span>
                              <span className="text-sm text-muted-foreground">
                                ({moduleSelectedCount}/{modulePermCount})
                              </span>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setModuleReadOnly(categories)}
                                className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
                                title="Read-only"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setModuleFullAccess(categories)}
                                className="p-1.5 rounded hover:bg-green-100 text-green-600"
                                title="Full access"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => clearModulePermissions(categories)}
                                className="p-1.5 rounded hover:bg-red-100 text-red-600"
                                title="Clear"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Module Categories */}
                          {isExpanded && (
                            <div className="border-t">
                              {Object.entries(categories).map(([category, permissions]) => {
                                const categorySelectedCount = getCategorySelectedCount(permissions);

                                return (
                                  <div key={category} className="border-b last:border-b-0">
                                    {/* Category Header */}
                                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{category}</span>
                                        <span className="text-xs text-muted-foreground">
                                          ({categorySelectedCount}/{permissions.length})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => setCategoryReadOnly(permissions)}
                                          className="p-1 rounded hover:bg-blue-100 text-blue-600"
                                          title="Read-only"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setCategoryFullAccess(permissions)}
                                          className="p-1 rounded hover:bg-green-100 text-green-600"
                                          title="Full access"
                                        >
                                          <ShieldCheck className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => clearCategoryPermissions(permissions)}
                                          className="p-1 rounded hover:bg-red-100 text-red-600"
                                          title="Clear"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Permission Action Buttons */}
                                    <div className="px-4 py-3 flex flex-wrap gap-2">
                                      {permissions.map((perm) => {
                                        const action = getActionFromPermission(perm.name);
                                        const config = actionConfig[action] || actionConfig.view;
                                        const Icon = config.icon;
                                        const isSelected = isPermissionSelected(perm.id);

                                        return (
                                          <button
                                            key={perm.id}
                                            type="button"
                                            onClick={() => togglePermission(perm.id)}
                                            className={cn(
                                              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-all',
                                              isSelected
                                                ? `${config.bgColor} ${config.borderColor} ${config.color}`
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                                            )}
                                            title={perm.name}
                                          >
                                            <Icon className="h-3.5 w-3.5" />
                                            {config.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {Object.keys(filteredModules).length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        {permissionSearch || moduleFilter.size > 0
                          ? 'No permissions found matching your criteria'
                          : 'No permissions available'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="mt-6 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/core/roles')}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </TenantLayout>
  );
}
