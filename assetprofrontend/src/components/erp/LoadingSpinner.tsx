'use client';

import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullPage?: boolean;
  tableRow?: boolean;
  colSpan?: number;
}

const sizeClasses = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
} as const;

function Spinner({ size = 'md', className }: Pick<LoadingSpinnerProps, 'size' | 'className'>) {
  return (
    <div className={cn('animate-spin rounded-full border-primary border-t-transparent', sizeClasses[size], className)} />
  );
}

export function LoadingSpinner({ className, size = 'md', message, fullPage, tableRow, colSpan = 8 }: LoadingSpinnerProps) {
  if (tableRow) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-4 py-12 text-center">
          <div className="flex flex-col items-center justify-center gap-2">
            <Spinner size={size} />
            {message && <span className="text-sm text-muted-foreground">{message}</span>}
          </div>
        </td>
      </tr>
    );
  }

  if (fullPage) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <Spinner size={size} />
        {message && <span className="mt-2 text-sm text-muted-foreground">{message}</span>}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Spinner size={size} />
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  );
}
