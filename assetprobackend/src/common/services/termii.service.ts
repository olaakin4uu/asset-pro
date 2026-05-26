import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { brand } from '../config/brand';

/**
 * Thin client for Termii's SMS API + webhook signature verification.
 *
 * Config:
 *   TERMII_API_KEY          — write-only API key from Termii dashboard
 *   TERMII_WEBHOOK_SECRET   — HMAC secret (signed body from Termii)
 *   TERMII_SENDER_ID        — alphanumeric sender shown to the farmer
 *
 * Silent no-op when creds are missing — keeps local dev unblocked.
 */
@Injectable()
export class TermiiService {
  private readonly logger = new Logger(TermiiService.name);
  private readonly apiBase = 'https://api.ng.termii.com/api';

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string | undefined {
    return this.config.get<string>('TERMII_API_KEY');
  }

  private get senderId(): string {
    return this.config.get<string>('TERMII_SENDER_ID') || brand.smsSenderId;
  }

  private get webhookSecret(): string | undefined {
    return this.config.get<string>('TERMII_WEBHOOK_SECRET');
  }

  /**
   * Verify HMAC-SHA256 signature sent by Termii on inbound webhooks.
   * Returns true if no secret is configured so local dev isn't blocked;
   * log a loud warning so this is visible in production if the secret
   * isn't set. Termii's current docs send signature in `X-Termii-Signature`
   * as hex digest of the raw body.
   */
  verifyWebhookSignature(rawBody: string, signature?: string | null): boolean {
    const secret = this.webhookSecret;
    if (!secret) {
      this.logger.warn(
        'TERMII_WEBHOOK_SECRET not set — accepting inbound webhook without verification',
      );
      return true;
    }
    if (!signature) return false;

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      const sigBuf = Buffer.from(signature, 'hex');
      const expBuf = Buffer.from(expected, 'hex');
      if (sigBuf.length !== expBuf.length) return false;
      return timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  /**
   * Send a single outbound SMS via Termii. Returns the provider's message
   * id when known, or null on failure. Swallows errors — the caller logs
   * outcome on the inbound message record.
   */
  async sendSms(
    to: string,
    text: string,
    channel: 'generic' | 'whatsapp' = 'generic',
  ): Promise<{ messageId?: string } | null> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      this.logger.warn(`TERMII_API_KEY not set — skipping outbound reply to ${to}`);
      return null;
    }

    try {
      const res = await fetch(`${this.apiBase}/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          to,
          from: this.senderId,
          sms: text,
          type: 'plain',
          channel,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn(`Termii send failed (${res.status}): ${body.slice(0, 200)}`);
        return null;
      }
      const json = (await res.json()) as { message_id?: string };
      return { messageId: json.message_id };
    } catch (err) {
      this.logger.warn(`Termii send error for ${to}: ${(err as Error).message}`);
      return null;
    }
  }
}
