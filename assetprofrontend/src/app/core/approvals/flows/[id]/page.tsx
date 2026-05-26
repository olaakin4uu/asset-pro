'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Redirect to the list page — the detail viewer is now inline on the list page.
 * This page exists so direct URL access (e.g. /core/approvals/flows/5) still works.
 */
export default function ApprovalFlowDetailPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    router.replace('/core/approvals/flows');
  }, [router, params.id]);

  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
