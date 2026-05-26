'use client';

import { useState } from 'react';
import { Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { settingsApi } from '@/lib/api/settings';
import { extractErrorMessage } from '@/lib/utils';

export default function PasswordSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    try {
      setSaving(true);
      await settingsApi.changePassword(formData);
      setSuccess(true);
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to change password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          Password changed successfully
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h3 className="font-semibold">Change Password</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Ensure your account is using a strong, unique password
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium mb-2">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  aria-required="true"
                  type={showCurrent ? 'text' : 'password'}
                  id="currentPassword" value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  aria-required="true"
                  type={showNew ? 'text' : 'password'}
                  id="newPassword" value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full rounded-lg border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, and a number
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                aria-required="true"
                type="password"
                id="confirmPassword" value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                required
                minLength={8}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Change Password
          </button>
        </div>
      </form>
    </div>
  );
}
