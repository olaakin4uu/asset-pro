'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmDialog } from 'primereact/confirmdialog';
import { extractErrorMessage } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings';

// ============================================================================
// TYPES
// ============================================================================

export interface UseSettingsPageConfig<T extends Record<string, unknown>> {
  /** Query key for caching */
  queryKey: string;
  /** Function to fetch settings */
  fetchFn: () => Promise<T>;
  /** Function to save settings */
  updateFn: (data: Partial<T>) => Promise<T>;
  /** Function to reset settings to defaults */
  resetFn?: () => Promise<T>;
  /** Keys to strip from the settings object before sending update (e.g., id, companyId, updatedAt) */
  excludeKeys?: (keyof T)[];
}

export interface UseSettingsPageReturn<T extends Record<string, unknown>> {
  /** The current settings object */
  settings: T | null;
  /** Whether settings are loading */
  loading: boolean;
  /** Whether settings are being saved */
  saving: boolean;
  /** Error message */
  error: string | null;
  /** Success message */
  success: string | null;
  /** Active tab */
  activeTab: string;
  /** Set the active tab */
  setActiveTab: (tab: string) => void;
  /** Update a single setting value */
  updateSetting: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Save all settings */
  handleSave: () => void;
  /** Reset settings to defaults (with confirmation) */
  handleReset: () => void;
  /** Clear error and success messages */
  clearMessages: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useSettingsPage<T extends Record<string, unknown>>(
  config: UseSettingsPageConfig<T>,
  defaultTab: string
): UseSettingsPageReturn<T> {
  const { queryKey, fetchFn, updateFn, resetFn, excludeKeys = [] } = config;
  const queryClient = useQueryClient();
  const settingsStore = useSettingsStore();

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [localSettings, setLocalSettings] = useState<T | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch settings (with Zustand cache as initialData)
  const moduleKey = queryKey as 'sales' | 'purchase' | 'inventory' | 'budget';
  const cachedData = settingsStore.getCached<T>(moduleKey);

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const result = await fetchFn();
      settingsStore.setSettings(moduleKey, result as Record<string, unknown>);
      return result;
    },
    initialData: cachedData ?? undefined,
  });

  // Use local state if user has made edits, otherwise use fetched data
  const settings = localSettings ?? data ?? null;

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (updateData: Partial<T>) => updateFn(updateData),
    onSuccess: (savedData) => {
      queryClient.setQueryData([queryKey], savedData);
      settingsStore.setSettings(moduleKey, savedData as Record<string, unknown>);
      setLocalSettings(null);
      setSuccess('Settings saved successfully');
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: () => {
      if (!resetFn) throw new Error('Reset not supported');
      return resetFn();
    },
    onSuccess: (resetData) => {
      queryClient.setQueryData([queryKey], resetData);
      settingsStore.setSettings(moduleKey, resetData as Record<string, unknown>);
      setLocalSettings(null);
      setSuccess('Settings reset to defaults');
    },
  });

  const updateSetting = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setLocalSettings((prev) => {
      const base = prev ?? data ?? ({} as T);
      return { ...base, [key]: value };
    });
    setSuccess(null);
  }, [data]);

  const handleSave = useCallback(() => {
    if (!settings) return;
    setSuccess(null);

    // Strip excluded keys
    const updateData = { ...settings };
    for (const key of excludeKeys) {
      delete updateData[key];
    }

    saveMutation.mutate(updateData as Partial<T>);
  }, [settings, excludeKeys, saveMutation]);

  const handleReset = useCallback(() => {
    if (!resetFn) return;

    confirmDialog({
      message: 'Reset all settings to defaults? This cannot be undone.',
      header: 'Reset Settings',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: () => {
        setSuccess(null);
        resetMutation.mutate();
      },
    });
  }, [resetFn, resetMutation]);

  const clearMessages = useCallback(() => {
    setSuccess(null);
    saveMutation.reset();
    resetMutation.reset();
  }, [saveMutation, resetMutation]);

  // Combine errors from fetch and mutations
  const error = fetchError
    ? extractErrorMessage(fetchError, 'Failed to load settings')
    : saveMutation.error
      ? extractErrorMessage(saveMutation.error, 'Failed to save settings')
      : resetMutation.error
        ? extractErrorMessage(resetMutation.error, 'Failed to reset settings')
        : null;

  return {
    settings,
    loading: isLoading,
    saving: saveMutation.isPending,
    error,
    success,
    activeTab,
    setActiveTab,
    updateSetting,
    handleSave,
    handleReset,
    clearMessages,
  };
}
