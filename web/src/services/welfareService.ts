'use server';

export function isEligibleWelfareMember(m: {
  first_name?: string | null;
  surname?: string | null;
  status?: string | null;
  is_deceased?: boolean | null;
}): boolean {
  if (m.is_deceased) return false;
  const s = String(m.status || '').trim().toLowerCase();
  if (['deceased', 'dismissed', 'transfer-out', 'system'].includes(s)) return false;
  const fullName = `${m.first_name || ''} ${m.surname || ''}`.toLowerCase();
  if (fullName.includes('system account') || 
      fullName.includes('operational outflow') || 
      fullName.includes('commandery welfare') ||
      fullName.includes('system')) {
    return false;
  }
  return true;
}



import { createClient } from '@/lib/supabase/server';
import { calculateExpectedWelfare } from '@/lib/utils/ksji-logic';
import { fetchAllPaginated } from '@/lib/supabase/pagination';
import { 
  WelfareCategory, 
  WelfareContribution, 
  WelfareDisbursement, 
  WelfareAuditEntry, 
  WelfareSummary,
  WelfareContributionRate,
  WelfareArrearsReport,
  WelfareYearlyArrearsItem,
  WelfareMemberArrearsItem
} from '@/types/welfare';


// Helper to log welfare audit trail entries
async function logWelfareAudit(params: {
  action: WelfareAuditEntry['action'];
  entityType: WelfareAuditEntry['entity_type'];
  entityId: string;
  memberId?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('welfare_audit_log').insert({
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      member_id: params.memberId || null,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      changed_by: user?.id || null,
      changed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to insert welfare audit log:', err);
  }
}

export async function getAllWelfareContributions() {
  const supabase = await createClient();
  return fetchAllPaginated((from, to) =>
    supabase
      .from('welfare_contributions')
      .select('member_id, amount, period_year, period_month, payment_date')
      .range(from, to)
  );
}

// 1. Get Welfare Fund Summary Metrics
export async function getWelfareSummary(): Promise<WelfareSummary> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  // Contributions total (paginated fetch across PostgREST 1000 row cap)
  const contributions = await getAllWelfareContributions();

  // Disbursements total (paginated fetch across PostgREST 1000 row cap)
  const disbursements = await fetchAllPaginated((from, to) =>
    supabase
      .from('welfare_disbursements')
      .select('amount, disbursement_date, category_name')
      .range(from, to)
  );

  // Categories count
  const { count: categoriesCount } = await supabase
    .from('welfare_categories')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  // Active living members count (excluding Dismissed, Transfer-Out, Deceased - paginated)
  const allMembers = await fetchAllPaginated((from, to) =>
    supabase
      .from('members')
      .select('id, first_name, surname, date_of_birth, date_joined, status, is_deceased')
      .range(from, to)
  );

  const eligibleMembers = (allMembers || []).filter(isEligibleWelfareMember);
  const eligibleMemberIds = new Set(eligibleMembers.map(m => m.id));

  let totalContributions = 0;
  let contributionsThisYear = 0;
  const memberContribMap = new Map<string, number>();

  (contributions || []).forEach(c => {
    const amt = Number(c.amount) || 0;
    totalContributions += amt;
    if (c.period_year === currentYear) {
      contributionsThisYear += amt;
    }
    if (c.member_id && eligibleMemberIds.has(c.member_id)) {
      const prev = memberContribMap.get(c.member_id) || 0;
      memberContribMap.set(c.member_id, prev + amt);
    }
  });

  let totalDisbursements = 0;
  let disbursementsThisYear = 0;
  let totalWelfareBenefits = 0;
  let totalWelfareExpenses = 0;
  let benefitsThisYear = 0;
  let expensesThisYear = 0;

  (disbursements || []).forEach(d => {
    const amt = Number(d.amount) || 0;
    totalDisbursements += amt;
    const year = new Date(d.disbursement_date).getFullYear();
    if (year === currentYear) {
      disbursementsThisYear += amt;
    }

    const catName = (d.category_name || '').toLowerCase();
    const isExpense = catName.includes('operational') ||
      catName.includes('logistics') ||
      catName.includes('printing') ||
      catName.includes('stationery') ||
      catName.includes('bank') ||
      catName.includes('fee') ||
      catName.includes('charge');

    if (isExpense) {
      totalWelfareExpenses += amt;
      if (year === currentYear) expensesThisYear += amt;
    } else {
      totalWelfareBenefits += amt;
      if (year === currentYear) benefitsThisYear += amt;
    }
  });

  // Calculate cumulative arrears for active vs inactive standing using member-specific join dates, earliest ledger appearances & rates
  const currentMonth = new Date().getMonth() + 1;
  const { data: ratesData } = await supabase
    .from('welfare_contribution_rates')
    .select('year, monthly_rate');
  const ratesMap = new Map<number, number>(
    (ratesData || []).map((r: any) => [r.year, Number(r.monthly_rate)])
  );

  // Determine earliest contribution per member
  const earliestContribMap = new Map<string, { year: number; month: number; payment_date: string | null }>();
  (contributions || []).forEach(c => {
    if (!c.member_id) return;
    const pYear = c.period_year || (c.payment_date ? new Date(c.payment_date).getFullYear() : null);
    const pMonth = c.period_month || (c.payment_date ? new Date(c.payment_date).getMonth() + 1 : 1);
    if (pYear) {
      const existing = earliestContribMap.get(c.member_id);
      if (!existing || pYear < existing.year || (pYear === existing.year && pMonth < existing.month)) {
        earliestContribMap.set(c.member_id, { year: pYear, month: pMonth, payment_date: c.payment_date });
      }
    }
  });

  let activeSubscribers = 0;
  let totalCumulativeArrears = 0;
  let currentYearArrears = 0;
  let pastYearsArrears = 0;
  let membersInArrearsCount = 0;

  // Track member contributions specifically in current year
  const currentYearContribMap = new Map<string, number>();
  (contributions || []).forEach(c => {
    if (!c.member_id) return;
    const pYear = c.period_year || (c.payment_date ? new Date(c.payment_date).getFullYear() : null);
    if (pYear === currentYear) {
      currentYearContribMap.set(c.member_id, (currentYearContribMap.get(c.member_id) || 0) + Number(c.amount));
    }
  });

  eligibleMembers.forEach(m => {
    const totalPaid = memberContribMap.get(m.id) || 0;
    const currentPaid = currentYearContribMap.get(m.id) || 0;
    const earliestContrib = earliestContribMap.get(m.id) || null;
    const { expectedCumulative, expectedCurrentYear, isSeniorExempt } = calculateExpectedWelfare({
      member: m,
      earliestContribution: earliestContrib,
      ratesMap,
      defaultMonthlyRate: 25.00,
      baseStartYear: 2022,
      currentYear,
      currentMonth,
    });

    const arrears = isSeniorExempt ? 0 : Math.max(0, expectedCumulative - totalPaid);
    const curArrears = isSeniorExempt ? 0 : Math.max(0, expectedCurrentYear - currentPaid);
    const pastExpected = Math.max(0, expectedCumulative - expectedCurrentYear);
    const pastPaid = Math.max(0, totalPaid - currentPaid);
    const pastArr = isSeniorExempt ? 0 : Math.max(0, pastExpected - pastPaid);

    if (isSeniorExempt || arrears <= 75.00) {
      activeSubscribers++;
    }

    if (!isSeniorExempt && arrears > 0) {
      totalCumulativeArrears += arrears;
      currentYearArrears += curArrears;
      pastYearsArrears += pastArr;
      membersInArrearsCount++;
    }
  });

  const totalMembers = eligibleMemberIds.size;
  const inactiveSubscribers = Math.max(0, totalMembers - activeSubscribers);

  return {
    totalContributions,
    totalDisbursements,
    totalWelfareBenefits,
    totalWelfareExpenses,
    netFundBalance: totalContributions - totalDisbursements,
    contributionsThisYear,
    disbursementsThisYear,
    benefitsThisYear,
    expensesThisYear,
    contributingMembersCount: activeSubscribers,
    inactiveMembersCount: inactiveSubscribers,
    totalMembersCount: totalMembers,
    activeCategoriesCount: categoriesCount || 0,
    totalCumulativeArrears,
    currentYearArrears,
    pastYearsArrears,
    membersInArrearsCount,
  };
}


// 2. Welfare Categories CRUD
export async function getWelfareCategories(): Promise<WelfareCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('welfare_categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function createWelfareCategory(payload: {
  name: string;
  description?: string;
  default_amount: number;
}): Promise<WelfareCategory> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('welfare_categories')
    .insert({
      name: payload.name,
      description: payload.description || null,
      default_amount: payload.default_amount,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;

  await logWelfareAudit({
    action: 'category_change',
    entityType: 'welfare_category',
    entityId: data.id,
    newValues: data,
  });

  return data;
}

// 3. Welfare Contributions CRUD
export async function getWelfareContributions(filters?: {
  memberId?: string;
  year?: number;
  limit?: number;
}): Promise<WelfareContribution[]> {
  const supabase = await createClient();
  let query = supabase
    .from('welfare_contributions')
    .select('*, members:member_id (first_name, surname, title), profiles:recorded_by (email)')
    .order('payment_date', { ascending: false });

  if (filters?.memberId) {
    query = query.eq('member_id', filters.memberId);
  }
  if (filters?.year) {
    query = query.eq('period_year', filters.year);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function recordWelfareContribution(payload: {
  member_id: string;
  amount: number;
  payment_date: string;
  period_year: number;
  period_month?: number;
  payment_method: 'cash' | 'mobile_money' | 'bank_transfer' | 'cheque';
  reference_no?: string;
  notes?: string;
}): Promise<WelfareContribution> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('welfare_contributions')
    .insert({
      member_id: payload.member_id,
      amount: payload.amount,
      payment_date: payload.payment_date,
      period_year: payload.period_year,
      period_month: payload.period_month || null,
      payment_method: payload.payment_method,
      reference_no: payload.reference_no || null,
      notes: payload.notes || null,
      recorded_by: user?.id || null,
    })
    .select('*, members:member_id(first_name, surname)')
    .single();

  if (error) throw error;

  await logWelfareAudit({
    action: 'contribution_add',
    entityType: 'welfare_contribution',
    entityId: data.id,
    memberId: payload.member_id,
    newValues: data,
  });

  return data;
}

export async function deleteWelfareContribution(id: string): Promise<void> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('welfare_contributions')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('welfare_contributions')
    .delete()
    .eq('id', id);

  if (error) throw error;

  if (existing) {
    await logWelfareAudit({
      action: 'contribution_delete',
      entityType: 'welfare_contribution',
      entityId: id,
      memberId: existing.member_id,
      oldValues: existing,
    });
  }
}

// 4. Welfare Disbursements CRUD
export async function getWelfareDisbursements(filters?: {
  memberId?: string;
  limit?: number;
}): Promise<WelfareDisbursement[]> {
  const supabase = await createClient();
  let query = supabase
    .from('welfare_disbursements')
    .select('*, members:member_id (first_name, surname, title), profiles:disbursed_by (email)')
    .order('disbursement_date', { ascending: false });

  if (filters?.memberId) {
    query = query.eq('member_id', filters.memberId);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function recordWelfareDisbursement(payload: {
  member_id: string;
  category_id?: string;
  category_name: string;
  amount: number;
  disbursement_date: string;
  payment_method: 'mobile_money' | 'bank_transfer' | 'cash' | 'cheque';
  reference_no?: string;
  notes?: string;
}): Promise<WelfareDisbursement> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('welfare_disbursements')
    .insert({
      member_id: payload.member_id,
      category_id: payload.category_id || null,
      category_name: payload.category_name,
      amount: payload.amount,
      disbursement_date: payload.disbursement_date,
      payment_method: payload.payment_method,
      reference_no: payload.reference_no || null,
      notes: payload.notes || null,
      disbursed_by: user?.id || null,
    })
    .select('*, members:member_id(first_name, surname)')
    .single();

  if (error) throw error;

  await logWelfareAudit({
    action: 'disbursement_add',
    entityType: 'welfare_disbursement',
    entityId: data.id,
    memberId: payload.member_id,
    newValues: data,
  });

  return data;
}

export async function deleteWelfareDisbursement(id: string): Promise<void> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('welfare_disbursements')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('welfare_disbursements')
    .delete()
    .eq('id', id);

  if (error) throw error;

  if (existing) {
    await logWelfareAudit({
      action: 'disbursement_delete',
      entityType: 'welfare_disbursement',
      entityId: id,
      memberId: existing.member_id,
      oldValues: existing,
    });
  }
}

// 5. Welfare Audit Log Querying
export async function getWelfareAuditLog(filters?: {
  action?: string;
  memberId?: string;
  limit?: number;
}): Promise<WelfareAuditEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from('welfare_audit_log')
    .select('*, members:member_id (first_name, surname), profiles:changed_by (email)')
    .order('changed_at', { ascending: false });

  if (filters?.action) {
    query = query.eq('action', filters.action);
  }
  if (filters?.memberId) {
    query = query.eq('member_id', filters.memberId);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// 6. Welfare Contribution Rate Settings (monthly rate per year)
export async function getWelfareContributionRate(year: number): Promise<WelfareContributionRate | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('welfare_contribution_rates')
    .select('*')
    .eq('year', year)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAllWelfareContributionRates(): Promise<WelfareContributionRate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('welfare_contribution_rates')
    .select('*')
    .order('year', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertWelfareContributionRate(payload: {
  year: number;
  monthly_rate: number;
  notes?: string;
}): Promise<WelfareContributionRate> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated.');

  // ── Server-side role guard ──────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (!profile || !['super_admin', 'welfare_treasurer'].includes(profile.role)) {
    throw new Error('Access denied. Only a Super Administrator or Welfare Treasurer may set welfare contribution rates.');
  }

  // ── Read existing rate so we can record old values in the audit trail ─
  const { data: existing } = await supabase
    .from('welfare_contribution_rates')
    .select('*')
    .eq('year', payload.year)
    .maybeSingle();

  // ── Upsert ──────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from('welfare_contribution_rates')
    .upsert({
      year: payload.year,
      monthly_rate: payload.monthly_rate,
      notes: payload.notes || null,
      set_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'year' })
    .select()
    .single();

  if (error) throw error;

  // ── Audit trail ─────────────────────────────────────────────────
  await logWelfareAudit({
    action: 'rate_change',
    entityType: 'welfare_rate',
    entityId: String(payload.year),
    oldValues: existing
      ? {
          year: existing.year,
          monthly_rate: existing.monthly_rate,
          annual_equivalent: existing.monthly_rate * 12,
          notes: existing.notes,
        }
      : null,
    newValues: {
      year: payload.year,
      monthly_rate: payload.monthly_rate,
      annual_equivalent: payload.monthly_rate * 12,
      notes: payload.notes || null,
      set_by_email: profile.email,
      set_by_role: profile.role,
      action: existing ? 'amended' : 'created',
    },
  });

  return data;
}


export async function reclassifyWelfareToDues(
  welfareContributionId: string,
  payload: {
    assessmentYear: number;
    month?: string;
    reason?: string;
  }
): Promise<{ success: boolean; error?: string; paymentId?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch the existing welfare contribution
    const { data: existing, error: fetchErr } = await supabase
      .from('welfare_contributions')
      .select('*, members:member_id(first_name, surname, title)')
      .eq('id', welfareContributionId)
      .single();

    if (fetchErr || !existing) {
      return { success: false, error: fetchErr?.message || 'Welfare contribution not found' };
    }

    // 2. Insert into financial_payments (Assessment Dues ledger)
    const { data: newPayment, error: insertErr } = await supabase
      .from('financial_payments')
      .insert({
        member_id: existing.member_id,
        assessment_year: payload.assessmentYear,
        month: payload.month || 'Jan',
        amount: existing.amount,
        payment_date: existing.payment_date,
        recorded_by: user?.id || existing.recorded_by || null,
      })
      .select()
      .single();

    if (insertErr || !newPayment) {
      return { success: false, error: insertErr?.message || 'Failed to create assessment payment record' };
    }

    // 3. Delete from welfare_contributions
    const { error: delErr } = await supabase
      .from('welfare_contributions')
      .delete()
      .eq('id', welfareContributionId);

    if (delErr) {
      console.error('Warning: Failed to delete source welfare record after reclassification:', delErr);
    }

    // 4. Log in financial audit log
    try {
      await supabase.from('financial_audit_log').insert({
        action: 'payment_reclassify_to_dues',
        entity_type: 'payment',
        entity_id: newPayment.id,
        member_id: existing.member_id,
        old_values: {
          source_fund: 'Welfare Contribution',
          welfare_contribution_id: existing.id,
          amount: existing.amount,
          period_year: existing.period_year,
          period_month: existing.period_month,
          payment_method: existing.payment_method,
        },
        new_values: {
          destination_fund: 'Commandery Assessment Dues',
          payment_id: newPayment.id,
          assessment_year: payload.assessmentYear,
          month: payload.month || 'Jan',
          amount: existing.amount,
          reclassification_reason: payload.reason || 'Miscategorized payment moved from Welfare to Assessment',
        },
        changed_by: user?.id || null,
        changed_at: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.error('Audit logging failed for reclassification:', auditErr);
    }

    // 5. Log in welfare audit log
    await logWelfareAudit({
      action: 'contribution_delete',
      entityType: 'welfare_contribution',
      entityId: existing.id,
      memberId: existing.member_id,
      oldValues: existing,
      newValues: {
        reclassified_to_dues: true,
        destination_payment_id: newPayment.id,
        reason: payload.reason || 'Reclassified to Commandery Assessment Dues',
      },
    });

    return { success: true, paymentId: newPayment.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected server error' };
  }
}

export async function getWelfareArrearsDetailedReport(): Promise<WelfareArrearsReport> {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const baseStartYear = 2022;

  // 1. Fetch eligible active/alive members
  const { data: allMembers, error: membersErr } = await supabase
    .from('members')
    .select('id, first_name, surname, title, date_of_birth, date_joined, status, is_deceased')
    .order('surname');

  if (membersErr) throw membersErr;

  const eligibleMembers = (allMembers || []).filter(isEligibleWelfareMember);

  const eligibleMemberIds = new Set(eligibleMembers.map(m => m.id));

  // 2. Fetch all welfare contributions
  const contributions = await fetchAllPaginated<any>((from, to) => 
    supabase
      .from('welfare_contributions')
      .select('id, member_id, amount, payment_date, period_year, period_month')
      .range(from, to)
  );

  // 3. Fetch rates map
  const { data: ratesData } = await supabase
    .from('welfare_contribution_rates')
    .select('year, monthly_rate');
  const ratesMap = new Map<number, number>(
    (ratesData || []).map((r: any) => [r.year, Number(r.monthly_rate)])
  );

  // 4. Map contributions per member & per year
  const memberContribMap = new Map<string, number>();
  const memberYearlyContribMap = new Map<string, Map<number, number>>();
  const earliestContribMap = new Map<string, { year: number; month: number; payment_date: string | null }>();

  (contributions || []).forEach(c => {
    if (!c.member_id || !eligibleMemberIds.has(c.member_id)) return;
    const amt = Number(c.amount) || 0;
    const pYear = c.period_year || (c.payment_date ? new Date(c.payment_date).getFullYear() : null);
    const pMonth = c.period_month || (c.payment_date ? new Date(c.payment_date).getMonth() + 1 : 1);

    memberContribMap.set(c.member_id, (memberContribMap.get(c.member_id) || 0) + amt);

    if (pYear) {
      if (!memberYearlyContribMap.has(c.member_id)) {
        memberYearlyContribMap.set(c.member_id, new Map<number, number>());
      }
      const yMap = memberYearlyContribMap.get(c.member_id)!;
      yMap.set(pYear, (yMap.get(pYear) || 0) + amt);

      const existing = earliestContribMap.get(c.member_id);
      if (!existing || pYear < existing.year || (pYear === existing.year && pMonth < existing.month)) {
        earliestContribMap.set(c.member_id, { year: pYear, month: pMonth, payment_date: c.payment_date });
      }
    }
  });

  // 5. Build Member Breakdown
  let totalCumulativeArrears = 0;
  let currentYearArrears = 0;
  let pastYearsArrears = 0;
  let totalExpectedCumulative = 0;
  let totalPaidCumulative = 0;
  let activeSubscribersCount = 0;
  let delinquentCount = 0;
  let seniorExemptCount = 0;

  const memberBreakdown: WelfareMemberArrearsItem[] = eligibleMembers.map(m => {
    const totalPaid = memberContribMap.get(m.id) || 0;
    const earliestContrib = earliestContribMap.get(m.id) || null;

    const {
      expectedCumulative,
      expectedCurrentYear,
      isSeniorExempt,
      effectiveStartYear,
      effectiveStartMonth,
    } = calculateExpectedWelfare({
      member: m,
      earliestContribution: earliestContrib,
      ratesMap,
      defaultMonthlyRate: 25.00,
      baseStartYear,
      currentYear,
      currentMonth,
    });

    const yearlyMap = memberYearlyContribMap.get(m.id) || new Map<number, number>();
    const currentYearPaid = yearlyMap.get(currentYear) || 0;
    const pastYearsPaid = totalPaid - currentYearPaid;
    const pastYearsExpected = Math.max(0, expectedCumulative - expectedCurrentYear);

    const pastArr = isSeniorExempt ? 0 : Math.max(0, pastYearsExpected - pastYearsPaid);
    const curArr = isSeniorExempt ? 0 : Math.max(0, expectedCurrentYear - currentYearPaid);
    const cumulativeArrears = isSeniorExempt ? 0 : Math.max(0, expectedCumulative - totalPaid);

    const isSubscriber = isSeniorExempt || cumulativeArrears <= 75.00;

    if (isSeniorExempt) {
      seniorExemptCount++;
    } else {
      totalExpectedCumulative += expectedCumulative;
      totalPaidCumulative += totalPaid;
      totalCumulativeArrears += cumulativeArrears;
      currentYearArrears += curArr;
      pastYearsArrears += pastArr;
      if (cumulativeArrears > 75.00) {
        delinquentCount++;
      }
    }

    if (isSubscriber) {
      activeSubscribersCount++;
    }

    let joinLabel = '2022 (Genesis)';
    if (isSeniorExempt) {
      joinLabel = 'Senior (80+ Exempt)';
    } else if (effectiveStartYear > 2022) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      joinLabel = `${monthNames[effectiveStartMonth - 1]} ${effectiveStartYear}`;
    }

    return {
      id: m.id,
      name: `${m.first_name || ''} ${m.surname || ''}`.trim(),
      title: m.title || 'Bro.',
      status: m.status || 'Active',
      dateJoined: m.date_joined || null,
      joinLabel,
      isSeniorExempt,
      effectiveStartYear,
      effectiveStartMonth,
      pastYearsExpected,
      pastYearsPaid,
      pastYearsArrears: pastArr,
      currentYearExpected: expectedCurrentYear,
      currentYearPaid,
      currentYearArrears: curArr,
      totalExpected: expectedCumulative,
      totalPaid,
      cumulativeArrears,
      isSubscriber,
    };
  });

  // Sort by surname/name ascending
  memberBreakdown.sort((a, b) => a.name.localeCompare(b.name));

  // 6. Build Yearly Breakdown (2022 to currentYear)
  const yearlyBreakdown: WelfareYearlyArrearsItem[] = [];
  for (let yr = baseStartYear; yr <= currentYear; yr++) {
    const monthlyRate = ratesMap.get(yr) || 25.00;
    const monthsInYear = yr === currentYear ? currentMonth : 12;

    let expectedTotal = 0;
    let collectedTotal = 0;

    eligibleMembers.forEach(m => {
      // Check 80+ senior exemption for that year
      let seniorInYear = false;
      if (m.date_of_birth) {
        const bYear = new Date(m.date_of_birth).getFullYear();
        if (!isNaN(bYear) && (yr - bYear >= 80)) seniorInYear = true;
      }
      if (seniorInYear) return;

      const earliest = earliestContribMap.get(m.id);
      const { effectiveStartYear, effectiveStartMonth } = calculateExpectedWelfare({
        member: m,
        earliestContribution: earliest,
        ratesMap,
        defaultMonthlyRate: 25.00,
        baseStartYear,
        currentYear: yr,
        currentMonth: monthsInYear,
      });

      if (yr < effectiveStartYear) {
        // Not a member in this year
        return;
      }

      let activeMonths = monthsInYear;
      if (yr === effectiveStartYear) {
        activeMonths = Math.max(0, monthsInYear - effectiveStartMonth + 1);
      }
      expectedTotal += activeMonths * monthlyRate;

      const yMap = memberYearlyContribMap.get(m.id);
      if (yMap) {
        collectedTotal += yMap.get(yr) || 0;
      }
    });

    const arrearsTotal = Math.max(0, expectedTotal - collectedTotal);
    const complianceRate = expectedTotal > 0 ? Math.min(100, Math.round((collectedTotal / expectedTotal) * 100)) : 100;

    yearlyBreakdown.push({
      year: yr,
      monthlyRate,
      expectedTotal,
      collectedTotal,
      arrearsTotal,
      complianceRate,
    });
  }

  return {
    summary: {
      totalCumulativeArrears,
      currentYearArrears,
      pastYearsArrears,
      totalExpectedCumulative,
      totalPaidCumulative,
      activeSubscribersCount,
      delinquentCount,
      seniorExemptCount,
      totalMembersCount: eligibleMembers.length,
    },
    yearlyBreakdown,
    memberBreakdown,
  };
}