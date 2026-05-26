'use client';

import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface UseFocusTrapConfig {
  /** Whether the trap is active */
  enabled: boolean;
  /** Ref to the container element to trap focus within */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Element to return focus to when trap is deactivated */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  /** Whether to auto-focus the first focusable element on activation */
  autoFocus?: boolean;
  /** Selector for the element to initially focus (overrides autoFocus) */
  initialFocusSelector?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// ============================================================================
// HOOK
// ============================================================================

export function useFocusTrap(config: UseFocusTrapConfig): void {
  const { enabled, containerRef, returnFocusRef, autoFocus = true, initialFocusSelector } = config;
  const previousActiveElementRef = useRef<Element | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter((el) => el.offsetParent !== null); // Filter out hidden elements
  }, [containerRef]);

  // Set initial focus when trap activates
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement;

    // Delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      if (initialFocusSelector) {
        const target = containerRef.current.querySelector<HTMLElement>(initialFocusSelector);
        if (target) {
          target.focus();
          return;
        }
      }

      if (autoFocus) {
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [enabled, containerRef, autoFocus, initialFocusSelector, getFocusableElements]);

  // Return focus when trap deactivates
  useEffect(() => {
    if (enabled) return;

    const returnTarget = returnFocusRef?.current ?? previousActiveElementRef.current;
    if (returnTarget && returnTarget instanceof HTMLElement) {
      returnTarget.focus();
    }
  }, [enabled, returnFocusRef]);

  // Handle Tab key to trap focus
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, containerRef, getFocusableElements]);
}
