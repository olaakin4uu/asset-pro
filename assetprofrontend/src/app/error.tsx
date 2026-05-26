'use client';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
