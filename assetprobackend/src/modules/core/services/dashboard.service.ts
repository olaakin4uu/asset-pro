import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../../common/services/tenant-prisma.service';
import { toMoney } from '../../../common/utils/decimal';
import { brand } from '../../../common/config/brand';

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardStat {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'amber' | 'indigo' | 'cyan';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  progress?: {
    value: number;
    label?: string;
  };
  badge?: {
    label: string;
    variant: 'default' | 'warning' | 'danger' | 'success';
    pulse?: boolean;
  };
}

export interface DashboardActivity {
  id: number;
  type: 'sale' | 'purchase' | 'inventory' | 'payment' | 'alert' | 'user';
  title: string;
  description: string;
  time: string;
  amount?: string;
}

export interface DashboardAlert {
  id: number;
  type: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  message: string;
  action?: string;
  actionUrl?: string;
}

export interface DashboardCompanyInfo {
  id: number;
  name: string;
  displayName?: string;
  businessType?: string;
  currency: string;
  city?: string;
  employeesCount: number;
}

export interface DashboardResponse {
  companyInfo: DashboardCompanyInfo | null;
  stats: DashboardStat[];
  performanceStats: DashboardStat[];
  activities: DashboardActivity[];
  alerts: DashboardAlert[];
}

export interface FmCashPositionBank {
  name: string;
  glCode: string;
  balance: number;
}

export interface FmCashPosition {
  totalBankBalance: number;
  investeeOutstanding: number;
  aum: number;
  cashToAumPct: number;
  cashBreached: boolean;
  banks: FmCashPositionBank[];
}

export interface FundManagementDashboardResponse {
  companyInfo: DashboardCompanyInfo | null;
  aumStats: DashboardStat[];
  operationalStats: DashboardStat[];
  activities: DashboardActivity[];
  alerts: DashboardAlert[];
  complianceSummary: {
    totalRules: number;
    passedChecks: number;
    failedChecks: number;
    breachCount: number;
  };
  cashPosition: FmCashPosition;
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

const currencySymbols: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  ZAR: 'R',
  GHS: '₵',
  KES: 'KSh',
  XOF: 'CFA',
  XAF: 'FCFA',
};

function formatCompactCurrency(amount: number, currency: string): string {
  const symbol = currencySymbols[currency] || currency;

  if (amount >= 1_000_000_000) {
    return `${symbol}${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  }
  return `${symbol}${amount.toFixed(2)}`;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private tenantPrisma: TenantPrismaService) {}

  /**
   * Get dashboard data for a company
   */
  async getDashboard(companyId: number | null, branchId: number | null): Promise<DashboardResponse> {
    // If no company context, return empty dashboard
    if (!companyId) {
      return {
        companyInfo: null,
        stats: [],
        performanceStats: [],
        activities: [],
        alerts: this.getDefaultAlerts(),
      };
    }

    try {
      // Fetch company info
      const companyInfo = await this.getCompanyInfo(companyId);
      const currency = companyInfo?.currency || 'NGN';

      // Fetch all stats in parallel
      const [
        stats,
        performanceStats,
        activities,
        alerts,
      ] = await Promise.all([
        this.getKPIStats(companyId, branchId, currency),
        this.getPerformanceStats(companyId, branchId),
        this.getRecentActivities(companyId, branchId, currency),
        this.getAlerts(companyId, branchId),
      ]);

      return {
        companyInfo,
        stats,
        performanceStats,
        activities,
        alerts,
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard data: ${error.message}`, error.stack);
      return {
        companyInfo: null,
        stats: [],
        performanceStats: [],
        activities: [],
        alerts: this.getDefaultAlerts(),
      };
    }
  }

  /**
   * Get company info for dashboard header
   */
  private async getCompanyInfo(companyId: number): Promise<DashboardCompanyInfo | null> {
    try {
      const company = await this.tenantPrisma.queryOne(
        `SELECT id, name, "displayName", "businessType", currency, city
         FROM companies WHERE id = $1 AND "deletedAt" IS NULL`,
        [companyId]
      );

      if (!company) return null;

      // Count active employees
      const empCount = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM employees
         WHERE "companyId" = $1 AND "isActive" = true AND "deletedAt" IS NULL`,
        [companyId]
      );

      return {
        id: company.id,
        name: company.name,
        displayName: company.displayName,
        businessType: company.businessType,
        currency: company.currency || 'NGN',
        city: company.city,
        employeesCount: parseInt(empCount?.count || '0', 10),
      };
    } catch (error) {
      this.logger.warn(`Failed to get company info: ${error.message}`);
      return null;
    }
  }

  /**
   * Get KPI stats (first row of stat cards)
   */
  private async getKPIStats(
    companyId: number,
    branchId: number | null,
    currency: string
  ): Promise<DashboardStat[]> {
    const stats: DashboardStat[] = [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Build branch filter — include records with NULL branchId (company-wide)
    const branchFilter = branchId ? ` AND ("branchId" = ${branchId} OR "branchId" IS NULL)` : '';

    // Each stat is independent — one failure doesn't kill the others

    try {
      // 1. Revenue — cumulative month + year-to-date
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const monthRevenue = await this.tenantPrisma.queryOne<{ total: string }>(
        `SELECT COALESCE(SUM("totalAmount"), 0) as total
         FROM sales_invoices
         WHERE "companyId" = $1 ${branchFilter}
         AND status NOT IN ('draft', 'cancelled', 'voided')
         AND "invoiceDate" >= $2
         AND "deletedAt" IS NULL`,
        [companyId, startOfMonth]
      ).catch(() => ({ total: '0' }));

      const ytdRevenue = await this.tenantPrisma.queryOne<{ total: string }>(
        `SELECT COALESCE(SUM("totalAmount"), 0) as total
         FROM sales_invoices
         WHERE "companyId" = $1 ${branchFilter}
         AND status NOT IN ('draft', 'cancelled', 'voided')
         AND "invoiceDate" >= $2
         AND "deletedAt" IS NULL`,
        [companyId, startOfYear]
      ).catch(() => ({ total: '0' }));

      const monthRevenueNum = toMoney(monthRevenue?.total);
      const ytdRevenueNum = toMoney(ytdRevenue?.total);

      stats.push({
        title: 'Revenue (Month)',
        value: formatCompactCurrency(monthRevenueNum, currency),
        subtitle: `YTD: ${formatCompactCurrency(ytdRevenueNum, currency)}`,
        icon: 'DollarSign',
        color: 'green',
      });
    } catch (e) { this.logger.warn(`Revenue stat failed: ${(e as Error).message}`); }

    try {
      // 2. Sales Pipeline — orders with incomplete approvals (pending, confirmed)
      const pipeline = await this.tenantPrisma.queryOne<{ total: string; count: string }>(
        `SELECT COALESCE(SUM("totalAmount"), 0) as total, COUNT(*) as count
         FROM sales_orders
         WHERE "companyId" = $1 ${branchFilter}
         AND status IN ('pending', 'confirmed', 'approved')
         AND "deletedAt" IS NULL`,
        [companyId]
      ).catch(() => ({ total: '0', count: '0' }));

      stats.push({
        title: 'Sales Pipeline',
        value: formatCompactCurrency(toMoney(pipeline?.total), currency),
        subtitle: `${pipeline?.count || 0} open orders`,
        icon: 'ShoppingCart',
        color: 'blue',
      });
    } catch (e) { this.logger.warn(`Pipeline stat failed: ${(e as Error).message}`); }

    try {
      // 3. Inventory Value — total valuation from stock levels
      const inventoryValue = await this.tenantPrisma.queryOne<{ total: string; lowStock: string }>(
        `SELECT
           COALESCE(SUM(sl."totalValue"), 0) as total,
           COUNT(CASE WHEN sl.quantity > 0 AND sl.quantity <= COALESCE(i."reorderPoint", 0) THEN 1 END) as "lowStock"
         FROM inv_stock_levels sl
         JOIN inv_items i ON sl."itemId" = i.id
         WHERE sl."companyId" = $1 ${branchId ? ` AND sl."warehouseId" IN (SELECT id FROM inv_warehouses WHERE "branchId" = ${branchId})` : ''}
         AND i."deletedAt" IS NULL`,
        [companyId]
      ).catch(() => ({ total: '0', lowStock: '0' }));

      const lowStockCount = parseInt(inventoryValue?.lowStock || '0', 10);
      stats.push({
        title: 'Inventory Value',
        value: formatCompactCurrency(toMoney(inventoryValue?.total), currency),
        subtitle: `${lowStockCount} low stock items`,
        icon: 'Package',
        color: 'orange',
        badge: lowStockCount > 0 ? {
          label: `${lowStockCount} low`,
          variant: 'warning',
          pulse: true,
        } : undefined,
      });
    } catch (e) { this.logger.warn(`Inventory stat failed: ${(e as Error).message}`); }

    try {
      // 4. Accounts Receivable (unpaid invoices)
      const receivables = await this.tenantPrisma.queryOne<{ total: string; overdue: string }>(
        `SELECT
           COALESCE(SUM("balanceAmount"), 0) as total,
           COUNT(CASE WHEN "dueDate" < NOW() THEN 1 END) as overdue
         FROM sales_invoices
         WHERE "companyId" = $1 ${branchFilter}
         AND status NOT IN ('draft', 'cancelled', 'voided')
         AND "balanceAmount" > 0
         AND "deletedAt" IS NULL`,
        [companyId]
      ).catch(() => ({ total: '0', overdue: '0' }));

      const overdueCount = parseInt(receivables?.overdue || '0', 10);
      stats.push({
        title: 'Accounts Receivable',
        value: formatCompactCurrency(toMoney(receivables?.total), currency),
        subtitle: `${overdueCount} overdue invoices`,
        icon: 'Receipt',
        color: 'purple',
        badge: overdueCount > 0 ? {
          label: `${overdueCount} overdue`,
          variant: 'danger',
          pulse: true,
        } : undefined,
      });
    } catch (e) { this.logger.warn(`AR stat failed: ${(e as Error).message}`); }

    try {
      // 5. Purchase Orders — open POs value and count
      const purchaseOrders = await this.tenantPrisma.queryOne<{ total: string; count: string; awaitingReceipt: string }>(
        `SELECT
           COALESCE(SUM(CASE WHEN status IN ('approved', 'sent', 'partial') THEN "totalAmount" ELSE 0 END), 0) as total,
           COUNT(CASE WHEN status IN ('approved', 'sent', 'partial') THEN 1 END) as count,
           COUNT(CASE WHEN status IN ('approved', 'sent') AND id IN (
             SELECT "purchaseOrderId" FROM purchase_inspections
             WHERE "companyId" = $1 AND status = 'completed' AND "overallResult" IN ('passed', 'partial') AND "deletedAt" IS NULL
           ) AND id NOT IN (
             SELECT "purchaseOrderId" FROM goods_received_notes
             WHERE "companyId" = $1 AND "deletedAt" IS NULL AND status NOT IN ('rejected')
           ) THEN 1 END) as "awaitingReceipt"
         FROM purchase_orders
         WHERE "companyId" = $1 ${branchFilter}
         AND "deletedAt" IS NULL`,
        [companyId]
      ).catch(() => ({ total: '0', count: '0', awaitingReceipt: '0' }));

      const awaitingReceipt = parseInt(purchaseOrders?.awaitingReceipt || '0', 10);
      stats.push({
        title: 'Purchase Orders',
        value: formatCompactCurrency(toMoney(purchaseOrders?.total), currency),
        subtitle: `${purchaseOrders?.count || 0} open POs`,
        icon: 'FileText',
        color: 'blue',
        badge: awaitingReceipt > 0 ? {
          label: `${awaitingReceipt} to receive`,
          variant: 'warning',
          pulse: true,
        } : undefined,
      });
    } catch (e) { this.logger.warn(`PO stat failed: ${(e as Error).message}`); }

    try {
      // 6. Accounts Payable — unpaid supplier invoices
      const payables = await this.tenantPrisma.queryOne<{ total: string; overdue: string }>(
        `SELECT
           COALESCE(SUM("totalAmount" - COALESCE("amountPaid", 0)), 0) as total,
           COUNT(CASE WHEN "dueDate" < NOW() THEN 1 END) as overdue
         FROM purchase_invoices
         WHERE "companyId" = $1 ${branchFilter}
         AND status NOT IN ('draft', 'cancelled', 'voided', 'paid')
         AND ("totalAmount" - COALESCE("amountPaid", 0)) > 0
         AND "deletedAt" IS NULL`,
        [companyId]
      ).catch(() => ({ total: '0', overdue: '0' }));

      const overdueAPCount = parseInt(payables?.overdue || '0', 10);
      stats.push({
        title: 'Accounts Payable',
        value: formatCompactCurrency(toMoney(payables?.total), currency),
        subtitle: `${overdueAPCount} overdue bills`,
        icon: 'Clock',
        color: 'red',
        badge: overdueAPCount > 0 ? {
          label: `${overdueAPCount} overdue`,
          variant: 'danger',
          pulse: true,
        } : undefined,
      });
    } catch (e) { this.logger.warn(`AP stat failed: ${(e as Error).message}`); }

    // Return placeholder stats if none were generated
    if (stats.length === 0) {
      return this.getPlaceholderKPIStats(currency);
    }

    return stats;
  }

  /**
   * Get performance stats (second row of stat cards)
   */
  private async getPerformanceStats(companyId: number, branchId: number | null): Promise<DashboardStat[]> {
    const stats: DashboardStat[] = [];
    const branchFilter = branchId ? ` AND ("branchId" = ${branchId} OR "branchId" IS NULL)` : '';

    try {
      // 1. Order Conversion Rate
      const orders = await this.tenantPrisma.queryOne<{ total: string; converted: string }>(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN status = 'invoiced' THEN 1 END) as converted
         FROM sales_orders
         WHERE "companyId" = $1 ${branchFilter}
         AND "deletedAt" IS NULL`,
        [companyId]
      ).catch(() => ({ total: '0', converted: '0' }));

      const totalOrders = parseInt(orders?.total || '0', 10);
      const convertedOrders = parseInt(orders?.converted || '0', 10);
      const conversionRate = totalOrders > 0 ? Math.round((convertedOrders / totalOrders) * 100) : 0;

      stats.push({
        title: 'Order Conversion',
        value: `${conversionRate}%`,
        subtitle: `${convertedOrders} of ${totalOrders} orders`,
        icon: 'TrendingUp',
        color: 'indigo',
        progress: {
          value: conversionRate,
          label: 'Conversion rate',
        },
      });

      // 2. Order Fulfillment Rate
      const fulfillment = await this.tenantPrisma.queryOne<{ total: string; delivered: string }>(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered
         FROM sales_orders
         WHERE "companyId" = $1 ${branchFilter}
         AND EXTRACT(MONTH FROM "createdAt") = EXTRACT(MONTH FROM NOW())
         AND EXTRACT(YEAR FROM "createdAt") = EXTRACT(YEAR FROM NOW())
         AND "deletedAt" IS NULL`,
        [companyId]
      ).catch(() => ({ total: '0', delivered: '0' }));

      const totalMonthOrders = parseInt(fulfillment?.total || '0', 10);
      const deliveredOrders = parseInt(fulfillment?.delivered || '0', 10);
      const fulfillmentRate = totalMonthOrders > 0 ? Math.round((deliveredOrders / totalMonthOrders) * 100) : 0;

      stats.push({
        title: 'Order Fulfillment',
        value: `${fulfillmentRate}%`,
        subtitle: `${deliveredOrders} delivered this month`,
        icon: 'CheckCircle',
        color: 'cyan',
        progress: {
          value: fulfillmentRate,
          label: 'Fulfillment rate',
        },
      });

      // 3. Active Users
      const users = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM users
         WHERE "companyId" = $1
         AND "deletedAt" IS NULL`,
        [companyId]
      ).catch(() => ({ count: '0' }));

      stats.push({
        title: 'Active Users',
        value: users?.count || '0',
        subtitle: 'Team members',
        icon: 'Users',
        color: 'blue',
      });

      // 4. Pending Approvals — ALL approval types
      const pendingSO = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM sales_orders WHERE "companyId" = $1 AND status = 'pending' AND "deletedAt" IS NULL`, [companyId]
      ).catch(() => ({ count: '0' }));
      const pendingPO = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM purchase_orders WHERE "companyId" = $1 AND status = 'pending' AND "deletedAt" IS NULL`, [companyId]
      ).catch(() => ({ count: '0' }));
      const pendingInspections = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM loading_inspections WHERE "companyId" = $1 AND status != 'completed' AND "deletedAt" IS NULL`, [companyId]
      ).catch(() => ({ count: '0' }));
      const pendingExpenses = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM expense_requests WHERE "companyId" = $1 AND status = 'pending' AND "deletedAt" IS NULL`, [companyId]
      ).catch(() => ({ count: '0' }));
      const pendingConfigurable = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM process_approval_statuses WHERE "companyId" = $1 AND status = 'PENDING'`, [companyId]
      ).catch(() => ({ count: '0' }));

      const pendingCount =
        parseInt(pendingSO?.count || '0', 10) +
        parseInt(pendingPO?.count || '0', 10) +
        parseInt(pendingInspections?.count || '0', 10) +
        parseInt(pendingExpenses?.count || '0', 10) +
        parseInt(pendingConfigurable?.count || '0', 10);

      stats.push({
        title: 'Pending Approvals',
        value: pendingCount.toString(),
        subtitle: 'All modules',
        icon: 'Clock',
        color: 'amber',
        badge: pendingCount > 0 ? {
          label: 'Action needed',
          variant: 'warning',
        } : undefined,
      });

    } catch (error) {
      this.logger.warn(`Failed to get performance stats: ${error.message}`);
    }

    // Return placeholder stats if none were generated
    if (stats.length === 0) {
      return this.getPlaceholderPerformanceStats();
    }

    return stats;
  }

  /**
   * Get recent activities
   */
  private async getRecentActivities(
    companyId: number,
    branchId: number | null,
    currency: string
  ): Promise<DashboardActivity[]> {
    const activities: (DashboardActivity & { _ts: Date })[] = [];
    const branchFilter = branchId ? ` AND "branchId" = ${branchId}` : '';

    try {
      // Recent sales orders
      const orders = await this.tenantPrisma.query(
        `SELECT id, "orderNumber", "totalAmount", "createdAt", status
         FROM sales_orders
         WHERE "companyId" = $1 ${branchFilter} AND "deletedAt" IS NULL
         ORDER BY "createdAt" DESC LIMIT 3`,
        [companyId]
      ).catch(() => []);

      for (const order of orders) {
        activities.push({
          id: order.id, type: 'sale',
          title: `Sales Order #${order.orderNumber}`,
          description: `Status: ${order.status}`,
          time: formatTimeAgo(new Date(order.createdAt)),
          amount: formatCompactCurrency(toMoney(order.totalAmount), currency),
          _ts: new Date(order.createdAt),
        });
      }

      // Recent sales invoices
      const invoices = await this.tenantPrisma.query(
        `SELECT id, "invoiceNumber", "totalAmount", "createdAt", status
         FROM sales_invoices
         WHERE "companyId" = $1 AND "deletedAt" IS NULL
         ORDER BY "createdAt" DESC LIMIT 3`,
        [companyId]
      ).catch(() => []);

      for (const invoice of invoices) {
        activities.push({
          id: invoice.id, type: 'payment',
          title: `Invoice #${invoice.invoiceNumber}`,
          description: `Status: ${invoice.status}`,
          time: formatTimeAgo(new Date(invoice.createdAt)),
          amount: formatCompactCurrency(toMoney(invoice.totalAmount), currency),
          _ts: new Date(invoice.createdAt),
        });
      }

      // Recent loading orders
      const loadingOrders = await this.tenantPrisma.query(
        `SELECT lo.id, lo."loadingNumber", lo.status, lo."createdAt", lo."inspectionStatus",
                c.name as "customerName"
         FROM loading_orders lo
         LEFT JOIN sales_orders so ON so.id = lo."salesOrderId"
         LEFT JOIN customers c ON c.id = so."customerId"
         WHERE lo."companyId" = $1 AND lo."createdAt" IS NOT NULL
         ORDER BY lo."createdAt" DESC LIMIT 3`,
        [companyId]
      ).catch(() => []);

      for (const lo of loadingOrders) {
        activities.push({
          id: lo.id, type: 'sale',
          title: `Loading Order ${lo.loadingNumber}`,
          description: `${lo.customerName || ''} — ${lo.status}${lo.inspectionStatus !== 'pending' ? ` (inspection: ${lo.inspectionStatus})` : ''}`,
          time: formatTimeAgo(new Date(lo.createdAt)),
          _ts: new Date(lo.createdAt),
        });
      }

      // Recent deliveries
      const deliveries = await this.tenantPrisma.query(
        `SELECT sd.id, sd."deliveryNumber", sd.status, sd."createdAt",
                c.name as "customerName"
         FROM sales_deliveries sd
         LEFT JOIN customers c ON c.id = sd."customerId"
         WHERE sd."companyId" = $1 AND sd."deletedAt" IS NULL
         ORDER BY sd."createdAt" DESC LIMIT 2`,
        [companyId]
      ).catch(() => []);

      for (const del of deliveries) {
        activities.push({
          id: del.id, type: 'sale',
          title: `Delivery ${del.deliveryNumber}`,
          description: `${del.customerName || ''} — ${del.status}`,
          time: formatTimeAgo(new Date(del.createdAt)),
          _ts: new Date(del.createdAt),
        });
      }

      // Recent journal entries
      const journals = await this.tenantPrisma.query(
        `SELECT id, "entryNumber", narration, "totalDebit", "createdAt", status
         FROM journal_entries
         WHERE "companyId" = $1 AND "deletedAt" IS NULL
         ORDER BY "createdAt" DESC LIMIT 3`,
        [companyId]
      ).catch(() => []);

      for (const je of journals) {
        activities.push({
          id: je.id, type: 'payment',
          title: `Journal ${je.entryNumber}`,
          description: je.narration || je.status,
          time: formatTimeAgo(new Date(je.createdAt)),
          amount: formatCompactCurrency(toMoney(je.totalDebit), currency),
          _ts: new Date(je.createdAt),
        });
      }

      // Recent stock movements
      const movements = await this.tenantPrisma.query(
        `SELECT sm.id, sm."movementNumber", sm."movementType", sm.quantity, sm."unitCost",
                sm."createdAt", i.name as "itemName"
         FROM inv_stock_movements sm
         LEFT JOIN inv_items i ON i.id = sm."itemId"
         WHERE sm."companyId" = $1 AND sm.status IN ('completed', 'Posted', 'approved')
         ORDER BY sm."createdAt" DESC LIMIT 2`,
        [companyId]
      ).catch(() => []);

      for (const sm of movements) {
        activities.push({
          id: sm.id, type: 'purchase',
          title: `Stock ${sm.movementType}: ${sm.itemName || ''}`,
          description: `Qty: ${Number(sm.quantity).toLocaleString()} — ${sm.movementNumber}`,
          time: formatTimeAgo(new Date(sm.createdAt)),
          amount: sm.unitCost ? formatCompactCurrency(toMoney(Number(sm.quantity) * Number(sm.unitCost)), currency) : undefined,
          _ts: new Date(sm.createdAt),
        });
      }

      // Sort by most recent timestamp
      activities.sort((a, b) => b._ts.getTime() - a._ts.getTime());

    } catch (error) {
      this.logger.warn(`Failed to get recent activities: ${error.message}`);
    }

    return activities.slice(0, 10);
  }

  /**
   * Get alerts and notifications
   */
  private async getAlerts(companyId: number, branchId: number | null): Promise<DashboardAlert[]> {
    const alerts: DashboardAlert[] = [];
    const branchFilter = branchId ? ` AND "branchId" = ${branchId}` : '';

    try {
      // Check for overdue invoices
      const overdueInvoices = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM sales_invoices
         WHERE "companyId" = $1 ${branchFilter}
         AND status = 'approved' AND "dueDate" < NOW()
         AND "balanceDue" > 0 AND "deletedAt" IS NULL`,
        [companyId]
      ).catch(() => ({ count: '0' }));

      const overdueCount = parseInt(overdueInvoices?.count || '0', 10);
      if (overdueCount > 0) {
        alerts.push({
          id: 1,
          type: 'danger',
          title: 'Overdue Invoices',
          message: `${overdueCount} invoice${overdueCount > 1 ? 's are' : ' is'} past due date`,
          action: 'Review Collections',
          actionUrl: '/receivables/invoices?filter=overdue',
        });
      }

      // Check for low stock items
      const lowStock = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM inv_stock_levels sl
         JOIN inv_items i ON sl."itemId" = i.id
         WHERE sl."companyId" = $1
         AND sl.quantity <= i."reorderPoint"
         AND sl.quantity > 0
         AND i."deletedAt" IS NULL`,
        [companyId]
      ).catch(() => ({ count: '0' }));

      const lowStockCount = parseInt(lowStock?.count || '0', 10);
      if (lowStockCount > 0) {
        alerts.push({
          id: 2,
          type: 'warning',
          title: 'Low Stock Alert',
          message: `${lowStockCount} item${lowStockCount > 1 ? 's are' : ' is'} running low on stock`,
          action: 'Reorder Stock',
          actionUrl: '/inventory/items?filter=low-stock',
        });
      }

      // Check for out of stock items
      const outOfStock = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM inv_stock_levels sl
         WHERE sl."companyId" = $1
         AND sl.quantity <= 0`,
        [companyId]
      ).catch(() => ({ count: '0' }));

      const outOfStockCount = parseInt(outOfStock?.count || '0', 10);
      if (outOfStockCount > 0) {
        alerts.push({
          id: 3,
          type: 'danger',
          title: 'Out of Stock Items',
          message: `${outOfStockCount} item${outOfStockCount > 1 ? 's are' : ' is'} out of stock`,
          action: 'Urgent Reorder',
          actionUrl: '/inventory/items?filter=out-of-stock',
        });
      }

      // Check for pending sales orders
      const pendingOrders = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM sales_orders
         WHERE "companyId" = $1 ${branchFilter}
         AND status = 'pending' AND "deletedAt" IS NULL`,
        [companyId]
      ).catch(() => ({ count: '0' }));

      const pendingCount = parseInt(pendingOrders?.count || '0', 10);
      if (pendingCount > 0) {
        alerts.push({
          id: 4,
          type: 'info',
          title: 'Pending Approvals',
          message: `${pendingCount} sales order${pendingCount > 1 ? 's need' : ' needs'} approval`,
          action: 'Approve Orders',
          actionUrl: '/sales/orders?filter=pending',
        });
      }

      // Check for loading orders awaiting inspection approval
      const pendingInspections = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM loading_inspections
         WHERE "companyId" = $1 AND status != 'completed' AND "deletedAt" IS NULL`,
        [companyId]
      ).catch(() => ({ count: '0' }));

      const pendingInspectionCount = parseInt(pendingInspections?.count || '0', 10);
      if (pendingInspectionCount > 0) {
        alerts.push({
          id: 5,
          type: 'warning',
          title: 'Loading Orders Awaiting Inspection',
          message: `${pendingInspectionCount} loading order${pendingInspectionCount > 1 ? 's require' : ' requires'} inspection approval`,
          action: 'Review Inspections',
          actionUrl: '/sales/loading-orders',
        });
      }

    } catch (error) {
      this.logger.warn(`Failed to get alerts: ${error.message}`);
    }

    // Add success message if no alerts
    if (alerts.length === 0) {
      alerts.push({
        id: 0,
        type: 'success',
        title: 'All Systems Operational',
        message: 'No critical alerts at this time',
      });
    }

    return alerts.slice(0, 5);
  }

  /**
   * Default alerts when no company context
   */
  private getDefaultAlerts(): DashboardAlert[] {
    return [
      {
        id: 1,
        type: 'info',
        title: `Welcome to ${brand.appName}`,
        message: 'Select a company to view your dashboard data',
      },
    ];
  }

  /**
   * Placeholder KPI stats when data is not available
   */
  private getPlaceholderKPIStats(currency: string): DashboardStat[] {
    return [
      {
        title: 'Monthly Revenue',
        value: formatCompactCurrency(0, currency),
        subtitle: 'This month',
        icon: 'DollarSign',
        color: 'green',
      },
      {
        title: 'Sales Pipeline',
        value: formatCompactCurrency(0, currency),
        subtitle: '0 open orders',
        icon: 'ShoppingCart',
        color: 'blue',
      },
      {
        title: 'Inventory Value',
        value: formatCompactCurrency(0, currency),
        subtitle: '0 low stock items',
        icon: 'Package',
        color: 'orange',
      },
      {
        title: 'Accounts Receivable',
        value: formatCompactCurrency(0, currency),
        subtitle: '0 overdue invoices',
        icon: 'Receipt',
        color: 'purple',
      },
    ];
  }

  /**
   * Placeholder performance stats when data is not available
   */
  private getPlaceholderPerformanceStats(): DashboardStat[] {
    return [
      {
        title: 'Order Conversion',
        value: '0%',
        subtitle: '0 of 0 orders',
        icon: 'TrendingUp',
        color: 'indigo',
        progress: { value: 0, label: 'Conversion rate' },
      },
      {
        title: 'Order Fulfillment',
        value: '0%',
        subtitle: '0 delivered this month',
        icon: 'CheckCircle',
        color: 'cyan',
        progress: { value: 0, label: 'Fulfillment rate' },
      },
      {
        title: 'Active Users',
        value: '0',
        subtitle: 'Team members',
        icon: 'Users',
        color: 'blue',
      },
      {
        title: 'Pending Approvals',
        value: '0',
        subtitle: 'Awaiting action',
        icon: 'Clock',
        color: 'amber',
      },
    ];
  }

  // ============================================================================
  // FUND MANAGEMENT DASHBOARD
  // ============================================================================

  /**
   * Get fund management dashboard data for a company
   */
  async getFundManagementDashboard(
    companyId: number | null,
    branchId: number | null,
  ): Promise<FundManagementDashboardResponse> {
    const emptyCashPosition: FmCashPosition = { totalBankBalance: 0, investeeOutstanding: 0, aum: 0, cashToAumPct: 0, cashBreached: false, banks: [] };

    if (!companyId) {
      return {
        companyInfo: null,
        aumStats: [],
        operationalStats: [],
        activities: [],
        alerts: [],
        complianceSummary: { totalRules: 0, passedChecks: 0, failedChecks: 0, breachCount: 0 },
        cashPosition: emptyCashPosition,
      };
    }

    try {
      const companyInfo = await this.getCompanyInfo(companyId);
      const currency = companyInfo?.currency || 'NGN';

      const [aumStats, operationalStats, activities, complianceSummary, cashPosition] = await Promise.all([
        this.getFmAumStats(companyId, currency),
        this.getFmOperationalStats(companyId, currency),
        this.getFmRecentActivities(companyId, currency),
        this.getFmComplianceSummary(companyId),
        this.getFmCashPosition(companyId, currency),
      ]);

      // Auto-generate cash-breach alert and merge with compliance alerts
      const alerts = await this.getFmAlerts(companyId, currency);
      if (cashPosition.cashBreached) {
        alerts.unshift({
          id: 0,
          type: 'danger',
          title: 'Cash-to-AUM Limit Breached',
          message: `Bank cash is ${cashPosition.cashToAumPct.toFixed(1)}% of AUM (limit: 5%). Idle cash must be deployed into Sharia-compliant investments.`,
          action: 'View Cash Position',
          actionUrl: '/fund-management',
        });
      }

      return { companyInfo, aumStats, operationalStats, activities, alerts, complianceSummary, cashPosition };
    } catch (error) {
      this.logger.error(`Fund management dashboard failed: ${error.message}`, error.stack);
      return {
        companyInfo: null,
        aumStats: [],
        operationalStats: [],
        activities: [],
        alerts: [],
        complianceSummary: { totalRules: 0, passedChecks: 0, failedChecks: 0, breachCount: 0 },
        cashPosition: emptyCashPosition,
      };
    }
  }

  /**
   * Fund AUM & performance stats (row 1)
   */
  private async getFmAumStats(companyId: number, currency: string): Promise<DashboardStat[]> {
    const stats: DashboardStat[] = [];

    try {
      // 1. Total AUM — sum current value from investor accounts (authoritative live figure)
      const aum = await this.tenantPrisma.queryOne<{ currentValue: string; totalInvested: string; activeAccounts: string }>(
        `SELECT
           COALESCE(SUM("currentValue"), 0) AS "currentValue",
           COALESCE(SUM("totalInvested"), 0) AS "totalInvested",
           COUNT(CASE WHEN UPPER(status) = 'ACTIVE' THEN 1 END) AS "activeAccounts"
         FROM fm_investor_accounts
         WHERE "companyId" = $1`,
        [companyId],
      ).catch(() => ({ currentValue: '0', totalInvested: '0', activeAccounts: '0' }));

      const fundCount = await this.tenantPrisma.queryOne<{ activeFunds: string }>(
        `SELECT COUNT(CASE WHEN UPPER(status) = 'ACTIVE' THEN 1 END) AS "activeFunds"
         FROM fm_funds WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
        [companyId],
      ).catch(() => ({ activeFunds: '0' }));

      stats.push({
        title: 'Total AUM',
        value: formatCompactCurrency(toMoney(aum?.currentValue), currency),
        subtitle: `${fundCount?.activeFunds || 0} fund${parseInt(fundCount?.activeFunds || '0') !== 1 ? 's' : ''} · ${aum?.activeAccounts || 0} accounts`,
        icon: 'DollarSign',
        color: 'green',
      });
    } catch (e) { this.logger.warn(`AUM stat failed: ${(e as Error).message}`); }

    try {
      // 2. Total Investors (investors only, NOT investees) — cast enum to text before comparison
      const investors = await this.tenantPrisma.queryOne<{ total: string; individual: string; corporate: string }>(
        `SELECT
           COUNT(*) AS total,
           COUNT(CASE WHEN "investorType"::text = 'INDIVIDUAL' THEN 1 END) AS individual,
           COUNT(CASE WHEN "investorType"::text = 'CORPORATE'  THEN 1 END) AS corporate
         FROM fm_investors
         WHERE "companyId" = $1 AND "deletedAt" IS NULL AND "isActive" = true
           AND ("customerRole" IS NULL OR "customerRole" != 'investee')`,
        [companyId],
      ).catch(() => ({ total: '0', individual: '0', corporate: '0' }));

      // Total investees (separate)
      const investees = await this.tenantPrisma.queryOne<{ total: string }>(
        `SELECT COUNT(*) AS total FROM fm_investors
         WHERE "companyId" = $1 AND "deletedAt" IS NULL AND "isActive" = true AND "customerRole" = 'investee'`,
        [companyId],
      ).catch(() => ({ total: '0' }));

      stats.push({
        title: 'Total Investors',
        value: investors?.total || '0',
        subtitle: `${investors?.individual || 0} individual · ${investors?.corporate || 0} corporate`,
        icon: 'Users',
        color: 'blue',
      });

      stats.push({
        title: 'Total Investees',
        value: investees?.total || '0',
        subtitle: 'Active credit facility recipients',
        icon: 'Users',
        color: 'indigo',
      });
    } catch (e) { this.logger.warn(`Investor stat failed: ${(e as Error).message}`); }

    try {
      // 3. Net Subscriptions (this month) — subscriptions minus redemptions
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const subs = await this.tenantPrisma.queryOne<{ amount: string; count: string }>(
        `SELECT COALESCE(SUM(amount), 0) as amount, COUNT(*) as count
         FROM fm_subscriptions
         WHERE "companyId" = $1 AND status::text = 'SETTLED'
         AND "subscriptionDate" >= $2 AND "deletedAt" IS NULL`,
        [companyId, startOfMonth],
      ).catch(() => ({ amount: '0', count: '0' }));

      const redemptions = await this.tenantPrisma.queryOne<{ amount: string; count: string }>(
        `SELECT COALESCE(SUM("grossAmount"), 0) as amount, COUNT(*) as count
         FROM fm_redemptions
         WHERE "companyId" = $1 AND status::text IN ('SETTLED', 'PAID')
         AND "redemptionDate" >= $2 AND "deletedAt" IS NULL`,
        [companyId, startOfMonth],
      ).catch(() => ({ amount: '0', count: '0' }));

      const netFlow = toMoney(subs?.amount) - toMoney(redemptions?.amount);
      const isPositive = netFlow >= 0;

      stats.push({
        title: 'Net Flow (Month)',
        value: formatCompactCurrency(Math.abs(netFlow), currency),
        subtitle: `${subs?.count || 0} subs, ${redemptions?.count || 0} redemptions`,
        icon: 'TrendingUp',
        color: isPositive ? 'green' : 'red',
        trend: {
          value: Math.abs(netFlow),
          direction: isPositive ? 'up' : 'down',
          label: isPositive ? 'Net inflow' : 'Net outflow',
        },
      });
    } catch (e) { this.logger.warn(`Net flow stat failed: ${(e as Error).message}`); }

    try {
      // 4. Latest NAV (any status) — falls back to most recent calculation if none published
      const nav = await this.tenantPrisma.queryOne<{ totalNav: string; navDate: string; fundName: string; navPerUnit: string; status: string }>(
        `SELECT nc."totalNav", nc."navDate", f.name as "fundName", nc."navPerUnit", nc.status
         FROM fm_nav_calculations nc
         JOIN fm_funds f ON f.id = nc."fundId"
         WHERE nc."companyId" = $1
         ORDER BY nc."navDate" DESC, nc."createdAt" DESC LIMIT 1`,
        [companyId],
      ).catch(() => null);

      if (nav) {
        stats.push({
          title: 'Latest NAV',
          value: formatCompactCurrency(toMoney(nav.totalNav), currency),
          subtitle: `${nav.fundName} — ${new Date(nav.navDate).toLocaleDateString()} (${nav.status})`,
          icon: 'FileText',
          color: 'purple',
        });
      } else {
        // Show total invested as a proxy when no NAV exists
        const invested = await this.tenantPrisma.queryOne<{ totalInvested: string }>(
          `SELECT COALESCE(SUM("totalInvested"), 0) AS "totalInvested" FROM fm_investor_accounts WHERE "companyId" = $1`,
          [companyId],
        ).catch(() => ({ totalInvested: '0' }));
        stats.push({
          title: 'Total Invested',
          value: formatCompactCurrency(toMoney(invested?.totalInvested), currency),
          subtitle: 'No NAV published yet',
          icon: 'FileText',
          color: 'purple',
        });
      }
    } catch (e) { this.logger.warn(`NAV stat failed: ${(e as Error).message}`); }

    return stats;
  }

  /**
   * Fund operational stats (row 2)
   */
  private async getFmOperationalStats(companyId: number, currency: string): Promise<DashboardStat[]> {
    const stats: DashboardStat[] = [];

    try {
      // 1. Pending Subscriptions
      const pendingSubs = await this.tenantPrisma.queryOne<{ count: string; amount: string }>(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
         FROM fm_subscriptions
         WHERE "companyId" = $1 AND status::text = 'PENDING' AND "deletedAt" IS NULL`,
        [companyId],
      ).catch(() => ({ count: '0', amount: '0' }));

      const pendingSubCount = parseInt(pendingSubs?.count || '0', 10);
      stats.push({
        title: 'Pending Subscriptions',
        value: pendingSubCount.toString(),
        subtitle: formatCompactCurrency(toMoney(pendingSubs?.amount), currency),
        icon: 'Clock',
        color: 'amber',
        badge: pendingSubCount > 0 ? { label: 'Action needed', variant: 'warning' } : undefined,
      });
    } catch (e) { this.logger.warn(`Pending subs stat failed: ${(e as Error).message}`); }

    try {
      // 2. Pending Redemptions
      const pendingRedemptions = await this.tenantPrisma.queryOne<{ count: string; amount: string }>(
        `SELECT COUNT(*) as count, COALESCE(SUM("grossAmount"), 0) as amount
         FROM fm_redemptions
         WHERE "companyId" = $1 AND status::text = 'PENDING' AND "deletedAt" IS NULL`,
        [companyId],
      ).catch(() => ({ count: '0', amount: '0' }));

      const pendingRedCount = parseInt(pendingRedemptions?.count || '0', 10);
      stats.push({
        title: 'Pending Redemptions',
        value: pendingRedCount.toString(),
        subtitle: formatCompactCurrency(toMoney(pendingRedemptions?.amount), currency),
        icon: 'Receipt',
        color: pendingRedCount > 0 ? 'orange' : 'green',
        badge: pendingRedCount > 0 ? { label: `${formatCompactCurrency(toMoney(pendingRedemptions?.amount), currency)}`, variant: 'warning' } : undefined,
      });
    } catch (e) { this.logger.warn(`Pending redemptions stat failed: ${(e as Error).message}`); }

    try {
      // 3. KYC Status
      const kyc = await this.tenantPrisma.queryOne<{ total: string; pending: string; expired: string }>(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN "kycStatus" = 'PENDING' THEN 1 END) as pending,
           COUNT(CASE WHEN "kycStatus" = 'EXPIRED' THEN 1 END) as expired
         FROM fm_investors
         WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
        [companyId],
      ).catch(() => ({ total: '0', pending: '0', expired: '0' }));

      const kycPending = parseInt(kyc?.pending || '0', 10);
      const kycExpired = parseInt(kyc?.expired || '0', 10);
      const kycIssues = kycPending + kycExpired;

      stats.push({
        title: 'KYC Compliance',
        value: kycIssues === 0 ? 'All Clear' : `${kycIssues} issues`,
        subtitle: kycIssues > 0 ? `${kycPending} pending, ${kycExpired} expired` : `${kyc?.total || 0} investors verified`,
        icon: 'CheckCircle',
        color: kycIssues === 0 ? 'green' : 'red',
        badge: kycIssues > 0 ? { label: 'Review', variant: 'danger', pulse: true } : undefined,
      });
    } catch (e) { this.logger.warn(`KYC stat failed: ${(e as Error).message}`); }

    try {
      // 3b. Active Credit Facilities (investee financing)
      const facilities = await this.tenantPrisma.queryOne<{ active: string; total: string; outstanding: string; profitAccrued: string }>(
        `SELECT
           COUNT(CASE WHEN status::text = 'active' THEN 1 END)            AS active,
           COUNT(*)                                                         AS total,
           COALESCE(SUM("outstandingBalance"), 0)                          AS outstanding,
           COALESCE(SUM("profitAmount"), 0)                                AS "profitAccrued"
         FROM fm_credit_facilities
         WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
        [companyId],
      ).catch(() => ({ active: '0', total: '0', outstanding: '0', profitAccrued: '0' }));

      const activeCount = parseInt(facilities?.active || '0', 10);
      stats.push({
        title: 'Active Facilities',
        value: activeCount.toString(),
        subtitle: `₦${formatCompactCurrency(toMoney(facilities?.outstanding), currency)} outstanding`,
        icon: 'FileText',
        color: activeCount > 0 ? 'amber' : 'green',
      });
    } catch (e) { this.logger.warn(`Facilities stat failed: ${(e as Error).message}`); }

    try {
      // 4. Profit Accrued (YTD from credit schedule JEs)
      const startOfYear = `${new Date().getFullYear()}-01-01`;
      const profit = await this.tenantPrisma.queryOne<{ accrued: string; count: string }>(
        `SELECT
           COALESCE(SUM(jel.credit), 0) AS accrued,
           COUNT(DISTINCT je.id)        AS count
         FROM journal_entry_line_items jel
         JOIN journal_entries je ON je.id = jel."journalEntryId"
         JOIN ifrs_accounts a ON a.id = jel."accountId"
         WHERE je."companyId" = $1
           AND je."sourceType" = 'credit_schedule'
           AND je.status = 'posted'
           AND je."deletedAt" IS NULL
           AND je."entryDate" >= $2
           AND a."accountType" = 'revenue'`,
        [companyId, startOfYear],
      ).catch(() => ({ accrued: '0', count: '0' }));

      stats.push({
        title: 'Profit Accrued (YTD)',
        value: formatCompactCurrency(toMoney(profit?.accrued), currency),
        subtitle: `${profit?.count || 0} accrual entries`,
        icon: 'TrendingUp',
        color: 'green',
      });
    } catch (e) { this.logger.warn(`Profit accrued stat failed: ${(e as Error).message}`); }

    return stats;
  }

  /**
   * Recent fund management activities
   */
  private async getFmRecentActivities(companyId: number, currency: string): Promise<DashboardActivity[]> {
    const activities: (DashboardActivity & { _ts: Date })[] = [];

    try {
      // Recent subscriptions
      const subs = await this.tenantPrisma.query(
        `SELECT s.id, s.amount, s.status, s."subscriptionDate", s."createdAt",
                ia.code as "accountCode", i."firstName", i."lastName"
         FROM fm_subscriptions s
         LEFT JOIN fm_investor_accounts ia ON ia.id = s."investorAccountId"
         LEFT JOIN fm_investors i ON i.id = ia."investorId"
         WHERE s."companyId" = $1 AND s."deletedAt" IS NULL
         ORDER BY s."createdAt" DESC LIMIT 4`,
        [companyId],
      ).catch(() => []);

      for (const sub of subs) {
        const investorName = [sub.firstName, sub.lastName].filter(Boolean).join(' ') || sub.accountCode || 'Unknown';
        activities.push({
          id: sub.id, type: 'payment',
          title: `Subscription — ${investorName}`,
          description: `Status: ${sub.status}`,
          time: formatTimeAgo(new Date(sub.createdAt)),
          amount: formatCompactCurrency(toMoney(sub.amount), currency),
          _ts: new Date(sub.createdAt),
        });
      }

      // Recent redemptions
      const reds = await this.tenantPrisma.query(
        `SELECT r.id, r."grossAmount", r.status, r."createdAt",
                ia.code as "accountCode", i."firstName", i."lastName"
         FROM fm_redemptions r
         LEFT JOIN fm_investor_accounts ia ON ia.id = r."investorAccountId"
         LEFT JOIN fm_investors i ON i.id = ia."investorId"
         WHERE r."companyId" = $1 AND r."deletedAt" IS NULL
         ORDER BY r."createdAt" DESC LIMIT 3`,
        [companyId],
      ).catch(() => []);

      for (const red of reds) {
        const investorName = [red.firstName, red.lastName].filter(Boolean).join(' ') || red.accountCode || 'Unknown';
        activities.push({
          id: red.id, type: 'sale',
          title: `Redemption — ${investorName}`,
          description: `Status: ${red.status}`,
          time: formatTimeAgo(new Date(red.createdAt)),
          amount: formatCompactCurrency(toMoney(red.grossAmount), currency),
          _ts: new Date(red.createdAt),
        });
      }

      // Recent NAV calculations
      const navs = await this.tenantPrisma.query(
        `SELECT nc.id, nc."totalNav", nc."navPerUnit", nc.status, nc."navDate", nc."createdAt",
                f.name as "fundName"
         FROM fm_nav_calculations nc
         JOIN fm_funds f ON f.id = nc."fundId"
         WHERE nc."companyId" = $1
         ORDER BY nc."createdAt" DESC LIMIT 3`,
        [companyId],
      ).catch(() => []);

      for (const nav of navs) {
        activities.push({
          id: nav.id, type: 'inventory',
          title: `NAV — ${nav.fundName}`,
          description: `${nav.status} — ${new Date(nav.navDate).toLocaleDateString()}`,
          time: formatTimeAgo(new Date(nav.createdAt)),
          amount: formatCompactCurrency(toMoney(nav.totalNav), currency),
          _ts: new Date(nav.createdAt),
        });
      }

      // Recent trades
      const trades = await this.tenantPrisma.query(
        `SELECT t.id, t."tradeType", t.quantity, t.amount, t.status, t."createdAt",
                s.name as "securityName"
         FROM fm_trades t
         LEFT JOIN fm_securities s ON s.id = t."securityId"
         WHERE t."companyId" = $1 AND t."deletedAt" IS NULL
         ORDER BY t."createdAt" DESC LIMIT 3`,
        [companyId],
      ).catch(() => []);

      for (const trade of trades) {
        activities.push({
          id: trade.id, type: 'purchase',
          title: `${trade.tradeType} — ${trade.securityName || 'Unknown'}`,
          description: `Qty: ${Number(trade.quantity).toLocaleString()} — ${trade.status}`,
          time: formatTimeAgo(new Date(trade.createdAt)),
          amount: formatCompactCurrency(toMoney(trade.amount), currency),
          _ts: new Date(trade.createdAt),
        });
      }

      // Recent credit facility repayments
      const repayments = await this.tenantPrisma.query(
        `SELECT cr.id, cr."repaymentDate", cr.amount, cr."balanceAfter", cr."createdAt",
                i."firstName", i."lastName", i."companyName", cf."facilityNumber"
         FROM fm_credit_repayments cr
         LEFT JOIN fm_credit_facilities cf ON cf.id = cr."facilityId"
         LEFT JOIN fm_investors i ON i.id = cf."investorId"
         WHERE cr."companyId" = $1
         ORDER BY cr."createdAt" DESC LIMIT 3`,
        [companyId],
      ).catch(() => []);

      for (const rep of repayments) {
        const investeeName = rep.companyName || [rep.firstName, rep.lastName].filter(Boolean).join(' ') || rep.facilityNumber || 'Unknown';
        activities.push({
          id: rep.id, type: 'payment',
          title: `Repayment — ${investeeName}`,
          description: `${rep.facilityNumber || ''} · Bal: ${formatCompactCurrency(toMoney(rep.balanceAfter), currency)}`,
          time: formatTimeAgo(new Date(rep.createdAt)),
          amount: formatCompactCurrency(toMoney(rep.amount), currency),
          _ts: new Date(rep.createdAt),
        });
      }

      activities.sort((a, b) => b._ts.getTime() - a._ts.getTime());
    } catch (error) {
      this.logger.warn(`FM activities failed: ${error.message}`);
    }

    return activities.slice(0, 10);
  }

  /**
   * Fund management alerts
   */
  private async getFmAlerts(companyId: number, currency = 'NGN'): Promise<DashboardAlert[]> {
    const alerts: DashboardAlert[] = [];

    try {
      // KYC expiring/pending
      const kycIssues = await this.tenantPrisma.queryOne<{ pending: string; expired: string }>(
        `SELECT
           COUNT(CASE WHEN "kycStatus" = 'PENDING' THEN 1 END) as pending,
           COUNT(CASE WHEN "kycStatus" = 'EXPIRED' THEN 1 END) as expired
         FROM fm_investors
         WHERE "companyId" = $1 AND "deletedAt" IS NULL`,
        [companyId],
      ).catch(() => ({ pending: '0', expired: '0' }));

      const kycPending = parseInt(kycIssues?.pending || '0', 10);
      const kycExpired = parseInt(kycIssues?.expired || '0', 10);
      if (kycExpired > 0) {
        alerts.push({
          id: 1, type: 'danger',
          title: 'KYC Expired',
          message: `${kycExpired} investor${kycExpired > 1 ? 's have' : ' has'} expired KYC documentation`,
          action: 'Review Investors',
          actionUrl: '/fund-management/investors',
        });
      }
      if (kycPending > 0) {
        alerts.push({
          id: 2, type: 'warning',
          title: 'KYC Pending Review',
          message: `${kycPending} investor${kycPending > 1 ? 's are' : ' is'} awaiting KYC verification`,
          action: 'Review KYC',
          actionUrl: '/fund-management/investors',
        });
      }

      // Credit facility outstanding
      const creditOutstanding = await this.tenantPrisma.queryOne<{ count: string; outstanding: string }>(
        `SELECT COUNT(*) as count, COALESCE(SUM("outstandingBalance"), 0) AS outstanding
         FROM fm_credit_facilities
         WHERE "companyId" = $1 AND UPPER(status) IN ('ACTIVE', 'DISBURSED')`,
        [companyId],
      ).catch(() => ({ count: '0', outstanding: '0' }));

      const activeFacilityCount = parseInt(creditOutstanding?.count || '0', 10);
      if (activeFacilityCount > 0) {
        alerts.push({
          id: 6, type: 'info',
          title: 'Active Credit Facilities',
          message: `${activeFacilityCount} facilit${activeFacilityCount > 1 ? 'ies' : 'y'} outstanding — ${formatCompactCurrency(toMoney(creditOutstanding?.outstanding), currency)}`,
          action: 'View Facilities',
          actionUrl: '/fund-management/credit-facilities',
        });
      }

      // Pending redemptions
      const pendingReds = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM fm_redemptions
         WHERE "companyId" = $1 AND UPPER(status) = 'PENDING' AND "deletedAt" IS NULL`,
        [companyId],
      ).catch(() => ({ count: '0' }));

      const pendingRedCount = parseInt(pendingReds?.count || '0', 10);
      if (pendingRedCount > 0) {
        alerts.push({
          id: 3, type: 'warning',
          title: 'Pending Redemptions',
          message: `${pendingRedCount} redemption${pendingRedCount > 1 ? 's require' : ' requires'} processing`,
          action: 'Process Redemptions',
          actionUrl: '/fund-management/redemptions',
        });
      }

      // Compliance breaches
      const breaches = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM fm_compliance_checks
         WHERE "companyId" = $1 AND result = 'FAIL'
         AND "checkDate" >= NOW() - INTERVAL '30 days'`,
        [companyId],
      ).catch(() => ({ count: '0' }));

      const breachCount = parseInt(breaches?.count || '0', 10);
      if (breachCount > 0) {
        alerts.push({
          id: 4, type: 'danger',
          title: 'Compliance Breaches',
          message: `${breachCount} compliance breach${breachCount > 1 ? 'es' : ''} in the last 30 days`,
          action: 'Review Compliance',
          actionUrl: '/fund-management/compliance',
        });
      }

      // Draft NAV calculations
      const draftNavs = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM fm_nav_calculations
         WHERE "companyId" = $1 AND status = 'draft'`,
        [companyId],
      ).catch(() => ({ count: '0' }));

      const draftNavCount = parseInt(draftNavs?.count || '0', 10);
      if (draftNavCount > 0) {
        alerts.push({
          id: 5, type: 'info',
          title: 'Draft NAV Calculations',
          message: `${draftNavCount} NAV calculation${draftNavCount > 1 ? 's need' : ' needs'} verification and publishing`,
          action: 'Review NAV',
          actionUrl: '/fund-management/nav',
        });
      }

    } catch (error) {
      this.logger.warn(`FM alerts failed: ${error.message}`);
    }

    if (alerts.length === 0) {
      alerts.push({
        id: 0, type: 'success',
        title: 'All Systems Operational',
        message: 'No critical fund management alerts at this time',
      });
    }

    return alerts.slice(0, 5);
  }

  /**
   * Fund compliance summary
   */
  private async getFmComplianceSummary(companyId: number): Promise<FundManagementDashboardResponse['complianceSummary']> {
    try {
      const rules = await this.tenantPrisma.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM fm_compliance_rules
         WHERE "companyId" = $1 AND "isActive" = true`,
        [companyId],
      ).catch(() => ({ count: '0' }));

      const checks = await this.tenantPrisma.queryOne<{ total: string; passed: string; failed: string }>(
        `SELECT
           COUNT(*) as total,
           COUNT(CASE WHEN result = 'PASS' THEN 1 END) as passed,
           COUNT(CASE WHEN result = 'FAIL' THEN 1 END) as failed
         FROM fm_compliance_checks
         WHERE "companyId" = $1 AND "checkDate" >= NOW() - INTERVAL '90 days'`,
        [companyId],
      ).catch(() => ({ total: '0', passed: '0', failed: '0' }));

      return {
        totalRules: parseInt(rules?.count || '0', 10),
        passedChecks: parseInt(checks?.passed || '0', 10),
        failedChecks: parseInt(checks?.failed || '0', 10),
        breachCount: parseInt(checks?.failed || '0', 10),
      };
    } catch (error) {
      this.logger.warn(`Compliance summary failed: ${error.message}`);
      return { totalRules: 0, passedChecks: 0, failedChecks: 0, breachCount: 0 };
    }
  }

  /**
   * Cash position: bank balances vs AUM with 5% Sharia compliance threshold
   */
  private async getFmCashPosition(companyId: number, _currency: string): Promise<FmCashPosition> {
    const CASH_AUM_LIMIT_PCT = 5;

    try {
      // AUM from investor accounts
      const aumRow = await this.tenantPrisma.queryOne<{ aum: string }>(
        `SELECT COALESCE(SUM("currentValue"), 0) AS aum FROM fm_investor_accounts WHERE "companyId" = $1`,
        [companyId],
      ).catch(() => ({ aum: '0' }));
      const aum = toMoney(aumRow?.aum);

      // Bank balances via banks table → linked GL accounts (net debit balance)
      const bankRows = await this.tenantPrisma.query<{ name: string; glCode: string; balance: string }>(
        `SELECT
           b.name,
           a.code AS "glCode",
           COALESCE(SUM(jel.debit - jel.credit), 0) AS balance
         FROM banks b
         JOIN ifrs_accounts a ON a.id = b."glAccountId"
         LEFT JOIN journal_entry_line_items jel ON jel."accountId" = a.id
         LEFT JOIN journal_entries je ON je.id = jel."journalEntryId"
           AND je."companyId" = $1
           AND je.status = 'posted'
           AND je."deletedAt" IS NULL
         WHERE b."companyId" = $1 AND b."deletedAt" IS NULL AND a."deletedAt" IS NULL
         GROUP BY b.name, a.code
         ORDER BY balance DESC`,
        [companyId],
      ).catch(() => []);

      const banks: FmCashPositionBank[] = bankRows
        .map(r => ({ name: r.name, glCode: r.glCode, balance: toMoney(r.balance) }))
        .filter(b => b.balance > 0);

      const totalBankBalance = banks.reduce((s, b) => s + b.balance, 0);

      // Investee outstanding balances (active credit facilities)
      const investeeRow = await this.tenantPrisma.queryOne<{ outstanding: string }>(
        `SELECT COALESCE(SUM("outstandingBalance"), 0) AS outstanding
         FROM fm_credit_facilities
         WHERE "companyId" = $1 AND status::text = 'active' AND "deletedAt" IS NULL`,
        [companyId],
      ).catch(() => ({ outstanding: '0' }));
      const investeeOutstanding = toMoney(investeeRow?.outstanding);

      const cashToAumPct = aum > 0 ? (totalBankBalance / aum) * 100 : 0;
      const cashBreached = cashToAumPct > CASH_AUM_LIMIT_PCT;

      return { totalBankBalance, investeeOutstanding, aum, cashToAumPct, cashBreached, banks };
    } catch (error) {
      this.logger.warn(`Cash position failed: ${(error as Error).message}`);
      return { totalBankBalance: 0, investeeOutstanding: 0, aum: 0, cashToAumPct: 0, cashBreached: false, banks: [] };
    }
  }
}
