import { BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../services/tenant-prisma.service';

const logger = new Logger('GLAccountValidator');

// ============================================================================
// TYPES
// ============================================================================

export interface GLValidationResult {
  valid: boolean;
  accounts: Record<string, number>;
  errors: string[];
}

export type TransactionType =
  | 'sales_invoice'
  | 'sales_delivery'
  | 'customer_receipt'
  | 'purchase_invoice'
  | 'import_purchase_invoice'
  | 'import_clearing'
  | 'import_grn'
  | 'grn_accrual'
  | 'supplier_payment'
  | 'import_payment'
  | 'bank_transfer'
  | 'expense_request'
  | 'stock_movement_receipt'
  | 'stock_movement_issue'
  | 'stock_adjustment';

export interface GLValidationContext {
  itemIds?: number[];
  supplierId?: number;
  customerId?: number;
  bankId?: number;
  destBankId?: number;
}

// ============================================================================
// TRANSACTION DEFINITIONS — what accounts each transaction needs
// ============================================================================

interface AccountRequirement {
  key: string;
  label: string;
  source: 'category' | 'supplier' | 'customer' | 'bank' | 'settings';
  /** For category source: the key in glAccountMappings */
  categoryKey?: string;
  /** For supplier/customer: the column name */
  entityColumn?: string;
  /** For bank: always glAccountId */
  /** For settings: the column in company_settings */
  settingsColumn?: string;
  /** Fallback settings column if primary source not found */
  fallbackSettingsColumn?: string;
  /** Is this per-item (needs one per itemId) or global (one for the whole transaction) */
  perItem?: boolean;
  /** Skip this requirement for items whose category inventoryType = 'Service' */
  skipForService?: boolean;
}

const TRANSACTION_REQUIREMENTS: Record<TransactionType, AccountRequirement[]> = {
  sales_invoice: [
    { key: 'ar', label: 'Accounts Receivable', source: 'customer', entityColumn: 'accountsReceivableId', fallbackSettingsColumn: 'defaultAccountsReceivableAccountId' },
    { key: 'revenue', label: 'Sales Revenue', source: 'category', categoryKey: 'revenue_gl_account_id', perItem: true, fallbackSettingsColumn: 'defaultSalesRevenueAccountId' },
    { key: 'cogs', label: 'Cost of Goods Sold', source: 'category', categoryKey: 'cogs_gl_account_id', perItem: true, skipForService: true },
    { key: 'inventory', label: 'Inventory', source: 'category', categoryKey: 'inventory_gl_account_id', perItem: true, skipForService: true },
  ],
  sales_delivery: [
    { key: 'cogs', label: 'Cost of Goods Sold', source: 'category', categoryKey: 'cogs_gl_account_id', perItem: true, skipForService: true },
    { key: 'inventory', label: 'Inventory', source: 'category', categoryKey: 'inventory_gl_account_id', perItem: true, skipForService: true },
  ],
  customer_receipt: [
    { key: 'bank', label: 'Bank GL Account', source: 'bank' },
    { key: 'ar', label: 'Accounts Receivable', source: 'customer', entityColumn: 'accountsReceivableId', fallbackSettingsColumn: 'defaultAccountsReceivableAccountId' },
  ],
  purchase_invoice: [
    { key: 'grn_clearing', label: 'GRN Clearing', source: 'category', categoryKey: 'grn_clearing_gl_account_id', perItem: true },
    { key: 'ap', label: 'Accounts Payable', source: 'supplier', entityColumn: 'accountsPayableId' },
  ],
  import_purchase_invoice: [
    { key: 'grn_clearing', label: 'GRN Clearing', source: 'category', categoryKey: 'grn_clearing_gl_account_id', perItem: true },
    { key: 'ap', label: 'Accounts Payable', source: 'supplier', entityColumn: 'accountsPayableId' },
  ],
  import_clearing: [
    { key: 'grn_clearing', label: 'GRN Clearing', source: 'category', categoryKey: 'grn_clearing_gl_account_id', perItem: true },
    { key: 'ap', label: 'Accounts Payable', source: 'supplier', entityColumn: 'accountsPayableId' },
  ],
  import_grn: [
    { key: 'inventory', label: 'Inventory', source: 'category', categoryKey: 'inventory_gl_account_id', perItem: true },
    { key: 'grn_clearing', label: 'GRN Clearing', source: 'category', categoryKey: 'grn_clearing_gl_account_id', perItem: true },
  ],
  grn_accrual: [
    { key: 'inventory', label: 'Inventory', source: 'category', categoryKey: 'inventory_gl_account_id', perItem: true },
    { key: 'grn_clearing', label: 'GRN Clearing', source: 'category', categoryKey: 'grn_clearing_gl_account_id', perItem: true },
  ],
  supplier_payment: [
    { key: 'ap', label: 'Accounts Payable', source: 'supplier', entityColumn: 'accountsPayableId' },
    { key: 'bank', label: 'Bank GL Account', source: 'bank' },
  ],
  import_payment: [
    { key: 'ap', label: 'Accounts Payable', source: 'supplier', entityColumn: 'accountsPayableId' },
    { key: 'bank', label: 'Bank GL Account', source: 'bank' },
  ],
  bank_transfer: [
    { key: 'sourceBank', label: 'Source Bank GL Account', source: 'bank' },
    { key: 'destBank', label: 'Destination Bank GL Account', source: 'bank' },
  ],
  expense_request: [
    { key: 'bank', label: 'Bank GL Account', source: 'bank' },
  ],
  stock_movement_receipt: [
    { key: 'inventory', label: 'Inventory', source: 'category', categoryKey: 'inventory_gl_account_id', perItem: true },
  ],
  stock_movement_issue: [
    { key: 'inventory', label: 'Inventory', source: 'category', categoryKey: 'inventory_gl_account_id', perItem: true },
    { key: 'cogs', label: 'Cost of Goods Sold', source: 'category', categoryKey: 'cogs_gl_account_id', perItem: true },
  ],
  stock_adjustment: [
    { key: 'inventory', label: 'Inventory', source: 'category', categoryKey: 'inventory_gl_account_id', perItem: true },
    { key: 'adjustment', label: 'Inventory Adjustments', source: 'category', categoryKey: 'inventory_adjustments_gl_account_id', perItem: true },
  ],
};

// ============================================================================
// VALIDATOR
// ============================================================================

/**
 * Validate that all required GL accounts are configured for a transaction.
 * Uses existing mappings: item category glAccountMappings, supplier/customer accounts,
 * bank glAccountId, company_settings defaults.
 *
 * @returns GLValidationResult with all resolved accounts or error messages
 * @throws BadRequestException with actionable error if throwOnError is true
 */
export async function validateGLAccounts(
  tenantPrisma: TenantPrismaService,
  companyId: number,
  transactionType: TransactionType,
  context: GLValidationContext,
  throwOnError = true,
): Promise<GLValidationResult> {
  const requirements = TRANSACTION_REQUIREMENTS[transactionType];
  if (!requirements) {
    throw new BadRequestException(`Unknown transaction type: ${transactionType}`);
  }

  const accounts: Record<string, number> = {};
  const errors: string[] = [];

  // Cache for item category lookups (avoid repeated queries)
  const itemCategoryCache: Record<number, { glAccountMappings: Record<string, number>; categoryDescription: string; itemName: string; isService: boolean }> = {};

  // Load item category data for all items at once
  if (context.itemIds?.length) {
    for (const itemId of context.itemIds) {
      const data = await tenantPrisma.queryOne<{
        glAccountMappings: Record<string, number> | string | null;
        categoryDescription: string | null;
        itemName: string | null;
        inventoryType: string | null;
      }>(
        `SELECT c."glAccountMappings", c."categoryDescription", c."inventoryType", i.name as "itemName"
         FROM inv_items i LEFT JOIN inv_item_categories c ON i."categoryId" = c.id
         WHERE i.id = $1`, [itemId],
      );
      const rawMappings = data?.glAccountMappings;
      const mappings: Record<string, number> = rawMappings
        ? (typeof rawMappings === 'string' ? JSON.parse(rawMappings) : rawMappings) as Record<string, number>
        : {};
      itemCategoryCache[itemId] = {
        glAccountMappings: mappings,
        categoryDescription: data?.categoryDescription || 'uncategorized',
        itemName: data?.itemName || `Item #${itemId}`,
        isService: data?.inventoryType === 'Service',
      };
    }
  }

  // Load company settings for fallbacks
  const settings = await tenantPrisma.queryOne<Record<string, unknown>>(
    `SELECT * FROM company_settings WHERE "companyId" = $1 LIMIT 1`, [companyId],
  );

  for (const req of requirements) {
    if (req.perItem && context.itemIds?.length) {
      // Per-item: resolve for each item
      for (const itemId of context.itemIds) {
        const cached = itemCategoryCache[itemId];
        if (!cached) {
          errors.push(`Item #${itemId}: not found`);
          continue;
        }

        // Service items don't carry stock — skip COGS and Inventory requirements
        if (req.skipForService && cached.isService) continue;

        let accountId: number | null = null;

        if (req.source === 'category' && req.categoryKey) {
          accountId = cached.glAccountMappings[req.categoryKey] || null;
        }

        // Fallback to company settings if available
        if (!accountId && req.fallbackSettingsColumn && settings) {
          accountId = (settings[req.fallbackSettingsColumn] as number) || null;
        }

        if (!accountId) {
          errors.push(
            `"${cached.itemName}" (category: ${cached.categoryDescription}) — missing "${req.label}" in GL Account Mappings`
          );
        } else {
          // Store per-item account: key_itemId
          accounts[`${req.key}_${itemId}`] = accountId;
          // Also store first one as default for backward compat
          if (!accounts[req.key]) accounts[req.key] = accountId;
        }
      }
    } else {
      // Global account — resolve from entity or settings
      let accountId: number | null = null;

      if (req.source === 'supplier' && context.supplierId) {
        const supplier = await tenantPrisma.queryOne<Record<string, unknown>>(
          `SELECT "${req.entityColumn}" FROM suppliers WHERE id = $1`, [context.supplierId],
        );
        accountId = (supplier?.[req.entityColumn!] as number) || null;
        if (!accountId && req.fallbackSettingsColumn && settings) {
          accountId = (settings[req.fallbackSettingsColumn] as number) || null;
        }
        if (!accountId) {
          // Try resolver as last resort
          try {
            const { resolveGlAccount } = require('./gl-account-resolver');
            const resolved = await resolveGlAccount(tenantPrisma, companyId, 'accounts_payable');
            accountId = resolved.id;
          } catch { /* no fallback */ }
        }
        if (!accountId) {
          errors.push(`Supplier: missing "${req.label}" — configure AP account on the supplier record or company settings`);
        }
      } else if (req.source === 'customer' && context.customerId) {
        const customer = await tenantPrisma.queryOne<Record<string, unknown>>(
          `SELECT "${req.entityColumn}" FROM customers WHERE id = $1`, [context.customerId],
        );
        accountId = (customer?.[req.entityColumn!] as number) || null;
        if (!accountId && req.fallbackSettingsColumn && settings) {
          accountId = (settings[req.fallbackSettingsColumn] as number) || null;
        }
        if (!accountId) {
          try {
            const { resolveGlAccount } = require('./gl-account-resolver');
            const resolved = await resolveGlAccount(tenantPrisma, companyId, 'accounts_receivable');
            accountId = resolved.id;
          } catch { /* no fallback */ }
        }
        if (!accountId) {
          errors.push(`Customer: missing "${req.label}" — configure AR account on the customer record or company settings`);
        }
      } else if (req.source === 'bank') {
        const bankId = req.key === 'destBank' ? context.destBankId : context.bankId;
        if (bankId) {
          const bank = await tenantPrisma.queryOne<{ glAccountId: number | null; name: string }>(
            `SELECT "glAccountId", name FROM banks WHERE id = $1`, [bankId],
          );
          accountId = bank?.glAccountId || null;
          if (!accountId) {
            errors.push(`Bank "${bank?.name || bankId}": missing GL Account — configure glAccountId on the bank record`);
          }
        } else {
          errors.push(`${req.label}: no bank selected`);
        }
      } else if (req.source === 'settings') {
        if (req.settingsColumn && settings) {
          accountId = (settings[req.settingsColumn] as number) || null;
        }
        if (!accountId) {
          errors.push(`Company settings: missing "${req.label}" — configure in Settings → Company`);
        }
      }

      if (accountId) {
        accounts[req.key] = accountId;
      }
    }
  }

  const valid = errors.length === 0;

  if (!valid) {
    const errorMsg = `GL account validation failed for ${transactionType}:\n\n${errors.join('\n')}\n\nConfigure the missing GL accounts before proceeding.`;
    logger.warn(errorMsg);

    if (throwOnError) {
      throw new BadRequestException(errorMsg);
    }
  }

  return { valid, accounts, errors };
}

/**
 * Get per-item accounts grouped by GL account ID for building journal entries.
 * Returns a map of accountId → total amount, ready for postToGL lines.
 */
export function groupByAccount(
  accounts: Record<string, number>,
  items: Array<{ itemId: number; amount: number }>,
  accountKey: string,
): Record<number, number> {
  const grouped: Record<number, number> = {};
  for (const item of items) {
    const acctId = accounts[`${accountKey}_${item.itemId}`] || accounts[accountKey];
    if (!acctId) continue;
    grouped[acctId] = (grouped[acctId] || 0) + item.amount;
  }
  return grouped;
}
