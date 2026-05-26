'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

export interface SidebarItem {
  id: string | number;
  title: string;
  subtitle?: string;
  status?: string;
  date?: string;
  avatar?: string;
  badges?: Array<{ label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }>;
  highlighted?: boolean;
}

export interface UseDetailSidebarConfig<T extends SidebarItem> {
  items: T[];
  selectedId?: string | number;
  searchKeys?: (keyof T)[];
  itemsPerPage?: number;
  enableInfiniteScroll?: boolean;
  onItemSelect?: (item: T) => void;
}

export interface UseDetailSidebarReturn<T extends SidebarItem> {
  // Items
  items: T[];
  filteredItems: T[];
  displayedItems: T[];
  selectedItem: T | null;

  // Selection
  selectItem: (item: T) => void;
  selectById: (id: string | number) => void;
  isSelected: (item: T) => boolean;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // Sidebar visibility
  isCollapsed: boolean;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;

  // Infinite scroll
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  currentPage: number;

  // Navigation
  selectNext: () => void;
  selectPrevious: () => void;
}

export function useDetailSidebar<T extends SidebarItem>(
  config: UseDetailSidebarConfig<T>
): UseDetailSidebarReturn<T> {
  const {
    items,
    selectedId,
    searchKeys = ['title', 'subtitle'] as (keyof T)[],
    itemsPerPage = 20,
    enableInfiniteScroll = true,
    onItemSelect,
  } = config;

  // State
  const [selectedItemId, setSelectedItemId] = useState<string | number | undefined>(selectedId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Update selected item when prop changes
  useEffect(() => {
    if (selectedId !== undefined) {
      setSelectedItemId(selectedId);
    }
  }, [selectedId]);

  // Filtered items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter((item) =>
      searchKeys.some((key) => {
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
  }, [items, searchQuery, searchKeys]);

  // Displayed items (with pagination)
  const displayedItems = useMemo(() => {
    if (!enableInfiniteScroll) return filteredItems;
    return filteredItems.slice(0, currentPage * itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage, enableInfiniteScroll]);

  // Has more items to load
  const hasMore = useMemo(
    () => displayedItems.length < filteredItems.length,
    [displayedItems.length, filteredItems.length]
  );

  // Selected item
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) || null,
    [items, selectedItemId]
  );

  // Selection handlers
  const selectItem = useCallback(
    (item: T) => {
      setSelectedItemId(item.id);
      onItemSelect?.(item);
    },
    [onItemSelect]
  );

  const selectById = useCallback(
    (id: string | number) => {
      const item = items.find((i) => i.id === id);
      if (item) {
        selectItem(item);
      }
    },
    [items, selectItem]
  );

  const isSelected = useCallback(
    (item: T) => item.id === selectedItemId,
    [selectedItemId]
  );

  // Search handlers
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset pagination on search
  }, []);

  // Sidebar visibility
  const toggleSidebar = useCallback(() => setIsCollapsed((prev) => !prev), []);
  const collapseSidebar = useCallback(() => setIsCollapsed(true), []);
  const expandSidebar = useCallback(() => setIsCollapsed(false), []);

  // Infinite scroll
  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setIsLoading(true);
      // Simulate async load (in real app, this might fetch from API)
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1);
        setIsLoading(false);
      }, 100);
    }
  }, [hasMore, isLoading]);

  // Navigation
  const selectNext = useCallback(() => {
    const currentIndex = filteredItems.findIndex((item) => item.id === selectedItemId);
    const nextIndex = currentIndex + 1;
    if (nextIndex < filteredItems.length) {
      selectItem(filteredItems[nextIndex]);
    }
  }, [filteredItems, selectedItemId, selectItem]);

  const selectPrevious = useCallback(() => {
    const currentIndex = filteredItems.findIndex((item) => item.id === selectedItemId);
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      selectItem(filteredItems[prevIndex]);
    }
  }, [filteredItems, selectedItemId, selectItem]);

  return {
    items,
    filteredItems,
    displayedItems,
    selectedItem,
    selectItem,
    selectById,
    isSelected,
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
    clearSearch,
    isCollapsed,
    toggleSidebar,
    collapseSidebar,
    expandSidebar,
    loadMore,
    hasMore,
    isLoading,
    currentPage,
    selectNext,
    selectPrevious,
  };
}
