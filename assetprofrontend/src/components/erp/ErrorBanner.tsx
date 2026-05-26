'use client';

import { XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ErrorBannerProps {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({ message, onDismiss, className }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div role="alert" aria-live="assertive" className={cn('mb-6 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 p-4', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
