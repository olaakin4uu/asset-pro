'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  Clock,
  Calendar,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Search,
  Info,
  Settings,
  Users,
  GitBranch,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, StatCard, StatCardColors, DetailShell, Toolbar, LoadingSpinner, EmptyState } from '@/components/erp';
import { companiesApi } from '@/lib/api/core';
import { useEntityPermissions } from '@/hooks';
import type { Company, PaginatedResponse, BreadcrumbItem } from '@/types/core';
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
  { title: 'Companies' },
];

// ============================================================================
// COMPANY SIDEBAR ITEM TYPE
// ============================================================================

interface CompanySidebarItem extends SidebarItem {
  isActive: boolean;
  branchCount: number;
  userCount: number;
}

// ============================================================================
// COMPANY DETAIL VIEWER
// ============================================================================

interface CompanyDetailViewerProps {
  company: Company | null;
  companies: Company[];
  onClose: () => void;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
  onSelectCompany: (company: Company) => void;
}

function CompanyDetailViewer({
  company,
  companies,
  onClose,
  onEdit,
  onDelete,
  onSelectCompany,
}: CompanyDetailViewerProps) {
  const router = useRouter();

  // Convert companies to sidebar items
  const sidebarItems: CompanySidebarItem[] = companies.map((c) => ({
    id: c.id,
    title: c.name,
    subtitle: c.displayName || c.email || '',
    isActive: c.isActive,
    branchCount: c.branchCount || 0,
    userCount: c.userCount || 0,
    badges: c.isActive
      ? [{ label: 'Active', variant: 'success' as const }]
      : [{ label: 'Inactive', variant: 'warning' as const }],
  }));

  // Sidebar hook for company list navigation
  const sidebar = useDetailSidebar({
    items: sidebarItems,
    selectedId: company?.id,
    searchKeys: ['title', 'subtitle'],
    onItemSelect: (item) => {
      const selectedCompany = companies.find((c) => c.id === item.id);
      if (selectedCompany) onSelectCompany(selectedCompany);
    },
  });

  // Tabs hook
  const tabs = useDetailTabs({
    tabs: [
      { id: 'overview', label: 'Overview', icon: Info },
      { id: 'details', label: 'Business Details', icon: Settings },
    ],
    defaultTab: 'overview',
  });

  // Toolbar hook
  const toolbar = useToolbar({
    entity: company || { id: '', name: '' },
    entityType: 'companies',
    onEdit: (entity) => onEdit(entity as Company),
    onDelete: async (entity) => {
      onDelete(entity as Company);
    },
    onExport: async (format) => {
      console.log(`Exporting company as ${format}`);
    },
    onPrint: async (options) => {
      console.log('Printing with options:', options);
    },
  });

  if (!company) return null;

  return (
    <DetailShell
      open={!!company}
      onOpenChange={(open) => !open && onClose()}
      title={company.name}
      subtitle={company.displayName !== company.name ? company.displayName : undefined}
      icon={
        company.logoUrl ? (
          <img src={company.logoUrl} alt={company.name} className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          <Building2 className="h-5 w-5" />
        )
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
          {/* Sidebar with companies list */}
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
                    placeholder="Search companies..."
                    value={sidebar.searchQuery}
                    onChange={(e) => sidebar.setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Companies list */}
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
                          'rounded-lg p-2',
                          sidebar.isSelected(item) ? 'bg-primary/20' : 'bg-muted'
                        )}
                      >
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          {item.isActive ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 text-[10px] font-medium">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 text-[10px] font-medium">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {item.branchCount} branches
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {item.userCount} users
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                {sidebar.displayedItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No companies found
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
                  {/* Company Header Card */}
                  <div className="rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6">
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
                      <div>
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
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-500 p-2">
                          <GitBranch className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {company.branchCount || 0}
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">Branches</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-500 p-2">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {company.userCount || 0}
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">Users</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-4">Contact Information</h3>
                    <div className="space-y-3">
                      {company.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <a href={`mailto:${company.email}`} className="text-sm text-blue-600 hover:underline">
                              {company.email}
                            </a>
                          </div>
                        </div>
                      )}
                      {company.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <a href={`tel:${company.phone}`} className="text-sm text-blue-600 hover:underline">
                              {company.phone}
                            </a>
                          </div>
                        </div>
                      )}
                      {company.website && (
                        <div className="flex items-center gap-3">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Website</p>
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {company.website}
                            </a>
                          </div>
                        </div>
                      )}
                      {company.address && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Address</p>
                            <div className="text-sm">
                              <div>{company.address}</div>
                              {(company.city || company.state || company.postalCode) && (
                                <div>
                                  {company.city}
                                  {company.city && company.state ? ', ' : ''}
                                  {company.state} {company.postalCode}
                                </div>
                              )}
                              {company.country && <div>{company.country}</div>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-3">Timeline</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span>
                          {new Date(company.createdAt).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Updated</span>
                        <span>
                          {new Date(company.updatedAt).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Business Details Tab */}
              {tabs.activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Business Information */}
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-4">Business Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {company.businessType && (
                        <div>
                          <p className="text-xs text-muted-foreground">Business Type</p>
                          <p className="text-sm font-medium capitalize">
                            {company.businessType.replace(/_/g, ' ')}
                          </p>
                        </div>
                      )}
                      {company.currency && (
                        <div>
                          <p className="text-xs text-muted-foreground">Currency</p>
                          <p className="text-sm font-medium">{company.currency}</p>
                        </div>
                      )}
                      {company.taxNumber && (
                        <div>
                          <p className="text-xs text-muted-foreground">Tax Number</p>
                          <p className="text-sm font-mono">{company.taxNumber}</p>
                        </div>
                      )}
                      {company.registrationNumber && (
                        <div>
                          <p className="text-xs text-muted-foreground">Registration Number</p>
                          <p className="text-sm font-mono">{company.registrationNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* System Information */}
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-4">System Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Company ID</p>
                        <p className="text-sm font-mono">{company.id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
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
                      </div>
                    </div>
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

export default function CompaniesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('core', 'companies');
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch companies with TanStack Query
  const { data: companies, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['core-companies', search],
    queryFn: () => companiesApi.list({ search: search || undefined }),
  });

  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load companies') : null;

  // Calculate statistics
  const stats = useMemo(() => {
    if (!companies) return { total: 0, active: 0, inactive: 0, thisMonth: 0 };

    const now = new Date();
    const thisMonth = companies.data.filter((c) => {
      const created = new Date(c.createdAt);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    return {
      total: companies.total,
      active: companies.data.filter((c) => c.isActive).length,
      inactive: companies.data.filter((c) => !c.isActive).length,
      thisMonth,
    };
  }, [companies]);

  // Page actions
  const pageActions = [
    ...(canCreate ? [{
      id: 'add-company',
      label: 'New Company',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => router.push('/core/companies/create'),
      tooltip: 'Add a new company',
    }] : []),
  ];

  // Handle delete
  const handleDelete = async () => {
    if (!selectedCompany) return;

    try {
      await companiesApi.delete(selectedCompany.id);
      setSelectedCompany(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['core-companies'] });
    } catch (err) {
      alert('Failed to delete company');
      console.error(err);
    }
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={Building2}
        title="Company Management"
        description="Manage company information and settings"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Companies"
            value={stats.total}
            icon={Building2}
            color={StatCardColors.blue}
          />
          <StatCard
            title="Active"
            value={stats.active}
            icon={CheckCircle}
            color={StatCardColors.green}
          />
          <StatCard
            title="This Month"
            value={stats.thisMonth}
            icon={Calendar}
            color={StatCardColors.purple}
          />
          <StatCard
            title="Inactive"
            value={stats.inactive}
            icon={Clock}
            color={StatCardColors.orange}
          />
        </div>

        {/* Table Section */}
        <div className="rounded-xl border bg-card">
          {/* Table Header */}
          <div className="border-b p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Company List</h2>
                <p className="text-sm text-muted-foreground">
                  View and manage all companies in your system
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search companies..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
        <LoadingSpinner fullPage />
      ) : error ? (
              <div className="p-12 text-center text-red-500">{error}</div>
            ) : companies && companies.data.length > 0 ? (
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.data.map((company) => (
                    <tr key={company.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm">{company.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                            {company.logoUrl ? (
                              <img
                                src={company.logoUrl}
                                alt={company.name}
                                className="h-full w-full rounded-lg object-cover"
                              />
                            ) : (
                              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{company.name}</div>
                            {company.displayName && company.displayName !== company.name && (
                              <div className="text-xs text-muted-foreground">{company.displayName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{company.email || '-'}</td>
                      <td className="px-4 py-3 text-sm">{company.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                            company.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                          )}
                        >
                          {company.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(company.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedCompany(company)}
                            className="rounded-lg p-2 hover:bg-muted transition-colors"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/core/companies/${company.id}/edit`)}
                            className="rounded-lg p-2 hover:bg-muted transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCompany(company);
                              setShowDeleteConfirm(true);
                            }}
                            className="rounded-lg p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState
                icon={Building2}
                title="No companies found"
                description="Create your first company to get started."
                action={canCreate ? { label: 'New Company', onClick: () => router.push('/core/companies/create'), icon: Plus } : undefined}
              />
            )}
          </div>

          {/* Pagination */}
          {companies && companies.totalPages > 1 && (
            <div className="border-t p-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {companies.data.length} of {companies.total} companies
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  Page {companies.page} of {companies.totalPages}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Viewer */}
      <CompanyDetailViewer
        company={showDeleteConfirm ? null : selectedCompany}
        companies={companies?.data || []}
        onClose={() => setSelectedCompany(null)}
        onEdit={(company) => router.push(`/core/companies/${company.id}/edit`)}
        onDelete={(company) => {
          setSelectedCompany(company);
          setShowDeleteConfirm(true);
        }}
        onSelectCompany={setSelectedCompany}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-md rounded-xl bg-background border shadow-lg m-4 p-6">
            <h3 className="text-lg font-semibold">Delete Company</h3>
            <p className="mt-2 text-muted-foreground">
              Are you sure you want to delete "{selectedCompany.name}"? This action cannot be undone.
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
