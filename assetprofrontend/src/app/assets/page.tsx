'use client';

import { Building2 } from 'lucide-react';
import { ModuleLayout, type ModuleItem, type ModuleInfo } from '@/components/erp/ModuleLayout';

// ============================================================================
// MODULE CONFIGURATION
// ============================================================================

const moduleInfo: ModuleInfo = {
  name: 'Asset Management',
  icon: Building2,
  description:
    'Fixed asset tracking, depreciation, and lifecycle management',
  group: 'Accounting & Treasury',
};

// ============================================================================
// TRANSACTIONS SECTION
// ============================================================================

const transactions: ModuleItem[] = [
  {
    title: 'Asset Register',
    href: '/assets/assets',
    description: 'Manage fixed assets and their lifecycle',
  },
  {
    title: 'Depreciation',
    href: '/assets/depreciations',
    description: 'Manage period depreciation and GL posting',
  },
  {
    title: 'Disposals',
    href: '/assets/disposals',
    description: 'Asset retirement and disposal management',
  },
  {
    title: 'Transfers',
    href: '/assets/transfers',
    description: 'Track asset movements and reassignments',
  },
  {
    title: 'Asset Maintenance',
    href: '/assets/maintenance',
    description: 'Schedule and track maintenance activities',
  },
];

// ============================================================================
// REPORTS SECTION
// ============================================================================

const reports: ModuleItem[] = [
  {
    title: 'Asset Reports',
    href: '/assets/reports',
    description: 'Asset register, depreciation, and valuation reports',
  },
];

// ============================================================================
// MAINTENANCE SECTION
// ============================================================================

const maintenance: ModuleItem[] = [
  {
    title: 'Asset Classes',
    href: '/assets/asset-classes',
    description: 'Define classification and depreciation policies',
  },
  {
    title: 'Asset Settings',
    href: '/assets/settings',
    description: 'Configure module preferences',
  },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AssetsModulePage() {
  return (
    <ModuleLayout
      module={moduleInfo}
      transactions={transactions}
      reports={reports}
      maintenance={maintenance}
      headerPreset="financial"
    />
  );
}
