'use client';

import React from 'react';
import {
  Package,
  FileText,
  MapPin,
  DollarSign,
  Shield,
  CheckCircle,
  XCircle,
  Calculator,
  Wrench,
} from 'lucide-react';
import {
  EntityDetailViewer,
  metadataTab,
} from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { Asset } from '@/types/assets';
import { getCurrencySymbol } from '@/hooks/useCurrencyFormat';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  under_maintenance: 'Under Maintenance',
  disposed: 'Disposed',
  lost: 'Lost',
  stolen: 'Stolen',
  written_off: 'Written Off',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  under_maintenance: 'bg-amber-100 text-amber-700',
  disposed: 'bg-red-100 text-red-700',
  lost: 'bg-red-100 text-red-700',
  stolen: 'bg-red-100 text-red-700',
  written_off: 'bg-slate-100 text-slate-700',
};

const CONDITION_LABELS: Record<string, string> = {
  new: 'New', good: 'Good', fair: 'Fair', poor: 'Poor', damaged: 'Damaged',
};

const CONDITION_STYLES: Record<string, string> = {
  new: 'bg-green-100 text-green-700',
  good: 'bg-blue-100 text-blue-700',
  fair: 'bg-amber-100 text-amber-700',
  poor: 'bg-orange-100 text-orange-700',
  damaged: 'bg-red-100 text-red-700',
};

const DEPRECIATION_METHOD_LABELS: Record<string, string> = {
  STRAIGHT_LINE: 'Straight Line',
  DECLINING_BALANCE: 'Declining Balance',
  UNITS_OF_PRODUCTION: 'Units of Production',
  SUM_OF_YEARS_DIGITS: 'Sum of Years Digits',
};

const ACQUISITION_METHOD_LABELS: Record<string, string> = {
  purchase: 'Purchase', donation: 'Donation', lease: 'Lease',
  construction: 'Construction', trade_in: 'Trade In', other: 'Other',
};

function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '\u2014';
  const symbol = getCurrencySymbol('NGN');
  return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ============================================================================
// FINANCIAL SUMMARY PANEL
// ============================================================================

function FinancialSummary({ asset }: { asset: Asset }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Acquisition Cost</p>
          <p className="text-lg font-bold font-mono">{formatCurrency(asset.acquisitionCost)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Book Value</p>
          <p className="text-lg font-bold font-mono">{formatCurrency(asset.bookValue)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Calculator className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Accumulated Depreciation</p>
          <p className="text-lg font-bold font-mono">{formatCurrency(asset.accumulatedDepreciation)}</p>
        </div>
      </div>
      {asset.depreciationPercent != null && (
        <div className="mt-2">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Depreciated</span>
            <span className="font-medium">{asset.depreciationPercent.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${Math.min(100, asset.depreciationPercent)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONFIG
// ============================================================================

export const assetDetailConfig: EntityDetailConfig<Asset> = {
  entityType: 'assets',
  basePath: '/assets/assets',
  icon: Package,
  title: (a) => a.name,
  subtitle: (a) => a.assetCode,
  sidebar: {
    title: (a) => a.name,
    subtitle: (a) => a.assetCode,
    searchKeys: ['title', 'subtitle'],
    badges: (a) => [
      {
        label: STATUS_LABELS[a.status] || a.status,
        className: STATUS_STYLES[a.status] || 'bg-gray-100 text-gray-700',
      },
      {
        label: CONDITION_LABELS[a.condition] || a.condition,
        className: CONDITION_STYLES[a.condition] || 'bg-gray-100 text-gray-700',
      },
    ],
    statusIcon: (a) =>
      a.status === 'active' ? (
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
          title: 'Asset Information',
          span: 'main',
          fields: [
            { label: 'Asset Code', value: (a) => a.assetCode, mono: true },
            { label: 'Name', value: (a) => a.name },
            { label: 'Asset Class', value: (a) => a.assetClassName || a.assetClassCode || '\u2014' },
            { label: 'Serial Number', value: (a) => a.serialNumber || '\u2014', mono: true, hidden: (a) => !a.serialNumber },
            { label: 'Barcode', value: (a) => a.barcode || '\u2014', mono: true, hidden: (a) => !a.barcode },
            {
              label: 'Status',
              value: (a) => (
                <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', STATUS_STYLES[a.status] || 'bg-gray-100 text-gray-700')}>
                  {STATUS_LABELS[a.status] || a.status}
                </span>
              ),
            },
            {
              label: 'Condition',
              value: (a) => (
                <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', CONDITION_STYLES[a.condition] || 'bg-gray-100 text-gray-700')}>
                  {CONDITION_LABELS[a.condition] || a.condition}
                </span>
              ),
            },
            { label: 'Description', value: (a) => a.description || '\u2014', span: 2, hidden: (a) => !a.description },
          ],
        },
        {
          title: 'Financial Summary',
          span: 'aside',
          render: (a) => <FinancialSummary asset={a} />,
        },
        {
          title: 'Location & Custody',
          span: 'main',
          fields: [
            { label: 'Location', value: (a) => a.location || '\u2014' },
            { label: 'Department', value: (a) => a.department || '\u2014' },
            { label: 'Custodian', value: (a) => a.custodianName || '\u2014' },
          ],
        },
        {
          title: 'Acquisition Details',
          span: 'aside',
          fields: [
            { label: 'Acquisition Date', value: (a) => formatDate(a.acquisitionDate) },
            { label: 'Method', value: (a) => ACQUISITION_METHOD_LABELS[a.acquisitionMethod || ''] || a.acquisitionMethod || '\u2014' },
            { label: 'Supplier', value: (a) => a.supplierName || '\u2014', hidden: (a) => !a.supplierName },
            { label: 'PO Number', value: (a) => a.purchaseOrderNumber || '\u2014', mono: true, hidden: (a) => !a.purchaseOrderNumber },
            { label: 'Invoice Number', value: (a) => a.invoiceNumber || '\u2014', mono: true, hidden: (a) => !a.invoiceNumber },
          ],
        },
        {
          title: 'Notes',
          span: 'full',
          hidden: (a) => !a.notes,
          fields: [
            { label: 'Notes', value: (a) => <span className="text-sm whitespace-pre-wrap">{a.notes}</span>, span: 2 },
          ],
        },
      ],
    },
    {
      id: 'depreciation',
      label: 'Depreciation',
      icon: Calculator,
      sections: [
        {
          title: 'Depreciation Settings',
          span: 'main',
          fields: [
            { label: 'Method', value: (a) => DEPRECIATION_METHOD_LABELS[a.depreciationMethod] || a.depreciationMethod },
            { label: 'Useful Life', value: (a) => `${a.usefulLifeYears} years` },
            { label: 'Residual Value', value: (a) => formatCurrency(a.residualValue) },
            { label: 'Residual Value %', value: (a) => `${a.residualValuePercent}%` },
            { label: 'Start Date', value: (a) => formatDate(a.depreciationStartDate) },
            { label: 'Last Depreciation', value: (a) => formatDate(a.lastDepreciationDate) },
          ],
        },
        {
          title: 'Financial Tracking',
          span: 'aside',
          fields: [
            { label: 'Book Value', value: (a) => <span className="font-mono">{formatCurrency(a.bookValue)}</span> },
            { label: 'Accumulated Depreciation', value: (a) => <span className="font-mono">{formatCurrency(a.accumulatedDepreciation)}</span> },
            { label: 'Impairment Loss', value: (a) => <span className="font-mono">{formatCurrency(a.impairmentLoss)}</span>, hidden: (a) => !a.impairmentLoss },
            { label: 'Net Book Value', value: (a) => <span className="font-mono text-green-600">{formatCurrency(a.netBookValue)}</span>, hidden: (a) => a.netBookValue == null },
          ],
        },
      ],
    },
    {
      id: 'warranty',
      label: 'Warranty & Maintenance',
      icon: Wrench,
      sections: [
        {
          title: 'Warranty Information',
          span: 'main',
          fields: [
            { label: 'Warranty Start', value: (a) => formatDate(a.warrantyStartDate) },
            { label: 'Warranty Expiry', value: (a) => formatDate(a.warrantyExpiryDate) },
            {
              label: 'Under Warranty',
              value: (a) => a.isUnderWarranty ? (
                <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> Yes</span>
              ) : (
                <span className="flex items-center gap-1 text-gray-500"><XCircle className="h-4 w-4" /> No</span>
              ),
            },
          ],
        },
        {
          title: 'Maintenance Schedule',
          span: 'aside',
          fields: [
            { label: 'Last Maintenance', value: (a) => formatDate(a.lastMaintenanceDate) },
            { label: 'Next Maintenance', value: (a) => formatDate(a.nextMaintenanceDate) },
          ],
        },
      ],
    },
    metadataTab<Asset>(),
  ],
};

// ============================================================================
// COMPONENT (thin wrapper)
// ============================================================================

interface AssetDetailViewerProps {
  asset: Asset;
  assets: Asset[];
  onClose: () => void;
  onAssetSelect: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  loading?: boolean;
}

export function AssetDetailViewer({
  asset,
  assets,
  onClose,
  onAssetSelect,
  onDelete,
  loading,
}: AssetDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={assetDetailConfig}
      entity={asset}
      entities={assets}
      onClose={onClose}
      onEntitySelect={onAssetSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
