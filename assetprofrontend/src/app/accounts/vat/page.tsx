'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowLeft,
  Check,
  Ban,
  Percent,
  Eye,
} from 'lucide-react';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets } from '@/components/erp/PageHeader'
import { LoadingSpinner } from '@/components/erp';;
import { StatCard, StatCardsGrid, StatCardColors } from '@/components/erp/StatCard';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { vatApi } from '@/lib/api/accounts';
import { useEntityDetail, useEntityPermissions } from '@/hooks';
import type { Vat } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { useFlashStore } from '@/stores/flash';
import { VatDetailViewer } from './components/VatDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'VAT Management' },
];

export default function VatPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <VatPageContent />
    </Suspense>
  );
}

const fetchVatDetail = (id: number) => vatApi.get(id);

function VatPageContent() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('accounts', 'vat');

  const [vats, setVats] = useState<Vat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    selectedEntity: selectedVat,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handleVatSelect,
  } = useEntityDetail({
    basePath: '/accounts/vat',
    entities: vats,
    fetchDetail: fetchVatDetail,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vatApi.list();
      setVats(response.data);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to load VAT rates'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredVats = vats.filter(
    (vat) =>
      vat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vat.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeVats = vats.filter((v) => v.isActive).length;
  const standardRate = vats.find((v) => v.code === 'VAT-STD')?.rate || 7.5;

  const handleDelete = (vat: Vat) => {
    confirmDialog({
      message: `Are you sure you want to delete "${vat.name}" (${vat.code})? This action cannot be undone.`,
      header: 'Delete VAT Rate',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await vatApi.delete(vat.id);
          useFlashStore.getState().setFlash('VAT rate deleted successfully');
          if (selectedVat?.id === vat.id) closeDetail();
          loadData();
        } catch (err: unknown) {
          setError(extractErrorMessage(err, 'Failed to delete VAT rate'));
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
    ...(canCreate ? [{
      id: 'create',
      label: 'Add VAT Rate',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => router.push('/accounts/vat/create'),
    }] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />

      <PageHeader
        icon={Receipt}
        title="VAT Management"
        description="Manage Value Added Tax rates and GL account mappings"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <StatCardsGrid columns={3} className="mb-6">
        <StatCard title="Total VAT Rates" value={vats.length.toString()} icon={Receipt} color={StatCardColors.green} />
        <StatCard title="Active Rates" value={activeVats.toString()} subtitle={`of ${vats.length} total`} icon={Check} color={StatCardColors.blue} />
        <StatCard title="Standard Rate" value={`${standardRate}%`} icon={Percent} color={StatCardColors.purple} />
      </StatCardsGrid>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search VAT rates..."
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
                <th className="text-left px-6 py-3 text-sm font-medium">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Code</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Rate</th>
                <th className="text-left px-6 py-3 text-sm font-medium">GL Account</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredVats.map((vat) => (
                <tr
                  key={vat.id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors cursor-pointer',
                    selectedVat?.id === vat.id && 'bg-primary/5'
                  )}
                  onClick={() => openDetail(vat.id)}
                >
                  <td className="px-6 py-4 font-medium">{vat.name}</td>
                  <td className="px-6 py-4 font-mono text-sm">{vat.code}</td>
                  <td className="px-6 py-4 text-right font-medium">{Number(vat.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
                  <td className="px-6 py-4 text-sm">
                    {vat.accountCode ? (
                      <span>{vat.accountCode} - {vat.accountName}</span>
                    ) : (
                      <span className="text-muted-foreground">Not mapped</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {vat.isActive ? (
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
                      <button onClick={() => openDetail(vat.id)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEdit && (
                        <button onClick={() => router.push(`/accounts/vat/${vat.id}/edit`)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(vat)} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredVats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    {searchTerm ? 'No VAT rates found matching your search' : 'No VAT rates yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedVat && (
        <VatDetailViewer
          vat={selectedVat}
          vats={vats}
          onClose={closeDetail}
          onVatSelect={handleVatSelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
