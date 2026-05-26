'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Building2,
  Clock,
  Users,
  Warehouse,
  Globe,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, StatCard, StatCardColors, DetailShell, Toolbar, LoadingSpinner, EmptyState } from '@/components/erp';
import { useToolbar } from '@/hooks/useToolbar';
import { useDetailTabs } from '@/hooks/useDetailTabs';
import { useDetailSidebar, type SidebarItem } from '@/hooks/useDetailSidebar';
import { useEntityPermissions } from '@/hooks';
import { branchesApi, companiesApi } from '@/lib/api/core';
import type { Branch, Company, BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Branches' },
];

// ============================================================================
// SIDEBAR ITEM INTERFACE
// ============================================================================

interface BranchSidebarItem extends SidebarItem {
  isActive: boolean;
  isHeadOffice: boolean;
  companyId: number;
  companyName?: string;
  city?: string;
  state?: string;
  userCount?: number;
  warehouseCount?: number;
}

// ============================================================================
// BRANCH DETAIL VIEWER (HEADLESS PATTERN)
// ============================================================================

interface BranchDetailViewerProps {
  branch: Branch;
  branches: Branch[];
  companies: Company[];
  onClose: () => void;
  onBranchSelect: (branch: Branch) => void;
  onDelete: () => void;
}

function BranchDetailViewer({
  branch,
  branches,
  companies,
  onClose,
  onBranchSelect,
  onDelete,
}: BranchDetailViewerProps) {
  const router = useRouter();

  // Get company for the branch
  const company = companies.find((c) => c.id === branch.companyId);

  // Convert branches to sidebar items
  const sidebarItems: BranchSidebarItem[] = branches.map((b) => ({
    id: b.id,
    title: b.name,
    subtitle: b.code || undefined,
    badges: [
      ...(b.isHeadOffice
        ? [{ label: 'HQ', variant: 'default' as const }]
        : []),
      ...(b.isActive
        ? [{ label: 'Active', variant: 'success' as const }]
        : [{ label: 'Inactive', variant: 'warning' as const }]),
    ],
    isActive: b.isActive,
    isHeadOffice: b.isHeadOffice || false,
    companyId: b.companyId,
    companyName: companies.find((c) => c.id === b.companyId)?.name,
    city: b.city,
    state: b.state,
    userCount: b.userCount,
    warehouseCount: b.warehouseCount,
  }));

  // Headless hooks
  const sidebar = useDetailSidebar({
    items: sidebarItems,
    selectedId: branch.id,
    searchKeys: ['title', 'subtitle', 'companyName', 'city'],
    onItemSelect: (item) => {
      const selectedBranch = branches.find((b) => b.id === item.id);
      if (selectedBranch) onBranchSelect(selectedBranch);
    },
  });

  const tabs = useDetailTabs({
    tabs: [
      { id: 'overview', label: 'Overview', icon: GitBranch },
      { id: 'location', label: 'Location & Contact', icon: MapPin },
    ],
    defaultTab: 'overview',
  });

  const toolbar = useToolbar({
    entity: branch,
    entityType: 'branches',
    onExport: async (format) => {
      console.log(`Exporting branch ${branch.id} as ${format}`);
    },
    onPrint: async (options) => {
      console.log('Printing branch:', options);
    },
    onEdit: () => router.push(`/core/branches/${branch.id}/edit`),
    onDelete: async () => { onDelete(); },
  });

  return (
    <DetailShell
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title={branch.name}
      headerActions={<Toolbar toolbar={toolbar} onClose={onClose} />}
    >
      <DetailShell.Layout>
        <DetailShell.Body>
          {/* Sidebar */}
          <DetailShell.Sidebar collapsed={sidebar.isCollapsed}>
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={sidebar.searchQuery}
                  onChange={(e) => sidebar.setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebar.filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => sidebar.selectItem(item)}
                  className={cn(
                    'w-full px-3 py-3 text-left border-b transition-colors hover:bg-muted/50',
                    sidebar.selectedItem?.id === item.id && 'bg-primary/5 border-l-2 border-l-primary'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'rounded-lg p-2 mt-0.5',
                        item.isHeadOffice
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'bg-primary/10'
                      )}
                    >
                      <GitBranch
                        className={cn(
                          'h-4 w-4',
                          item.isHeadOffice
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-primary'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                      )}
                      {item.companyName && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.companyName}
                        </p>
                      )}
                      {(item.city || item.state) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[item.city, item.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {item.badges?.map((badge, idx) => (
                          <span
                            key={idx}
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              badge.variant === 'success' &&
                                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                              badge.variant === 'default' &&
                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                              badge.variant === 'warning' &&
                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            )}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {sidebar.filteredItems.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No branches found
                </div>
              )}
            </div>
          </DetailShell.Sidebar>

          {/* Main Content */}
          <DetailShell.Main>
            <DetailShell.Tabs>
              {tabs.tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <DetailShell.Tab
                    key={tab.id}
                    active={tabs.activeTab === tab.id}
                    onClick={() => tabs.setActiveTab(tab.id)}
                    icon={IconComponent && <IconComponent className="h-4 w-4" />}
                  >
                    {tab.label}
                  </DetailShell.Tab>
                );
              })}
            </DetailShell.Tabs>

            <DetailShell.Content>
              {/* Overview Tab */}
              {tabs.activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'rounded-xl p-4',
                        branch.isHeadOffice
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'bg-primary/10'
                      )}
                    >
                      <GitBranch
                        className={cn(
                          'h-8 w-8',
                          branch.isHeadOffice
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-primary'
                        )}
                      />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold">{branch.name}</h2>
                      {branch.code && (
                        <p className="text-sm text-muted-foreground">Code: {branch.code}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                            branch.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          )}
                        >
                          {branch.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {branch.isHeadOffice && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-0.5 text-xs font-medium">
                            Headquarters
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Company Info */}
                  {company && (
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Parent Company</p>
                          <p className="font-medium">{company.name}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
                          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{branch.userCount || 0}</p>
                          <p className="text-xs text-muted-foreground">Users</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2">
                          <Warehouse className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{branch.warehouseCount || 0}</p>
                          <p className="text-xs text-muted-foreground">Warehouses</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timezone */}
                  {branch.timezone && (
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Timezone</p>
                          <p className="font-medium">{branch.timezone}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Created: {new Date(branch.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Updated: {new Date(branch.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Location & Contact Tab */}
              {tabs.activeTab === 'location' && (
                <div className="space-y-6">
                  {/* Contact Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {branch.email && (
                        <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                          <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
                            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="font-medium text-sm">{branch.email}</p>
                          </div>
                        </div>
                      )}
                      {branch.phone && (
                        <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                          <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
                            <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="font-medium text-sm">{branch.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {!branch.email && !branch.phone && (
                      <p className="text-sm text-muted-foreground">No contact information available</p>
                    )}
                  </div>

                  {/* Address */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                      Address
                    </h3>
                    {branch.address || branch.city || branch.state || branch.country ? (
                      <div className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2 mt-0.5">
                            <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="text-sm space-y-1">
                            {branch.address && <p>{branch.address}</p>}
                            {(branch.city || branch.state || branch.postalCode) && (
                              <p className="text-muted-foreground">
                                {[branch.city, branch.state, branch.postalCode].filter(Boolean).join(', ')}
                              </p>
                            )}
                            {branch.country && (
                              <p className="text-muted-foreground">{branch.country}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No address information available</p>
                    )}
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

export default function BranchesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('core', 'branches');
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<number | ''>('');
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch branches with TanStack Query
  const { data: branchesData, isLoading: loading, error: branchesFetchError } = useQuery({
    queryKey: ['core-branches', page, search, selectedCompany],
    queryFn: () => branchesApi.list({
      page,
      limit: 10,
      search: search || undefined,
      companyId: selectedCompany || undefined,
    }),
  });

  const branches = branchesData?.data ?? [];
  const totalPages = branchesData?.totalPages ?? 1;
  const error = branchesFetchError ? extractErrorMessage(branchesFetchError, 'Failed to load branches') : null;

  // Calculate stats from fetched data
  const stats = useMemo(() => {
    const active = branches.filter((b) => b.isActive).length;
    const headquarters = branches.filter((b) => b.isHeadOffice).length;
    return {
      total: branchesData?.total ?? 0,
      active,
      headquarters,
    };
  }, [branches, branchesData?.total]);

  // Fetch companies for filter dropdown
  const { data: companiesData } = useQuery({
    queryKey: ['core-companies-ref'],
    queryFn: () => companiesApi.list({ limit: 100 }),
  });

  const companies = companiesData?.data ?? [];

  const handleDelete = async () => {
    if (!selectedBranch) return;
    try {
      await branchesApi.delete(selectedBranch.id);
      setSelectedBranch(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['core-branches'] });
    } catch (err) {
      console.error('Failed to delete branch:', err);
    }
  };

  const getCompanyName = (companyId: number) => {
    const company = companies.find((c) => c.id === companyId);
    return company?.name || 'Unknown';
  };

  // Page actions
  const pageActions = [
    ...(canCreate ? [{
      id: 'create',
      label: 'Add Branch',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => router.push('/core/branches/create'),
    }] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={GitBranch}
        title="Branches"
        description="Manage your organization's branches and locations"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Total Branches"
          value={stats.total}
          icon={GitBranch}
          color={StatCardColors.blue}
        />
        <StatCard
          title="Active Branches"
          value={stats.active}
          icon={GitBranch}
          color={StatCardColors.green}
        />
        <StatCard
          title="Headquarters"
          value={stats.headquarters}
          icon={Building2}
          color={StatCardColors.purple}
        />
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search branches..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={selectedCompany}
            onChange={(e) => {
              setSelectedCompany(e.target.value ? Number(e.target.value) : '');
              setPage(1);
            }}
            className="rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <LoadingSpinner tableRow colSpan={6} />
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-red-500">{error}</td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={GitBranch}
                      title="No branches found"
                      description="Try adjusting your search or filters, or add a new branch."
                      action={canCreate ? { label: 'Add Branch', onClick: () => router.push('/core/branches/create'), icon: Plus } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <GitBranch className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{branch.name}</p>
                          {branch.code && (
                            <p className="text-sm text-muted-foreground">{branch.code}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getCompanyName(branch.companyId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {[branch.city, branch.state].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {branch.phone || branch.email || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                            branch.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          )}
                        >
                          {branch.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {branch.isHeadOffice && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-0.5 text-xs font-medium">
                            HQ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedBranch(branch)}
                          className="rounded-lg p-2 hover:bg-muted transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/core/branches/${branch.id}/edit`)}
                          className="rounded-lg p-2 hover:bg-muted transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBranch(branch);
                            setShowDeleteConfirm(true);
                          }}
                          className="rounded-lg p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Viewer */}
      {selectedBranch && !showDeleteConfirm && (
        <BranchDetailViewer
          branch={selectedBranch}
          branches={branches}
          companies={companies}
          onClose={() => setSelectedBranch(null)}
          onBranchSelect={setSelectedBranch}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-background border shadow-lg m-4 p-6">
            <h3 className="text-lg font-semibold">Delete Branch</h3>
            <p className="mt-2 text-muted-foreground">
              Are you sure you want to delete "{selectedBranch.name}"? This action cannot be undone.
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
