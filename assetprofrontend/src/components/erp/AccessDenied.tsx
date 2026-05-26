'use client';

import { ShieldOff, ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AccessDeniedProps {
  /** What the user was trying to do. e.g. "view employees" */
  action?: string;
  /** Show a Back button (default true) */
  showBack?: boolean;
  /** Show a Go to Dashboard button (default true) */
  showHome?: boolean;
  /** Replace the default description */
  description?: string;
  /** Render inline (card) instead of full-page */
  inline?: boolean;
}

/**
 * AccessDenied — shown when the user navigates to a page or section they
 * don't have permission to access.
 *
 * Usage (full page):
 *   if (!canView) return <AccessDenied action="view employees" />;
 *
 * Usage (inline / partial section):
 *   <AccessDenied action="view payroll" inline />
 */
export function AccessDenied({
  action,
  showBack = true,
  showHome = true,
  description,
  inline = false,
}: AccessDeniedProps) {
  const router = useRouter();

  const desc = description
    ?? (action
        ? `You don't have permission to ${action}. Contact your administrator to request access.`
        : `You don't have permission to access this section. Contact your administrator to request access.`);

  if (inline) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <ShieldOff className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-amber-900 dark:text-amber-200">
            Access Restricted
          </h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300 max-w-sm">{desc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center px-4">
      {/* Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <ShieldOff className="h-10 w-10 text-amber-600 dark:text-amber-400" />
      </div>

      {/* Text */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Access Restricted</h1>
        <p className="text-muted-foreground max-w-md text-sm leading-relaxed">{desc}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        )}
        {showHome && (
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
