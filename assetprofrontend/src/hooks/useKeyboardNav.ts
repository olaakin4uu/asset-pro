'use client';

import { useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type KeyboardKey =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Enter'
  | 'Escape'
  | 'Space'
  | 'Tab'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown'
  | 'Delete'
  | 'Backspace'
  | string;

export interface KeyboardShortcut {
  /** Key to listen for */
  key: KeyboardKey;
  /** Require Ctrl/Cmd key */
  ctrl?: boolean;
  /** Require Shift key */
  shift?: boolean;
  /** Require Alt key */
  alt?: boolean;
  /** Require Meta key (Cmd on Mac) */
  meta?: boolean;
  /** Handler function */
  handler: (e: KeyboardEvent) => void;
  /** Prevent default behavior */
  preventDefault?: boolean;
  /** Stop propagation */
  stopPropagation?: boolean;
  /** Only trigger when element is focused */
  whenFocused?: boolean;
  /** Description for help text */
  description?: string;
}

export interface UseKeyboardNavConfig {
  /** Keyboard shortcuts */
  shortcuts?: KeyboardShortcut[];
  /** Enable/disable keyboard navigation */
  enabled?: boolean;
  /** Target element ref (defaults to document) */
  targetRef?: React.RefObject<HTMLElement>;

  // Common navigation handlers
  onArrowUp?: (e: KeyboardEvent) => void;
  onArrowDown?: (e: KeyboardEvent) => void;
  onArrowLeft?: (e: KeyboardEvent) => void;
  onArrowRight?: (e: KeyboardEvent) => void;
  onEnter?: (e: KeyboardEvent) => void;
  onEscape?: (e: KeyboardEvent) => void;
  onSpace?: (e: KeyboardEvent) => void;
  onTab?: (e: KeyboardEvent, shift: boolean) => void;
  onHome?: (e: KeyboardEvent) => void;
  onEnd?: (e: KeyboardEvent) => void;
  onPageUp?: (e: KeyboardEvent) => void;
  onPageDown?: (e: KeyboardEvent) => void;
  onDelete?: (e: KeyboardEvent) => void;

  // List navigation specific
  /** Wrap around when reaching end of list */
  wrapAround?: boolean;
  /** Items count for page navigation */
  itemCount?: number;
  /** Current focused index */
  focusedIndex?: number;
  /** Callback when focused index changes */
  onFocusedIndexChange?: (index: number) => void;
}

export interface UseKeyboardNavReturn {
  /** All registered shortcuts for help display */
  shortcuts: KeyboardShortcut[];
  /** Check if a key combo is pressed */
  isPressed: (key: KeyboardKey, modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean }) => boolean;
  /** Manually trigger a shortcut */
  trigger: (key: KeyboardKey, modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean }) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useKeyboardNav(config: UseKeyboardNavConfig = {}): UseKeyboardNavReturn {
  const {
    shortcuts: customShortcuts = [],
    enabled = true,
    targetRef,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onEscape,
    onSpace,
    onTab,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    onDelete,
    wrapAround = true,
    itemCount,
    focusedIndex,
    onFocusedIndexChange,
  } = config;

  // Track pressed keys
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // Build shortcuts array from both custom and handler props
  const shortcuts: KeyboardShortcut[] = [
    ...customShortcuts,
    ...(onArrowUp ? [{ key: 'ArrowUp' as const, handler: onArrowUp, preventDefault: true }] : []),
    ...(onArrowDown ? [{ key: 'ArrowDown' as const, handler: onArrowDown, preventDefault: true }] : []),
    ...(onArrowLeft ? [{ key: 'ArrowLeft' as const, handler: onArrowLeft, preventDefault: true }] : []),
    ...(onArrowRight ? [{ key: 'ArrowRight' as const, handler: onArrowRight, preventDefault: true }] : []),
    ...(onEnter ? [{ key: 'Enter' as const, handler: onEnter, preventDefault: true }] : []),
    ...(onEscape ? [{ key: 'Escape' as const, handler: onEscape }] : []),
    ...(onSpace ? [{ key: 'Space' as const, handler: onSpace, preventDefault: true }] : []),
    ...(onHome ? [{ key: 'Home' as const, handler: onHome, preventDefault: true }] : []),
    ...(onEnd ? [{ key: 'End' as const, handler: onEnd, preventDefault: true }] : []),
    ...(onPageUp ? [{ key: 'PageUp' as const, handler: onPageUp, preventDefault: true }] : []),
    ...(onPageDown ? [{ key: 'PageDown' as const, handler: onPageDown, preventDefault: true }] : []),
    ...(onDelete ? [{ key: 'Delete' as const, handler: onDelete }] : []),
  ];

  // Handle Tab separately due to shift modifier
  const handleTab = useCallback(
    (e: KeyboardEvent) => {
      if (onTab) {
        onTab(e, e.shiftKey);
      }
    },
    [onTab]
  );

  // List navigation helpers
  const navigateList = useCallback(
    (direction: 'up' | 'down' | 'home' | 'end' | 'pageUp' | 'pageDown') => {
      if (itemCount == null || focusedIndex == null || !onFocusedIndexChange) return;

      let newIndex = focusedIndex;
      const pageSize = 10; // Items per page for PageUp/PageDown

      switch (direction) {
        case 'up':
          newIndex = focusedIndex - 1;
          if (newIndex < 0) {
            newIndex = wrapAround ? itemCount - 1 : 0;
          }
          break;
        case 'down':
          newIndex = focusedIndex + 1;
          if (newIndex >= itemCount) {
            newIndex = wrapAround ? 0 : itemCount - 1;
          }
          break;
        case 'home':
          newIndex = 0;
          break;
        case 'end':
          newIndex = itemCount - 1;
          break;
        case 'pageUp':
          newIndex = Math.max(0, focusedIndex - pageSize);
          break;
        case 'pageDown':
          newIndex = Math.min(itemCount - 1, focusedIndex + pageSize);
          break;
      }

      if (newIndex !== focusedIndex) {
        onFocusedIndexChange(newIndex);
      }
    },
    [itemCount, focusedIndex, onFocusedIndexChange, wrapAround]
  );

  // Match shortcut to event
  const matchShortcut = useCallback(
    (shortcut: KeyboardShortcut, e: KeyboardEvent): boolean => {
      // Check key
      const keyMatches =
        e.key === shortcut.key ||
        e.code === shortcut.key ||
        (shortcut.key === 'Space' && e.key === ' ');

      if (!keyMatches) return false;

      // Check modifiers
      if (shortcut.ctrl && !e.ctrlKey && !e.metaKey) return false;
      if (shortcut.shift && !e.shiftKey) return false;
      if (shortcut.alt && !e.altKey) return false;
      if (shortcut.meta && !e.metaKey) return false;

      // Check if should only trigger when focused
      if (shortcut.whenFocused && targetRef?.current) {
        if (!targetRef.current.contains(document.activeElement)) {
          return false;
        }
      }

      return true;
    },
    [targetRef]
  );

  // Main keyboard handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only allow Escape in inputs
        if (e.key !== 'Escape') return;
      }

      // Track pressed key
      pressedKeysRef.current.add(e.key);

      // Handle Tab separately
      if (e.key === 'Tab' && onTab) {
        handleTab(e);
        return;
      }

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        if (matchShortcut(shortcut, e)) {
          if (shortcut.preventDefault) {
            e.preventDefault();
          }
          if (shortcut.stopPropagation) {
            e.stopPropagation();
          }
          shortcut.handler(e);
          return;
        }
      }

      // Built-in list navigation
      if (itemCount != null && focusedIndex != null && onFocusedIndexChange) {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            navigateList('up');
            break;
          case 'ArrowDown':
            e.preventDefault();
            navigateList('down');
            break;
          case 'Home':
            e.preventDefault();
            navigateList('home');
            break;
          case 'End':
            e.preventDefault();
            navigateList('end');
            break;
          case 'PageUp':
            e.preventDefault();
            navigateList('pageUp');
            break;
          case 'PageDown':
            e.preventDefault();
            navigateList('pageDown');
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeysRef.current.delete(e.key);
    };

    const target = targetRef?.current ?? document;
    target.addEventListener('keydown', handleKeyDown as EventListener);
    target.addEventListener('keyup', handleKeyUp as EventListener);

    return () => {
      target.removeEventListener('keydown', handleKeyDown as EventListener);
      target.removeEventListener('keyup', handleKeyUp as EventListener);
    };
  }, [
    enabled,
    shortcuts,
    targetRef,
    matchShortcut,
    onTab,
    handleTab,
    itemCount,
    focusedIndex,
    onFocusedIndexChange,
    navigateList,
  ]);

  // Check if a key is pressed
  const isPressed = useCallback(
    (key: KeyboardKey, modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean }) => {
      if (!pressedKeysRef.current.has(key)) return false;
      // Note: This is a simplified check - in practice you'd need to track modifiers too
      return true;
    },
    []
  );

  // Manually trigger a shortcut
  const trigger = useCallback(
    (key: KeyboardKey, modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean }) => {
      const matchingShortcut = shortcuts.find(
        (s) =>
          s.key === key &&
          (modifiers?.ctrl ?? false) === (s.ctrl ?? false) &&
          (modifiers?.shift ?? false) === (s.shift ?? false) &&
          (modifiers?.alt ?? false) === (s.alt ?? false)
      );

      if (matchingShortcut) {
        const fakeEvent = new KeyboardEvent('keydown', {
          key,
          ctrlKey: modifiers?.ctrl,
          shiftKey: modifiers?.shift,
          altKey: modifiers?.alt,
        });
        matchingShortcut.handler(fakeEvent);
      }
    },
    [shortcuts]
  );

  return {
    shortcuts,
    isPressed,
    trigger,
  };
}
