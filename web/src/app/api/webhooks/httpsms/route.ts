import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * HttpSMS Webhook Endpoint
 * Strictly handles outbound SMS delivery status updates (sent, delivered, failed).
 * Inbound SMS reception is explicitly disabled for privacy.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
    }

    const eventType = body.type || body.event || 'unknown';
    const msgData = body.data || body;

    // 1. Explicitly ignore any inbound SMS received (Privacy Protected)
    if (eventType === 'message.phone.received' || eventType === 'message.received') {
      return NextResponse.json({
        success: true,
        message: 'Inbound message processing disabled per privacy policy',
      });
    }

    // 2. Outbound SMS Delivery Status Updates (sent, delivered, failed)
    if (eventType.startsWith('message.') && msgData.id) {
      const statusMap: Record<string, string> = {
        'message.sent': 'sent',
        'message.delivered': 'delivered',
        'message.failed': 'failed',
      };

      const mappedStatus = statusMap[eventType] || 'sent';
      const admin = await createAdminClient();

      await admin
        .from('member_communications')
        .update({
          status: mappedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_message_id', msgData.id);

      return NextResponse.json({ success: true, event: eventType, status: mappedStatus });
    }

    return NextResponse.json({ success: true, message: 'Event acknowledged' });
  } catch (error: any) {
    console.error('[HttpSMS Webhook Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    mode: 'outbound-status-only',
    description: 'HttpSMS Outbound Delivery Status Listener for KSJI MemberApp',
  });
}
