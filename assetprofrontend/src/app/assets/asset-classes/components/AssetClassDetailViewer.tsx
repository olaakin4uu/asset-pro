'use client';

import React from 'react';
import {
  Layers,
  FileText,
  Settings,
  CheckCircle,
  XCircle,
  Calculator,
  Building2,
  Package,
} from 'lucide-react';
import {
  EntityDetailViewer,
  metadataTab,
} from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { AssetClass } from '@/types/assets';
import { cn } from '@/lib/utils';

const DEPRECIATION_METHOD_LABELS: Record<string, string> = {
  STRAIGHT_LINE: 'Straight Line',
  DECLINING_BALANCE: 'Declining Balance',
  UNITS_OF_PRODUCTION: 'Units of Production',
  SUM_OF_YEARS_DIGITS: 'Sum of Years Digits',
};

// ============================================================================
// CUSTOM RENDER COMPONENTS
// ============================================================================

function StatisticsPanel({ assetClass }: { assetClass: AssetClass }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Assets in Class</p>
          <p className="text-xl font-bold">{assetClass.assetCount || 0}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <Calculator className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Depreciation Method</p>
          <p className="font-medium">
            {DEPRECIATION_METHOD_LABELS[assetClass.depreciationMethod] || assetClass.depreciationMethod}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIG
// ============================================================================

export const assetClassDetailConfig: EntityDetailConfig<AssetClass> = {
  entityType: 'asset-classes',
  basePath: '/assets/asset-classes',
  icon: Layers,
  title: (ac) => ac.name,
  subtitle: (ac) => ac.code,
  sidebar: {
    title: (ac) => ac.name,
    subtitle: (ac) => ac.code,
    searchKeys: ['title', 'subtitle'],
    badges: (ac) => [
      {
        label: DEPRECIATION_METHOD_LABELS[ac.depreciationMethod] || ac.depreciationMethod,
        className: 'bg-violet-100 text-violet-700',
      },
      {
        label: ac.isActive ? 'Active' : 'Inactive',
        className: ac.isActive
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-700',
      },
    ],
    statusIcon: (ac) =>
      ac.isActive ? (
        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-gray-400" />
      ),
  },
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      sections: [
        {
          title: 'Basic Information',
          span: 'main',
          fields: [
            { label: 'Code', value: (ac) => ac.code, mono: true },
            { label: 'Name', value: (ac) => ac.name },
            {
              label: 'Description',
              value: (ac) => ac.description || '\u2014',
              span: 2,
              hidden: (ac) => !ac.description,
            },
            {
              label: 'Status',
              value: (ac) => (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                    ac.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  )}
                >
                  {ac.isActive ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {ac.isActive ? 'Active' : 'Inactive'}
                </span>
              ),
            },
          ],
        },
        {
          title: 'Statistics',
          span: 'aside',
          render: (ac) => <StatisticsPanel assetClass={ac} />,
        },
      ],
    },
    {
      id: 'depreciation',
      label: 'Depreciation Settings',
      icon: Settings,
      sections: [
        {
          title: 'Depreciation Configuration',
          span: 'main',
          fields: [
            {
              label: 'Depreciation Method',
              value: (ac) => DEPRECIATION_METHOD_LABELS[ac.depreciationMethod] || ac.depreciationMethod,
            },
            { label: 'Useful Life', value: (ac) => `${ac.usefulLifeYears} years` },
            { label: 'Residual Value %', value: (ac) => `${ac.residualValuePercent}%` },
          ],
        },
        {
          title: 'GL Account Integration',
          span: 'aside',
          fields: [
            {
              label: 'Asset Account',
              value: (ac) =>
                ac.assetAccountCode
                  ? `${ac.assetAccountCode} - ${ac.assetAccountName}`
                  : ac.assetAccountId
                    ? `Account #${ac.assetAccountId}`
                    : 'Not configured',
              mono: true,
            },
            {
              label: 'Accumulated Depreciation',
              value: (ac) =>
                ac.accumulatedDepreciationAccountCode
                  ? `${ac.accumulatedDepreciationAccountCode} - ${ac.accumulatedDepreciationAccountName}`
                  : ac.accumulatedDepreciationAccountId
                    ? `Account #${ac.accumulatedDepreciationAccountId}`
                    : 'Not configured',
              mono: true,
            },
            {
              label: 'Depreciation Expense',
              value: (ac) =>
                ac.depreciationExpenseAccountCode
                  ? `${ac.depreciationExpenseAccountCode} - ${ac.depreciationExpenseAccountName}`
                  : ac.depreciationExpenseAccountId
                    ? `Account #${ac.depreciationExpenseAccountId}`
                    : 'Not configured',
              mono: true,
            },
          ],
        },
      ],
    },
    metadataTab<AssetClass>(),
  ],
};

// ============================================================================
// COMPONENT (thin wrapper)
// ============================================================================

interface AssetClassDetailViewerProps {
  assetClass: AssetClass;
  assetClasses: AssetClass[];
  onClose: () => void;
  onAssetClassSelect: (assetClass: AssetClass) => void;
  onDelete: (assetClass: AssetClass) => void;
  loading?: boolean;
}

export function AssetClassDetailViewer({
  assetClass,
  assetClasses,
  onClose,
  onAssetClassSelect,
  onDelete,
  loading,
}: AssetClassDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={assetClassDetailConfig}
      entity={assetClass}
      entities={assetClasses}
      onClose={onClose}
      onEntitySelect={onAssetClassSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
