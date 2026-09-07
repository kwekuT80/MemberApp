'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  createMessagingProvider,
  createSMSProvider,
  MessagePayload,
  DeliveryResult,
} from '@/services/messaging';
import { getAllMemberSummaries } from '@/services/financialService';
import { isSystemMember, formatDisplayDate } from '@/lib/utils/ksji-logic';

// Communication template types and renderers
export type CommunicationType = 'email' | 'sms';

export type TemplateId =
  | 'payment_reminder'
  | 'meeting_notice'
  | 'financial_statement'
  | 'general';

export interface TemplateVariables {
  memberName: string;
  [key: string]: string | number | undefined | null;
}

// Template engine for Email & Cellular SMS
function renderTemplate(
  templateId: TemplateId,
  variables: TemplateVariables
): {
  subject?: string;
  html: string;
  text: string;
} {
  const name = variables.memberName || 'Brother';

  switch (templateId) {
    case 'financial_statement': {
      const assessed = Number(variables.assessed || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      const paid = Number(variables.paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      const balance = Number(variables.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      const asOf = variables.statementDate || formatDisplayDate(new Date().toISOString());

      return {
        subject: `KSJI St. John Dues & Assessment Statement - ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 2px solid #800020; padding-bottom: 15px; margin-bottom: 20px;">
              <h2 style="color: #800020; margin: 0;">Knights of St. John International</h2>
              <h4 style="color: #4a5568; margin: 5px 0 0 0;">Commandery No. 500 &mdash; Financial Statement</h4>
            </div>
            <p>Dear <strong>${name}</strong>,</p>
            <p>Here is your dues and assessment ledger standing as of <strong>${asOf}</strong>:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc;">
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">Total Assessed:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">GHS ${assessed}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">Total Paid / Credited:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #16a34a;">GHS ${paid}</td>
              </tr>
              <tr style="background-color: #fef2f2;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #991b1b;">Outstanding Balance:</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #991b1b;">GHS ${balance}</td>
              </tr>
            </table>
            <p style="font-size: 0.9em; color: #64748b;">
              Please arrange with the Financial Registrar or via Mobile Money to settle your account promptly. Thank you for your continued commitment and fraternity.
            </p>
            <p style="margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 15px; color: #475569;">
              Fraternally,<br/>
              <strong>Financial Registrar</strong><br/>
              KSJI Commandery No. 500
            </p>
          </div>
        `,
        text: `KSJI Commandery No. 500 Statement (${asOf})\nDear ${name},\nAssessed: GHS ${assessed}\nPaid: GHS ${paid}\nBalance Due: GHS ${balance}\nPlease settle with the Fin Registrar. Fraternally, KSJI 500.`,
      };
    }

    case 'meeting_notice': {
      const title = variables.meetingTitle || 'Commandery Monthly Meeting';
      const date = variables.meetingDate || 'Upcoming Meeting';
      const location = variables.meetingLocation || 'Commandery Hall';
      const uniform = variables.uniform ? `\nUniform: ${variables.uniform}` : '';
      const specialNote = variables.note ? `\nNote: ${variables.note}` : '';

      return {
        subject: `Notice of Meeting: ${title} - ${date}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #800020; margin-top: 0;">${title}</h2>
            <p>Dear <strong>${name}</strong>,</p>
            <p>You are fraternally summoned to attend the following Commandery session:</p>
            <ul>
              <li><strong>Date & Time:</strong> ${date}</li>
              <li><strong>Venue:</strong> ${location}</li>
              ${variables.uniform ? `<li><strong>Uniform:</strong> ${variables.uniform}</li>` : ''}
              ${variables.note ? `<li><strong>Special Instructions:</strong> ${variables.note}</li>` : ''}
            </ul>
            <p>Your punctual attendance and active participation are requested.</p>
            <p>Fraternally in St. John,<br/><strong>Registrar</strong><br/>KSJI Commandery No. 500</p>
          </div>
        `,
        text: `KSJI Notice: Dear ${name}, you are summoned to ${title} on ${date} at ${location}.${uniform}${specialNote}\nPunctuality is expected. Fraternally, KSJI 500.`,
      };
    }

    case 'payment_reminder': {
      const amount = variables.amount || '0.00';
      const dueDate = variables.dueDate || 'N/A';
      return {
        subject: `Payment Reminder - Due ${dueDate}`,
        html: `<p>Dear ${name},</p><p>This is a friendly reminder that your payment of <strong>GHS ${amount}</strong> is due on <strong>${dueDate}</strong>.</p><p>Please contact the Financial Registrar to reconcile.</p><br/><p>Kind regards,<br/>KSJI Commandery No. 500</p>`,
        text: `Dear ${name}, this is a reminder that payment of GHS ${amount} is due on ${dueDate}. Please contact the Financial Registrar. KSJI No. 500.`,
      };
    }

    case 'general':
    default:
      return {
        subject: typeof variables.subject === 'string' ? variables.subject : 'Notice from KSJI Commandery No. 500',
        html: `<p>Dear ${name},</p><div>${variables.content || ''}</div><br/><p>Kind regards,<br/>KSJI Commandery No. 500</p>`,
        text: `Dear ${name},\n\n${variables.content || ''}\n\nKind regards,\nKSJI Commandery No. 500`,
      };
  }
}

// Send a single communication to one member — records it in the database
export async function sendCommunication(payload: {
  memberId: string;
  type: CommunicationType;
  templateId?: TemplateId;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  smsBody?: string;
  variables?: TemplateVariables;
  sendAt?: string | Date;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get member details
    const { data: member }: any = await supabase
      .from('members')
      .select('*')
      .eq('id', payload.memberId)
      .single();

    if (!member) {
      return { success: false, error: 'Member not found' };
    }

    let payloadData: MessagePayload = {
      to: '',
      name: `${member.first_name || ''} ${member.surname}`.trim(),
      body: payload.smsBody || '',
      sendAt: payload.sendAt,
    };

    if (payload.type === 'email') {
      payloadData.to = member.email || '';
      payloadData.subject = payload.subject;
      payloadData.html = payload.htmlContent;
      payloadData.text = payload.textContent;
    } else {
      payloadData.to = member.phone || member.mobile || '';
    }

    // If template provided, render it
    if (payload.templateId && payload.variables) {
      const rendered = renderTemplate(payload.templateId, payload.variables);

      if (!payload.htmlContent) {
        payloadData.html = rendered.html;
      }
      if (!payload.textContent) {
        payloadData.text = rendered.text;
      }
      if (!payload.smsBody) {
        payloadData.body = rendered.text;
      }
      if (!payload.subject) {
        payloadData.subject = rendered.subject;
      }
    }

    // Send via provider
    let result: DeliveryResult;

    if (payload.type === 'email') {
      const emailProvider = createMessagingProvider();
      result = await emailProvider.sendEmail(payloadData);
    } else {
      const smsProvider = createSMSProvider();
      result = await smsProvider.sendSMS(payloadData);
    }

    // Record in database for audit trail
    await supabase.from('member_communications').insert({
      member_id: payload.memberId,
      type: payload.type,
      subject: payloadData.subject || (payload.type === 'sms' ? 'SMS Notification' : 'Notice'),
      content_preview: (payloadData.html || payloadData.body || payloadData.text || '').substring(0, 255),
      status: result.status === 'sent' ? 'delivered' : result.status,
      provider_message_id: result.messageId,
      template_id: payload.templateId,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Communication send failed:', error);
    return { success: false, error: String(error) };
  }
}

// Get communication history for a member
export async function getMemberCommunications(memberId: string): Promise<any[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('member_communications')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return data || [];
}

// Get all communications with optional filtering
export async function getAllCommunications(filters?: {
  type?: CommunicationType;
  status?: string;
  memberId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<any[]> {
  const supabase = await createClient();

  let query = supabase
    .from('member_communications')
    .select('*, members(first_name, surname)');

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.memberId) {
    query = query.eq('member_id', filters.memberId);
  }
  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return [];
  return data || [];
}

// Send bulk communications with 3 SMS/minute queue pacing
export async function sendBulkCommunications(payload: {
  memberIds: string[];
  type: CommunicationType;
  templateId?: TemplateId;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  smsBody?: string;
  variables?: Record<string, TemplateVariables>;
  rateLimitPerMinute?: number;
}): Promise<{
  sent: number;
  failed: number;
  errors: Map<string, string>;
  rateLimitPerMinute?: number;
}> {
  let sent = 0;
  let failed = 0;
  const errors = new Map<string, string>();

  // For SMS, enforce the requested rate limit: 3 messages per minute (20 seconds between sends)
  const isSms = payload.type === 'sms';
  const rateLimit = payload.rateLimitPerMinute || 3;
  const intervalMs = Math.round(60_000 / rateLimit); // 20,000 ms
  const baseTime = Date.now();

  for (let i = 0; i < payload.memberIds.length; i++) {
    const memberId = payload.memberIds[i];
    const scheduledSendAt = isSms ? new Date(baseTime + i * intervalMs) : undefined;

    const result = await sendCommunication({
      memberId,
      type: payload.type,
      templateId: payload.templateId,
      variables: payload.variables?.[memberId] || { memberName: '' },
      subject: payload.subject,
      htmlContent: payload.htmlContent,
      textContent: payload.textContent,
      smsBody: payload.smsBody,
      sendAt: scheduledSendAt,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.set(memberId, result.error || 'Unknown error');
    }
  }

  return {
    sent,
    failed,
    errors,
    rateLimitPerMinute: rateLimit,
  };
}

/**
 * High-Level Action: Broadcast Meeting Notice & Reminders via SMS, Email, or Both.
 * Automatically paces SMS messages at 3/min to protect cellular carrier health.
 */
export async function broadcastMeetingNotice({
  meetingId,
  channel = 'both',
  target = 'all_active',
  uniform,
  specialNote,
}: {
  meetingId: string;
  channel: 'sms' | 'email' | 'both';
  target?: 'all_active' | 'unconfirmed_only';
  uniform?: string;
  specialNote?: string;
}): Promise<{ success: boolean; totalQueued: number; message: string }> {
  const admin = await createAdminClient();

  // 1. Fetch meeting
  const { data: meeting } = await admin
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single();

  if (!meeting) {
    throw new Error('Meeting not found');
  }

  // 2. Fetch target members
  const { data: allActive } = await admin
    .from('members')
    .select('id, first_name, surname, phone, mobile, email, status')
    .eq('status', 'Active')
    .order('surname');

  let targetMembers = (allActive || []).filter(m => !isSystemMember(m));

  // If unconfirmed only, filter out members who already checked in
  if (target === 'unconfirmed_only') {
    const { data: checkIns } = await admin
      .from('attendance')
      .select('member_id')
      .eq('meeting_id', meetingId);

    const checkedInIds = new Set((checkIns || []).map(c => c.member_id));
    targetMembers = targetMembers.filter(m => !checkedInIds.has(m.id));
  }

  if (targetMembers.length === 0) {
    return { success: true, totalQueued: 0, message: 'No target members found for broadcast.' };
  }

  const memberIds = targetMembers.map(m => m.id);
  const mDateStr = formatDisplayDate(meeting.date);

  const variablesMap: Record<string, TemplateVariables> = {};
  targetMembers.forEach(m => {
    variablesMap[m.id] = {
      memberName: `${m.first_name || ''} ${m.surname}`.trim(),
      meetingTitle: meeting.title,
      meetingDate: mDateStr,
      meetingLocation: meeting.location_name || 'Commandery Hall',
      uniform: uniform || '',
      note: specialNote || '',
    };
  });

  let totalQueued = 0;

  // Dispatch Email
  if (channel === 'email' || channel === 'both') {
    await sendBulkCommunications({
      memberIds,
      type: 'email',
      templateId: 'meeting_notice',
      variables: variablesMap,
    });
    totalQueued += memberIds.length;
  }

  // Dispatch SMS with 3 messages/minute rate limiting
  if (channel === 'sms' || channel === 'both') {
    await sendBulkCommunications({
      memberIds,
      type: 'sms',
      templateId: 'meeting_notice',
      variables: variablesMap,
      rateLimitPerMinute: 3, // 1 message every 20 seconds
    });
    totalQueued += memberIds.length;
  }

  return {
    success: true,
    totalQueued,
    message: `Broadcast initiated for ${targetMembers.length} brothers (${channel.toUpperCase()}) queued at 3 SMS/min.`,
  };
}

/**
 * High-Level Action: Broadcast Assessment Standing Statements via Email, SMS, or Both.
 * Automatically paces SMS messages at 3/min.
 */
export async function broadcastFinancialStatements({
  channel = 'both',
  target = 'outstanding_only',
}: {
  channel: 'sms' | 'email' | 'both';
  target?: 'outstanding_only' | 'all_active';
}): Promise<{ success: boolean; totalQueued: number; message: string }> {
  // Fetch summaries
  const summaries = await getAllMemberSummaries();

  // Filter out deceased, dismissed, system members
  let targetSummaries = summaries.filter(m => {
    if (m.is_deceased || m.status === 'Deceased' || m.status === 'Dismissed') return false;
    if (m.is_senior_exempt) return false;
    if (target === 'outstanding_only') {
      const bal = parseFloat(String(m.outstanding_balance || 0));
      return bal > 0;
    }
    return true;
  });

  if (targetSummaries.length === 0) {
    return { success: true, totalQueued: 0, message: 'No members matching statement criteria.' };
  }

  const memberIds = targetSummaries.map(m => m.id);
  const asOfDate = formatDisplayDate(new Date().toISOString());

  const variablesMap: Record<string, TemplateVariables> = {};
  targetSummaries.forEach(m => {
    variablesMap[m.id] = {
      memberName: m.full_name,
      assessed: m.total_assessed,
      paid: m.total_paid,
      balance: m.outstanding_balance,
      statementDate: asOfDate,
    };
  });

  let totalQueued = 0;

  // Dispatch Email
  if (channel === 'email' || channel === 'both') {
    await sendBulkCommunications({
      memberIds,
      type: 'email',
      templateId: 'financial_statement',
      variables: variablesMap,
    });
    totalQueued += memberIds.length;
  }

  // Dispatch SMS with 3 messages/minute rate limiting
  if (channel === 'sms' || channel === 'both') {
    await sendBulkCommunications({
      memberIds,
      type: 'sms',
      templateId: 'financial_statement',
      variables: variablesMap,
      rateLimitPerMinute: 3, // 1 message every 20 seconds
    });
    totalQueued += memberIds.length;
  }

  return {
    success: true,
    totalQueued,
    message: `Dispatched statements to ${targetSummaries.length} brothers (${channel.toUpperCase()}) queued at 3 SMS/min.`,
  };
}

/**
 * High-Level Action: Send Single Member Statement immediately via SMS and/or Email.
 */
export async function sendSingleMemberStatement({
  memberId,
  channel = 'sms',
}: {
  memberId: string;
  channel: 'sms' | 'email' | 'both';
}): Promise<{ success: boolean; message: string }> {
  const summaries = await getAllMemberSummaries();
  const summary = summaries.find(s => s.id === memberId);

  if (!summary) {
    throw new Error('Member financial summary not found');
  }

  const vars: TemplateVariables = {
    memberName: summary.full_name,
    assessed: summary.total_assessed,
    paid: summary.total_paid,
    balance: summary.outstanding_balance,
    statementDate: formatDisplayDate(new Date().toISOString()),
  };

  if (channel === 'email' || channel === 'both') {
    await sendCommunication({
      memberId,
      type: 'email',
      templateId: 'financial_statement',
      variables: vars,
    });
  }

  if (channel === 'sms' || channel === 'both') {
    await sendCommunication({
      memberId,
      type: 'sms',
      templateId: 'financial_statement',
      variables: vars,
    });
  }

  return {
    success: true,
    message: `Statement sent to Brother ${summary.full_name} via ${channel.toUpperCase()}.`,
  };
}
