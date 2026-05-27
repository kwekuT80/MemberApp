// Messaging provider interface — enables switching providers without breaking application code

export type MessageType = 'email' | 'sms';
export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';
export type ProviderName = 'brevo' | 'twilio' | 'resend';

export interface MessagePayload {
  to: string;
  name?: string;
  subject?: string;
  html?: string;
  text?: string;
  body?: string; // for SMS
}

export interface DeliveryResult {
  providerId: string;
  status: DeliveryStatus;
  messageId?: string;
  error?: string;
}

export interface WebhookEvent {
  type: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  messageId?: string;
  recipient: string;
  timestamp: string;
}

export abstract class MessagingProvider {
  protected name: ProviderName;

  constructor(name: ProviderName) {
    this.name = name;
  }

  abstract sendEmail(payload: MessagePayload): Promise<DeliveryResult>;
  abstract sendSMS(payload: MessagePayload): Promise<DeliveryResult>;
  abstract getStatus(messageId: string): Promise<DeliveryStatus>;
  abstract handleWebhook(event: WebhookEvent): Promise<void>;

  // Utility: check if provider is configured with valid credentials
  protected validateProviderConfig(): void {
    throw new Error(`Provider "${this.name}" configuration not yet implemented`);
  }
}

// Template types for reminder messages
export interface ReminderData {
  memberName: string;
  amountDue: number;
  dueDate: string;
  category: 'upcoming_due' | 'overdue_30' | 'overdue_90';
  daysOverdue?: number;
}

// Template rendering contract — providers can implement their own
export interface MessageTemplate {
  renderEmail(data: ReminderData): string;
  renderSMS(data: ReminderData): string;
}
