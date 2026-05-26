'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { Users, ArrowLeft, Save, X, Eye, EyeOff } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { usersApi, rolesApi } from '@/lib/api/core';
import { useCompanyContext } from '@/stores/company-context';
import type { CreateUserDto, Role, BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage} from '@/lib/utils';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Users', href: '/core/users' },
  { title: 'Create User' },
];

// ============================================================================
// FORM TABS
// ============================================================================

const tabs = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'organization', label: 'Organization' },
  { id: 'roles', label: 'Roles & Access' },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function CreateUserPage() {
  const router = useRouter();
  const {
    branches: branchOptions,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  // Get current company and accessible branches from context
  const { companyId, accessibleBranches } = useCompanyContext();

  // Form state - companyId is set from context
  const [formData, setFormData] = useState<CreateUserDto>({
    name: '',
    email: '',
    password: '',
    userType: 'EMPLOYEE',
    companyId: companyId,
    branchId: undefined,
    roleIds: [],
  });

  // Load roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const rolesRes = await rolesApi.list({ limit: 100 });
        setRoles(rolesRes.data);
      } catch (err) {
        console.error('Failed to load roles:', err);
      }
    };
    loadRoles();
  }, []);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Toggle role
  const toggleRole = (roleId: number) => {
    setFormData((prev) => ({
      ...prev,
      roleIds: prev.roleIds?.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...(prev.roleIds || []), roleId],
    }));
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

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
      setLoading(true);
      // Use companyId from context
      await usersApi.create({
        ...formData,
        companyId: companyId,
        branchId: selectedBranchId,
      });
      useFlashStore.getState().setFlash('Saved successfully');
      router.push('/core/users');
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to create user');
      setErrors({ submit: message });
    } finally {
      setLoading(false);
    }
  };

  // Page actions
  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/core/users'),
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Users}
        title="Create User"
        description="Add a new user to your organization"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />
      <BranchSelector
        branches={branchOptions}
        value={selectedBranchId}
        onChange={setSelectedBranchId}
        hasSingleBranch={hasSingleBranch}
        className="mb-4"
      />

      <div className="mx-auto">
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
                  {tab.id === 'roles' && formData.roleIds && formData.roleIds.length > 0 && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                      {formData.roleIds.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
              {errors.submit}
            </div>
          )}

          {/* Tab Content */}
          <div className="rounded-xl border bg-card p-6">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      aria-required="true"
                      aria-invalid={!!errors.name}
                      type="text"
                      name="name"
                      id="name" value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter full name"
                      className={cn(
                        'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                        errors.name && 'border-red-500'
                      )}
                    />
                    {errors.name && <p id="name-error" role="alert" className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      aria-required="true"
                      aria-invalid={!!errors.email}
                      type="email"
                      name="email"
                      id="email" value={formData.email}
                      onChange={handleChange}
                      placeholder="user@example.com"
                      className={cn(
                        'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                        errors.email && 'border-red-500'
                      )}
                    />
                    {errors.email && <p id="email-error" role="alert" className="mt-1 text-sm text-red-500">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        aria-required="true"
                        aria-invalid={!!errors.password}
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        id="password" value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter password"
                        className={cn(
                          'w-full rounded-lg border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary',
                          errors.password && 'border-red-500'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p id="password-error" role="alert" className="mt-1 text-sm text-red-500">{errors.password}</p>}
                  </div>

                  <div>
                    <label htmlFor="userType" className="block text-sm font-medium mb-2">User Type</label>
                    <select
                      name="userType"
                      id="userType" value={formData.userType}
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="ADMIN">Admin</option>
                      <option value="EXTERNAL">External</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Organization Tab */}
            {activeTab === 'organization' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Branch Selector (from accessible branches) */}
                  <div>
                    <label htmlFor="branchId" className="block text-sm font-medium mb-2">Branch</label>
                    <select
                      name="branchId"
                      id="branchId" value={formData.branchId || ''}
                      onChange={handleChange}
                      disabled={accessibleBranches.length === 0}
                      className={cn(
                        'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                        accessibleBranches.length === 0 && 'bg-muted cursor-not-allowed'
                      )}
                    >
                      <option value="">Select a branch (optional)</option>
                      {accessibleBranches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                          {branch.isHeadOffice && ' (HQ)'}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {accessibleBranches.length > 0
                        ? `${accessibleBranches.length} branch${accessibleBranches.length > 1 ? 'es' : ''} available`
                        : 'No branches available'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Roles Tab */}
            {activeTab === 'roles' && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Select the roles to assign to this user. Roles determine what permissions the user has in the system.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roles.map((role) => {
                    const isSelected = formData.roleIds?.includes(role.id);
                    return (
                      <label
                        key={role.id}
                        className={cn(
                          'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRole(role.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{role.name}</p>
                            {role.isSystem && (
                              <span className="rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 text-xs">
                                System
                              </span>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                          )}
                          {role.permissions && role.permissions.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {role.permissions.length} permissions
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {roles.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No roles available. Create roles first.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="mt-6 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/core/users')}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Create User
            </button>
          </div>
        </form>
      </div>
    </TenantLayout>
  );
}
