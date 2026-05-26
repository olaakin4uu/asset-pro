'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchPageIndex, type SearchPage } from '@/lib/search-index';
import { useCompanyContextStore } from '@/stores/company-context';
import { itemsApi } from '@/lib/api/inventory';
import { customersApi } from '@/lib/api/sales';
import { suppliersApi } from '@/lib/api/purchase';
import { helpArticlesApi } from '@/lib/api/help';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  category: 'pages' | 'products' | 'customers' | 'suppliers' | 'help';
}

export interface SearchResultGroup {
  category: SearchResult['category'];
  label: string;
  items: SearchResult[];
  isLoading?: boolean;
}

interface SearchApiItem {
  id: number;
  name?: string;
  title?: string;
  code?: string;
  [key: string]: unknown;
}

export interface UseCommandPaletteConfig {
  debounceMs?: number;
}

export interface UseCommandPaletteReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  query: string;
  setQuery: (q: string) => void;
  groups: SearchResultGroup[];
  selectedIndex: number;
  totalResults: number;
  isSearching: boolean;
  selectResult: (result: SearchResult) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

// ────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────

export function useCommandPalette(
  config: UseCommandPaletteConfig = {},
): UseCommandPaletteReturn {
  const { debounceMs = 300 } = config;
  const router = useRouter();
  const enabledModules = useCompanyContextStore((s) => s.enabledModules);
  const enabledSlugs = enabledModules.filter((m) => m.isEnabled).map((m) => m.slug);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Page results (instant, local)
  const [pageResults, setPageResults] = useState<SearchResult[]>([]);

  // Entity results (async, API)
  const [productResults, setProductResults] = useState<SearchResult[]>([]);
  const [customerResults, setCustomerResults] = useState<SearchResult[]>([]);
  const [supplierResults, setSupplierResults] = useState<SearchResult[]>([]);
  const [helpResults, setHelpResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
    setPageResults([]);
    setProductResults([]);
    setCustomerResults([]);
    setSupplierResults([]);
    setHelpResults([]);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => {
          if (prev) {
            // Close
            setQuery('');
            return false;
          }
          // Open
          setSelectedIndex(0);
          setPageResults([]);
          setProductResults([]);
          setCustomerResults([]);
          setSupplierResults([]);
          setHelpResults([]);
          return true;
        });
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Instant local search + debounced API search
  useEffect(() => {
    if (!isOpen) return;

    const q = query.trim();
    if (!q) {
      setPageResults([]);
      setProductResults([]);
      setCustomerResults([]);
      setSupplierResults([]);
      setHelpResults([]);
      setIsSearching(false);
      setSelectedIndex(0);
      return;
    }

    // Instant: page index search
    const pages: SearchResult[] = searchPageIndex(q, enabledSlugs.length > 0 ? enabledSlugs : undefined)
      .slice(0, 8)
      .map((p: SearchPage) => ({
        id: `page:${p.href}`,
        title: p.title,
        subtitle: p.module,
        href: p.href,
        category: 'pages' as const,
      }));
    setPageResults(pages);
    setSelectedIndex(0);

    // Debounced: API search (min 2 chars)
    if (q.length < 2) {
      setProductResults([]);
      setCustomerResults([]);
      setSupplierResults([]);
      setHelpResults([]);
      setIsSearching(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const promises: Promise<void>[] = [];

      // Products
      promises.push(
        itemsApi
          .list({ search: q, limit: 5 })
          .then((res) => {
            if (controller.signal.aborted) return;
            setProductResults(
              (res.data || []).slice(0, 5).map((item: SearchApiItem) => ({
                id: `product:${item.id}`,
                title: item.name,
                subtitle: item.sku || item.code || undefined,
                href: `/inventory/products/${item.id}`,
                category: 'products' as const,
              })),
            );
          })
          .catch(() => {
            if (!controller.signal.aborted) setProductResults([]);
          }),
      );

      // Customers
      promises.push(
        customersApi
          .list({ search: q, limit: 5 })
          .then((res) => {
            if (controller.signal.aborted) return;
            setCustomerResults(
              (res.data || []).slice(0, 5).map((c: SearchApiItem) => ({
                id: `customer:${c.id}`,
                title: c.name || c.companyName,
                subtitle: c.email || c.phone || undefined,
                href: `/sales/customers/${c.id}`,
                category: 'customers' as const,
              })),
            );
          })
          .catch(() => {
            if (!controller.signal.aborted) setCustomerResults([]);
          }),
      );

      // Suppliers
      promises.push(
        suppliersApi
          .list({ search: q, limit: 5 })
          .then((res) => {
            if (controller.signal.aborted) return;
            setSupplierResults(
              (res.data || []).slice(0, 5).map((s: SearchApiItem) => ({
                id: `supplier:${s.id}`,
                title: s.name,
                subtitle: s.email || s.contactPerson || undefined,
                href: `/purchase/suppliers/${s.id}`,
                category: 'suppliers' as const,
              })),
            );
          })
          .catch(() => {
            if (!controller.signal.aborted) setSupplierResults([]);
          }),
      );

      // Help Articles
      promises.push(
        helpArticlesApi
          .search({ query: q, limit: 3 })
          .then((res) => {
            if (controller.signal.aborted) return;
            setHelpResults(
              (res.articles || []).slice(0, 3).map((a: SearchApiItem) => ({
                id: `help:${a.id}`,
                title: a.title,
                subtitle: a.category || 'Help Article',
                href: `/help/articles/${a.id}`,
                category: 'help' as const,
              })),
            );
          })
          .catch(() => {
            if (!controller.signal.aborted) setHelpResults([]);
          }),
      );

      await Promise.allSettled(promises);
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen, enabledSlugs.length, debounceMs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build grouped results
  const groups: SearchResultGroup[] = [];
  if (pageResults.length > 0) {
    groups.push({ category: 'pages', label: 'Pages', items: pageResults });
  }
  if (productResults.length > 0) {
    groups.push({ category: 'products', label: 'Products', items: productResults });
  }
  if (customerResults.length > 0) {
    groups.push({ category: 'customers', label: 'Customers', items: customerResults });
  }
  if (supplierResults.length > 0) {
    groups.push({ category: 'suppliers', label: 'Suppliers', items: supplierResults });
  }
  if (helpResults.length > 0) {
    groups.push({ category: 'help', label: 'Help Articles', items: helpResults });
  }

  const allResults = groups.flatMap((g) => g.items);
  const totalResults = allResults.length;

  const selectResult = useCallback(
    (result: SearchResult) => {
      close();
      router.push(result.href);
    },
    [close, router],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(totalResults, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + Math.max(totalResults, 1)) % Math.max(totalResults, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = allResults[selectedIndex];
        if (selected) selectResult(selected);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [totalResults, allResults, selectedIndex, selectResult, close],
  );

  return {
    isOpen,
    open,
    close,
    query,
    setQuery,
    groups,
    selectedIndex,
    totalResults,
    isSearching,
    selectResult,
    onKeyDown,
  };
}
