'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Redirects /accounts/bank-transfers/[id] to /accounts/bank-transfers?view=[id]
 * The detail view is now rendered as a DetailShell panel on the list page.
 */
export default function BankTransferDetailRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    router.replace(`/accounts/bank-transfers?view=${id}`);
  }, [router, id]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
