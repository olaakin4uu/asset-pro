'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import {
  Building2,
  ArrowLeft,
  Pencil,
  Trash2,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Info,
  Settings,
  Users,
  GitBranch,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { companiesApi } from '@/lib/api/core';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';
import { useEntityFetch } from '@/hooks';

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = parseInt(params.id as string);
  const [seedingAccounts, setSeedingAccounts] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const { entity: company, loading, error } = useEntityFetch({
    queryKey: 'core-companies',
    id: companyId,
    fetchFn: companiesApi.get,
    errorMessage: 'Failed to load company',
  });

  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Administration', href: '/core' },
    { title: 'Companies', href: '/core/companies' },
    { title: company?.name || 'Loading...' },
  ];

  const handleSeedAccounts = async () => {
    setSeedingAccounts(true);
    setSeedMessage(null);
    try {
      const result = await companiesApi.seedAccounts(companyId);
      setSeedMessage(result.message);
    } catch {
      setSeedMessage('Failed to seed accounts. Check that a source company with accounts exists.');
    } finally {
      setSeedingAccounts(false);
    }
  };

  const handleDelete = () => {
    if (!company) return;
    confirmDialog({
      message: `Are you sure you want to delete "${company.name}"? This action cannot be undone.`,
      header: 'Delete Company',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await companiesApi.delete(company.id);
          router.push('/core/companies');
        } catch (error) {
          console.error('Failed to delete company:', error);
        }
      },
    });
  };

  const getPageActions = () => {
    if (!company) return [];
    return [
      {
        id: 'seed-accounts',
        label: seedingAccounts ? 'Seeding...' : 'Seed Chart of Accounts',
        icon: BookOpen,
        variant: 'outline' as const,
        onClick: handleSeedAccounts,
        disabled: seedingAccounts,
        tooltip: 'Copy the full chart of accounts from the primary company into this company',
      },
      {
        id: 'edit',
        label: 'Edit',
        icon: Pencil,
        variant: 'outline' as const,
        onClick: () => router.push(`/core/companies/${companyId}/edit`),
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive' as const,
        onClick: handleDelete,
      },
    ];
  };

  if (loading) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </TenantLayout>
    );
  }

  if (error || !company) {
    return (
      <TenantLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-500 mb-4">{error || 'Company not found'}</p>
          <button
            onClick={() => router.push('/core/companies')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Companies
          </button>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />
      {seedMessage && (
        <div className={cn(
          'mb-4 rounded-lg px-4 py-3 text-sm',
          seedMessage.startsWith('Failed') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        )}>
          {seedMessage}
        </div>
      )}
      <PageHeader
        icon={Building2}
        title={company.name}
        description={company.displayName !== company.name ? company.displayName : undefined}
        actions={getPageActions()}
        badge={{
          text: company.isActive ? 'Active' : 'Inactive',
          variant: company.isActive ? 'success' : 'destructive',
        }}
        {...PageHeaderPresets.core}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Header Card */}
        <div className="rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50 shadow-lg">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{company.name}</h3>
              {company.displayName && company.displayName !== company.name && (
                <p className="text-sm text-muted-foreground">{company.displayName}</p>
              )}
              <span
                className={cn(
                  'mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium',
                  company.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                )}
              >
                {company.isActive ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                {company.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {/* Stats */}
            <div className="flex gap-4">
              <div className="text-center p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{company.branchCount || 0}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">Branches</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-900 dark:text-green-100">{company.userCount || 0}</p>
                <p className="text-xs text-green-700 dark:text-green-300">Users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Contact Information
          </h3>
          <dl className="space-y-4">
            {company.email && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd>
                    <a href={`mailto:${company.email}`} className="text-sm text-blue-600 hover:underline">
                      {company.email}
                    </a>
                  </dd>
                </div>
              </div>
            )}
            {company.phone && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-2">
                  <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd>
                    <a href={`tel:${company.phone}`} className="text-sm text-blue-600 hover:underline">
                      {company.phone}
                    </a>
                  </dd>
                </div>
              </div>
            )}
            {company.website && (
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-2">
                  <ExternalLink className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Website</dt>
                  <dd>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {company.website}
                    </a>
                  </dd>
                </div>
              </div>
            )}
            {company.address && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-2">
                  <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Address</dt>
                  <dd className="text-sm">
                    <div>{company.address}</div>
                    {(company.city || company.state || company.postalCode) && (
                      <div>
                        {company.city}
                        {company.city && company.state ? ', ' : ''}
                        {company.state} {company.postalCode}
                      </div>
                    )}
                    {company.country && <div>{company.country}</div>}
                  </dd>
                </div>
              </div>
            )}
            {!company.email && !company.phone && !company.website && !company.address && (
              <p className="text-sm text-muted-foreground">No contact information provided</p>
            )}
          </dl>
        </div>

        {/* Business Information */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Business Information
          </h3>
          <dl className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {company.businessType && (
                <div>
                  <dt className="text-xs text-muted-foreground">Business Type</dt>
                  <dd className="text-sm font-medium capitalize">
                    {company.businessType.replace(/_/g, ' ')}
                  </dd>
                </div>
              )}
              {company.currency && (
                <div>
                  <dt className="text-xs text-muted-foreground">Currency</dt>
                  <dd className="text-sm font-medium">{company.currency}</dd>
                </div>
              )}
              {company.taxNumber && (
                <div>
                  <dt className="text-xs text-muted-foreground">Tax Number</dt>
                  <dd className="text-sm font-mono">{company.taxNumber}</dd>
                </div>
              )}
              {company.registrationNumber && (
                <div>
                  <dt className="text-xs text-muted-foreground">Registration Number</dt>
                  <dd className="text-sm font-mono">{company.registrationNumber}</dd>
                </div>
              )}
            </div>
            {!company.businessType && !company.currency && !company.taxNumber && !company.registrationNumber && (
              <p className="text-sm text-muted-foreground">No business details provided</p>
            )}
          </dl>
        </div>

        {/* System Information */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            System Information
          </h3>
          <dl className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">Company ID</dt>
                <dd className="text-sm font-mono">{company.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      company.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    )}
                  >
                    {company.isActive ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Timeline */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="text-sm">
                {new Date(company.createdAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">Last Updated</dt>
              <dd className="text-sm">
                {new Date(company.updatedAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => router.push('/core/companies')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </button>
      </div>
    </TenantLayout>
  );
}
