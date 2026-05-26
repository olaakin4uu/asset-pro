'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// ============================================================================
// COMPANY SWITCH TRANSITION OVERLAY
// ============================================================================

interface TransitionState {
  isVisible: boolean;
  companyName: string;
  companyId: number | null;
}

export function CompanySwitchTransition() {
  const [state, setState] = useState<TransitionState>({
    isVisible: false,
    companyName: '',
    companyId: null,
  });
  const [mounted, setMounted] = useState(false);

  // Get company initials
  const companyInitials = state.companyName
    ? state.companyName
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2)
    : 'CO';

  // Handle transition start
  const handleStartTransition = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ companyName: string; companyId: number }>;
    setState({
      isVisible: true,
      companyName: customEvent.detail.companyName,
      companyId: customEvent.detail.companyId,
    });
  }, []);

  // Handle transition end (success or error)
  const handleEndTransition = useCallback(() => {
    // Delay hiding to allow for smooth exit
    setTimeout(() => {
      setState((prev) => ({ ...prev, isVisible: false }));
    }, 500);
  }, []);

  // Setup event listeners
  useEffect(() => {
    setMounted(true);

    window.addEventListener('company-switch-start', handleStartTransition);
    window.addEventListener('company-switch-success', handleEndTransition);
    window.addEventListener('company-switch-error', handleEndTransition);

    return () => {
      window.removeEventListener('company-switch-start', handleStartTransition);
      window.removeEventListener('company-switch-success', handleEndTransition);
      window.removeEventListener('company-switch-error', handleEndTransition);
    };
  }, [handleStartTransition, handleEndTransition]);

  // Don't render on server
  if (!mounted) return null;

  // Use portal to render at body level
  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-500',
        state.isVisible
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
        {/* Moving Gradient Orbs */}
        <div
          className={cn(
            'absolute -top-40 -left-40 h-96 w-96 rounded-full bg-pink-500/30 blur-3xl transition-transform duration-[8000ms] ease-in-out',
            state.isVisible && 'translate-x-20 translate-y-20'
          )}
        />
        <div
          className={cn(
            'absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl transition-transform duration-[8000ms] ease-in-out',
            state.isVisible && '-translate-x-20 -translate-y-20'
          )}
        />
        <div
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-white/10 blur-3xl transition-transform duration-[4000ms]',
            state.isVisible && 'scale-150'
          )}
        />
      </div>

      {/* Center Content */}
      <div className="relative z-10 flex flex-col items-center px-8">
        {/* Company Logo with Glow */}
        <div
          className={cn(
            'mb-8 transition-all duration-700',
            state.isVisible
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-75 translate-y-8'
          )}
        >
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute -inset-4 animate-pulse rounded-3xl bg-white/20 blur-xl" />
            {/* Logo Container */}
            <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl border-4 border-white/40 bg-white/10 text-5xl font-bold text-white shadow-2xl ring-4 ring-white/20 backdrop-blur-sm">
              {companyInitials}
            </div>
          </div>
        </div>

        {/* Status Text */}
        <div
          className={cn(
            'text-center transition-all duration-700 delay-150',
            state.isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          )}
        >
          <p className="mb-2 text-lg font-medium text-white/80">
            Switching workspace to
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white">
            {state.companyName || 'Company'}
          </h1>
          <p className="text-sm text-white/60">Please wait...</p>
        </div>

        {/* Loading Animation */}
        <div
          className={cn(
            'mt-10 transition-all duration-700 delay-300',
            state.isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          )}
        >
          {/* Bouncing Dots */}
          <div className="flex items-center justify-center space-x-3">
            <div
              className="h-4 w-4 rounded-full bg-white animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="h-4 w-4 rounded-full bg-white animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="h-4 w-4 rounded-full bg-white animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>

          {/* Progress Bar */}
          <div className="mt-8 h-1.5 w-64 overflow-hidden rounded-full bg-white/20">
            <div
              className={cn(
                'h-full rounded-full bg-gradient-to-r from-white via-white to-transparent transition-all duration-[2000ms] ease-out',
                state.isVisible ? 'w-full' : 'w-0'
              )}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
