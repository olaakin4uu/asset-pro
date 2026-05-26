'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ============================================================================
// STAT CARD TYPES
// ============================================================================

export interface StatCardColor {
  gradient: string;
  darkGradient: string;
  text: string;
  valueText: string;
  iconBg: string;
}

export interface StatCardTrend {
  value: number;
  direction: 'up' | 'down' | 'neutral';
  label?: string;
}

export interface StatCardProgress {
  value: number;
  max?: number;
  label?: string;
}

export interface StatCardBadge {
  label: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  pulse?: boolean;
}

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: StatCardColor;
  trend?: StatCardTrend;
  progress?: StatCardProgress;
  badge?: StatCardBadge;
  className?: string;
  loading?: boolean;
}

// ============================================================================
// COLOR PRESETS
// ============================================================================

const _colors = {
  blue: {
    gradient: 'from-blue-50 to-blue-100',
    darkGradient: 'dark:from-blue-900/20 dark:to-blue-800/20',
    text: 'text-blue-700 dark:text-blue-300',
    valueText: 'text-blue-900 dark:text-blue-100',
    iconBg: 'bg-blue-500',
  },
  green: {
    gradient: 'from-green-50 to-green-100',
    darkGradient: 'dark:from-green-900/20 dark:to-green-800/20',
    text: 'text-green-700 dark:text-green-300',
    valueText: 'text-green-900 dark:text-green-100',
    iconBg: 'bg-green-500',
  },
  purple: {
    gradient: 'from-purple-50 to-purple-100',
    darkGradient: 'dark:from-purple-900/20 dark:to-purple-800/20',
    text: 'text-purple-700 dark:text-purple-300',
    valueText: 'text-purple-900 dark:text-purple-100',
    iconBg: 'bg-purple-500',
  },
  orange: {
    gradient: 'from-orange-50 to-orange-100',
    darkGradient: 'dark:from-orange-900/20 dark:to-orange-800/20',
    text: 'text-orange-700 dark:text-orange-300',
    valueText: 'text-orange-900 dark:text-orange-100',
    iconBg: 'bg-orange-500',
  },
  red: {
    gradient: 'from-red-50 to-red-100',
    darkGradient: 'dark:from-red-900/20 dark:to-red-800/20',
    text: 'text-red-700 dark:text-red-300',
    valueText: 'text-red-900 dark:text-red-100',
    iconBg: 'bg-red-500',
  },
  amber: {
    gradient: 'from-amber-50 to-amber-100',
    darkGradient: 'dark:from-amber-900/20 dark:to-amber-800/20',
    text: 'text-amber-700 dark:text-amber-300',
    valueText: 'text-amber-900 dark:text-amber-100',
    iconBg: 'bg-amber-500',
  },
  indigo: {
    gradient: 'from-indigo-50 to-indigo-100',
    darkGradient: 'dark:from-indigo-900/20 dark:to-indigo-800/20',
    text: 'text-indigo-700 dark:text-indigo-300',
    valueText: 'text-indigo-900 dark:text-indigo-100',
    iconBg: 'bg-indigo-500',
  },
  cyan: {
    gradient: 'from-cyan-50 to-cyan-100',
    darkGradient: 'dark:from-cyan-900/20 dark:to-cyan-800/20',
    text: 'text-cyan-700 dark:text-cyan-300',
    valueText: 'text-cyan-900 dark:text-cyan-100',
    iconBg: 'bg-cyan-500',
  },
  pink: {
    gradient: 'from-pink-50 to-pink-100',
    darkGradient: 'dark:from-pink-900/20 dark:to-pink-800/20',
    text: 'text-pink-700 dark:text-pink-300',
    valueText: 'text-pink-900 dark:text-pink-100',
    iconBg: 'bg-pink-500',
  },
  slate: {
    gradient: 'from-slate-50 to-slate-100',
    darkGradient: 'dark:from-slate-900/20 dark:to-slate-800/20',
    text: 'text-slate-700 dark:text-slate-300',
    valueText: 'text-slate-900 dark:text-slate-100',
    iconBg: 'bg-slate-500',
  },
  gray: {
    gradient: 'from-gray-50 to-gray-100',
    darkGradient: 'dark:from-gray-900/20 dark:to-gray-800/20',
    text: 'text-gray-700 dark:text-gray-300',
    valueText: 'text-gray-900 dark:text-gray-100',
    iconBg: 'bg-gray-500',
  },
  yellow: {
    gradient: 'from-yellow-50 to-yellow-100',
    darkGradient: 'dark:from-yellow-900/20 dark:to-yellow-800/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    valueText: 'text-yellow-900 dark:text-yellow-100',
    iconBg: 'bg-yellow-500',
  },
  emerald: {
    gradient: 'from-emerald-50 to-emerald-100',
    darkGradient: 'dark:from-emerald-900/20 dark:to-emerald-800/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    valueText: 'text-emerald-900 dark:text-emerald-100',
    iconBg: 'bg-emerald-500',
  },
  rose: {
    gradient: 'from-rose-50 to-rose-100',
    darkGradient: 'dark:from-rose-900/20 dark:to-rose-800/20',
    text: 'text-rose-700 dark:text-rose-300',
    valueText: 'text-rose-900 dark:text-rose-100',
    iconBg: 'bg-rose-500',
  },
} as const;

export const StatCardColors = {
  ..._colors,
  // Semantic aliases
  success: _colors.green,
  danger: _colors.red,
  warning: _colors.amber,
  info: _colors.blue,
} as const;

// ============================================================================
// BADGE VARIANTS
// ============================================================================

const badgeVariants = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  progress,
  badge,
  className,
  loading = false,
}: StatCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;

  const trendColor =
    trend?.direction === 'up'
      ? 'text-green-600 dark:text-green-400'
      : trend?.direction === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-500 dark:text-gray-400';

  if (loading) {
    return (
      <div
        className={cn(
          'rounded-xl border p-4',
          `bg-gradient-to-br ${color.gradient} ${color.darkGradient}`,
          className
        )}
      >
        <div className="animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-4 w-24 bg-current/10 rounded mb-2" />
              <div className="h-8 w-32 bg-current/10 rounded mb-2" />
              {subtitle && <div className="h-3 w-20 bg-current/10 rounded" />}
            </div>
            <div className="h-10 w-10 bg-current/10 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all hover:shadow-md hover:scale-[1.01] h-full',
        `bg-gradient-to-br ${color.gradient} ${color.darkGradient}`,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={cn('text-sm font-medium truncate', color.text)}>{title}</p>
            {badge && (
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  badgeVariants[badge.variant || 'default'],
                  badge.pulse && 'animate-pulse'
                )}
              >
                {badge.label}
              </span>
            )}
          </div>
          <p className={cn('font-bold tracking-tight truncate', color.valueText, String(value).length > 15 ? 'text-sm' : String(value).length > 10 ? 'text-base' : 'text-xl')} title={String(value)}>{value}</p>
          {subtitle && <p className={cn('text-xs mt-0.5', color.text, 'opacity-80')}>{subtitle}</p>}

          {/* Trend indicator */}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon className={cn('h-4 w-4', trendColor)} />
              <span className={cn('text-sm font-medium', trendColor)}>
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              {trend.label && <span className={cn('text-xs', color.text, 'opacity-70')}>{trend.label}</span>}
            </div>
          )}

          {/* Progress bar */}
          {progress && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                {progress.label && <span className={cn('text-xs', color.text)}>{progress.label}</span>}
                <span className={cn('text-xs font-medium', color.text)}>
                  {progress.value}%
                </span>
              </div>
              <div className="h-2 bg-current/10 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', color.iconBg)}
                  style={{ width: `${Math.min(progress.value, progress.max || 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className={cn('rounded-lg p-2.5 ml-3 flex-shrink-0', color.iconBg)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STAT CARDS GRID COMPONENT
// ============================================================================

export interface StatCardsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function StatCardsGrid({ children, columns = 4, className }: StatCardsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  };

  return <div className={cn('grid gap-4 items-stretch', gridCols[columns], className)}>{children}</div>;
}
