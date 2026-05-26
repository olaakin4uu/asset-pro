'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TenantLayout } from '@/components/tenant/TenantLayout';
import { DetailShell, Toolbar } from '@/components/erp';
import { useDetailTabs } from '@/hooks/useDetailTabs';
import { useDetailSidebar, type SidebarItem } from '@/hooks/useDetailSidebar';
import { useToolbar } from '@/hooks/useToolbar';
import {
  History,
  FileText,
  GitCompare,
  User,
  Clock,
  MapPin,
  Monitor,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Badge } from 'primereact/badge';

interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

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

interface AuditEntrySidebarItem extends SidebarItem {
  action: string;
  userName: string;
  timestamp: Date;
  changeCount: number;
}

interface AuditTrailViewerProps {
  entry: AuditEntry;
  entries: AuditEntry[];
  onClose: () => void;
  onEntrySelect: (entry: AuditEntry) => void;
}

export function AuditTrailViewer({
  entry,
  entries,
  onClose,
  onEntrySelect,
}: AuditTrailViewerProps) {
  const router = useRouter();
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Accounts', href: '/accounts' },
    { title: 'Audit Trail', href: '/accounts/audit-trail' },
    { title: entry.entityName },
  ];

  // Convert entries to sidebar items
  const sidebarItems: AuditEntrySidebarItem[] = entries.map((e) => ({
    id: e.id,
    title: e.entityName,
    subtitle: new Date(e.timestamp).toLocaleString(),
    badges: [
      {
        label: e.action,
        variant:
          e.action === 'CREATE'
            ? 'success'
            : e.action === 'DELETE'
            ? 'destructive'
            : 'default',
      },
    ],
    action: e.action,
    userName: e.userName,
    timestamp: e.timestamp,
    changeCount: e.changes.length,
  }));

  const sidebar = useDetailSidebar({
    items: sidebarItems,
    selectedId: entry.id,
    searchKeys: ['title', 'subtitle', 'userName'],
    onItemSelect: (item) => {
      const selected = entries.find((e) => e.id === item.id);
      if (selected) onEntrySelect(selected);
    },
  });

  const tabs = useDetailTabs({
    tabs: [
      { id: 'overview', label: 'Overview', icon: FileText },
      { id: 'changes', label: 'Field Changes', icon: GitCompare },
      { id: 'metadata', label: 'Metadata', icon: User },
    ],
    defaultTab: 'overview',
  });

  const toolbar = useToolbar({
    entity: entry!,
    entityType: 'audit-entries',
    onExport: async (format) => {
      console.log(`Export audit entry ${entry.id} as ${format}`);
    },
    onPrint: async (options) => {
      console.log('Print audit entry', options);
    },
  });

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

  const toggleFieldExpansion = (field: string) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(field)) {
      newExpanded.delete(field);
    } else {
      newExpanded.add(field);
    }
    setExpandedFields(newExpanded);
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const renderValueDiff = (change: FieldChange) => {
    const isExpanded = expandedFields.has(change.field);
    const oldValue = formatValue(change.oldValue);
    const newValue = formatValue(change.newValue);

    return (
      <div className="border border-gray-200 rounded-lg p-4 mb-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleFieldExpansion(change.field)}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
            <span className="font-medium text-gray-900">{change.field}</span>
          </div>
          <span className="text-sm text-gray-500">
            {change.oldValue ? 'Modified' : 'Added'}
          </span>
        </div>

        {isExpanded && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">
                Old Value
              </div>
              <pre className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-900 overflow-x-auto">
                {oldValue}
              </pre>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">
                New Value
              </div>
              <pre className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-900 overflow-x-auto">
                {newValue}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <TenantLayout breadcrumbs={breadcrumbs}>
      <DetailShell
        open={true}
        onOpenChange={(open) => !open && onClose()}
        title={`Audit Entry: ${entry.entityName}`}
        headerActions={<Toolbar toolbar={toolbar} onClose={onClose} />}
      >
        <DetailShell.Layout>
          <DetailShell.Body>
            <DetailShell.Sidebar collapsed={sidebar.isCollapsed}>
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <InputText
                    value={sidebar.searchQuery}
                    onChange={(e) => sidebar.setSearchQuery(e.target.value)}
                    placeholder="Search entries..."
                    className="w-full pl-10"
                  />
                </div>
              </div>

              <div className="overflow-y-auto">
                {sidebar.filteredItems.map((item) => {
                  const auditItem = item as AuditEntrySidebarItem;
                  return (
                    <div
                      key={item.id}
                      onClick={() => sidebar.selectItem(item)}
                      className={`p-4 border-b border-gray-200 cursor-pointer transition-colors ${
                        sidebar.isSelected(item)
                          ? 'bg-blue-50 border-l-4 border-l-blue-600'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-sm text-gray-900">
                          {item.title}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${getActionColor(
                            auditItem.action
                          )}`}
                        >
                          {auditItem.action}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {item.subtitle}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {auditItem.userName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {auditItem.changeCount} changes
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DetailShell.Sidebar>

            <DetailShell.Main>
              <DetailShell.Tabs>
                {tabs.tabs.map((tab) => (
                  <DetailShell.Tab
                    key={tab.id}
                    active={tabs.activeTab === tab.id}
                    onClick={() => tabs.setActiveTab(tab.id)}
                  >
                    {(() => { const TabIcon = tab.icon; return TabIcon ? <TabIcon className="w-4 h-4" /> : null; })()}
                    <span>{tab.label}</span>
                  </DetailShell.Tab>
                ))}
              </DetailShell.Tabs>

              <DetailShell.Content>
                {tabs.activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Audit Entry Details
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Entity Type
                          </label>
                          <p className="text-gray-900">{entry.entityType}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Entity Name
                          </label>
                          <p className="text-gray-900">{entry.entityName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Action
                          </label>
                          <span
                            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getActionColor(
                              entry.action
                            )}`}
                          >
                            {entry.action}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Timestamp
                          </label>
                          <p className="text-gray-900">
                            {new Date(entry.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            User
                          </label>
                          <p className="text-gray-900">{entry.userName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Changes Made
                          </label>
                          <p className="text-gray-900">
                            {entry.changes.length}{' '}
                            {entry.changes.length === 1 ? 'field' : 'fields'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tabs.activeTab === 'changes' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Field-Level Changes
                    </h3>
                    {entry.changes.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <GitCompare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium mb-2">No Changes</p>
                        <p className="text-sm">
                          This entry has no field changes recorded
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {entry.changes.map((change, idx) => (
                          <div key={idx}>{renderValueDiff(change)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tabs.activeTab === 'metadata' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">
                        Request Metadata
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-gray-600" />
                            <label className="text-sm font-medium text-gray-700">
                              IP Address
                            </label>
                          </div>
                          <p className="text-gray-900 font-mono">
                            {entry.ipAddress}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <label className="text-sm font-medium text-gray-700">
                              Timestamp
                            </label>
                          </div>
                          <p className="text-gray-900">
                            {new Date(entry.timestamp).toISOString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Monitor className="w-4 h-4 text-gray-600" />
                        <label className="text-sm font-medium text-gray-700">
                          User Agent
                        </label>
                      </div>
                      <p className="text-gray-900 text-sm font-mono break-all">
                        {entry.userAgent}
                      </p>
                    </div>
                  </div>
                )}
              </DetailShell.Content>
            </DetailShell.Main>
          </DetailShell.Body>
        </DetailShell.Layout>
      </DetailShell>
    </TenantLayout>
  );
}
