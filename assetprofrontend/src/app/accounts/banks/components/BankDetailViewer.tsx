'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  FileText,
  Check,
  Ban,
  Wallet,
  Calendar,
  UserCheck,
  Phone,
  Mail,
  Globe,
} from 'lucide-react';
import { EntityDetailViewer, metadataTab } from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { Bank } from '@/lib/api/accounts';
import { banksApi } from '@/lib/api/accounts';
import {cn, formatCurrency} from '@/lib/utils';



// ============================================================================
// AUTHORIZED EMPLOYEES TAB
// ============================================================================

function AuthorizedEmployeesTab({ bank }: { bank: Bank }) {
  const { data: authorizations, isLoading } = useQuery({
    queryKey: ['bank-authorizations', bank.id],
    queryFn: () => banksApi.getAuthorizations(bank.id),
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  const auths = authorizations ?? [];

  if (auths.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No authorized employees for this bank</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h3 className="text-sm font-semibold">
          Authorized Employees
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            ({auths.length})
          </span>
        </h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">View</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">Deposit</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">Withdraw</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">Transfer</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Limit</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {auths.map((auth) => (
            <tr key={auth.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <UserCheck className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{auth.employeeName || `Employee #${auth.employeeId}`}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                {auth.canView ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <Ban className="h-4 w-4 text-gray-300 mx-auto" />}
              </td>
              <td className="px-4 py-3 text-center">
                {auth.canDeposit ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <Ban className="h-4 w-4 text-gray-300 mx-auto" />}
              </td>
              <td className="px-4 py-3 text-center">
                {auth.canWithdraw ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <Ban className="h-4 w-4 text-gray-300 mx-auto" />}
              </td>
              <td className="px-4 py-3 text-center">
                {auth.canTransfer ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <Ban className="h-4 w-4 text-gray-300 mx-auto" />}
              </td>
              <td className="px-4 py-3 text-right font-mono text-xs">
                {auth.maxAmount ? formatCurrency(auth.maxAmount, bank.currencyCode || 'NGN') : '-'}
              </td>
              <td className="px-4 py-3 text-center">
                {auth.isActive ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                    Inactive
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// DETAIL CONFIG
// ============================================================================

const bankDetailConfig: EntityDetailConfig<Bank> = {
  entityType: 'banks',
  basePath: '/accounts/banks',
  icon: Building2,
  title: (b) => b.name,
  subtitle: (b) => `${b.bankName} - ${b.accountNumber}`,
  sidebar: {
    title: (b) => b.name,
    subtitle: (b) => `${b.bankName} - ${b.accountNumber}`,
    searchKeys: ['title', 'subtitle'],
    statusIcon: (b) =>
      b.isActive ? (
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
          title: 'Bank Account Information',
          fields: [
            { label: 'Display Name', value: (b) => b.name },
            { label: 'Bank Name', value: (b) => b.bankName },
            { label: 'Account Number', value: (b) => b.accountNumber, mono: true },
            { label: 'Account Name', value: (b) => b.accountName || '-' },
            { label: 'Branch', value: (b) => b.branchCode || '-' },
            {
              label: 'Status',
              value: (b) =>
                b.isActive ? (
                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Check className="h-4 w-4" /> Active
                  </span>
                ) : (
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Ban className="h-4 w-4" /> Inactive
                  </span>
                ),
            },
            {
              label: 'SWIFT Code',
              value: (b) => <span className="font-mono">{b.swiftCode}</span>,
              hidden: (b) => !b.swiftCode,
            },
            {
              label: 'Routing Number',
              value: (b) => <span className="font-mono">{b.routingNumber}</span>,
              hidden: (b) => !b.routingNumber,
            },
          ],
        },
        {
          title: 'Contact Information',
          hidden: (b) => !b.contactPerson && !b.contactPhone && !b.contactEmail,
          fields: [
            {
              label: 'Contact Person',
              value: (b) => b.contactPerson || '-',
              hidden: (b) => !b.contactPerson,
            },
            {
              label: 'Phone',
              value: (b) => (
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {b.contactPhone}
                </span>
              ),
              hidden: (b) => !b.contactPhone,
            },
            {
              label: 'Email',
              value: (b) => (
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {b.contactEmail}
                </span>
              ),
              hidden: (b) => !b.contactEmail,
            },
          ],
        },
        {
          title: 'Balance Information',
          fields: [
            {
              label: 'Opening Balance',
              value: (b) => (
                <span className="flex items-center gap-2 text-lg font-medium">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  {formatCurrency(b.openingBalance, b.currencyCode || 'NGN')}
                </span>
              ),
            },
            {
              label: 'As of Date',
              value: (b) =>
                b.openingBalanceDate ? (
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(b.openingBalanceDate).toLocaleDateString()}
                  </span>
                ) : (
                  '-'
                ),
              hidden: (b) => !b.openingBalanceDate,
            },
          ],
        },
      ],
    },
    {
      id: 'authorizations',
      label: 'Authorized Employees',
      icon: UserCheck,
      render: (b) => <AuthorizedEmployeesTab bank={b} />,
    },
    metadataTab<Bank>(),
  ],
};

// ============================================================================
// COMPONENT
// ============================================================================

interface BankDetailViewerProps {
  bank: Bank;
  banks: Bank[];
  onClose: () => void;
  onBankSelect: (bank: Bank) => void;
  onDelete: (bank: Bank) => void;
  loading?: boolean;
}

export function BankDetailViewer({
  bank,
  banks,
  onClose,
  onBankSelect,
  onDelete,
  loading,
}: BankDetailViewerProps) {
  return (
    <EntityDetailViewer
      config={bankDetailConfig}
      entity={bank}
      entities={banks}
      onClose={onClose}
      onEntitySelect={onBankSelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
