'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type ThemeColor = 'default' | 'professional' | 'vibrant' | 'modern';
export type ColorMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeColor;
  colorMode: ColorMode;
  resolvedMode: 'light' | 'dark';
  setTheme: (theme: ThemeColor) => void;
  setColorMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============================================================================
// HOOK
// ============================================================================

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

// ============================================================================
// INLINE SCRIPT (prevents flash of unstyled content)
// Must run before React hydrates.
// ============================================================================

const themeScript = `
(function(){
  try {
    var theme = localStorage.getItem('sp-theme') || 'default';
    var mode = localStorage.getItem('sp-color-mode') || 'light';
    var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var el = document.documentElement;
    if (theme !== 'default') el.setAttribute('data-theme', theme);
    if (dark) el.classList.add('dark');
    else el.classList.remove('dark');
  } catch(e){}
})();
`;

// ============================================================================
// PROVIDER
// ============================================================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeColor>('default');
  const [colorMode, setColorModeState] = useState<ColorMode>('light');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');

  // Initialize from localStorage on mount
  useEffect(() => {
    const savedTheme = (localStorage.getItem('sp-theme') || 'default') as ThemeColor;
    const savedMode = (localStorage.getItem('sp-color-mode') || 'light') as ColorMode;
    setThemeState(savedTheme);
    setColorModeState(savedMode);
  }, []);

  // Resolve system preference and apply dark class
  useEffect(() => {
    const applyMode = () => {
      let dark = false;
      if (colorMode === 'dark') {
        dark = true;
      } else if (colorMode === 'system') {
        dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      setResolvedMode(dark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', dark);
    };

    applyMode();

    // Listen for OS preference changes when in system mode
    if (colorMode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyMode();
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [colorMode]);

  // Apply data-theme attribute
  useEffect(() => {
    if (theme === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const setTheme = useCallback((t: ThemeColor) => {
    setThemeState(t);
    localStorage.setItem('sp-theme', t);
  }, []);

  const setColorMode = useCallback((m: ColorMode) => {
    setColorModeState(m);
    localStorage.setItem('sp-color-mode', m);
  }, []);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <ThemeContext.Provider value={{ theme, colorMode, resolvedMode, setTheme, setColorMode }}>
        {children}
      </ThemeContext.Provider>
    </>
  );
}
