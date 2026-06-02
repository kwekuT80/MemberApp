# Resend Email Provider Setup Guide

## Overview

KSJI Commandery uses [Resend](https://resend.com) as its email delivery provider. The API key is stored securely in **Supabase Secrets** and accessed only from Edge Functions — never exposed to client-side code.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Next.js App    │────▶│ Supabase Edge    │────▶│ Resend API  │
│  (Client/SSR)   │     │ Function         │     │ (api.resend │
└─────────────────┘     └──────────────────┘     └─────────────┘
                                │
                        ┌───────▼────────┐
                        │ Supabase DB    │
                        │ (RLS, Storage) │
                        └────────────────┘

Resend API Key stored in:
  • Supabase Secrets (for Edge Functions)
  • .env.local (local development only)
```

---

## Configuration Requirements

### 1. Resend Account Setup

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain `communications.ksji500app@gmail.com`
3. Generate an API key from Dashboard → API Keys

### 2. Supabase Secrets (Production)

Run these commands **in your Supabase project directory**:

```bash
# Set Resend API Key in Supabase Secrets
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxx

# Optional: Override sender email if needed
supabase secrets set RESENDER_SENDER_EMAIL=communications.ksji500app@gmail.com
```

### 3. Local Development (.env.local)

Create `.env.local` in the Next.js app root (`web/`):

```bash
# Resend Email Provider
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESENDER_SENDER_EMAIL=communications.ksji500app@gmail.com

# Optional: Override messaging provider (defaults to resend)
MESSAGING_PROVIDER=resend
```

---

## Deploying Edge Functions

After adding the `send-email` edge function, deploy it:

```bash
cd supabase/
supabase functions deploy send-email --no-verify-jwt
```

The edge function will be available at:
```
https://<your-project-ref>.supabase.co/functions/v1/send-email
```

---

## Using the Send-Email Edge Function

### From Next.js (Server Components / API Routes)

```typescript
// web/src/services/emailService.ts
const RESPONSE = await fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, // Only needed for edge function calls
    },
    body: JSON.stringify({
      to: 'member@example.com',
      subject: 'Payment Reminder - Due Tomorrow',
      html: '<p>Your payment is due tomorrow.</p>',
      text: 'Your payment is due tomorrow.',
      from_name: 'KSJI Commandery Financial Office',
    }),
  }
);

const data = await RESPONSE.json();
// { success: true, messageId: "msg_xxx" }
```

### Direct HTTP Call (Testing)

```bash
curl -X POST https://<your-project>.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <service_role_key>" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email from KSJI",
    "html": "<h1>Hello World</h1>",
    "text": "Hello World"
  }'
```

---

## Security Notes

- **API Key Storage**: `RESEND_API_KEY` is only stored in Supabase Secrets — never committed to git
- **Edge Function Auth**: Use `--no-verify-jwt` flag when deploying if calling from server-side code directly
- **RLS Compliance**: Edge functions use Supabase service role key, bypassing RLS (intentional for internal operations)
- **No Client-Side Keys**: Resend API key is never exposed in browser bundles

---

## Troubleshooting

### Email Not Delivering?

1. Check Supabase Edge Function logs:
   ```bash
   supabase functions logs send-email
   ```

2. Verify domain verification in Resend dashboard

3. Confirm `RESEND_API_KEY` is set in Supabase Secrets:
   ```bash
   supabase secrets list  # Shows all configured secrets
   ```

### API Key Not Found Error?

If you see `RESEND_API_KEY not configured in Supabase Secrets`:
1. Run: `supabase secrets set RESEND_API_KEY=re_xxx`
2. Redeploy the edge function

---

## Files Reference

| File | Purpose |
|------|---------|
| `supabase/functions/send-email/index.ts` | Edge function for secure email delivery |
| `supabase/functions/payment-reminders/index.ts` | Scheduled payment reminder orchestration (updated to use Resend) |
| `web/src/services/messaging/resendProvider.ts` | Client-side Resend provider class |
| `web/src/services/messaging/providerFactory.ts` | Provider abstraction factory |
| `migrations/communications_orchestration.sql` | Database schema for delivery tracking |
