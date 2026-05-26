'use client';

import { useState, useCallback, useMemo } from 'react';
import type { UseFormReturn, FieldValues, Path } from 'react-hook-form';

// ============================================================================
// TYPES
// ============================================================================

export interface FormTab<T extends FieldValues = FieldValues> {
  /** Unique tab ID */
  id: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Fields belonging to this tab (for validation) */
  fields: Path<T>[];
  /** Whether tab is disabled */
  disabled?: boolean;
  /** Whether tab is hidden */
  hidden?: boolean;
  /** Description text */
  description?: string;
}

export interface UseFormTabsConfig<T extends FieldValues = FieldValues> {
  /** Tab definitions */
  tabs: FormTab<T>[];
  /** React Hook Form instance */
  form: UseFormReturn<T>;
  /** Default active tab */
  defaultTab?: string;
  /** Validate current tab before switching */
  validateOnSwitch?: boolean;
  /** Allow switching to tabs with errors */
  allowSwitchWithErrors?: boolean;
  /** Callback when tab changes */
  onTabChange?: (tabId: string, previousTabId: string) => void;
  /** Callback when validation fails on switch */
  onValidationFail?: (tabId: string, errors: string[]) => void;
}

export interface UseFormTabsReturn<T extends FieldValues = FieldValues> {
  // State
  activeTab: string;
  tabs: FormTab<T>[];
  visibleTabs: FormTab<T>[];

  // Tab info
  currentTab: FormTab<T> | undefined;
  currentTabIndex: number;
  isFirstTab: boolean;
  isLastTab: boolean;

  // Actions
  setActiveTab: (tabId: string) => Promise<boolean>;
  nextTab: () => Promise<boolean>;
  previousTab: () => Promise<boolean>;
  goToTab: (index: number) => Promise<boolean>;

  // Validation
  validateTab: (tabId: string) => Promise<boolean>;
  validateAllTabs: () => Promise<boolean>;
  tabHasErrors: (tabId: string) => boolean;
  getTabErrors: (tabId: string) => string[];
  tabsWithErrors: string[];

  // Helpers
  isTabActive: (tabId: string) => boolean;
  isTabDisabled: (tabId: string) => boolean;
  isTabCompleted: (tabId: string) => boolean;
  getTabStatus: (tabId: string) => 'active' | 'completed' | 'error' | 'pending';
}

// ============================================================================
// HOOK
// ============================================================================

export function useFormTabs<T extends FieldValues = FieldValues>(
  config: UseFormTabsConfig<T>
): UseFormTabsReturn<T> {
  const {
    tabs,
    form,
    defaultTab,
    validateOnSwitch = true,
    allowSwitchWithErrors = false,
    onTabChange,
    onValidationFail,
  } = config;

  // State
  const [activeTab, setActiveTabState] = useState<string>(
    defaultTab ?? tabs[0]?.id ?? ''
  );
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    new Set([defaultTab ?? tabs[0]?.id ?? ''])
  );

  // Visible tabs (not hidden)
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => !tab.hidden),
    [tabs]
  );

  // Current tab info
  const currentTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTab),
    [tabs, activeTab]
  );

  const currentTabIndex = useMemo(
    () => visibleTabs.findIndex((tab) => tab.id === activeTab),
    [visibleTabs, activeTab]
  );

  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === visibleTabs.length - 1;

  // Get errors for a specific tab
  const getTabErrors = useCallback(
    (tabId: string): string[] => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return [];

      const errors: string[] = [];
      const formErrors = form.formState.errors;

      for (const field of tab.fields) {
        const fieldError = formErrors[field as keyof typeof formErrors];
        if (fieldError?.message) {
          errors.push(String(fieldError.message));
        }
      }

      return errors;
    },
    [tabs, form.formState.errors]
  );

  // Check if tab has errors
  const tabHasErrors = useCallback(
    (tabId: string): boolean => {
      return getTabErrors(tabId).length > 0;
    },
    [getTabErrors]
  );

  // Tabs with errors
  const tabsWithErrors = useMemo(
    () => tabs.filter((tab) => tabHasErrors(tab.id)).map((tab) => tab.id),
    [tabs, tabHasErrors]
  );

  // Validate a specific tab
  const validateTab = useCallback(
    async (tabId: string): Promise<boolean> => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return true;

      // Trigger validation for tab fields
      const results = await Promise.all(
        tab.fields.map((field) => form.trigger(field))
      );

      return results.every(Boolean);
    },
    [tabs, form]
  );

  // Validate all tabs
  const validateAllTabs = useCallback(async (): Promise<boolean> => {
    const results = await Promise.all(tabs.map((tab) => validateTab(tab.id)));
    return results.every(Boolean);
  }, [tabs, validateTab]);

  // Set active tab with validation
  const setActiveTab = useCallback(
    async (tabId: string): Promise<boolean> => {
      const targetTab = tabs.find((t) => t.id === tabId);
      if (!targetTab || targetTab.disabled) return false;

      // Validate current tab before switching
      if (validateOnSwitch && activeTab !== tabId) {
        const isValid = await validateTab(activeTab);

        if (!isValid && !allowSwitchWithErrors) {
          const errors = getTabErrors(activeTab);
          onValidationFail?.(activeTab, errors);
          return false;
        }
      }

      const previousTab = activeTab;
      setActiveTabState(tabId);
      setVisitedTabs((prev) => new Set([...prev, tabId]));
      onTabChange?.(tabId, previousTab);

      return true;
    },
    [
      tabs,
      activeTab,
      validateOnSwitch,
      allowSwitchWithErrors,
      validateTab,
      getTabErrors,
      onTabChange,
      onValidationFail,
    ]
  );

  // Navigate to next tab
  const nextTab = useCallback(async (): Promise<boolean> => {
    if (isLastTab) return false;

    const nextIndex = currentTabIndex + 1;
    const nextTabItem = visibleTabs[nextIndex];

    if (!nextTabItem) return false;

    return setActiveTab(nextTabItem.id);
  }, [isLastTab, currentTabIndex, visibleTabs, setActiveTab]);

  // Navigate to previous tab
  const previousTab = useCallback(async (): Promise<boolean> => {
    if (isFirstTab) return false;

    const prevIndex = currentTabIndex - 1;
    const prevTabItem = visibleTabs[prevIndex];

    if (!prevTabItem) return false;

    return setActiveTab(prevTabItem.id);
  }, [isFirstTab, currentTabIndex, visibleTabs, setActiveTab]);

  // Navigate to tab by index
  const goToTab = useCallback(
    async (index: number): Promise<boolean> => {
      const targetTab = visibleTabs[index];
      if (!targetTab) return false;

      return setActiveTab(targetTab.id);
    },
    [visibleTabs, setActiveTab]
  );

  // Check if tab is active
  const isTabActive = useCallback(
    (tabId: string): boolean => activeTab === tabId,
    [activeTab]
  );

  // Check if tab is disabled
  const isTabDisabled = useCallback(
    (tabId: string): boolean => {
      const tab = tabs.find((t) => t.id === tabId);
      return tab?.disabled ?? false;
    },
    [tabs]
  );

  // Check if tab is completed (visited and no errors)
  const isTabCompleted = useCallback(
    (tabId: string): boolean => {
      return visitedTabs.has(tabId) && !tabHasErrors(tabId);
    },
    [visitedTabs, tabHasErrors]
  );

  // Get tab status
  const getTabStatus = useCallback(
    (tabId: string): 'active' | 'completed' | 'error' | 'pending' => {
      if (activeTab === tabId) return 'active';
      if (tabHasErrors(tabId)) return 'error';
      if (isTabCompleted(tabId)) return 'completed';
      return 'pending';
    },
    [activeTab, tabHasErrors, isTabCompleted]
  );

  return {
    // State
    activeTab,
    tabs,
    visibleTabs,

    // Tab info
    currentTab,
    currentTabIndex,
    isFirstTab,
    isLastTab,

    // Actions
    setActiveTab,
    nextTab,
    previousTab,
    goToTab,

    // Validation
    validateTab,
    validateAllTabs,
    tabHasErrors,
    getTabErrors,
    tabsWithErrors,

    // Helpers
    isTabActive,
    isTabDisabled,
    isTabCompleted,
    getTabStatus,
  };
}
