'use client';

import React, { createContext, useContext, useRef, useEffect } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeft,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UseMasterListReturn } from '@/hooks/useMasterList';
import type { UseSplitPaneReturn } from '@/hooks/useSplitPane';
import type { UseDetailPanelReturn } from '@/hooks/useDetailPanel';

// ============================================================================
// CONTEXT
// ============================================================================

interface MasterDetailContextValue {
  masterList?: UseMasterListReturn<unknown>;
  splitPane?: UseSplitPaneReturn;
  detailPanel?: UseDetailPanelReturn;
}

const MasterDetailContext = createContext<MasterDetailContextValue>({});

function useMasterDetailContext() {
  return useContext(MasterDetailContext);
}

// ============================================================================
// TYPES
// ============================================================================

export interface MasterDetailProps {
  /** Master list hook return */
  masterList?: UseMasterListReturn<unknown>;
  /** Split pane hook return */
  splitPane?: UseSplitPaneReturn;
  /** Detail panel hook return */
  detailPanel?: UseDetailPanelReturn;
  /** Direction of split */
  direction?: 'horizontal' | 'vertical';
  /** Children */
  children: React.ReactNode;
  /** Container className */
  className?: string;
}

export interface MasterDetailListProps {
  children: React.ReactNode;
  className?: string;
  /** Header content */
  header?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
}

export interface MasterDetailSearchProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export interface MasterDetailListItemProps<T = unknown> {
  item: T;
  children: React.ReactNode;
  className?: string;
  onClick?: (item: T) => void;
}

export interface MasterDetailGroupProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

export interface MasterDetailResizerProps {
  className?: string;
}

export interface MasterDetailDetailProps {
  children: React.ReactNode;
  className?: string;
  /** Header content */
  header?: React.ReactNode;
}

export interface MasterDetailEmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export interface MasterDetailLoadingProps {
  className?: string;
  message?: string;
}

export interface MasterDetailToolbarProps {
  children?: React.ReactNode;
  className?: string;
  showCollapse?: boolean;
  showMaximize?: boolean;
}

// ============================================================================
// ROOT COMPONENT
// ============================================================================

function MasterDetailRoot({
  masterList,
  splitPane,
  detailPanel,
  direction = 'horizontal',
  children,
  className,
}: MasterDetailProps) {
  return (
    <MasterDetailContext.Provider value={{ masterList, splitPane, detailPanel }}>
      <div
        ref={splitPane?.containerRef}
        className={cn(
          'flex h-full w-full overflow-hidden',
          direction === 'vertical' && 'flex-col',
          className
        )}
      >
        {children}
      </div>
    </MasterDetailContext.Provider>
  );
}

// ============================================================================
// LIST COMPONENT
// ============================================================================

function MasterDetailList({
  children,
  className,
  header,
  footer,
}: MasterDetailListProps) {
  const { splitPane, masterList } = useMasterDetailContext();
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (!masterList?.selectedId || !listRef.current) return;

    const selectedElement = listRef.current.querySelector('[data-selected="true"]');
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [masterList?.selectedId]);

  return (
    <div
      className={cn(
        'flex flex-col border-r bg-background',
        splitPane?.isCollapsed && 'hidden',
        className
      )}
      style={splitPane?.primaryStyle}
    >
      {header && (
        <div className="flex-shrink-0 border-b">
          {header}
        </div>
      )}

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto"
        onScroll={(e) => {
          // Infinite scroll
          if (!masterList?.hasMore) return;
          const target = e.target as HTMLDivElement;
          const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
          if (scrollBottom < 100) {
            masterList.loadMore();
          }
        }}
      >
        {children}
      </div>

      {footer && (
        <div className="flex-shrink-0 border-t">
          {footer}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SEARCH COMPONENT
// ============================================================================

function MasterDetailSearch({
  placeholder = 'Search...',
  className,
  autoFocus = false,
}: MasterDetailSearchProps) {
  const { masterList } = useMasterDetailContext();

  if (!masterList) return null;

  return (
    <div className={cn('relative p-3', className)}>
      <Search className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder={placeholder}
        value={masterList.searchQuery}
        onChange={(e) => masterList.setSearchQuery(e.target.value)}
        autoFocus={autoFocus}
        className="h-9 w-full rounded-lg border bg-background pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {masterList.searchQuery && (
        <button
          onClick={() => masterList.clearSearch()}
          className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// LIST ITEM COMPONENT
// ============================================================================

function MasterDetailListItem<T extends Record<string, unknown>>({
  item,
  children,
  className,
  onClick,
}: MasterDetailListItemProps<T>) {
  const { masterList } = useMasterDetailContext();

  const id = (item as Record<string, unknown>).id as string | number;
  const isSelected = masterList?.isSelected(id) ?? false;

  const handleClick = () => {
    masterList?.select(id);
    onClick?.(item);
  };

  return (
    <div
      data-selected={isSelected}
      onClick={handleClick}
      className={cn(
        'cursor-pointer border-b px-4 py-3 transition-colors',
        'hover:bg-muted/50',
        isSelected && 'bg-primary/10 border-l-2 border-l-primary',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// GROUP COMPONENT
// ============================================================================

function MasterDetailGroup({
  label,
  children,
  className,
  defaultOpen = true,
}: MasterDetailGroupProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={cn('', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:bg-muted"
      >
        <ChevronRight
          className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-90')}
        />
        {label}
      </button>
      {isOpen && children}
    </div>
  );
}

// ============================================================================
// RESIZER COMPONENT
// ============================================================================

function MasterDetailResizer({ className }: MasterDetailResizerProps) {
  const { splitPane } = useMasterDetailContext();

  if (!splitPane || splitPane.isCollapsed) return null;

  return (
    <div
      ref={splitPane.resizerRef}
      onMouseDown={splitPane.handleDragStart}
      onTouchStart={splitPane.handleDragStart}
      className={cn(
        'group relative flex-shrink-0 bg-border transition-colors',
        'hover:bg-primary/50',
        splitPane.isDragging && 'bg-primary',
        className
      )}
      style={splitPane.resizerStyle}
    >
      <div
        className={cn(
          'absolute inset-0 z-10',
          'cursor-col-resize',
          // Make clickable area larger
          '-left-1 -right-1'
        )}
      />
    </div>
  );
}

// ============================================================================
// DETAIL COMPONENT
// ============================================================================

function MasterDetailDetail({
  children,
  className,
  header,
}: MasterDetailDetailProps) {
  const { splitPane, detailPanel } = useMasterDetailContext();

  // Handle overlay mode
  if (detailPanel?.mode === 'overlay' && detailPanel.isOpen) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={detailPanel.close}
        />
        {/* Panel */}
        <div
          className={cn(
            'fixed z-50 flex flex-col bg-background shadow-xl',
            'animate-in slide-in-from-right duration-300',
            className
          )}
          style={detailPanel.panelStyle}
        >
          {header && (
            <div className="flex-shrink-0 border-b">
              {header}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </>
    );
  }

  // Handle fullscreen mode
  if (detailPanel?.mode === 'fullscreen' && detailPanel.isOpen) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex flex-col bg-background',
          className
        )}
      >
        {header && (
          <div className="flex-shrink-0 border-b">
            {header}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    );
  }

  // Side mode (inline)
  return (
    <div
      className={cn('flex flex-col overflow-hidden', className)}
      style={splitPane?.secondaryStyle}
    >
      {header && (
        <div className="flex-shrink-0 border-b">
          {header}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function MasterDetailEmptyState({
  icon,
  title = 'No item selected',
  description = 'Select an item from the list to view details',
  action,
  className,
}: MasterDetailEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-center p-8 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ============================================================================
// LOADING COMPONENT
// ============================================================================

function MasterDetailLoading({
  className,
  message = 'Loading...',
}: MasterDetailLoadingProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-center gap-3',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

function MasterDetailToolbar({
  children,
  className,
  showCollapse = true,
  showMaximize = true,
}: MasterDetailToolbarProps) {
  const { splitPane, detailPanel } = useMasterDetailContext();

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-4 py-2',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {showCollapse && splitPane && (
          <button
            onClick={splitPane.toggleCollapse}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
            title={splitPane.isCollapsed ? 'Show list' : 'Hide list'}
          >
            {splitPane.isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {children}

        {showMaximize && detailPanel && (
          <button
            onClick={() => {
              if (detailPanel.mode === 'fullscreen') {
                detailPanel.setMode('side');
              } else {
                detailPanel.setMode('fullscreen');
              }
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
            title={detailPanel.mode === 'fullscreen' ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {detailPanel.mode === 'fullscreen' ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LIST INFO COMPONENT
// ============================================================================

export interface MasterDetailListInfoProps {
  className?: string;
}

function MasterDetailListInfo({ className }: MasterDetailListInfoProps) {
  const { masterList } = useMasterDetailContext();

  if (!masterList) return null;

  return (
    <div className={cn('px-4 py-2 text-xs text-muted-foreground', className)}>
      {masterList.isSearching ? (
        <span>
          {masterList.filteredCount} of {masterList.totalCount} items
        </span>
      ) : (
        <span>{masterList.totalCount} items</span>
      )}
    </div>
  );
}

// ============================================================================
// NAVIGATION COMPONENT
// ============================================================================

export interface MasterDetailNavigationProps {
  className?: string;
  showCount?: boolean;
}

function MasterDetailNavigation({
  className,
  showCount = true,
}: MasterDetailNavigationProps) {
  const { masterList } = useMasterDetailContext();

  if (!masterList || !masterList.selectedItem) return null;

  const currentIndex = masterList.selectedId
    ? masterList.getItemIndex(masterList.selectedId)
    : -1;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={masterList.selectPrevious}
        disabled={currentIndex <= 0}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-50"
        title="Previous"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {showCount && (
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {masterList.filteredCount}
        </span>
      )}

      <button
        onClick={masterList.selectNext}
        disabled={currentIndex >= masterList.filteredCount - 1}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-50"
        title="Next"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ============================================================================
// EXPORT COMPOUND COMPONENT
// ============================================================================

export const MasterDetail = Object.assign(MasterDetailRoot, {
  List: MasterDetailList,
  Search: MasterDetailSearch,
  ListItem: MasterDetailListItem,
  Group: MasterDetailGroup,
  Resizer: MasterDetailResizer,
  Detail: MasterDetailDetail,
  EmptyState: MasterDetailEmptyState,
  Loading: MasterDetailLoading,
  Toolbar: MasterDetailToolbar,
  ListInfo: MasterDetailListInfo,
  Navigation: MasterDetailNavigation,
});

// Types are exported inline with their interfaces
