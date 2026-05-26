'use client';

import { useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  Package,
  Users,
  Truck,
  HelpCircle,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';
import type {
  SearchResultGroup,
  SearchResult,
  UseCommandPaletteReturn,
} from '@/hooks/useCommandPalette';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export interface CommandPaletteProps {
  palette: UseCommandPaletteReturn;
}

// ────────────────────────────────────────────────────────────────
// Icons per category
// ────────────────────────────────────────────────────────────────

const categoryIcons: Record<SearchResult['category'], React.ComponentType<{ className?: string }>> = {
  pages: FileText,
  products: Package,
  customers: Users,
  suppliers: Truck,
  help: HelpCircle,
};

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

export function CommandPalette({ palette }: CommandPaletteProps) {
  const {
    isOpen,
    close,
    query,
    setQuery,
    groups,
    selectedIndex,
    totalResults,
    isSearching,
    selectResult,
    onKeyDown,
  } = palette;

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow DOM to render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Flatten results for index tracking
  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />

      {/* Dialog */}
      <div
        className="fixed inset-x-0 top-[15%] z-[9999] mx-auto w-full max-w-lg px-4 sm:px-0"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <div
          className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
          onKeyDown={onKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, products, customers..."
              className="h-12 w-full bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:inline-block">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto">
            {/* Empty state — no query */}
            {!query.trim() && (
              <div className="px-4 py-8 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Type to search pages, products, customers...
                </p>
              </div>
            )}

            {/* Empty state — no results */}
            {query.trim() && totalResults === 0 && !isSearching && (
              <div className="px-4 py-8 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </p>
              </div>
            )}

            {/* Result groups */}
            {groups.map((group: SearchResultGroup) => {
              const GroupIcon = categoryIcons[group.category];
              return (
                <div key={group.category}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <GroupIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </span>
                    {isSearching && group.category !== 'pages' && group.items.length === 0 && (
                      <div className="ml-auto h-3 w-3 animate-spin rounded-full border border-muted-foreground/30 border-t-primary" />
                    )}
                  </div>

                  {/* Group items */}
                  {group.items.map((result: SearchResult) => {
                    const idx = flatIndex++;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={result.id}
                        data-selected={isSelected}
                        onClick={() => selectResult(result)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-accent'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{result.title}</p>
                          {result.subtitle && (
                            <p className="truncate text-xs text-muted-foreground">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                        <ArrowRight
                          className={`h-4 w-4 shrink-0 ${
                            isSelected ? 'text-primary' : 'text-muted-foreground/40'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* Loading indicator when searching and no results yet */}
            {isSearching && query.trim().length >= 2 && totalResults === 0 && (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 border-t border-border px-4 py-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">↑</kbd>
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">↓</kbd>
              <span className="ml-0.5">Navigate</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CornerDownLeft className="h-3 w-3" />
              <span>Open</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
