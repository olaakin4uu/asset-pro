'use client';

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';

export function useContextualHelp() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Extract module slug from URL: /inventory/items → "inventory"
  const moduleSlug = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    // First segment is the module slug (e.g., "inventory", "sales", "hr-payroll")
    return segments[0] || null;
  }, [pathname]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    moduleSlug,
  };
}
