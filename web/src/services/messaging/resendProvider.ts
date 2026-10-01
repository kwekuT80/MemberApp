import { MessagingProvider, MessagePayload, DeliveryResult, WebhookEvent } from './types';
import type { ProviderName } from './types';

const RESEND_API_URL = 'https://api.resend.com';

export class ResendProvider extends MessagingProvider {
  private apiKey: string;
  private senderEmail: string;

  constructor(apiKey: string, senderEmail?: string) {
    super('resend');
    this.apiKey = apiKey;
    // Default sender if not configured — override in production
    this.senderEmail = senderEmail || 'communications.ksji500app@gmail.com';
  }

  async sendEmail(payload: MessagePayload): Promise<DeliveryResult> {
    if (!this.apiKey) {
      // Fallback to Supabase Edge Function where RESEND_API_KEY is configured in Supabase Secrets
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceKey) {
        try {
          const edgeRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              to: payload.to,
              subject: payload.subject || 'Communication from KSJI Commandery',
              html: payload.html || '',
              text: payload.text || '',
              from_name: payload.name || 'KSJI Commandery',
            }),
          });

          const edgeData = await edgeRes.json().catch(() => ({}));
          if (!edgeRes.ok) {
            return {
              providerId: 'resend',
              status: 'failed',
              error: edgeData.error || `Edge function HTTP ${edgeRes.status}`,
            };
          }

          return {
            providerId: 'resend',
            status: 'sent',
            messageId: edgeData.messageId || `edge_${Date.now()}`,
          };
        } catch (edgeErr: any) {
          return { providerId: 'resend', status: 'failed', error: edgeErr.message };
        }
      }

      return { providerId: 'resend', status: 'failed', error: 'Resend API key not configured' };
    }

    try {
      const response = await fetch(`${RESEND_API_URL}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'From': this.senderEmail,
        },
        body: JSON.stringify({
          from: `${payload.name || 'KSJI Commandery'} <${this.senderEmail}>`,
          to: [payload.to],
          subject: payload.subject || 'Communication from KSJI Commandery',
          html: payload.html || '',
          text: payload.text || '',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        return { providerId: 'resend', status: 'failed', error: error.message || `HTTP ${response.status}` };
      }

      const data = await response.json();
      // Resend returns { id: "msg_xxx" } on success
      return { providerId: 'resend', status: 'sent', messageId: data.id };
    } catch (error) {
      return { providerId: 'resend', status: 'failed', error: (error as Error).message };
    }
  }

  async sendSMS(payload: MessagePayload): Promise<DeliveryResult> {
    // Resend does not support SMS — documented limitation
    return {
      providerId: 'resend',
      status: 'failed',
      error: 'SMS not supported by Resend. Please configure a separate SMS provider (e.g., Twilio) for text messaging.',
    };
  }

  async getStatus(messageId: string): Promise<'queued' | 'sent' | 'delivered' | 'failed' | 'bounced'> {
    // Resend provides email tracking via webhooks — no direct status endpoint
    // Check is handled asynchronously through webhook callbacks
    return 'delivered';
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    // Process delivery webhooks from Resend
    // Events include: delivered, opened, clicked, bounced, failed
    console.log(`[Resend] Received webhook: ${event.type} for message ${event.messageId || event.recipient}`);

    try {
      // Update Supabase to persist state changes
      const supabase = await import('@/lib/supabase/server').then(m => m.createClient());

      await supabase
        .from('communication_delivery_states')
        .insert({
          request_id: null, // Will be linked via messageId lookup
          channel: 'email',
          provider_event_id: event.messageId || `evt_${Date.now()}`,
          status: (event.type === 'failed' || event.type === 'bounced') ? event.type.toUpperCase() : event.type.toUpperCase(),
        });
    } catch (error) {
      console.error('[Resend] Failed to persist webhook state:', error);
    }
  }
}
