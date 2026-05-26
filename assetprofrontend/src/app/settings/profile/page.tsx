'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Loader2, ShieldAlert, Upload, Pen, Trash2, Globe } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';
import { extractErrorMessage } from '@/lib/utils';
import { useIsSuperAdmin } from '@/hooks/usePermission';
import { locales, localeNames, defaultLocale, isLocale, type Locale } from '@/i18n/config';
import { setStoredLocale } from '@/providers/LocaleProvider';

export default function ProfileSettingsPage() {
  const isSuperAdmin = useIsSuperAdmin();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => settingsApi.getProfile(),
  });
  const error_display = fetchError ? extractErrorMessage(fetchError, 'Failed to load profile') : null;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [sigUploading, setSigUploading] = useState(false);
  const [sigError, setSigError] = useState<string | null>(null);
  const [sigSuccess, setSigSuccess] = useState(false);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // Language / locale state — independent of the name/email form above so
  // non-Super-Admin users can still change their own UI language.
  const [localeValue, setLocaleValue] = useState<Locale>(defaultLocale);
  const [localeSaving, setLocaleSaving] = useState(false);
  const [localeError, setLocaleError] = useState<string | null>(null);
  const [localeSuccess, setLocaleSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({ name: profile.name, email: profile.email });
      if (isLocale(profile.locale)) setLocaleValue(profile.locale as Locale);
    }
  }, [profile]);

  const handleLocaleSave = async () => {
    if (!profile || localeValue === profile.locale) {
      setLocaleSuccess(true);
      setTimeout(() => setLocaleSuccess(false), 2000);
      return;
    }
    try {
      setLocaleSaving(true);
      setLocaleError(null);
      setLocaleSuccess(false);
      await settingsApi.updateProfile({ locale: localeValue });
      setStoredLocale(localeValue);
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
      setLocaleSuccess(true);
      setTimeout(() => setLocaleSuccess(false), 3000);
    } catch (err: unknown) {
      setLocaleError(extractErrorMessage(err, 'Failed to update language'));
    } finally {
      setLocaleSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !isSuperAdmin) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const updates: { name?: string; email?: string } = {};
      if (formData.name !== profile.name) updates.name = formData.name;
      if (formData.email !== profile.email) updates.email = formData.email;

      if (Object.keys(updates).length === 0) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        return;
      }

      await settingsApi.updateProfile(updates);
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(error || error_display) && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error || error_display}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          Profile updated successfully
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h3 className="font-semibold">Profile Information</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isSuperAdmin ? 'Update your name and email address' : 'Your profile information. Contact your administrator to make changes.'}
            </p>
            {!isSuperAdmin && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
                Only a Super Admin can edit profile information
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                aria-required="true"
                type="text"
                id="name" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isSuperAdmin}
                className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${!isSuperAdmin ? 'bg-muted cursor-not-allowed' : ''}`}
                required
                minLength={2}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                aria-required="true"
                type="email"
                id="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isSuperAdmin}
                className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${!isSuperAdmin ? 'bg-muted cursor-not-allowed' : ''}`}
                required
              />
            </div>

            {profile && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Company</label>
                  <p className="text-sm">{profile.companyName || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Branch</label>
                  <p className="text-sm">{profile.branchName || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">User Type</label>
                  <p className="text-sm">{profile.userType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Member Since</label>
                  <p className="text-sm">{new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {isSuperAdmin && (
          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        )}
      </form>

      {/* Language */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4" /> Language
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Pick your preferred UI language. Currently applies to the Livestock module only (pilot).
            Industry terms like <em>Broiler</em>, <em>Layer</em>, <em>Vaccination</em>, <em>GRN</em> stay in English regardless of the choice.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {localeError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600">
              {localeError}
            </div>
          )}
          {localeSuccess && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-600">
              Language preference saved
            </div>
          )}

          <div className="flex items-end gap-3 flex-wrap">
            <div className="min-w-[220px]">
              <label htmlFor="locale" className="block text-sm font-medium mb-2">UI Language</label>
              <select
                id="locale"
                value={localeValue}
                onChange={(e) => { if (isLocale(e.target.value)) setLocaleValue(e.target.value as Locale); }}
                disabled={localeSaving}
                className="w-full rounded-lg border px-4 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {locales.map((l) => (
                  <option key={l} value={l}>{localeNames[l]}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleLocaleSave}
              disabled={localeSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {localeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Language
            </button>
          </div>
        </div>
      </div>

      {/* Digital Signature */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Pen className="h-4 w-4" /> Digital Signature
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your digital signature. This will be used on inspection reports, GRN documents, and approval stamps.
          </p>
        </div>

        <div className="p-6">
          {sigError && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600">
              {sigError}
            </div>
          )}
          {sigSuccess && (
            <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-600">
              Signature uploaded successfully
            </div>
          )}

          <div className="flex items-start gap-6">
            {/* Current signature preview */}
            <div className="flex-shrink-0">
              <div className="w-48 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30 overflow-hidden">
                {profile?.signaturePath ? (
                  <img
                    src={profile.signaturePath.startsWith('data:') ? profile.signaturePath : `/uploads/${profile.signaturePath}`}
                    alt="Your signature"
                    className="max-w-full max-h-full object-contain"
                    style={{ filter: 'contrast(1.3) brightness(0.95)' }}
                  />
                ) : (
                  <div className="text-center">
                    <Pen className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">No signature uploaded</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload controls */}
            <div className="flex-1 space-y-3">
              <input
                ref={sigInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    setSigError('File must be under 2MB');
                    return;
                  }
                  try {
                    setSigUploading(true);
                    setSigError(null);
                    setSigSuccess(false);
                    await settingsApi.uploadSignature(file);
                    queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
                    setSigSuccess(true);
                    setTimeout(() => setSigSuccess(false), 3000);
                  } catch (err: unknown) {
                    setSigError(extractErrorMessage(err, 'Failed to upload signature'));
                  } finally {
                    setSigUploading(false);
                    if (sigInputRef.current) sigInputRef.current.value = '';
                  }
                }}
              />

              <button
                type="button"
                onClick={() => sigInputRef.current?.click()}
                disabled={sigUploading}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                {sigUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {profile?.signaturePath ? 'Replace Signature' : 'Upload Signature'}
              </button>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Accepted formats: PNG, JPEG, SVG</p>
                <p>Maximum size: 2MB</p>
                <p>Recommended: Sign on white paper, scan or photograph, crop to signature only</p>
                <p>For best results, use a transparent PNG with dark ink</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
