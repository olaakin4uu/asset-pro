'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';

// ============================================================================
// TYPES
// ============================================================================

export interface DetailShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  allowFullscreen?: boolean;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
}

// ============================================================================
// WIDTH CLASSES
// ============================================================================

const widthClasses = {
  sm: 'max-w-lg',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[90vw]',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DetailShell({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  headerActions,
  children,
  className,
  width = 'xl',
  allowFullscreen = true,
  showCloseButton = true,
  closeOnEscape = true,
  closeOnOverlayClick = true,
}: DetailShellProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trap: keep Tab cycling within the panel when open
  useFocusTrap({
    enabled: open,
    containerRef: panelRef,
    initialFocusSelector: '[role="tab"][aria-selected="true"], button[aria-label="Close dialog"]',
  });

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, closeOnEscape, onOpenChange]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleOverlayClick = useCallback(() => {
    if (closeOnOverlayClick) {
      onOpenChange(false);
    }
  }, [closeOnOverlayClick, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="detail-shell-title">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleOverlayClick}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'absolute right-0 top-0 h-full bg-background shadow-2xl',
          'flex flex-col',
          'animate-in slide-in-from-right duration-300',
          isFullscreen ? 'w-full' : widthClasses[width],
          'w-full',
          className
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
              </div>
            )}
            <div>
              <h2 id="detail-shell-title" className="text-lg font-semibold">{title}</h2>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Header Actions (Toolbar) */}
            {headerActions}

            {allowFullscreen && (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </button>
            )}
            {showCloseButton && (
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Close (Esc)"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOUND COMPONENTS
// ============================================================================

export interface DetailShellSidebarProps {
  children: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  width?: string;
  className?: string;
}

function DetailShellSidebar({
  children,
  collapsed = false,
  onToggle,
  width = '280px',
  className,
}: DetailShellSidebarProps) {
  return (
    <div
      className={cn(
        'border-r bg-muted/30 transition-all duration-300 flex flex-col',
        collapsed ? 'w-0 overflow-hidden' : '',
        className
      )}
      style={{ width: collapsed ? 0 : width }}
    >
      {onToggle && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      )}
      {!collapsed && children}
    </div>
  );
}

export interface DetailShellMainProps {
  children: React.ReactNode;
  className?: string;
}

function DetailShellMain({ children, className }: DetailShellMainProps) {
  return (
    <div className={cn('flex flex-1 flex-col overflow-hidden', className)}>{children}</div>
  );
}

export interface DetailShellTabsProps {
  children: React.ReactNode;
  className?: string;
}

function DetailShellTabs({ children, className }: DetailShellTabsProps) {
  const tablistRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!tablistRef.current) return;

    const tabs = Array.from(
      tablistRef.current.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
    );
    if (tabs.length === 0) return;

    const currentIndex = tabs.indexOf(e.target as HTMLButtonElement);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  }, []);

  return (
    <div className={cn('border-b', className)}>
      <div ref={tablistRef} role="tablist" className="flex gap-1 px-6" onKeyDown={handleKeyDown}>
        {children}
      </div>
    </div>
  );
}

export interface DetailShellTabProps {
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children: React.ReactNode;
}

function DetailShellTab({
  active,
  onClick,
  disabled,
  icon,
  badge,
  children,
}: DetailShellTabProps) {
  // Support both ReactNode and ComponentType (including forwardRef) for icon
  let renderedIcon: React.ReactNode = null;
  if (icon) {
    if (typeof icon === 'function') {
      // Plain function component or class component
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      renderedIcon = <IconComponent className="h-4 w-4" />;
    } else if (
      typeof icon === 'object' &&
      icon !== null &&
      '$$typeof' in (icon as Record<string, unknown>) &&
      'render' in (icon as Record<string, unknown>)
    ) {
      // forwardRef component (has $$typeof AND render, unlike React elements which have $$typeof and type)
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      renderedIcon = <IconComponent className="h-4 w-4" />;
    } else {
      // Already-rendered JSX element or other ReactNode
      renderedIcon = icon;
    }
  }

  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={disabled}
      tabIndex={active ? 0 : -1}
      className={cn(
        'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {renderedIcon}
      {children}
      {badge !== undefined && (
        <span
          className={cn(
            'ml-1 rounded-full px-2 py-0.5 text-xs',
            active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export interface DetailShellContentProps {
  children: React.ReactNode;
  className?: string;
}

function DetailShellContent({ children, className }: DetailShellContentProps) {
  return (
    <div className={cn('flex-1 overflow-auto p-6', className)}>{children}</div>
  );
}

export interface DetailShellActionsProps {
  children: React.ReactNode;
  className?: string;
}

function DetailShellActions({ children, className }: DetailShellActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 border-t bg-muted/30 px-6 py-4',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// LAYOUT COMPONENT
// ============================================================================

export interface DetailShellLayoutProps {
  children: React.ReactNode;
  className?: string;
}

function DetailShellLayout({ children, className }: DetailShellLayoutProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>{children}</div>
  );
}

function DetailShellBody({ children, className }: DetailShellLayoutProps) {
  return (
    <div className={cn('flex flex-1 overflow-hidden', className)}>{children}</div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

DetailShell.Sidebar = DetailShellSidebar;
DetailShell.Main = DetailShellMain;
DetailShell.Tabs = DetailShellTabs;
DetailShell.Tab = DetailShellTab;
DetailShell.Content = DetailShellContent;
DetailShell.Actions = DetailShellActions;
DetailShell.Layout = DetailShellLayout;
DetailShell.Body = DetailShellBody;
