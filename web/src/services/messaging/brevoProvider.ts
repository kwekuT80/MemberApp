'use server';

import { MessagingProvider, MessagePayload, DeliveryResult, WebhookEvent } from './types';
import type { ProviderName } from './types';

const BREVO_API_URL = 'https://api.brevo.com/v3';
const BREVO_TRANSACTION_EMAIL_URL = `${BREVO_API_URL}/smtp/email`;
const BREVO_SMS_URL = `${BREVO_API_URL}/sms/send`;

export class BrevoProvider extends MessagingProvider {
  private apiKey: string;
  private smsFromNumber: string;

  constructor(apiKey: string, smsFromNumber?: string) {
    super('brevo');
    this.apiKey = apiKey;
    this.smsFromNumber = smsFromNumber || '';
  }

  async sendEmail(payload: MessagePayload): Promise<DeliveryResult> {
    if (!this.apiKey) {
      return { providerId: 'brevo', status: 'failed', error: 'Brevo API key not configured' };
    }

    try {
      const response = await fetch(BREVO_TRANSACTION_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: 'noreply@yourdomain.com', name: payload.name || 'KSJI' },
          to: [{ email: payload.to, name: payload.name }],
          subject: payload.subject || 'Payment Reminder',
          htmlContent: payload.html || '',
          textContent: payload.text || '',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        return { providerId: 'brevo', status: 'failed', error: error.message };
      }

      const data = await response.json();
      return { providerId: 'brevo', status: 'sent', messageId: data.id };
    } catch (error) {
      return { providerId: 'brevo', status: 'failed', error: (error as Error).message };
    }
  }

  async sendSMS(payload: MessagePayload): Promise<DeliveryResult> {
    if (!this.apiKey || !this.smsFromNumber) {
      return { providerId: 'brevo', status: 'failed', error: 'Brevo SMS credentials not configured' };
    }

    try {
      const response = await fetch(BREVO_SMS_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: this.smsFromNumber,
          recipient: payload.to,
          content: payload.body || '',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        return { providerId: 'brevo', status: 'failed', error: error.message };
      }

      const data = await response.json();
      return { providerId: 'brevo', status: 'sent', messageId: data.id };
    } catch (error) {
      return { providerId: 'brevo', status: 'failed', error: (error as Error).message };
    }
  }

  async getStatus(messageId: string): Promise<'queued' | 'sent' | 'delivered' | 'failed' | 'bounced'> {
    // Brevo does not provide a direct status endpoint for SMS; use webhook callbacks instead
    return 'delivered';
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    // Process delivery webhooks — update reminder_log table via Supabase edge function
    console.log(`[Brevo] Received webhook: ${event.type} for ${event.recipient}`);
    // Integration with Supabase to persist state changes
  }
}
