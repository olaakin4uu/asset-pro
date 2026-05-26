'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { PageHeader, PageHeaderPresets, LoadingSpinner} from '@/components/erp';
import { accountsApi } from '@/lib/api/accounts';
import { extractErrorMessage } from '@/lib/utils';
import { History, Filter, Download, Search } from 'lucide-react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { AuditTrailViewer } from './components/AuditTrailViewer';

const breadcrumbs = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Accounts', href: '/accounts' },
  { title: 'Audit Trail' },
];

interface AuditEntry {
  id: number;
  entityType: string;
  entityId: number;
  entityName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  userId: number;
  userName: string;
  timestamp: Date;
  changes: FieldChange[];
  ipAddress: string;
  userAgent: string;
}

interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

const entityTypes = [
  { label: 'All Entities', value: '' },
  { label: 'Journal Entries', value: 'journal-entry' },
  { label: 'Chart of Accounts', value: 'account' },
  { label: 'Bank Transfers', value: 'bank-transfer' },
  { label: 'Expense Requests', value: 'expense-request' },
  { label: 'Opening Balances', value: 'opening-balance' },
];

const actionTypes = [
  { label: 'All Actions', value: '' },
  { label: 'Created', value: 'CREATE' },
  { label: 'Updated', value: 'UPDATE' },
  { label: 'Deleted', value: 'DELETE' },
];

export default function AuditTrailPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    loadAuditTrail();
  }, []);

  const loadAuditTrail = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await accountsApi.getAuditTrail({
        entityType: entityType || undefined,
        action: action || undefined,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        search: searchQuery || undefined,
      });
      // Map API response to local AuditEntry type
      const mapped: AuditEntry[] = result.data.map((e) => ({
        id: e.id,
        entityType: e.entityType,
        entityId: e.entityId,
        entityName: e.entityReference,
        action: e.action as AuditEntry['action'],
        userId: e.userId,
        userName: e.userName,
        timestamp: new Date(e.timestamp),
        changes: e.changes.map((c) => ({
          field: c.fieldName,
          oldValue: c.oldValue,
          newValue: c.newValue,
        })),
        ipAddress: e.ipAddress || '',
        userAgent: e.userAgent || '',
      }));
      setEntries(mapped);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadAuditTrail();
  };

  const exportToExcel = async () => {
    try {
      await accountsApi.exportAuditTrail({
        entityType: entityType || undefined,
        action: action || undefined,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        search: searchQuery || undefined,
      });
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const pageActions = [
    {
      id: 'export',
      label: 'Export Excel',
      icon: Download,
      variant: 'outline' as const,
      onClick: exportToExcel,
    },
  ];

  if (selectedEntry) {
    return (
      <AuditTrailViewer
        entry={selectedEntry}
        entries={entries}
        onClose={() => setSelectedEntry(null)}
        onEntrySelect={setSelectedEntry}
      />
    );
  }

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <PageHeader
        {...PageHeaderPresets.financial}
        icon={History}
        title="Audit Trail"
        description="Field-level change tracking with detailed diff viewer"
        actions={pageActions}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type
            </label>
            <Dropdown
              value={entityType}
              onChange={(e) => setEntityType(e.value)}
              options={entityTypes}
              placeholder="All Entities"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <Dropdown
              value={action}
              onChange={(e) => setAction(e.value)}
              options={actionTypes}
              placeholder="All Actions"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <Calendar
              value={startDate}
              onChange={(e) => setStartDate(e.value as Date)}
              dateFormat="dd/mm/yy"
              showIcon
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <Calendar
              value={endDate}
              onChange={(e) => setEndDate(e.value as Date)}
              dateFormat="dd/mm/yy"
              showIcon
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="p-inputgroup">
              <InputText
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="User, entity..."
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button icon="pi pi-search" onClick={handleSearch} />
            </div>
          </div>
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Change History</h3>
          <p className="text-sm text-gray-600 mt-1">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
        <LoadingSpinner fullPage />
      ) : entries.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <History className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No audit entries found</p>
              <p className="text-sm">
                Adjust filters or check back later for recorded changes
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Changes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {entry.userName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {entry.ipAddress}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getActionColor(
                          entry.action
                        )}`}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {entry.entityName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {entry.entityType}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.changes.length}{' '}
                      {entry.changes.length === 1 ? 'field' : 'fields'} changed
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Button
                        label="View Details"
                        icon="pi pi-eye"
                        size="small"
                        outlined
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEntry(entry);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </TenantLayout>
  );
}
