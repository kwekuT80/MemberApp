//'use server';

import { MessagingProvider, ProviderName } from './types';
import { BrevoProvider } from './brevoProvider';
import { TwilioProvider } from './twilioProvider';

// Environment variables — configure via .env.local or deployment platform secrets
const MESSAGING_PROVIDER = (process.env.MESSAGING_PROVIDER || 'brevo').toLowerCase() as ProviderName;

function getBrevoConfig(): { apiKey: string; smsFrom: string | undefined } {
  return {
    apiKey: process.env.BREVO_API_KEY || '',
    smsFrom: process.env.BREVO_SMS_FROM,
  };
}

function getTwilioConfig(): { accountSid: string; authToken: string; number: string } {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    number: process.env.TWILIO_PHONE_NUMBER || '',
  };
}

/**
 * Factory function that returns the configured messaging provider.
 *
 * Switching providers requires only changing MESSAGING_PROVIDER env var —
 * no application code changes needed.
 *
 * @example
 * ```ts
 * // .env.local
 * MESSAGING_PROVIDER=brevo        // or "twilio" or "resend"
 * BREVO_API_KEY=xK2...
 * TWILIO_ACCOUNT_SID=AC123...
 * ```
 */
export function createMessagingProvider(): MessagingProvider {
  switch (MESSAGING_PROVIDER) {
    case 'brevo': {
      const config = getBrevoConfig();
      if (!config.apiKey) {
        console.error('[messaging] Brevo API key not configured. Set BREVO_API_KEY.');
      }
      return new BrevoProvider(config.apiKey, config.smsFrom);
    }

    case 'twilio': {
      const config = getTwilioConfig();
      if (!config.accountSid || !config.authToken) {
        console.error('[messaging] Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
      }
      return new TwilioProvider(config.accountSid, config.authToken, config.number);
    }

    case 'resend':
      // TODO: Implement Resend provider — similar structure to Brevo/Twilio
      console.error('[messaging] Resend provider not yet implemented. Falling back to Brevo.');
      return new BrevoProvider(process.env.BREVO_API_KEY || '');

    default:
      console.warn(`[messaging] Unknown provider "${MESSAGING_PROVIDER}". Defaulting to Brevo.`);
      return new BrevoProvider(process.env.BREVO_API_KEY || '');
  }
}

/**
 * Get the currently active provider name (for logging/monitoring)
 */
export function getActiveProvider(): ProviderName {
  return MESSAGING_PROVIDER;
}
