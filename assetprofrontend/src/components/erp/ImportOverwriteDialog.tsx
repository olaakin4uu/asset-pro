'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImportOverwriteDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  entityName: string;
  itemCount?: number;
}

export function ImportOverwriteDialog({
  open,
  onConfirm,
  onCancel,
  entityName,
  itemCount,
}: ImportOverwriteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      };
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 animate-in zoom-in-95 fade-in duration-200">
        <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-red-200 dark:border-red-900/50 overflow-hidden">
          {/* Red warning header bar */}
          <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm">
                <ShieldAlert className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Destructive Action</h3>
                <p className="text-xs text-red-100">This cannot be undone</p>
              </div>
              <button
                onClick={onCancel}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {/* Warning icon + message */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 mt-0.5">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Permanently delete all {entityName} records?
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Overwrite mode will <span className="font-semibold text-red-600 dark:text-red-400">permanently delete</span> all
                  existing {entityName} records for this company before importing
                  {itemCount ? ` ${itemCount} new` : ''} records.
                </p>
              </div>
            </div>

            {/* Warning callout */}
            <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-medium">What this means:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-400">
                    <li>All existing records will be permanently removed</li>
                    <li>Related transactions may be affected</li>
                    <li>This action cannot be reversed or recovered</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button
              ref={cancelRef}
              onClick={onCancel}
              className={cn(
                'px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
                'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800',
                'border border-gray-300 dark:border-gray-600',
                'hover:bg-gray-50 dark:hover:bg-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600',
              )}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all',
                'text-white bg-red-600 hover:bg-red-700',
                'shadow-sm hover:shadow-md',
                'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                'dark:focus:ring-offset-gray-900',
              )}
            >
              <Trash2 className="h-4 w-4" />
              Delete All & Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
