'use client';

import React from 'react';
import { FileText, Check, Ban } from 'lucide-react';
import { EntityDetailViewer, metadataTab } from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { Wht } from '@/lib/api/accounts';

const whtDetailConfig: EntityDetailConfig<Wht> = {
  entityType: 'wht',
  basePath: '/accounts/wht',
  icon: FileText,
  title: (w) => w.name,
  subtitle: (w) => w.code,
  sidebar: {
    title: (w) => w.name,
    subtitle: (w) => `${w.code} - ${Number(w.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
    searchKeys: ['title', 'subtitle'],
    statusIcon: (w) =>
      w.isActive ? (
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
          title: 'WHT Information',
          fields: [
            { label: 'Name', value: (w) => w.name },
            { label: 'Code', value: (w) => w.code, mono: true },
            {
              label: 'Rate',
              value: (w) => <span className="text-lg">{Number(w.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>,
            },
            {
              label: 'GL Account',
              value: (w) =>
                w.accountCode ? (
                  `${w.accountCode} - ${w.accountName}`
                ) : (
                  <span className="text-muted-foreground">Not mapped</span>
                ),
            },
            {
              label: 'Description',
              value: (w) => w.description,
              span: 2,
              hidden: (w) => !w.description,
            },
          ],
        },
      ],
    },
    metadataTab<Wht>(),
  ],
};

interface WhtDetailViewerProps {
  wht: Wht;
  whts: Wht[];
  onClose: () => void;
  onWhtSelect: (wht: Wht) => void;
  onDelete: (wht: Wht) => void;
  loading?: boolean;
}

export function WhtDetailViewer({
  wht,
  whts,
  onClose,
  onWhtSelect,
  onDelete,
  loading,
}: WhtDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={whtDetailConfig}
      entity={wht}
      entities={whts}
      onClose={onClose}
      onEntitySelect={onWhtSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
