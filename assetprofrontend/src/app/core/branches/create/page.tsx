'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { GitBranch, ArrowLeft, Save, X } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { branchesApi } from '@/lib/api/core';
import { useCompanyContext } from '@/stores/company-context';
import type { CreateBranchDto, BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage} from '@/lib/utils';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Branches', href: '/core/branches' },
  { title: 'Create Branch' },
];

// ============================================================================
// FORM TABS
// ============================================================================

const tabs = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'contact', label: 'Contact & Address' },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function CreateBranchPage() {
  const router = useRouter();
  const {
    branches: branchList,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get current company from context
  const { companyId, company, isLoading: contextLoading } = useCompanyContext();

  // Form state - companyId is set from context
  // Note: isActive is only available in UpdateBranchDto, not CreateBranchDto
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    companyId: companyId || 0,
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    isHeadOffice: false,
  });

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate and get errors
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Branch name is required';
    }

    if (!companyId) {
      newErrors.company = 'No company selected. Please select a company from the company switcher.';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.name || newErrors.company) {
        setActiveTab('basic');
      } else if (newErrors.email) {
        setActiveTab('contact');
      }
      return;
    }

    try {
      setLoading(true);
      // Use companyId from context
      await branchesApi.create({
        ...formData,
        companyId: companyId!,
        branchId: selectedBranchId,
      });
      useFlashStore.getState().setFlash('Saved successfully');
      router.push('/core/branches');
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to create branch');
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
      onClick: () => router.push('/core/branches'),
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={GitBranch}
        title="Create Branch"
        description="Add a new branch to your organization"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />
      <BranchSelector
        branches={branchList}
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

          {/* Company Context Warning */}
          {!companyId && !contextLoading && (
            <div className="mb-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-amber-700 dark:text-amber-400">
              <p className="font-medium">No company selected</p>
              <p className="text-sm mt-1">Please select a company from the company switcher in the sidebar before creating a branch.</p>
            </div>
          )}

          {errors.company && (
            <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
              {errors.company}
            </div>
          )}

          {/* Tab Content */}
          <div className="rounded-xl border bg-card p-6">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* Company Context Display */}
                {company && (
                  <div className="rounded-lg bg-muted/50 p-4 border">
                    <p className="text-xs text-muted-foreground mb-1">Creating branch for company</p>
                    <p className="font-medium">{company.displayName || company.name}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Branch Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      aria-required="true"
                      aria-invalid={!!errors.name}
                      type="text"
                      name="name"
                      id="name" value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter branch name"
                      className={cn(
                        'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                        errors.name && 'border-red-500'
                      )}
                    />
                    {errors.name && <p id="name-error" role="alert" className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="code" className="block text-sm font-medium mb-2">Branch Code</label>
                    <input
                      type="text"
                      name="code"
                      id="code" value={formData.code}
                      onChange={handleChange}
                      placeholder="e.g., HQ, BR001"
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Settings */}
                <div className="pt-4 border-t space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isHeadOffice"
                      id="isHeadOffice" checked={formData.isHeadOffice}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="font-medium">Head Office</p>
                      <p className="text-sm text-muted-foreground">
                        Mark this branch as the company head office
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Contact & Address Tab */}
            {activeTab === 'contact' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">Email Address</label>
                    <input
                      aria-invalid={!!errors.email}
                      type="email"
                      name="email"
                      id="email" value={formData.email}
                      onChange={handleChange}
                      placeholder="branch@example.com"
                      className={cn(
                        'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                        errors.email && 'border-red-500'
                      )}
                    />
                    {errors.email && <p id="email-error" role="alert" className="mt-1 text-sm text-red-500">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium mb-2">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      id="phone" value={formData.phone}
                      onChange={handleChange}
                      placeholder="+234-800-123-4567"
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium mb-2">Street Address</label>
                    <textarea
                      name="address"
                      id="address" value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter street address"
                      rows={2}
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-sm font-medium mb-2">City</label>
                    <input
                      type="text"
                      name="city"
                      id="city" value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium mb-2">State/Province</label>
                    <input
                      type="text"
                      name="state"
                      id="state" value={formData.state}
                      onChange={handleChange}
                      placeholder="State or Province"
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium mb-2">Country</label>
                    <input
                      type="text"
                      name="country"
                      id="country" value={formData.country}
                      onChange={handleChange}
                      placeholder="Country"
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium mb-2">Postal Code</label>
                    <input
                      type="text"
                      name="postalCode"
                      id="postalCode" value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="Postal/ZIP code"
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Form Actions */}
          <div className="mt-6 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/core/branches')}
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
              Create Branch
            </button>
          </div>
        </form>
      </div>
    </TenantLayout>
  );
}
