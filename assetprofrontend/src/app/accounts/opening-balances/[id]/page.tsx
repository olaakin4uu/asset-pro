'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Redirect shim: opening-balances detail pages now use the list page with ?view=id query param.
 * This page redirects /accounts/opening-balances/:id -> /accounts/opening-balances?view=:id
 */
export default function OpeningBalanceDetailRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const id = params.id as string;
    router.replace(`/accounts/opening-balances?view=${id}`);
  }, [router, params]);

  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
