import { api } from '../api';

// ============================================================================
// TYPES
// ============================================================================

export interface SettingsProfile {
  id: number;
  name: string;
  email: string;
  companyId?: number;
  companyName?: string;
  branchId?: number;
  branchName?: string;
  userType: string;
  themePreference?: string;
  locale?: string;
  signaturePath?: string;
  twoFactorEnabled: boolean;
  twoFactorConfirmedAt?: string;
  createdAt: string;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  recoveryCodes: string[];
}

// ============================================================================
// SETTINGS API
// ============================================================================

export const settingsApi = {
  // Profile
  getProfile: async (): Promise<SettingsProfile> => {
    const response = await api.get('/core/settings/profile');
    return response.data;
  },

  updateProfile: async (data: { name?: string; email?: string; locale?: string }): Promise<SettingsProfile> => {
    const response = await api.patch('/core/settings/profile', data);
    return response.data;
  },

  // Password
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ message: string }> => {
    const response = await api.post('/core/settings/password', data);
    return response.data;
  },

  // Signature
  uploadSignature: async (file: File): Promise<{ signaturePath: string }> => {
    const formData = new FormData();
    formData.append('signature', file);
    const response = await api.post('/core/settings/signature', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  removeSignature: async (): Promise<{ message: string }> => {
    const response = await api.delete('/core/settings/signature');
    return response.data;
  },

  // 2FA
  enable2fa: async (): Promise<TwoFactorSetup> => {
    const response = await api.post('/core/settings/2fa/enable');
    return response.data;
  },

  confirm2fa: async (code: string): Promise<{ message: string }> => {
    const response = await api.post('/core/settings/2fa/confirm', { code });
    return response.data;
  },

  disable2fa: async (password: string): Promise<{ message: string }> => {
    const response = await api.post('/core/settings/2fa/disable', { password });
    return response.data;
  },

  getRecoveryCodes: async (): Promise<{ codes: string[] }> => {
    const response = await api.get('/core/settings/2fa/recovery-codes');
    return response.data;
  },

  regenerateRecoveryCodes: async (): Promise<{ codes: string[] }> => {
    const response = await api.post('/core/settings/2fa/recovery-codes/regenerate');
    return response.data;
  },

  // Appearance
  updateAppearance: async (themePreference: string): Promise<{ themePreference: string }> => {
    const response = await api.patch('/core/settings/appearance', { themePreference });
    return response.data;
  },
};
