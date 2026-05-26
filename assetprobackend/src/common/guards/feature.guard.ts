import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureService } from '../services/feature.service';
import { REQUIRE_MODULE_KEY, REQUIRE_FEATURE_KEY } from '../decorators/feature.decorators';

/**
 * FeatureGuard - Checks if required modules/features are enabled for the tenant
 *
 * Use with @RequireModule('module-slug') or @RequireFeature('module-slug', 'feature-slug') decorators
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  private readonly logger = new Logger(FeatureGuard.name);

  constructor(
    private reflector: Reflector,
    private featureService: FeatureService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required modules from decorator
    const requiredModules = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Get required features from decorator
    const requiredFeatures = this.reflector.getAllAndOverride<Array<{ module: string; feature: string }>>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no requirements, allow access
    if (!requiredModules?.length && !requiredFeatures?.length) {
      return true;
    }

    // Get request and extract tenant info
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      this.logger.warn('No tenant ID found in request');
      throw new ForbiddenException('Tenant context required');
    }

    // Check required modules
    if (requiredModules?.length) {
      for (const moduleSlug of requiredModules) {
        const isEnabled = await this.featureService.isModuleEnabled(tenantId, moduleSlug);

        if (!isEnabled) {
          this.logger.warn(
            `Access denied: Module "${moduleSlug}" not enabled for tenant ${tenantId}`,
          );
          throw new ForbiddenException(
            `The "${moduleSlug}" module is not enabled for your organization. Please contact your administrator or upgrade your plan.`,
          );
        }
      }
    }

    // Check required features
    if (requiredFeatures?.length) {
      for (const { module, feature } of requiredFeatures) {
        const isEnabled = await this.featureService.isFeatureEnabled(
          tenantId,
          module,
          feature,
        );

        if (!isEnabled) {
          this.logger.warn(
            `Access denied: Feature "${feature}" in module "${module}" not enabled for tenant ${tenantId}`,
          );
          throw new ForbiddenException(
            `The "${feature}" feature is not enabled for your organization. Please contact your administrator or upgrade your plan.`,
          );
        }
      }
    }

    return true;
  }
}
