'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { GitBranch, ArrowLeft, Save, X, Loader2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { branchesApi } from '@/lib/api/core';
import type { Branch, UpdateBranchDto, BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage} from '@/lib/utils';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

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

export default function EditBranchPage() {
  const router = useRouter();
  const {
    branches: branchList,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const branchId = Number(params.id);

  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [branch, setBranch] = useState<Branch | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    companyId: 0,
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    isHeadOffice: false,
    isActive: true,
  });

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Administration', href: '/core' },
    { title: 'Branches', href: '/core/branches' },
    { title: branch?.name || 'Edit Branch' },
  ];

  // Load branch data
  useEffect(() => {
    const loadBranch = async () => {
      try {
        setLoading(true);
        const data = await branchesApi.get(branchId);
        setBranch(data);
        setFormData({
          name: data.name || '',
          code: data.code || '',
          companyId: data.companyId,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || '',
          postalCode: data.postalCode || '',
          isHeadOffice: data.isHeadOffice || false,
          isActive: data.isActive !== false,
        });
      } catch (err: unknown) {
        setErrors({ load: extractErrorMessage(err, 'Failed to load branch') });
      } finally {
        setLoading(false);
      }
    };

    if (branchId) {
      loadBranch();
    }
  }, [branchId]);


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

    if (!formData.name?.trim()) {
      newErrors.name = 'Branch name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.name) {
        setActiveTab('basic');
      } else if (newErrors.email) {
        setActiveTab('contact');
      }
      return;
    }

    try {
      setSaving(true);
      await branchesApi.update(branchId, formData);
      router.push('/core/branches');
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to update branch');
      setErrors({ submit: message });
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
      onClick: () => router.push('/core/branches'),
    },
  ];

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading branch...</span>
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
              onClick={() => router.push('/core/branches')}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Return to Branches
            </button>
          </div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={GitBranch}
        title={`Edit: ${branch?.name}`}
        description="Update branch information"
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

          {/* Tab Content */}
          <div className="rounded-xl border bg-card p-6">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
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

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      id="isActive" checked={formData.isActive}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="font-medium">Active</p>
                      <p className="text-sm text-muted-foreground">
                        Branch is operational and visible in the system
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
