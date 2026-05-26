'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'wheel',
];

interface UseIdleTimeoutOptions {
  /** Milliseconds of inactivity before showing the warning dialog */
  idleMs: number;
  /** Milliseconds the warning dialog shows before auto-logout */
  warningMs: number;
  /** Called when the auto-logout countdown reaches zero */
  onLogout: () => void;
  /** Whether the timeout is active (disable on login page, etc.) */
  enabled?: boolean;
}

interface UseIdleTimeoutReturn {
  /** Warning dialog is showing */
  isWarning: boolean;
  /** Seconds remaining in the countdown (only meaningful when isWarning=true) */
  secondsLeft: number;
  /** Reset the idle timer (user clicked "Stay logged in") */
  stayLoggedIn: () => void;
}

export function useIdleTimeout({
  idleMs,
  warningMs,
  onLogout,
  enabled = true,
}: UseIdleTimeoutOptions): UseIdleTimeoutReturn {
  const [isWarning, setIsWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(warningMs / 1000));

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const clearCountdown = useCallback(() => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    setIsWarning(true);
    setSecondsLeft(Math.floor(warningMs / 1000));

    clearCountdown();
    countdownInterval.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearCountdown();
          onLogoutRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [warningMs, clearCountdown]);

  const resetIdleTimer = useCallback(() => {
    if (!enabled) return;

    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(startCountdown, idleMs);
  }, [enabled, idleMs, startCountdown]);

  const stayLoggedIn = useCallback(() => {
    setIsWarning(false);
    clearCountdown();
    resetIdleTimer();
  }, [clearCountdown, resetIdleTimer]);

  // Attach activity listeners
  useEffect(() => {
    if (!enabled) return;

    resetIdleTimer();

    const handleActivity = () => {
      // Don't reset timer if warning is already showing — user must click the button
      if (!isWarning) resetIdleTimer();
    };

    IDLE_EVENTS.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      IDLE_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      clearCountdown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isWarning]);

  return { isWarning, secondsLeft, stayLoggedIn };
}
