//'use server';

import { MessagingProvider, MessagePayload, DeliveryResult, WebhookEvent } from './types';
import type { ProviderName } from './types';

export class TwilioProvider extends MessagingProvider {
  private accountSid: string;
  private authToken: string;
  private twilioNumber: string;

  constructor(accountSid: string, authToken: string, twilioNumber: string) {
    super('twilio');
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.twilioNumber = twilioNumber;
  }

  async sendEmail(payload: MessagePayload): Promise<DeliveryResult> {
    // Twilio SendGrid integration — requires separate SendGrid account linked to Twilio
    if (!this.accountSid) {
      return { providerId: 'twilio', status: 'failed', error: 'Twilio credentials not configured' };
    }

    try {
      const auth = Buffer.from(`${this.accountSid}:`).toString('base64');

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: { email: 'noreply@yourdomain.com', name: payload.name || 'KSJI' },
          personalizations: [{ to: [{ email: payload.to, name: payload.name }] }],
          subject: payload.subject || 'Payment Reminder',
          content: [{ type: 'text/html', value: payload.html || '' }],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        return { providerId: 'twilio', status: 'failed', error: error.message };
      }

      return { providerId: 'twilio', status: 'sent' };
    } catch (error) {
      return { providerId: 'twilio', status: 'failed', error: (error as Error).message };
    }
  }

  async sendSMS(payload: MessagePayload): Promise<DeliveryResult> {
    if (!this.accountSid || !this.authToken) {
      return { providerId: 'twilio', status: 'failed', error: 'Twilio credentials not configured' };
    }

    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: this.twilioNumber,
          To: payload.to,
          Body: payload.body || '',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        return { providerId: 'twilio', status: 'failed', error: error.message };
      }

      const data = await response.json();
      return { providerId: 'twilio', status: 'sent', messageId: data.sid };
    } catch (error) {
      return { providerId: 'twilio', status: 'failed', error: (error as Error).message };
    }
  }

  async getStatus(messageId: string): Promise<'queued' | 'sent' | 'delivered' | 'failed' | 'bounced'> {
    if (!this.accountSid || !this.authToken) return 'failed';

    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages/${messageId}.json`, {
        headers: { Authorization: `Basic ${auth}` },
      });

      if (!response.ok) return 'failed';
      const data = await response.json();
      return (data.status as any) || 'sent';
    } catch {
      return 'failed';
    }
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    console.log(`[Twilio] Received webhook: ${event.type} for ${event.recipient}`);
    // Process Twilio message status webhooks
  }
}
