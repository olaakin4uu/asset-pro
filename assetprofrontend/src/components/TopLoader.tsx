'use client';

import NextTopLoader from 'nextjs-toploader';

export function TopLoader() {
  return (
    <NextTopLoader
      color="hsl(var(--primary))"
      showSpinner={false}
      shadow={false}
      height={3}
    />
  );
}
