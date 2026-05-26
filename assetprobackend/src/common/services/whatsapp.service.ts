// ============================================================================
// WHATSAPP BUSINESS API SERVICE
// ============================================================================
// Integration with Meta Cloud API for sending WhatsApp notifications.
// Requires: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN env vars.
// Falls back to log-only mode if not configured (like EmailService).
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
// Using native fetch (Node 18+) to avoid extra dependency

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly phoneNumberId: string | null;
  private readonly accessToken: string | null;
  private readonly enabled: boolean;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || null;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || null;
    this.enabled = !!(this.phoneNumberId && this.accessToken);

    if (!this.enabled) {
      this.logger.warn('WhatsApp service disabled — WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set');
    }
  }

  /**
   * Send a text message via WhatsApp.
   */
  async sendTextMessage(to: string, body: string): Promise<WhatsAppMessageResult> {
    if (!this.enabled) {
      this.logger.log(`[WhatsApp DRY RUN] To: ${to}, Body: ${body.substring(0, 100)}...`);
      return { success: true, messageId: 'dry-run' };
    }

    try {
      const response = await fetch(
        `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: this.normalizePhoneNumber(to),
            type: 'text',
            text: { body },
          }),
        },
      );

      const data = await response.json();
      const messageId = data?.messages?.[0]?.id;
      this.logger.log(`WhatsApp message sent to ${to}: ${messageId}`);
      return { success: true, messageId };
    } catch (error: unknown) {
      const msg = (error as Record<string, Record<string, Record<string, Record<string, string>>>>)?.response?.data?.error?.message || (error as Error).message;
      this.logger.error(`WhatsApp send failed to ${to}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Send a template message (pre-approved by Meta).
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    parameters: string[],
  ): Promise<WhatsAppMessageResult> {
    if (!this.enabled) {
      this.logger.log(`[WhatsApp DRY RUN] Template: ${templateName}, To: ${to}, Params: ${parameters.join(', ')}`);
      return { success: true, messageId: 'dry-run' };
    }

    try {
      const components = parameters.length > 0 ? [{
        type: 'body',
        parameters: parameters.map((p) => ({ type: 'text', text: p })),
      }] : [];

      const response = await fetch(
        `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: this.normalizePhoneNumber(to),
            type: 'template',
            template: {
              name: templateName,
              language: { code: languageCode },
              components,
            },
          }),
        },
      );

      const data = await response.json();
      const messageId = data?.messages?.[0]?.id;
      this.logger.log(`WhatsApp template "${templateName}" sent to ${to}: ${messageId}`);
      return { success: true, messageId };
    } catch (error: unknown) {
      const msg = (error as Record<string, Record<string, Record<string, Record<string, string>>>>)?.response?.data?.error?.message || (error as Error).message;
      this.logger.error(`WhatsApp template send failed to ${to}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove spaces, dashes, and leading + if present
    let normalized = phone.replace(/[\s\-()]/g, '');
    // Ensure it starts with country code (default to Nigeria +234)
    if (normalized.startsWith('0')) {
      normalized = '234' + normalized.substring(1);
    }
    if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }
    return normalized;
  }
}
