/**
 * =====================================================================
 * KSJI MEMBERAPP
 * FINANCIAL ENGAGEMENT ENGINE
 * =====================================================================
 *
 * Edge Function:
 *   payment-reminders
 *
 * Purpose:
 *   Quarterly member financial engagement and collections workflow.
 *
 * Replaces:
 *   Legacy payment reminder engine that was based on:
 *
 *     financial_payments
 *         ↓
 *     unpaid rows
 *         ↓
 *     days overdue
 *         ↓
 *     generic reminder email
 *
 * New Model:
 *
 *     member_financial_summary
 *             ↓
 *     financial classification
 *             ↓
 *     communication template selection
 *             ↓
 *     communication_requests
 *             ↓
 *     send-email edge function
 *             ↓
 *     communication_delivery_states
 *             ↓
 *     member_communications
 *             ↓
 *     reminder_log
 *             ↓
 *     registrar escalation workflow
 *
 * ---------------------------------------------------------------------
 * BUSINESS PHILOSOPHY
 * ---------------------------------------------------------------------
 *
 * This function is intentionally designed as a:
 *
 *     Financial Engagement Engine
 *
 * rather than a:
 *
 *     Debt Collection Engine
 *
 * Members making meaningful progress toward their assessment obligations
 * should receive encouragement rather than punitive messaging.
 *
 * The system therefore evaluates:
 *
 *     • Total assessed
 *     • Total paid
 *     • Outstanding balance
 *     • Completion percentage
 *     • Arrears age
 *
 * before deciding which communication should be sent.
 *
 * ---------------------------------------------------------------------
 * PRIMARY DATA SOURCE
 * ---------------------------------------------------------------------
 *
 * member_financial_summary
 *
 * This table/view already contains:
 *
 *     total_assessed
 *     total_paid
 *     outstanding_balance
 *     payment_status
 *
 * Assessment calculations, age discounts, social-member rates,
 * student-member rates and arrears roll-forwards have already been
 * incorporated into these figures.
 *
 * This function MUST NOT attempt to recalculate assessment obligations.
 *
 * ---------------------------------------------------------------------
 * COMMUNICATION PRINCIPLE
 * ---------------------------------------------------------------------
 *
 * Exactly ONE communication may be sent to a member during a single
 * execution cycle.
 *
 * If multiple categories apply, the highest-priority category wins.
 *
 * ---------------------------------------------------------------------
 * COMMUNICATION PRIORITY ORDER
 * ---------------------------------------------------------------------
 *
 * Highest severity first:
 *
 *     financial_suspension_review
 *     financial_intervention
 *     financial_delinquent
 *     financial_strong_reminder
 *     financial_reminder
 *     financial_encouragement
 *     financial_appreciation
 *
 * ---------------------------------------------------------------------
 * COMMUNICATION CATEGORIES
 * ---------------------------------------------------------------------
 *
 * financial_appreciation
 *
 *     payment_status = paid
 *     total_paid > 0
 *
 * Purpose:
 *     Recognize members who have satisfied their obligations.
 *
 * ---------------------------------------------------------------------
 *
 * financial_encouragement
 *
 *     partially_paid
 *     completion_percentage >= 50%
 *
 * Purpose:
 *     Recognize meaningful payment progress.
 *
 * ---------------------------------------------------------------------
 *
 * financial_reminder
 *
 *     completion_percentage >= 25%
 *     completion_percentage < 50%
 *
 * Purpose:
 *     Friendly reminder.
 *
 * ---------------------------------------------------------------------
 *
 * financial_strong_reminder
 *
 *     completion_percentage < 25%
 *
 * Purpose:
 *     Encourage more active payment participation.
 *
 * ---------------------------------------------------------------------
 *
 * financial_delinquent
 *
 *     payment_status = delinquent
 *
 * Purpose:
 *     No meaningful payment activity recorded.
 *
 * ---------------------------------------------------------------------
 *
 * financial_intervention
 *
 *     Two-year arrears.
 *
 * Purpose:
 *     Personal engagement by officers.
 *
 * Creates:
 *     registrar_queues record.
 *
 * ---------------------------------------------------------------------
 *
 * financial_suspension_review
 *
 *     Three-year-plus arrears.
 *
 * Purpose:
 *     Governance review workflow.
 *
 * Creates:
 *     registrar_queues record.
 *
 * ---------------------------------------------------------------------
 * REGISTRAR ESCALATION MODEL
 * ---------------------------------------------------------------------
 *
 * Event Types:
 *
 *     financial_intervention
 *     suspension_review
 *
 * Status Values:
 *
 *     pending
 *     assigned
 *     completed
 *
 * Duplicate active cases are prevented by:
 *
 *     uq_financial_active_case
 *
 * which allows only one active case per:
 *
 *     member_id
 *     event_type
 *
 * combination.
 *
 * ---------------------------------------------------------------------
 * COMMUNICATION ARCHITECTURE
 * ---------------------------------------------------------------------
 *
 * This function does NOT send email directly through Resend.
 *
 * All delivery is delegated to:
 *
 *     send-email
 *
 * edge function.
 *
 * Benefits:
 *
 *     • Single email delivery implementation
 *     • Centralized Resend integration
 *     • Consistent delivery-state tracking
 *     • Reduced code duplication
 *
 * ---------------------------------------------------------------------
 * TABLES UPDATED
 * ---------------------------------------------------------------------
 *
 * communication_requests
 *
 *     Created before delivery.
 *
 * ---------------------------------------------------------------------
 *
 * communication_delivery_states
 *
 *     Created by send-email.
 *
 * ---------------------------------------------------------------------
 *
 * member_communications
 *
 *     Member communication history.
 *
 * ---------------------------------------------------------------------
 *
 * reminder_log
 *
 *     Financial engagement audit trail.
 *
 * ---------------------------------------------------------------------
 *
 * registrar_queues
 *
 *     Intervention and suspension-review workflows.
*
  * Members aged 80 and above are excluded from
  * financial engagement communications.
  *
  * KSJI policy should treat outstanding arrears as forgiven
  * upon attaining age 80.
  *
 * ---------------------------------------------------------------------
 * EXECUTION FREQUENCY
 * ---------------------------------------------------------------------
 *
 * Quarterly.
 *
 * Recommended:
 *
 *     January
 *     April
 *     July
 *     October
 *
 * Trigger Path:
 *
 *     Vercel Cron
 *         ↓
 *     API Route
 *         ↓
 *     payment-reminders Edge Function
 *
 * ---------------------------------------------------------------------
 * MAINTAINER NOTES
 * ---------------------------------------------------------------------
 *
 * If future business rules change:
 *
 *     1. Update communication_templates first.
 *     2. Update classification logic second.
 *     3. Avoid modifying send-email unless delivery behaviour changes.
 *
 * Communication wording should generally be modified through:
 *
 *     communication_templates
 *
 * rather than through code deployments.
 *
 * =====================================================================
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * ---------------------------------------------------------------------
 * ENVIRONMENT CONFIGURATION
 * ---------------------------------------------------------------------
 */

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL")!;

const SUPABASE_SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Used to invoke the send-email edge function.
 */
const SEND_EMAIL_ENDPOINT =
  `${SUPABASE_URL}/functions/v1/send-email`;

/**
 * Financial engagement communications originate from
 * the KSJI communications mailbox.
 */
const DEFAULT_FROM_NAME =
  "KSJI Commandery #500";

/**
 * Current execution year.
 *
 * Used when calculating arrears severity.
 */
const CURRENT_YEAR =
  new Date().getFullYear();

/**
 * MAIN EXECUTION FLOW
 *
 * Build Work Queue
 *     ↓
 * Classify Member
 *     ↓
 * Select Template
 *     ↓
 * Create Communication Request
 *     ↓
 * Send Email
 *     ↓
 * Record Communication
 *     ↓
 * Create Registrar Case
 */

interface FinancialSummary {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  total_assessed: number;
  total_paid: number;
  outstanding_balance: number;
  last_assessment_year: number;
  payment_status: string;
}

interface Member {
  id: string;

  title: string | null;

  first_name: string;
  surname: string;

  email: string | null;
  phone: string | null;

  membership_type: string | null;

  status?: string | null;

  is_deceased?: boolean | null;

  date_of_birth?: string | null;

  date_of_death?: string | null;

  date_of_dismissal?: string | null;

  transfer_to?: string | null;
}

interface Profile {
  member_id: string;
  notification_channel: string | null;
  phone: string | null;
}

interface CommunicationTemplate {
  id: string;
  event_type: string;
  subject: string;
  html_body: string;
  text_body: string;
}

type CommunicationType =
  | "financial_appreciation"
  | "financial_encouragement"
  | "financial_reminder"
  | "financial_strong_reminder"
  | "financial_delinquent"
  | "financial_intervention"
  | "financial_suspension_review";

type ArrearsSeverity =
  | "current"
  | "one_year"
  | "two_year"
  | "three_plus_year";

interface MemberClassification {
  communicationType: CommunicationType;
  completionPercentage: number;
  severity: ArrearsSeverity;
}

function calculateCompletionPercentage(
  totalAssessed: number,
  totalPaid: number
): number {
  if (totalAssessed <= 0) {
    return totalPaid > 0 ? 100 : 0;
  }

  return Math.round((totalPaid / totalAssessed) * 100);
}

function classifyFinancialStatus(
  summary: FinancialSummary,
  severity: ArrearsSeverity
): MemberClassification | null {
  const completionPercentage = calculateCompletionPercentage(
    Number(summary.total_assessed || 0),
    Number(summary.total_paid || 0)
  );
/**
 * Members with no assessment obligation
 * should not enter the communication
 * workflow.
 *
 * Examples:
 * - Age-based exemptions
 * - Honorary exemptions
 * - Members with fully forgiven balances
 */
if (
  Number(summary.total_assessed || 0) <= 0 &&
  Number(summary.outstanding_balance || 0) <= 0
) {
  return null;
}

  // Highest priority first

  if (severity === "three_plus_year") {
    return {
      communicationType: "financial_suspension_review",
      completionPercentage,
      severity,
    };
  }

  if (severity === "two_year") {
    return {
      communicationType: "financial_intervention",
      completionPercentage,
      severity,
    };
  }

  if (summary.payment_status === "delinquent") {
    return {
      communicationType: "financial_delinquent",
      completionPercentage,
      severity,
    };
  }

  if (
    summary.payment_status === "paid" &&
    Number(summary.total_paid) > 0
  ) {
    return {
      communicationType: "financial_appreciation",
      completionPercentage,
      severity,
    };
  }

  if (completionPercentage >= 50) {
    return {
      communicationType: "financial_encouragement",
      completionPercentage,
      severity,
    };
  }

  if (completionPercentage >= 25) {
    return {
      communicationType: "financial_reminder",
      completionPercentage,
      severity,
    };
  }

  return {
    communicationType: "financial_strong_reminder",
    completionPercentage,
    severity,
  };
}

function renderTemplate(
  template: CommunicationTemplate,
  context: Record<string, string | number>
) {
  let html = template.html_body;
  let text = template.text_body;
  let subject = template.subject;

  for (const [key, value] of Object.entries(context)) {
    const token = `{{${key}}}`;

    html = html.replaceAll(token, String(value));
    text = text.replaceAll(token, String(value));
    subject = subject.replaceAll(token, String(value));
  }

  return {
    subject,
    html,
    text,
  };
}
/**
 * Excluded from financial communications:
 *
 * - Deceased members
 * - Dismissed members
 * - Transferred-out members
 *
 * These individuals are no longer within the
 * Commandery's active financial jurisdiction.
 */

 function calculateAge(
   dateOfBirth?: string | null
 ): number | null {

   if (!dateOfBirth) {
     return null;
   }

   const dob = new Date(dateOfBirth);
   const today = new Date();

   let age =
     today.getFullYear() -
     dob.getFullYear();

   const monthDifference =
     today.getMonth() -
     dob.getMonth();

   if (
     monthDifference < 0 ||
     (
       monthDifference === 0 &&
       today.getDate() < dob.getDate()
     )
   ) {
     age--;
   }

   return age;
 }

function isEligibleForFinancialCommunication(
  member: Member
): boolean {

  if (!member.email) {
    return false;
  }

const age =
  calculateAge(member.date_of_birth);

if (
  age !== null &&
  age >= 80
) {
  return false;
}

  if (member.is_deceased === true) {
    return false;
  }

  if (member.date_of_death) {
    return false;
  }

  if (member.date_of_dismissal) {
    return false;
  }

  if (
    member.status?.toLowerCase() === "dismissed"
  ) {
    return false;
  }

  if (member.transfer_to) {
    return false;
  }

  if (
    member.status?.toLowerCase() === "transferred"
  ) {
    return false;
  }

  return true;
}

async function loadFinancialSummaries(
  supabase: ReturnType<typeof createClient>
): Promise<FinancialSummary[]> {

  /**
   * Load all financial summaries.
   *
   * We intentionally do NOT filter on
   * outstanding_balance > 0 because:
   *
   * - Fully-paid members may receive
   *   appreciation communications.
   *
   * - Members with zero balances are
   *   filtered later by the
   *   classification engine.
   *
   * - Financial engagement decisions
   *   belong in the classification layer,
   *   not in the data-loading layer.
   */

  const { data, error } = await supabase
    .from("member_financial_summary")
    .select("*");

  if (error) {
    throw new Error(
      `Failed to load member financial summaries: ${error.message}`
    );
  }

  return (data || []) as FinancialSummary[];
}

async function loadMembers(
  supabase: ReturnType<typeof createClient>
): Promise<Map<string, Member>> {
const { data, error } = await supabase
  .from("members")
  .select(`
  id,
  title,
  first_name,
  surname,
  email,
  phone,
  membership_type,
  status,
  is_deceased,
  date_of_birth,
  date_of_death,
  date_of_dismissal,
  transfer_to
`);

  if (error) {
    throw new Error(`Failed to load members: ${error.message}`);
  }

  const map = new Map<string, Member>();

  for (const member of data || []) {
    map.set(member.id, member as Member);
  }

  return map;
}

async function loadProfiles(
  supabase: ReturnType<typeof createClient>
): Promise<Map<string, Profile>> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      member_id,
      notification_channel,
      phone
    `);

  if (error) {
    throw new Error(`Failed to load profiles: ${error.message}`);
  }

  const map = new Map<string, Profile>();

  for (const profile of data || []) {
    map.set(profile.member_id, profile as Profile);
  }

  return map;
}

async function loadTemplates(
  supabase: ReturnType<typeof createClient>
): Promise<Map<string, CommunicationTemplate>> {
  const { data, error } = await supabase
    .from("communication_templates")
    .select(`
      id,
      event_type,
      subject,
      html_body,
      text_body
    `);

  if (error) {
    throw new Error(`Failed to load templates: ${error.message}`);
  }

  const map = new Map<string, CommunicationTemplate>();

  for (const template of data || []) {
    map.set(
      template.event_type,
      template as CommunicationTemplate
    );
  }

  return map;
}

async function determineArrearsSeverity(
  supabase: ReturnType<typeof createClient>,
  memberId: string
): Promise<ArrearsSeverity> {
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from("financial_assessments")
    .select("year")
    .eq("member_id", memberId)
    .order("year", { ascending: true });

  if (error || !data?.length) {
    return "current";
  }

  const oldestYear = Number(data[0].year);
  const yearsBehind = currentYear - oldestYear;

  if (yearsBehind >= 3) {
    return "three_plus_year";
  }

  if (yearsBehind >= 2) {
    return "two_year";
  }

  if (yearsBehind >= 1) {
    return "one_year";
  }

  return "current";
}

interface MemberWorkItem {
  summary: FinancialSummary;
  member: Member;
  profile?: Profile;
  classification: MemberClassification;
  template: CommunicationTemplate;
}

async function buildWorkQueue(
  supabase: ReturnType<typeof createClient>
): Promise<MemberWorkItem[]> {
  const summaries = await loadFinancialSummaries(supabase);
  const members = await loadMembers(supabase);
  const profiles = await loadProfiles(supabase);
  const templates = await loadTemplates(supabase);

  const queue: MemberWorkItem[] = [];

  for (const summary of summaries) {
    const member = members.get(summary.id);

    if (!member) {
      continue;
    }

    if (!isEligibleForFinancialCommunication(member)) {
      continue;
    }

    const severity = await determineArrearsSeverity(
      supabase,
      summary.id
    );

    const classification = classifyFinancialStatus(
      summary,
      severity
    );

    if (!classification) {
      continue;
    }

    const template = templates.get(
      classification.communicationType
    );

    if (!template) {
      console.warn(
        `[payment-reminders] Missing template: ${classification.communicationType}`
      );
      continue;
    }

    queue.push({
      summary,
      member,
      profile: profiles.get(member.id),
      classification,
      template,
    });
  }

  return queue;
}
interface CommunicationRequest {
  id: string;
}

async function createCommunicationRequest(
  supabase: ReturnType<typeof createClient>,
  memberId: string,
  communicationType: CommunicationType,
  context: Record<string, unknown>
): Promise<CommunicationRequest> {
  const { data, error } = await supabase
    .from("communication_requests")
    .insert({
      event_type: communicationType,
      member_id: memberId,
      priority:
        communicationType === "financial_suspension_review"
          ? "high"
          : communicationType === "financial_intervention"
          ? "high"
          : "normal",
      context,
      status: "pending",
      channel: "email",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(
      `Failed to create communication request: ${error.message}`
    );
  }

  return data as CommunicationRequest;
}

async function callSendEmail(
  requestId: string,
  member: Member,
  rendered: {
    subject: string;
    html: string;
    text: string;
  }
) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/send-email`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: member.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        from_name: DEFAULT_FROM_NAME,
        request_id: requestId,
      }),
    }
  );

const payload = await response.json();

if (!response.ok) {
  console.error(
    "[payment-reminders] send-email response:",
    payload
  );

  throw new Error(
    JSON.stringify(payload)
  );
}

  return payload;
}

async function updateCommunicationRequestSuccess(
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  providerId: string
) {
  const { error } = await supabase
    .from("communication_requests")
    .update({
      status: "completed",
      provider_id: providerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    console.error(
      "[payment-reminders] Failed to update communication request:",
      error
    );
  }
}

async function updateCommunicationRequestFailure(
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  errorMessage: string
) {
  const { error } = await supabase
    .from("communication_requests")
    .update({
      status: "failed",
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) {
    console.error(
      "[payment-reminders] Failed to record communication failure:",
      error
    );
  }
}

async function createMemberCommunication(
  supabase: ReturnType<typeof createClient>,
  memberId: string,
  communicationType: CommunicationType,
  subject: string,
  html: string,
  providerMessageId: string,
  templateId: string
) {
  const preview =
    html
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 250);

  const { error } = await supabase
    .from("member_communications")
    .insert({
      member_id: memberId,
      type: communicationType,
      subject,
      content_preview: preview,
      status: "sent",
      provider_message_id: providerMessageId,
      template_id: templateId,
    });

  if (error) {
    console.error(
      "[payment-reminders] Failed to create member communication:",
      error
    );
  }
}

async function createReminderLog(
  supabase: ReturnType<typeof createClient>,
  memberId: string,
  email: string,
  communicationType: CommunicationType
) {
  const { error } = await supabase
    .from("reminder_log")
    .insert({
      member_id: memberId,
      recipient: email,
      channel: "email",
      template_type: communicationType,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

  if (error) {
    console.error(
      "[payment-reminders] Failed to create reminder log:",
      error
    );
  }
}

async function processCommunication(
  supabase: ReturnType<typeof createClient>,
  workItem: MemberWorkItem
) {
  const context = {
    member_name: `${
  workItem.member.title
    ? `${workItem.member.title} `
    : ""
}${workItem.member.first_name} ${workItem.member.surname}`,
    total_assessed: Number(
      workItem.summary.total_assessed || 0
    ).toFixed(2),
    total_paid: Number(
      workItem.summary.total_paid || 0
    ).toFixed(2),
    outstanding_balance: Number(
      workItem.summary.outstanding_balance || 0
    ).toFixed(2),
    completion_percentage:
      workItem.classification.completionPercentage,
  };

  const request = await createCommunicationRequest(
    supabase,
    workItem.member.id,
    workItem.classification.communicationType,
    context
  );

  try {
    const rendered = renderTemplate(
      workItem.template,
      context
    );

    const sendResult = await callSendEmail(
      request.id,
      workItem.member,
      rendered
    );

    await updateCommunicationRequestSuccess(
      supabase,
      request.id,
      sendResult.messageId
    );

    await createMemberCommunication(
      supabase,
      workItem.member.id,
      workItem.classification.communicationType,
      rendered.subject,
      rendered.html,
      sendResult.messageId,
      workItem.template.id
    );

    await createReminderLog(
      supabase,
      workItem.member.id,
      workItem.member.email || "",
      workItem.classification.communicationType
    );

    return true;
  } catch (error) {
    await updateCommunicationRequestFailure(
      supabase,
      request.id,
      (error as Error).message
    );

    return false;
  }
}
async function createRegistrarCase(
  supabase: ReturnType<typeof createClient>,
  memberId: string,
  eventType: "financial_intervention" | "suspension_review"
) {
  const { data: existingCase } = await supabase
    .from("registrar_queues")
    .select("id")
    .eq("member_id", memberId)
    .eq("event_type", eventType)
    .in("status", ["pending", "assigned"])
    .maybeSingle();

  if (existingCase) {
    return;
  }

  const { error } = await supabase
    .from("registrar_queues")
    .insert({
      member_id: memberId,
      event_type: eventType,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error(
      `[payment-reminders] Failed to create registrar case (${eventType}):`,
      error
    );
  }
}

async function handleEscalation(
  supabase: ReturnType<typeof createClient>,
  workItem: MemberWorkItem
) {
  switch (workItem.classification.communicationType) {
    case "financial_suspension_review":
      await createRegistrarCase(
        supabase,
        workItem.member.id,
        "suspension_review"
      );
      break;

    case "financial_intervention":
      await createRegistrarCase(
        supabase,
        workItem.member.id,
        "financial_intervention"
      );
      break;
  }
}

serve(async (_req) => {
  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY
  );

  try {
    const workQueue = await buildWorkQueue(supabase);

    let processed = 0;
    let successful = 0;
    let failed = 0;
    let interventions = 0;
    let suspensionReviews = 0;

    for (const workItem of workQueue) {
      processed++;

      await handleEscalation(
        supabase,
        workItem
      );

      if (
        workItem.classification.communicationType ===
        "financial_intervention"
      ) {
        interventions++;
      }

      if (
        workItem.classification.communicationType ===
        "financial_suspension_review"
      ) {
        suspensionReviews++;
      }

      const result = await processCommunication(
        supabase,
        workItem
      );

      if (result) {
        successful++;
      } else {
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        successful,
        failed,
        interventions,
        suspensionReviews,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "[payment-reminders] Execution failed:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});