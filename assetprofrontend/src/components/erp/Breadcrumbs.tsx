'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/core';

// ============================================================================
// TYPES
// ============================================================================

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHomeIcon?: boolean;
  maxItems?: number;
  className?: string;
}

// ============================================================================
// DROPDOWN COMPONENT
// ============================================================================

interface BreadcrumbDropdownProps {
  item: BreadcrumbItem;
  isFirst: boolean;
  showHomeIcon: boolean;
}

function BreadcrumbDropdown({ item, isFirst, showHomeIcon }: BreadcrumbDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${item.title} - Show ${item.children?.length || 0} sub-items`}
      >
        {isFirst && showHomeIcon && (
          item.icon ? (
            <item.icon className="h-4 w-4 mr-1" aria-hidden="true" />
          ) : (
            <Home className="h-4 w-4 mr-1" aria-hidden="true" />
          )
        )}
        {item.title}
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>

      {open && item.children && item.children.length > 0 && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border bg-popover p-1 shadow-lg',
            'animate-in fade-in-0 zoom-in-95'
          )}
          role="menu"
          aria-label={`${item.title} sub-items`}
        >
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                'flex flex-col gap-0.5 rounded-md px-3 py-2',
                'text-sm hover:bg-muted transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary'
              )}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className="font-medium text-foreground">{child.title}</span>
              {child.description && (
                <span className="text-xs text-muted-foreground">{child.description}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Breadcrumbs({
  items,
  showHomeIcon = true,
  maxItems = 5,
  className,
}: BreadcrumbsProps) {
  const breadcrumbRef = React.useRef<HTMLElement>(null);

  // Truncate breadcrumbs if too many
  const displayItems = React.useMemo(() => {
    if (items.length <= maxItems) {
      return items;
    }

    return [
      items[0],
      {
        title: '...',
        children: items.slice(1, -2).map((item) => ({
          title: item.title,
          href: item.href || '#',
          description: `Navigate to ${item.title}`,
        })),
      },
      ...items.slice(-2),
    ];
  }, [items, maxItems]);

  // Keyboard navigation
  const handleKeyDown = React.useCallback((event: KeyboardEvent) => {
    if (!breadcrumbRef.current?.contains(event.target as Node)) return;

    const focusableElements = breadcrumbRef.current.querySelectorAll(
      'a, button, [tabindex="0"]'
    ) as NodeListOf<HTMLElement>;

    const currentIndex = Array.from(focusableElements).indexOf(event.target as HTMLElement);

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        if (currentIndex < focusableElements.length - 1) {
          focusableElements[currentIndex + 1].focus();
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (currentIndex > 0) {
          focusableElements[currentIndex - 1].focus();
        }
        break;
      case 'Home':
        event.preventDefault();
        focusableElements[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        focusableElements[focusableElements.length - 1]?.focus();
        break;
    }
  }, []);

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <nav
      ref={breadcrumbRef}
      aria-label="Breadcrumb"
      role="navigation"
      className={cn('relative', className)}
    >
      <ol className="flex items-center flex-wrap gap-1">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isFirst = index === 0;
          const hasDropdown = item.children && item.children.length > 0;

          return (
            <li key={`${item.title}-${index}`} className="flex items-center">
              {/* Separator (except for first item) */}
              {index > 0 && (
                <ChevronRight
                  className="h-4 w-4 mx-1 text-muted-foreground/50"
                  aria-hidden="true"
                />
              )}

              {/* Dropdown for truncated items or items with children */}
              {hasDropdown ? (
                <BreadcrumbDropdown
                  item={item}
                  isFirst={isFirst}
                  showHomeIcon={showHomeIcon}
                />
              ) : isLast ? (
                /* Current page (last item) */
                <span
                  aria-current="page"
                  className="flex items-center px-2 py-1 text-sm font-medium text-foreground"
                >
                  {isFirst && showHomeIcon && (
                    item.icon ? (
                      <item.icon className="h-4 w-4 mr-1" aria-hidden="true" />
                    ) : (
                      <Home className="h-4 w-4 mr-1" aria-hidden="true" />
                    )
                  )}
                  {item.title}
                </span>
              ) : (
                /* Regular link */
                <Link
                  href={item.href || '#'}
                  className={cn(
                    'flex items-center rounded-md px-2 py-1 text-sm font-medium',
                    'text-muted-foreground hover:text-foreground hover:bg-muted',
                    'transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                  )}
                  aria-label={`Navigate to ${item.title}`}
                >
                  {isFirst && showHomeIcon && (
                    item.icon ? (
                      <item.icon className="h-4 w-4 mr-1" aria-hidden="true" />
                    ) : (
                      <Home className="h-4 w-4 mr-1" aria-hidden="true" />
                    )
                  )}
                  {item.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default Breadcrumbs;
