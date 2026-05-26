'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, Package, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface SearchableItem {
  id: number;
  itemName: string;
  itemCode: string;
  sellingPrice?: number;
  totalStock?: number;
  availableStock?: number;
  uomName?: string;
  vatRate?: number;
}

export interface ItemSearchComboboxProps {
  /** Array of items to search through */
  items: SearchableItem[];
  /** Called when user clicks an item from search results */
  onItemSelect: (item: SearchableItem) => void;
  /** IDs of items already added to line items (shown as "Added") */
  addedItemIds?: number[];
  /** Placeholder text */
  placeholder?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Optional className */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ItemSearchCombobox({
  items,
  onItemSelect,
  addedItemIds = [],
  placeholder = 'Search items by name or code...',
  disabled = false,
  className,
}: ItemSearchComboboxProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return items
      .filter(
        (item) =>
          item.itemName.toLowerCase().includes(q) ||
          item.itemCode.toLowerCase().includes(q)
      )
      .slice(0, 10); // Show max 10 results
  }, [items, query]);

  const showDropdown = isFocused && query.trim().length > 0;

  // Handle item selection
  const handleSelect = useCallback(
    (item: SearchableItem) => {
      onItemSelect(item);
      setQuery('');
      inputRef.current?.focus();
    },
    [onItemSelect]
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown || filteredItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
          handleSelect(filteredItems[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        setQuery('');
        setIsFocused(false);
      }
    },
    [showDropdown, filteredItems, highlightedIndex, handleSelect]
  );

  const addedSet = useMemo(() => new Set(addedItemIds), [addedItemIds]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search Input — bold border + accent background to stand out */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border-2 border-primary/40 bg-primary/5 pl-10 pr-10 py-3 text-sm font-medium',
            'placeholder:text-muted-foreground placeholder:font-normal',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-background',
            'transition-all',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg',
            'animate-in fade-in-0 zoom-in-95 max-h-80 overflow-auto'
          )}
        >
          {filteredItems.length > 0 ? (
            <div>
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_100px_100px_80px] gap-2 px-3 py-2 border-b bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Item</span>
                <span className="text-right">Price</span>
                <span className="text-right">Stock</span>
                <span className="text-center">Status</span>
              </div>
              {filteredItems.map((item, idx) => {
                const isAdded = addedSet.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={cn(
                      'grid grid-cols-[1fr_100px_100px_80px] gap-2 w-full items-center px-3 py-2.5 text-left text-sm border-b last:border-b-0',
                      'hover:bg-muted transition-colors',
                      highlightedIndex === idx && 'bg-muted',
                      isAdded && 'opacity-50'
                    )}
                  >
                    {/* Item name + code */}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{item.itemName}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.itemCode}</div>
                    </div>
                    {/* Price */}
                    <div className="text-right font-mono text-xs">
                      {'\u20A6'}{(item.sellingPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    {/* Stock */}
                    <div className="text-right text-xs">
                      {(item.availableStock ?? item.totalStock ?? 0).toLocaleString()}
                      {item.uomName ? <span className="text-muted-foreground ml-0.5">{item.uomName}</span> : ''}
                    </div>
                    {/* Added badge */}
                    <div className="text-center">
                      {isAdded && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Added
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No items found matching &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
