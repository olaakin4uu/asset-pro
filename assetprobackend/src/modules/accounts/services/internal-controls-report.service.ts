import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { toMoney, toQuantity } from '../../../common/utils/decimal';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SettingsRiskItem {
  name: string;
  label: string;
  value: unknown;
  riskLevel: 'high' | 'medium' | 'low';
  module: string;
  implication: string;
}

export interface NegativeStockItem {
  itemId: number;
  itemName: string;
  itemCode: string;
  warehouseName: string | null;
  quantity: number;
  avgCost: number;
  negativeValue: number;
}

export interface ZeroCostItem {
  id: number;
  name: string;
  code: string;
  avgCost: number;
  stdCost: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  quantity?: number;
  revenue?: number;
}

export interface BelowCostSaleItem {
  invoiceNumber: string;
  invoiceDate: string;
  description: string;
  unitPrice: number;
  cost: number;
  quantity: number;
  profitLoss: number;
}

export interface OverReceivedItem {
  grnNumber: string;
  orderNumber: string;
  itemId: number;
  itemName: string;
  ordered: number;
  received: number;
  overage: number;
}

export interface GLCategoryGap {
  id: number;
  name: string;
  type: string;
  missingMappings: string[];
  itemCount: number;
}

export interface CustomerWithoutAR {
  id: number;
  name: string;
  code: string;
  outstandingBalance: number;
}

export interface SupplierWithoutAP {
  id: number;
  name: string;
  code: string;
  outstandingBalance: number;
}

export interface BankWithoutGL {
  id: number;
  name: string;
  accountNumber: string;
  currencyCode: string;
}

export interface Recommendation {
  priority: 'critical' | 'advisory' | 'good';
  message: string;
  action: string;
}

export interface InternalControlsReport {
  generatedAt: string;
  dateRange: { startDate: string; endDate: string };
  settingsRisk: SettingsRiskItem[];
  negativeStock: {
    items: NegativeStockItem[];
    totalItems: number;
    totalNegativeValue: number;
  };
  zeroCostTransactions: {
    items: ZeroCostItem[];
    totalRevenue: number;
    count: number;
  };
  belowCostSales: {
    items: BelowCostSaleItem[];
    totalLoss: number;
    count: number;
  };
  unapprovedTransactions: {
    grns: { count: number; totalValue: number };
    orders: { count: number };
    invoices: { count: number };
  };
  overReceivedGoods: {
    items: OverReceivedItem[];
    count: number;
  };
  glConfigGaps: {
    categories: GLCategoryGap[];
    customersWithoutAR: CustomerWithoutAR[];
    suppliersWithoutAP: SupplierWithoutAP[];
    banksWithoutGL: BankWithoutGL[];
  };
  purchaseInspections: {
    totalInspections: number;
    passed: number;
    failed: number;
    partial: number;
    grnsWithoutInspection: number;
    grnsWithoutInspectionValue: number;
    itemsReceivedDespiteFail: Array<{ grnNumber: string; itemName: string; quantity: number; result: string }>;
    inspectionRequired: boolean;
  };
  salesInspections: {
    totalInspections: number;
    passed: number;
    failed: number;
    partial: number;
    deliveriesWithoutInspection: number;
    deliveriesWithoutInspectionValue: number;
    itemsDispatchedDespiteFail: Array<{ deliveryNumber: string; itemName: string; quantity: number; result: string }>;
    inspectionRequired: boolean;
  };
  creditRisk: {
    customersOverCreditLimit: Array<{ name: string; code: string; creditLimit: number; outstandingBalance: number; overAmount: number }>;
    overdueInvoicesCount: number;
    overdueInvoicesValue: number;
    averageDaysOverdue: number;
  };
  segregationOfDuties: {
    usersWhoCreateAndApprove: Array<{ userName: string; entityType: string; count: number }>;
  };
  inventoryHealth: {
    zeroCostItems: number;
    staleItems: number;
    costVarianceItems: number;
  };
  recommendations: Recommendation[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function num(v: unknown): number {
  return toMoney(v as string | number | null);
}

function qty(v: unknown): number {
  return toQuantity(v as string | number | null);
}

function str(v: unknown): string {
  return v != null ? String(v) : '';
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class InternalControlsReportService {
  private readonly logger = new Logger(InternalControlsReportService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async generateReport(
    companyId: number,
    query: { startDate?: string; endDate?: string },
  ): Promise<InternalControlsReport> {
    const now = new Date();
    const startDate =
      query.startDate ??
      new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = query.endDate ?? now.toISOString().split('T')[0];

    const [
      settingsRisk,
      negativeStock,
      zeroCostTransactions,
      belowCostSales,
      unapprovedTransactions,
      overReceivedGoods,
      glConfigGaps,
      purchaseInspections,
      salesInspections,
      creditRisk,
      segregationOfDuties,
      inventoryHealth,
    ] = await Promise.all([
      this.gatherSettingsRisk(companyId),
      this.gatherNegativeStock(companyId),
      this.gatherZeroCostTransactions(companyId, startDate, endDate),
      this.gatherBelowCostSales(companyId, startDate, endDate),
      this.gatherUnapprovedTransactions(companyId),
      this.gatherOverReceivedGoods(companyId),
      this.gatherGLConfigGaps(companyId),
      this.gatherPurchaseInspections(companyId, startDate, endDate),
      this.gatherSalesInspections(companyId, startDate, endDate),
      this.gatherCreditRisk(companyId),
      this.gatherSegregationOfDuties(companyId, startDate, endDate),
      this.gatherInventoryHealth(companyId),
    ]);

    const recommendations = this.buildRecommendations({
      settingsRisk,
      negativeStock,
      zeroCostTransactions,
      belowCostSales,
      unapprovedTransactions,
      overReceivedGoods,
      glConfigGaps,
      purchaseInspections,
      salesInspections,
      creditRisk,
      segregationOfDuties,
      inventoryHealth,
    });

    return {
      generatedAt: now.toISOString(),
      dateRange: { startDate, endDate },
      settingsRisk,
      negativeStock,
      zeroCostTransactions,
      belowCostSales,
      unapprovedTransactions,
      overReceivedGoods,
      glConfigGaps,
      purchaseInspections,
      salesInspections,
      creditRisk,
      segregationOfDuties,
      inventoryHealth,
      recommendations,
    };
  }

  // ─── Section 1: Settings Risk ─────────────────────────────────────────────

  private async gatherSettingsRisk(companyId: number): Promise<SettingsRiskItem[]> {
    const risks: SettingsRiskItem[] = [];

    // Inventory settings
    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT * FROM inv_settings WHERE "companyId" = $1 LIMIT 1`,
        [companyId],
      );
      if (rows.length > 0) {
        risks.push(...this.evaluateInvSettings(rows[0]));
      }
    } catch (err) {
      this.logger.warn(`inv_settings query failed: ${(err as Error).message}`);
    }

    // Sales settings
    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT * FROM sales_settings WHERE "companyId" = $1 LIMIT 1`,
        [companyId],
      );
      if (rows.length > 0) {
        risks.push(...this.evaluateSalesSettings(rows[0]));
      }
    } catch (err) {
      this.logger.warn(`sales_settings query failed: ${(err as Error).message}`);
    }

    // Purchase settings
    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT * FROM purchase_settings WHERE "companyId" = $1 LIMIT 1`,
        [companyId],
      );
      if (rows.length > 0) {
        risks.push(...this.evaluatePurchaseSettings(rows[0]));
      }
    } catch (err) {
      this.logger.warn(`purchase_settings query failed: ${(err as Error).message}`);
    }

    // Manufacturing settings
    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT * FROM mfg_settings WHERE "companyId" = $1 LIMIT 1`,
        [companyId],
      );
      if (rows.length > 0) {
        const allowZeroCostMaterials = rows[0]['allowZeroCostMaterials'];
        risks.push({
          name: 'allowZeroCostMaterials',
          label: 'Allow Zero Cost Materials (Manufacturing)',
          value: allowZeroCostMaterials ?? false,
          riskLevel: allowZeroCostMaterials === true ? 'high' : 'low',
          module: 'Manufacturing',
          implication: allowZeroCostMaterials === true
            ? 'Production orders and material issues are allowed with zero-cost materials. WIP and finished goods valuation will be inaccurate.'
            : 'Zero-cost materials are blocked in production — WIP and finished goods valuation is accurate.',
        });
      }
    } catch (err) {
      this.logger.warn(`mfg_settings query failed: ${(err as Error).message}`);
    }

    return risks;
  }

  private evaluateInvSettings(s: Row): SettingsRiskItem[] {
    const items: SettingsRiskItem[] = [];

    const allowNegativeStock = s['allowNegativeStock'] ?? s['allow_negative_stock'];
    const negativeStockPolicy = str(
      s['negativeStockPolicy'] ?? s['negative_stock_policy'] ?? 'prevent',
    );

    items.push({
      name: 'allowNegativeStock',
      label: 'Allow Negative Stock',
      value: allowNegativeStock ?? false,
      riskLevel: allowNegativeStock === true ? 'high' : 'low',
      module: 'Inventory',
      implication:
        allowNegativeStock === true
          ? 'Stock levels can go below zero, leading to phantom inventory, incorrect valuations, and potential audit failures.'
          : 'Negative stock is blocked — inventory integrity is protected.',
    });

    const policyRisk: 'high' | 'medium' | 'low' =
      negativeStockPolicy === 'allow' ? 'high' : negativeStockPolicy === 'warn' ? 'medium' : 'low';

    items.push({
      name: 'negativeStockPolicy',
      label: 'Negative Stock Policy',
      value: negativeStockPolicy,
      riskLevel: policyRisk,
      module: 'Inventory',
      implication:
        negativeStockPolicy === 'allow'
          ? 'System silently allows negative stock without any warning, creating phantom inventory records.'
          : negativeStockPolicy === 'warn'
            ? 'Users are warned about negative stock but can proceed, which may lead to inventory inaccuracies.'
            : 'Negative stock is prevented — strong inventory control.',
    });

    return items;
  }

  private evaluateSalesSettings(s: Row): SettingsRiskItem[] {
    const items: SettingsRiskItem[] = [];

    const boolVal = (key: string): boolean => {
      const v = s[key];
      return v === true || v === 'true' || v === 1;
    };

    const allowZeroCost = boolVal('allowZeroCost');
    const blockBelowCostSelling = boolVal('blockBelowCostSelling');
    const allowZeroPrice = boolVal('allowZeroPrice');
    const checkStockOnOrder = boolVal('checkStockOnOrder');
    const checkStockOnDelivery = boolVal('checkStockOnDelivery');
    const allowBackorders = boolVal('allowBackorders');
    const allowNegativeStock = boolVal('allowNegativeStock');

    items.push({
      name: 'sales.allowZeroCost',
      label: 'Allow Zero-Cost Sales',
      value: allowZeroCost,
      riskLevel: allowZeroCost ? 'high' : 'low',
      module: 'Sales',
      implication: allowZeroCost
        ? 'Items can be sold with zero cost recorded, distorting COGS and gross profit in financial statements.'
        : 'Zero-cost sales are blocked — COGS integrity is maintained.',
    });

    items.push({
      name: 'sales.blockBelowCostSelling',
      label: 'Block Below-Cost Selling',
      value: blockBelowCostSelling,
      riskLevel: blockBelowCostSelling ? 'low' : 'medium',
      module: 'Sales',
      implication: blockBelowCostSelling
        ? 'Below-cost sales are blocked — margin integrity is protected.'
        : 'Sales staff can sell items below cost without restriction, eroding gross margins.',
    });

    items.push({
      name: 'sales.allowZeroPrice',
      label: 'Allow Zero-Price Sales',
      value: allowZeroPrice,
      riskLevel: allowZeroPrice ? 'high' : 'low',
      module: 'Sales',
      implication: allowZeroPrice
        ? 'Items can be sold at zero price, creating revenue leakage and potential for fraud.'
        : 'Zero-price sales are blocked — revenue integrity is protected.',
    });

    items.push({
      name: 'sales.checkStockOnOrder',
      label: 'Check Stock on Order',
      value: checkStockOnOrder,
      riskLevel: checkStockOnOrder ? 'low' : 'medium',
      module: 'Sales',
      implication: checkStockOnOrder
        ? 'Stock availability is verified when placing orders — prevents over-selling.'
        : 'No stock check on orders — risk of over-committing unavailable stock.',
    });

    items.push({
      name: 'sales.checkStockOnDelivery',
      label: 'Check Stock on Delivery',
      value: checkStockOnDelivery,
      riskLevel: checkStockOnDelivery ? 'low' : 'medium',
      module: 'Sales',
      implication: checkStockOnDelivery
        ? 'Stock is verified at delivery time — prevents dispatching untracked goods.'
        : 'No stock check on delivery — goods may be dispatched without inventory deduction.',
    });

    items.push({
      name: 'sales.allowBackorders',
      label: 'Allow Backorders',
      value: allowBackorders,
      riskLevel: allowBackorders ? 'medium' : 'low',
      module: 'Sales',
      implication: allowBackorders
        ? 'Backorders permitted — monitor closely to prevent unfulfilled obligations from accumulating.'
        : 'Backorders are not allowed — all orders must be fulfilled from available stock.',
    });

    if (allowNegativeStock) {
      items.push({
        name: 'sales.allowNegativeStock',
        label: 'Allow Negative Stock (Sales)',
        value: true,
        riskLevel: 'high',
        module: 'Sales',
        implication:
          'Sales module also allows negative stock, compounding inventory integrity risk.',
      });
    }

    return items;
  }

  private evaluatePurchaseSettings(s: Row): SettingsRiskItem[] {
    const items: SettingsRiskItem[] = [];

    const boolVal = (key: string): boolean => {
      const v = s[key];
      return v === true || v === 'true' || v === 1;
    };

    const requireInspection = boolVal('requireInspection');
    const requireGrnApproval = boolVal('requireGrnApproval');
    const allowOverReceipt = boolVal('allowOverReceipt');
    const overReceiptTolerance = num(s['overReceiptTolerance']);
    const allowPartialReceiving = boolVal('allowPartialReceiving');
    const allowPartialDelivery = boolVal('allowPartialDelivery');

    items.push({
      name: 'purchase.requireInspection',
      label: 'Require Goods Inspection',
      value: requireInspection,
      riskLevel: requireInspection ? 'low' : 'medium',
      module: 'Purchase',
      implication: requireInspection
        ? 'All received goods go through inspection — quality control is enforced.'
        : 'Goods are received without mandatory inspection — quality issues may go undetected.',
    });

    items.push({
      name: 'purchase.requireGrnApproval',
      label: 'Require GRN Approval',
      value: requireGrnApproval,
      riskLevel: requireGrnApproval ? 'low' : 'medium',
      module: 'Purchase',
      implication: requireGrnApproval
        ? 'GRNs require approval before processing — prevents unauthorised goods receipt.'
        : 'GRNs can be finalised without approval — risk of fraudulent or erroneous receipts.',
    });

    items.push({
      name: 'purchase.allowOverReceipt',
      label: 'Allow Over-Receipt',
      value: allowOverReceipt,
      riskLevel: allowOverReceipt ? 'medium' : 'low',
      module: 'Purchase',
      implication: allowOverReceipt
        ? `Over-receipts are permitted (tolerance: ${overReceiptTolerance}%) — monitor for quantity discrepancies.`
        : 'Receiving more than ordered is blocked — purchase order integrity is maintained.',
    });

    items.push({
      name: 'purchase.allowPartialReceiving',
      label: 'Allow Partial Receiving',
      value: allowPartialReceiving,
      riskLevel: 'low',
      module: 'Purchase',
      implication: allowPartialReceiving
        ? 'Partial receipts are allowed — ensure open PO lines are tracked and closed properly.'
        : 'All goods must be received in full — simpler tracking but less flexible.',
    });

    items.push({
      name: 'purchase.allowPartialDelivery',
      label: 'Allow Partial Delivery',
      value: allowPartialDelivery,
      riskLevel: 'low',
      module: 'Purchase',
      implication: allowPartialDelivery
        ? 'Partial deliveries are allowed — ensure remaining quantities are tracked.'
        : 'All deliveries must be completed in full.',
    });

    return items;
  }

  // ─── Section 2: Negative Stock ────────────────────────────────────────────

  private async gatherNegativeStock(
    companyId: number,
  ): Promise<InternalControlsReport['negativeStock']> {
    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT sl.id, sl.quantity,
                COALESCE(sl."avgCost", sl."averageCost", 0) as "avgCost",
                i.id as "itemId", i.name as "itemName", i.code as "itemCode",
                w.name as "warehouseName"
         FROM inv_stock_levels sl
         JOIN inv_items i ON i.id = sl."itemId"
         LEFT JOIN inv_warehouses w ON w.id = sl."warehouseId"
         WHERE sl."companyId" = $1 AND sl.quantity < 0`,
        [companyId],
      );

      const items: NegativeStockItem[] = rows.map((r) => {
        const quantity = qty(r['quantity']);
        const avgCost = num(r['avgCost']);
        const negativeValue = toMoney(quantity * avgCost);
        return {
          itemId: Number(r['itemId']),
          itemName: str(r['itemName']),
          itemCode: str(r['itemCode']),
          warehouseName: r['warehouseName'] != null ? str(r['warehouseName']) : null,
          quantity,
          avgCost,
          negativeValue,
        };
      });

      const totalNegativeValue = toMoney(
        items.reduce((sum, i) => sum + Math.abs(i.negativeValue), 0),
      );

      return { items, totalItems: items.length, totalNegativeValue };
    } catch (err) {
      this.logger.warn(`negativeStock query failed: ${(err as Error).message}`);
      return { items: [], totalItems: 0, totalNegativeValue: 0 };
    }
  }

  // ─── Section 3: Zero-Cost Transactions ───────────────────────────────────

  private async gatherZeroCostTransactions(
    companyId: number,
    startDate: string,
    endDate: string,
  ): Promise<InternalControlsReport['zeroCostTransactions']> {
    try {
      const zeroCostRows = await this.tenantPrisma.query<Row>(
        `SELECT i.id, i.name, i.code,
                COALESCE(i."averageCost", 0) as "avgCost",
                COALESCE(i."standardCost", 0) as "stdCost",
                COALESCE(i."lastPurchasePrice", 0) as "lastPurchasePrice"
         FROM inv_items i
         WHERE i."companyId" = $1
           AND i."isActive" = true
           AND i."deletedAt" IS NULL
           AND COALESCE(i."averageCost", 0) = 0
           AND COALESCE(i."standardCost", 0) = 0
           AND COALESCE(i."lastPurchasePrice", 0) = 0`,
        [companyId],
      );

      if (zeroCostRows.length === 0) {
        return { items: [], totalRevenue: 0, count: 0 };
      }

      const itemIds = zeroCostRows.map((r) => Number(r['id']));

      // Only return items that were actually sold in the period with zero cost
      const soldItems = await this.tenantPrisma.query<Row>(
        `SELECT i.id, i.name, i.code,
                COUNT(sil.id) as "salesCount",
                COALESCE(SUM(sil.quantity), 0) as "totalQty",
                COALESCE(SUM(sil.quantity * sil."unitPrice"), 0) as revenue,
                si."invoiceNumber", si."invoiceDate"
         FROM inv_items i
         JOIN sales_invoice_lines sil ON sil."itemId" = i.id
         JOIN sales_invoices si ON si.id = sil."salesInvoiceId"
         WHERE i.id = ANY($4::int[])
           AND si."companyId" = $1
           AND si.status NOT IN ('draft', 'cancelled', 'voided')
           AND si."invoiceDate" BETWEEN $2 AND $3
         GROUP BY i.id, i.name, i.code, si."invoiceNumber", si."invoiceDate"
         ORDER BY si."invoiceDate" DESC`,
        [companyId, startDate, endDate, itemIds],
      );

      const totalRevenue = soldItems.reduce((s, r) => s + num(r['revenue']), 0);
      const salesCount = soldItems.length;

      const items: ZeroCostItem[] = soldItems.map((r) => ({
        id: Number(r['id']),
        name: str(r['name']),
        code: str(r['code']),
        avgCost: 0,
        stdCost: 0,
        invoiceNumber: str(r['invoiceNumber']),
        invoiceDate: str(r['invoiceDate']),
        quantity: num(r['totalQty']),
        revenue: num(r['revenue']),
      }));

      return { items, totalRevenue, count: salesCount };
    } catch (err) {
      this.logger.warn(`zeroCostTransactions query failed: ${(err as Error).message}`);
      return { items: [], totalRevenue: 0, count: 0 };
    }
  }

  // ─── Section 4: Below-Cost Sales ─────────────────────────────────────────

  private async gatherBelowCostSales(
    companyId: number,
    startDate: string,
    endDate: string,
  ): Promise<InternalControlsReport['belowCostSales']> {
    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT si."invoiceNumber", si."invoiceDate",
                sil.description, sil."unitPrice", sil.quantity,
                COALESCE(i."averageCost", i."standardCost", 0) as cost,
                (sil."unitPrice" - COALESCE(i."averageCost", i."standardCost", 0))
                  * sil.quantity as "profitLoss"
         FROM sales_invoice_lines sil
         JOIN sales_invoices si ON si.id = sil."salesInvoiceId"
         JOIN inv_items i ON i.id = sil."itemId"
         WHERE si."companyId" = $1
           AND si.status NOT IN ('draft', 'cancelled', 'voided')
           AND si."invoiceDate" BETWEEN $2 AND $3
           AND sil."unitPrice" < COALESCE(i."averageCost", i."standardCost", 0)
           AND COALESCE(i."averageCost", i."standardCost", 0) > 0
         ORDER BY "profitLoss" ASC`,
        [companyId, startDate, endDate],
      );

      const items: BelowCostSaleItem[] = rows.map((r) => ({
        invoiceNumber: str(r['invoiceNumber']),
        invoiceDate: str(r['invoiceDate']),
        description: str(r['description']),
        unitPrice: num(r['unitPrice']),
        cost: num(r['cost']),
        quantity: qty(r['quantity']),
        profitLoss: num(r['profitLoss']),
      }));

      const totalLoss = toMoney(
        items.reduce((sum, i) => sum + Math.abs(Math.min(i.profitLoss, 0)), 0),
      );

      return { items, totalLoss, count: items.length };
    } catch (err) {
      this.logger.warn(`belowCostSales query failed: ${(err as Error).message}`);
      return { items: [], totalLoss: 0, count: 0 };
    }
  }

  // ─── Section 5: Unapproved Transactions ──────────────────────────────────

  private async gatherUnapprovedTransactions(
    companyId: number,
  ): Promise<InternalControlsReport['unapprovedTransactions']> {
    let grnCount = 0;
    let grnTotal = 0;
    let orderCount = 0;
    let invoiceCount = 0;

    // Check for transactions without approval — considers both approvedBy column AND
    // configurable approval flow (process_approval_statuses)
    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT COUNT(*) as count, COALESCE(SUM(g."totalAmount"), 0) as total
         FROM goods_received_notes g
         WHERE g."companyId" = $1
           AND g.status = 'received'
           AND g."approvedBy" IS NULL
           AND g."deletedAt" IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM process_approval_statuses pas
             WHERE pas."approvableType" IN ('goods_received_notes', 'grn')
               AND pas."approvableId" = g.id AND pas.status = 'APPROVED'
           )`,
        [companyId],
      );
      if (rows.length > 0) {
        grnCount = Number(rows[0]['count'] ?? 0);
        grnTotal = num(rows[0]['total']);
      }
    } catch (err) {
      this.logger.warn(`unapprovedGRNs query failed: ${(err as Error).message}`);
    }

    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT COUNT(*) as count
         FROM sales_orders so
         WHERE so."companyId" = $1
           AND so.status NOT IN ('draft', 'cancelled')
           AND so."approvedBy" IS NULL
           AND so."deletedAt" IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM process_approval_statuses pas
             WHERE pas."approvableType" = 'sales_orders'
               AND pas."approvableId" = so.id AND pas.status = 'APPROVED'
           )`,
        [companyId],
      );
      if (rows.length > 0) {
        orderCount = Number(rows[0]['count'] ?? 0);
      }
    } catch (err) {
      this.logger.warn(`unapprovedOrders query failed: ${(err as Error).message}`);
    }

    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT COUNT(*) as count
         FROM sales_invoices si
         WHERE si."companyId" = $1
           AND si.status NOT IN ('draft', 'cancelled', 'voided')
           AND si."approvedBy" IS NULL
           AND si."deletedAt" IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM process_approval_statuses pas
             WHERE pas."approvableType" = 'sales_invoices'
               AND pas."approvableId" = si.id AND pas.status = 'APPROVED'
           )`,
        [companyId],
      );
      if (rows.length > 0) {
        invoiceCount = Number(rows[0]['count'] ?? 0);
      }
    } catch (err) {
      this.logger.warn(`unapprovedInvoices query failed: ${(err as Error).message}`);
    }

    return {
      grns: { count: grnCount, totalValue: grnTotal },
      orders: { count: orderCount },
      invoices: { count: invoiceCount },
    };
  }

  // ─── Section 6: Over-Received Goods ──────────────────────────────────────

  private async gatherOverReceivedGoods(
    companyId: number,
  ): Promise<InternalControlsReport['overReceivedGoods']> {
    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT g."grnNumber", po."orderNumber",
                gl."itemId", i.name as "itemName",
                pol.quantity as ordered,
                gl."quantityReceived" as received
         FROM grn_lines gl
         JOIN goods_received_notes g ON g.id = gl."goodsReceivedNoteId"
         JOIN purchase_orders po ON po.id = g."purchaseOrderId"
         JOIN purchase_order_lines pol
           ON pol."purchaseOrderId" = po.id AND pol."itemId" = gl."itemId"
         JOIN inv_items i ON i.id = gl."itemId"
         WHERE g."companyId" = $1
           AND g."deletedAt" IS NULL
           AND gl."quantityReceived" > pol.quantity
         ORDER BY g."grnNumber"`,
        [companyId],
      );

      const items: OverReceivedItem[] = rows.map((r) => {
        const ordered = qty(r['ordered']);
        const received = qty(r['received']);
        return {
          grnNumber: str(r['grnNumber']),
          orderNumber: str(r['orderNumber']),
          itemId: Number(r['itemId']),
          itemName: str(r['itemName']),
          ordered,
          received,
          overage: toQuantity(received - ordered),
        };
      });

      return { items, count: items.length };
    } catch (err) {
      this.logger.warn(`overReceivedGoods query failed: ${(err as Error).message}`);
      return { items: [], count: 0 };
    }
  }

  // ─── Section 7: GL Configuration Gaps ────────────────────────────────────

  private async gatherGLConfigGaps(
    companyId: number,
  ): Promise<InternalControlsReport['glConfigGaps']> {
    const [categories, customersWithoutAR, suppliersWithoutAP, banksWithoutGL] =
      await Promise.all([
        this.gatherCategoryGaps(companyId),
        this.gatherCustomersWithoutAR(companyId),
        this.gatherSuppliersWithoutAP(companyId),
        this.gatherBanksWithoutGL(companyId),
      ]);

    return { categories, customersWithoutAR, suppliersWithoutAP, banksWithoutGL };
  }

  private async gatherCategoryGaps(companyId: number): Promise<GLCategoryGap[]> {
    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT c.id, c."categoryName", c."inventoryType", c."glAccountMappings",
                (SELECT COUNT(*) FROM inv_items i
                 WHERE i."categoryId" = c.id AND i."deletedAt" IS NULL) as "itemCount"
         FROM inv_item_categories c
         WHERE c."companyId" = $1
           AND c."deletedAt" IS NULL
           AND c."isActive" = true
         ORDER BY c."categoryName"`,
        [companyId],
      );

      const requiredMappings = [
        'inventory_gl_account_id',
        'cogs_gl_account_id',
        'revenue_gl_account_id',
        'grn_clearing_gl_account_id',
      ];

      const gaps: GLCategoryGap[] = [];
      for (const r of rows) {
        let mappings: Record<string, unknown> = {};
        try {
          const raw = r['glAccountMappings'];
          if (typeof raw === 'string') {
            mappings = JSON.parse(raw) as Record<string, unknown>;
          } else if (raw != null && typeof raw === 'object') {
            mappings = raw as Record<string, unknown>;
          }
        } catch {
          // parse failure → all mappings missing
        }

        const missingMappings = requiredMappings.filter(
          (key) => !mappings[key] || mappings[key] === null,
        );

        if (missingMappings.length > 0) {
          gaps.push({
            id: Number(r['id']),
            name: str(r['categoryName']),
            type: str(r['inventoryType']),
            missingMappings,
            itemCount: Number(r['itemCount'] ?? 0),
          });
        }
      }

      return gaps;
    } catch (err) {
      this.logger.warn(`categoryGaps query failed: ${(err as Error).message}`);
      return [];
    }
  }

  private async gatherCustomersWithoutAR(_companyId: number): Promise<CustomerWithoutAR[]> {
    // AssetPro has no customers table — return empty array
    return [];
  }

  private async gatherSuppliersWithoutAP(_companyId: number): Promise<SupplierWithoutAP[]> {
    // AssetPro has no suppliers table — return empty array
    return [];
  }

  private async gatherBanksWithoutGL(companyId: number): Promise<BankWithoutGL[]> {
    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT b.id, b.name, b."accountNumber", b."currencyCode"
         FROM banks b
         WHERE b."companyId" = $1
           AND b."glAccountId" IS NULL
           AND b."isActive" = true
           AND b."deletedAt" IS NULL
         ORDER BY b.name`,
        [companyId],
      );

      return rows.map((r) => ({
        id: Number(r['id']),
        name: str(r['name']),
        accountNumber: str(r['accountNumber']),
        currencyCode: str(r['currencyCode']),
      }));
    } catch (err) {
      this.logger.warn(`banksWithoutGL query failed: ${(err as Error).message}`);
      return [];
    }
  }

  // ─── Section 8: Inventory Health ─────────────────────────────────────────

  private async gatherInventoryHealth(
    companyId: number,
  ): Promise<InternalControlsReport['inventoryHealth']> {
    let zeroCostItems = 0;
    let staleItems = 0;
    let costVarianceItems = 0;

    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT COUNT(*) as count FROM inv_items
         WHERE "companyId" = $1
           AND "isActive" = true
           AND "deletedAt" IS NULL
           AND COALESCE("averageCost", 0) = 0
           AND COALESCE("standardCost", 0) = 0`,
        [companyId],
      );
      zeroCostItems = Number(rows[0]?.['count'] ?? 0);
    } catch (err) {
      this.logger.warn(`zeroCostItems health query failed: ${(err as Error).message}`);
    }

    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT COUNT(*) as count
         FROM inv_stock_levels sl
         JOIN inv_items i ON i.id = sl."itemId"
         WHERE i."companyId" = $1
           AND sl.quantity > 0
           AND (sl."lastMovementDate" IS NULL
             OR sl."lastMovementDate" < NOW() - INTERVAL '90 days')`,
        [companyId],
      );
      staleItems = Number(rows[0]?.['count'] ?? 0);
    } catch (err) {
      this.logger.warn(`staleItems health query failed: ${(err as Error).message}`);
    }

    try {
      const rows = await this.tenantPrisma.query<Row>(
        `SELECT COUNT(*) as count FROM inv_items
         WHERE "companyId" = $1
           AND "isActive" = true
           AND "deletedAt" IS NULL
           AND "averageCost" > 0
           AND "standardCost" > 0
           AND ABS("averageCost" - "standardCost") / "standardCost" > 0.2`,
        [companyId],
      );
      costVarianceItems = Number(rows[0]?.['count'] ?? 0);
    } catch (err) {
      this.logger.warn(`costVarianceItems health query failed: ${(err as Error).message}`);
    }

    return { zeroCostItems, staleItems, costVarianceItems };
  }

  // ─── Section: Purchase Inspections ─────────────────────────────────────────

  private async gatherPurchaseInspections(
    companyId: number, startDate: string, endDate: string,
  ): Promise<InternalControlsReport['purchaseInspections']> {
    const result: InternalControlsReport['purchaseInspections'] = {
      totalInspections: 0, passed: 0, failed: 0, partial: 0,
      grnsWithoutInspection: 0, grnsWithoutInspectionValue: 0,
      itemsReceivedDespiteFail: [], inspectionRequired: false,
    };
    try {
      // Check if inspection is required
      const settings = await this.tenantPrisma.queryOne<Row>(
        `SELECT "requireInspection" FROM purchase_settings WHERE "companyId" = $1 LIMIT 1`, [companyId]);
      result.inspectionRequired = !!(settings?.['requireInspection']);

      // Inspection pass/fail/partial rates
      const rates = await this.tenantPrisma.query<Row>(
        `SELECT "overallResult", COUNT(*)::int as count FROM purchase_inspections
         WHERE "companyId" = $1 AND "inspectionDate" BETWEEN $2 AND $3 AND "deletedAt" IS NULL
         GROUP BY "overallResult"`, [companyId, startDate, endDate]);
      for (const r of rates) {
        const res = str(r['overallResult']).toLowerCase();
        const cnt = Number(r['count'] ?? 0);
        result.totalInspections += cnt;
        if (res === 'passed') result.passed = cnt;
        else if (res === 'failed') result.failed = cnt;
        else if (res === 'partial') result.partial = cnt;
      }

      // GRNs received without inspection (when inspection is required)
      if (result.inspectionRequired) {
        const noInsp = await this.tenantPrisma.queryOne<Row>(
          `SELECT COUNT(*)::int as count, COALESCE(SUM("totalAmount"), 0) as total
           FROM goods_received_notes g
           WHERE g."companyId" = $1 AND g."receivedDate" BETWEEN $2 AND $3 AND g."deletedAt" IS NULL
             AND g.status IN ('received', 'approved', 'complete')
             AND g."purchaseInspectionId" IS NULL
             AND NOT EXISTS (SELECT 1 FROM purchase_inspections pi WHERE pi."purchaseOrderId" = g."purchaseOrderId" AND pi."deletedAt" IS NULL)
             AND NOT EXISTS (SELECT 1 FROM purchase_inspections pi WHERE pi."importOrderId" = g."importOrderId" AND pi."deletedAt" IS NULL AND g."importOrderId" IS NOT NULL)`,
          [companyId, startDate, endDate]);
        result.grnsWithoutInspection = Number(noInsp?.['count'] ?? 0);
        result.grnsWithoutInspectionValue = num(noInsp?.['total']);
      }

      // Items received despite failed inspection
      const failedItems = await this.tenantPrisma.query<Row>(
        `SELECT g."grnNumber", i.name as "itemName", gl."quantityReceived" as quantity, pi."overallResult" as result
         FROM goods_received_notes g
         JOIN grn_lines gl ON gl."goodsReceivedNoteId" = g.id
         JOIN inv_items i ON i.id = gl."itemId"
         JOIN purchase_inspections pi ON (pi."purchaseOrderId" = g."purchaseOrderId" OR pi.id = g."purchaseInspectionId")
         WHERE g."companyId" = $1 AND g."receivedDate" BETWEEN $2 AND $3 AND g."deletedAt" IS NULL
           AND g.status IN ('received', 'approved', 'complete')
           AND pi."overallResult" = 'failed' AND pi."deletedAt" IS NULL`,
        [companyId, startDate, endDate]);
      result.itemsReceivedDespiteFail = failedItems.map(r => ({
        grnNumber: str(r['grnNumber']), itemName: str(r['itemName']),
        quantity: qty(r['quantity']), result: str(r['result']),
      }));
    } catch (err) {
      this.logger.warn(`purchaseInspections query failed: ${(err as Error).message}`);
    }
    return result;
  }

  // ─── Section: Sales Inspections ───────────────────────────────────────────

  private async gatherSalesInspections(
    companyId: number, startDate: string, endDate: string,
  ): Promise<InternalControlsReport['salesInspections']> {
    const result: InternalControlsReport['salesInspections'] = {
      totalInspections: 0, passed: 0, failed: 0, partial: 0,
      deliveriesWithoutInspection: 0, deliveriesWithoutInspectionValue: 0,
      itemsDispatchedDespiteFail: [], inspectionRequired: false,
    };
    try {
      // Check if loading inspection is required
      const settings = await this.tenantPrisma.queryOne<Row>(
        `SELECT "requireLoadingOrder", "requireInspectionBeforeDispatch" FROM sales_settings WHERE "companyId" = $1 LIMIT 1`, [companyId]);
      result.inspectionRequired = !!(settings?.['requireInspectionBeforeDispatch']);

      // Loading inspection pass/fail rates
      const rates = await this.tenantPrisma.query<Row>(
        `SELECT "overallResult", COUNT(*)::int as count FROM loading_inspections
         WHERE "companyId" = $1 AND "inspectionDate" BETWEEN $2 AND $3 AND "deletedAt" IS NULL
         GROUP BY "overallResult"`, [companyId, startDate, endDate]);
      for (const r of rates) {
        const res = str(r['overallResult']).toLowerCase();
        const cnt = Number(r['count'] ?? 0);
        result.totalInspections += cnt;
        if (res === 'passed') result.passed = cnt;
        else if (res === 'failed') result.failed = cnt;
        else if (res === 'partial') result.partial = cnt;
      }

      // Deliveries without inspection (when required)
      if (result.inspectionRequired) {
        const noInsp = await this.tenantPrisma.queryOne<Row>(
          `SELECT COUNT(*)::int as count, COALESCE(SUM(sd."totalAmount"), 0) as total
           FROM sales_deliveries sd
           WHERE sd."companyId" = $1 AND sd."deliveryDate" BETWEEN $2 AND $3 AND sd."deletedAt" IS NULL
             AND sd.status IN ('confirmed', 'dispatched', 'delivered')
             AND NOT EXISTS (SELECT 1 FROM loading_inspections li WHERE li."loadingOrderId" = sd."loadingOrderId" AND li."deletedAt" IS NULL)`,
          [companyId, startDate, endDate]);
        result.deliveriesWithoutInspection = Number(noInsp?.['count'] ?? 0);
        result.deliveriesWithoutInspectionValue = num(noInsp?.['total']);
      }

      // Items dispatched despite failed inspection
      const failedItems = await this.tenantPrisma.query<Row>(
        `SELECT sd."deliveryNumber", i.name as "itemName", sdl.quantity, li."overallResult" as result
         FROM sales_deliveries sd
         JOIN sales_delivery_lines sdl ON sdl."salesDeliveryId" = sd.id
         JOIN inv_items i ON i.id = sdl."itemId"
         JOIN loading_inspections li ON li."loadingOrderId" = sd."loadingOrderId"
         WHERE sd."companyId" = $1 AND sd."deliveryDate" BETWEEN $2 AND $3 AND sd."deletedAt" IS NULL
           AND sd.status IN ('confirmed', 'dispatched', 'delivered')
           AND li."overallResult" = 'failed' AND li."deletedAt" IS NULL`,
        [companyId, startDate, endDate]);
      result.itemsDispatchedDespiteFail = failedItems.map(r => ({
        deliveryNumber: str(r['deliveryNumber']), itemName: str(r['itemName']),
        quantity: qty(r['quantity']), result: str(r['result']),
      }));
    } catch (err) {
      this.logger.warn(`salesInspections query failed: ${(err as Error).message}`);
    }
    return result;
  }

  // ─── Section: Credit Risk ─────────────────────────────────────────────────

  private async gatherCreditRisk(
    companyId: number,
  ): Promise<InternalControlsReport['creditRisk']> {
    const result: InternalControlsReport['creditRisk'] = {
      customersOverCreditLimit: [], overdueInvoicesCount: 0, overdueInvoicesValue: 0, averageDaysOverdue: 0,
    };
    // AssetPro has no customers table — customersOverCreditLimit always empty
    try {
      // Overdue invoices
      const overdue = await this.tenantPrisma.queryOne<Row>(
        `SELECT COUNT(*)::int as count, COALESCE(SUM("balanceDue"), 0) as total,
                COALESCE(AVG(EXTRACT(DAY FROM NOW() - "dueDate")), 0) as "avgDays"
         FROM sales_invoices
         WHERE "companyId" = $1 AND status NOT IN ('draft','cancelled','voided','paid') AND "deletedAt" IS NULL
           AND "balanceDue" > 0 AND "dueDate" < NOW()`,
        [companyId]);
      result.overdueInvoicesCount = Number(overdue?.['count'] ?? 0);
      result.overdueInvoicesValue = num(overdue?.['total']);
      result.averageDaysOverdue = Math.round(Number(overdue?.['avgDays'] ?? 0));
    } catch (err) {
      this.logger.warn(`creditRisk query failed: ${(err as Error).message}`);
    }
    return result;
  }

  // ─── Section: Segregation of Duties ───────────────────────────────────────

  private async gatherSegregationOfDuties(
    companyId: number, startDate: string, endDate: string,
  ): Promise<InternalControlsReport['segregationOfDuties']> {
    const result: InternalControlsReport['segregationOfDuties'] = { usersWhoCreateAndApprove: [] };
    try {
      // Find users who both created and approved the same entity type
      const violations = await this.tenantPrisma.query<Row>(
        `SELECT u.name as "userName", pas."approvableType" as "entityType", COUNT(*)::int as count
         FROM process_approval_statuses pas
         JOIN process_approvals pa ON pa."approvableType" = pas."approvableType" AND pa."approvableId" = pas."approvableId"
         JOIN users u ON u.id = pas."creatorId"
         WHERE pas."companyId" = $1 AND pas.status = 'APPROVED'
           AND pas."creatorId" = pa."userId" AND pa."approvalAction" LIKE '%Approved%'
           AND pas."createdAt" BETWEEN $2 AND $3
         GROUP BY u.name, pas."approvableType"
         HAVING COUNT(*) > 0`,
        [companyId, startDate, endDate]);
      result.usersWhoCreateAndApprove = violations.map(r => ({
        userName: str(r['userName']), entityType: str(r['entityType']), count: Number(r['count'] ?? 0),
      }));
    } catch (err) {
      this.logger.warn(`segregationOfDuties query failed: ${(err as Error).message}`);
    }
    return result;
  }

  // ─── Section 9: Recommendations ──────────────────────────────────────────

  private buildRecommendations(data: {
    settingsRisk: SettingsRiskItem[];
    negativeStock: InternalControlsReport['negativeStock'];
    zeroCostTransactions: InternalControlsReport['zeroCostTransactions'];
    belowCostSales: InternalControlsReport['belowCostSales'];
    unapprovedTransactions: InternalControlsReport['unapprovedTransactions'];
    overReceivedGoods: InternalControlsReport['overReceivedGoods'];
    glConfigGaps: InternalControlsReport['glConfigGaps'];
    purchaseInspections: InternalControlsReport['purchaseInspections'];
    salesInspections: InternalControlsReport['salesInspections'];
    creditRisk: InternalControlsReport['creditRisk'];
    segregationOfDuties: InternalControlsReport['segregationOfDuties'];
    inventoryHealth: InternalControlsReport['inventoryHealth'];
  }): Recommendation[] {
    const recs: Recommendation[] = [];

    // Negative stock
    if (data.negativeStock.totalItems > 0) {
      recs.push({
        priority: 'critical',
        message: `${data.negativeStock.totalItems} item(s) have negative stock (total exposure: ${data.negativeStock.totalNegativeValue.toLocaleString()}). This indicates phantom inventory or unrecorded receipts.`,
        action:
          'Investigate each negative-stock line. Record missing GRNs, reverse phantom sales, and enable the "Prevent" negative stock policy in Inventory Settings.',
      });
    }

    // High-risk settings
    const highRiskSettings = data.settingsRisk.filter((s) => s.riskLevel === 'high');
    if (highRiskSettings.length > 0) {
      recs.push({
        priority: 'critical',
        message: `${highRiskSettings.length} high-risk setting(s) detected: ${highRiskSettings.map((s) => s.label).join(', ')}.`,
        action:
          'Review and tighten these settings with your operations and finance teams to prevent financial misstatement and inventory fraud.',
      });
    }

    // Below-cost sales
    if (data.belowCostSales.count > 0) {
      recs.push({
        priority: 'critical',
        message: `${data.belowCostSales.count} line(s) sold below cost in the period, resulting in a total loss of ${data.belowCostSales.totalLoss.toLocaleString()}.`,
        action:
          'Enable "Block Below-Cost Selling" in Sales Settings and review these transactions with the sales and pricing team.',
      });
    }

    // Zero-cost items with sales
    if (data.zeroCostTransactions.count > 0) {
      recs.push({
        priority: 'critical',
        message: `${data.zeroCostTransactions.items.length} item(s) with zero cost have ${data.zeroCostTransactions.count} sales in the period (total revenue: ${data.zeroCostTransactions.totalRevenue.toLocaleString()}). COGS is understated.`,
        action:
          'Update average/standard cost for these items immediately to reflect true COGS. Enable "Require Cost on Receipt" to prevent zero-cost items entering the system.',
      });
    }

    // GL category gaps
    if (data.glConfigGaps.categories.length > 0) {
      recs.push({
        priority: 'critical',
        message: `${data.glConfigGaps.categories.length} item categor${data.glConfigGaps.categories.length === 1 ? 'y' : 'ies'} missing GL account mappings. Inventory movements will not post to the GL correctly.`,
        action:
          'Go to Inventory → Categories and assign the Inventory, COGS, Revenue, and GRN Clearing GL accounts for each flagged category.',
      });
    }

    // Unapproved GRNs
    if (data.unapprovedTransactions.grns.count > 0) {
      recs.push({
        priority: 'advisory',
        message: `${data.unapprovedTransactions.grns.count} GRN(s) totalling ${data.unapprovedTransactions.grns.totalValue.toLocaleString()} have been received but not approved.`,
        action:
          'Enable GRN approval in Purchase Settings and approve or void these pending receipts.',
      });
    }

    // Unapproved orders
    if (data.unapprovedTransactions.orders.count > 0) {
      recs.push({
        priority: 'advisory',
        message: `${data.unapprovedTransactions.orders.count} sales order(s) have been processed without approval.`,
        action:
          'Configure sales order approval workflows in Core Settings and review unapproved orders.',
      });
    }

    // Over-received goods
    if (data.overReceivedGoods.count > 0) {
      recs.push({
        priority: 'advisory',
        message: `${data.overReceivedGoods.count} GRN line(s) received more goods than ordered.`,
        action:
          'Enable over-receipt tolerance limits in Purchase Settings. Review these GRNs and reconcile with suppliers.',
      });
    }

    // Customers without AR
    if (data.glConfigGaps.customersWithoutAR.length > 0) {
      recs.push({
        priority: 'advisory',
        message: `${data.glConfigGaps.customersWithoutAR.length} active customer(s) have no Accounts Receivable GL account assigned.`,
        action:
          'Assign an AR account to each customer record in Sales → Customers to ensure correct GL postings on invoices.',
      });
    }

    // Suppliers without AP
    if (data.glConfigGaps.suppliersWithoutAP.length > 0) {
      recs.push({
        priority: 'advisory',
        message: `${data.glConfigGaps.suppliersWithoutAP.length} supplier(s) have no Accounts Payable GL account assigned.`,
        action:
          'Assign an AP account to each supplier record in Purchase → Suppliers to ensure correct GL postings on purchase invoices.',
      });
    }

    // Banks without GL
    if (data.glConfigGaps.banksWithoutGL.length > 0) {
      recs.push({
        priority: 'advisory',
        message: `${data.glConfigGaps.banksWithoutGL.length} bank account(s) have no GL account linked. Bank transactions will not post to the GL.`,
        action: 'Link a GL account to each bank in Accounts → Banks.',
      });
    }

    // Stale items
    if (data.inventoryHealth.staleItems > 0) {
      recs.push({
        priority: 'advisory',
        message: `${data.inventoryHealth.staleItems} stock level(s) have had no movement in over 90 days. These may be obsolete or slow-moving.`,
        action:
          'Review slow-moving items with the warehouse team. Consider write-downs or disposal per your inventory policy.',
      });
    }

    // Cost variance
    if (data.inventoryHealth.costVarianceItems > 0) {
      recs.push({
        priority: 'advisory',
        message: `${data.inventoryHealth.costVarianceItems} item(s) have a variance greater than 20% between average cost and standard cost.`,
        action:
          'Investigate the root cause (e.g., supplier price changes, incorrect GRN costing) and update standard costs to reflect current market rates.',
      });
    }

    // No issues
    if (recs.length === 0) {
      recs.push({
        priority: 'good',
        message: 'No critical or advisory control issues detected for the selected period.',
        action:
          'Continue monitoring regularly — run this report monthly or after each period close.',
      });
    }

    // Sort: critical first, then advisory, then good
    // Purchase inspection recommendations
    if (data.purchaseInspections.inspectionRequired && data.purchaseInspections.grnsWithoutInspection > 0) {
      recs.push({
        priority: 'critical',
        message: `${data.purchaseInspections.grnsWithoutInspection} GRN(s) received without inspection (₦${data.purchaseInspections.grnsWithoutInspectionValue.toLocaleString()}) despite inspection being required.`,
        action: 'Review these GRNs — goods may not meet quality standards. Enforce inspection workflow before GRN approval.',
      });
    }
    if (data.purchaseInspections.itemsReceivedDespiteFail.length > 0) {
      recs.push({
        priority: 'critical',
        message: `${data.purchaseInspections.itemsReceivedDespiteFail.length} item(s) received into inventory despite FAILED inspection.`,
        action: 'Quarantine or return these items immediately. Review GRN approval process to prevent receiving failed goods.',
      });
    }
    if (data.purchaseInspections.totalInspections > 0 && data.purchaseInspections.failed > 0) {
      const failRate = Math.round((data.purchaseInspections.failed / data.purchaseInspections.totalInspections) * 100);
      recs.push({
        priority: failRate > 20 ? 'critical' : 'advisory',
        message: `Purchase inspection fail rate: ${failRate}% (${data.purchaseInspections.failed} of ${data.purchaseInspections.totalInspections}). ${data.purchaseInspections.partial} partial acceptances.`,
        action: failRate > 20 ? 'High failure rate indicates supplier quality issues. Review supplier performance and consider alternative suppliers.' : 'Monitor supplier quality trends and address recurring issues.',
      });
    }

    // Sales inspection recommendations
    if (data.salesInspections.inspectionRequired && data.salesInspections.deliveriesWithoutInspection > 0) {
      recs.push({
        priority: 'critical',
        message: `${data.salesInspections.deliveriesWithoutInspection} delivery(s) dispatched without loading inspection (₦${data.salesInspections.deliveriesWithoutInspectionValue.toLocaleString()}) despite inspection being required.`,
        action: 'Review these deliveries — goods may have quality issues. Enforce inspection workflow before dispatch.',
      });
    }
    if (data.salesInspections.itemsDispatchedDespiteFail.length > 0) {
      recs.push({
        priority: 'critical',
        message: `${data.salesInspections.itemsDispatchedDespiteFail.length} item(s) dispatched to customers despite FAILED loading inspection.`,
        action: 'Contact affected customers immediately. These shipments may result in returns, complaints, or claims.',
      });
    }

    // Credit risk recommendations
    if (data.creditRisk.customersOverCreditLimit.length > 0) {
      const totalOver = data.creditRisk.customersOverCreditLimit.reduce((s, c) => s + c.overAmount, 0);
      recs.push({
        priority: 'critical',
        message: `${data.creditRisk.customersOverCreditLimit.length} customer(s) exceed their credit limit by ₦${totalOver.toLocaleString()}.`,
        action: 'Review and either increase credit limits or hold further orders until payments are received. Enable "Enforce Credit Limit" in Sales Settings.',
      });
    }
    if (data.creditRisk.overdueInvoicesCount > 0) {
      recs.push({
        priority: data.creditRisk.overdueInvoicesValue > 1000000 ? 'critical' : 'advisory',
        message: `${data.creditRisk.overdueInvoicesCount} overdue invoice(s) totalling ₦${data.creditRisk.overdueInvoicesValue.toLocaleString()}. Average ${data.creditRisk.averageDaysOverdue} days overdue.`,
        action: 'Initiate collections process. Consider blocking further sales to customers with overdue invoices.',
      });
    }

    // Segregation of duties recommendations
    if (data.segregationOfDuties.usersWhoCreateAndApprove.length > 0) {
      const details = data.segregationOfDuties.usersWhoCreateAndApprove.map(v => `${v.userName}: ${v.count} ${v.entityType.replace(/_/g, ' ')}`).join('; ');
      recs.push({
        priority: 'critical',
        message: `Segregation of duties violation: users who created AND approved the same documents — ${details}.`,
        action: 'Configure approval flows to prevent the same user from creating and approving transactions. Review affected documents for potential fraud.',
      });
    }

    const order: Record<string, number> = { critical: 0, advisory: 1, good: 2 };
    recs.sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3));

    return recs;
  }
}
