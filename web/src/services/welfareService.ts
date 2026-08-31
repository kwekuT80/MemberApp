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
      .select('id, date_of_birth, date_joined, status, is_deceased')
      .range(from, to)
  );

  const eligibleMembers = (allMembers || []).filter(m => {
    if (m.is_deceased) return false;
    const s = String(m.status || '').trim().toLowerCase();
    if (['deceased', 'dismissed', 'transfer-out', 'system'].includes(s)) return false;
    const fullName = `${m.first_name || ''} ${m.surname || ''}`.toLowerCase();
    if (fullName.includes('system account') || fullName.includes('operational outflow') || fullName.includes('commandery welfare')) {
      return false;
    }
    return true;
  });

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
