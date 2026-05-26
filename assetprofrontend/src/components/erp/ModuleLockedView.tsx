'use client';

import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';

export interface ModuleLockedViewProps {
  moduleName: string;
  description?: string;
}

export function ModuleLockedView({
  moduleName,
  description = 'This module is not enabled for your organization.',
}: ModuleLockedViewProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">
          {moduleName}
        </h2>
        <p className="mb-2 text-muted-foreground">
          {description}
        </p>
        <p className="mb-6 text-sm text-muted-foreground">
          Contact your administrator or upgrade your plan to access this module.
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View Plans
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
