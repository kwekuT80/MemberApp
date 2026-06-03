import { MessagingProvider, ProviderName } from './types';
import { ResendProvider } from './resendProvider';

// Environment variables — configure via .env.local or deployment platform secrets
const MESSAGING_PROVIDER = (
  process.env.MESSAGING_PROVIDER || 'resend'
).toLowerCase() as ProviderName;

function getResendConfig(): {
  apiKey: string;
  senderEmail: string;
} {
  return {
    apiKey: process.env.RESEND_API_KEY || '',
    senderEmail:
      process.env.RESENDER_SENDER_EMAIL ||
      'communications.ksji500app@gmail.com',
  };
}

/**
 * Factory function that returns the configured messaging provider.
 *
 * Currently uses Resend as primary email provider.
 * Switching providers requires only changing
 * MESSAGING_PROVIDER environment variable.
 */
export function createMessagingProvider(): MessagingProvider {
  switch (MESSAGING_PROVIDER) {
    case 'resend': {
      const config = getResendConfig();

      if (!config.apiKey) {
        console.error(
          '[messaging] Resend API key not configured. Set RESEND_API_KEY.'
        );
      }

      return new ResendProvider(
        config.apiKey,
        config.senderEmail
      );
    }

    case 'brevo':
    case 'twilio': {
      // Deprecated — migrated to Resend
      console.error(
        `[messaging] Provider "${MESSAGING_PROVIDER}" has been deprecated. Migrated to Resend.`
      );

      const resendConfig = getResendConfig();

      return new ResendProvider(
        resendConfig.apiKey,
        resendConfig.senderEmail
      );
    }

    default: {
      console.warn(
        `[messaging] Unknown provider "${MESSAGING_PROVIDER}". Defaulting to Resend.`
      );

      const resendConfig = getResendConfig();

      return new ResendProvider(
        resendConfig.apiKey,
        resendConfig.senderEmail
      );
    }
  }
}

/**
 * Get the currently active provider name
 * (for logging and monitoring).
 */
export function getActiveProvider(): ProviderName {
  return MESSAGING_PROVIDER;
}