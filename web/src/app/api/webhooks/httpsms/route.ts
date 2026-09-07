import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * HttpSMS Webhook Endpoint
 * Receives real-time delivery notifications and incoming SMS messages forwarded
 * from the linked Android phone.
 *
 * Configure this URL in your HttpSMS dashboard:
 * https://your-domain.com/api/webhooks/httpsms
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
    }

    const eventType = body.type || body.event || 'unknown';
    const msgData = body.data || body;
    const admin = await createAdminClient();

    // 1. Inbound SMS received on Android phone
    if (eventType === 'message.phone.received' || eventType === 'message.received') {
      const senderPhone = msgData.from || msgData.contact || '';
      const textContent = msgData.content || '';

      console.log(`[HttpSMS Webhook] Inbound SMS from ${senderPhone}: "${textContent}"`);

      // Attempt to match sender to an existing member by phone
      const cleanPhone = senderPhone.replace(/\D/g, '').slice(-9); // last 9 digits match local/intl
      let matchedMemberId: string | null = null;

      if (cleanPhone) {
        const { data: member } = await admin
          .from('members')
          .select('id, first_name, surname')
          .or(`phone.ilike.%${cleanPhone}%,mobile.ilike.%${cleanPhone}%`)
          .limit(1)
          .maybeSingle();

        if (member) {
          matchedMemberId = member.id;
        }
      }

      // Record inbound SMS communication in member_communications
      await admin.from('member_communications').insert({
        member_id: matchedMemberId,
        type: 'sms_inbound',
        subject: `SMS from ${senderPhone}`,
        content_preview: textContent.substring(0, 255),
        status: 'delivered',
        provider_message_id: msgData.id || `in_${Date.now()}`,
      });

      return NextResponse.json({ success: true, event: eventType, matchedMemberId });
    }

    // 2. Outbound SMS Delivery Status Update (sent, delivered, failed)
    if (eventType.startsWith('message.') && msgData.id) {
      const statusMap: Record<string, string> = {
        'message.sent': 'sent',
        'message.delivered': 'delivered',
        'message.failed': 'failed',
      };

      const mappedStatus = statusMap[eventType] || 'sent';

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
    description: 'HttpSMS Webhook Listener for KSJI MemberApp',
  });
}
