'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Building2, ArrowLeft, Save, X, Upload, Loader2 } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { companiesApi } from '@/lib/api/core';
import type { Company, UpdateCompanyDto, BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage} from '@/lib/utils';
import { useBranchAccess } from '@/hooks/useBranchAccess';
import { BranchSelector } from '@/components/erp';

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

export default function EditCompanyPage() {
  const router = useRouter();
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    hasSingleBranch,
  } = useBranchAccess();
  const params = useParams();
  const companyId = Number(params.id);

  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [company, setCompany] = useState<Company | null>(null);

  // Form state
  const [formData, setFormData] = useState<UpdateCompanyDto>({
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

  // Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Administration', href: '/core' },
    { title: 'Companies', href: '/core/companies' },
    { title: company?.name || 'Edit Company' },
  ];

  // Load company data
  useEffect(() => {
    const loadCompany = async () => {
      try {
        setLoading(true);
        const data = await companiesApi.get(companyId);
        setCompany(data);
        setFormData({
          name: data.name || '',
          displayName: data.displayName || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || '',
          postalCode: data.postalCode || '',
          businessType: data.businessType || 'general',
          currency: data.currency || 'NGN',
          taxNumber: data.taxNumber || '',
          registrationNumber: data.registrationNumber || '',
          website: data.website || '',
        });
      } catch (err: unknown) {
        setErrors({ load: extractErrorMessage(err, 'Failed to load company') });
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      loadCompany();
    }
  }, [companyId]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
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
      if (errors.name || errors.displayName) {
        setActiveTab('basic');
      } else if (errors.email || errors.phone || errors.address) {
        setActiveTab('contact');
      }
      return;
    }

    try {
      setSaving(true);
      await companiesApi.update(companyId, { ...formData, branchId: selectedBranchId });
      router.push('/core/companies');
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to update company');
      setErrors({ submit: message });
    } finally {
      setSaving(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const updated = await companiesApi.uploadLogo(companyId, file);
      setCompany(updated);
    } catch (err: unknown) {
      setErrors({ logo: extractErrorMessage(err, 'Failed to upload logo') });
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
      onClick: () => router.push('/core/companies'),
    },
  ];

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading company...</span>
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
              onClick={() => router.push('/core/companies')}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Return to Companies
            </button>
          </div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Building2}
        title={`Edit: ${company?.name}`}
        description="Update company information"
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
                  {company?.logoUrl ? (
                    <div className="flex items-center gap-4">
                      <img
                        src={company.logoUrl}
                        alt={company.name}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        className="h-20 w-20 rounded-lg object-cover border"
                      />
                      <div>
                        <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                          <Upload className="h-4 w-4" />
                          Change Logo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                        {errors.logo && <p id="logo-error" role="alert" className="mt-1 text-sm text-red-500">{errors.logo}</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed p-8 text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Upload company logo
                      </p>
                      <label className="mt-4 cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                        <Upload className="h-4 w-4" />
                        Choose File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {errors.logo && <p id="logo-error" role="alert" className="mt-2 text-sm text-red-500">{errors.logo}</p>}
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
              onClick={() => router.push('/core/companies')}
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
