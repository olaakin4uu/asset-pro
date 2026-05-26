'use client';

import React from 'react';
import { Receipt, FileText, Check, Ban } from 'lucide-react';
import { EntityDetailViewer, metadataTab } from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { Vat } from '@/lib/api/accounts';

const vatDetailConfig: EntityDetailConfig<Vat> = {
  entityType: 'vat',
  basePath: '/accounts/vat',
  icon: Receipt,
  title: (v) => v.name,
  subtitle: (v) => v.code,
  sidebar: {
    title: (v) => v.name,
    subtitle: (v) => `${v.code} - ${Number(v.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
    searchKeys: ['title', 'subtitle'],
    statusIcon: (v) =>
      v.isActive ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Ban className="h-3.5 w-3.5 text-gray-400" />
      ),
  },
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      sections: [
        {
          title: 'VAT Information',
          fields: [
            { label: 'Name', value: (v) => v.name },
            { label: 'Code', value: (v) => v.code, mono: true },
            {
              label: 'Rate',
              value: (v) => <span className="text-lg">{Number(v.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>,
            },
            {
              label: 'GL Account',
              value: (v) =>
                v.accountCode ? (
                  `${v.accountCode} - ${v.accountName}`
                ) : (
                  <span className="text-muted-foreground">Not mapped</span>
                ),
            },
          ],
        },
      ],
    },
    metadataTab<Vat>(),
  ],
};

interface VatDetailViewerProps {
  vat: Vat;
  vats: Vat[];
  onClose: () => void;
  onVatSelect: (vat: Vat) => void;
  onDelete: (vat: Vat) => void;
  loading?: boolean;
}

export function VatDetailViewer({
  vat,
  vats,
  onClose,
  onVatSelect,
  onDelete,
  loading,
}: VatDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={vatDetailConfig}
      entity={vat}
      entities={vats}
      onClose={onClose}
      onEntitySelect={onVatSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
