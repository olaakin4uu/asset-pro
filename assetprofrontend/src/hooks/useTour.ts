'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTourStore, type TourId, type TourStep, type PopoverPlacement } from '@/stores/tour';
import { useCompanyContextStore } from '@/stores/company-context';
import { tourDefinitions, getTourById } from '@/lib/tour-definitions';

// ============================================================================
// TYPES
// ============================================================================

export interface UseTourConfig {
  /** Auto-start this tour if it hasn't been completed or dismissed */
  autoStart?: TourId;
  /** Delay in ms before auto-starting (default: 1500) */
  autoStartDelay?: number;
}

export interface TourTargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface UseTourReturn {
  // State
  isRunning: boolean;
  currentStep: TourStep | null;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
  tourId: TourId | null;

  // Target element positioning
  targetRect: TourTargetRect | null;
  popoverPlacement: PopoverPlacement;

  // Navigation
  next: () => void;
  prev: () => void;
  skip: () => void;

  // Can-actions
  canGoNext: boolean;
  canGoPrev: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;

  // Tour management
  startTour: (tourId: TourId) => void;
  availableTours: Array<{
    id: TourId;
    name: string;
    description: string;
    completed: boolean;
  }>;
  isTourCompleted: (tourId: TourId) => boolean;
}

// ============================================================================
// HOOK
// ============================================================================

const PADDING = 8; // px padding around highlighted element

export function useTour(config?: UseTourConfig): UseTourReturn {
  const {
    activeTourId,
    activeStepIndex,
    isRunning,
    completedTours,
    dismissedTours,
    startTour: storeStartTour,
    nextStep: storeNextStep,
    prevStep: storePrevStep,
    skipTour: storeSkipTour,
  } = useTourStore();

  const enabledModules = useCompanyContextStore((s) => s.enabledModules);

  const [targetRect, setTargetRect] = useState<TourTargetRect | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const autoStartedRef = useRef(false);

  // Get the active tour definition
  const activeTour = useMemo(() => {
    if (!activeTourId) return null;
    return getTourById(activeTourId) ?? null;
  }, [activeTourId]);

  // Filter steps by enabled modules
  const effectiveSteps = useMemo(() => {
    if (!activeTour) return [];
    return activeTour.steps.filter((step) => {
      if (!step.moduleSlug) return true;
      if (!enabledModules.length) return true; // Not loaded yet — show all
      const mod = enabledModules.find((m) => m.slug === step.moduleSlug);
      return mod ? mod.isEnabled : false;
    });
  }, [activeTour, enabledModules]);

  const currentStep = effectiveSteps[activeStepIndex] ?? null;
  const totalSteps = effectiveSteps.length;

  // Calculate popover placement
  const popoverPlacement: PopoverPlacement = useMemo(() => {
    if (currentStep?.placement) return currentStep.placement;
    if (!targetRect) return 'bottom';

    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const targetCenter = targetRect.top + targetRect.height / 2;
    return targetCenter < viewportHeight / 2 ? 'bottom' : 'top';
  }, [currentStep, targetRect]);

  // Track target element position
  const updateTargetRect = useCallback(() => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(currentStep.target);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top - PADDING,
      left: rect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: rect.height + PADDING * 2,
    });
  }, [currentStep]);

  // Watch for target element changes and scroll
  useEffect(() => {
    if (!isRunning || !currentStep) {
      setTargetRect(null);
      return;
    }

    // Small delay to let any animations/transitions settle
    const timeout = setTimeout(() => {
      const el = document.querySelector(currentStep.target);
      if (!el) {
        // Element not found — skip this step
        setTargetRect(null);
        return;
      }

      // Scroll element into view if needed
      const rect = el.getBoundingClientRect();
      const isInViewport =
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.left >= 0 &&
        rect.right <= window.innerWidth;

      if (!isInViewport) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Wait for scroll to finish before measuring
        setTimeout(updateTargetRect, 400);
      } else {
        updateTargetRect();
      }

      // Observe for layout changes
      observerRef.current?.disconnect();
      observerRef.current = new ResizeObserver(updateTargetRect);
      observerRef.current.observe(el);
    }, 100);

    // Also update on scroll/resize
    const handleLayout = () => updateTargetRect();
    window.addEventListener('scroll', handleLayout, true);
    window.addEventListener('resize', handleLayout);

    return () => {
      clearTimeout(timeout);
      observerRef.current?.disconnect();
      window.removeEventListener('scroll', handleLayout, true);
      window.removeEventListener('resize', handleLayout);
    };
  }, [isRunning, currentStep, activeStepIndex, updateTargetRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isRunning) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          storeSkipTour();
          break;
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          storeNextStep(totalSteps);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          storePrevStep();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, totalSteps, storeNextStep, storePrevStep, storeSkipTour]);

  // Auto-start for first-time users
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!config?.autoStart) return;

    const tourId = config.autoStart;
    if (completedTours[tourId] || dismissedTours[tourId]) return;
    if (isRunning) return; // Another tour is already running

    autoStartedRef.current = true;
    const delay = config.autoStartDelay ?? 1500;
    const timeout = setTimeout(() => {
      // Check again in case state changed during delay
      const state = useTourStore.getState();
      if (!state.isRunning && !state.completedTours[tourId] && !state.dismissedTours[tourId]) {
        storeStartTour(tourId);
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [config?.autoStart, config?.autoStartDelay, completedTours, dismissedTours, isRunning, storeStartTour]);

  // Available tours list
  const availableTours = useMemo(() => {
    return tourDefinitions.map((tour) => ({
      id: tour.id,
      name: tour.name,
      description: tour.description,
      completed: !!completedTours[tour.id],
    }));
  }, [completedTours]);

  const isTourCompleted = useCallback(
    (tourId: TourId) => !!completedTours[tourId],
    [completedTours]
  );

  const startTour = useCallback(
    (tourId: TourId) => {
      storeStartTour(tourId);
    },
    [storeStartTour]
  );

  const next = useCallback(() => {
    storeNextStep(totalSteps);
  }, [storeNextStep, totalSteps]);

  const prev = useCallback(() => {
    storePrevStep();
  }, [storePrevStep]);

  const skip = useCallback(() => {
    storeSkipTour();
  }, [storeSkipTour]);

  return {
    isRunning,
    currentStep,
    currentStepIndex: activeStepIndex,
    totalSteps,
    progress: totalSteps > 0 ? Math.round(((activeStepIndex + 1) / totalSteps) * 100) : 0,
    tourId: activeTourId,

    targetRect,
    popoverPlacement,

    next,
    prev,
    skip,

    canGoNext: activeStepIndex < totalSteps - 1,
    canGoPrev: activeStepIndex > 0,
    isFirstStep: activeStepIndex === 0,
    isLastStep: activeStepIndex >= totalSteps - 1,

    startTour,
    availableTours,
    isTourCompleted,
  };
}
