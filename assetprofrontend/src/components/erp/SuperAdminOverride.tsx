'use client';

import { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { superAdminOverrideApi } from '@/lib/api/core';
import { extractErrorMessage } from '@/lib/utils';

interface SuperAdminOverrideProps {
  entityType: string;
  entityId: number;
  onSuccess?: () => void;
  label?: string;
}

/**
 * Drop-in Super Admin override panel.
 * Shows only if current user is Super Admin.
 * Provides "Override All Approvals" with mandatory reason.
 *
 * Usage:
 * ```tsx
 * <SuperAdminOverride
 *   entityType="sales_orders"
 *   entityId={order.id}
 *   onSuccess={() => queryClient.invalidateQueries(...)}
 * />
 * ```
 */
export function SuperAdminOverride({ entityType, entityId, onSuccess, label }: SuperAdminOverrideProps) {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.roles?.includes('Super Admin') || user?.role === 'Super Admin';

  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isSuperAdmin) return null;

  const handleOverride = async () => {
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Override reason is required (minimum 5 characters)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await superAdminOverrideApi.override({ entityType, entityId, reason: reason.trim() });
      setSuccess('All approvals overridden successfully');
      setShowForm(false);
      setReason('');
      onSuccess?.();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Override failed'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border-2 border-green-300 bg-green-50 dark:bg-green-900/10 p-4 text-sm text-green-700 font-medium flex items-center gap-2">
        <Zap className="h-4 w-4" /> {success}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-5 w-5 text-amber-600" />
        <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">Super Admin Override</h3>
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-400 mb-4">
        {label || 'Override all pending approvals and mark this record as approved. This action is logged for audit purposes.'}
      </p>

      {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-600">{error}</div>}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-amber-400 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors"
        >
          <Zap className="h-4 w-4" /> Override All Approvals
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
              Reason for Override <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Provide a detailed reason for overriding all pending approvals (required, min 5 characters)..."
              className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleOverride}
              disabled={loading || reason.trim().length < 5}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Confirm Override
            </button>
            <button
              onClick={() => { setShowForm(false); setReason(''); setError(null); }}
              className="px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
