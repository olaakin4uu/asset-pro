import { BadRequestException, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../services/tenant-prisma.service';

const logger = new Logger('GLAccountResolver');

// ============================================================================
// TYPES
// ============================================================================

export interface ResolvedAccount {
  id: number;
  code: string;
  name: string;
  accountType: string;
  categoryName: string | null;
  isPosting: boolean;
}

/**
 * Account role definitions.
 * Each role maps to a category name (primary) and accountType for resolution.
 * The resolver will: 1) check entity override, 2) check settings, 3) find by category.
 */
export interface AccountRole {
  /** Human-readable label for error messages */
  label: string;
  /** IFRS category names to search (in priority order) */
  categoryNames: string[];
  /** Expected accountType */
  accountType: string;
  /** Settings table and column to check as fallback */
  settingsSource?: { table: string; column: string };
}

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export const GL_ROLES: Record<string, AccountRole> = {
  accounts_receivable: {
    label: 'Accounts Receivable',
    categoryNames: ['Receivable'],
    accountType: 'asset',
    settingsSource: { table: 'company_settings', column: 'defaultAccountsReceivableAccountId' },
  },
  accounts_payable: {
    label: 'Accounts Payable',
    categoryNames: ['Payable'],
    accountType: 'liability',
  },
  sales_revenue: {
    label: 'Sales Revenue',
    categoryNames: ['Sales', 'Service Revenue', 'Income'],
    accountType: 'revenue',
    settingsSource: { table: 'company_settings', column: 'defaultSalesRevenueAccountId' },
  },
  fleet_hire_revenue: {
    label: 'Fleet Hire Revenue',
    categoryNames: ['Fleet Revenue', 'Service Revenue', 'Sales', 'Income'],
    accountType: 'revenue',
    settingsSource: { table: 'company_settings', column: 'defaultFleetRevenueAccountId' },
  },
  cost_of_goods_sold: {
    label: 'Cost of Goods Sold',
    categoryNames: ['Cost of Goods Sold', 'Direct Costs'],
    accountType: 'expense',
  },
  vat_output: {
    label: 'VAT Output',
    categoryNames: ['VAT Payable'],
    accountType: 'liability',
    settingsSource: { table: 'company_settings', column: 'defaultVatOutputAccountId' },
  },
  vat_output_holding: {
    label: 'VAT Output Holding (cash-basis deferred)',
    categoryNames: ['VAT Holding', 'VAT Payable'],
    accountType: 'liability',
    settingsSource: { table: 'sales_settings', column: 'vatOutputHoldingAccountId' },
  },
  vat_input: {
    label: 'VAT Input',
    categoryNames: ['VAT Recoverable', 'Current Assets'],
    accountType: 'asset',
  },
  wht_receivable: {
    label: 'WHT Receivable',
    categoryNames: ['WHT Payable'],
    accountType: 'asset',
  },
  wht_payable: {
    label: 'WHT Payable',
    categoryNames: ['WHT Payable'],
    accountType: 'liability',
  },
  wht_provision: {
    label: 'WHT Provision',
    categoryNames: ['WHT Payable', 'Current Liabilities'],
    accountType: 'liability',
  },
  inventory: {
    // Generic inventory role — used by batch imports and auto-posters that
    // don't care whether stock is raw/WIP/FG, they just need "an inventory
    // asset account". Resolves to the first account in the 'Inventory'
    // category. Callers that DO care about sub-type should use the
    // specific role (inventory_raw_material / _wip / _finished_goods).
    label: 'Inventory',
    categoryNames: ['Inventory'],
    accountType: 'asset',
  },
  inventory_raw_material: {
    label: 'Inventory - Raw Materials',
    categoryNames: ['Inventory'],
    accountType: 'asset',
  },
  inventory_finished_goods: {
    label: 'Inventory - Finished Goods',
    categoryNames: ['Inventory'],
    accountType: 'asset',
  },
  inventory_wip: {
    label: 'Inventory - Work in Progress',
    categoryNames: ['Inventory'],
    accountType: 'asset',
  },
  goods_in_transit: {
    label: 'Goods in Transit',
    categoryNames: ['Inventory', 'Current Assets'],
    accountType: 'asset',
  },
  cash: {
    label: 'Cash',
    categoryNames: ['Cash'],
    accountType: 'asset',
    settingsSource: { table: 'company_settings', column: 'defaultCashAccountId' },
  },
  bank: {
    label: 'Bank',
    categoryNames: ['Bank'],
    accountType: 'asset',
    settingsSource: { table: 'company_settings', column: 'defaultBankAccountId' },
  },
  customer_deposits: {
    label: 'Customer Deposits',
    categoryNames: ['Current Liabilities', 'Payable'],
    accountType: 'liability',
    settingsSource: { table: 'company_settings', column: 'defaultCustomerDepositsAccountId' },
  },
  discount_allowed: {
    label: 'Discount Allowed',
    categoryNames: ['Sales Discount', 'Operating Expenses', 'Expenses'],
    accountType: 'expense',
    settingsSource: { table: 'company_settings', column: 'defaultDiscountAllowedAccountId' },
  },
  transportation_income: {
    label: 'Transportation Income',
    categoryNames: ['Transportation Income', 'Service Revenue', 'Income', 'Sales'],
    accountType: 'revenue',
    settingsSource: { table: 'company_settings', column: 'defaultTransportationIncomeAccountId' },
  },
  bank_charges: {
    label: 'Bank Charges',
    categoryNames: ['Administrative Expenses', 'Operating Expenses', 'Expenses'],
    accountType: 'expense',
  },
  forex_gain_loss: {
    label: 'Foreign Exchange Gain/Loss',
    categoryNames: ['Operating Expenses', 'Non-Operating Revenue', 'Expenses'],
    accountType: 'expense',
  },
  opening_balance: {
    label: 'Opening Balance Equity',
    categoryNames: ['Retained Earnings', 'Equity'],
    accountType: 'equity',
  },
  accrued_payroll: {
    label: 'Accrued Payroll',
    categoryNames: ['Current Liabilities', 'Payable'],
    accountType: 'liability',
  },
  grn_clearing: {
    label: 'GRN Clearing',
    categoryNames: ['GRN Clearing', 'Current Assets', 'Inventory'],
    accountType: 'asset',
  },

  // Credit Facility (Fund Management)
  credit_facility_receivable: {
    label: 'Credit Facility Receivable',
    categoryNames: ['Receivable', 'Current Assets'],
    accountType: 'asset',
  },
  deferred_profit: {
    label: 'Deferred Profit (Unearned)',
    categoryNames: ['Current Liabilities', 'Deferred Revenue'],
    accountType: 'liability',
  },
  credit_profit_income: {
    label: 'Credit Facility Profit Income (Manager)',
    categoryNames: ['Income', 'Service Revenue', 'Revenue'],
    accountType: 'revenue',
  },
  investor_profit_payable: {
    label: 'Investor Profit Payable',
    categoryNames: ['Current Liabilities', 'Payable'],
    accountType: 'liability',
  },
  murabaha_inventory_asset: {
    label: 'Murabaha Inventory Asset',
    categoryNames: ['Murabaha Asset', 'Inventory', 'Current Assets'],
    accountType: 'asset',
  },
  murabaha_deferred_income: {
    label: 'Deferred Murabaha Income',
    categoryNames: ['Deferred Murabaha Income', 'Deferred Revenue', 'Current Liabilities'],
    accountType: 'liability',
  },
  // Real Estate
  rental_revenue: {
    label: 'Rental Revenue',
    categoryNames: ['Rental Revenue', 'Rent Income', 'Service Revenue', 'Income'],
    accountType: 'revenue',
  },
  service_charge_revenue: {
    label: 'Service Charge Revenue',
    categoryNames: ['Service Charge Revenue', 'Service Revenue', 'Income'],
    accountType: 'revenue',
  },
  security_deposit_liability: {
    label: 'Security Deposit Liability',
    categoryNames: ['Security Deposits', 'Current Liabilities', 'Payable'],
    accountType: 'liability',
  },
  property_maintenance_expense: {
    label: 'Property Maintenance Expense',
    categoryNames: ['Maintenance Expense', 'Operating Expenses', 'Expenses'],
    accountType: 'expense',
  },
  property_expense: {
    label: 'Property Expense',
    categoryNames: ['Property Expenses', 'Operating Expenses', 'Expenses'],
    accountType: 'expense',
  },
};

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * Resolve a GL account by role.
 *
 * Priority:
 *   1. entityOverrideId (e.g. customer.accountsReceivableId, bank.glAccountId)
 *   2. Settings table column (company_settings.defaultXxxAccountId)
 *   3. Find by category name + accountType in ifrs_accounts (must be posting + active)
 *
 * Throws BadRequestException with a clear message if no account can be resolved.
 */
export async function resolveGlAccount(
  tenantPrisma: TenantPrismaService,
  companyId: number,
  role: string,
  entityOverrideId?: number | null,
): Promise<ResolvedAccount> {
  const roleDef = GL_ROLES[role];
  if (!roleDef) {
    throw new BadRequestException(`Unknown GL account role: "${role}"`);
  }

  // 1. Entity override
  if (entityOverrideId) {
    const account = await fetchAndValidateAccount(tenantPrisma, entityOverrideId, roleDef);
    if (account) return account;
    // If override ID is invalid, log warning and continue to fallbacks
    logger.warn(`Entity override account ID ${entityOverrideId} for role "${role}" is invalid, trying fallbacks`);
  }

  // 2. Settings table
  if (roleDef.settingsSource) {
    const { table, column } = roleDef.settingsSource;
    const row = await tenantPrisma.queryOne<Record<string, unknown>>(
      `SELECT "${column}" FROM ${table} WHERE "companyId" = $1`,
      [companyId],
    );
    const settingsId = row?.[column] as number | null;
    if (settingsId) {
      const account = await fetchAndValidateAccount(tenantPrisma, settingsId, roleDef);
      if (account) return account;
      logger.warn(`Settings ${table}.${column} = ${settingsId} for role "${role}" is invalid, trying category lookup`);
    }
  }

  // 3. Find by category + accountType
  for (const categoryName of roleDef.categoryNames) {
    const account = await tenantPrisma.queryOne<ResolvedAccount>(
      `SELECT a.id, a.code, a.name, a."accountType", c.name as "categoryName", a."isPosting"
       FROM ifrs_accounts a
       JOIN ifrs_categories c ON c.id = a."categoryId"
       WHERE a."companyId" = $1
         AND c.name = $2
         AND a."accountType" = $3
         AND a."isPosting" = true
         AND a."isActive" = true
         AND a."deletedAt" IS NULL
       ORDER BY a.code ASC
       LIMIT 1`,
      [companyId, categoryName, roleDef.accountType],
    );
    if (account) {
      logger.debug(`Resolved role "${role}" via category "${categoryName}" → ${account.code} ${account.name}`);
      return account;
    }
  }

  // 4. Broader search: find by accountType only if category search failed
  const anyByType = await tenantPrisma.queryOne<ResolvedAccount>(
    `SELECT a.id, a.code, a.name, a."accountType", c.name as "categoryName", a."isPosting"
     FROM ifrs_accounts a
     LEFT JOIN ifrs_categories c ON c.id = a."categoryId"
     WHERE a."companyId" = $1
       AND a."accountType" = $2
       AND a."isPosting" = true
       AND a."isActive" = true
       AND a."deletedAt" IS NULL
       AND LOWER(a.name) LIKE $3
     ORDER BY a.code ASC
     LIMIT 1`,
    [companyId, roleDef.accountType, `%${roleDef.label.toLowerCase().split(' ')[0]}%`],
  );
  if (anyByType) {
    logger.warn(`Resolved role "${role}" via name match → ${anyByType.code} ${anyByType.name} (no exact category match found)`);
    return anyByType;
  }

  // Nothing found — fail with actionable error
  throw new BadRequestException(
    `No GL account found for "${roleDef.label}". ` +
    `Create a posting-level account in category "${roleDef.categoryNames[0]}" (type: ${roleDef.accountType}), ` +
    `or configure it in company settings.`,
  );
}

/**
 * Resolve a GL account, returning null instead of throwing if not found.
 * Use this for optional GL accounts (e.g. VAT when tax amount is 0).
 */
export async function resolveGlAccountOptional(
  tenantPrisma: TenantPrismaService,
  companyId: number,
  role: string,
  entityOverrideId?: number | null,
): Promise<ResolvedAccount | null> {
  try {
    return await resolveGlAccount(tenantPrisma, companyId, role, entityOverrideId);
  } catch {
    return null;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function fetchAndValidateAccount(
  tenantPrisma: TenantPrismaService,
  accountId: number,
  roleDef: AccountRole,
): Promise<ResolvedAccount | null> {
  const account = await tenantPrisma.queryOne<ResolvedAccount>(
    `SELECT a.id, a.code, a.name, a."accountType", c.name as "categoryName", a."isPosting"
     FROM ifrs_accounts a
     LEFT JOIN ifrs_categories c ON c.id = a."categoryId"
     WHERE a.id = $1 AND a."isActive" = true AND a."deletedAt" IS NULL`,
    [accountId],
  );

  if (!account) return null;

  if (!account.isPosting) {
    logger.warn(`Account ${account.code} "${account.name}" (id=${accountId}) is not a posting account for role "${roleDef.label}"`);
    return null;
  }

  // Type mismatch is a warning, not a hard fail — entity overrides may intentionally use different types
  if (account.accountType !== roleDef.accountType) {
    logger.warn(
      `Account ${account.code} "${account.name}" has type "${account.accountType}" but role "${roleDef.label}" expects "${roleDef.accountType}"`,
    );
  }

  return account;
}

/**
 * Find a specific account by category name. Used for inventory sub-accounts
 * where the role system alone isn't specific enough (e.g. "Raw Material" vs "Finished Goods"
 * are both in Inventory category).
 */
export async function findAccountByNameAndCategory(
  tenantPrisma: TenantPrismaService,
  companyId: number,
  namePatterns: string[],
  categoryNames: string[],
  accountType: string,
  label: string,
): Promise<ResolvedAccount> {
  // Try name pattern match within category
  for (const categoryName of categoryNames) {
    for (const pattern of namePatterns) {
      const account = await tenantPrisma.queryOne<ResolvedAccount>(
        `SELECT a.id, a.code, a.name, a."accountType", c.name as "categoryName", a."isPosting"
         FROM ifrs_accounts a
         JOIN ifrs_categories c ON c.id = a."categoryId"
         WHERE a."companyId" = $1
           AND c.name = $2
           AND a."accountType" = $3
           AND LOWER(a.name) LIKE $4
           AND a."isPosting" = true
           AND a."isActive" = true
           AND a."deletedAt" IS NULL
         ORDER BY a.code ASC
         LIMIT 1`,
        [companyId, categoryName, accountType, `%${pattern.toLowerCase()}%`],
      );
      if (account) return account;
    }
  }

  // Fall back to just category
  for (const categoryName of categoryNames) {
    const account = await tenantPrisma.queryOne<ResolvedAccount>(
      `SELECT a.id, a.code, a.name, a."accountType", c.name as "categoryName", a."isPosting"
       FROM ifrs_accounts a
       JOIN ifrs_categories c ON c.id = a."categoryId"
       WHERE a."companyId" = $1
         AND c.name = $2
         AND a."accountType" = $3
         AND a."isPosting" = true
         AND a."isActive" = true
         AND a."deletedAt" IS NULL
       ORDER BY a.code ASC
       LIMIT 1`,
      [companyId, categoryName, accountType],
    );
    if (account) return account;
  }

  throw new BadRequestException(
    `No GL account found for "${label}". ` +
    `Create a posting-level account in category "${categoryNames[0]}" (type: ${accountType}) ` +
    `with a name containing "${namePatterns[0]}".`,
  );
}
