'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Puzzle,
  ChevronDown,
  ChevronRight,
  Shield,
  Lock,
  Check,
  Loader2,
  Bot,
  Users,
  FolderKanban,
  Truck,
  CreditCard,
  ShoppingCart,
  Package,
  Factory,
  BookOpen,
  PieChart,
  Building2,
  Wallet,
  Landmark,
  LayoutGrid,
  HelpCircle,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { useCompanyContext } from '@/stores/company-context';
import type { ModuleAccess, FeatureAccess } from '@/lib/api/core';
import { extractErrorMessage } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types/core';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration', href: '/core' },
  { title: 'Modules & Features' },
];

// ============================================================================
// MODULE ICON MAP
// ============================================================================

const moduleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'core': LayoutGrid,
  'ai': Bot,
  'hrpayroll': Users,
  'projectmanagement': FolderKanban,
  'fleet-management': Truck,
  'pos': CreditCard,
  'sales': ShoppingCart,
  'receivables': CreditCard,
  'purchase': Package,
  'payables': CreditCard,
  'inventory': Package,
  'manufacturing': Factory,
  'accounts': BookOpen,
  'budget': PieChart,
  'assets': Building2,
  'petty-cash': Wallet,
  'fund-management': Landmark,
  'help': HelpCircle,
};

// ============================================================================
// STATUS BADGE
// ============================================================================

function StatusBadge({ status, isCore }: { status: string; isCore: boolean }) {
  if (isCore) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <Shield className="h-3 w-3" />
        Core
      </span>
    );
  }

  const styles: Record<string, string> = {
    enabled: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    disabled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    trial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    read_only: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.disabled}`}>
      {status === 'enabled' ? 'Enabled' : status === 'trial' ? 'Trial' : status === 'read_only' ? 'Read Only' : 'Disabled'}
    </span>
  );
}

// ============================================================================
// FEATURE ROW
// ============================================================================

function FeatureRow({
  feature,
  moduleSlug,
  onToggle,
  toggling,
}: {
  feature: FeatureAccess;
  moduleSlug: string;
  onToggle: (moduleSlug: string, featureSlug: string, enabled: boolean) => void;
  toggling: string | null;
}) {
  const isToggling = toggling === `${moduleSlug}:${feature.code}`;

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b last:border-b-0 border-border/50">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          feature.isEnabled
            ? 'bg-green-100 dark:bg-green-900/30'
            : feature.includedInPlan
              ? 'bg-gray-100 dark:bg-gray-800'
              : 'bg-gray-50 dark:bg-gray-900'
        }`}>
          {feature.isCore ? (
            <Shield className="h-4 w-4 text-blue-500" />
          ) : feature.isEnabled ? (
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : !feature.includedInPlan ? (
            <Lock className="h-4 w-4 text-gray-400" />
          ) : (
            <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
          )}
        </div>
        <div>
          <p className={`text-sm font-medium ${!feature.includedInPlan ? 'text-muted-foreground' : ''}`}>
            {feature.name}
          </p>
          {feature.isCore && (
            <p className="text-xs text-muted-foreground">Always enabled</p>
          )}
          {!feature.includedInPlan && !feature.isCore && (
            <p className="text-xs text-muted-foreground">Upgrade plan to access</p>
          )}
        </div>
      </div>

      <div>
        {feature.isCore ? (
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Core</span>
        ) : !feature.canToggle ? (
          <span className="text-xs text-muted-foreground">
            {feature.includedInPlan ? 'Included' : 'Locked'}
          </span>
        ) : (
          <button
            onClick={() => onToggle(moduleSlug, feature.code, !feature.isEnabled)}
            disabled={isToggling}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              feature.isEnabled ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            {isToggling ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto text-white" />
            ) : (
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                  feature.isEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MODULE CARD
// ============================================================================

function ModuleCard({
  module,
  onToggle,
  toggling,
}: {
  module: ModuleAccess;
  onToggle: (moduleSlug: string, featureSlug: string, enabled: boolean) => void;
  toggling: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = moduleIcons[module.slug] || Puzzle;
  const enabledFeatureCount = module.features.filter((f) => f.isEnabled).length;
  const totalFeatureCount = module.features.length;

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      {/* Module Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            module.isEnabled
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{module.name}</h3>
              <StatusBadge status={module.status} isCore={module.isCore} />
            </div>
            {totalFeatureCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {enabledFeatureCount} of {totalFeatureCount} features enabled
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalFeatureCount > 0 && (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          )}
        </div>
      </button>

      {/* Feature List */}
      {expanded && totalFeatureCount > 0 && (
        <div className="border-t">
          {module.features.map((feature) => (
            <FeatureRow
              key={feature.code}
              feature={feature}
              moduleSlug={module.slug}
              onToggle={onToggle}
              toggling={toggling}
            />
          ))}
        </div>
      )}

      {expanded && totalFeatureCount === 0 && (
        <div className="border-t p-4 text-center text-sm text-muted-foreground">
          No configurable features for this module.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function ModulesPage() {
  const { enabledModules, fetchModules, toggleFeature } = useCompanyContext();
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchModules().finally(() => setLoading(false));
  }, [fetchModules]);

  const handleToggle = useCallback(
    async (moduleSlug: string, featureSlug: string, enabled: boolean) => {
      const key = `${moduleSlug}:${featureSlug}`;
      setToggling(key);
      setSuccessMessage(null);
      setErrorMessage(null);

      try {
        const success = await toggleFeature(moduleSlug, featureSlug, enabled);
        if (success) {
          const feature = enabledModules
            .find((m) => m.slug === moduleSlug)
            ?.features.find((f) => f.code === featureSlug);
          setSuccessMessage(
            `${feature?.name || featureSlug} ${enabled ? 'enabled' : 'disabled'} successfully`
          );
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      } catch (error: unknown) {
        setErrorMessage(extractErrorMessage(error, 'Failed to toggle feature'));
        setTimeout(() => setErrorMessage(null), 5000);
      } finally {
        setToggling(null);
      }
    },
    [toggleFeature, enabledModules]
  );

  // Separate modules by category
  const coreModules = enabledModules.filter((m) => m.isCore);
  const enabledMods = enabledModules.filter((m) => !m.isCore && m.isEnabled);
  const disabledMods = enabledModules.filter((m) => !m.isCore && !m.isEnabled);

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        {...PageHeaderPresets.core}
        icon={Puzzle}
        title="Modules & Features"
        description="View and manage enabled modules and features for your organization"
      />

      {/* Status Messages */}
      {successMessage && (
        <div className="mx-auto mb-4">
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            <Check className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="mx-auto mb-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {errorMessage}
          </div>
        </div>
      )}

      <div className="mx-auto space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : enabledModules.length === 0 ? (
          <div className="text-center py-20">
            <Puzzle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No modules found</h3>
            <p className="text-sm text-muted-foreground">
              Your organization does not have an active subscription.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-primary">{coreModules.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Core Modules</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{enabledMods.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Active Add-ons</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{disabledMods.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Available</p>
              </div>
            </div>

            {/* Core Modules */}
            {coreModules.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Core Modules
                </h2>
                <div className="space-y-3">
                  {coreModules.map((mod) => (
                    <ModuleCard
                      key={mod.slug}
                      module={mod}
                      onToggle={handleToggle}
                      toggling={toggling}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Enabled Modules */}
            {enabledMods.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Active Modules
                </h2>
                <div className="space-y-3">
                  {enabledMods.map((mod) => (
                    <ModuleCard
                      key={mod.slug}
                      module={mod}
                      onToggle={handleToggle}
                      toggling={toggling}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Disabled Modules */}
            {disabledMods.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Available Modules
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  These modules are available in your plan but not currently enabled. Contact your administrator to activate them.
                </p>
                <div className="space-y-3">
                  {disabledMods.map((mod) => (
                    <ModuleCard
                      key={mod.slug}
                      module={mod}
                      onToggle={handleToggle}
                      toggling={toggling}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </TenantLayout>
  );
}
