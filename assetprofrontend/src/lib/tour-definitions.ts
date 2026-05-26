import type { TourDefinition } from '@/stores/tour';

// ============================================================================
// TOUR 1: Welcome Tour — First-time overview of the entire interface
// ============================================================================

const welcomeTour: TourDefinition = {
  id: 'welcome',
  name: 'Welcome Tour',
  description: 'Get a quick overview of the AssetPro interface',
  steps: [
    {
      id: 'welcome-sidebar',
      target: '[data-tour="sidebar-nav"]',
      title: 'Navigation Sidebar',
      content:
        'This is your main navigation. All modules you have access to are organized by category here.',
      placement: 'right',
    },
    {
      id: 'welcome-search',
      target: '[data-tour="search"]',
      title: 'Global Search',
      content:
        'Search across orders, customers, products, and more. Use Ctrl+K for quick access.',
      placement: 'bottom',
    },
    {
      id: 'welcome-quick-actions',
      target: '[data-tour="quick-actions"]',
      title: 'Quick Actions',
      content:
        'Create new records quickly — purchase orders, invoices, customers, and more.',
      placement: 'bottom',
    },
    {
      id: 'welcome-notifications',
      target: '[data-tour="notifications"]',
      title: 'Notifications',
      content:
        'Stay updated with real-time alerts for orders, payments, and stock levels.',
      placement: 'bottom',
    },
    {
      id: 'welcome-user-menu',
      target: '[data-tour="user-menu"]',
      title: 'Your Profile',
      content:
        'Access your profile, settings, and sign out. You can restart this tour anytime from here.',
      placement: 'bottom',
    },
  ],
};

// ============================================================================
// TOUR 2: Sidebar Navigation — Deep dive into modules
// ============================================================================

const sidebarNavigationTour: TourDefinition = {
  id: 'sidebar-navigation',
  name: 'Sidebar Navigation',
  description: 'Learn about the modules available in your sidebar',
  steps: [
    {
      id: 'sidebar-company',
      target: '[data-tour="company-switcher"]',
      title: 'Company Switcher',
      content:
        'Switch between companies and branches you have access to.',
      placement: 'right',
    },
    {
      id: 'sidebar-dashboard',
      target: '[data-nav-item][href="/dashboard"]',
      title: 'Dashboard',
      content:
        'Your command center — KPIs, recent activity, and alerts at a glance.',
      placement: 'right',
    },
    {
      id: 'sidebar-inventory',
      target: '[data-nav-item][href="/inventory"]',
      title: 'Inventory Management',
      content:
        'Track stock levels, manage warehouses, and monitor reorder points.',
      placement: 'right',
      moduleSlug: 'inventory',
    },
    {
      id: 'sidebar-sales',
      target: '[data-nav-item][href="/sales"]',
      title: 'Sales Module',
      content:
        'Manage customers, sales orders, and track your sales pipeline.',
      placement: 'right',
      moduleSlug: 'sales',
    },
    {
      id: 'sidebar-accounts',
      target: '[data-nav-item][href="/accounts"]',
      title: 'Accounting',
      content:
        'Chart of accounts, journal entries, and financial reports.',
      placement: 'right',
      moduleSlug: 'accounts',
    },
    {
      id: 'sidebar-admin',
      target: '[data-nav-item][href="/core"]',
      title: 'Administration',
      content:
        'Manage users, roles, permissions, and system settings.',
      placement: 'right',
    },
  ],
};

// ============================================================================
// TOUR 3: Header Tools — Toolbar features
// ============================================================================

const headerToolsTour: TourDefinition = {
  id: 'header-tools',
  name: 'Header Tools',
  description: 'Discover the tools in your top toolbar',
  steps: [
    {
      id: 'header-fiscal',
      target: '[data-tour="fiscal-year"]',
      title: 'Fiscal Year & Period',
      content:
        'View and manage the current fiscal year and period. The lock icon shows the posting period status.',
      placement: 'bottom',
    },
    {
      id: 'header-search',
      target: '[data-tour="search"]',
      title: 'Search Everything',
      content:
        'Find any record in the system. Supports order numbers, customer names, and product SKUs.',
      placement: 'bottom',
    },
    {
      id: 'header-ai',
      target: '[data-tour="ai-assistant"]',
      title: 'AI Assistant',
      content:
        'Get intelligent suggestions, document analysis, and natural-language queries.',
      placement: 'bottom',
    },
    {
      id: 'header-help',
      target: '[data-tour="help-menu"]',
      title: 'Help & Support',
      content:
        'Access documentation, video tutorials, and contact support.',
      placement: 'bottom',
    },
    {
      id: 'header-config',
      target: '[data-tour="config-guide"]',
      title: 'Configuration Guide',
      content:
        'Follow the guided setup to configure your system step by step.',
      placement: 'bottom',
    },
  ],
};

// ============================================================================
// TOUR 4: Configuration Guide — Setup checklist
// ============================================================================

const configurationGuideTour: TourDefinition = {
  id: 'configuration-guide',
  name: 'Configuration Guide',
  description: 'Step-by-step guide to set up your system',
  steps: [
    {
      id: 'config-admin',
      target: '[data-nav-item][href="/core"]',
      title: 'Step 1: Administration',
      content:
        'Start by setting up users, roles, and company details in the Administration module.',
      placement: 'right',
    },
    {
      id: 'config-accounts',
      target: '[data-nav-item][href="/accounts"]',
      title: 'Step 2: Chart of Accounts',
      content:
        'Configure your chart of accounts, currencies, and fiscal years.',
      placement: 'right',
      moduleSlug: 'accounts',
    },
    {
      id: 'config-inventory',
      target: '[data-nav-item][href="/inventory"]',
      title: 'Step 3: Inventory Setup',
      content:
        'Add your products, warehouses, and stock locations.',
      placement: 'right',
      moduleSlug: 'inventory',
    },
    {
      id: 'config-sales',
      target: '[data-nav-item][href="/sales"]',
      title: 'Step 4: Sales Configuration',
      content:
        'Set up customers, payment terms, and tax settings.',
      placement: 'right',
      moduleSlug: 'sales',
    },
  ],
};

// ============================================================================
// EXPORTS
// ============================================================================

export const tourDefinitions: TourDefinition[] = [
  welcomeTour,
  sidebarNavigationTour,
  headerToolsTour,
  configurationGuideTour,
];

export function getTourById(id: string): TourDefinition | undefined {
  return tourDefinitions.find((t) => t.id === id);
}
