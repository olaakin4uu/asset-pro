'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function AccountRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    router.replace(`/accounts/chart-of-accounts?view=${params.id}`);
  }, [router, params.id]);

  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
