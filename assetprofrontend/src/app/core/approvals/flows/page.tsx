'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/core';
import {
  GitBranch,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Copy,
  Star,
  Check,
  X,
  Filter,
  Info,
  Clock,
  Users,
  Shield,
  ShieldAlert,
  User,
  ListOrdered,
  Settings,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, StatCard, StatCardColors, DetailShell, Toolbar, LoadingSpinner, EmptyState } from '@/components/erp';
import { StatCardsGrid } from '@/components/erp/StatCard';
import { approvalFlowsApi, approvableEntitiesApi } from '@/lib/api/approvals';
import { useEntityPermissions } from '@/hooks';
import { useToolbar } from '@/hooks/useToolbar';
import { useDetailTabs } from '@/hooks/useDetailTabs';
import { useDetailSidebar, type SidebarItem } from '@/hooks/useDetailSidebar';
import type { ApprovalFlow, ApprovalFlowStats, ApprovableEntityType } from '@/types/approvals';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Approvals', href: '/core/approvals' },
  { title: 'Approval Flows' },
];

// ============================================================================
// SIDEBAR ITEM TYPE
// ============================================================================

interface FlowSidebarItem extends SidebarItem {
  isDefault: boolean;
  isActive: boolean;
  stepCount: number;
  entityType: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getApproverTypeIcon = (type: string) => {
  switch (type) {
    case 'employee':
      return User;
    case 'role':
    case 'any_of_role':
      return Shield;
    case 'department_head':
      return Users;
    default:
      return User;
  }
};

const getApproverTypeLabel = (type: string) => {
  switch (type) {
    case 'employee':
      return 'Specific Employees';
    case 'role':
      return 'By Role';
    case 'any_of_role':
      return 'Any of Role';
    case 'department_head':
      return 'Department Head';
    default:
      return type;
  }
};

// ============================================================================
// APPROVAL FLOW DETAIL VIEWER
// ============================================================================

interface ApprovalFlowDetailViewerProps {
  flow: ApprovalFlow | null;
  flows: ApprovalFlow[];
  entityTypes: ApprovableEntityType[];
  onClose: () => void;
  onEdit: (flow: ApprovalFlow) => void;
  onDelete: (flow: ApprovalFlow) => void;
  onSelectFlow: (flow: ApprovalFlow) => void;
}

function ApprovalFlowDetailViewer({
  flow,
  flows,
  entityTypes,
  onClose,
  onEdit,
  onDelete,
  onSelectFlow,
}: ApprovalFlowDetailViewerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch all users once for resolving employee names and role members
  const { data: usersData } = useQuery({
    queryKey: ['core-users-all'],
    queryFn: () => usersApi.list({ limit: 200 } as Parameters<typeof usersApi.list>[0]),
    staleTime: 60_000,
  });
  const allUsers = usersData?.data ?? [];

  // Helper: get initials from name
  const getInitials = useCallback((name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }, []);

  // Avatar colors by id
  const avatarColor = useCallback((id: number) => {
    const colors = [
      'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
      'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
    ];
    return colors[id % colors.length];
  }, []);

  // Convert flows to sidebar items
  const sidebarItems: FlowSidebarItem[] = flows.map((f) => ({
    id: f.id,
    title: f.name,
    subtitle: entityTypes.find((e) => e.entitySlug === f.entitySlug)?.displayName || f.entityType,
    isDefault: f.isDefault,
    isActive: f.isActive,
    stepCount: f.stepCount ?? f.steps?.length ?? 0,
    entityType: f.entityType,
    badges: [
      ...(f.isDefault ? [{ label: 'Default', variant: 'warning' as const }] : []),
      ...(f.isActive
        ? [{ label: 'Active', variant: 'success' as const }]
        : [{ label: 'Inactive', variant: 'default' as const }]),
    ],
  }));

  // Sidebar hook
  const sidebar = useDetailSidebar({
    items: sidebarItems,
    selectedId: flow?.id,
    searchKeys: ['title', 'subtitle'],
    onItemSelect: (item) => {
      const selectedFlow = flows.find((f) => f.id === item.id);
      if (selectedFlow) onSelectFlow(selectedFlow);
    },
  });

  // Tabs hook
  const tabs = useDetailTabs({
    tabs: [
      { id: 'overview', label: 'Overview', icon: Info },
      { id: 'steps', label: 'Steps', icon: ListOrdered, badge: flow?.stepCount ?? flow?.steps?.length ?? 0 },
    ],
    defaultTab: 'overview',
  });

  // Toolbar hook
  const toolbar = useToolbar({
    entity: flow || { id: '', name: '' },
    entityType: 'approval-flows',
    onEdit: (entity) => onEdit(entity as ApprovalFlow),
    onDelete: async (entity) => onDelete(entity as ApprovalFlow),
    customActions: flow && !flow.isDefault
      ? [
          {
            id: 'setDefault',
            label: 'Set as Default',
            icon: Star,
            onClick: async () => {
              try {
                await approvalFlowsApi.setDefault(flow.id);
                queryClient.invalidateQueries({ queryKey: ['core-approval-flows'] });
              } catch (err: unknown) {
                alert(extractErrorMessage(err, 'Failed to set as default'));
              }
            },
          },
        ]
      : [],
  });

  if (!flow) return null;

  const entityType = entityTypes.find((e) => e.entitySlug === flow.entitySlug);
  const sortedSteps = [...(flow.steps || [])].sort((a, b) => a.stepNumber - b.stepNumber);

  return (
    <DetailShell
      open={!!flow}
      onOpenChange={(open) => !open && onClose()}
      title={flow.name}
      subtitle={flow.description}
      icon={<GitBranch className="h-5 w-5" />}
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
          showExport={false}
          showShare={false}
        />
      }
    >
      <DetailShell.Layout>
        <DetailShell.Body>
          {/* Sidebar with flows list */}
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
                    placeholder="Search flows..."
                    value={sidebar.searchQuery}
                    onChange={(e) => sidebar.setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Flows list */}
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
                        <GitBranch className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          {item.isDefault && (
                            <Star className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground truncate">
                            {item.subtitle}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {item.stepCount} steps
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}

                {sidebar.displayedItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No flows found
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
                  badge={tab.badge}
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
                  {/* Flow Info Card */}
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-4">Flow Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium">{flow.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Entity Type</p>
                        <p className="font-medium">{entityType?.displayName || flow.entityType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Module</p>
                        <p className="text-sm">{entityType?.moduleName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Entity Slug</p>
                        <p className="text-sm font-mono text-xs">{flow.entitySlug}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Priority</p>
                        <p className="font-medium">{flow.priority}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p>
                          {flow.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-0.5 text-xs font-medium">
                              <Check className="h-3 w-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-0.5 text-xs font-medium">
                              <X className="h-3 w-3" />
                              Inactive
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Description</p>
                        <p className="text-sm">{flow.description || 'No description provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-500 p-2">
                          <ListOrdered className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {flow.stepCount ?? flow.steps?.length ?? 0}
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">Steps</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-900/20">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-amber-500 p-2">
                          <Star className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                            {flow.isDefault ? 'Yes' : 'No'}
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">Default</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border p-4 bg-purple-50 dark:bg-purple-900/20">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-purple-500 p-2">
                          <Settings className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {flow.conditions?.length || 0}
                          </p>
                          <p className="text-sm text-purple-700 dark:text-purple-300">Conditions</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-3">Settings</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Auto Submit</span>
                        <span>{flow.autoSubmit ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parallel Approval</span>
                        <span>{flow.parallelApproval ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-3">Timeline</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span>{new Date(flow.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Updated</span>
                        <span>{new Date(flow.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Steps Tab */}
              {tabs.activeTab === 'steps' && (
                <div className="space-y-2 py-2">
                  {sortedSteps.length > 0 ? (
                    sortedSteps.map((step, idx) => {
                      // Resolve approvers for display
                      const isRole = step.approverType === 'role' || step.approverType === 'any_of_role';
                      const isDeptHead = step.approverType === 'department_head';

                      // For role type: members of that role
                      const roleMembers = isRole
                        ? allUsers.filter((u) => u.roles?.includes(step.role?.name ?? ''))
                        : [];

                      // For employee type: specific users by ID
                      const employeeApprovers = !isRole && !isDeptHead
                        ? allUsers.filter((u) => step.approverIds?.includes(u.id))
                        : [];

                      // Override authority resolution
                      const overrideIsRole = step.overrideApproverType === 'role';
                      const overrideRoleMembers = overrideIsRole && step.overrideRole
                        ? allUsers.filter((u) => u.roles?.includes(step.overrideRole!.name))
                        : [];
                      const overrideEmployees = !overrideIsRole && step.overrideApproverIds?.length
                        ? allUsers.filter((u) => step.overrideApproverIds!.includes(u.id))
                        : [];

                      return (
                        <div key={step.id} className="flex gap-3">
                          {/* Timeline spine */}
                          <div className="flex flex-col items-center pt-4">
                            <div
                              className={cn(
                                'flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold shrink-0 ring-2 ring-background',
                                step.isActive ? 'bg-primary' : 'bg-muted-foreground'
                              )}
                            >
                              {idx + 1}
                            </div>
                            {idx < sortedSteps.length - 1 && (
                              <div className="w-px flex-1 bg-border mt-2 mb-1 min-h-6" />
                            )}
                          </div>

                          {/* Card */}
                          <div className={cn(
                            'flex-1 rounded-xl border bg-card p-4 mb-3',
                            !step.isActive && 'opacity-60'
                          )}>
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-sm">{step.name}</span>
                                  {/* Action badge */}
                                  <span className={cn(
                                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                    step.action === 'APPROVE' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                                    step.action === 'VERIFY' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                                    step.action === 'CHECK' && 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
                                  )}>
                                    {step.action}
                                  </span>
                                  {/* Approval mode */}
                                  <span className={cn(
                                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs',
                                    step.approvalMode === 'all'
                                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                      : 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400'
                                  )}>
                                    {step.approvalMode === 'all' ? 'All must approve' : 'Any can approve'}
                                  </span>
                                  {!step.isRequired && (
                                    <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs">
                                      Optional
                                    </span>
                                  )}
                                  {step.overrideAllowed && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-xs font-medium">
                                      <ShieldAlert className="h-3 w-3" />
                                      Override allowed
                                    </span>
                                  )}
                                </div>
                                {step.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                                )}
                              </div>
                              {step.timeoutHours && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                  <Clock className="h-3 w-3" />
                                  {step.timeoutHours}h
                                </div>
                              )}
                            </div>

                            {/* Approvers section */}
                            {isRole && (
                              <div className="space-y-2">
                                {/* Role badge */}
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5">
                                    <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                      {step.role?.name ?? `Role #${step.approverIds?.[0]}`}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">role</span>
                                </div>
                                {/* Role members */}
                                {roleMembers.length > 0 ? (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1.5">
                                      {roleMembers.length} member{roleMembers.length !== 1 ? 's' : ''} in this role
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {roleMembers.map((u) => (
                                        <div key={u.id} className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                                          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold', avatarColor(u.id))}>
                                            {getInitials(u.name)}
                                          </div>
                                          <span className="text-xs font-medium">{u.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">No users assigned to this role yet</p>
                                )}
                              </div>
                            )}

                            {isDeptHead && (
                              <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-1.5 w-fit">
                                <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Department Head</span>
                              </div>
                            )}

                            {!isRole && !isDeptHead && (
                              <div className="space-y-1.5">
                                {employeeApprovers.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {employeeApprovers.map((u) => (
                                      <div key={u.id} className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                                        <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold', avatarColor(u.id))}>
                                          {getInitials(u.name)}
                                        </div>
                                        <span className="text-xs font-medium">{u.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {(step.approverIds ?? []).map((id) => (
                                      <div key={id} className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                                        <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold', avatarColor(id))}>
                                          <User className="h-3 w-3" />
                                        </div>
                                        <span className="text-xs text-muted-foreground">User #{id}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Override Authority Section */}
                            {step.overrideAllowed && (
                              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                                    Override Authority
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    · min {step.overrideNoteMinLength} char note required
                                  </span>
                                </div>

                                {overrideIsRole && step.overrideRole ? (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-2.5 py-1">
                                        <Shield className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                          {step.overrideRole.name}
                                        </span>
                                      </div>
                                      <span className="text-xs text-muted-foreground">role</span>
                                    </div>
                                    {overrideRoleMembers.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {overrideRoleMembers.map((u) => (
                                          <div key={u.id} className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-2 py-0.5">
                                            <div className={cn('w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold', avatarColor(u.id))}>
                                              {getInitials(u.name)}
                                            </div>
                                            <span className="text-xs text-amber-700 dark:text-amber-300">{u.name}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">No users assigned to override role yet</p>
                                    )}
                                  </div>
                                ) : overrideEmployees.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {overrideEmployees.map((u) => (
                                      <div key={u.id} className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-2 py-0.5">
                                        <div className={cn('w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold', avatarColor(u.id))}>
                                          {getInitials(u.name)}
                                        </div>
                                        <span className="text-xs text-amber-700 dark:text-amber-300">{u.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">No override authority configured</p>
                                )}

                                {step.overrideNotifySkipped && (
                                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                    <Check className="h-3 w-3 text-green-500" />
                                    Skipped approvers will be notified
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 rounded-xl border border-dashed">
                      <GitBranch className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground">No steps configured</p>
                      <button
                        onClick={() => router.push(`/core/approvals/flows/${flow.id}/edit`)}
                        className="mt-2 text-primary hover:underline text-xs"
                      >
                        Add steps →
                      </button>
                    </div>
                  )}
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

export default function ApprovalFlowsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('core', 'approval-flows');

  // Filters
  const [search, setSearch] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Detail viewer
  const [selectedFlow, setSelectedFlow] = useState<ApprovalFlow | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch full flow detail (with steps) when a flow is selected
  const { data: flowDetail } = useQuery({
    queryKey: ['core-approval-flow-detail', selectedFlow?.id],
    queryFn: () => approvalFlowsApi.get(selectedFlow!.id),
    enabled: !!selectedFlow,
  });

  // Merge: use full detail (has steps) when available, fall back to list item
  const activeFlow = flowDetail ?? selectedFlow;

  // Fetch flows
  const { data: flowsData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['core-approval-flows', search, filterEntityType, filterStatus],
    queryFn: () =>
      approvalFlowsApi.list({
        search: search || undefined,
        entityType: filterEntityType || undefined,
        isActive: filterStatus === 'all' ? undefined : filterStatus === 'active',
      }),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['core-approval-flows-stats'],
    queryFn: () => approvalFlowsApi.getStats(),
  });

  // Fetch entity types
  const { data: entityTypes = [] } = useQuery({
    queryKey: ['core-approvable-entities'],
    queryFn: () => approvableEntitiesApi.list(),
  });

  const flows = flowsData?.data ?? [];
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load approval flows') : null;

  const handleDelete = async () => {
    if (!selectedFlow) return;
    try {
      await approvalFlowsApi.delete(selectedFlow.id);
      setSelectedFlow(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['core-approval-flows'] });
      queryClient.invalidateQueries({ queryKey: ['core-approval-flows-stats'] });
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to delete flow'));
    }
  };

  const handleDuplicate = async (flow: ApprovalFlow) => {
    const newName = prompt('Enter name for the duplicated flow:', `${flow.name} (Copy)`);
    if (!newName) return;

    try {
      await approvalFlowsApi.duplicate(flow.id, newName);
      queryClient.invalidateQueries({ queryKey: ['core-approval-flows'] });
      queryClient.invalidateQueries({ queryKey: ['core-approval-flows-stats'] });
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to duplicate flow'));
    }
  };

  const handleSetDefault = async (flow: ApprovalFlow) => {
    try {
      await approvalFlowsApi.setDefault(flow.id);
      queryClient.invalidateQueries({ queryKey: ['core-approval-flows'] });
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to set as default'));
    }
  };

  const pageActions = [
    ...(canCreate
      ? [
          {
            id: 'create',
            label: 'New Flow',
            icon: Plus,
            variant: 'default' as const,
            onClick: () => router.push('/core/approvals/flows/create'),
          },
        ]
      : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={GitBranch}
        title="Approval Flows"
        description="Configure approval workflows for different document types"
        actions={pageActions}
        {...PageHeaderPresets.core}
      />

      {/* Stats */}
      <StatCardsGrid columns={4} className="mb-6">
        <StatCard
          title="Total Flows"
          value={stats?.totalFlows ?? '-'}
          icon={GitBranch}
          color={StatCardColors.blue}
        />
        <StatCard
          title="Active Flows"
          value={stats?.activeFlows ?? '-'}
          icon={Check}
          color={StatCardColors.green}
        />
        <StatCard
          title="Entity Types"
          value={stats?.entityTypes ?? '-'}
          icon={Filter}
          color={StatCardColors.purple}
        />
        <StatCard
          title="Avg Steps/Flow"
          value={stats?.avgStepsPerFlow?.toFixed(1) ?? '-'}
          icon={GitBranch}
          color={StatCardColors.amber}
        />
      </StatCardsGrid>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search flows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border pl-10 pr-4 py-2"
          />
        </div>

        <select
          value={filterEntityType}
          onChange={(e) => setFilterEntityType(e.target.value)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="">All Entity Types</option>
          {entityTypes.map((e) => (
            <option key={e.entitySlug} value={e.entityType}>
              {e.displayName}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Flow Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Entity Type
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Steps
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                  <td colSpan={6} className="px-6 py-12 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : flows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={GitBranch}
                      title="No approval flows found"
                      description="Get started by creating your first approval flow."
                      action={
                        canCreate
                          ? {
                              label: 'Create Flow',
                              onClick: () => router.push('/core/approvals/flows/create'),
                              icon: Plus,
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                flows.map((flow) => {
                  const et = entityTypes.find((e) => e.entitySlug === flow.entitySlug);
                  return (
                    <tr
                      key={flow.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <GitBranch className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{flow.name}</span>
                              {flow.isDefault && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                                  <Star className="h-3 w-3" />
                                  Default
                                </span>
                              )}
                            </div>
                            {flow.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-md">
                                {flow.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm">{et?.displayName || flow.entityType}</span>
                        <p className="text-xs text-muted-foreground">{flow.entitySlug}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {flow.stepCount ?? flow.steps?.length ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm">{flow.priority}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {flow.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">
                            <Check className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                            <X className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedFlow(flow)}
                            className="rounded-lg p-2 hover:bg-muted transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() =>
                                router.push(`/core/approvals/flows/${flow.id}/edit`)
                              }
                              className="rounded-lg p-2 hover:bg-muted transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {canCreate && (
                            <button
                              onClick={() => handleDuplicate(flow)}
                              className="rounded-lg p-2 hover:bg-muted transition-colors"
                              title="Duplicate"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                setSelectedFlow(flow);
                                setShowDeleteConfirm(true);
                              }}
                              className="rounded-lg p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Viewer */}
      <ApprovalFlowDetailViewer
        flow={showDeleteConfirm ? null : activeFlow}
        flows={flows}
        entityTypes={entityTypes}
        onClose={() => setSelectedFlow(null)}
        onEdit={(flow) => router.push(`/core/approvals/flows/${flow.id}/edit`)}
        onDelete={(flow) => {
          setSelectedFlow(flow);
          setShowDeleteConfirm(true);
        }}
        onSelectFlow={setSelectedFlow}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-md rounded-xl bg-background border shadow-lg m-4 p-6">
            <h3 className="text-lg font-semibold">Delete Approval Flow</h3>
            <p className="mt-2 text-muted-foreground">
              Are you sure you want to delete &quot;{selectedFlow.name}&quot;? This action cannot be
              undone.
            </p>
            {selectedFlow.isDefault && (
              <p className="mt-2 text-sm text-amber-600">
                Warning: This is the default flow for its entity type.
              </p>
            )}
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
