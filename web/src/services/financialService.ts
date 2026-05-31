'use server';
import { createClient } from '@/lib/supabase/server';
import { logFinancialChange, type AuditAction, type EntityType } from './auditService';

function getPaymentFields(payment: any) {
  return { amount: payment.amount, month: payment.month, assessment_year: payment.assessment_year };
}

function getFieldDiff<T>(key: keyof T, a: T, b: T): { hasChange: boolean; oldVal: any; newVal: any } {
  const av = a[key];
  const bv = b[key];
  return { hasChange: av !== bv, oldVal: av, newVal: bv };
}

function getRateFields(rate: any) {
  return { regular_rate: rate.regular_rate, social_rate: rate.social_rate, student_rate: rate.student_rate };
}

function getAssessmentFields(assessment: any) {
  return { annual_assessment: assessment.annual_assessment, arrears_brought_forward: assessment.arrears_brought_forward };
}

// ─── Rate Management ───────────────────────────────────────────────────────

export async function getAnnualRates(year: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('annual_assessment_rates')
    .select('*')
    .eq('year', year)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveAnnualRates(rates: {
  year: number;
  regular_rate: number;
  social_rate: number;
  student_rate: number;
}) {
  const supabase = await createClient();

  // Get existing rates for diff comparison (audit log)
  const { data: existing } = await supabase
    .from('annual_assessment_rates')
    .select('*')
    .eq('year', rates.year)
    .maybeSingle();

  const result = await supabase
    .from('annual_assessment_rates')
    .upsert(rates, { onConflict: 'year' })
    .select()
    .single();
  if (result.error) throw result.error;

  // Log rate changes for audit trail
  if (existing) {
    const oldFields = getRateFields(existing);
    const newFields = getRateFields(rates);
    const hasAnyChange = Object.keys(oldFields).some(k => (oldFields as any)[k] !== (newFields as any)[k]);

    if (hasAnyChange) {
      await logFinancialChange({
        action: 'rate_change',
        entityType: 'rate',
        entityId: existing.id,
        oldValues: oldFields,
        newValues: newFields,
      });
    }
  }

  return result.data;
}

// ─── Age Discount Logic ────────────────────────────────────────────────────

function calcAgeDiscount(birthYear: number | null, assessmentYear: number): number {
  if (!birthYear) return 0;
  const age = assessmentYear - birthYear;
  if (age > 80) return 1.0;    // 100% discount
  if (age > 75) return 0.5;    // 50% discount
  if (age > 70) return 0.25;   // 25% discount
  return 0;
}

function calcBaseRate(
  membershipType: string,
  rates: { regular_rate: number; social_rate: number; student_rate: number }
): number {
  if (membershipType === 'Social') return rates.social_rate;
  if (membershipType === 'Student') return rates.student_rate;
  return rates.regular_rate;
}

// ─── Assessment Generation ─────────────────────────────────────────────────

export async function generateAnnualAssessments(year: number) {
  const supabase = await createClient();

  // 1. Get rates for this year
  const { data: rates, error: ratesErr } = await supabase
    .from('annual_assessment_rates')
    .select('*')
    .eq('year', year)
    .single();
  if (ratesErr || !rates) throw new Error('Please set annual rates for ' + year + ' before generating bills.');

  // 2. Get all active members with birth year
  const { data: members, error: membErr } = await supabase
    .from('members')
    .select('id, first_name, surname, date_of_birth, membership_type, status')
    .not('status', 'in', '("Dismissed","Transfer-Out","Deceased")');
  if (membErr) throw membErr;

  // 3. Get prior year payments & assessments to calculate arrears rollover
  const priorYear = year - 1;
  const { data: priorAssessments } = await supabase
    .from('financial_assessments')
    .select('member_id, arrears_brought_forward, annual_assessment')
    .eq('year', priorYear);
  const { data: priorPayments } = await supabase
    .from('financial_payments')
    .select('member_id, amount')
    .eq('assessment_year', priorYear);

  // Build prior year balance map
  const priorMap: Record<string, number> = {};
  (priorAssessments || []).forEach((a: any) => {
    priorMap[a.member_id] = parseFloat(a.arrears_brought_forward) + parseFloat(a.annual_assessment);
  });
  (priorPayments || []).forEach((p: any) => {
    if (priorMap[p.member_id] !== undefined) {
      priorMap[p.member_id] -= parseFloat(p.amount);
    }
  });

  // 4. Build upsert payload
  const upsertRows = (members || []).map((m: any) => {
    const birthYear = m.date_of_birth ? new Date(m.date_of_birth).getFullYear() : null;
    const discount = calcAgeDiscount(birthYear, year);
    const baseRate = calcBaseRate(m.membership_type || 'Regular', rates);
    const annualAssessment = parseFloat((baseRate * (1 - discount)).toFixed(2));
    const arrearsBF = parseFloat((priorMap[m.id] ?? 0).toFixed(2));

    return {
      member_id: m.id,
      year,
      arrears_brought_forward: arrearsBF,
      annual_assessment: annualAssessment,
    };
  });

  const { error: upsertErr } = await supabase
    .from('financial_assessments')
    .upsert(upsertRows, { onConflict: 'member_id,year', ignoreDuplicates: false });
  if (upsertErr) throw upsertErr;

  return { count: upsertRows.length };
}

// ─── Assessment Viewing & Editing ──────────────────────────────────────────

export async function getAssessmentsForYear(year: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('financial_assessments')
    .select('*, members(id, first_name, surname, title, membership_type, date_of_birth)')
    .eq('year', year)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateIndividualAssessment(
  id: string,
  arrears: number,
  annual: number
) {
  const supabase = await createClient();

  // Get existing assessment for diff comparison (audit log)
  const { data: existing } = await supabase
    .from('financial_assessments')
    .select('*')
    .eq('id', id)
    .single();

  const result = await supabase
    .from('financial_assessments')
    .update({ arrears_brought_forward: arrears, annual_assessment: annual })
    .eq('id', id)
    .select()
    .single();
  if (result.error) throw result.error;

  // Log assessment edit for audit trail
  if (existing) {
    const oldFields = getAssessmentFields(existing);
    const newFields = getAssessmentFields({ arrears_brought_forward: arrears, annual_assessment: annual });
    const hasAnyChange = Object.keys(oldFields).some(k => (oldFields as any)[k] !== (newFields as any)[k]);

    if (hasAnyChange) {
      await logFinancialChange({
        action: 'assessment_edit',
        entityType: 'assessment',
        entityId: existing.id,
        memberId: existing.member_id || undefined,
        oldValues: oldFields,
        newValues: newFields,
      });
    }
  }

  return result.data;
}

// ─── Payment Recording ──────────────────────────────────────────────────────

export async function recordPayment(payment: {
  member_id: string;
  assessment_year: number;
  month: string;
  amount: number;
  recorded_by: string;
}) {
  const supabase = await createClient();
  const result = await supabase
    .from('financial_payments')
    .insert(payment)
    .select()
    .single();
  if (result.error) throw result.error;

  // Log new payment for audit trail
  await logFinancialChange({
    action: 'payment_amount_change',
    entityType: 'payment',
    entityId: result.data.id,
    memberId: payment.member_id,
    oldValues: {},
    newValues: getPaymentFields(result.data),
  });

  return result.data;
}

export async function getPaymentsForYear(year: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('financial_payments')
    .select('*, members(first_name, surname, title)')
    .eq('assessment_year', year)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deletePayment(id: string) {
  const supabase = await createClient();

  // Get payment before deletion for audit log
  const { data: existing } = await supabase
    .from('financial_payments')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('financial_payments').delete().eq('id', id);
  if (error) throw error;

  // Log deleted payment for audit trail
  if (existing) {
    await logFinancialChange({
      action: 'payment_delete',
      entityType: 'payment',
      entityId: existing.id,
      memberId: existing.member_id || undefined,
      oldValues: getPaymentFields(existing),
      newValues: {},
    });
  }
}

export async function getActiveMembers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('members')
    .select('id, first_name, surname, title, membership_type')
    .not('status', 'in', '("Dismissed","Transfer-Out","Deceased")')
    .order('surname')
    .order('first_name');
  if (error) throw error;
  return data || [];
}

// ─── Member Financial Summaries ─────────────────────────────────────────────

export async function getAllMemberSummaries(filters?: {
  status?: string;
  search?: string;
}) {
  const supabase = await createClient();
  let query = supabase.from('member_financial_summary').select('*');

  if (filters?.status) {
    query = query.eq('payment_status', filters.status);
  }

  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order('outstanding_balance', { ascending: false });
  if (error) throw error;

  // SQL view now filters by member status server-side. Return raw results.
  return data || [];
}

export async function getMemberDetailedSummary(memberId: string) {
  const supabase = await createClient();

  const { data: assessments, error: aErr } = await supabase
    .from('financial_assessments')
    .select('*')
    .eq('member_id', memberId)
    .order('year', { ascending: false });

  if (aErr) throw aErr;

  const { data: payments, error: pErr } = await supabase
    .from('financial_payments')
    .select('*')
    .eq('member_id', memberId)
    .order('payment_date', { ascending: true });

  if (pErr) throw pErr;

  const totalAssessed = (assessments || []).reduce(
    (sum, a) => sum + parseFloat(a.annual_assessment as any || 0) + parseFloat(a.arrears_brought_forward as any || 0),
    0
  );

  const totalPaid = (payments || []).reduce((sum, p) => sum + parseFloat(p.amount as any || 0), 0);

  return {
    assessments: assessments || [],
    payments: payments || [],
    totalAssessed,
    totalPaid,
    outstandingBalance: totalAssessed - totalPaid
  };
}

// ─── C1b: Notification Reminder Configuration ──────────────────────────────

export async function getReminderConfig() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('reminder_config')
    .select('*');
  if (!data) return {};

  const config: Record<string, any> = {};
  for (const item of data) {
    config[item.config_key] = item.config_value?.value ?? item.config_value;
  }
  return config;
}

export async function saveReminderConfig(updates: Record<string, any>) {
  const supabase = await createClient();

  // Upsert each key-value pair
  for (const [key, value] of Object.entries(updates)) {
    const payload = {
      config_key: key,
      config_value: JSON.stringify(value),
    };

    await supabase.from('reminder_config').upsert(payload, { onConflict: 'config_key' });
  }
}

export async function getReminderHistory(params?: {
  member_id?: string;
  channel?: string;
  status?: string;
  limit?: number;
}) {
  const supabase = await createClient();

  let query = supabase
    .from('reminder_log')
    .select(`
      *,
      members!inner (first_name, surname)
    `);

  if (params?.member_id) query = query.eq('member_id', params.member_id);
  if (params?.channel) query = query.eq('channel', params.channel);
  if (params?.status) query = query.eq('status', params.status);

  const { data } = await query
    .order('sent_at', { ascending: false })
    .limit(params?.limit || 100);

  return data || [];
}
