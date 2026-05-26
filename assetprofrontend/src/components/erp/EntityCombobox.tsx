'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, Plus, Edit2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface EntityItem {
  id: string | number;
}

export interface EntityComboboxProps<T extends EntityItem> {
  // Value
  value: T['id'] | null;
  onChange: (value: T['id'] | null) => void;

  // Data
  items: T[];
  labelKey: keyof T;
  subtitleKey?: keyof T;
  searchKeys?: (keyof T)[];

  // Labels
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  createLabel?: string;
  nullLabel?: string;

  // Icon
  icon?: React.ComponentType<{ className?: string }>;

  // States
  required?: boolean;
  disabled?: boolean;
  error?: string;

  // Features
  allowCreate?: boolean;
  allowNull?: boolean;
  allowEdit?: boolean;

  // Callbacks
  onCreate?: (searchQuery: string) => void;
  onEdit?: (item: T) => void;

  // Styling
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EntityCombobox<T extends EntityItem>({
  value,
  onChange,
  items,
  labelKey,
  subtitleKey,
  searchKeys,
  label,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No items found',
  createLabel = 'Create new',
  nullLabel = 'None',
  icon: Icon,
  required = false,
  disabled = false,
  error,
  allowCreate = false,
  allowNull = false,
  allowEdit = false,
  onCreate,
  onEdit,
  className,
}: EntityComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find selected item
  const selectedItem = useMemo(
    () => items.find((item) => item.id === value) || null,
    [items, value]
  );

  // Get display text for an item
  const getItemLabel = useCallback(
    (item: T): string => {
      const labelValue = item[labelKey];
      return typeof labelValue === 'string' || typeof labelValue === 'number'
        ? String(labelValue)
        : '';
    },
    [labelKey]
  );

  // Get subtitle text for an item
  const getItemSubtitle = useCallback(
    (item: T): string | null => {
      if (!subtitleKey) return null;
      const subtitleValue = item[subtitleKey];
      return typeof subtitleValue === 'string' || typeof subtitleValue === 'number'
        ? String(subtitleValue)
        : null;
    },
    [subtitleKey]
  );

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    const keysToSearch = searchKeys || [labelKey];

    return items.filter((item) =>
      keysToSearch.some((key) => {
        const value = item[key];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }
        if (typeof value === 'number') {
          return value.toString().includes(query);
        }
        return false;
      })
    );
  }, [items, searchQuery, searchKeys, labelKey]);

  // Handle selection
  const handleSelect = useCallback(
    (item: T | null) => {
      onChange(item?.id ?? null);
      setOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );

  // Handle create
  const handleCreate = useCallback(() => {
    onCreate?.(searchQuery);
    setOpen(false);
    setSearchQuery('');
  }, [onCreate, searchQuery]);

  // Handle edit
  const handleEdit = useCallback(
    (e: React.MouseEvent, item: T) => {
      e.stopPropagation();
      onEdit?.(item);
    },
    [onEdit]
  );

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchQuery('');
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearchQuery('');
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Label */}
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2.5 text-left text-sm',
          'transition-colors hover:bg-muted/50',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
          error && 'border-destructive focus:ring-destructive'
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {selectedItem ? (
            <span className="truncate">
              {getItemLabel(selectedItem)}
              {subtitleKey && getItemSubtitle(selectedItem) && (
                <span className="ml-1 text-muted-foreground">
                  ({getItemSubtitle(selectedItem)})
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {/* Error Message */}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg',
            'animate-in fade-in-0 zoom-in-95'
          )}
        >
          {/* Search Input */}
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border-0 bg-transparent py-2 pl-9 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-auto p-1">
            {/* Null Option */}
            {allowNull && (
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm',
                  'hover:bg-muted',
                  value === null && 'bg-primary/10 text-primary'
                )}
              >
                <Check
                  className={cn(
                    'h-4 w-4',
                    value === null ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="text-muted-foreground">{nullLabel}</span>
              </button>
            )}

            {/* Filtered Items */}
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'group flex items-center rounded-md hover:bg-muted',
                    value === item.id && 'bg-primary/10'
                  )}
                >
                  <button
                    onClick={() => handleSelect(item)}
                    className="flex flex-1 items-center gap-2 px-2 py-2 text-sm"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        value === item.id ? 'opacity-100 text-primary' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">
                      {getItemLabel(item)}
                      {subtitleKey && getItemSubtitle(item) && (
                        <span className="ml-1 text-muted-foreground">
                          ({getItemSubtitle(item)})
                        </span>
                      )}
                    </span>
                  </button>
                  {allowEdit && onEdit && (
                    <button
                      onClick={(e) => handleEdit(e, item)}
                      className="mr-2 rounded p-1 opacity-0 hover:bg-background group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            )}

            {/* Create Option */}
            {allowCreate && onCreate && searchQuery && (
              <button
                onClick={handleCreate}
                className="mt-1 flex w-full items-center gap-2 rounded-md border-t px-2 py-2 text-sm text-primary hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
                {createLabel}: &quot;{searchQuery}&quot;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
