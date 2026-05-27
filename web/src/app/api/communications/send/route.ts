import { NextRequest, NextResponse } from 'next/server';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { sendCommunication, sendBulkCommunications } from '@/services/communicationService';

// POST /api/communications/send - Send communication(s) to member(s)
export async function POST(request: NextRequest) {
  try {
    // Enforce registrar role
    await requireRegistrar();

    const body = await request.json();

    // Validate required fields
    if (!body.memberId && !body.memberIds) {
      return NextResponse.json({ error: 'memberId or memberIds is required' }, { status: 400 });
    }

    if (!['email', 'sms'].includes(body.type)) {
      return NextResponse.json({ error: 'type must be email or sms' }, { status: 400 });
    }

    let result;

    // Single vs bulk send
    if (body.memberIds && Array.isArray(body.memberIds)) {
      result = await sendBulkCommunications({
        memberIds: body.memberIds,
        type: body.type,
        templateId: body.templateId,
        variables: body.variables || {},
      });
    } else {
      result = await sendCommunication({
        memberId: body.memberId,
        type: body.type,
        templateId: body.templateId,
        subject: body.subject,
        htmlContent: body.htmlContent,
        textContent: body.textContent,
        smsBody: body.smsBody,
        variables: body.variables || {},
      });
    }

    if ('success' in result) {
      // Single send result
      const res = result as ReturnType<typeof sendCommunication>;
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 500 });
      }
      return NextResponse.json({ success: true, messageId: res.messageId });
    }

    // Bulk send result
    const bulkResult = result as ReturnType<typeof sendBulkCommunications>;
    return NextResponse.json({
      success: true,
      sent: bulkResult.sent,
      failed: bulkResult.failed,
      errors: Object.fromEntries(bulkResult.errors),
    });
  } catch (error) {
    console.error('Communication API error:', error);
    return NextResponse.json({ error: 'Failed to send communication' }, { status: 500 });
  }
}
