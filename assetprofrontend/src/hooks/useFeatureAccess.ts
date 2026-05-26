'use client';

import { useCompanyContextStore } from '@/stores/company-context';

/**
 * Check if a specific feature within a module is enabled for the current tenant.
 * Returns true while modules are still loading to avoid flash of locked content.
 */
export function useFeatureAccess(moduleSlug: string, featureSlug: string): boolean {
  const enabledModules = useCompanyContextStore((s) => s.enabledModules);
  if (!enabledModules.length) return true; // Allow while loading
  const mod = enabledModules.find((m) => m.slug === moduleSlug);
  if (!mod?.isEnabled) return false;
  const feat = mod.features.find((f) => f.code === featureSlug);
  return feat?.isEnabled ?? true; // Default allow if feature not in list
}
