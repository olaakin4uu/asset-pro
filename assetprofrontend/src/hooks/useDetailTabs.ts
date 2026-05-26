'use client';

import { useState, useCallback, useMemo } from 'react';

export interface DetailTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  disabled?: boolean;
  hidden?: boolean;
}

export interface UseDetailTabsConfig {
  tabs: DetailTab[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
}

export interface UseDetailTabsReturn {
  tabs: DetailTab[];
  visibleTabs: DetailTab[];
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  isActive: (tabId: string) => boolean;
  nextTab: () => void;
  prevTab: () => void;
  getTabIndex: (tabId: string) => number;
}

export function useDetailTabs(config: UseDetailTabsConfig): UseDetailTabsReturn {
  const { tabs, defaultTab, onTabChange } = config;

  const visibleTabs = useMemo(
    () => tabs.filter((tab) => !tab.hidden),
    [tabs]
  );

  const [activeTab, setActiveTabState] = useState<string>(
    defaultTab || visibleTabs[0]?.id || ''
  );

  const setActiveTab = useCallback(
    (tabId: string) => {
      const tab = visibleTabs.find((t) => t.id === tabId);
      if (tab && !tab.disabled) {
        setActiveTabState(tabId);
        onTabChange?.(tabId);
      }
    },
    [visibleTabs, onTabChange]
  );

  const isActive = useCallback(
    (tabId: string) => activeTab === tabId,
    [activeTab]
  );

  const getTabIndex = useCallback(
    (tabId: string) => visibleTabs.findIndex((t) => t.id === tabId),
    [visibleTabs]
  );

  const nextTab = useCallback(() => {
    const currentIndex = getTabIndex(activeTab);
    const nextIndex = (currentIndex + 1) % visibleTabs.length;
    const nextTab = visibleTabs[nextIndex];
    if (nextTab && !nextTab.disabled) {
      setActiveTab(nextTab.id);
    }
  }, [activeTab, visibleTabs, getTabIndex, setActiveTab]);

  const prevTab = useCallback(() => {
    const currentIndex = getTabIndex(activeTab);
    const prevIndex = currentIndex === 0 ? visibleTabs.length - 1 : currentIndex - 1;
    const prevTab = visibleTabs[prevIndex];
    if (prevTab && !prevTab.disabled) {
      setActiveTab(prevTab.id);
    }
  }, [activeTab, visibleTabs, getTabIndex, setActiveTab]);

  return {
    tabs,
    visibleTabs,
    activeTab,
    setActiveTab,
    isActive,
    nextTab,
    prevTab,
    getTabIndex,
  };
}
