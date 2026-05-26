import { BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../services/tenant-prisma.service';

const logger = new Logger('StockValidation');

interface StockCheckItem {
  itemId: number;
  quantity: number;
  warehouseId?: number | null;
}

interface StockCheckResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate stock availability for one or more items using the INVENTORY settings
 * as the single source of truth for negative stock policy.
 *
 * Call this before any stock deduction (sales, POS, manufacturing, transfers).
 *
 * @returns StockCheckResult — if not valid, errors[] contains human-readable messages
 * @throws BadRequestException if policy is 'prevent' and stock is insufficient
 */
export async function validateStockAvailability(
  tenantPrisma: TenantPrismaService,
  companyId: number,
  items: StockCheckItem[],
): Promise<StockCheckResult> {
  if (items.length === 0) return { valid: true, errors: [] };

  // Read inventory settings (single source of truth)
  const settings = await tenantPrisma.queryOne<{
    allowNegativeStock: boolean;
    negativeStockPolicy: string;
  }>(
    `SELECT COALESCE("allowNegativeStock", false) AS "allowNegativeStock",
            COALESCE("negativeStockPolicy", 'prevent') AS "negativeStockPolicy"
     FROM inv_settings WHERE "companyId" = $1`,
    [companyId],
  );

  const allowNegative = settings?.allowNegativeStock ?? false;
  const policy = settings?.negativeStockPolicy ?? 'prevent';

  // allowNegativeStock=true is the master switch — skip all checks regardless of policy.
  // (policy alone also works: 'allow' skips, 'warn' lets through, 'prevent' blocks)
  if (allowNegative) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];

  for (const item of items) {
    // Service-type items have no physical stock — skip regardless of policy
    const itemMeta = await tenantPrisma.queryOne<{ inventoryType: string }>(
      `SELECT ic."inventoryType"
       FROM inv_items i
       JOIN inv_item_categories ic ON ic.id = i."categoryId"
       WHERE i.id = $1`,
      [item.itemId],
    );
    if (itemMeta?.inventoryType === 'Service') continue;

    // Get available stock across all warehouses or specific warehouse
    let available = 0;
    if (item.warehouseId) {
      const level = await tenantPrisma.queryOne<{ availableQuantity: string }>(
        `SELECT COALESCE("availableQuantity", 0) AS "availableQuantity"
         FROM inv_stock_levels
         WHERE "itemId" = $1 AND "warehouseId" = $2 AND "companyId" = $3`,
        [item.itemId, item.warehouseId, companyId],
      );
      available = Number(level?.availableQuantity ?? 0);
    } else {
      const level = await tenantPrisma.queryOne<{ availableQuantity: string }>(
        `SELECT COALESCE(SUM("availableQuantity"), 0) AS "availableQuantity"
         FROM inv_stock_levels
         WHERE "itemId" = $1 AND "companyId" = $2`,
        [item.itemId, companyId],
      );
      available = Number(level?.availableQuantity ?? 0);
    }

    if (available < item.quantity) {
      const itemInfo = await tenantPrisma.queryOne<{ name: string; code: string }>(
        `SELECT name, code FROM inv_items WHERE id = $1`,
        [item.itemId],
      );
      const name = itemInfo ? `${itemInfo.name} (${itemInfo.code})` : `Item #${item.itemId}`;
      const msg = `Insufficient stock for ${name}: available ${available.toLocaleString()}, required ${item.quantity.toLocaleString()}`;
      errors.push(msg);
    }
  }

  if (errors.length === 0) return { valid: true, errors: [] };

  if (policy === 'prevent') {
    throw new BadRequestException(
      `Stock validation failed: ${errors.join('; ')}. Negative stock is not allowed.`,
    );
  }

  if (policy === 'warn') {
    logger.warn(`Negative stock warning (companyId=${companyId}): ${errors.join('; ')}`);
    return { valid: true, errors }; // Allow but warn
  }

  // policy === 'allow' (already handled above, but just in case)
  return { valid: true, errors: [] };
}
