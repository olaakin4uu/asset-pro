'use client';

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import type { TourStep, PopoverPlacement } from '@/stores/tour';
import type { TourTargetRect } from '@/hooks/useTour';

// ============================================================================
// TYPES
// ============================================================================

export interface TourOverlayProps {
  isRunning: boolean;
  currentStep: TourStep | null;
  currentStepIndex: number;
  totalSteps: number;
  targetRect: TourTargetRect | null;
  popoverPlacement: PopoverPlacement;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  canGoPrev: boolean;
  isLastStep: boolean;
}

// ============================================================================
// POPOVER POSITIONING
// ============================================================================

const POPOVER_GAP = 12;
const POPOVER_WIDTH = 360;

function getPopoverStyle(
  targetRect: TourTargetRect,
  placement: PopoverPlacement
): React.CSSProperties {
  const style: React.CSSProperties = {
    position: 'fixed',
    width: POPOVER_WIDTH,
    zIndex: 10000,
  };

  switch (placement) {
    case 'bottom':
      style.top = targetRect.top + targetRect.height + POPOVER_GAP;
      style.left = Math.max(
        12,
        Math.min(
          targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2,
          window.innerWidth - POPOVER_WIDTH - 12
        )
      );
      break;
    case 'top':
      style.bottom = window.innerHeight - targetRect.top + POPOVER_GAP;
      style.left = Math.max(
        12,
        Math.min(
          targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2,
          window.innerWidth - POPOVER_WIDTH - 12
        )
      );
      break;
    case 'right':
      style.top = Math.max(
        12,
        targetRect.top + targetRect.height / 2 - 60
      );
      style.left = Math.min(
        targetRect.left + targetRect.width + POPOVER_GAP,
        window.innerWidth - POPOVER_WIDTH - 12
      );
      break;
    case 'left':
      style.top = Math.max(
        12,
        targetRect.top + targetRect.height / 2 - 60
      );
      style.right = window.innerWidth - targetRect.left + POPOVER_GAP;
      break;
  }

  return style;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TourOverlay({
  isRunning,
  currentStep,
  currentStepIndex,
  totalSteps,
  targetRect,
  popoverPlacement,
  onNext,
  onPrev,
  onSkip,
  canGoPrev,
  isLastStep,
}: TourOverlayProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Focus the popover when step changes for accessibility
  useEffect(() => {
    if (isRunning && popoverRef.current) {
      popoverRef.current.focus();
    }
  }, [isRunning, currentStepIndex]);

  if (!isRunning || !currentStep || !targetRect) return null;

  const popoverStyle = getPopoverStyle(targetRect, popoverPlacement);

  return (
    <>
      {/* Backdrop — 4 rectangles around the target creating a cutout */}
      {/* Top */}
      <div
        className="fixed inset-x-0 top-0 bg-black/50 transition-all duration-300"
        style={{ height: Math.max(0, targetRect.top), zIndex: 9998 }}
        onClick={onSkip}
      />
      {/* Bottom */}
      <div
        className="fixed inset-x-0 bottom-0 bg-black/50 transition-all duration-300"
        style={{
          top: targetRect.top + targetRect.height,
          zIndex: 9998,
        }}
        onClick={onSkip}
      />
      {/* Left */}
      <div
        className="fixed left-0 bg-black/50 transition-all duration-300"
        style={{
          top: targetRect.top,
          width: Math.max(0, targetRect.left),
          height: targetRect.height,
          zIndex: 9998,
        }}
        onClick={onSkip}
      />
      {/* Right */}
      <div
        className="fixed right-0 bg-black/50 transition-all duration-300"
        style={{
          top: targetRect.top,
          left: targetRect.left + targetRect.width,
          height: targetRect.height,
          zIndex: 9998,
        }}
        onClick={onSkip}
      />

      {/* Highlight ring around target */}
      <div
        className="pointer-events-none fixed rounded-lg ring-2 ring-primary shadow-lg shadow-primary/25 transition-all duration-300"
        style={{
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
          zIndex: 9999,
        }}
      />

      {/* Popover card */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-label={currentStep.title}
        tabIndex={-1}
        className="rounded-xl border border-border bg-card shadow-2xl outline-none transition-all duration-300"
        style={popoverStyle}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            {/* Progress dots */}
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === currentStepIndex
                      ? 'w-4 bg-primary'
                      : i < currentStepIndex
                        ? 'w-1.5 bg-primary/50'
                        : 'w-1.5 bg-muted-foreground/20'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={onSkip}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Close tour"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">
            {currentStep.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {currentStep.content}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            onClick={onSkip}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {canGoPrev && (
              <button
                onClick={onPrev}
                className="flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            <button
              onClick={onNext}
              className="flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isLastStep ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Done
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
