/**
 * Static index of all navigable pages for the command palette.
 * Built from the sidebar navigation structure.
 */

export interface SearchPage {
  title: string;
  href: string;
  module: string;
  keywords: string[];
  moduleSlug?: string;
}

export const searchPages: SearchPage[] = [
  // Main
  { title: 'Dashboard', href: '/dashboard', module: 'Main', keywords: ['home', 'overview'] },

  // AI
  { title: 'AI Assistant', href: '/ai', module: 'AI & Insights', keywords: ['chatbot', 'assistant', 'analyze'], moduleSlug: 'ai' },

  // HR & Payroll
  { title: 'HR & Payroll', href: '/hrpayroll', module: 'Human Resources', keywords: ['hr', 'employee', 'staff'], moduleSlug: 'hrpayroll' },
  { title: 'Employees', href: '/hrpayroll/employees', module: 'Human Resources', keywords: ['staff', 'people'], moduleSlug: 'hrpayroll' },
  { title: 'Payroll', href: '/hrpayroll/payroll', module: 'Human Resources', keywords: ['salary', 'wages', 'pay'], moduleSlug: 'hrpayroll' },
  { title: 'Leave Management', href: '/hrpayroll/leave', module: 'Human Resources', keywords: ['vacation', 'time off', 'absence'], moduleSlug: 'hrpayroll' },
  { title: 'Departments', href: '/hrpayroll/departments', module: 'Human Resources', keywords: ['division', 'team'], moduleSlug: 'hrpayroll' },
  { title: 'HR Settings', href: '/hrpayroll/settings', module: 'Human Resources', keywords: ['configuration'], moduleSlug: 'hrpayroll' },

  // Project Management
  { title: 'Project Management', href: '/project-management', module: 'Operations', keywords: ['projects', 'tasks'], moduleSlug: 'projectmanagement' },

  // Fleet Management
  { title: 'Fleet Management', href: '/fleet-management', module: 'Operations', keywords: ['vehicles', 'fleet', 'transport'], moduleSlug: 'fleet-management' },
  { title: 'Vehicles', href: '/fleet-management/vehicles', module: 'Operations', keywords: ['cars', 'trucks'], moduleSlug: 'fleet-management' },
  { title: 'Drivers', href: '/fleet-management/drivers', module: 'Operations', keywords: ['driver'], moduleSlug: 'fleet-management' },
  { title: 'Trips', href: '/fleet-management/trips', module: 'Operations', keywords: ['journey', 'travel'], moduleSlug: 'fleet-management' },
  { title: 'Fleet Reports', href: '/fleet-management/reports', module: 'Operations', keywords: ['analytics'], moduleSlug: 'fleet-management' },
  { title: 'Fleet Settings', href: '/fleet-management/settings', module: 'Operations', keywords: ['configuration'], moduleSlug: 'fleet-management' },
  { title: 'Fleet Service Types', href: '/fleet-management/service-types', module: 'Operations', keywords: ['charter', 'rental', 'haulage', 'pricing', 'rates'], moduleSlug: 'fleet-management' },

  // POS
  { title: 'Point of Sale', href: '/pos', module: 'Sales & Receivables', keywords: ['POS', 'register', 'checkout'], moduleSlug: 'pos' },

  // Sales
  { title: 'Sales', href: '/sales', module: 'Sales & Receivables', keywords: ['orders', 'revenue'], moduleSlug: 'sales' },
  { title: 'Sales Orders', href: '/sales/orders', module: 'Sales & Receivables', keywords: ['SO', 'order'], moduleSlug: 'sales' },
  { title: 'New Sales Order', href: '/sales/orders/create', module: 'Sales & Receivables', keywords: ['create', 'new'], moduleSlug: 'sales' },
  { title: 'Customers', href: '/sales/customers', module: 'Sales & Receivables', keywords: ['client', 'buyer'], moduleSlug: 'sales' },
  { title: 'New Customer', href: '/sales/customers/create', module: 'Sales & Receivables', keywords: ['create', 'add'], moduleSlug: 'sales' },
  { title: 'Loading Orders', href: '/sales/loading-orders', module: 'Sales & Receivables', keywords: ['dispatch', 'delivery'], moduleSlug: 'sales' },
  { title: 'Sales Invoices', href: '/sales/invoices', module: 'Sales & Receivables', keywords: ['billing', 'invoice'], moduleSlug: 'sales' },
  { title: 'Sales Deliveries', href: '/sales/deliveries', module: 'Sales & Receivables', keywords: ['shipping', 'dispatch'], moduleSlug: 'sales' },
  { title: 'Sales Reports', href: '/sales/reports', module: 'Sales & Receivables', keywords: ['analytics', 'revenue'], moduleSlug: 'sales' },
  { title: 'Sales Settings', href: '/sales/settings', module: 'Sales & Receivables', keywords: ['configuration'], moduleSlug: 'sales' },

  // Receivables
  { title: 'Receivables', href: '/receivables', module: 'Sales & Receivables', keywords: ['AR', 'accounts receivable'], moduleSlug: 'receivables' },

  // Purchases
  { title: 'Purchases', href: '/purchase', module: 'Purchases & Payables', keywords: ['procurement', 'buying'], moduleSlug: 'purchase' },
  { title: 'Purchase Orders', href: '/purchase/orders', module: 'Purchases & Payables', keywords: ['PO', 'procurement'], moduleSlug: 'purchase' },
  { title: 'New Purchase Order', href: '/purchase/orders/create', module: 'Purchases & Payables', keywords: ['create', 'new'], moduleSlug: 'purchase' },
  { title: 'Suppliers', href: '/purchase/suppliers', module: 'Purchases & Payables', keywords: ['vendor', 'supplier'], moduleSlug: 'purchase' },
  { title: 'New Supplier', href: '/purchase/suppliers/create', module: 'Purchases & Payables', keywords: ['create', 'add'], moduleSlug: 'purchase' },
  { title: 'Service Orders', href: '/purchase/service-orders', module: 'Purchases & Payables', keywords: ['service', 'work'], moduleSlug: 'purchase' },
  { title: 'Service Inspections', href: '/purchase/service-inspections', module: 'Purchases & Payables', keywords: ['QC', 'quality'], moduleSlug: 'purchase' },
  { title: 'Purchase Reports', href: '/purchase/reports', module: 'Purchases & Payables', keywords: ['analytics'], moduleSlug: 'purchase' },
  { title: 'Purchase Settings', href: '/purchase/settings', module: 'Purchases & Payables', keywords: ['configuration'], moduleSlug: 'purchase' },

  // Payables
  { title: 'Payables', href: '/payables', module: 'Purchases & Payables', keywords: ['AP', 'accounts payable'], moduleSlug: 'payables' },

  // Inventory
  { title: 'Inventory', href: '/inventory', module: 'Inventory & Production', keywords: ['stock', 'warehouse'], moduleSlug: 'inventory' },
  { title: 'Products', href: '/inventory/products', module: 'Inventory & Production', keywords: ['items', 'goods', 'SKU'], moduleSlug: 'inventory' },
  { title: 'New Product', href: '/inventory/products/create', module: 'Inventory & Production', keywords: ['create', 'add'], moduleSlug: 'inventory' },
  { title: 'Categories', href: '/inventory/categories', module: 'Inventory & Production', keywords: ['category', 'group'], moduleSlug: 'inventory' },
  { title: 'Warehouses', href: '/inventory/warehouses', module: 'Inventory & Production', keywords: ['storage', 'location'], moduleSlug: 'inventory' },
  { title: 'Brands', href: '/inventory/brands', module: 'Inventory & Production', keywords: ['brand', 'manufacturer'], moduleSlug: 'inventory' },
  { title: 'Units of Measure', href: '/inventory/uom', module: 'Inventory & Production', keywords: ['UOM', 'unit'], moduleSlug: 'inventory' },
  { title: 'Inventory Reports', href: '/inventory/reports', module: 'Inventory & Production', keywords: ['analytics', 'stock'], moduleSlug: 'inventory' },
  { title: 'Inventory Settings', href: '/inventory/settings', module: 'Inventory & Production', keywords: ['configuration'], moduleSlug: 'inventory' },

  // Manufacturing
  { title: 'Manufacturing', href: '/manufacturing', module: 'Inventory & Production', keywords: ['production', 'factory', 'BOM'], moduleSlug: 'manufacturing' },
  { title: 'Work Orders', href: '/manufacturing/work-orders', module: 'Inventory & Production', keywords: ['production', 'job'], moduleSlug: 'manufacturing' },
  { title: 'Bill of Materials', href: '/manufacturing/bom', module: 'Inventory & Production', keywords: ['BOM', 'recipe'], moduleSlug: 'manufacturing' },
  { title: 'Manufacturing Settings', href: '/manufacturing/settings', module: 'Inventory & Production', keywords: ['configuration'], moduleSlug: 'manufacturing' },

  // Accounts
  { title: 'Accounts', href: '/accounts', module: 'Accounting & Treasury', keywords: ['accounting', 'finance', 'GL'], moduleSlug: 'accounts' },
  { title: 'Chart of Accounts', href: '/accounts/chart-of-accounts', module: 'Accounting & Treasury', keywords: ['COA', 'ledger', 'GL'], moduleSlug: 'accounts' },
  { title: 'Journal Entries', href: '/accounts/journal-entries', module: 'Accounting & Treasury', keywords: ['JV', 'journal', 'posting'], moduleSlug: 'accounts' },
  { title: 'Currencies', href: '/accounts/currencies', module: 'Accounting & Treasury', keywords: ['FX', 'currency', 'exchange'], moduleSlug: 'accounts' },
  { title: 'Payment Methods', href: '/accounts/payment-methods', module: 'Accounting & Treasury', keywords: ['payment', 'method'], moduleSlug: 'accounts' },
  { title: 'VAT', href: '/accounts/vat', module: 'Accounting & Treasury', keywords: ['tax', 'VAT'], moduleSlug: 'accounts' },
  { title: 'WHT', href: '/accounts/wht', module: 'Accounting & Treasury', keywords: ['withholding', 'tax'], moduleSlug: 'accounts' },
  { title: 'Banks', href: '/accounts/banks', module: 'Accounting & Treasury', keywords: ['bank', 'account'], moduleSlug: 'accounts' },
  { title: 'Bank Transfers', href: '/accounts/bank-transfers', module: 'Accounting & Treasury', keywords: ['transfer', 'wire'], moduleSlug: 'accounts' },
  { title: 'Fiscal Years', href: '/accounts/fiscal-years', module: 'Accounting & Treasury', keywords: ['fiscal', 'year', 'period'], moduleSlug: 'accounts' },
  { title: 'Expense Requests', href: '/accounts/expense-requests', module: 'Accounting & Treasury', keywords: ['expense', 'reimbursement'], moduleSlug: 'accounts' },
  { title: 'Misc Receipts', href: '/accounts/misc-receipts', module: 'Accounting & Treasury', keywords: ['misc', 'receipt', 'interest', 'income', 'bank receipt'], moduleSlug: 'accounts' },
  { title: 'Opening Balances', href: '/accounts/opening-balances', module: 'Accounting & Treasury', keywords: ['opening', 'balance'], moduleSlug: 'accounts' },
  { title: 'Account Reports', href: '/accounts/reports', module: 'Accounting & Treasury', keywords: ['analytics', 'financial'], moduleSlug: 'accounts' },
  { title: 'Account Settings', href: '/accounts/settings', module: 'Accounting & Treasury', keywords: ['configuration'], moduleSlug: 'accounts' },

  // Budget
  { title: 'Budget', href: '/budget', module: 'Accounting & Treasury', keywords: ['budget', 'planning', 'forecast'], moduleSlug: 'budget' },

  // Assets
  { title: 'Assets', href: '/assets', module: 'Accounting & Treasury', keywords: ['fixed assets', 'depreciation'], moduleSlug: 'assets' },

  // Petty Cash
  { title: 'Petty Cash', href: '/petty-cash', module: 'Accounting & Treasury', keywords: ['cash', 'petty', 'fund'], moduleSlug: 'petty-cash' },
  { title: 'Petty Cash Funds', href: '/petty-cash/funds', module: 'Accounting & Treasury', keywords: ['fund'], moduleSlug: 'petty-cash' },
  { title: 'Disbursements', href: '/petty-cash/disbursements', module: 'Accounting & Treasury', keywords: ['expense', 'spend'], moduleSlug: 'petty-cash' },
  { title: 'Replenishments', href: '/petty-cash/replenishments', module: 'Accounting & Treasury', keywords: ['refill', 'top-up'], moduleSlug: 'petty-cash' },

  // Fund Management
  { title: 'Fund Management', href: '/fund-management', module: 'Accounting & Treasury', keywords: ['fund', 'treasury'], moduleSlug: 'fund-management' },

  // Admin / Core
  { title: 'Administration', href: '/core', module: 'Administration', keywords: ['admin', 'settings', 'manage'] },
  { title: 'Users', href: '/core/users', module: 'Administration', keywords: ['user', 'staff', 'access'] },
  { title: 'Companies', href: '/core/companies', module: 'Administration', keywords: ['company', 'organization'] },
  { title: 'Branches', href: '/core/branches', module: 'Administration', keywords: ['branch', 'location'] },
  { title: 'Roles', href: '/core/roles', module: 'Administration', keywords: ['role', 'permission'] },
  { title: 'Approvals Inbox', href: '/approvals', module: 'Administration', keywords: ['approval', 'workflow', 'inbox', 'pending'] },
  { title: 'Approval Flows', href: '/core/approvals/flows', module: 'Administration', keywords: ['approval', 'workflow', 'flow', 'settings'] },
  { title: 'Notifications', href: '/core/notifications', module: 'Administration', keywords: ['notification', 'alert'] },

  // Billing
  { title: 'Billing', href: '/billing', module: 'Administration', keywords: ['subscription', 'plan', 'payment'] },

  // Help
  { title: 'Help & Support', href: '/help', module: 'Help', keywords: ['help', 'support', 'docs', 'documentation'] },
];

/**
 * Simple fuzzy search: checks if all characters of the query appear in order
 * within the target string. Returns a score (lower = better match).
 */
export function fuzzyMatch(query: string, target: string): number | null {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact substring match gets best score
  if (t.includes(q)) {
    return t.indexOf(q);
  }

  // Check if all chars appear in order
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }

  if (qi === q.length) {
    return 100; // Fuzzy match, lower priority than substring
  }

  return null; // No match
}

/**
 * Search the page index with fuzzy matching.
 * Returns pages sorted by relevance.
 */
export function searchPageIndex(
  query: string,
  enabledModuleSlugs?: string[],
): SearchPage[] {
  if (!query.trim()) return [];

  const q = query.trim().toLowerCase();

  const scored: Array<{ page: SearchPage; score: number }> = [];

  for (const page of searchPages) {
    // Module-access filtering
    if (page.moduleSlug && enabledModuleSlugs && enabledModuleSlugs.length > 0) {
      if (!enabledModuleSlugs.includes(page.moduleSlug)) continue;
    }

    // Check title match
    const titleScore = fuzzyMatch(q, page.title);
    if (titleScore !== null) {
      scored.push({ page, score: titleScore });
      continue;
    }

    // Check keyword matches
    let keywordMatch = false;
    for (const kw of page.keywords) {
      if (fuzzyMatch(q, kw) !== null) {
        keywordMatch = true;
        break;
      }
    }
    if (keywordMatch) {
      scored.push({ page, score: 200 });
      continue;
    }

    // Check module match
    if (fuzzyMatch(q, page.module) !== null) {
      scored.push({ page, score: 300 });
    }
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.map((s) => s.page);
}
