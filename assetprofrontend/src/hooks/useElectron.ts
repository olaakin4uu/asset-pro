'use client';

import { useState, useEffect } from 'react';

/**
 * Detects whether the app is running inside SalvageConnect (Electron)
 * and provides typed access to the native API bridge.
 *
 * Usage:
 *   const { isElectron, api } = useElectron();
 *   if (isElectron && api) {
 *     await api.print({ content: html, type: 'thermal' });
 *   }
 */
export function useElectron() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
  }, []);

  return {
    /** True when running inside SalvageConnect */
    isElectron,
    /** The electronAPI bridge — only available when isElectron is true */
    api: isElectron ? window.electronAPI : undefined,
  };
}

/**
 * Non-hook utility for checking Electron availability in callbacks.
 * Use this when you need a synchronous check outside of React lifecycle.
 */
export function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

/**
 * Get the electronAPI directly — returns undefined if not in Electron.
 * Useful in event handlers and callbacks where hooks can't be used.
 */
export function getElectronAPI(): ElectronAPI | undefined {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  return undefined;
}
