'use client';

import { useState } from 'react';
import { Check, Loader2, Sun, Moon, Monitor } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings';
import { extractErrorMessage } from '@/lib/utils';
import { useTheme, type ThemeColor, type ColorMode } from '@/providers/ThemeProvider';
import { cn } from '@/lib/utils';

// ============================================================================
// THEME OPTIONS
// ============================================================================

const themes: { id: ThemeColor; name: string; description: string; colors: { primary: string; secondary: string; accent: string } }[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean and modern blue theme',
    colors: { primary: '#3B82F6', secondary: '#6366F1', accent: '#8B5CF6' },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Subtle gray tones for a business feel',
    colors: { primary: '#475569', secondary: '#64748B', accent: '#94A3B8' },
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Bold and colorful for a lively workspace',
    colors: { primary: '#EC4899', secondary: '#F97316', accent: '#8B5CF6' },
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Fresh green highlights for a modern look',
    colors: { primary: '#10B981', secondary: '#059669', accent: '#34D399' },
  },
];

const colorModes: { id: ColorMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

// ============================================================================
// PAGE
// ============================================================================

export default function AppearanceSettingsPage() {
  const queryClient = useQueryClient();
  const { theme, colorMode, setTheme, setColorMode } = useTheme();

  const { data: profile, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => settingsApi.getProfile(),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync theme from server on profile load (one-time)
  const serverTheme = profile?.themePreference as ThemeColor | undefined;
  if (serverTheme && serverTheme !== theme && !saving) {
    setTheme(serverTheme);
  }

  const loadError = fetchError ? extractErrorMessage(fetchError, 'Failed to load preferences') : null;

  const handleThemeSelect = async (themeId: ThemeColor) => {
    // Apply immediately
    setTheme(themeId);

    // Save to server
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await settingsApi.updateAppearance(themeId);
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to update theme'));
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
      {(error || loadError) && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
          {error || loadError}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-400">
          Theme preference saved
        </div>
      )}

      {/* Color Mode */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold">Color Mode</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose between light and dark mode, or follow your system preference
          </p>
        </div>
        <div className="p-6">
          <div className="inline-flex rounded-lg border p-1 gap-1">
            {colorModes.map((mode) => {
              const Icon = mode.icon;
              const isActive = colorMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setColorMode(mode.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold">Theme Preference</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a color theme that suits your working style
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {themes.map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleThemeSelect(t.id)}
                  disabled={saving}
                  className={cn(
                    'relative flex flex-col rounded-xl border-2 p-4 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50',
                    'disabled:opacity-50'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}

                  {/* Color Preview */}
                  <div className="flex gap-2 mb-3">
                    <div className="h-8 w-8 rounded-full" style={{ backgroundColor: t.colors.primary }} />
                    <div className="h-8 w-8 rounded-full" style={{ backgroundColor: t.colors.secondary }} />
                    <div className="h-8 w-8 rounded-full" style={{ backgroundColor: t.colors.accent }} />
                  </div>

                  <h4 className="font-medium">{t.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
