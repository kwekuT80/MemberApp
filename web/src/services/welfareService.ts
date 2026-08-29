'use server';

import { createClient } from '@/lib/supabase/server';
import { calculateExpectedWelfare } from '@/lib/utils/ksji-logic';
import { fetchAllPaginated } from '@/lib/supabase/pagination';
import { 
  WelfareCategory, 
  WelfareContribution, 
  WelfareDisbursement, 
  WelfareAuditEntry, 
  WelfareSummary,
  WelfareContributionRate 
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
      .select('id, status, is_deceased')
      .range(from, to)
  );

  const eligibleMembers = (allMembers || []).filter(m => {
    if (m.is_deceased) return false;
    const s = String(m.status || '').trim().toLowerCase();
    if (s === 'deceased' || s === 'dismissed' || s === 'transfer-out') return false;
    return true;
  });
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
  eligibleMembers.forEach(m => {
    const totalPaid = memberContribMap.get(m.id) || 0;
    const earliestContrib = earliestContribMap.get(m.id) || null;
    const { expectedCumulative, isSeniorExempt } = calculateExpectedWelfare({
      member: m,
      earliestContribution: earliestContrib,
      ratesMap,
      defaultMonthlyRate: 25.00,
      baseStartYear: 2022,
      currentYear,
      currentMonth,
    });
    const arrears = isSeniorExempt ? 0 : Math.max(0, expectedCumulative - totalPaid);
    if (isSeniorExempt || arrears <= 75.00) {
      activeSubscribers++;
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

