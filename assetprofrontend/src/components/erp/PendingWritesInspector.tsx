'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, RotateCw, Trash2, AlertCircle, Clock, Wifi, WifiOff, ShieldAlert } from 'lucide-react';
import {
  list,
  remove,
  retry,
  replay,
  unregisterServiceWorker,
  type QueueEntry,
} from '@/lib/offline/queue';

interface PendingWritesInspectorProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Slide-out panel that lists every pending/failed write with per-entry
 * actions. Opens when the user clicks the offline banner (via props from
 * OfflineBanner). Auto-refreshes the list every 3 seconds while open so
 * background replay shows progress live.
 *
 * Actions:
 *   - Retry — reset tries/backoff and let the next replay pick it up
 *   - Discard — remove from queue entirely (data is lost)
 *   - Reset offline cache — unregister the service worker, then reload.
 *     Escape hatch for a broken SW cache.
 */
export function PendingWritesInspector({ open, onClose }: PendingWritesInspectorProps) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setEntries(await list());
  }, []);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const i = setInterval(refresh, 3000);
    return () => clearInterval(i);
  }, [open, refresh]);

  if (!open) return null;

  const pending = entries.filter((e) => e.status !== 'failed');
  const failed = entries.filter((e) => e.status === 'failed');

  const handleRetry = async (id: string) => {
    await retry(id);
    await refresh();
  };

  const handleDiscard = async (id: string) => {
    if (!window.confirm('Discard this write? The data will be lost.')) return;
    await remove(id);
    await refresh();
  };

  const handleSyncNow = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await replay();
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        'Unregister the offline cache? This will clear cached pages (not your pending writes) and reload the app. Use this if offline mode is misbehaving.',
      )
    )
      return;
    const ok = await unregisterServiceWorker();
    if (ok) window.location.reload();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[55] bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 bottom-0 z-[56] w-full max-w-md bg-background shadow-2xl flex flex-col"
        role="dialog"
        aria-label="Pending writes"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            {navigator.onLine ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
            <h2 className="text-base font-semibold">Offline writes</h2>
            <span className="text-xs text-muted-foreground">
              {pending.length} pending · {failed.length} failed
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-4 py-2 border-b flex items-center gap-2">
          <button
            onClick={handleSyncNow}
            disabled={syncing || !navigator.onLine || pending.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
          <button
            onClick={handleReset}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300 text-xs font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            title="Unregister the offline service worker and reload the app"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Reset cache
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No pending writes</p>
              <p className="text-xs mt-1">You&apos;re all caught up</p>
            </div>
          ) : (
            <ul className="divide-y">
              {entries.map((e) => (
                <li key={e.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <StatusPill status={e.status} />
                      <span className="text-sm font-medium truncate">{e.label || e.url}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString()} · tries {e.tries}
                    </div>
                    {e.lastError && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="break-words">{e.lastError}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleRetry(e.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      title="Reset retry count and try again on the next sync"
                    >
                      <RotateCw className="h-3 w-3" /> Retry
                    </button>
                    <button
                      onClick={() => handleDiscard(e.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete this write permanently — data will be lost"
                    >
                      <Trash2 className="h-3 w-3" /> Discard
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

function StatusPill({ status }: { status: QueueEntry['status'] }) {
  const cfg = {
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    syncing: { label: 'Syncing', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    failed: { label: 'Failed', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  }[status];
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
