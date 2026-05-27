// Messaging service — provider-agnostic messaging layer for MemberApp
// Usage: import { createMessagingProvider } from '@/services/messaging';

export * from './types';
export { createMessagingProvider, getActiveProvider } from './providerFactory';
export { BrevoProvider } from './brevoProvider';
export { TwilioProvider } from './twilioProvider';
