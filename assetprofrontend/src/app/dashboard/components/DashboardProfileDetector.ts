import type { ModuleAccess } from '@/lib/api/core';

/**
 * Business profile determines which dashboard variant to render.
 * Detected from enabled modules — no hardcoded tenant slugs.
 */
export type DashboardProfile = 'fund-management' | 'fleet-management' | 'general';

/**
 * Determine the dashboard profile from the tenant's enabled modules.
 *
 * Priority order (first match wins):
 *   1. fund-management enabled → fund management dashboard
 *   2. fleet-management enabled (without fund-management) → fleet dashboard
 *   3. fallback → general ERP dashboard
 */
export function detectDashboardProfile(enabledModules: ModuleAccess[]): DashboardProfile {
  const enabled = new Set(
    enabledModules
      .filter((m) => m.isEnabled && m.status === 'enabled')
      .map((m) => m.slug),
  );

  if (enabled.has('fund-management')) return 'fund-management';
  if (enabled.has('fleet-management')) return 'fleet-management';

  return 'general';
}
