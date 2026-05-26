'use client';

import { Settings, Building2, GitBranch, Shield, Users, MessageSquare, Bell, Key, CheckCircle, Workflow, History, Puzzle, Database } from 'lucide-react';
import { ModuleLayout } from '@/components/erp/ModuleLayout';
import type { ModuleItem, ModuleInfo } from '@/components/erp/ModuleLayout';
import type { BreadcrumbItem } from '@/types/core';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Administration' },
];

// ============================================================================
// MODULE CONFIGURATION
// ============================================================================

const moduleInfo: ModuleInfo = {
  name: 'Administration',
  icon: Settings,
  description: 'System administration: company setup, user management, roles & permissions, and system configuration',
  group: 'System Administration',
};

// ============================================================================
// GENERAL SETUP SECTION (Transactions)
// ============================================================================

const generalSetup: ModuleItem[] = [
  {
    title: 'Company Management',
    href: '/core/companies',
    description: 'Configure company information, branding, and multi-company settings',
    icon: Building2,
  },
  {
    title: 'Branch Management',
    href: '/core/branches',
    description: 'Manage company branches, locations, and site configurations',
    icon: GitBranch,
  },
  {
    title: 'User Management',
    href: '/core/users',
    description: 'Manage user accounts, profiles, and access credentials',
    icon: Users,
  },
];

// ============================================================================
// ACCESS CONTROL SECTION (Reports)
// ============================================================================

const accessControl: ModuleItem[] = [
  {
    title: 'Roles & Permissions',
    href: '/core/roles',
    description: 'Define roles and assign granular permissions for access control',
    icon: Shield,
  },
  {
    title: 'Permission Matrix',
    href: '/core/permissions',
    description: 'View and manage the complete permission matrix across all modules',
    icon: Key,
  },
  {
    title: 'Approvals',
    href: '/core/approvals',
    description: 'Review pending approvals and manage approval workflows',
    icon: CheckCircle,
  },
  {
    title: 'Approval Flows',
    href: '/core/approvals/flows',
    description: 'Configure multi-step approval workflows for documents',
    icon: Workflow,
  },
];

// ============================================================================
// SYSTEM CONFIGURATION SECTION (Maintenance)
// ============================================================================

const systemConfig: ModuleItem[] = [
  {
    title: 'Modules & Features',
    href: '/core/modules',
    description: 'View and manage enabled modules and features for your organization',
    icon: Puzzle,
  },
  {
    title: 'Audit Trail',
    href: '/core/audit-logs',
    description: 'Track all changes made to system records with detailed audit logs',
    icon: History,
  },
  {
    title: 'Internal Messages',
    href: '/core/messages',
    description: 'Send and receive internal messages between employees',
    icon: MessageSquare,
  },
  {
    title: 'Notifications',
    href: '/core/notifications',
    description: 'View and manage system notifications and alerts',
    icon: Bell,
  },
  {
    title: 'Backups',
    href: '/core/backups',
    description: 'Create and manage database backups for your organization',
    icon: Database,
  },
];

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function CoreModuleIndex() {
  return (
    <ModuleLayout
      module={moduleInfo}
      transactions={generalSetup}
      reports={accessControl}
      maintenance={systemConfig}
      customHeaders={{
        transactions: 'General Setup',
        reports: 'Access Control',
        maintenance: 'System Configuration',
      }}
      headerPreset="core"
      breadcrumbs={breadcrumbs}
    />
  );
}
