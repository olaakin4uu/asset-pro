'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Users, ArrowLeft, Save, X, Eye, EyeOff, Loader2, Key, Building2, GitBranch } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { usersApi, branchesApi, rolesApi, companiesApi } from '@/lib/api/core';
import type { User, UpdateUserDto, Branch, Role, Company, BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage} from '@/lib/utils';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// FORM TABS
// ============================================================================

const tabs = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'organization', label: 'Organization' },
  { id: 'roles', label: 'Roles & Access' },
  { id: 'security', label: 'Security' },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function EditUserPage() {
  const router = useRouter();
  const {
    branches: branchOptions,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const userId = Number(params.id);

  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  // allBranchesByCompany: companyId → branches list (for access checkbox panel)
  const [allBranchesByCompany, setAllBranchesByCompany] = useState<Record<number, Branch[]>>({});
  const [roles, setRoles] = useState<Role[]>([]);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Form state
  const [formData, setFormData] = useState<UpdateUserDto>({
    name: '',
    email: '',
    userType: 'EMPLOYEE',
    companyId: undefined,
    branchId: undefined,
    roleIds: [],
    themePreference: 'system',
    accessibleCompanyIds: [],
    accessibleBranchIds: [],
  });

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Administration', href: '/core' },
    { title: 'Users', href: '/core/users' },
    { title: user?.name || 'Edit User' },
  ];

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const userData = await usersApi.get(userId);
        setUser(userData);

        // Get user's role names
        const userRoleNames = await usersApi.getRoles(userId);

        // Load companies and roles
        const [rolesRes, companiesRes] = await Promise.all([
          rolesApi.list({ limit: 100 }),
          companiesApi.list({ limit: 100 }),
        ]);
        setRoles(rolesRes.data);
        setCompanies(companiesRes.data);

        // Map role names to IDs
        const roleIds = rolesRes.data
          .filter((role) => userRoleNames.includes(role.name))
          .map((role) => role.id);

        // Load all branches for all companies (for access panel)
        const allBranchesRes = await branchesApi.list({ limit: 500 });
        const byCompany: Record<number, Branch[]> = {};
        for (const branch of allBranchesRes.data) {
          if (!byCompany[branch.companyId]) byCompany[branch.companyId] = [];
          byCompany[branch.companyId].push(branch);
        }
        setAllBranchesByCompany(byCompany);

        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          userType: userData.userType || 'EMPLOYEE',
          companyId: userData.companyId,
          branchId: userData.branchId,
          roleIds,
          themePreference: userData.themePreference || 'system',
          accessibleCompanyIds: userData.accessibleCompanyIds ?? [],
          accessibleBranchIds: userData.accessibleBranchIds ?? [],
        });
      } catch (err: unknown) {
        setErrors({ load: extractErrorMessage(err, 'Failed to load user') });
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUser();
    }
  }, [userId]);

  // Load branches when company selection changes
  useEffect(() => {
    const loadBranches = async () => {
      const companyId = formData.companyId;
      if (!companyId) {
        setBranches([]);
        return;
      }
      try {
        const branchesRes = await branchesApi.list({
          companyId,
          limit: 100
        });
        setBranches(branchesRes.data);
      } catch (err) {
        console.error('Failed to load branches:', err);
        setBranches([]);
      }
    };
    loadBranches();
  }, [formData.companyId]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'companyId') {
      // When company changes, clear branch selection and reload branches
      setFormData((prev) => ({ ...prev, companyId: value ? parseInt(value) : undefined, branchId: undefined }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
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

  // Toggle company access — unchecking a company also removes its branches
  const toggleCompanyAccess = useCallback((companyId: number) => {
    setFormData((prev) => {
      const current = prev.accessibleCompanyIds ?? [];
      if (current.includes(companyId)) {
        const companyBranchIds = (allBranchesByCompany[companyId] ?? []).map((b) => b.id);
        return {
          ...prev,
          accessibleCompanyIds: current.filter((id) => id !== companyId),
          accessibleBranchIds: (prev.accessibleBranchIds ?? []).filter(
            (id) => !companyBranchIds.includes(id),
          ),
        };
      }
      return { ...prev, accessibleCompanyIds: [...current, companyId] };
    });
  }, [allBranchesByCompany]);

  // Toggle branch access
  const toggleBranchAccess = useCallback((branchId: number) => {
    setFormData((prev) => {
      const current = prev.accessibleBranchIds ?? [];
      return {
        ...prev,
        accessibleBranchIds: current.includes(branchId)
          ? current.filter((id) => id !== branchId)
          : [...current, branchId],
      };
    });
  }, []);

  // Select/deselect all branches for a company
  const toggleAllBranchesForCompany = useCallback((companyId: number, selectAll: boolean) => {
    const companyBranchIds = (allBranchesByCompany[companyId] ?? []).map((b) => b.id);
    setFormData((prev) => {
      const current = prev.accessibleBranchIds ?? [];
      if (selectAll) {
        const merged = Array.from(new Set([...current, ...companyBranchIds]));
        return { ...prev, accessibleBranchIds: merged };
      }
      return {
        ...prev,
        accessibleBranchIds: current.filter((id) => !companyBranchIds.includes(id)),
      };
    });
  }, [allBranchesByCompany]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate password change
  const validatePassword = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      setSaving(true);
      await usersApi.update(userId, { ...formData, branchId: selectedBranchId });
      router.push('/core/users');
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to update user');
      setErrors({ submit: message });
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!validatePassword()) return;

    try {
      setSaving(true);
      await usersApi.changePassword(userId, { newPassword });
      setShowPasswordForm(false);
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to change password');
      setErrors({ password: message });
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading user...</span>
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
              onClick={() => router.push('/core/users')}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Return to Users
            </button>
          </div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Users}
        title={`Edit: ${user?.name}`}
        description="Update user information and access"
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
            <div className="flex gap-4 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
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
                    <label htmlFor="userType" className="block text-sm font-medium mb-2">User Type</label>
                    <select
                      name="userType"
                      id="userType" value={formData.userType}
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="themePreference" className="block text-sm font-medium mb-2">Theme Preference</label>
                    <select
                      name="themePreference"
                      id="themePreference" value={formData.themePreference}
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="system">System Default</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                </div>

                {/* User Info */}
                {user && (
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Account Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Email Verified</p>
                        <p className="font-medium">
                          {user.emailVerifiedAt
                            ? new Date(user.emailVerifiedAt).toLocaleDateString()
                            : 'Not verified'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Organization Tab */}
            {activeTab === 'organization' && (
              <div className="space-y-8">

                {/* ── Primary Company & Branch ── */}
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold mb-4">
                    <Building2 className="h-4 w-4 text-primary" />
                    Primary Company &amp; Branch
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    The company and branch that will be active when this user logs in.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="companyId" className="block text-sm font-medium mb-2">Company</label>
                      <select
                        name="companyId"
                        id="companyId"
                        value={formData.companyId || ''}
                        onChange={handleChange}
                        className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select a company</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-muted-foreground">Changing company will reset the branch selection</p>
                    </div>

                    <div>
                      <label htmlFor="branchId" className="block text-sm font-medium mb-2">Branch</label>
                      <select
                        name="branchId"
                        id="branchId"
                        value={formData.branchId || ''}
                        onChange={handleChange}
                        disabled={branches.length === 0}
                        className={cn(
                          'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                          branches.length === 0 && 'bg-muted cursor-not-allowed'
                        )}
                      >
                        <option value="">Select a branch (optional)</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}{branch.isHeadOffice && ' (HQ)'}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {branches.length > 0 ? `${branches.length} branch${branches.length > 1 ? 'es' : ''} available` : 'No branches available'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t" />

                {/* ── Company Access ── */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <Building2 className="h-4 w-4 text-primary" />
                      Company Access
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {(formData.accessibleCompanyIds ?? []).length} of {companies.length} selected
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Which companies this user can switch to via the company switcher.
                  </p>

                  {companies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No companies available.</p>
                  ) : (
                    <div className="space-y-2">
                      {/* Select All row */}
                      <label className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 cursor-pointer text-sm font-medium">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={(formData.accessibleCompanyIds ?? []).length === companies.length}
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              accessibleCompanyIds: e.target.checked ? companies.map((c) => c.id) : [],
                              accessibleBranchIds: e.target.checked
                                ? Object.values(allBranchesByCompany).flat().map((b) => b.id)
                                : [],
                            }));
                          }}
                        />
                        All companies
                      </label>

                      {companies.map((company) => {
                        const isChecked = (formData.accessibleCompanyIds ?? []).includes(company.id);
                        const companyBranches = allBranchesByCompany[company.id] ?? [];
                        const checkedBranchCount = companyBranches.filter((b) =>
                          (formData.accessibleBranchIds ?? []).includes(b.id)
                        ).length;

                        return (
                          <div key={company.id} className={cn(
                            'rounded-lg border transition-colors',
                            isChecked ? 'border-primary/40 bg-primary/5' : 'border-border'
                          )}>
                            {/* Company row */}
                            <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={isChecked}
                                onChange={() => toggleCompanyAccess(company.id)}
                              />
                              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-sm">{company.name}</span>
                                {companyBranches.length > 0 && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {isChecked ? `${checkedBranchCount}/${companyBranches.length} branches` : `${companyBranches.length} branch${companyBranches.length !== 1 ? 'es' : ''}`}
                                  </span>
                                )}
                              </div>
                            </label>

                            {/* Branch list — only shown when company is checked */}
                            {isChecked && companyBranches.length > 0 && (
                              <div className="border-t px-4 py-3 space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <GitBranch className="h-3 w-3" />
                                    Branch access
                                  </span>
                                  <button
                                    type="button"
                                    className="text-xs text-primary hover:underline"
                                    onClick={() =>
                                      toggleAllBranchesForCompany(company.id, checkedBranchCount < companyBranches.length)
                                    }
                                  >
                                    {checkedBranchCount < companyBranches.length ? 'Select all' : 'Deselect all'}
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {companyBranches.map((branch) => (
                                    <label key={branch.id} className="flex items-center gap-2 cursor-pointer text-sm">
                                      <input
                                        type="checkbox"
                                        className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={(formData.accessibleBranchIds ?? []).includes(branch.id)}
                                        onChange={() => toggleBranchAccess(branch.id)}
                                      />
                                      <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
                                      {branch.name}
                                      {branch.isHeadOffice && (
                                        <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 rounded">HQ</span>
                                      )}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                        </div>
                      </label>
                    );
                  })}
                </div>

                {roles.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No roles available.
                  </div>
                )}
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Change Password</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Reset the user's password. They will need to use the new password on their next login.
                  </p>

                  {!showPasswordForm ? (
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(true)}
                      className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                    >
                      <Key className="h-4 w-4" />
                      Change Password
                    </button>
                  ) : (
                    <div className="space-y-4 max-w-md">
                      {errors.password && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                          {errors.password}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-2">New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              if (errors.newPassword) {
                                setErrors((prev) => ({ ...prev, newPassword: '' }));
                              }
                            }}
                            placeholder="Enter new password"
                            className={cn(
                              'w-full rounded-lg border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary',
                              errors.newPassword && 'border-red-500'
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.newPassword && (<p id="newPassword-error" role="alert" className="mt-1 text-sm text-red-500">{errors.newPassword}</p>)}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Confirm Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (errors.confirmPassword) {
                              setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                            }
                          }}
                          placeholder="Confirm new password"
                          className={cn(
                            'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                            errors.confirmPassword && 'border-red-500'
                          )}
                        />
                        {errors.confirmPassword && (<p id="confirmPassword-error" role="alert" className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>)}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handlePasswordChange}
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {saving ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Update Password
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setNewPassword('');
                            setConfirmPassword('');
                            setErrors({});
                          }}
                          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
