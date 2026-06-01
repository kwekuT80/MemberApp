/**
 * C1b: Automated Payment Reminder Orchestration (Edge Function)
 *
 * Scans for members with pending/overdue payments and sends reminders via SMS or email.
 * Uses provider selection from environment variable MESSAGING_PROVIDER.
 *
 * Scheduled via Vercel cron → /api/cron/payment-reminders → calls this edge function.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Messaging provider configuration — switch via MESSAGING_PROVIDER env var
const MESSAGING_PROVIDER = Deno.env.get("MESSAGING_PROVIDER") || "brevo";
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_SMS_FROM = Deno.env.get("BREVO_SMS_FROM");

// Legacy provider keys (kept for future migration)
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

interface MemberWithProfile {
  id: string;
  first_name: string;
  surname: string;
  phone_number?: string;
  email?: string;
}

interface PendingPayment {
  member_id: string;
  amount: number;
  payment_date: string;
  status: string;
}

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Fetch members with phone numbers and their notification preferences
    const { data: members } = await supabase
      .from("members")
      .select(`id, first_name, surname, phone_number, email`)
      .not("phone_number", "is", null);

    // Fetch pending/unpaid payments
    const { data: pendingPayments } = await supabase
      .from("financial_payments")
      .select(`member_id, amount, payment_date, status`)
      .eq("status", "unpaid");

    if (!members || !pendingPayments) {
      return new Response(JSON.stringify({ success: true, remindersSent: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build combined dataset with urgency categorization
    const today = new Date();
    const remindersToSend: Array<{
      member: MemberWithProfile;
      category: 'upcoming_due' | 'overdue_90' | 'overdue_180';
      amountDue: number;
      daysOverdue: number;
      channel?: string;
    }> = [];

    for (const payment of pendingPayments) {
      const memberData = members.find(m => m.id === payment.member_id);
      if (!memberData) continue;

      // Get profile notification preference
      const { data: profile } = await supabase
        .from("profiles")
        .select("notification_channel, phone_number")
        .eq("id", memberData.id)
        .single();

      const channel = (profile?.notification_channel as string) || "email";

      const daysOverdue = Math.floor(
        (today.getTime() - new Date(payment.payment_date).getTime()) / 86400000
      );

      let category: 'upcoming_due' | 'overdue_90' | 'overdue_180';
      if (daysOverdue < 0) {
        // Payment not yet due but coming soon
        const daysUntilDue = Math.abs(daysOverdue);
        if (daysUntilDue <= 7) category = "upcoming_due";
        else continue;
      } else if (daysOverdue <= 90) {
        category = "overdue_90";
      } else {
        category = "overdue_180";
      }

      remindersToSend.push({
        member: memberData,
        category,
        amountDue: payment.amount,
        daysOverdue,
        channel,
      });
    }

    // Deduplicate by member + category (don't send same reminder twice)
    const uniqueReminders = new Map<string, typeof remindersToSend[0]>();
    for (const r of remindersToSend) {
      const key = `${r.member.id}-${r.category}`;
      if (!uniqueReminders.has(key)) {
        uniqueReminders.set(key, r);
      }
    }

    // Send notifications and log results
    let sentCount = 0;
    for (const reminder of uniqueReminders.values()) {
      const channel = reminder.channel || "email";

      if (channel === "sms" && reminder.member.phone_number) {
        await sendSMS(reminder.member.phone_number, createSMSTemplate(reminder));
      } else {
        await sendEmail(
          reminder.member.email || "",
          `${reminder.member.first_name} ${reminder.member.surname}`,
          createEmailTemplate(reminder)
        );
      }

      // Log the sent reminder (service role bypasses RLS)
      try {
        await supabase.from("reminder_log").insert({
          member_id: reminder.member.id,
          recipient: channel === "sms" ? reminder.member.phone_number : reminder.member.email,
          channel,
          template_type: reminder.category,
          status: "sent",
        });
      } catch (logError) {
        console.error("Failed to log reminder:", logError);
      }

      sentCount++;
    }

    return new Response(JSON.stringify({ success: true, remindersSent: sentCount }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Reminder generation failed:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

// Template helpers
function createSMSTemplate(reminder: any): string {
  const templates = {
    upcoming_due: "Reminder: Payment of GH¢{{amount}} is due on {{date}}. Please contact the Finance Desk.",
    overdue_90: "URGENT: Payment of GH¢{{amount}} is {{days}} days overdue. Please settle immediately.",
    overdue_180: "CRITICAL: Payment of GH¢{{amount}} has been outstanding for {{days}} days. Contact the Financial Secretary urgently.",
  };
  let body = templates[reminder.category as keyof typeof templates] || templates.overdue_90;
  // Simple variable substitution (in production, use a proper template engine)
  body = body.replace("{{amount}}", reminder.amountDue.toFixed(2));
  if (reminder.daysOverdue !== undefined) {
    body = body.replace("{{days}}", reminder.daysOverdue.toString());
  }
  return body;
}

function createEmailTemplate(reminder: any): string {
  const categoryLabels = {
    upcoming_due: "due soon",
    overdue_90: `${reminder.daysOverdue} days overdue`,
    overdue_180: `${reminder.daysOverdue} days overdue (critical)`,
  };

  return `<html><body>
    <h2>Payment Reminder</h2>
    <p>Dear ${reminder.member.first_name || 'Member'},</p>
    <p>Your payment of GH¢${reminder.amountDue.toFixed(2)} is ${categoryLabels[reminder.category as keyof typeof categoryLabels] || 'overdue'}.</p>
    <p>Please contact the Finance Desk to settle your account.</p>
    <br/>
    <p style="color: #999; font-size: 12px;">KSJI Commandery — Financial Secretary</p>
  </body></html>`;
}

// Provider abstraction — implemented inline for Deno edge function compatibility
async function sendSMS(to: string, body: string) {
  if (MESSAGING_PROVIDER === "twilio" && TWILIO_SID && TWILIO_TOKEN && TWILIO_PHONE_NUMBER) {
    // Twilio SMS implementation
    const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: TWILIO_PHONE_NUMBER,
        To: to,
        Body: body,
      }).toString(),
    });
  } else {
    // Brevo SMS fallback (placeholder — requires proper API key)
    if (BREVO_API_KEY && BREVO_SMS_FROM) {
      await fetch("https://api.brevo.com/v3/smtp/sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { number: BREVO_SMS_FROM },
          recipient: { number: to },
          content: body,
        }),
      });
    } else {
      console.warn(`[C1b] No SMS provider configured. Skipping SMS to ${to}`);
    }
  }
}

async function sendEmail(to: string, name: string, html: string) {
  if (MESSAGING_PROVIDER === "brevo" && BREVO_API_KEY) {
    // Brevo email implementation
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: process.env.BREVO_SENDER_EMAIL || "" },
        to: [{ email: to, name }],
        subject: "Payment Reminder — KSJI Commandery",
        htmlContent: html,
      }),
    });
  } else if (MESSAGING_PROVIDER === "twilio" && TWILIO_SID && TWILIO_TOKEN) {
    // Twilio email placeholder (requires additional setup)
    console.warn(`[C1b] Twilio email not yet implemented. Skipping email to ${to}`);
  } else {
    console.warn(`[C1b] No email provider configured. Skipping email to ${to}`);
  }
}
