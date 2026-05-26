'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type SplitDirection = 'horizontal' | 'vertical';

export interface UseSplitPaneConfig {
  /** Split direction */
  direction?: SplitDirection;
  /** Initial ratio of first pane (0-1) */
  defaultRatio?: number;
  /** Minimum ratio for first pane */
  minRatio?: number;
  /** Maximum ratio for first pane */
  maxRatio?: number;
  /** Snap thresholds (ratios to snap to) */
  snapThresholds?: number[];
  /** Snap tolerance (how close to threshold to snap) */
  snapTolerance?: number;
  /** Persist ratio to localStorage */
  persistKey?: string;
  /** Allow collapsing first pane */
  collapsible?: boolean;
  /** Collapse threshold (ratio below which pane collapses) */
  collapseThreshold?: number;
  /** Callback when ratio changes */
  onRatioChange?: (ratio: number) => void;
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
  /** Callback when drag starts */
  onDragStart?: () => void;
  /** Callback when drag ends */
  onDragEnd?: (ratio: number) => void;
}

export interface UseSplitPaneReturn {
  // State
  ratio: number;
  isDragging: boolean;
  isCollapsed: boolean;

  // Computed sizes (percentages)
  primarySize: number;
  secondarySize: number;

  // Actions
  setRatio: (ratio: number) => void;
  collapse: () => void;
  expand: () => void;
  toggleCollapse: () => void;
  reset: () => void;

  // Drag handlers
  handleDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  handleDrag: (e: MouseEvent | TouchEvent) => void;
  handleDragEnd: () => void;

  // Refs for container measurement
  containerRef: React.RefObject<HTMLDivElement | null>;
  resizerRef: React.RefObject<HTMLDivElement | null>;

  // Styles
  primaryStyle: React.CSSProperties;
  secondaryStyle: React.CSSProperties;
  resizerStyle: React.CSSProperties;
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

function loadRatio(key: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`split-pane-${key}`);
    return stored ? parseFloat(stored) : null;
  } catch {
    return null;
  }
}

function saveRatio(key: string, ratio: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`split-pane-${key}`, String(ratio));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useSplitPane(config: UseSplitPaneConfig = {}): UseSplitPaneReturn {
  const {
    direction = 'horizontal',
    defaultRatio = 0.3,
    minRatio = 0.1,
    maxRatio = 0.9,
    snapThresholds = [],
    snapTolerance = 0.02,
    persistKey,
    collapsible = true,
    collapseThreshold = 0.05,
    onRatioChange,
    onCollapseChange,
    onDragStart,
    onDragEnd,
  } = config;

  // Load persisted ratio
  const persistedRatio = persistKey ? loadRatio(persistKey) : null;

  // State
  const [ratio, setRatioState] = useState(persistedRatio ?? defaultRatio);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [preCollapseRatio, setPreCollapseRatio] = useState(defaultRatio);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef<number>(0);
  const startRatioRef = useRef<number>(0);

  // Clamp and snap ratio
  const processRatio = useCallback(
    (newRatio: number): number => {
      // Clamp to min/max
      let result = Math.max(minRatio, Math.min(maxRatio, newRatio));

      // Snap to thresholds
      for (const threshold of snapThresholds) {
        if (Math.abs(result - threshold) < snapTolerance) {
          result = threshold;
          break;
        }
      }

      return result;
    },
    [minRatio, maxRatio, snapThresholds, snapTolerance]
  );

  // Set ratio with processing
  const setRatio = useCallback(
    (newRatio: number) => {
      // Check for collapse
      if (collapsible && newRatio < collapseThreshold) {
        if (!isCollapsed) {
          setPreCollapseRatio(ratio);
          setIsCollapsed(true);
          onCollapseChange?.(true);
        }
        setRatioState(0);
        if (persistKey) saveRatio(persistKey, 0);
        onRatioChange?.(0);
        return;
      }

      // Uncollapse if was collapsed
      if (isCollapsed && newRatio >= collapseThreshold) {
        setIsCollapsed(false);
        onCollapseChange?.(false);
      }

      const processed = processRatio(newRatio);
      setRatioState(processed);
      if (persistKey) saveRatio(persistKey, processed);
      onRatioChange?.(processed);
    },
    [
      collapsible,
      collapseThreshold,
      isCollapsed,
      ratio,
      processRatio,
      persistKey,
      onRatioChange,
      onCollapseChange,
    ]
  );

  // Collapse/expand actions
  const collapse = useCallback(() => {
    if (!collapsible || isCollapsed) return;
    setPreCollapseRatio(ratio);
    setIsCollapsed(true);
    setRatioState(0);
    if (persistKey) saveRatio(persistKey, 0);
    onCollapseChange?.(true);
    onRatioChange?.(0);
  }, [collapsible, isCollapsed, ratio, persistKey, onCollapseChange, onRatioChange]);

  const expand = useCallback(() => {
    if (!isCollapsed) return;
    setIsCollapsed(false);
    const newRatio = processRatio(preCollapseRatio);
    setRatioState(newRatio);
    if (persistKey) saveRatio(persistKey, newRatio);
    onCollapseChange?.(false);
    onRatioChange?.(newRatio);
  }, [isCollapsed, preCollapseRatio, processRatio, persistKey, onCollapseChange, onRatioChange]);

  const toggleCollapse = useCallback(() => {
    if (isCollapsed) {
      expand();
    } else {
      collapse();
    }
  }, [isCollapsed, expand, collapse]);

  const reset = useCallback(() => {
    setIsCollapsed(false);
    const newRatio = processRatio(defaultRatio);
    setRatioState(newRatio);
    if (persistKey) saveRatio(persistKey, newRatio);
    onCollapseChange?.(false);
    onRatioChange?.(newRatio);
  }, [defaultRatio, processRatio, persistKey, onCollapseChange, onRatioChange]);

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
      onDragStart?.();

      // Get initial position
      if ('touches' in e) {
        startPosRef.current =
          direction === 'horizontal' ? e.touches[0].clientX : e.touches[0].clientY;
      } else {
        startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
      }
      startRatioRef.current = ratio;
    },
    [direction, ratio, onDragStart]
  );

  const handleDrag = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;

      e.preventDefault();

      // Get current position
      let currentPos: number;
      if ('touches' in e) {
        currentPos =
          direction === 'horizontal' ? e.touches[0].clientX : e.touches[0].clientY;
      } else {
        currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      }

      // Calculate container size
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerSize =
        direction === 'horizontal' ? containerRect.width : containerRect.height;

      // Calculate new ratio
      const delta = currentPos - startPosRef.current;
      const deltaRatio = delta / containerSize;
      const newRatio = startRatioRef.current + deltaRatio;

      setRatio(newRatio);
    },
    [isDragging, direction, setRatio]
  );

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onDragEnd?.(ratio);
    }
  }, [isDragging, ratio, onDragEnd]);

  // Add global mouse/touch listeners during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handleDrag(e);
    const handleTouchMove = (e: TouchEvent) => handleDrag(e);
    const handleMouseUp = () => handleDragEnd();
    const handleTouchEnd = () => handleDragEnd();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, direction, handleDrag, handleDragEnd]);

  // Computed sizes
  const primarySize = isCollapsed ? 0 : ratio * 100;
  const secondarySize = isCollapsed ? 100 : (1 - ratio) * 100;

  // Styles
  const primaryStyle: React.CSSProperties =
    direction === 'horizontal'
      ? { width: `${primarySize}%`, height: '100%', flexShrink: 0 }
      : { height: `${primarySize}%`, width: '100%', flexShrink: 0 };

  const secondaryStyle: React.CSSProperties =
    direction === 'horizontal'
      ? { flex: 1, height: '100%', minWidth: 0 }
      : { flex: 1, width: '100%', minHeight: 0 };

  const resizerStyle: React.CSSProperties = {
    flexShrink: 0,
    cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
    ...(direction === 'horizontal'
      ? { width: '4px', height: '100%' }
      : { height: '4px', width: '100%' }),
  };

  return {
    // State
    ratio,
    isDragging,
    isCollapsed,

    // Computed sizes
    primarySize,
    secondarySize,

    // Actions
    setRatio,
    collapse,
    expand,
    toggleCollapse,
    reset,

    // Drag handlers
    handleDragStart,
    handleDrag,
    handleDragEnd,

    // Refs
    containerRef,
    resizerRef,

    // Styles
    primaryStyle,
    secondaryStyle,
    resizerStyle,
  };
}
