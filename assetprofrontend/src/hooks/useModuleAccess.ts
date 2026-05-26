'use client';

import { useCompanyContextStore } from '@/stores/company-context';

/**
 * Check if a module is enabled for the current tenant.
 * Returns true while modules are still loading to avoid flash of locked content.
 */
export function useModuleAccess(moduleSlug: string): boolean {
  const enabledModules = useCompanyContextStore((s) => s.enabledModules);
  if (!enabledModules.length) return true; // Allow while loading
  const mod = enabledModules.find((m) => m.slug === moduleSlug);
  return mod?.isEnabled ?? false;
}
