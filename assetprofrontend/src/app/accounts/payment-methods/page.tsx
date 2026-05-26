'use client';

import { Suspense } from 'react';
import { extractErrorMessage } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowLeft,
  Check,
  Ban,
  Banknote,
  Smartphone,
  Building2,
  Eye,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { LoadingSpinner } from '@/components/erp';;
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { paymentMethodsApi } from '@/lib/api/accounts';
import { useEntityDetail, useEntityPermissions } from '@/hooks';
import type { PaymentMethod } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { cn } from '@/lib/utils';
import { PaymentMethodDetailViewer } from './components/PaymentMethodDetailViewer';

// ============================================================================
// BREADCRUMBS
// ============================================================================

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Payment Methods' },
];

// ============================================================================
// PAYMENT TYPES
// ============================================================================

const PAYMENT_TYPES = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
  { value: 'cheque', label: 'Cheque', icon: CreditCard },
];

const getPaymentTypeLabel = (type: string) => {
  return PAYMENT_TYPES.find((t) => t.value === type)?.label || type;
};

const getPaymentTypeIcon = (type: string) => {
  return PAYMENT_TYPES.find((t) => t.value === type)?.icon || CreditCard;
};

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PaymentMethodsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <PaymentMethodsPageContent />
    </Suspense>
  );
}

const fetchMethodDetail = (id: number) => paymentMethodsApi.get(id);

function PaymentMethodsPageContent() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('accounts', 'payment-methods');

  // Data state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    selectedEntity: selectedMethod,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handleMethodSelect,
  } = useEntityDetail({
    basePath: '/accounts/payment-methods',
    entities: paymentMethods,
    fetchDetail: fetchMethodDetail,
  });

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await paymentMethodsApi.list();
      setPaymentMethods(response.data);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to load payment methods'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter payment methods
  const filteredMethods = paymentMethods.filter(
    (method) =>
      method.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      method.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPaymentTypeLabel(method.type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const activeMethods = paymentMethods.filter((m) => m.isActive).length;
  const byType = PAYMENT_TYPES.reduce(
    (acc, type) => {
      acc[type.value] = paymentMethods.filter((m) => m.type === type.value).length;
      return acc;
    },
    {} as Record<string, number>
  );

  // Handle delete
  const handleDelete = (method: PaymentMethod) => {
    confirmDialog({
      message: `Are you sure you want to delete "${method.name}" (${method.code})? This action cannot be undone.`,
      header: 'Delete Payment Method',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await paymentMethodsApi.delete(method.id);
          if (selectedMethod?.id === method.id) closeDetail();
          loadData();
        } catch (err: unknown) {
          setError(extractErrorMessage(err, 'Failed to delete payment method'));
        }
      },
    });
  };

  // Page actions
  const pageActions = [
    {
      id: 'back',
      label: 'Back',
      icon: ArrowLeft,
      variant: 'outline' as const,
      onClick: () => router.push('/accounts'),
    },
    ...(canCreate ? [{
      id: 'create',
      label: 'Add Method',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => router.push('/accounts/payment-methods/create'),
    }] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />

      <PageHeader
        icon={CreditCard}
        title="Payment Methods"
        description="Manage payment methods and configurations"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      {/* Stats */}
      <StatCardsGrid columns={4} className="mb-6">
        <StatCard
          title="Total Methods"
          value={paymentMethods.length.toString()}
          icon={CreditCard}
          color={StatCardColors.green}
        />
        <StatCard
          title="Active Methods"
          value={activeMethods.toString()}
          subtitle={`of ${paymentMethods.length} total`}
          icon={Check}
          color={StatCardColors.blue}
        />
        <StatCard
          title="Bank Transfers"
          value={byType.bank_transfer?.toString() || '0'}
          icon={Building2}
          color={StatCardColors.purple}
        />
        <StatCard
          title="Mobile Money"
          value={byType.mobile_money?.toString() || '0'}
          icon={Smartphone}
          color={StatCardColors.amber}
        />
      </StatCardsGrid>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search payment methods..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && <LoadingSpinner fullPage />}

      {/* Payment Methods Table */}
      {!loading && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium">Method</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Code</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Type</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Requires Ref</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredMethods.map((method) => {
                const TypeIcon = getPaymentTypeIcon(method.type);
                return (
                  <tr
                    key={method.id}
                    className={cn(
                      'hover:bg-muted/30 transition-colors cursor-pointer',
                      selectedMethod?.id === method.id && 'bg-primary/5'
                    )}
                    onClick={() => openDetail(method.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium">{method.name}</div>
                      {method.description && (
                        <div className="text-sm text-muted-foreground">{method.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{method.code}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{getPaymentTypeLabel(method.type)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {method.requiresRef ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                          <Check className="h-3 w-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {method.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                          <Check className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                          <Ban className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openDetail(method.id)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => router.push(`/accounts/payment-methods/${method.id}/edit`)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(method)}
                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredMethods.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    {searchTerm ? 'No payment methods found matching your search' : 'No payment methods yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedMethod && (
        <PaymentMethodDetailViewer
          paymentMethod={selectedMethod}
          paymentMethods={paymentMethods}
          onClose={closeDetail}
          onMethodSelect={handleMethodSelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
