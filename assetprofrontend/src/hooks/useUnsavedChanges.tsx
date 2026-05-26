'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

export interface UseUnsavedChangesConfig {
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Custom warning message */
  message?: string;
  /** Enable browser beforeunload warning */
  warnOnBrowserClose?: boolean;
  /** Enable router navigation warning */
  warnOnRouteChange?: boolean;
  /** Callback when user confirms navigation */
  onConfirm?: () => void;
  /** Callback when user cancels navigation */
  onCancel?: () => void;
  /** Skip warning for certain paths */
  ignorePaths?: string[];
}

export interface UseUnsavedChangesReturn {
  // State
  isDirty: boolean;
  isBlocking: boolean;
  showDialog: boolean;
  pendingPath: string | null;

  // Actions
  setDirty: (dirty: boolean) => void;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
  allowNavigation: () => void;

  // Dialog helpers
  dialogProps: {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    message: string;
  };

  // Simplified API (backward compatibility with requirements)
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Warning message */
  warningMessage: string;
  /** Manually reset unsaved changes state */
  reset: () => void;
}

// ============================================================================
// DEFAULT MESSAGE
// ============================================================================

const DEFAULT_MESSAGE =
  'You have unsaved changes. Are you sure you want to leave this page?';

// ============================================================================
// HOOK
// ============================================================================

export function useUnsavedChanges(
  config: UseUnsavedChangesConfig
): UseUnsavedChangesReturn {
  const {
    isDirty: externalIsDirty,
    message = DEFAULT_MESSAGE,
    warnOnBrowserClose = true,
    warnOnRouteChange = true,
    onConfirm,
    onCancel,
    ignorePaths = [],
  } = config;

  const router = useRouter();

  // State
  const [isDirty, setIsDirty] = useState(externalIsDirty);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [isNavigationAllowed, setIsNavigationAllowed] = useState(false);

  // Refs
  const isBlockingRef = useRef(false);

  // Sync with external isDirty
  useEffect(() => {
    setIsDirty(externalIsDirty);
  }, [externalIsDirty]);

  // Update blocking state
  const isBlocking = isDirty && !isNavigationAllowed;
  isBlockingRef.current = isBlocking;

  // Handle browser close/refresh
  useEffect(() => {
    if (!warnOnBrowserClose) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isBlockingRef.current) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [warnOnBrowserClose, message]);

  // Handle route changes (Next.js App Router)
  useEffect(() => {
    if (!warnOnRouteChange) return;

    // Override router.push
    const originalPush = router.push.bind(router);

    const handleRouteChange = (
      href: string,
      options?: { scroll?: boolean }
    ) => {
      // Check if path should be ignored
      const shouldIgnore = ignorePaths.some(
        (path) => href.startsWith(path) || href === path
      );

      if (isBlockingRef.current && !shouldIgnore) {
        setPendingPath(href);
        setShowDialog(true);
        // Return a never-resolving promise to prevent navigation
        return new Promise(() => {});
      }

      return originalPush(href, options);
    };

    // Override router methods
    (router as { push: typeof handleRouteChange }).push = handleRouteChange;

    return () => {
      (router as { push: typeof originalPush }).push = originalPush;
    };
  }, [router, warnOnRouteChange, ignorePaths]);

  // Handle popstate (browser back/forward)
  useEffect(() => {
    if (!warnOnRouteChange) return;

    const handlePopState = (e: PopStateEvent) => {
      if (isBlockingRef.current) {
        e.preventDefault();
        // Push current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
        setPendingPath('back');
        setShowDialog(true);
      }
    };

    // Push initial state
    if (isBlockingRef.current) {
      window.history.pushState(null, '', window.location.href);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [warnOnRouteChange]);

  // Confirm navigation
  const confirmNavigation = useCallback(() => {
    setShowDialog(false);
    setIsNavigationAllowed(true);
    onConfirm?.();

    // Navigate to pending path
    if (pendingPath) {
      if (pendingPath === 'back') {
        window.history.back();
      } else {
        router.push(pendingPath);
      }
      setPendingPath(null);
    }

    // Reset after navigation
    setTimeout(() => {
      setIsNavigationAllowed(false);
    }, 100);
  }, [pendingPath, router, onConfirm]);

  // Cancel navigation
  const cancelNavigation = useCallback(() => {
    setShowDialog(false);
    setPendingPath(null);
    onCancel?.();
  }, [onCancel]);

  // Allow navigation (skip warning)
  const allowNavigation = useCallback(() => {
    setIsNavigationAllowed(true);
  }, []);

  // Set dirty state
  const setDirtyState = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
    if (!dirty) {
      setIsNavigationAllowed(false);
    }
  }, []);

  // Dialog props helper
  const dialogProps = {
    open: showDialog,
    onConfirm: confirmNavigation,
    onCancel: cancelNavigation,
    message,
  };

  return {
    // State
    isDirty,
    isBlocking,
    showDialog,
    pendingPath,

    // Actions
    setDirty: setDirtyState,
    confirmNavigation,
    cancelNavigation,
    allowNavigation,

    // Dialog helpers
    dialogProps,

    // Simplified API (backward compatibility)
    hasUnsavedChanges: isBlocking,
    warningMessage: message,
    reset: () => {
      setDirtyState(false);
      setIsNavigationAllowed(false);
      setPendingPath(null);
      setShowDialog(false);
    },
  };
}

// ============================================================================
// DIALOG COMPONENT (Optional export for convenience)
// ============================================================================

export interface UnsavedChangesDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message?: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * PrimeReact-based unsaved changes dialog component
 *
 * @example
 * ```tsx
 * const form = useForm<FormData>();
 * const unsaved = useUnsavedChanges({ isDirty: form.formState.isDirty });
 *
 * <UnsavedChangesDialog {...unsaved.dialogProps} />
 * ```
 */
export function UnsavedChangesDialog({
  open,
  onConfirm,
  onCancel,
  message = DEFAULT_MESSAGE,
  title = 'Unsaved Changes',
  confirmText = 'Leave Page',
  cancelText = 'Stay on Page',
}: UnsavedChangesDialogProps) {
  // Lazy load Dialog and Button from PrimeReact to avoid import issues
  const Dialog = require('primereact/dialog').Dialog;
  const Button = require('primereact/button').Button;

  const footer = (
    <div className="flex justify-end gap-2">
      <Button
        label={cancelText}
        icon="pi pi-times"
        onClick={onCancel}
        severity="secondary"
        outlined
      />
      <Button
        label={confirmText}
        icon="pi pi-check"
        onClick={onConfirm}
        severity="danger"
      />
    </div>
  );

  return (
    <Dialog
      header={title}
      visible={open}
      onHide={onCancel}
      footer={footer}
      modal
      style={{ width: '450px' }}
      breakpoints={{ '960px': '75vw', '640px': '90vw' }}
    >
      <div className="flex items-start gap-3">
        <i className="pi pi-exclamation-triangle text-yellow-500 text-2xl mt-1" />
        <p className="text-gray-700">{message}</p>
      </div>
    </Dialog>
  );
}
