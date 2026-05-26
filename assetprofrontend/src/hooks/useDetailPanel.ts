'use client';

import { useState, useCallback, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type PanelPosition = 'right' | 'bottom' | 'left';
export type PanelMode = 'side' | 'overlay' | 'fullscreen';

export interface UseDetailPanelConfig {
  /** Initial open state */
  initialOpen?: boolean;
  /** Panel position */
  position?: PanelPosition;
  /** Panel mode */
  mode?: PanelMode;
  /** Panel width (for side position) */
  width?: number | string;
  /** Panel height (for bottom position) */
  height?: number | string;
  /** Minimum width */
  minWidth?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Maximum height */
  maxHeight?: number;
  /** Persist state to localStorage */
  persistKey?: string;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Close when clicking outside (overlay mode) */
  closeOnOutsideClick?: boolean;
  /** Callback when panel opens */
  onOpen?: () => void;
  /** Callback when panel closes */
  onClose?: () => void;
  /** Callback when position changes */
  onPositionChange?: (position: PanelPosition) => void;
  /** Callback when mode changes */
  onModeChange?: (mode: PanelMode) => void;
}

export interface UseDetailPanelReturn {
  // State
  isOpen: boolean;
  position: PanelPosition;
  mode: PanelMode;
  width: number | string;
  height: number | string;

  // Actions
  open: () => void;
  close: () => void;
  toggle: () => void;
  setPosition: (position: PanelPosition) => void;
  setMode: (mode: PanelMode) => void;
  setWidth: (width: number | string) => void;
  setHeight: (height: number | string) => void;
  maximize: () => void;
  minimize: () => void;

  // Helpers
  panelStyle: React.CSSProperties;
  overlayVisible: boolean;
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

interface PersistedState {
  position: PanelPosition;
  mode: PanelMode;
  width: number | string;
  height: number | string;
}

function loadPersistedState(key: string): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`detail-panel-${key}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function savePersistedState(key: string, state: PersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`detail-panel-${key}`, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useDetailPanel(
  config: UseDetailPanelConfig = {}
): UseDetailPanelReturn {
  const {
    initialOpen = false,
    position: initialPosition = 'right',
    mode: initialMode = 'side',
    width: initialWidth = 400,
    height: initialHeight = 300,
    minWidth = 300,
    maxWidth = 800,
    minHeight = 200,
    maxHeight = 600,
    persistKey,
    closeOnEscape = true,
    closeOnOutsideClick = true,
    onOpen,
    onClose,
    onPositionChange,
    onModeChange,
  } = config;

  // Load persisted state
  const persistedState = persistKey ? loadPersistedState(persistKey) : null;

  // State
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [position, setPositionState] = useState<PanelPosition>(
    persistedState?.position ?? initialPosition
  );
  const [mode, setModeState] = useState<PanelMode>(
    persistedState?.mode ?? initialMode
  );
  const [width, setWidthState] = useState<number | string>(
    persistedState?.width ?? initialWidth
  );
  const [height, setHeightState] = useState<number | string>(
    persistedState?.height ?? initialHeight
  );

  // Save state when it changes
  const persistState = useCallback(() => {
    if (!persistKey) return;
    savePersistedState(persistKey, { position, mode, width, height });
  }, [persistKey, position, mode, width, height]);

  // Actions
  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const setPosition = useCallback(
    (newPosition: PanelPosition) => {
      setPositionState(newPosition);
      onPositionChange?.(newPosition);
      persistState();
    },
    [onPositionChange, persistState]
  );

  const setMode = useCallback(
    (newMode: PanelMode) => {
      setModeState(newMode);
      onModeChange?.(newMode);
      persistState();
    },
    [onModeChange, persistState]
  );

  const setWidth = useCallback(
    (newWidth: number | string) => {
      // Clamp numeric values
      if (typeof newWidth === 'number') {
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      }
      setWidthState(newWidth);
      persistState();
    },
    [minWidth, maxWidth, persistState]
  );

  const setHeight = useCallback(
    (newHeight: number | string) => {
      // Clamp numeric values
      if (typeof newHeight === 'number') {
        newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      }
      setHeightState(newHeight);
      persistState();
    },
    [minHeight, maxHeight, persistState]
  );

  const maximize = useCallback(() => {
    setMode('fullscreen');
  }, [setMode]);

  const minimize = useCallback(() => {
    setMode('side');
  }, [setMode]);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, isOpen, close]);

  // Compute panel style
  const panelStyle: React.CSSProperties = (() => {
    if (mode === 'fullscreen') {
      return {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
      };
    }

    if (mode === 'overlay') {
      const baseStyle: React.CSSProperties = {
        position: 'fixed',
        zIndex: 50,
      };

      switch (position) {
        case 'right':
          return {
            ...baseStyle,
            top: 0,
            right: 0,
            bottom: 0,
            width: typeof width === 'number' ? `${width}px` : width,
          };
        case 'left':
          return {
            ...baseStyle,
            top: 0,
            left: 0,
            bottom: 0,
            width: typeof width === 'number' ? `${width}px` : width,
          };
        case 'bottom':
          return {
            ...baseStyle,
            left: 0,
            right: 0,
            bottom: 0,
            height: typeof height === 'number' ? `${height}px` : height,
          };
      }
    }

    // Side mode (inline)
    switch (position) {
      case 'right':
      case 'left':
        return {
          width: typeof width === 'number' ? `${width}px` : width,
          minWidth: `${minWidth}px`,
          maxWidth: `${maxWidth}px`,
          height: '100%',
        };
      case 'bottom':
        return {
          width: '100%',
          height: typeof height === 'number' ? `${height}px` : height,
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
        };
    }
  })();

  // Overlay is visible in overlay mode when panel is open
  const overlayVisible = isOpen && mode === 'overlay';

  return {
    // State
    isOpen,
    position,
    mode,
    width,
    height,

    // Actions
    open,
    close,
    toggle,
    setPosition,
    setMode,
    setWidth,
    setHeight,
    maximize,
    minimize,

    // Helpers
    panelStyle,
    overlayVisible,
  };
}
