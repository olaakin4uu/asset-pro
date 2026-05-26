'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Search,
  ArrowLeft,
  Check,
  Ban,
  FileText,
  Wallet,
  Eye,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { LoadingSpinner, ErrorBanner } from '@/components/erp';
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { banksApi } from '@/lib/api/accounts';
import {useEntityDetail, useEntityPermissions, useCurrencyFormat, getCurrencySymbol } from '@/hooks';
import type { Bank } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { BankDetailViewer } from './components/BankDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Bank Accounts' },
];

export default function BanksPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <BanksPageContent />
    </Suspense>
  );
}

const fetchBankDetail = (id: number) => banksApi.get(id);

function BanksPageContent() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('accounts', 'banks');

  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data: banksData, isLoading: loading, error: fetchError } = useQuery({
    queryKey: ['accounts-banks'],
    queryFn: () => banksApi.list(),
  });

  const banks = banksData?.data ?? [];
  const error = mutationError || (fetchError ? extractErrorMessage(fetchError, 'Failed to load bank accounts') : null);

  const {
    selectedEntity: selectedBank,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handleBankSelect,
  } = useEntityDetail({
    basePath: '/accounts/banks',
    entities: banks,
    fetchDetail: fetchBankDetail,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['accounts-banks'] });
  const { formatCurrency } = useCurrencyFormat();

  const formatBankAmount = (amount: number | null, currencyCode: string) => {
    const val = Number(amount) || 0;
    const symbol = getCurrencySymbol(currencyCode || 'NGN');
    return `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const filteredBanks = banks.filter(
    (bank) =>
      bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bank.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bank.accountNumber.includes(searchTerm)
  );

  const totalBalance = banks.reduce((sum, bank) => sum + (Number(bank.openingBalance) || 0), 0);
  const activeBanks = banks.filter((bank) => bank.isActive).length;

  const handleDelete = (bank: Bank) => {
    confirmDialog({
      message: `Are you sure you want to delete "${bank.name}"? This action cannot be undone.`,
      header: 'Delete Bank Account',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await banksApi.delete(bank.id);
          if (selectedBank?.id === bank.id) closeDetail();
          refresh();
        } catch (err: unknown) {
          setMutationError(extractErrorMessage(err, 'Failed to delete bank account'));
        }
      },
    });
  };

  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/accounts'),
    },
    ...(canCreate ? [
      {
        id: 'transfer',
        label: 'Bank Transfer',
        icon: ArrowLeftRight,
        variant: 'outline' as const,
        onClick: () => router.push('/accounts/bank-transfers/create'),
      },
      {
        id: 'create',
        label: 'Add Bank',
        icon: Plus,
        variant: 'default' as const,
        onClick: () => router.push('/accounts/banks/create'),
      },
    ] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />

      <PageHeader
        icon={Building2}
        title="Bank Accounts"
        description="Manage your bank accounts and transfers"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <StatCardsGrid columns={3} className="mb-6">
        <StatCard title="Total Balance" value={formatCurrency(totalBalance)} icon={Wallet} color={StatCardColors.green} />
        <StatCard title="Active Banks" value={activeBanks.toString()} subtitle={`of ${banks.length} total`} icon={Building2} color={StatCardColors.blue} />
        <StatCard title="Total Banks" value={banks.length.toString()} icon={FileText} color={StatCardColors.purple} />
      </StatCardsGrid>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search banks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && <LoadingSpinner fullPage />}

      {!loading && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium">Bank Account</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Account Number</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Bank</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Currency</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Opening Balance</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredBanks.map((bank) => (
                <tr
                  key={bank.id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors cursor-pointer',
                    selectedBank?.id === bank.id && 'bg-primary/5'
                  )}
                  onClick={() => openDetail(bank.id)}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium">{bank.name}</div>
                    {bank.accountName && (
                      <div className="text-sm text-muted-foreground">{bank.accountName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">{bank.accountNumber}</td>
                  <td className="px-6 py-4">
                    <div>{bank.bankName}</div>
                    {bank.branchCode && (
                      <div className="text-sm text-muted-foreground">{bank.branchCode}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                      {getCurrencySymbol(bank.currencyCode)} {bank.currencyCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatBankAmount(bank.openingBalance, bank.currencyCode)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {bank.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                        <Ban className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openDetail(bank.id)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEdit && (
                        <button onClick={() => router.push(`/accounts/banks/${bank.id}/edit`)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(bank)} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBanks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    {searchTerm ? 'No banks found matching your search' : 'No bank accounts yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedBank && (
        <BankDetailViewer
          bank={selectedBank}
          banks={banks}
          onClose={closeDetail}
          onBankSelect={handleBankSelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
