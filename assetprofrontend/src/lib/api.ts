import axios, { InternalAxiosRequestConfig, isAxiosError } from 'axios';
import { installOfflineInterceptors } from './offline/interceptor';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Offline-first: stamp idempotency keys on whitelisted writes + queue them
// to IndexedDB on network failure, so farm staff at rural sites can keep
// logging daily events when the signal drops. See docs/OFFLINE-FIRST-PLAN.md.
// Installed BEFORE the auth interceptor below so the queue entry captures
// the Authorization header that the auth interceptor will add.
installOfflineInterceptors(api);

// Public API instance — no auth interceptors, no token refresh
// Used for login, register, tenant branding, and other unauthenticated endpoints
export const publicAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// AUTH EVENT SYSTEM
// Allows stores and components to react to auth state changes from the
// interceptor layer without direct coupling.
// ============================================================================

export type AuthEventType = 'auth:refreshed' | 'auth:cleared';

export interface AuthRefreshedEvent {
  type: 'auth:refreshed';
  accessToken: string;
  refreshToken: string;
}

export interface AuthClearedEvent {
  type: 'auth:cleared';
  reason: 'refresh_failed' | 'no_refresh_token' | 'manual_logout' | 'cross_tab';
}

export type AuthEvent = AuthRefreshedEvent | AuthClearedEvent;

type AuthEventListener = (event: AuthEvent) => void;

const authEventListeners = new Set<AuthEventListener>();

export function onAuthEvent(listener: AuthEventListener): () => void {
  authEventListeners.add(listener);
  return () => {
    authEventListeners.delete(listener);
  };
}

function emitAuthEvent(event: AuthEvent): void {
  authEventListeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // Listener errors should not break the auth flow
    }
  });
}

/**
 * Clear tokens from localStorage and notify all listeners.
 * This is the single source of truth for "logging out" from the API layer.
 *
 * For non-manual logouts (token expiry, refresh failure), we do a hard
 * redirect to /auth/login using window.location.  This guarantees the user
 * is sent to login even if the React tree is in a broken state (e.g. the
 * Next.js router can't push because a hydration error occurred).
 */
export function clearAuthTokens(reason: AuthClearedEvent['reason']): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  // Portal keeps its own token set — wipe those too so /portal/login doesn't
  // auto-redirect back into the dashboard using a stale token.
  localStorage.removeItem('portal_access_token');
  localStorage.removeItem('portal_refresh_token');
  localStorage.removeItem('portal_user');
  emitAuthEvent({ type: 'auth:cleared', reason });

  // Hard redirect for session expiry — Next.js router.push may not work
  // if the app state is corrupted.  Manual logout is handled by the
  // component that called logout() so we skip it here.
  if (reason !== 'manual_logout' && reason !== 'cross_tab') {
    // Small delay so stores can clear first (prevents flash of stale UI)
    setTimeout(() => {
      const path = window.location.pathname;
      // Already on a login page — don't redirect (would erase typed credentials)
      if (path.startsWith('/auth/') || path.startsWith('/portal/login')) return;
      // Route portal users to portal login, everyone else to ERP login
      window.location.href = path.startsWith('/portal/') ? '/portal/login' : '/auth/login';
    }, 100);
  }
}

// ============================================================================
// TOKEN REFRESH QUEUE (MUTEX)
// Only one refresh request can be in-flight at a time. All other 401
// responses wait for the same promise and then retry with the new token.
// ============================================================================

let refreshPromise: Promise<string> | null = null;

// Raw attempt — throws on any network/server error but does NOT call clearAuthTokens.
// Callers decide whether the failure is fatal (401 on real request) or retryable (proactive).
async function attemptTokenRefresh(): Promise<string> {
  const refreshToken =
    typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

  if (!refreshToken) {
    throw new Error('no_refresh_token');
  }

  // Use raw axios (not the `api` instance) to avoid interceptor loops.
  // 10-second timeout prevents a backend restart from freezing refreshPromise
  // permanently (no timeout = promise stays pending forever, blocking all 401 retries).
  const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
    refreshToken,
  }, { timeout: 10000 });

  const { accessToken, refreshToken: newRefreshToken } = response.data;

  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', newRefreshToken);

  emitAuthEvent({
    type: 'auth:refreshed',
    accessToken,
    refreshToken: newRefreshToken,
  });

  return accessToken;
}

// Called by the 401 response interceptor — a real request failed so we MUST
// either get a new token or log the user out. No retries here.
function refreshAccessToken(): Promise<string> {
  // If a refresh is already in progress, piggyback on it
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      return await attemptTokenRefresh();
    } catch (err) {
      const reason = (err as Error).message === 'no_refresh_token' ? 'no_refresh_token' : 'refresh_failed';
      clearAuthTokens(reason);
      throw new Error('Token refresh failed');
    }
  })().finally(() => {
    // Release the lock so future 401s can retry
    refreshPromise = null;
  });

  return refreshPromise;
}

// ============================================================================
// PROACTIVE TOKEN REFRESH
// Parse the JWT exp claim and schedule a refresh before it expires.
// Refreshes at 80% of the token's lifetime (i.e. ~12 min for a 15-min token).
// On transient failure retries with exponential backoff — never logs the user
// out proactively. If the token is already expired when the user makes a real
// request, the 401 interceptor handles it.
// ============================================================================

let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

function parseJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

async function proactiveRefreshWithRetry(attempt = 1): Promise<void> {
  try {
    await attemptTokenRefresh();
    scheduleProactiveRefresh();
  } catch {
    // Transient failure (network blip, server restart, throttle).
    // Retry up to 3 times with exponential backoff (30s, 60s, 120s).
    // Do NOT log the user out — the 401 interceptor handles real failures.
    if (attempt < 3) {
      const backoffMs = Math.pow(2, attempt) * 15_000; // 30s, 60s
      proactiveRefreshTimer = setTimeout(() => proactiveRefreshWithRetry(attempt + 1), backoffMs);
    } else {
      // All retries exhausted — let the 401 interceptor handle the next request.
      // Schedule a check in 30 seconds in case connectivity is restored.
      proactiveRefreshTimer = setTimeout(() => scheduleProactiveRefresh(), 30_000);
    }
  }
}

export function scheduleProactiveRefresh(): void {
  if (typeof window === 'undefined') return;

  // Clear any existing timer
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }

  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) return;

  const exp = parseJwtExp(accessToken);
  if (!exp) return;

  const now = Math.floor(Date.now() / 1000);
  const remainingSeconds = exp - now;

  // Token already expired — try to refresh immediately (with retry)
  if (remainingSeconds <= 0) {
    proactiveRefreshWithRetry();
    return;
  }

  // Refresh at 80% of token lifetime (e.g. at 12 min for a 15-min token)
  const refreshAfterMs = Math.max(remainingSeconds * 0.8, 10) * 1000;

  proactiveRefreshTimer = setTimeout(() => proactiveRefreshWithRetry(), refreshAfterMs);
}

export function cancelProactiveRefresh(): void {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
}

// ============================================================================
// CROSS-TAB SYNCHRONIZATION
// Listen for localStorage changes from other tabs so that a logout or
// token refresh in Tab A is immediately reflected in Tab B.
// ============================================================================

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === 'accessToken') {
      if (event.newValue === null) {
        // Tokens were removed in another tab — emit cleared event
        emitAuthEvent({ type: 'auth:cleared', reason: 'cross_tab' });
        cancelProactiveRefresh();
      } else if (event.newValue !== event.oldValue) {
        // Token was refreshed in another tab — reschedule proactive refresh
        scheduleProactiveRefresh();
      }
    }
  });
}

// ============================================================================
// VISIBILITY & FOCUS-BASED TOKEN CHECK
// When the user returns to the tab after being away, check token validity
// immediately. This catches cases where setTimeout was throttled.
// ============================================================================

if (typeof window !== 'undefined') {
  // Check token when tab becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        // No token — only redirect if there is also no refresh token.
        // Having a refresh token means a rotation may be in progress.
        const hasRefresh = !!localStorage.getItem('refreshToken');
        if (!hasRefresh) {
          clearAuthTokens('refresh_failed');
        }
        return;
      }
      // Re-check and refresh if needed
      scheduleProactiveRefresh();
    }
  });

  // Periodic heartbeat every 2 minutes to catch expired tokens
  // even if the user stays on the same page without interacting
  setInterval(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const exp = parseJwtExp(token);
    if (!exp) return;

    const now = Math.floor(Date.now() / 1000);
    // If token expires within 60 seconds, refresh now
    if (exp - now < 60) {
      refreshAccessToken()
        .then(() => scheduleProactiveRefresh())
        .catch(() => { /* auth:cleared already emitted */ });
    }
  }, 120_000); // every 2 minutes
}

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================================
// RESPONSE INTERCEPTOR
// On 401, queue behind the single refresh promise, then retry.
// ============================================================================

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isAxiosError(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // ── 403 Forbidden: permission denied ──────────────────────────────────
    if (error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        // Extract the message from the backend response (PermissionsGuard sends it)
        const raw = error.response.data?.message as string | undefined;
        // Strip the technical "Required: view X or manage X" detail for end users
        const friendly = raw?.includes('Insufficient permissions')
          ? 'You don\'t have permission to perform this action.'
          : (raw || 'You don\'t have permission to perform this action.');

        // Dynamic import avoids SSR issues and circular-dependency risk
        import('../stores/flash').then(({ useFlashStore }) => {
          useFlashStore.getState().setFlash(friendly, 'warning');
        });
      }
      return Promise.reject(error);
    }

    // ── 401 Unauthorized: refresh token and retry ────────────────────────
    // Skip refresh for login/register endpoints — 401 there means wrong credentials, not expired token
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();

        // Retry the original request with the fresh token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch {
        // refreshAccessToken already called clearAuthTokens
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// Start proactive refresh on module load (picks up token from localStorage)
// ============================================================================
if (typeof window !== 'undefined') {
  scheduleProactiveRefresh();
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

// Auth API functions
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: {
    companyName: string;
    subdomain: string;
    adminName: string;
    adminEmail: string;
    password: string;
    planSlug: string;
    referralCode?: string;
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  checkSubdomain: async (subdomain: string) => {
    const response = await api.post('/auth/check-subdomain', { subdomain });
    return response.data;
  },

  getRegistrationStatus: async (registrationId: string) => {
    const response = await api.get(`/auth/register/status/${registrationId}`);
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  refresh: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },
};

// Central Admin Auth API functions
export const adminAuthApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/admin/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/admin/auth/logout');
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/admin/auth/me');
    return response.data;
  },
};

// Public API functions
export const publicApi = {
  getPlans: async () => {
    const response = await publicAxios.get('/public/plans');
    return response.data;
  },

  getSettings: async () => {
    const response = await publicAxios.get('/public/settings');
    return response.data;
  },

  getModules: async () => {
    const response = await publicAxios.get('/public/modules');
    return response.data;
  },

  getFaqs: async () => {
    const response = await publicAxios.get('/public/faqs');
    return response.data;
  },

  getTenantBranding: async (slug: string) => {
    const response = await publicAxios.get(`/public/tenant-branding/${slug}`);
    return response.data as {
      tenantName: string;
      companyName: string | null;
      companyDisplayName: string | null;
      logoUrl: string | null;
      platformName: string | null;
      platformLogoUrl: string | null;
    };
  },

  acceptInvite: async (token: string, tenantSlug: string, password: string): Promise<{ message: string }> => {
    const response = await publicAxios.post('/auth/accept-invite', { token, tenantSlug, password });
    return response.data;
  },
};
