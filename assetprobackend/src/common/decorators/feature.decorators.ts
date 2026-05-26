import { SetMetadata } from '@nestjs/common';

/**
 * Metadata keys for feature/module requirements
 */
export const REQUIRE_MODULE_KEY = 'require_module';
export const REQUIRE_FEATURE_KEY = 'require_feature';

/**
 * RequireModule decorator - Require one or more modules to be enabled
 *
 * @example
 * ```typescript
 * @RequireModule('inventory')
 * @Controller('inventory/items')
 * export class ItemsController {}
 *
 * @RequireModule('sales', 'inventory')
 * @Get('combined-report')
 * getCombinedReport() {}
 * ```
 */
export const RequireModule = (...modules: string[]) =>
  SetMetadata(REQUIRE_MODULE_KEY, modules);

/**
 * RequireFeature decorator - Require specific features to be enabled
 *
 * @example
 * ```typescript
 * @RequireFeature('inventory', 'batch-tracking')
 * @Post('batch')
 * createBatch() {}
 *
 * // Multiple features
 * @RequireFeature('sales', 'credit-notes')
 * @RequireFeature('accounts', 'multi-currency')
 * @Post('multi-currency-credit-note')
 * createMultiCurrencyCreditNote() {}
 * ```
 */
export const RequireFeature = (module: string, feature: string) =>
  SetMetadata(REQUIRE_FEATURE_KEY, [{ module, feature }]);

/**
 * RequireFeatures decorator - Require multiple features at once
 *
 * @example
 * ```typescript
 * @RequireFeatures([
 *   { module: 'inventory', feature: 'batch-tracking' },
 *   { module: 'inventory', feature: 'serial-numbers' },
 * ])
 * @Post('tracked-item')
 * createTrackedItem() {}
 * ```
 */
export const RequireFeatures = (
  features: Array<{ module: string; feature: string }>,
) => SetMetadata(REQUIRE_FEATURE_KEY, features);
