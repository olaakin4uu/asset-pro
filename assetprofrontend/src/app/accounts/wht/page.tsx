'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
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
import { whtApi } from '@/lib/api/accounts';
import { useEntityDetail, useEntityPermissions } from '@/hooks';
import type { Wht } from '@/lib/api/accounts';
import type { BreadcrumbItem } from '@/types/core';
import { cn, extractErrorMessage } from '@/lib/utils';
import { WhtDetailViewer } from './components/WhtDetailViewer';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'WHT Management' },
];

export default function WhtPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <WhtPageContent />
    </Suspense>
  );
}

const fetchWhtDetail = (id: number) => whtApi.get(id);

function WhtPageContent() {
  const router = useRouter();
  const { canCreate, canEdit, canDelete } = useEntityPermissions('accounts', 'wht');

  const [whts, setWhts] = useState<Wht[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    selectedEntity: selectedWht,
    detailLoading,
    openDetail,
    closeDetail,
    handleEntitySelect: handleWhtSelect,
  } = useEntityDetail({
    basePath: '/accounts/wht',
    entities: whts,
    fetchDetail: fetchWhtDetail,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await whtApi.list();
      setWhts(response.data);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to load WHT rates'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredWhts = whts.filter(
    (wht) =>
      wht.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wht.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeWhts = whts.filter((w) => w.isActive).length;
  const avgRate = whts.length > 0 ? whts.reduce((acc, w) => acc + Number(w.rate), 0) / whts.length : 0;

  const handleDelete = (wht: Wht) => {
    confirmDialog({
      message: `Are you sure you want to delete "${wht.name}" (${wht.code})? This action cannot be undone.`,
      header: 'Delete WHT Rate',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await whtApi.delete(wht.id);
          if (selectedWht?.id === wht.id) closeDetail();
          loadData();
        } catch (err: unknown) {
          setError(extractErrorMessage(err, 'Failed to delete WHT rate'));
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
      label: 'Add WHT Rate',
      icon: Plus,
      variant: 'default' as const,
      onClick: () => router.push('/accounts/wht/create'),
    }] : []),
  ];

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <ConfirmDialog />

      <PageHeader
        icon={FileText}
        title="WHT Management"
        description="Manage Withholding Tax rates and GL account mappings"
        actions={pageActions}
        {...PageHeaderPresets.financial}
      />

      <StatCardsGrid columns={3} className="mb-6">
        <StatCard title="Total WHT Rates" value={whts.length.toString()} icon={FileText} color={StatCardColors.green} />
        <StatCard title="Active Rates" value={activeWhts.toString()} subtitle={`of ${whts.length} total`} icon={Check} color={StatCardColors.blue} />
        <StatCard title="Average Rate" value={`${avgRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`} icon={Percent} color={StatCardColors.purple} />
      </StatCardsGrid>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search WHT rates..."
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
                <th className="text-left px-6 py-3 text-sm font-medium">Description</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredWhts.map((wht) => (
                <tr
                  key={wht.id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors cursor-pointer',
                    selectedWht?.id === wht.id && 'bg-primary/5'
                  )}
                  onClick={() => openDetail(wht.id)}
                >
                  <td className="px-6 py-4 font-medium">{wht.name}</td>
                  <td className="px-6 py-4 font-mono text-sm">{wht.code}</td>
                  <td className="px-6 py-4 text-right font-medium">{Number(wht.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</td>
                  <td className="px-6 py-4 text-sm">
                    {wht.accountCode ? (
                      <span>{wht.accountCode} - {wht.accountName}</span>
                    ) : (
                      <span className="text-muted-foreground">Not mapped</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                    {wht.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {wht.isActive ? (
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
                      <button onClick={() => openDetail(wht.id)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEdit && (
                        <button onClick={() => router.push(`/accounts/wht/${wht.id}/edit`)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(wht)} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredWhts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    {searchTerm ? 'No WHT rates found matching your search' : 'No WHT rates yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedWht && (
        <WhtDetailViewer
          wht={selectedWht}
          whts={whts}
          onClose={closeDetail}
          onWhtSelect={handleWhtSelect}
          onDelete={handleDelete}
          loading={detailLoading}
        />
      )}
    </TenantLayout>
  );
}
