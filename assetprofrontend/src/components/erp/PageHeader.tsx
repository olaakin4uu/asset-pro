'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface PageHeaderAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  tooltip?: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  hidden?: boolean;
}

export interface PageHeaderBadge {
  text: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning';
}

export interface PageHeaderProps {
  // Required
  icon: React.ComponentType<{ className?: string }>;
  title: string;

  // Optional
  description?: string;
  badge?: PageHeaderBadge;
  actions?: PageHeaderAction[];

  // Gradient customization
  gradientFrom?: string;
  gradientVia?: string;
  gradientTo?: string;

  // Behavior
  sticky?: boolean;

  // Custom content
  children?: React.ReactNode;

  // Styling
  className?: string;
}

// ============================================================================
// BADGE VARIANTS
// ============================================================================

const badgeVariants = {
  default: 'bg-primary/10 text-primary border-primary/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  outline: 'bg-background text-foreground border-border',
  secondary: 'bg-secondary text-secondary-foreground border-secondary',
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
};

// ============================================================================
// BUTTON VARIANTS
// ============================================================================

const buttonVariants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-input bg-background hover:bg-muted',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-muted',
};

const buttonSizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10',
};

// ============================================================================
// TOOLTIP COMPONENT (inline for simplicity)
// ============================================================================

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = React.useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md border animate-in fade-in-0 zoom-in-95">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PageHeader({
  icon: Icon,
  title,
  description,
  badge,
  actions = [],
  gradientFrom = 'from-blue-600',
  gradientVia = 'via-purple-600',
  gradientTo = 'to-indigo-700',
  sticky = true,
  children,
  className,
}: PageHeaderProps) {
  const visibleActions = actions.filter((action) => !action.hidden);

  return (
    <div
      className={cn(
        // Negative margins to extend to walls (counteract parent padding)
        '-mx-4 sm:-mx-6 lg:-mx-8',
        'bg-background/80 backdrop-blur-sm border-b mb-6 print:hidden',
        sticky && 'sticky top-0 z-10',
        className
      )}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5" />

      {/* Inner content with padding matching body content */}
      <div className="relative px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          {/* Left side: Icon, Title, Description */}
          <div className="flex items-center gap-3">
            {/* Animated Icon Container */}
            <div
              className={cn(
                'relative p-3 rounded-xl shadow-lg ring-2 ring-primary/20 transition-all duration-300 group hover:shadow-xl',
                `bg-gradient-to-br ${gradientFrom} ${gradientVia} ${gradientTo}`
              )}
            >
              <Icon className="h-7 w-7 text-white drop-shadow-md transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-white/5 blur-lg" />
            </div>

            {/* Title and Description */}
            <div>
              <h1 className="flex flex-col gap-2 text-xl font-bold text-foreground sm:flex-row sm:items-center sm:gap-2 sm:text-2xl">
                {title}
                {badge && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                      badgeVariants[badge.variant || 'outline']
                    )}
                  >
                    {badge.icon && <badge.icon className="h-3 w-3" />}
                    {badge.text}
                  </span>
                )}
              </h1>
              {description && (
                <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Right side: Action Buttons */}
          {visibleActions.length > 0 && (
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
              {visibleActions.map((action) => {
                const ButtonContent = (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    disabled={action.disabled || action.loading}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      buttonVariants[action.variant || 'outline'],
                      buttonSizes[action.size || 'sm']
                    )}
                  >
                    {action.loading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <action.icon className="h-4 w-4" />
                    )}
                    {action.size !== 'icon' && action.label}
                  </button>
                );

                if (action.tooltip) {
                  return (
                    <Tooltip key={action.id} content={action.tooltip}>
                      {ButtonContent}
                    </Tooltip>
                  );
                }

                return ButtonContent;
              })}
            </div>
          )}

          {/* Custom content slot */}
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Common PageHeader configurations for different module types.
 * Use these as starting points for module pages.
 */
export const PageHeaderPresets = {
  // Financial modules (Accounts, Budget, Payables, Receivables)
  financial: {
    gradientFrom: 'from-emerald-600',
    gradientVia: 'via-teal-600',
    gradientTo: 'to-cyan-700',
  },

  // Operations modules (Inventory, Manufacturing, Fleet)
  operations: {
    gradientFrom: 'from-orange-600',
    gradientVia: 'via-amber-600',
    gradientTo: 'to-yellow-700',
  },

  // HR modules (HRPayroll)
  hr: {
    gradientFrom: 'from-violet-600',
    gradientVia: 'via-purple-600',
    gradientTo: 'to-fuchsia-700',
  },

  // Sales modules (Sales, POS, Receivables)
  sales: {
    gradientFrom: 'from-blue-600',
    gradientVia: 'via-indigo-600',
    gradientTo: 'to-violet-700',
  },

  // Core/Admin modules
  core: {
    gradientFrom: 'from-slate-600',
    gradientVia: 'via-gray-600',
    gradientTo: 'to-zinc-700',
  },

  // AI/Analytics
  ai: {
    gradientFrom: 'from-pink-600',
    gradientVia: 'via-rose-600',
    gradientTo: 'to-red-700',
  },

  // Education modules (School Management)
  education: {
    gradientFrom: 'from-emerald-500',
    gradientVia: 'via-teal-500',
    gradientTo: 'to-cyan-600',
  },
};
