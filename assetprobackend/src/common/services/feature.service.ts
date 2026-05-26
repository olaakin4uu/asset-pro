import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface FeatureStatus {
  code: string;
  name: string;
  module: string;
  isCore: boolean;
  includedInPlan: boolean;
  isEnabled: boolean;
  canToggle: boolean;
  limits?: Record<string, any>;
}

export interface ModuleStatus {
  slug: string;
  name: string;
  isCore: boolean;
  isEnabled: boolean;
  status: 'enabled' | 'disabled' | 'trial' | 'read_only';
  features: FeatureStatus[];
  limits?: Record<string, any>;
}

@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  // Cache for tenant features (keyed by tenantId)
  private featureCache = new Map<string, { data: ModuleStatus[]; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private prisma: PrismaService) {}

  /**
   * Check if a module is enabled for a tenant.
   *
   * Deny by default. A tenant must have an active subscription whose plan
   * includes the module (or the module must be flagged isCore in the
   * module table) to get true. Missing subscription data, missing module
   * definitions, or DB errors all deny — with a warn-level log so the
   * condition is visible in production.
   */
  async isModuleEnabled(tenantId: string, moduleSlug: string): Promise<boolean> {
    const modules = await this.getTenantModules(tenantId);

    if (modules.length === 0) {
      this.logger.warn(
        `Module access denied: tenant ${tenantId} has no subscription data (requested module="${moduleSlug}")`,
      );
      return false;
    }

    const module = modules.find(m => m.slug === moduleSlug);

    if (!module) {
      this.logger.warn(
        `Module access denied: tenant ${tenantId} has no entry for module="${moduleSlug}"`,
      );
      return false;
    }

    if (module.isCore) return true;

    return module.isEnabled && module.status === 'enabled';
  }

  /**
   * Check if a specific feature is enabled for a tenant.
   *
   * Deny by default. The module must be enabled (per isModuleEnabled
   * semantics) AND the feature must be either flagged isCore or present
   * in the tenant's enabled-features list for that module. A feature
   * that isn't seeded into plan_module_features for the tenant's plan
   * is treated as denied — log loudly so missing seed data is caught.
   */
  async isFeatureEnabled(
    tenantId: string,
    moduleSlug: string,
    featureSlug: string,
  ): Promise<boolean> {
    const modules = await this.getTenantModules(tenantId);

    if (modules.length === 0) {
      this.logger.warn(
        `Feature access denied: tenant ${tenantId} has no subscription data (requested feature="${moduleSlug}.${featureSlug}")`,
      );
      return false;
    }

    const module = modules.find(m => m.slug === moduleSlug);

    if (!module || !module.isEnabled) {
      this.logger.warn(
        `Feature access denied: tenant ${tenantId} has no enabled module="${moduleSlug}" (requested feature="${featureSlug}")`,
      );
      return false;
    }

    const feature = module.features.find(f => f.code === featureSlug);
    if (!feature) {
      this.logger.warn(
        `Feature access denied: tenant ${tenantId} — feature="${featureSlug}" not seeded under module="${moduleSlug}"`,
      );
      return false;
    }
    if (feature.isCore) return true;

    return feature.isEnabled;
  }

  /**
   * Get all modules and their status for a tenant
   */
  async getTenantModules(tenantId: string, forceRefresh = false): Promise<ModuleStatus[]> {
    // Check cache
    const cached = this.featureCache.get(tenantId);
    if (!forceRefresh && cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      // Get tenant with subscription
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          subscription: {
            include: {
              plan: {
                include: {
                  modules: {
                    include: {
                      module: {
                        include: {
                          featureDefinitions: true,
                        },
                      },
                      planModuleFeatures: {
                        include: {
                          feature: true,
                        },
                      },
                    },
                  },
                },
              },
              modules: true,
            },
          },
        },
      });

      if (!tenant || !tenant.subscription) {
        this.logger.warn(`Tenant ${tenantId} has no subscription`);
        return [];
      }

      const { subscription } = tenant;
      const planModules = subscription.plan.modules;
      const subscriptionModules = subscription.modules;

      // Get all modules from the system
      const allModules = await this.prisma.module.findMany({
        where: { isActive: true },
        include: { featureDefinitions: true },
        orderBy: { sortOrder: 'asc' },
      });

      const moduleStatuses: ModuleStatus[] = allModules.map(mod => {
        // Check if module is in the plan
        const planModule = planModules.find(pm => pm.moduleId === mod.id);
        const isIncludedInPlan = !!planModule?.isIncluded;
        const isAvailableAsAddon = !!planModule?.isAvailableAddon;

        // Check subscription module override
        const subModule = subscriptionModules.find(sm => sm.moduleId === mod.id);
        const isEnabledInSubscription = subModule ? subModule.status === 'enabled' : false;

        // Determine if module is enabled
        const isEnabled = mod.isCore || (isIncludedInPlan && (isEnabledInSubscription || !subModule));

        // Get module status
        let status: ModuleStatus['status'] = 'disabled';
        if (mod.isCore || isIncludedInPlan) {
          status = subModule?.status as ModuleStatus['status'] || 'enabled';
        }

        // Build feature list
        const tenantEnabledFeatures = subModule?.enabledFeatures ?? [];
        const hasTenantOverride = tenantEnabledFeatures.length > 0;

        const features: FeatureStatus[] = mod.featureDefinitions.map(feat => {
          const planModuleFeature = planModule?.planModuleFeatures?.find(
            pmf => pmf.featureId === feat.id,
          );

          // Determine if feature is enabled:
          // 1. Core features are always enabled
          // 2. If admin has set per-tenant enabledFeatures overrides, use that list
          // 3. Otherwise fall back to plan-level isEnabled
          const includedInPlan = !!planModuleFeature || feat.isCore;
          let isEnabled: boolean;
          if (feat.isCore) {
            isEnabled = true;
          } else if (hasTenantOverride && includedInPlan) {
            isEnabled = tenantEnabledFeatures.includes(feat.slug);
          } else {
            isEnabled = !!planModuleFeature?.isEnabled;
          }

          return {
            code: feat.slug,
            name: feat.name,
            module: mod.slug,
            isCore: feat.isCore,
            includedInPlan,
            isEnabled,
            canToggle: !feat.isCore && !!planModuleFeature,
            limits: planModuleFeature?.limits as Record<string, any> | undefined,
          };
        });

        return {
          slug: mod.slug,
          name: mod.name,
          isCore: mod.isCore,
          isEnabled,
          status,
          features,
          limits: subModule?.featureLimits as Record<string, any> | undefined,
        };
      });

      // Update cache
      this.featureCache.set(tenantId, {
        data: moduleStatuses,
        expiry: Date.now() + this.CACHE_TTL,
      });

      return moduleStatuses;
    } catch (error) {
      this.logger.error(`Error getting tenant modules: ${error.message}`);
      return [];
    }
  }

  /**
   * Get feature limits for a tenant's module
   */
  async getFeatureLimits(
    tenantId: string,
    moduleSlug: string,
    featureSlug?: string,
  ): Promise<Record<string, any> | null> {
    const modules = await this.getTenantModules(tenantId);
    const module = modules.find(m => m.slug === moduleSlug);

    if (!module) return null;

    if (featureSlug) {
      const feature = module.features.find(f => f.code === featureSlug);
      return feature?.limits || null;
    }

    return module.limits || null;
  }

  /**
   * Toggle a feature for a tenant (within plan limits)
   */
  async toggleTenantFeature(
    tenantId: string,
    moduleSlug: string,
    featureSlug: string,
    enabled: boolean,
  ): Promise<boolean> {
    try {
      // Get subscription
      const subscription = await this.prisma.subscription.findUnique({
        where: { tenantId },
        include: {
          modules: true,
          plan: {
            include: {
              modules: {
                include: {
                  module: true,
                  planModuleFeatures: {
                    include: { feature: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Find the module and feature
      const planModule = subscription.plan.modules.find(
        pm => pm.module.slug === moduleSlug,
      );

      if (!planModule || !planModule.isIncluded) {
        throw new Error('Module not included in plan');
      }

      const feature = await this.prisma.feature.findUnique({
        where: { slug: featureSlug },
      });

      if (!feature) {
        throw new Error('Feature not found');
      }

      if (feature.isCore) {
        throw new Error('Cannot toggle core features');
      }

      // Check if feature is in plan
      const planFeature = planModule.planModuleFeatures.find(
        pmf => pmf.feature.slug === featureSlug,
      );

      if (!planFeature) {
        throw new Error('Feature not available in your plan');
      }

      // Find or create subscription module
      let subModule = subscription.modules.find(
        sm => sm.moduleId === planModule.moduleId,
      );

      if (!subModule) {
        subModule = await this.prisma.subscriptionModule.create({
          data: {
            subscriptionId: subscription.id,
            moduleId: planModule.moduleId,
            status: 'enabled',
            isIncluded: true,
            enabledFeatures: [],
          },
        });
      }

      // Update enabled features
      let enabledFeatures = subModule.enabledFeatures || [];

      if (enabled && !enabledFeatures.includes(featureSlug)) {
        enabledFeatures.push(featureSlug);
      } else if (!enabled) {
        enabledFeatures = enabledFeatures.filter(f => f !== featureSlug);
      }

      await this.prisma.subscriptionModule.update({
        where: { id: subModule.id },
        data: { enabledFeatures },
      });

      // Clear cache
      this.featureCache.delete(tenantId);

      return true;
    } catch (error) {
      this.logger.error(`Error toggling feature: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear feature cache for a tenant
   */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      this.featureCache.delete(tenantId);
    } else {
      this.featureCache.clear();
    }
  }
}
