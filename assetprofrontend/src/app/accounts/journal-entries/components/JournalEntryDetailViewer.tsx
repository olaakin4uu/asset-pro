'use client';

import React from 'react';
import {
  FileText,
  Clock,
  CheckCircle,
  Hash,
  BookOpen,
  ArrowRight,
  AlertCircle,
  Send,
  Undo2,
  RotateCcw,
} from 'lucide-react';
import {
  EntityDetailViewer,
  metadataTab,
} from '@/components/erp';
import type { EntityDetailConfig } from '@/components/erp';
import type { JournalEntry, JournalEntryLine } from '@/lib/api/accounts';
import {cn, formatCurrency} from '@/lib/utils';
import { useCurrencyFormat } from '@/hooks';

// ============================================================================
// STATUS STYLES
// ============================================================================

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  posted: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  reversed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  draft: FileText,
  pending: Clock,
  posted: CheckCircle,
  reversed: RotateCcw,
};

const JOURNAL_TYPE_STYLES: Record<string, string> = {
  general: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  adjusting: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  closing: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  opening: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
};

// ============================================================================
// FORMAT HELPERS
// ============================================================================



function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// CUSTOM RENDER: JOURNAL LINES TABLE
// ============================================================================

function JournalLinesTable({ entry }: { entry: JournalEntry }) {
  const lines = entry.lines || [];

  if (lines.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">No Journal Lines</h3>
        <p className="text-sm text-muted-foreground mt-1">
          This entry has no line items recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <BookOpen className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Journal Lines</h3>
        <span className="ml-auto text-sm text-muted-foreground">{lines.length} lines</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium">Account</th>
              <th className="text-left px-6 py-3 text-sm font-medium">Narration</th>
              <th className="text-right px-6 py-3 text-sm font-medium">Debit</th>
              <th className="text-right px-6 py-3 text-sm font-medium">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lines.map((line: JournalEntryLine) => (
              <tr key={line.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-3">
                  <div className="font-medium text-sm">
                    {line.account_code
                      ? `${line.account_code} - ${line.account_name}`
                      : `Account #${line.accountId}`}
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-muted-foreground">
                  {line.narration || '\u2014'}
                </td>
                <td className="px-6 py-3 text-right font-mono text-sm">
                  {line.debit ? formatCurrency(line.debit) : '\u2014'}
                </td>
                <td className="px-6 py-3 text-right font-mono text-sm">
                  {line.credit ? formatCurrency(line.credit) : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 bg-muted/30">
            <tr>
              <td colSpan={2} className="px-6 py-3 text-right font-semibold text-sm">
                Totals
              </td>
              <td className="px-6 py-3 text-right font-mono font-semibold text-sm">
                {formatCurrency(entry.totalDebit)}
              </td>
              <td className="px-6 py-3 text-right font-mono font-semibold text-sm">
                {formatCurrency(entry.totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// CUSTOM RENDER: WORKFLOW ACTIONS
// ============================================================================

interface WorkflowActionsProps {
  entry: JournalEntry;
  onPost?: (entry: JournalEntry) => void;
  onReverse?: (entry: JournalEntry) => void;
}

function WorkflowActions({ entry, onPost, onReverse }: WorkflowActionsProps) {
  const isPostable = entry.status === 'draft' || entry.status === 'pending';
  const isReversible = entry.status === 'posted';
  const isBalanced = Math.abs(entry.totalDebit - entry.totalCredit) < 0.01;

  if (!isPostable && !isReversible) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Workflow Actions</h3>
      </div>

      {isPostable && (
        <div className="space-y-3">
          {!isBalanced && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Entry is not balanced. Debits and credits must be equal before posting.
              </p>
            </div>
          )}
          <button
            onClick={() => onPost?.(entry)}
            disabled={!isBalanced}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
              isBalanced
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
            )}
          >
            <Send className="h-4 w-4" />
            Post Journal Entry
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Posting will update the general ledger. This cannot be undone (only reversed).
          </p>
        </div>
      )}

      {isReversible && (
        <div className="space-y-3">
          <button
            onClick={() => onReverse?.(entry)}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            <Undo2 className="h-4 w-4" />
            Reverse Journal Entry
          </button>
          <p className="text-xs text-muted-foreground text-center">
            A reversal entry will be created to offset this entry.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CUSTOM RENDER: TOTALS SUMMARY
// ============================================================================

function TotalsSummary({ entry }: { entry: JournalEntry }) {
  const isBalanced = Math.abs(entry.totalDebit - entry.totalCredit) < 0.01;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
          <ArrowRight className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Debit</p>
          <p className="text-lg font-bold font-mono">{formatCurrency(entry.totalDebit)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400 rotate-180" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Credit</p>
          <p className="text-lg font-bold font-mono">{formatCurrency(entry.totalCredit)}</p>
        </div>
      </div>
      <div className="pt-3 border-t">
        <div className="flex items-center gap-2">
          {isBalanced ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}
          >
            {isBalanced ? 'Balanced' : 'Not Balanced'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <Hash className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Line Items</p>
          <p className="font-bold">{entry.lines?.length || 0}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// WRAPPER COMPONENT
// ============================================================================

interface JournalEntryDetailViewerProps {
  entry: JournalEntry;
  entries: JournalEntry[];
  onClose: () => void;
  onEntrySelect: (entry: JournalEntry) => void;
  onDelete: (entry: JournalEntry) => void;
  onRefresh?: () => void;
  onPost?: (entry: JournalEntry) => void;
  onReverse?: (entry: JournalEntry) => void;
  loading?: boolean;
}

export function JournalEntryDetailViewer({
  entry,
  entries,
  onClose,
  onEntrySelect,
  onDelete,
  onRefresh,
  onPost,
  onReverse,
  loading,
}: JournalEntryDetailViewerProps) {
  // Config is defined INSIDE the wrapper so render functions can access handlers
  const journalEntryDetailConfig: EntityDetailConfig<JournalEntry> = {
    entityType: 'journal-entries',
    basePath: '/accounts/journal-entries',
    icon: FileText,
    title: (e) => e.entryNumber,
    subtitle: (e) => e.narration || 'Journal Entry',
    sidebar: {
      title: (e) => e.entryNumber,
      subtitle: (e) => formatDate(e.entryDate),
      searchKeys: ['title', 'subtitle'],
      badges: (e) => {
        const badges = [
          {
            label: e.status,
            className: STATUS_STYLES[e.status] || STATUS_STYLES.draft,
          },
        ];
        if (e.journalType) {
          badges.push({
            label: e.journalType,
            className: JOURNAL_TYPE_STYLES[e.journalType] || JOURNAL_TYPE_STYLES.general,
          });
        }
        return badges;
      },
      statusIcon: (e) => {
        const Icon = STATUS_ICONS[e.status] || FileText;
        const colorMap: Record<string, string> = {
          draft: 'text-gray-400',
          pending: 'text-yellow-500',
          posted: 'text-green-500',
          reversed: 'text-red-500',
        };
        return <Icon className={cn('h-3.5 w-3.5', colorMap[e.status] || 'text-gray-400')} />;
      },
    },
    toolbar: {
      showExport: true,
      showPrint: true,
      showEdit: true,
      showDelete: true,
    },
    tabs: [
      {
        id: 'overview',
        label: 'Overview',
        icon: FileText,
        sections: [
          {
            title: 'Entry Information',
            span: 'main',
            fields: [
              { label: 'Entry Number', value: (e) => e.entryNumber, mono: true },
              { label: 'Entry Date', value: (e) => formatDate(e.entryDate) },
              { label: 'Reference', value: (e) => e.reference || '\u2014' },
              {
                label: 'Status',
                value: (e) => {
                  const Icon = STATUS_ICONS[e.status] || FileText;
                  return (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize',
                        STATUS_STYLES[e.status] || STATUS_STYLES.draft
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {e.status}
                    </span>
                  );
                },
              },
              {
                label: 'Journal Type',
                value: (e) => (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize',
                      JOURNAL_TYPE_STYLES[e.journalType || 'general'] || JOURNAL_TYPE_STYLES.general
                    )}
                  >
                    {e.journalType || 'general'}
                  </span>
                ),
              },
              {
                label: 'Source',
                value: (e) =>
                  e.sourceType
                    ? `${e.sourceType}${e.sourceId ? ` #${e.sourceId}` : ''}`
                    : 'Manual',
              },
              {
                label: 'Narration',
                value: (e) => (
                  <span className="text-sm whitespace-pre-wrap">{e.narration || '\u2014'}</span>
                ),
                span: 2,
                hidden: (e) => !e.narration,
              },
              {
                label: 'Posted On',
                value: (e) => formatDateTime(e.postedAt),
                hidden: (e) => !e.postedAt,
              },
              {
                label: 'Reversed On',
                value: (e) => (
                  <span className="text-red-600 dark:text-red-400">
                    {formatDateTime(e.reversedAt)}
                  </span>
                ),
                hidden: (e) => !e.reversedAt,
              },
              {
                label: 'Reversal Of',
                value: (e) => (
                  <span className="font-mono text-primary">Entry #{e.reversalOf}</span>
                ),
                hidden: (e) => !e.reversalOf,
              },
            ],
          },
          {
            title: 'Totals',
            span: 'aside',
            render: (e) => <TotalsSummary entry={e} />,
          },
          {
            title: 'Workflow Actions',
            span: 'aside',
            render: (e) => (
              <WorkflowActions entry={e} onPost={onPost} onReverse={onReverse} />
            ),
          },
        ],
      },
      {
        id: 'lines',
        label: 'Lines',
        icon: BookOpen,
        badge: (e) => e.lines?.length || 0,
        render: (e) => <JournalLinesTable entry={e} />,
      },
      metadataTab<JournalEntry>(),
    ],
  };

  return (
    <EntityDetailViewer
      config={journalEntryDetailConfig}
      entity={entry}
      entities={entries}
      onClose={onClose}
      onEntitySelect={onEntrySelect}
      onDelete={onDelete}
      loading={loading}
    />
  );
}
