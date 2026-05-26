import { useCallback, useEffect, useState } from "react";
import { pendingCount, replay } from "@/lib/offline/queue";

/**
 * Tracks browser connectivity + offline queue depth.
 *
 * `online` comes from `navigator.onLine` (cheap, not 100% accurate —
 * browser can report online while the actual API is unreachable, but
 * that's rare enough that we accept the tradeoff for week 1).
 *
 * `pending` polls the IndexedDB queue every 5s so the banner count stays
 * fresh without wiring a custom event bus. If this turns out to be too
 * chatty in week 3 we can switch to a BroadcastChannel fan-out.
 *
 * On the online→offline→online transition, we automatically kick off a
 * replay. Week-1 replay is a no-op (see queue.ts); the hook is wired
 * now so week-2 gets a drop-in upgrade.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pending, setPending] = useState<number>(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    setPending(await pendingCount());
  }, []);

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await replay();
      setLastSyncAt(Date.now());
    } finally {
      setSyncing(false);
      refreshPending();
    }
  }, [syncing, refreshPending]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOnline = () => {
      setOnline(true);
      // Auto-replay on reconnect — the core UX: "tab stays open, sync
      // happens the moment the signal comes back."
      void syncNow();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Initial read + 5s poll.
    void refreshPending();
    const interval = setInterval(refreshPending, 5000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, [refreshPending, syncNow]);

  return { online, pending, lastSyncAt, syncing, syncNow };
}
