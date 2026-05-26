'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, BarChart3, Settings, ArrowRight, type LucideIcon } from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from './PageHeader';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ModuleItem {
  title: string;
  href: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
}

export interface ModuleInfo {
  name: string;
  icon: LucideIcon;
  description: string;
  group: string;
}

export interface ModuleLayoutProps {
  /** Module information for the header */
  module: ModuleInfo;
  /** Items for the transactions/general setup column */
  transactions?: ModuleItem[];
  /** Items for the reports/inquiries column */
  reports?: ModuleItem[];
  /** Items for the maintenance/configuration column */
  maintenance?: ModuleItem[];
  /** Custom headers for each section */
  customHeaders?: {
    transactions?: string;
    reports?: string;
    maintenance?: string;
  };
  /** Custom gradient preset for PageHeader */
  headerPreset?: keyof typeof PageHeaderPresets;
  /** Breadcrumbs for navigation */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional content rendered above the tile grid (status banners, alerts, etc.) */
  topContent?: React.ReactNode;
  /** Children for custom content below the cards */
  children?: React.ReactNode;
}

// ============================================================================
// SECTION CARD COMPONENT
// ============================================================================

interface SectionCardProps {
  title: string;
  icon: LucideIcon;
  items: ModuleItem[];
  colorScheme: 'blue' | 'green' | 'orange';
}

const colorSchemes = {
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconText: 'text-blue-600 dark:text-blue-400',
    headerBorder: 'border-blue-200 dark:border-blue-800',
    itemHover: 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20',
    arrowColor: 'text-blue-500',
  },
  green: {
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconText: 'text-green-600 dark:text-green-400',
    headerBorder: 'border-green-200 dark:border-green-800',
    itemHover: 'hover:bg-green-50/50 dark:hover:bg-green-900/20',
    arrowColor: 'text-green-500',
  },
  orange: {
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconText: 'text-orange-600 dark:text-orange-400',
    headerBorder: 'border-orange-200 dark:border-orange-800',
    itemHover: 'hover:bg-orange-50/50 dark:hover:bg-orange-900/20',
    arrowColor: 'text-orange-500',
  },
};

function SectionCard({ title, icon: Icon, items, colorScheme }: SectionCardProps) {
  const colors = colorSchemes[colorScheme];

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className={cn('flex items-center gap-3 p-4 border-b', colors.headerBorder)}>
        <div className={cn('p-2.5 rounded-xl', colors.iconBg)}>
          <Icon className={cn('h-5 w-5', colors.iconText)} />
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>

      {/* Section Items */}
      <div className="divide-y divide-border/50">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center justify-between p-4 transition-all duration-200',
              'group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
              colors.itemHover
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {item.icon && (
                  <item.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </span>
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                    {item.badge}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            <ArrowRight
              className={cn(
                'h-4 w-4 ml-3 flex-shrink-0 transition-transform duration-200',
                'opacity-0 group-hover:opacity-100 group-hover:translate-x-1',
                colors.arrowColor
              )}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ModuleLayout({
  module,
  transactions = [],
  reports = [],
  maintenance = [],
  customHeaders = {},
  headerPreset = 'core',
  breadcrumbs,
  topContent,
  children,
}: ModuleLayoutProps) {
  const defaultBreadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: module.name },
  ];

  const hasContent = transactions.length > 0 || reports.length > 0 || maintenance.length > 0;

  return (
    <TenantLayout breadcrumbs={breadcrumbs || defaultBreadcrumbs}>
      {/* Page Header */}
      <PageHeader
        icon={module.icon}
        title={module.name}
        description={module.description}
        badge={{ text: module.group, variant: 'outline' }}
        sticky={false}
        {...PageHeaderPresets[headerPreset]}
      />

      {/* Main Content */}
      <div className="p-4 sm:p-6">
        {topContent}
        {/* Three Column Grid */}
        {hasContent && (
          <div className="grid gap-6 lg:grid-cols-3">
              {/* Transactions / General Setup Column */}
              <SectionCard
                title={customHeaders.transactions || 'Transactions'}
                icon={FileText}
                items={transactions}
                colorScheme="blue"
              />

              {/* Reports / Inquiries Column */}
              <SectionCard
                title={customHeaders.reports || 'Reports & Inquiries'}
                icon={BarChart3}
                items={reports}
                colorScheme="green"
              />

              {/* Maintenance / Configuration Column */}
              <SectionCard
                title={customHeaders.maintenance || 'Maintenance'}
                icon={Settings}
                items={maintenance}
                colorScheme="orange"
              />
            </div>
          )}

          {/* Custom content */}
          {children}
        </div>
    </TenantLayout>
  );
}
