'use server';
import { createClient } from '@/lib/supabase/server';
import { logFinancialChange, type AuditAction, type EntityType } from './auditService';
import { fetchAllPaginated } from '@/lib/supabase/pagination';

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

  // 2. Get all active members with birth year (paginated across 1000-row cap)
  const members = await fetchAllPaginated((from, to) =>
    supabase
      .from('members')
      .select('id, first_name, surname, date_of_birth, membership_type, status')
      .not('status', 'in', '("Dismissed","Transfer-Out","Deceased")')
      .range(from, to)
  );

  // 3. Get prior year payments & assessments to calculate arrears rollover (paginated)
  const priorYear = year - 1;
  const priorAssessments = await fetchAllPaginated((from, to) =>
    supabase
      .from('financial_assessments')
      .select('member_id, arrears_brought_forward, annual_assessment')
      .eq('year', priorYear)
      .range(from, to)
  );

  const priorPayments = await fetchAllPaginated((from, to) =>
    supabase
      .from('financial_payments')
      .select('member_id, amount')
      .eq('assessment_year', priorYear)
      .range(from, to)
  );

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

  const [assessmentsRes, activeMembersRes] = await Promise.all([
    fetchAllPaginated((from, to) =>
      supabase
        .from('financial_assessments')
        .select('*, members(id, first_name, surname, title, membership_type, date_of_birth, status, is_deceased)')
        .eq('year', year)
        .order('created_at', { ascending: true })
        .range(from, to)
    ),
    fetchAllPaginated((from, to) =>
      supabase
        .from('members')
        .select('id, first_name, surname, title, membership_type, date_of_birth, status, is_deceased')
        .not('status', 'in', '("Dismissed","Transfer-Out","Deceased")')
        .range(from, to)
    )
  ]);

  const existingMemberIds = new Set((assessmentsRes || []).map((a: any) => a.member_id));
  const missingMembers = (activeMembersRes || []).filter((m: any) => !m.is_deceased && !existingMemberIds.has(m.id));

  const syntheticRows = missingMembers.map((m: any) => ({
    id: `unbilled-${m.id}`,
    member_id: m.id,
    year,
    arrears_brought_forward: 0,
    annual_assessment: 0,
    members: m,
    is_unbilled: true,
  }));

  return [...(assessmentsRes || []), ...syntheticRows];
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
  return fetchAllPaginated((from, to) =>
    supabase
      .from('financial_payments')
      .select('*, members(first_name, surname, title)')
      .eq('assessment_year', year)
      .order('payment_date', { ascending: false })
      .range(from, to)
  );
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
  const list = await fetchAllPaginated((from, to) =>
    supabase
      .from('members')
      .select('id, first_name, surname, title, membership_type')
      .not('status', 'in', '("Dismissed","Transfer-Out","Deceased")')
      .order('surname')
      .order('first_name')
      .range(from, to)
  );

  return (list || []).filter((m: any) => {
    const full = `${m.title || ''} ${m.first_name || ''} ${m.surname || ''}`.toLowerCase();
    return !full.includes('system account') && !full.includes('operational outflows') && !full.includes('welfare account') && !full.includes('fictitious');
  });
}

// ─── Member Financial Summaries ─────────────────────────────────────────────

export async function getAllMemberSummaries(filters?: {
  status?: string;
  search?: string;
}) {
  const supabase = await createClient();

  // Paginated query for all financial_payments to compute actual non-voluntary dues paid per member
  const allPaymentsRows = await fetchAllPaginated((from, to) =>
    supabase
      .from('financial_payments')
      .select('member_id, amount, month')
      .range(from, to)
  );

  const isVoluntaryPayment = (p: any) => {
    const m = String(p.month || '').toLowerCase();
    const type = String(p.payment_type || p.payment_category || '').toLowerCase();
    return m.includes('voluntary') || m.includes('appeal') || m.includes('relief') || m.includes('donation') ||
           type.includes('voluntary') || type.includes('appeal') || type.includes('relief') || type.includes('donation');
  };

  const duesPaidByMember: Record<string, number> = {};
  for (const p of allPaymentsRows || []) {
    if (!isVoluntaryPayment(p)) {
      const mid = p.member_id;
      duesPaidByMember[mid] = (duesPaidByMember[mid] || 0) + parseFloat(p.amount || 0);
    }
  }

  // Paginated query for member_financial_summary
  const summaryRows = await fetchAllPaginated((from, to) => {
    let query = supabase.from('member_financial_summary').select('*');
    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    return query.range(from, to);
  });

  // Filter out fictitious operational system accounts from member financial summary views
  const actualSummaryRows = (summaryRows || []).filter((row: any) => {
    const name = (row.full_name || '').toLowerCase();
    return !name.includes('system account') && !name.includes('operational outflows') && !name.includes('welfare account (operational') && !name.includes('commandery welfare account') && !name.includes('fictitious');
  });

  // Paginated query for financial_assessments
  const assessmentRows = await fetchAllPaginated((from, to) =>
    supabase
      .from('financial_assessments')
      .select('member_id, annual_assessment')
      .range(from, to)
  );

  // Sum annual_assessment (excluding arrears_brought_forward) per member
  const annualSumByMember: Record<string, number> = {};
  for (const a of assessmentRows || []) {
    const id = a.member_id;
    annualSumByMember[id] = (annualSumByMember[id] || 0) + parseFloat(a.annual_assessment || 0);
  }

  // Fetch date_of_birth for members to evaluate Senior 80+ Exemption
  const memberDobRows = await fetchAllPaginated((from, to) =>
    supabase
      .from('members')
      .select('id, date_of_birth')
      .range(from, to)
  );

  const dobMap: Record<string, string | null> = {};
  for (const m of memberDobRows || []) {
    dobMap[m.id] = m.date_of_birth;
  }

  const currentYear = new Date().getFullYear();

  // Calculate actual dues paid, net outstanding, and accurate status per member
  const resultRows = actualSummaryRows.map((row: any) => {
    const memberId = row.member_id ?? row.id;
    const totalAssessed = parseFloat(row.total_assessed || 0);
    const actualDuesPaid = duesPaidByMember[memberId] ?? 0;
    const netOutstanding = totalAssessed - actualDuesPaid;
    const isDeceased = row.is_deceased || row.status === 'Deceased';

    const dob = dobMap[memberId] || row.date_of_birth;
    const birthYear = dob ? new Date(dob).getFullYear() : null;
    const age = birthYear ? currentYear - birthYear : 0;
    const isSeniorExempt = age >= 80;

    let paymentStatus = 'delinquent';
    if (isDeceased) {
      paymentStatus = 'exempt_deceased';
    } else if (isSeniorExempt) {
      paymentStatus = 'exempt_senior';
    } else if (totalAssessed <= 0) {
      paymentStatus = 'unassessed_new';
    } else if (netOutstanding <= 0) {
      paymentStatus = 'fully_paid';
    } else if (actualDuesPaid > 0) {
      paymentStatus = 'partially_paid';
    } else {
      paymentStatus = 'delinquent';
    }

    return {
      ...row,
      date_of_birth: dob,
      age,
      is_senior_exempt: isSeniorExempt,
      total_paid: actualDuesPaid,
      outstanding_balance: netOutstanding,
      payment_status: paymentStatus,
      annual_assessment_sum: annualSumByMember[memberId] ?? 0,
    };
  });

  // Apply optional status filter
  let finalRows = resultRows;
  if (filters?.status) {
    finalRows = finalRows.filter((r: any) => r.payment_status === filters.status);
  }

  // Sort by net outstanding balance DESC
  return finalRows.sort((a: any, b: any) => b.outstanding_balance - a.outstanding_balance);
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

  const isVoluntaryPayment = (p: any) => {
    const m = String(p.month || '').toLowerCase();
    const type = String(p.payment_type || p.payment_category || '').toLowerCase();
    return m.includes('voluntary') || m.includes('appeal') || m.includes('relief') || m.includes('donation') ||
           type.includes('voluntary') || type.includes('appeal') || type.includes('relief') || type.includes('donation');
  };

  const totalAssessed = (assessments || []).reduce(
    (sum, a) => sum + parseFloat(a.annual_assessment as any || 0) + parseFloat(a.arrears_brought_forward as any || 0),
    0
  );

  const duesPayments = (payments || []).filter(p => !isVoluntaryPayment(p));
  const voluntaryPayments = (payments || []).filter(p => isVoluntaryPayment(p));

  const totalPaid = duesPayments.reduce((sum, p) => sum + parseFloat(p.amount as any || 0), 0);
  const totalVoluntaryPaid = voluntaryPayments.reduce((sum, p) => sum + parseFloat(p.amount as any || 0), 0);

  return {
    assessments: assessments || [],
    payments: duesPayments,
    voluntaryPayments: voluntaryPayments,
    totalAssessed,
    totalPaid,
    totalVoluntaryPaid,
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
