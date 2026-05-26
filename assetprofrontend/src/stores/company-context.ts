'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  companyContextApi,
  type CompanyDetails,
  type BranchDetails,
  type CompanyContextResponse,
  type ModuleAccess,
} from '@/lib/api/core';
import { onAuthEvent, scheduleProactiveRefresh } from '@/lib/api';
import { extractErrorMessage } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface CompanyContextState {
  // Current context
  currentCompany: CompanyDetails | null;
  currentBranch: BranchDetails | null;
  availableCompanies: CompanyDetails[];
  accessibleBranches: BranchDetails[];

  // Module access
  enabledModules: ModuleAccess[];

  // Loading states
  isLoading: boolean;
  isSwitching: boolean;
  switchingTo: { type: 'company' | 'branch'; id: number; name: string } | null;

  // Error state
  error: string | null;

  // Actions
  fetchContext: () => Promise<void>;
  fetchModules: () => Promise<void>;
  toggleFeature: (moduleSlug: string, featureSlug: string, enabled: boolean) => Promise<boolean>;
  switchCompany: (companyId: number) => Promise<boolean>;
  switchBranch: (branchId: number) => Promise<boolean>;
  setContext: (context: CompanyContextResponse) => void;
  clearContext: () => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useCompanyContextStore = create<CompanyContextState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentCompany: null,
      currentBranch: null,
      availableCompanies: [],
      accessibleBranches: [],
      enabledModules: [],
      isLoading: false,
      isSwitching: false,
      switchingTo: null,
      error: null,

      // Fetch current context from API
      fetchContext: async () => {
        set({ isLoading: true, error: null });

        try {
          const context = await companyContextApi.getContext();
          set({
            currentCompany: context.currentCompany,
            currentBranch: context.currentBranch,
            availableCompanies: context.availableCompanies,
            accessibleBranches: context.accessibleBranches,
            isLoading: false,
          });
        } catch (error: unknown) {
          set({
            error: extractErrorMessage(error, 'Failed to fetch company context'),
            isLoading: false,
          });
        }
      },

      // Fetch enabled modules from API
      fetchModules: async () => {
        try {
          const modules = await companyContextApi.getModules();
          set({ enabledModules: modules });
        } catch {
          // Non-critical — don't block the app if module fetch fails
          set({ enabledModules: [] });
        }
      },

      // Toggle a feature on/off
      toggleFeature: async (moduleSlug: string, featureSlug: string, enabled: boolean) => {
        try {
          await companyContextApi.toggleFeature(moduleSlug, featureSlug, enabled);
          // Re-fetch modules to get fresh state
          await get().fetchModules();
          return true;
        } catch (error: unknown) {
          set({ error: extractErrorMessage(error, 'Failed to toggle feature') });
          return false;
        }
      },

      // Switch to a different company
      switchCompany: async (companyId: number) => {
        const { availableCompanies } = get();
        const targetCompany = availableCompanies.find((c) => c.id === companyId);

        set({
          isSwitching: true,
          error: null,
          switchingTo: {
            type: 'company',
            id: companyId,
            name: targetCompany?.displayName || targetCompany?.name || 'Company',
          },
        });

        // Dispatch event for transition overlay
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('company-switch-start', {
              detail: {
                companyName: targetCompany?.displayName || targetCompany?.name,
                companyId,
              },
            })
          );
        }

        try {
          const result = await companyContextApi.switchCompany(companyId);

          if (result.success) {
            // Update tokens in localStorage
            if (result.accessToken) {
              localStorage.setItem('accessToken', result.accessToken);
            }
            if (result.refreshToken) {
              localStorage.setItem('refreshToken', result.refreshToken);
            }

            // Reschedule proactive refresh for the new token
            scheduleProactiveRefresh();

            // Fetch fresh context after switch
            await get().fetchContext();

            set({ isSwitching: false, switchingTo: null });

            // Dispatch success event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('company-switch-success', {
                  detail: { message: result.message, company: result.company },
                })
              );
            }

            return true;
          } else {
            set({ isSwitching: false, switchingTo: null, error: result.message });
            return false;
          }
        } catch (error: unknown) {
          const errorMessage = extractErrorMessage(error, 'Failed to switch company');
          set({ isSwitching: false, switchingTo: null, error: errorMessage });

          // Dispatch error event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('company-switch-error', {
                detail: { message: errorMessage },
              })
            );
          }

          return false;
        }
      },

      // Switch to a different branch
      switchBranch: async (branchId: number) => {
        const { accessibleBranches } = get();
        const targetBranch = accessibleBranches.find((b) => b.id === branchId);

        set({
          isSwitching: true,
          error: null,
          switchingTo: {
            type: 'branch',
            id: branchId,
            name: targetBranch?.name || 'Branch',
          },
        });

        try {
          const result = await companyContextApi.switchBranch(branchId);

          if (result.success) {
            // Update tokens in localStorage
            if (result.accessToken) {
              localStorage.setItem('accessToken', result.accessToken);
            }
            if (result.refreshToken) {
              localStorage.setItem('refreshToken', result.refreshToken);
            }

            // Reschedule proactive refresh for the new token
            scheduleProactiveRefresh();

            // Update branch in state
            if (result.branch) {
              set({ currentBranch: result.branch });
            }

            set({ isSwitching: false, switchingTo: null });

            // Dispatch success event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('branch-switch-success', {
                  detail: { message: result.message, branch: result.branch },
                })
              );
            }

            return true;
          } else {
            set({ isSwitching: false, switchingTo: null, error: result.message });
            return false;
          }
        } catch (error: unknown) {
          const errorMessage = extractErrorMessage(error, 'Failed to switch branch');
          set({ isSwitching: false, switchingTo: null, error: errorMessage });
          return false;
        }
      },

      // Set context directly (useful when context is loaded from another source)
      setContext: (context: CompanyContextResponse) => {
        set({
          currentCompany: context.currentCompany,
          currentBranch: context.currentBranch,
          availableCompanies: context.availableCompanies,
          accessibleBranches: context.accessibleBranches,
        });
      },

      // Clear context (on logout)
      clearContext: () => {
        set({
          currentCompany: null,
          currentBranch: null,
          availableCompanies: [],
          accessibleBranches: [],
          enabledModules: [],
          isLoading: false,
          isSwitching: false,
          switchingTo: null,
          error: null,
        });
      },
    }),
    {
      name: 'company-context',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentCompany: state.currentCompany,
        currentBranch: state.currentBranch,
      }),
    }
  )
);

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to get the current company context
 */
export function useCompanyContext() {
  const {
    currentCompany,
    currentBranch,
    availableCompanies,
    accessibleBranches,
    enabledModules,
    isLoading,
    isSwitching,
    switchingTo,
    error,
    fetchContext,
    fetchModules,
    toggleFeature,
    switchCompany,
    switchBranch,
  } = useCompanyContextStore();

  return {
    // Current context
    company: currentCompany,
    branch: currentBranch,
    availableCompanies,
    accessibleBranches,
    enabledModules,

    // Computed
    hasMultipleCompanies: availableCompanies.length > 1,
    hasMultipleBranches: accessibleBranches.length > 1,
    companyId: currentCompany?.id,
    branchId: currentBranch?.id,
    companyName: currentCompany?.displayName || currentCompany?.name,
    branchName: currentBranch?.name,
    currency: currentCompany?.currency || 'NGN',
    timezone: currentBranch?.timezone || 'Africa/Lagos',

    // State
    isLoading,
    isSwitching,
    switchingTo,
    error,

    // Actions
    fetchContext,
    fetchModules,
    toggleFeature,
    switchCompany,
    switchBranch,
  };
}

/**
 * Hook to check if user can access a specific branch
 */
export function useCanAccessBranch(branchId: number): boolean {
  const { accessibleBranches } = useCompanyContextStore();
  return accessibleBranches.some((b) => b.id === branchId);
}

/**
 * Hook to get company initials for avatar
 */
export function useCompanyInitials(): string {
  const { currentCompany } = useCompanyContextStore();
  if (!currentCompany) return 'CO';

  const name = currentCompany.displayName || currentCompany.name;
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
}

// ============================================================================
// Listen for auth events — clear company context when auth is cleared
// ============================================================================
if (typeof window !== 'undefined') {
  onAuthEvent((event) => {
    if (event.type === 'auth:cleared') {
      useCompanyContextStore.getState().clearContext();
    }
  });
}
