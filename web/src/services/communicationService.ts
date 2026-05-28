'use server';

import { createClient } from '@/lib/supabase/server';
import {
  createMessagingProvider,
  MessagePayload,
  DeliveryResult,
} from '@/services/messaging';

// Communication template types and renderers
export type CommunicationType =
  | 'email'
  | 'sms';

export type TemplateId =
  | 'payment_reminder'
  | 'meeting_notice'
  | 'general';

interface TemplateVariables {
  memberName: string;
  [key: string]:
    | string
    | number;
}

// Simple template engine — extends in production with Nunjucks/Handlebars
function renderTemplate(
  templateId: TemplateId,
  variables: TemplateVariables
): {
  subject?: string;
  html: string;
  text: string;
} {
  const name =
    variables.memberName ||
    'Member';

  switch (templateId) {
    case 'payment_reminder':
      return {
        subject: `Payment Reminder - ${
          variables.dueDate
            ? new Date(
                String(
                  variables.dueDate
                )
              ).toLocaleDateString()
            : 'Upcoming Due'
        }`,

        html: `<p>Dear ${name},</p><p>This is a reminder that your payment of <strong>${
          variables.amount || 0
        }</strong> is due on <strong>${
          variables.dueDate ||
          'N/A'
        }</strong>.</p><p>Please contact the registrar to make arrangements.</p><br/><p>Kind regards,<br/>KSJI Commandery #500</p>`,

        text: `Dear ${name},\n\nThis is a reminder that your payment of $${
          variables.amount || 0
        } is due on ${
          variables.dueDate ||
          'N/A'
        }.\n\nPlease contact the registrar to make arrangements.\n\nKind regards,\nKSJI Commandery #500`,
      };

    case 'meeting_notice':
      return {
        subject: `Meeting Notice - ${
          variables.meetingTitle ||
          'Upcoming Meeting'
        }`,

        html: `<p>Dear ${name},</p><p>You are invited to attend the <strong>${
          variables.meetingTitle
        }</strong> meeting on <strong>${
          variables.meetingDate
        }</strong> at <strong>${
          variables.meetingLocation ||
          'TBD'
        }</strong>.</p><br/><p>Kind regards,<br/>KSJI Commandery #500</p>`,

        text: `Dear ${name},\n\nYou are invited to attend the ${
          variables.meetingTitle
        } meeting on ${
          variables.meetingDate
        } at ${
          variables.meetingLocation ||
          'TBD'
        }.\n\nKind regards,\nKSJI Commandery #500`,
      };

    case 'general':
    default:
      return {
        subject:
          typeof variables.subject ===
          'string'
            ? variables.subject
            : 'Message from KSJI Commandery #500',

        html: `<p>Dear ${name},</p><div>${
          variables.content || ''
        }</div><br/><p>Kind regards,<br/>KSJI Commandery #500</p>`,

        text: `Dear ${name},\n\n${
          variables.content || ''
        }\n\nKind regards,\nKSJI Commandery #500`,
      };
  }
}

// Send a single communication to one member — records it in the database
export async function sendCommunication(
  payload: {
    memberId: string;
    type: CommunicationType;
    templateId?: TemplateId;
    subject?: string;
    htmlContent?: string;
    textContent?: string;
    smsBody?: string;
    variables?: TemplateVariables;
  }
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const supabase =
      await createClient();

    // Get member details
    const {
      data: member,
    }: any = await supabase
      .from('members')
      .select('*')
      .eq(
        'id',
        payload.memberId
      )
      .single();

    if (!member) {
      return {
        success: false,
        error:
          'Member not found',
      };
    }

    let payloadData: MessagePayload =
      {
        to: '',
        name: `${
          member.first_name ||
          ''
        } ${
          member.surname
        }`.trim(),
        body:
          payload.smsBody || '',
      };

    if (
      payload.type ===
      'email'
    ) {
      payloadData.to =
        member.email || '';

      payloadData.subject =
        payload.subject;

      payloadData.html =
        payload.htmlContent;

      payloadData.text =
        payload.textContent;
    } else {
      payloadData.to =
        member.phone ||
        member.mobile ||
        '';
    }

    // If template provided, render it
    if (
      payload.templateId &&
      payload.variables
    ) {
      const rendered =
        renderTemplate(
          payload.templateId,
          payload.variables
        );

      if (
        !payload.htmlContent
      ) {
        payloadData.html =
          rendered.html;
      }

      if (
        !payload.textContent
      ) {
        payloadData.text =
          rendered.text;
      }

      if (
        !payload.subject
      ) {
        payloadData.subject =
          rendered.subject;
      }
    }

    // Send via provider
    const provider =
      createMessagingProvider();

    let result: DeliveryResult;

    if (
      payload.type ===
      'email'
    ) {
      result =
        await provider.sendEmail(
          payloadData
        );
    } else {
      result =
        await provider.sendSMS(
          payloadData
        );
    }

    // Record in database for audit trail
    await supabase
      .from(
        'member_communications'
      )
      .insert({
        member_id:
          payload.memberId,

        type: payload.type,

        subject:
          payload.subject,

        content_preview: (
          payload.htmlContent ||
          payload.smsBody ||
          ''
        ).substring(0, 255),

        status:
          result.status ===
          'sent'
            ? 'delivered'
            : result.status,

        provider_message_id:
          result.messageId,

        template_id:
          payload.templateId,
      });

    if (result.error) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      messageId:
        result.messageId,
    };
  } catch (error) {
    console.error(
      'Communication send failed:',
      error
    );

    return {
      success: false,
      error: String(error),
    };
  }
}

// Get communication history for a member
export async function getMemberCommunications(
  memberId: string
): Promise<any[]> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from(
      'member_communications'
    )
    .select('*')
    .eq(
      'member_id',
      memberId
    )
    .order('created_at', {
      ascending: false,
    })
    .limit(50);

  if (error) return [];

  return data || [];
}

// Get all communications with optional filtering
export async function getAllCommunications(
  filters?: {
    type?: CommunicationType;
    status?: string;
    memberId?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<any[]> {
  const supabase =
    await createClient();

  let query = supabase
    .from(
      'member_communications'
    )
    .select(
      '*, members(first_name, surname)'
    );

  if (filters?.type) {
    query = query.eq(
      'type',
      filters.type
    );
  }

  if (filters?.status) {
    query = query.eq(
      'status',
      filters.status
    );
  }

  if (filters?.memberId) {
    query = query.eq(
      'member_id',
      filters.memberId
    );
  }

  if (filters?.dateFrom) {
    query = query.gte(
      'created_at',
      filters.dateFrom
    );
  }

  if (filters?.dateTo) {
    query = query.lte(
      'created_at',
      filters.dateTo
    );
  }

  const {
    data,
    error,
  } = await query
    .order('created_at', {
      ascending: false,
    })
    .limit(100);

  if (error) return [];

  return data || [];
}

// Send bulk communications to multiple members
export async function sendBulkCommunications(
  payload: {
    memberIds: string[];
    type: CommunicationType;
    templateId?: TemplateId;
    variables?: Record<
      string,
      TemplateVariables
    >; // Map of memberId -> variables
  }
): Promise<{
  sent: number;
  failed: number;
  errors: Map<string, string>;
}> {
  let sent = 0;

  let failed = 0;

  const errors = new Map<
    string,
    string
  >();

  for (const memberId of payload.memberIds) {
    const result =
      await sendCommunication({
        memberId,

        type: payload.type,

        templateId:
          payload.templateId,

        variables:
          payload.variables?.[
            memberId
          ] || {
            memberName: '',
          },
      });

    if (result.success) {
      sent++;
    } else {
      failed++;

      errors.set(
        memberId,
        result.error ||
          'Unknown error'
      );
    }
  }

  return {
    sent,
    failed,
    errors,
  };
}