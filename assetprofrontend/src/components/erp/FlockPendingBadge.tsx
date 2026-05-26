'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { pendingCountForFlock } from '@/lib/offline/queue';

/**
 * Small amber chip shown on the flock detail page header when there are
 * offline writes still queued for that specific flock. Gives the farmer
 * one-glance reassurance: "yes, your mortality log is safe even though
 * the signal was down."
 *
 * Polls every 3s. Hidden when zero.
 */
export function FlockPendingBadge({ flockId }: { flockId: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!flockId) return;
    let active = true;
    const refresh = async () => {
      const n = await pendingCountForFlock(flockId);
      if (active) setCount(n);
    };
    void refresh();
    const i = setInterval(refresh, 3000);
    return () => {
      active = false;
      clearInterval(i);
    };
  }, [flockId]);

  if (count === 0) return null;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-medium dark:bg-amber-900/30 dark:text-amber-300"
      title={`${count} write${count === 1 ? '' : 's'} for this flock will sync when you're back online`}
    >
      <Clock className="h-3 w-3" />
      {count} pending
    </span>
  );
}
