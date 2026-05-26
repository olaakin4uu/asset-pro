'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';

// ============================================================================
// TYPES
// ============================================================================

export interface QuickCreateContext {
  /** Whether drawer is in expanded mode */
  isExpanded: boolean;
  /** Toggle between compact (400px) and expanded (720px) */
  toggleExpand: () => void;
}

export interface QuickCreateDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Called when drawer should close (backdrop click, escape, cancel) */
  onClose: () => void;
  /** Drawer header title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Render prop receiving expansion context */
  children: (ctx: QuickCreateContext) => React.ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function QuickCreateDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: QuickCreateDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // SSR safety — only render portal after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset expanded state when drawer closes
  useEffect(() => {
    if (!open) {
      setIsExpanded(false);
    }
  }, [open]);

  // Focus trap
  useFocusTrap({
    enabled: open && mounted,
    containerRef: panelRef,
    initialFocusSelector: 'input:not([disabled]), select:not([disabled])',
  });

  // Body scroll lock
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

  // Escape key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-create-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'absolute right-0 top-0 h-full bg-background shadow-2xl',
          'flex flex-col',
          'animate-in slide-in-from-right duration-300',
          'transition-[width] duration-300 ease-in-out',
          isExpanded ? 'w-[720px]' : 'w-[400px]',
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="min-w-0">
            <h3
              id="quick-create-title"
              className="truncate text-base font-semibold"
            >
              {title}
            </h3>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleExpand}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={isExpanded ? 'Compact view' : 'More details'}
              aria-label={isExpanded ? 'Compact view' : 'More details'}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Close (Esc)"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content — render prop */}
        <div className="flex-1 overflow-y-auto p-4">
          {children({ isExpanded, toggleExpand })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
