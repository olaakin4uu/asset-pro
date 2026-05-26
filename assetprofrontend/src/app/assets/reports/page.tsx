'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  BarChart3,
  ArrowLeft,
  FileText,
  DollarSign,
  TrendingDown,
  Truck,
  Hash,
  Calendar,
  ClipboardList,
  ArrowRightLeft,
  Trash2,
  Calculator,
  Layers,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader';
import { StatCard, StatCardColors, StatCardsGrid } from '@/components/erp/StatCard';
import { formatCurrency, extractErrorMessage } from '@/lib/utils';
import { assetsApi, assetDepreciationsApi, assetDisposalsApi } from '@/lib/api/assets';
import type { BreadcrumbItem } from '@/types/core';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Assets', href: '/assets' },
  { title: 'Reports' },
];

const reports = [
  {
    category: 'Register & Valuation',
    items: [
      {
        name: 'Asset Register',
        description:
          'Complete listing of all assets with current book values, depreciation status, and location details',
        href: '/assets/reports/register',
        icon: FileText,
        color: 'bg-blue-500',
      },
      {
        name: 'Asset Valuation',
        description:
          'Asset value analysis grouped by class, location, and department with current market estimates',
        href: '/assets/reports/valuation',
        icon: DollarSign,
        color: 'bg-indigo-500',
      },
    ],
  },
  {
    category: 'Depreciation',
    items: [
      {
        name: 'Depreciation Schedule',
        description:
          'Upcoming and projected depreciation charges for the current and future periods',
        href: '/assets/reports/depreciation-schedule',
        icon: Calendar,
        color: 'bg-purple-500',
      },
      {
        name: 'Accumulated Depreciation',
        description:
          'Accumulated depreciation breakdown by asset class, showing cost, depreciation, and net book value',
        href: '/assets/reports/accumulated-depreciation',
        icon: Calculator,
        color: 'bg-amber-500',
      },
    ],
  },
  {
    category: 'Transactions',
    items: [
      {
        name: 'Disposal Report',
        description:
          'All disposed assets with gain/loss calculations, disposal methods, and buyer information',
        href: '/assets/reports/disposals',
        icon: Trash2,
        color: 'bg-red-500',
      },
      {
        name: 'Transfer History',
        description:
          'Asset movement and reassignment history between locations, departments, and branches',
        href: '/assets/reports/transfers',
        icon: ArrowRightLeft,
        color: 'bg-green-500',
      },
    ],
  },
];

export default function AssetReportsPage() {
  const router = useRouter();

  const { data: statsData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['asset-report-stats'],
    queryFn: async () => {
      const [assets, depreciation, disposals] = await Promise.all([
        assetsApi.getStats(),
        assetDepreciationsApi.getStats(),
        assetDisposalsApi.getStats(),
      ]);
      return { assets, depreciation, disposals };
    },
  });

  const assetStats = statsData?.assets ?? null;
  const depreciationStats = statsData?.depreciation ?? null;
  const disposalStats = statsData?.disposals ?? null;
  const error = fetchError ? extractErrorMessage(fetchError, 'Failed to load asset report stats') : null;

  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/assets'),
    },
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        icon={BarChart3}
        title="Asset Reports"
        description="Asset register, depreciation schedules, and valuation reports"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <StatCardsGrid columns={4} className="mb-8">
        <StatCard
          title="Total Assets"
          value={assetStats?.total ?? 0}
          subtitle={`${assetStats?.active ?? 0} active`}
          icon={Hash}
          color={StatCardColors.blue}
          loading={loading}
        />
        <StatCard
          title="Total Value"
          value={formatCurrency(assetStats?.totalValue ?? 0)}
          subtitle={`NBV: ${formatCurrency(assetStats?.totalNetBookValue ?? 0)}`}
          icon={DollarSign}
          color={StatCardColors.green}
          loading={loading}
        />
        <StatCard
          title="Monthly Depreciation"
          value={formatCurrency(depreciationStats?.totalAmount ?? 0)}
          subtitle={`${depreciationStats?.total ?? 0} entries`}
          icon={TrendingDown}
          color={StatCardColors.amber}
          loading={loading}
        />
        <StatCard
          title="Disposed This Year"
          value={disposalStats?.completed ?? 0}
          subtitle={`Proceeds: ${formatCurrency(disposalStats?.totalProceeds ?? 0)}`}
          icon={Trash2}
          color={StatCardColors.red}
          loading={loading}
        />
      </StatCardsGrid>

      {/* Report Cards */}
      <div className="space-y-8">
        {reports.map((section) => (
          <div key={section.category}>
            <h2 className="text-lg font-semibold mb-4">{section.category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group rounded-xl border bg-card p-6 hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`rounded-lg p-3 ${item.color}`}>
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </TenantLayout>
  );
}
