'use client';

import React from 'react';
import {
  ArrowLeftRight,
  FileText,
  MapPin,
} from 'lucide-react';
import {
  EntityDetailViewer,
  metadataTab,
} from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { AssetTransfer } from '@/types/assets';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', pending_approval: 'Pending Approval', approved: 'Approved',
  in_transit: 'In Transit', completed: 'Completed', cancelled: 'Cancelled',
};

const TRANSFER_TYPE_LABELS: Record<string, string> = {
  location: 'Location', department: 'Department', custodian: 'Custodian', branch: 'Branch', company: 'Company',
};

const CONDITION_LABELS: Record<string, string> = {
  new: 'New', good: 'Good', fair: 'Fair', poor: 'Poor', damaged: 'Damaged',
};

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ============================================================================
// FROM/TO COMPARISON
// ============================================================================

function TransferComparison({ transfer }: { transfer: AssetTransfer }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-lg border p-4 bg-red-50/50 dark:bg-red-900/10">
        <h4 className="text-sm font-semibold text-red-600 mb-3">From</h4>
        <dl className="space-y-2 text-sm">
          {transfer.fromLocation && <div><dt className="text-muted-foreground">Location</dt><dd>{transfer.fromLocation}</dd></div>}
          {transfer.fromDepartment && <div><dt className="text-muted-foreground">Department</dt><dd>{transfer.fromDepartment}</dd></div>}
          {transfer.fromCustodianName && <div><dt className="text-muted-foreground">Custodian</dt><dd>{transfer.fromCustodianName}</dd></div>}
          {transfer.fromBranchName && <div><dt className="text-muted-foreground">Branch</dt><dd>{transfer.fromBranchName}</dd></div>}
        </dl>
      </div>
      <div className="rounded-lg border p-4 bg-green-50/50 dark:bg-green-900/10">
        <h4 className="text-sm font-semibold text-green-600 mb-3">To</h4>
        <dl className="space-y-2 text-sm">
          {transfer.toLocation && <div><dt className="text-muted-foreground">Location</dt><dd>{transfer.toLocation}</dd></div>}
          {transfer.toDepartment && <div><dt className="text-muted-foreground">Department</dt><dd>{transfer.toDepartment}</dd></div>}
          {transfer.toCustodianName && <div><dt className="text-muted-foreground">Custodian</dt><dd>{transfer.toCustodianName}</dd></div>}
          {transfer.toBranchName && <div><dt className="text-muted-foreground">Branch</dt><dd>{transfer.toBranchName}</dd></div>}
        </dl>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIG
// ============================================================================

export const transferDetailConfig: EntityDetailConfig<AssetTransfer> = {
  entityType: 'transfers',
  basePath: '/assets/transfers',
  icon: ArrowLeftRight,
  title: (t) => t.assetName || t.transferNumber,
  subtitle: (t) => t.transferNumber,
  sidebar: {
    title: (t) => t.assetName || t.transferNumber,
    subtitle: (t) => t.transferNumber,
    searchKeys: ['title', 'subtitle'],
    badges: (t) => [
      {
        label: STATUS_LABELS[t.status] || t.status,
        className: STATUS_STYLES[t.status] || 'bg-gray-100 text-gray-700',
      },
      {
        label: TRANSFER_TYPE_LABELS[t.transferType] || t.transferType,
        className: 'bg-indigo-100 text-indigo-700',
      },
    ],
  },
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      sections: [
        {
          title: 'Transfer Information',
          span: 'main',
          fields: [
            { label: 'Transfer Number', value: (t) => t.transferNumber, mono: true },
            { label: 'Asset Name', value: (t) => t.assetName || '\u2014' },
            { label: 'Asset Code', value: (t) => t.assetCode || '\u2014', mono: true },
            { label: 'Transfer Date', value: (t) => formatDate(t.transferDate) },
            { label: 'Effective Date', value: (t) => formatDate(t.effectiveDate), hidden: (t) => !t.effectiveDate },
            {
              label: 'Transfer Type',
              value: (t) => (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700">
                  {TRANSFER_TYPE_LABELS[t.transferType] || t.transferType}
                </span>
              ),
            },
            {
              label: 'Status',
              value: (t) => (
                <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', STATUS_STYLES[t.status] || 'bg-gray-100 text-gray-700')}>
                  {STATUS_LABELS[t.status] || t.status}
                </span>
              ),
            },
            {
              label: 'Condition at Transfer',
              value: (t) => CONDITION_LABELS[t.conditionAtTransfer!] || '\u2014',
              hidden: (t) => !t.conditionAtTransfer,
            },
          ],
        },
        {
          title: 'Workflow',
          span: 'aside',
          fields: [
            { label: 'Requested By', value: (t) => t.requestedByUserName || '\u2014', hidden: (t) => !t.requestedByUserName },
            { label: 'Approved By', value: (t) => t.approvedByUserName || '\u2014', hidden: (t) => !t.approvedByUserName },
            { label: 'Approved At', value: (t) => formatDate(t.approvedAt), hidden: (t) => !t.approvedAt },
            { label: 'Dispatched At', value: (t) => formatDate(t.dispatchedAt), hidden: (t) => !t.dispatchedAt },
            { label: 'Received By', value: (t) => t.receivedByUserName || '\u2014', hidden: (t) => !t.receivedByUserName },
            { label: 'Received At', value: (t) => formatDate(t.receivedAt), hidden: (t) => !t.receivedAt },
          ],
        },
        {
          title: 'From / To Comparison',
          span: 'full',
          render: (t) => <TransferComparison transfer={t} />,
        },
        {
          title: 'Notes',
          span: 'full',
          hidden: (t) => !t.reason && !t.notes && !t.conditionNotes,
          fields: [
            { label: 'Reason', value: (t) => <span className="text-sm whitespace-pre-wrap">{t.reason}</span>, hidden: (t) => !t.reason, span: 2 },
            { label: 'Condition Notes', value: (t) => <span className="text-sm whitespace-pre-wrap">{t.conditionNotes}</span>, hidden: (t) => !t.conditionNotes, span: 2 },
            { label: 'Notes', value: (t) => <span className="text-sm whitespace-pre-wrap">{t.notes}</span>, hidden: (t) => !t.notes, span: 2 },
          ],
        },
      ],
    },
    metadataTab<AssetTransfer>(),
  ],
};

// ============================================================================
// COMPONENT (thin wrapper)
// ============================================================================

interface TransferDetailViewerProps {
  transfer: AssetTransfer;
  transfers: AssetTransfer[];
  onClose: () => void;
  onTransferSelect: (transfer: AssetTransfer) => void;
  onDelete: (transfer: AssetTransfer) => void;
  loading?: boolean;
}

export function TransferDetailViewer({
  transfer,
  transfers,
  onClose,
  onTransferSelect,
  onDelete,
  loading,
}: TransferDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={transferDetailConfig}
      entity={transfer}
      entities={transfers}
      onClose={onClose}
      onEntitySelect={onTransferSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
