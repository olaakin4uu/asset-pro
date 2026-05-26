'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, AlertTriangle, ChevronRight } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { failedCount } from '@/lib/offline/queue';
import { PendingWritesInspector } from './PendingWritesInspector';

/**
 * Top-of-page banner that appears when the user is offline OR has writes
 * waiting to sync. Stays out of the way when the app is online with 0
 * pending — zero visual noise in the normal case.
 *
 * States:
 *   1. Online + 0 pending + 0 failed  → renders nothing.
 *   2. Offline                        → red banner, "Offline — N pending".
 *   3. Online + pending > 0           → amber banner, "N pending, syncing…"
 *   4. Any failed                     → red banner, "N failed" prefixed.
 *
 * The entire banner is clickable to open the PendingWritesInspector
 * drawer where each entry can be retried or discarded.
 */
export function OfflineBanner() {
  const { online, pending, syncing, syncNow } = useOnlineStatus();
  const [failed, setFailed] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // Poll failed count alongside pending so the banner turns red if any
  // write hit a permanent validation error.
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const n = await failedCount();
      if (active) setFailed(n);
    };
    void refresh();
    const id = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [pending]);

  const hasFailed = failed > 0;
  const hasPending = pending > 0;
  const showBanner = !online || hasPending || hasFailed;

  if (!showBanner) return (
    <PendingWritesInspector open={inspectorOpen} onClose={() => setInspectorOpen(false)} />
  );

  const isOffline = !online;
  const bannerClass = isOffline || hasFailed
    ? 'bg-red-600 text-white'
    : 'bg-amber-500 text-white';
  const Icon = isOffline ? WifiOff : hasFailed ? AlertTriangle : AlertTriangle;

  const parts: string[] = [];
  if (isOffline) parts.push('Offline');
  if (hasPending) parts.push(`${pending} pending`);
  if (hasFailed) parts.push(`${failed} failed`);
  if (syncing) parts.push('syncing…');
  const message = parts.join(' · ');

  return (
    <>
      <div
        className={`sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium shadow-md cursor-pointer hover:brightness-110 transition-[filter] ${bannerClass}`}
        role="button"
        tabIndex={0}
        aria-label="Open offline writes inspector"
        onClick={() => setInspectorOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setInspectorOpen(true);
          }
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{message}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isOffline && hasPending && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                syncNow();
              }}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync now
            </button>
          )}
          <ChevronRight className="h-4 w-4 opacity-70" />
        </div>
      </div>
      <PendingWritesInspector open={inspectorOpen} onClose={() => setInspectorOpen(false)} />
    </>
  );
}
