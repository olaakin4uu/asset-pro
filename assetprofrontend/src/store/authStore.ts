import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginResponse } from '@/types/auth';
import { authApi } from '@/lib/api';
import { onAuthEvent, clearAuthTokens, scheduleProactiveRefresh } from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (data: LoginResponse) => void;
  clearAuth: () => void;
  checkAuth: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          get().setAuth(response);
        } catch (error: unknown) {
          set({ error: extractErrorMessage(error, 'Login failed'), isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore logout errors
        } finally {
          clearAuthTokens('manual_logout');
          get().clearAuth();
        }
      },

      setAuth: (data: LoginResponse) => {
        // Store tokens in localStorage for API interceptor
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          // Persist the user's UI locale so LocaleProvider can pick it up
          // on next mount (and so the current mount sees it via the
          // companion event below). Livestock pilot 2026-04-24.
          const locale = (data.user as { locale?: string })?.locale;
          if (locale && ['en', 'yo', 'ha', 'ig'].includes(locale)) {
            localStorage.setItem('assetpro.locale', locale);
            window.dispatchEvent(new CustomEvent('assetpro:locale-changed', { detail: { locale } }));
          }
        }

        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Start proactive refresh timer for the new token
        scheduleProactiveRefresh();
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      checkAuth: async () => {
        const { accessToken } = get();
        if (!accessToken) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const user = await authApi.getProfile();
          set({ user, isAuthenticated: true });
        } catch {
          get().clearAuth();
        }
      },

      setError: (error: string | null) => set({ error }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================================================
// Listen for auth events from the API interceptor layer.
// ============================================================================
if (typeof window !== 'undefined') {
  onAuthEvent((event) => {
    const store = useAuthStore.getState();

    if (event.type === 'auth:cleared') {
      if (store.isAuthenticated) {
        store.clearAuth();
      }
    } else if (event.type === 'auth:refreshed') {
      useAuthStore.setState({
        accessToken: event.accessToken,
        refreshToken: event.refreshToken,
      });
    }
  });
}
