/**
 * Vercel Cron Entry Point for C1b: Automated Payment Reminders
 *
 * Triggered by Vercel cron schedule, verifies auth token, then calls Supabase edge function.
 */

import { NextResponse } from 'next/server';

const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payment-reminders`;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request) {
  // Verify cron secret token
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Call Supabase Edge Function to do the actual work
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      // Timeout after 60 seconds to avoid hanging cron requests
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Edge function failed', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('C1b Cron job failed:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
