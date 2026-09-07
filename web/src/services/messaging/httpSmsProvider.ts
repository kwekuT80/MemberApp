import { MessagingProvider, MessagePayload, DeliveryResult, WebhookEvent } from './types';
import { sanitizePhoneNumber } from '@/lib/utils/ksji-logic';

/**
 * HttpSMS Provider
 * Integrates an Android phone as a direct cellular SMS gateway using the HttpSMS REST API.
 * https://github.com/NdoleStudio/httpsms
 */
export class HttpSmsProvider extends MessagingProvider {
  private apiKey: string;
  private fromPhone: string;
  private apiUrl: string;

  constructor(apiKey?: string, fromPhone?: string, apiUrl?: string) {
    super('httpsms');
    this.apiKey = apiKey || process.env.HTTPSMS_API_KEY || '';
    this.fromPhone = fromPhone || process.env.HTTPSMS_FROM_PHONE || '';
    this.apiUrl = (apiUrl || process.env.HTTPSMS_API_URL || 'https://api.httpsms.com/v1').replace(/\/+$/, '');
  }

  /**
   * Formats local phone numbers (e.g. 024XXXXXXX or 23324XXXXXXX) to international E.164 (+23324XXXXXXX)
   */
  private formatE164(phone: string): string {
    const clean = sanitizePhoneNumber(phone);
    if (!clean) return '';
    if (clean.startsWith('+')) return clean;
    if (clean.startsWith('233')) return `+${clean}`;
    if (clean.startsWith('0')) return `+233${clean.slice(1)}`;
    return `+233${clean}`;
  }

  async sendEmail(payload: MessagePayload): Promise<DeliveryResult> {
    return {
      providerId: 'httpsms',
      status: 'failed',
      error: 'HttpSMS is an SMS gateway and does not support sending email.',
    };
  }

  async sendSMS(payload: MessagePayload): Promise<DeliveryResult> {
    // Graceful check: if credentials not yet configured, return clean status without crashing
    if (!this.apiKey || !this.fromPhone) {
      console.warn('[HttpSMS] Gateway not configured. Set HTTPSMS_API_KEY and HTTPSMS_FROM_PHONE in .env.local.');
      return {
        providerId: 'httpsms',
        status: 'failed',
        error: 'HttpSMS not configured. Please set HTTPSMS_API_KEY and HTTPSMS_FROM_PHONE in environment variables.',
      };
    }

    const recipient = this.formatE164(payload.to);
    if (!recipient) {
      return {
        providerId: 'httpsms',
        status: 'failed',
        error: 'Invalid or missing recipient phone number',
      };
    }

    const sender = this.formatE164(this.fromPhone);
    const content = payload.body || payload.text || '';

    if (!content.trim()) {
      return {
        providerId: 'httpsms',
        status: 'failed',
        error: 'SMS message body cannot be empty',
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/messages/send`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          content,
          from: sender,
          to: recipient,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({ message: response.statusText }));
        return {
          providerId: 'httpsms',
          status: 'failed',
          error: errorJson.message || `HttpSMS responded with HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        providerId: 'httpsms',
        status: 'sent',
        messageId: data.data?.id || data.id,
      };
    } catch (err: any) {
      return {
        providerId: 'httpsms',
        status: 'failed',
        error: err.message || 'Network error sending SMS via HttpSMS',
      };
    }
  }

  async getStatus(messageId: string): Promise<'queued' | 'sent' | 'delivered' | 'failed' | 'bounced'> {
    if (!this.apiKey || !messageId) return 'delivered';

    try {
      const res = await fetch(`${this.apiUrl}/messages/${messageId}`, {
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!res.ok) return 'delivered';
      const json = await res.json();
      const statusStr = (json.data?.status || json.status || '').toLowerCase();

      if (statusStr === 'delivered') return 'delivered';
      if (statusStr === 'failed') return 'failed';
      if (statusStr === 'sent') return 'sent';
      return 'queued';
    } catch {
      return 'delivered';
    }
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    console.log(`[HttpSMS] Webhook event received: ${event.type}`);
  }
}
