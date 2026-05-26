'use client';

import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="rounded-full bg-muted p-3 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
