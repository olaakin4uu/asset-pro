'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export type TourId =
  | 'welcome'
  | 'sidebar-navigation'
  | 'header-tools'
  | 'configuration-guide';

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  id: string;
  /** CSS selector for the target element to highlight */
  target: string;
  title: string;
  content: string;
  placement?: PopoverPlacement;
  /** Step is skipped if this module is not enabled for the tenant */
  moduleSlug?: string;
}

export interface TourDefinition {
  id: TourId;
  name: string;
  description: string;
  steps: TourStep[];
}

// ============================================================================
// STORE
// ============================================================================

interface TourState {
  // Active tour
  activeTourId: TourId | null;
  activeStepIndex: number;
  isRunning: boolean;

  // Persisted completion tracking
  completedTours: Record<string, boolean>;
  dismissedTours: Record<string, boolean>;

  // Actions
  startTour: (tourId: TourId) => void;
  setStepIndex: (index: number) => void;
  nextStep: (totalSteps: number) => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  dismissTour: (tourId: TourId) => void;
  resetTour: (tourId: TourId) => void;
  resetAllTours: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeTourId: null,
      activeStepIndex: 0,
      isRunning: false,
      completedTours: {},
      dismissedTours: {},

      startTour: (tourId: TourId) => {
        set({
          activeTourId: tourId,
          activeStepIndex: 0,
          isRunning: true,
        });
      },

      setStepIndex: (index: number) => {
        set({ activeStepIndex: index });
      },

      nextStep: (totalSteps: number) => {
        const { activeStepIndex } = get();
        if (activeStepIndex >= totalSteps - 1) {
          // Last step — complete the tour
          get().completeTour();
        } else {
          set({ activeStepIndex: activeStepIndex + 1 });
        }
      },

      prevStep: () => {
        const { activeStepIndex } = get();
        if (activeStepIndex > 0) {
          set({ activeStepIndex: activeStepIndex - 1 });
        }
      },

      skipTour: () => {
        set({
          activeTourId: null,
          activeStepIndex: 0,
          isRunning: false,
        });
      },

      completeTour: () => {
        const { activeTourId, completedTours } = get();
        if (activeTourId) {
          set({
            completedTours: { ...completedTours, [activeTourId]: true },
            activeTourId: null,
            activeStepIndex: 0,
            isRunning: false,
          });
        }
      },

      dismissTour: (tourId: TourId) => {
        const { dismissedTours } = get();
        set({
          dismissedTours: { ...dismissedTours, [tourId]: true },
          activeTourId: null,
          activeStepIndex: 0,
          isRunning: false,
        });
      },

      resetTour: (tourId: TourId) => {
        const { completedTours, dismissedTours } = get();
        const newCompleted = { ...completedTours };
        const newDismissed = { ...dismissedTours };
        delete newCompleted[tourId];
        delete newDismissed[tourId];
        set({ completedTours: newCompleted, dismissedTours: newDismissed });
      },

      resetAllTours: () => {
        set({ completedTours: {}, dismissedTours: {} });
      },
    }),
    {
      name: 'tour-guide',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        completedTours: state.completedTours,
        dismissedTours: state.dismissedTours,
      }),
    }
  )
);
