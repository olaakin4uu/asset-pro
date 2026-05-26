import { Logger } from '@nestjs/common';
import { TenantPrismaService } from '../services/tenant-prisma.service';

const logger = new Logger('BomCostSync');

/**
 * Sync BOM line costs when an item's cost fields change.
 * Updates all non-archived BOM lines referencing the item,
 * then recalculates affected BOM header totals.
 *
 * Call this after updating averageCost, standardCost, or lastPurchasePrice on an item.
 */
export async function syncBomCostsForItem(
  tenantPrisma: TenantPrismaService,
  companyId: number,
  itemId: number,
): Promise<number> {
  try {
    // Get current item costs
    const item = await tenantPrisma.queryOne<{
      standardCost: number;
      averageCost: number;
      lastPurchasePrice: number;
    }>(
      `SELECT COALESCE("standardCost", 0) AS "standardCost",
              COALESCE("averageCost", 0) AS "averageCost",
              COALESCE("lastPurchasePrice", 0) AS "lastPurchasePrice"
       FROM inv_items WHERE id = $1`,
      [itemId],
    );

    if (!item) return 0;

    const itemCost =
      Number(item.standardCost) ||
      Number(item.averageCost) ||
      Number(item.lastPurchasePrice) ||
      0;

    if (itemCost <= 0) return 0;

    // Update all BOM lines referencing this item
    const updatedLines = await tenantPrisma.query<{ id: number; bomId: number }>(
      `UPDATE mfg_bom_lines bl SET
         "unitCost" = $1,
         "extendedCost" = $1 * bl.quantity * (1 + COALESCE(bl."scrapPercent", 0) / 100),
         "updatedAt" = NOW()
       FROM mfg_boms bom
       WHERE bl."bomId" = bom.id AND bl."productId" = $2 AND bom."companyId" = $3
         AND bom.status != 'ARCHIVED' AND bom."deletedAt" IS NULL
       RETURNING bl.id, bl."bomId"`,
      [itemCost, itemId, companyId],
    );

    const lines = updatedLines as unknown as { id: number; bomId: number }[];
    if (lines.length === 0) return 0;

    // Update affected BOM header totals
    const affectedBomIds = [...new Set(lines.map((l) => l.bomId))];
    for (const bomId of affectedBomIds) {
      const totals = await tenantPrisma.queryOne<{ materialCost: string }>(
        `SELECT SUM("extendedCost") AS "materialCost"
         FROM mfg_bom_lines WHERE "bomId" = $1 AND "deletedAt" IS NULL`,
        [bomId],
      );
      const materialCost = Number(totals?.materialCost) || 0;
      await tenantPrisma.query(
        `UPDATE mfg_boms
         SET "standardMaterialCost" = $1, "costLastCalculatedAt" = NOW(), "updatedAt" = NOW()
         WHERE id = $2`,
        [materialCost, bomId],
      );
    }

    logger.log(
      `BOM cost sync: ${lines.length} lines updated across ${affectedBomIds.length} BOMs for item ${itemId} (cost: ${itemCost})`,
    );
    return lines.length;
  } catch (err: unknown) {
    logger.warn(
      `Failed to sync BOM costs for item ${itemId}: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
    return 0;
  }
}
