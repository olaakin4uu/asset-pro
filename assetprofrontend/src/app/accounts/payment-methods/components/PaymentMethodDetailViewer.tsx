'use client';

import React from 'react';
import {
  CreditCard,
  FileText,
  Check,
  Ban,
  Banknote,
  Building2,
  Smartphone,
} from 'lucide-react';
import { EntityDetailViewer, metadataTab } from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { PaymentMethod } from '@/lib/api/accounts';

const PAYMENT_TYPES = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
  { value: 'cheque', label: 'Cheque', icon: CreditCard },
];

const getPaymentTypeLabel = (type: string) =>
  PAYMENT_TYPES.find((t) => t.value === type)?.label || type;

const getPaymentTypeIcon = (type: string) =>
  PAYMENT_TYPES.find((t) => t.value === type)?.icon || CreditCard;

const paymentMethodDetailConfig: EntityDetailConfig<PaymentMethod> = {
  entityType: 'payment-methods',
  basePath: '/accounts/payment-methods',
  icon: CreditCard,
  title: (m) => m.name,
  subtitle: (m) => m.code,
  sidebar: {
    title: (m) => m.name,
    subtitle: (m) => m.code,
    searchKeys: ['title', 'subtitle'],
    badges: (m) => [
      {
        label: getPaymentTypeLabel(m.type),
        className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      },
    ],
    statusIcon: (m) =>
      m.isActive ? (
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
          title: 'Payment Method Information',
          fields: [
            { label: 'Name', value: (m) => m.name },
            { label: 'Code', value: (m) => m.code, mono: true },
            {
              label: 'Type',
              value: (m) => {
                const TypeIcon = getPaymentTypeIcon(m.type);
                return (
                  <span className="flex items-center gap-2">
                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    {getPaymentTypeLabel(m.type)}
                  </span>
                );
              },
            },
            {
              label: 'Requires Reference',
              value: (m) =>
                m.requiresRef ? (
                  <span className="inline-flex items-center gap-1 text-blue-600">
                    <Check className="h-4 w-4" /> Yes
                  </span>
                ) : (
                  'No'
                ),
            },
            {
              label: 'Description',
              value: (m) => m.description,
              span: 2,
              hidden: (m) => !m.description,
            },
          ],
        },
      ],
    },
    metadataTab<PaymentMethod>(),
  ],
};

interface PaymentMethodDetailViewerProps {
  paymentMethod: PaymentMethod;
  paymentMethods: PaymentMethod[];
  onClose: () => void;
  onMethodSelect: (method: PaymentMethod) => void;
  onDelete: (method: PaymentMethod) => void;
  loading?: boolean;
}

export function PaymentMethodDetailViewer({
  paymentMethod,
  paymentMethods,
  onClose,
  onMethodSelect,
  onDelete,
  loading,
}: PaymentMethodDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={paymentMethodDetailConfig}
      entity={paymentMethod}
      entities={paymentMethods}
      onClose={onClose}
      onEntitySelect={onMethodSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
