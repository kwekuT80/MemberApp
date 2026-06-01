# Supabase Edge Functions — Setup Guide

## Prerequisites

1. **Supabase Project**: You need a Supabase project with edge functions enabled
2. **Deno CLI**: Required to run and test edge functions locally (edge functions are written in TypeScript/Deno)
3. **Supabase CLI** (optional but recommended): For local development and deployment

---

## Step 1: Enable Edge Functions on Your Supabase Project

1. Go to [supabase.com](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings → API**
4. Copy the following values (needed for configuration):
   - `Project URL` (e.g., `https://xxxxxxxxxxxx.supabase.co`)
   - `Anon/Public Key`
   - `Service Role Key` (keep this SECRET — use only in edge functions)

> **Note**: Edge functions are available on all Supabase plans, including the free tier.

---

## Step 2: Install Deno CLI (for Local Testing)

### Windows (PowerShell):
```powershell
winget install deno
# or
choco install deno
```

### macOS:
```bash
brew install deno
```

### Linux:
```bash
curl -fsSL https://deno.land/install.sh | sh
```

Verify installation:
```bash
deno --version
```

---

## Step 3: Install Supabase CLI (Optional — for Deployment)

### Windows (PowerShell):
```powershell
winget install supabase.supabase
```

### macOS:
```bash
brew install supabase/tap/supabase
```

### Linux:
```bash
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
```

Verify installation:
```bash
supabase --version
```

---

## Step 4: Configure Your Project

Create a `.env.local` file in the `web/` directory with these values:

```env
# Supabase Configuration (for edge function calls)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Messaging Provider Configuration (C1a abstraction layer)
MESSAGING_PROVIDER=brevo
BREVO_API_KEY=your-brevo-api-key
BREVO_SMS_FROM=your-sender-number

# Cron Security Token (for Vercel cron authentication)
CRON_SECRET=a-random-long-secret-string
```

---

## Step 5: Deploy Edge Functions

### Using Supabase CLI:
```bash
cd supabase/
supabase functions deploy payment-reminders
supabase functions deploy bill-generator
```

### Manual Deployment (via Dashboard):
1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** section
3. Click "Create Function" for each:
   - `payment-reminders` — Automated payment reminder orchestration
   - `bill-generator` — Annual assessment generation

---

## Step 6: Set Up Environment Variables in Edge Functions

When deploying via dashboard, set these environment variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service key for database access | (from dashboard API settings) |
| `MESSAGING_PROVIDER` | Provider for C1a layer | `brevo` or `twilio` |
| `BREVO_API_KEY` | Brevo API key (if using Brevo) | Your API key |
| `BREVO_SMS_FROM` | SMS sender number | +233XXXXXXXXX |

---

## Step 7: Configure Vercel Cron Jobs

Add the following to your `web/vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "npm install",
  "outputDirectory": ".next",
  "crons": [
    {
      "path": "/api/cron/payment-reminders",
      "schedule": "0 8 1 * *"
    },
    {
      "path": "/api/cron/generate-bills",
      "schedule": "0 2 1 12 *|0 2 1 0,1 *"
    }
  ]
}
```

> **Note**: The bill-generator cron uses `0 2 1 12 *|0 2 1 0,1 *` which means:
> - Run at 2 AM on December 1st (generates next year's bills)
> - Run at 2 AM on January 1st and February 1st (generates current year bills)

---

## Step 8: Test Locally (Optional)

### Test Edge Function with Deno:
```bash
deno run --allow-net --allow-env supabase/functions/payment-reminders/index.ts
```

### Test Vercel Cron Route Locally:
```bash
cd web/
npm run dev
# Then curl the cron route:
curl -H "Authorization: Bearer your-cron-secret" http://localhost:3000/api/cron/payment-reminders
```

---

## Troubleshooting

### Edge Function Returns 500 Error
- Check that `SUPABASE_SERVICE_ROLE_KEY` is correctly set in edge function environment variables
- Verify the Supabase URL matches your project

### Cron Job Not Triggering
- Ensure Vercel account has cron support (Pro plan or higher)
- Check Vercel dashboard for scheduled jobs status
- Verify the `schedule` format uses standard cron syntax

### Messaging Provider Failures
- Verify API keys are correct in edge function env vars
- Check Brevo/Twilio dashboard for blocked messages or rate limits
- Review `reminder_log` table in Supabase for delivery failure details

---

## Quick Reference — Files Created

```
supabase/
├── functions/
│   ├── payment-reminders/
│   │   └── index.ts          # C1b: Automated reminder orchestration
│   └── bill-generator/
│       └── index.ts          # C2: Annual bill generation

web/
├── src/app/api/cron/
│   ├── payment-reminders/
│   │   └── route.ts          # Vercel cron entry point (C1b)
│   └── generate-bills/
│       └── route.ts          # Vercel cron entry point (C2)
├── vercel.json               # Cron schedule configuration
```
