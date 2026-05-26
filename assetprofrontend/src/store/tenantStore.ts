import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, publicAxios, onAuthEvent, clearAuthTokens, scheduleProactiveRefresh } from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils';

interface TenantUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface TenantInfo {
  id: string;
  companyName: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
}

interface TenantState {
  user: TenantUser | null;
  tenant: TenantInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string, subdomain: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchTenantInfo: (subdomain: string) => Promise<void>;
  setError: (error: string | null) => void;
  clearAuth: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string, subdomain: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await publicAxios.post('/auth/login', {
            email,
            password,
            subdomain,
          });

          const { accessToken, refreshToken, user } = response.data;

          // Store tokens
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
          }

          // Set tenant info from user response
          const tenantInfo: TenantInfo = {
            id: user.tenantId || subdomain,
            companyName: user.tenantName || subdomain,
            slug: subdomain,
          };

          set({
            user,
            tenant: tenantInfo,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // Start proactive refresh timer for the new token
          scheduleProactiveRefresh();
        } catch (error: unknown) {
          set({ error: extractErrorMessage(error, 'Login failed'), isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        // Fire-and-forget — never block sign-out on a potentially-stale API call
        api.post('/auth/logout').catch(() => {});
        clearAuthTokens('manual_logout');
        get().clearAuth();
      },

      fetchTenantInfo: async (subdomain: string) => {
        try {
          set({
            tenant: {
              id: subdomain,
              companyName: subdomain.charAt(0).toUpperCase() + subdomain.slice(1) + ' Company',
              slug: subdomain,
            },
          });
        } catch (error) {
          console.error('Failed to fetch tenant info:', error);
        }
      },

      setError: (error: string | null) => set({ error }),

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
    }),
    {
      name: 'tenant-auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================================================
// Listen for auth events from the API interceptor layer.
// When tokens are cleared (refresh failure, cross-tab logout, etc.),
// reset the store so the UI reacts immediately.
// When tokens are refreshed, update the store's token copies.
// ============================================================================
if (typeof window !== 'undefined') {
  onAuthEvent((event) => {
    const store = useTenantStore.getState();

    if (event.type === 'auth:cleared') {
      // Only clear if we think we're authenticated (avoid double-clear)
      if (store.isAuthenticated) {
        store.clearAuth();
      }
    } else if (event.type === 'auth:refreshed') {
      // Keep store in sync with the latest tokens
      useTenantStore.setState({
        accessToken: event.accessToken,
        refreshToken: event.refreshToken,
      });
    }
  });
}
