'use client';

import { Clock, LogOut, RefreshCw } from 'lucide-react';

interface IdleWarningDialogProps {
  open: boolean;
  secondsLeft: number;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

export function IdleWarningDialog({ open, secondsLeft, onStayLoggedIn, onLogoutNow }: IdleWarningDialogProps) {
  if (!open) return null;

  const isUrgent = secondsLeft <= 15;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Top accent bar */}
        <div className={`h-1 w-full ${isUrgent ? 'bg-red-500' : 'bg-amber-400'}`} />

        <div className="p-6">
          {/* Icon + title */}
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${isUrgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
              <Clock className={`h-6 w-6 ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Session Timeout Warning
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                You've been inactive. For your security, you will be logged out automatically.
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div className={`mt-5 flex items-center justify-center gap-2 rounded-xl py-4 ${isUrgent ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
            <span className={`text-4xl font-bold tabular-nums ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {secondsLeft}
            </span>
            <span className={`text-sm font-medium ${isUrgent ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`}>
              seconds
            </span>
          </div>

          {/* Actions */}
          <div className="mt-5 flex gap-3">
            <button
              onClick={onStayLoggedIn}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" />
              Stay Logged In
            </button>
            <button
              onClick={onLogoutNow}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
