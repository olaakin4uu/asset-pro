'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Redirects /assets/maintenance/[id] to /assets/maintenance?view=[id]
 * The detail view is now rendered as a DetailViewer panel on the list page.
 */
export default function MaintenanceDetailRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    router.replace(`/assets/maintenance?view=${id}`);
  }, [router, id]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
