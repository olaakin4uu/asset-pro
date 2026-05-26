'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, User, CheckCircle } from 'lucide-react';
import { DetailShell, Toolbar } from '@/components/erp';
import { useToolbar, type ToolbarAction } from '@/hooks/useToolbar';
import { useDetailTabs } from '@/hooks/useDetailTabs';
import { useDetailSidebar, type SidebarItem } from '@/hooks/useDetailSidebar';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPE INTERFACES
// ============================================================================

export interface BadgeDef {
  label: string;
  className?: string;
}

export interface FieldDef<T> {
  label: string;
  value: (entity: T) => React.ReactNode;
  span?: 1 | 2;
  mono?: boolean;
  hidden?: (entity: T) => boolean;
}

export interface SectionDef<T> {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  columns?: 1 | 2 | 3;
  span?: 'full' | 'main' | 'aside';
  hidden?: (entity: T) => boolean;
  fields?: FieldDef<T>[];
  render?: (entity: T) => React.ReactNode;
}

export interface TabDef<T> {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: (entity: T) => string | number | undefined;
  hidden?: (entity: T) => boolean;
  sections?: SectionDef<T>[];
  render?: (entity: T) => React.ReactNode;
  header?: (entity: T) => React.ReactNode;
}

export interface SidebarConfig<T> {
  title: (entity: T) => string;
  subtitle?: (entity: T) => string;
  searchKeys?: string[];
  badges?: (entity: T) => BadgeDef[];
  statusIcon?: (entity: T) => React.ReactNode;
}

export interface ToolbarConfig<T> {
  showExport?: boolean;
  showShare?: boolean;
  showPrint?: boolean;
  showBookmark?: boolean;
  showFavorite?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  customActions?: ToolbarAction<T>[];
}

export interface EntityDetailConfig<T extends { id: string | number }> {
  entityType: string;
  basePath: string;
  icon: React.ComponentType<{ className?: string }>;
  title: (entity: T) => string;
  subtitle?: (entity: T) => string;
  sidebar: SidebarConfig<T>;
  tabs: TabDef<T>[];
  toolbar?: ToolbarConfig<T>;
}

export interface EntityDetailViewerProps<T extends { id: string | number }> {
  config: EntityDetailConfig<T>;
  entity: T;
  entities: T[];
  onClose: () => void;
  onEntitySelect: (entity: T) => void;
  onDelete: (entity: T) => void;
  onPrint?: (entity: T) => void;
  loading?: boolean;
}

// ============================================================================
// COMMON ENTITY INTERFACES
// ============================================================================

export interface HasTimestamps {
  id: string | number;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdById?: number | null;
  updatedById?: number | null;
  createdByName?: string | null;
  updatedByName?: string | null;
}

export interface HasApproval extends HasTimestamps {
  submittedAt?: string | null;
  approvedAt?: string | null;
  approvalNotes?: string | null;
  submittedById?: number | null;
  approvedById?: number | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function metadataFields<T extends HasTimestamps>(): FieldDef<T>[] {
  return [
    { label: 'Created', value: (e) => formatDate(e.createdAt) },
    { label: 'Last Updated', value: (e) => formatDate(e.updatedAt) },
    {
      label: 'Created By',
      value: (e) => e.createdById ? (
        <span className="flex items-center gap-1">
          <User className="h-3.5 w-3.5" /> {e.createdByName || `User #${e.createdById}`}
        </span>
      ) : '—',
      hidden: (e) => !e.createdById,
    },
    {
      label: 'Updated By',
      value: (e) => e.updatedById ? (
        <span className="flex items-center gap-1">
          <User className="h-3.5 w-3.5" /> {e.updatedByName || `User #${e.updatedById}`}
        </span>
      ) : '—',
      hidden: (e) => !e.updatedById,
    },
  ];
}

export function metadataTab<T extends HasTimestamps>(): TabDef<T> {
  return {
    id: 'history',
    label: 'History',
    icon: Clock,
    sections: [
      {
        title: 'Metadata',
        icon: Clock,
        fields: metadataFields<T>(),
      },
    ],
  };
}

export function approvalFields<T extends HasApproval>(): FieldDef<T>[] {
  return [
    {
      label: 'Submitted',
      value: (e) => formatDate(e.submittedAt),
      hidden: (e) => !e.submittedAt,
    },
    {
      label: 'Approved',
      value: (e) => formatDate(e.approvedAt),
      hidden: (e) => !e.approvedAt,
    },
    {
      label: 'Approval Notes',
      value: (e) => e.approvalNotes || '—',
      span: 2,
      hidden: (e) => !e.approvalNotes,
    },
  ];
}

export function approvalSection<T extends HasApproval>(): SectionDef<T> {
  return {
    title: 'Approval',
    icon: CheckCircle,
    span: 'aside',
    fields: approvalFields<T>(),
  };
}

// ============================================================================
// INTERNAL: SECTION RENDERER
// ============================================================================

interface SectionRendererProps<T> {
  section: SectionDef<T>;
  entity: T;
}

function SectionRenderer<T>({ section, entity }: SectionRendererProps<T>) {
  // Check if the entire section is hidden
  if (section.hidden && section.hidden(entity)) return null;

  const SectionIcon = section.icon;
  const columns = section.columns ?? 2;

  // Check if all fields are hidden
  if (section.fields && !section.render) {
    const visibleFields = section.fields.filter((f) => !f.hidden || !f.hidden(entity));
    if (visibleFields.length === 0) return null;
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        {SectionIcon && <SectionIcon className="h-5 w-5 text-muted-foreground" />}
        <h3 className="text-lg font-semibold">{section.title}</h3>
      </div>

      {section.render ? (
        section.render(entity)
      ) : section.fields ? (
        <div
          className={cn(
            'grid gap-4',
            columns === 1 && 'grid-cols-1',
            columns === 2 && 'grid-cols-1 sm:grid-cols-2',
            columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          )}
        >
          {section.fields.map((field, i) => {
            if (field.hidden && field.hidden(entity)) return null;
            return (
              <div
                key={i}
                className={cn(field.span === 2 && 'sm:col-span-2')}
              >
                <p className="text-sm text-muted-foreground">{field.label}</p>
                <div className={cn('font-medium', field.mono && 'font-mono')}>
                  {field.value(entity)}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// INTERNAL: TAB CONTENT RENDERER
// ============================================================================

interface TabContentRendererProps<T> {
  tab: TabDef<T>;
  entity: T;
}

function TabContentRenderer<T>({ tab, entity }: TabContentRendererProps<T>) {
  const headerContent = tab.header ? tab.header(entity) : null;

  if (tab.render) {
    return <div className="space-y-6">{headerContent}{tab.render(entity)}</div>;
  }

  if (!tab.sections || tab.sections.length === 0) return headerContent ? <div>{headerContent}</div> : null;

  // Group sections by span type
  const mainSections = tab.sections.filter((s) => s.span === 'main');
  const asideSections = tab.sections.filter((s) => s.span === 'aside');
  const fullSections = tab.sections.filter((s) => !s.span || s.span === 'full');

  const hasLayout = mainSections.length > 0 || asideSections.length > 0;

  return (
    <div className="space-y-6">
      {headerContent}
      {hasLayout && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {mainSections.length > 0 && (
            <div className="lg:col-span-2 space-y-6">
              {mainSections.map((section, i) => (
                <SectionRenderer key={i} section={section} entity={entity} />
              ))}
            </div>
          )}
          {asideSections.length > 0 && (
            <div className="space-y-6">
              {asideSections.map((section, i) => (
                <SectionRenderer key={i} section={section} entity={entity} />
              ))}
            </div>
          )}
        </div>
      )}
      {fullSections.map((section, i) => (
        <SectionRenderer key={i} section={section} entity={entity} />
      ))}
    </div>
  );
}

// ============================================================================
// INTERNAL: SKELETON
// ============================================================================

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-card p-6">
            <div className="h-6 w-48 bg-muted rounded mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-24 bg-muted rounded mb-2" />
                  <div className="h-5 w-36 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <div className="h-6 w-32 bg-muted rounded mb-4" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-muted rounded-lg" />
                <div>
                  <div className="h-4 w-28 bg-muted rounded mb-1" />
                  <div className="h-5 w-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INTERNAL: SIDEBAR ITEM
// ============================================================================

interface EntitySidebarItem extends SidebarItem {
  _badges: BadgeDef[];
  _statusIcon: React.ReactNode;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EntityDetailViewer<T extends { id: string | number }>({
  config,
  entity,
  entities,
  onClose,
  onEntitySelect,
  onDelete,
  onPrint,
  loading = false,
}: EntityDetailViewerProps<T>) {
  const router = useRouter();
  const ConfigIcon = config.icon;

  // Map entities to sidebar items
  const sidebarItems: EntitySidebarItem[] = useMemo(
    () =>
      entities.map((e) => ({
        id: e.id,
        title: config.sidebar.title(e),
        subtitle: config.sidebar.subtitle?.(e),
        _badges: config.sidebar.badges?.(e) ?? [],
        _statusIcon: config.sidebar.statusIcon?.(e) ?? null,
      })),
    [entities, config.sidebar]
  );

  // Sidebar hook
  const sidebar = useDetailSidebar<EntitySidebarItem>({
    items: sidebarItems,
    selectedId: entity.id,
    searchKeys: (config.sidebar.searchKeys ?? ['title', 'subtitle']) as (keyof EntitySidebarItem)[],
    onItemSelect: (item) => {
      const ent = entities.find((e) => e.id === item.id);
      if (ent) onEntitySelect(ent);
    },
  });

  // Compute tab definitions with dynamic badges/hidden
  const tabDefs = useMemo(
    () =>
      config.tabs
        .filter((t) => !t.hidden || !t.hidden(entity))
        .map((t) => ({
          id: t.id,
          label: t.label,
          icon: t.icon,
          badge: t.badge?.(entity),
        })),
    [config.tabs, entity]
  );

  const tabs = useDetailTabs({
    tabs: tabDefs,
    defaultTab: tabDefs[0]?.id,
  });

  // Toolbar hook
  const toolbarConfig = config.toolbar ?? {};
  const toolbar = useToolbar({
    entity,
    entityType: config.entityType,
    onEdit: (e) => router.push(`${config.basePath}/${e.id}/edit`),
    onDelete: async (e) => onDelete(e),
    onPrint: onPrint ? async (_opts, e) => { onPrint(e as T); } : undefined,
    customActions: toolbarConfig.customActions,
  });

  // Find the active tab config for content rendering
  const activeTabConfig = config.tabs.find((t) => t.id === tabs.activeTab);

  return (
    <DetailShell
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title={config.title(entity)}
      subtitle={config.subtitle?.(entity)}
      icon={<ConfigIcon className="h-5 w-5" />}
      headerActions={
        <Toolbar
          toolbar={toolbar}
          onClose={onClose}
          showExport={toolbarConfig.showExport}
          showShare={toolbarConfig.showShare}
          showPrint={toolbarConfig.showPrint}
          printDisabled={!onPrint}
          printDisabledTooltip="Available after 2 approval steps"
          showBookmark={toolbarConfig.showBookmark}
          showFavorite={toolbarConfig.showFavorite}
          showEdit={toolbarConfig.showEdit}
          showDelete={toolbarConfig.showDelete}
        />
      }
      width="full"
    >
      <DetailShell.Layout>
        <DetailShell.Body>
          {/* Sidebar */}
          <DetailShell.Sidebar
            collapsed={sidebar.isCollapsed}
            onToggle={sidebar.toggleSidebar}
            width="300px"
          >
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={`Search ${config.entityType}...`}
                  value={sidebar.searchQuery}
                  onChange={(e) => sidebar.setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {sidebar.filteredItems.length} of {sidebar.items.length} {config.entityType}
              </p>
            </div>

            <div className="flex-1 overflow-auto">
              {sidebar.displayedItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => sidebar.selectItem(item)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b transition-colors',
                    sidebar.isSelected(item)
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : 'hover:bg-muted/50 border-l-2 border-l-transparent'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    {item._statusIcon && (
                      <span className="flex-shrink-0">{item._statusIcon}</span>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                  {item._badges.length > 0 && (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item._badges.map((badge, i) => (
                        <span
                          key={i}
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
                            badge.className || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          )}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
              {sidebar.hasMore && (
                <button
                  onClick={sidebar.loadMore}
                  className="w-full py-2 text-sm text-primary hover:underline"
                >
                  Load more...
                </button>
              )}
            </div>
          </DetailShell.Sidebar>

          {/* Main content */}
          <DetailShell.Main>
            <DetailShell.Tabs>
              {tabs.visibleTabs.map((tab) => (
                  <DetailShell.Tab
                    key={tab.id}
                    active={tabs.activeTab === tab.id}
                    onClick={() => tabs.setActiveTab(tab.id)}
                    icon={tab.icon}
                    badge={tab.badge}
                  >
                    {tab.label}
                  </DetailShell.Tab>
              ))}
            </DetailShell.Tabs>

            <DetailShell.Content>
              {loading && <DetailSkeleton />}
              {!loading && activeTabConfig && (
                <TabContentRenderer tab={activeTabConfig} entity={entity} />
              )}
            </DetailShell.Content>
          </DetailShell.Main>
        </DetailShell.Body>
      </DetailShell.Layout>
    </DetailShell>
  );
}
