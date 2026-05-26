'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFlashStore } from '@/stores/flash';

import { Building2, ArrowLeft, Save, X, Upload } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { companiesApi } from '@/lib/api/core';
import { useCompanyContextStore } from '@/stores/company-context';
import type { CreateCompanyDto, BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage} from '@/lib/utils';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Companies', href: '/core/companies' },
  { title: 'Create Company' },
];

// ============================================================================
// FORM TABS
// ============================================================================

const tabs = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'contact', label: 'Contact & Address' },
  { id: 'settings', label: 'Settings' },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function CreateCompanyPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const { fetchContext } = useCompanyContextStore();
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateCompanyDto>({
    name: '',
    displayName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    businessType: 'general',
    currency: 'NGN',
    taxNumber: '',
    registrationNumber: '',
    website: '',
  });

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      // Switch to tab with first error
      if (errors.name || errors.displayName) {
        setActiveTab('basic');
      } else if (errors.email || errors.phone || errors.address) {
        setActiveTab('contact');
      }
      return;
    }

    try {
      setLoading(true);
      const newCompany = await companiesApi.create({ ...formData, branchId: selectedBranchId });
      // Upload logo if one was selected
      if (pendingLogoFile && newCompany?.id) {
        try {
          await companiesApi.uploadLogo(newCompany.id, pendingLogoFile);
        } catch {
          // Logo upload failed but company was created — proceed
          console.warn('Logo upload failed after company creation');
        }
      }
      // Refresh company context so CompanySwitcher shows the new company
      await fetchContext();
      useFlashStore.getState().setFlash('Saved successfully');
      router.push('/core/companies');
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to create company');
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
      onClick: () => router.push('/core/companies'),
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Building2}
        title="Create Company"
        description="Add a new company to your organization"
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
                  <div className="md:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      aria-required="true"
                      aria-invalid={!!errors.name}
                      type="text"
                      name="name"
                      id="name" value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter company name"
                      className={cn(
                        'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                        errors.name && 'border-red-500'
                      )}
                    />
                    {errors.name && <p id="name-error" role="alert" className="mt-1 text-sm text-red-500">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium mb-2">Display Name</label>
                    <input
                      type="text"
                      name="displayName"
                      id="displayName" value={formData.displayName}
                      onChange={handleChange}
                      placeholder="Short display name"
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="businessType" className="block text-sm font-medium mb-2">Business Type</label>
                    <select
                      name="businessType"
                      id="businessType" value={formData.businessType}
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="general">General</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="retail">Retail</option>
                      <option value="wholesale">Wholesale</option>
                      <option value="services">Services</option>
                      <option value="technology">Technology</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="education">Education</option>
                      <option value="construction">Construction</option>
                      <option value="transport">Transport & Logistics</option>
                      <option value="agriculture">Agriculture</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="taxNumber" className="block text-sm font-medium mb-2">Tax Number</label>
                    <input
                      type="text"
                      name="taxNumber"
                      id="taxNumber" value={formData.taxNumber}
                      onChange={handleChange}
                      placeholder="Tax/VAT number"
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="registrationNumber" className="block text-sm font-medium mb-2">Registration Number</label>
                    <input
                      type="text"
                      name="registrationNumber"
                      id="registrationNumber" value={formData.registrationNumber}
                      onChange={handleChange}
                      placeholder="Company registration number"
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
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
                      placeholder="company@example.com"
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

                  <div>
                    <label htmlFor="website" className="block text-sm font-medium mb-2">Website</label>
                    <input
                      aria-invalid={!!errors.website}
                      type="url"
                      name="website"
                      id="website" value={formData.website}
                      onChange={handleChange}
                      placeholder="https://example.com"
                      className={cn(
                        'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary',
                        errors.website && 'border-red-500'
                      )}
                    />
                    {errors.website && <p id="website-error" role="alert" className="mt-1 text-sm text-red-500">{errors.website}</p>}
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

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium mb-2">Currency</label>
                    <select
                      name="currency"
                      id="currency" value={formData.currency}
                      onChange={handleChange}
                      className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="NGN">Nigerian Naira (NGN)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                      <option value="GBP">British Pound (GBP)</option>
                      <option value="GHS">Ghanaian Cedi (GHS)</option>
                      <option value="KES">Kenyan Shilling (KES)</option>
                      <option value="ZAR">South African Rand (ZAR)</option>
                    </select>
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">Company Logo</label>
                  {logoPreviewUrl ? (
                    <div className="flex items-center gap-4 rounded-lg border p-4">
                      <img src={logoPreviewUrl} alt="Logo preview" className="h-20 w-20 object-contain rounded-lg border" />
                      <div>
                        <p className="text-sm font-medium">{pendingLogoFile?.name}</p>
                        <button
                          type="button"
                          onClick={() => { setPendingLogoFile(null); setLogoPreviewUrl(null); }}
                          className="text-sm text-red-500 hover:underline mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">Click to select a logo (optional)</p>
                      <p className="text-xs text-muted-foreground">Max 2MB, PNG/JPG/SVG</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPendingLogoFile(file);
                            setLogoPreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="mt-6 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/core/companies')}
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
              Create Company
            </button>
          </div>
        </form>
      </div>
    </TenantLayout>
  );
}
