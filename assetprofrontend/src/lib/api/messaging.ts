import { api } from '../api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessagingSettings {
  companyId: number;
  provider: string;
  /** apiKey is masked (first 6 chars shown + asterisks) in GET/PUT responses */
  apiKey: string;
  senderId: string;
  whatsappFromNumber: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateMessagingSettingsDto {
  apiKey?: string;
  senderId?: string;
  whatsappFromNumber?: string | null;
  isActive?: boolean;
}

export interface TestMessageDto {
  to: string;
  channel?: 'sms' | 'whatsapp';
  message?: string;
}

export interface TestMessageResult {
  channel: string;
  to: string;
  providerMessageId: string;
  status: 'queued' | 'sent' | 'failed';
  error?: string;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const messagingSettingsApi = {
  /**
   * Fetch the current company's messaging settings.
   * Returns defaults (isActive: false, empty apiKey) if not yet configured.
   */
  get: async (): Promise<MessagingSettings> => {
    const response = await api.get('/messaging/settings');
    return response.data as MessagingSettings;
  },

  /**
   * Create or update the current company's messaging settings.
   * Pass the full apiKey only when changing it; omit to keep existing key.
   */
  update: async (dto: UpdateMessagingSettingsDto): Promise<MessagingSettings> => {
    const response = await api.put('/messaging/settings', dto);
    return response.data as MessagingSettings;
  },

  /**
   * Send a test SMS or WhatsApp message to verify credentials.
   */
  test: async (dto: TestMessageDto): Promise<TestMessageResult> => {
    const response = await api.post('/messaging/test', dto);
    return response.data as TestMessageResult;
  },
};
