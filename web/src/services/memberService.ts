'use server';
import { createClient } from '@/lib/supabase/server';
import { Member } from '@/types/member';
import { isSystemMember } from '@/lib/utils/ksji-logic';

const FULL_SELECT = `
  *,
  children(*),
  positions(*),
  degrees(*),
  spouse(*),
  military(*),
  uniformed_rank_records(*)
`;

function sanitizeQuery(query = '') { return query.trim().replace(/,/g, ' ').replace(/%/g, ''); }

export async function getMyMember(): Promise<any | null> {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Fetch profile to see if they have a linked member_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('member_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.member_id) {
    const { data, error } = await supabase
      .from('members')
      .select(FULL_SELECT)
      .eq('id', profile.member_id)
      .maybeSingle();
    if (!error && data) return data;
  }

  // 2. Fallback to user_id match with limit to avoid PGRST116 multiple rows exception
  const { data, error } = await supabase
    .from('members')
    .select(FULL_SELECT)
    .eq('user_id', user.id)
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

export async function getMemberById(id: string): Promise<any | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('members').select(FULL_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function searchMembers(query = ''): Promise<Member[]> {
  const supabase = await createClient();
  let builder = supabase.from('members').select('*, children(id), positions(position_title)').order('surname').order('first_name');
  const safeQuery = sanitizeQuery(query);
  if (safeQuery) {
    builder = builder.or(`surname.ilike.%${safeQuery}%,first_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%,phone.ilike.%${safeQuery}%,mobile.ilike.%${safeQuery}%`);
  }
  const { data, error } = await builder;
  if (error) throw error;
  const list = (data || []) as Member[];
  return list.filter(m => !isSystemMember(m));
}

export async function getMemberCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('members').select('id, first_name, surname, title, is_system, is_fictitious, member_type');
  if (error) throw error;
  const actualMembers = (data || []).filter(m => !isSystemMember(m));
  return actualMembers.length;
}

/**
 * Fetch members with birthdays today or within the next 7 days.
 * Handles cross-month boundaries (e.g., Dec 30 → Jan 6).
 */
export async function getUpcomingBirthdayMembers(): Promise<Member[]> {
  const supabase = await createClient();

  // Fetch active members who have a date_of_birth
  const { data, error } = await supabase
    .from('members')
    .select(`
      id, title, first_name, surname, date_of_birth, status
    `)
    .not('date_of_birth', 'is', null)
    .eq('status', 'Active')
    .neq('status', 'Deceased')
    .order('surname');

  if (error) throw error;

  const members = (data || []).filter(m => !isSystemMember(m));
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Crucial: remove time component so 'today' comparisons work correctly

  // Helper: days until birthday from today (handles year wrap)
  const daysUntilBirthday = (d: string | null): number => {
    if (!d) return -1;
    const [yearStr, monthStr, dayStr] = d.split('-');
    const bMonth = parseInt(monthStr, 10);
    const bDay = parseInt(dayStr, 10);

    // Calculate days until this birthday
    let birthdayThisYear = new Date(today.getFullYear(), bMonth - 1, bDay);
    birthdayThisYear.setHours(0, 0, 0, 0);

    if (birthdayThisYear < today) {
      // Birthday already passed this year — check next year
      birthdayThisYear = new Date(today.getFullYear() + 1, bMonth - 1, bDay);
      birthdayThisYear.setHours(0, 0, 0, 0);
    }

    const diffMs = birthdayThisYear.getTime() - today.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  // Filter: birthday is today OR within next 7 days
  const upcoming = members.filter(m => {
    const daysUntil = daysUntilBirthday(m.date_of_birth);
    return daysUntil >= 0 && daysUntil <= 7;
  });

  // Sort by proximity (soonest first)
  upcoming.sort((a, b) => {
    return daysUntilBirthday(a.date_of_birth!) - daysUntilBirthday(b.date_of_birth!);
  });

  return upcoming as Member[];
}

/**
 * Column-safe save function to prevent database pollution
 */
export async function saveMember(form: any): Promise<Member> {
  const supabase = await createClient();
  
  // Explicitly define the columns to extract from the form object
  const validColumns = [
    'user_id', 'photo_url', 'title', 'surname', 'first_name', 'other_names', 
    'date_of_birth', 'birth_town', 'birth_region', 'nationality', 
    'home_town', 'home_region', 'residential_address', 'postal_address', 
    'phone', 'mobile', 'email', 'fathers_name', 'mothers_name', 
    'marital_status', 'emp_status', 'occupation', 'workplace', 
    'job_status', 'work_address', 'uniform_positions', 'date_joined',
    'degree1_place', 'degree23_place', 'degree4_place', 'degree_noble_place',
    'status', 'is_deceased', 'date_of_death', 'burial_date', 'burial_place',
    'transfer_from', 'transfer_to', 'transfer_date',
    'date_of_suspension', 'date_of_dismissal', 'date_of_reinstatement'
  ];

  const payload: any = {};
  validColumns.forEach(col => {
    if (form[col] !== undefined) {
      // Correctly handle false values for booleans
      payload[col] = (form[col] === '' || form[col] === undefined) ? null : form[col];
    }
  });

  if (form.id) {
    const { data, error } = await supabase.from('members').update(payload).eq('id', form.id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('members').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
}

export interface PersonalReportData {
  member: any;
  standing: 'In Good Standing' | 'Not In Good Standing';
  standingReason: string;
  financialStanding: 'In Good Standing' | 'Not In Good Standing';
  welfareStanding: 'In Good Standing' | 'Not In Good Standing';
  financial: {
    currentYear: number;
    currentMonth: number;
    benchmarkName: string;
    requiredDuesThreshold: number;
    lastYearArrears: number;
    currentAssessment: number;
    totalAssessed: number;
    paymentsThisYear: number;
    outstandingThisYear: number;
    creditBalance: number;
    netBalance: number;
    yearStatus: string;
    voluntaryPayments: any[];
    totalVoluntaryContributed: number;
  };
  welfare: {
    lastYearBalance: number;
    currentAssessment: number;
    monthlyRate: number;
    contributionsThisYear: number;
    totalContributedAllTime: number;
    totalBenefitsReceived: number;
    totalWelfareAssessed: number;
    welfareOutstanding: number;
    welfareCredit: number;
    disbursements: any[];
  };
  attendance: {
    totalMeetings: number;
    attendedCount: number;
    excusedCount: number;
    absentCount: number;
    complianceRate: number;
    records: Array<{
      id: string;
      meetingTitle: string;
      meetingDate: string;
      status: string;
      checkInTime?: string;
    }>;
  };
}

export async function getMemberPersonalReport(memberId: string): Promise<PersonalReportData | null> {
  const supabase = await createClient();
  
  const { data: member, error: memberErr } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .maybeSingle();

  if (memberErr || !member) return null;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const lastYear = currentYear - 1;

  // 1. Dues & Assessments & Voluntary Relief Payments
  const [lastYearAssRes, currYearAssRes, allPaymentsRes] = await Promise.all([
    supabase.from('financial_assessments').select('*').eq('member_id', memberId).eq('year', lastYear).maybeSingle(),
    supabase.from('financial_assessments').select('*').eq('member_id', memberId).eq('year', currentYear).maybeSingle(),
    supabase.from('financial_payments').select('*').eq('member_id', memberId).order('payment_date', { ascending: false })
  ]);

  const lastYearAss = lastYearAssRes.data;
  const currAss = currYearAssRes.data;
  const allPayments = allPaymentsRes.data || [];

  const isVoluntaryPayment = (p: any) => {
    const m = String(p.month || '').toLowerCase();
    return m.includes('voluntary') || m.includes('appeal') || m.includes('relief') || m.includes('donation');
  };

  const currDuesPayments = allPayments.filter(p => Number(p.assessment_year) === currentYear && !isVoluntaryPayment(p));
  const voluntaryPayments = allPayments.filter(p => isVoluntaryPayment(p));
  const totalVoluntaryContributed = voluntaryPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const lastYearArrears = currAss
    ? Number(currAss.arrears_brought_forward || 0)
    : (lastYearAss ? Math.max(0, (Number(lastYearAss.annual_assessment || 0) + Number(lastYearAss.arrears_brought_forward || 0))) : 0);

  const currentAssessment = currAss ? Number(currAss.annual_assessment || 0) : 0;
  const totalAssessed = lastYearArrears + currentAssessment;
  const paymentsThisYear = currDuesPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const netBalance = totalAssessed - paymentsThisYear; // positive = amount owed, negative = credit balance
  const outstandingThisYear = Math.max(0, netBalance);
  const creditBalance = netBalance < 0 ? Math.abs(netBalance) : 0;

  // Graduated Financial Dues Threshold:
  // Jan 1 - Aug 31 (months 1-8): Must pay 100% of prior arrears + at least 50% of current year assessment
  // Sep 1 - Dec 31 (months 9-12): Must pay 100% of total assessed dues (arrears + full current assessment)
  const isFirstHalf = currentMonth < 9;
  const benchmarkName = isFirstHalf ? '1st Half Benchmark (50% current assessment + prior arrears due by Aug 31)' : '2nd Half Benchmark (100% full settlement required by Sept 1)';
  const requiredDuesThreshold = isFirstHalf ? (lastYearArrears + (currentAssessment * 0.5)) : totalAssessed;
  const hasAcceptableFinancialStanding = totalAssessed <= 0 || paymentsThisYear >= requiredDuesThreshold;

  let yearStatus = 'Unpaid';
  if (creditBalance > 0) {
    yearStatus = 'Credit Balance';
  } else if (paymentsThisYear >= totalAssessed && totalAssessed > 0) {
    yearStatus = 'Fully Paid';
  } else if (paymentsThisYear >= requiredDuesThreshold && isFirstHalf) {
    yearStatus = '50%+ Paid (1st Half Standing)';
  } else if (paymentsThisYear > 0) {
    yearStatus = 'Partially Paid';
  }

  // 2. Welfare Scheme
  const [welfareContribsRes, welfareDisbRes, welfareCatsRes] = await Promise.all([
    supabase.from('welfare_contributions').select('*').eq('member_id', memberId).order('payment_date', { ascending: true }),
    supabase.from('welfare_disbursements').select('*').eq('member_id', memberId).order('disbursement_date', { ascending: false }),
    supabase.from('welfare_categories').select('*')
  ]);

  const welfareContribs = welfareContribsRes.data || [];
  const disbursements = welfareDisbRes.data || [];
  const categories = welfareCatsRes.data || [];

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));
  const formattedDisbursements = disbursements.map(d => ({
    ...d,
    category_name: d.category_name || categoryMap.get(d.category_id) || 'General Benefit'
  }));

  const lastYearWelfareContribs = welfareContribs
    .filter(c => c.period_year === lastYear)
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  
  const currYearWelfareContribs = welfareContribs
    .filter(c => c.period_year === currentYear)
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const totalContributedAllTime = welfareContribs.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalBenefitsReceived = disbursements.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  // 2b. Fetch configured welfare contribution rates (monthly × 12 = annual expected)
  const [currRateRes, lastRateRes] = await Promise.all([
    supabase
      .from('welfare_contribution_rates')
      .select('monthly_rate')
      .eq('year', currentYear)
      .maybeSingle(),
    supabase
      .from('welfare_contribution_rates')
      .select('monthly_rate')
      .eq('year', lastYear)
      .maybeSingle(),
  ]);

  // Default fallback: GH₵25.00/month if no rate has been configured for the year
  const DEFAULT_MONTHLY_RATE = 25.00;
  const currMonthlyRate  = Number(currRateRes.data?.monthly_rate  ?? DEFAULT_MONTHLY_RATE);
  const lastMonthlyRate  = Number(lastRateRes.data?.monthly_rate  ?? DEFAULT_MONTHLY_RATE);
  
  // Welfare is billed monthly: calculate expected contributions up to the current month of the current year
  const proRataWelfareAssessment = currMonthlyRate * currentMonth;
  const currentWelfareAssessment = currMonthlyRate * 12;
  const lastYearWelfareAssessment = lastMonthlyRate * 12;
  const lastYearWelfareBalance = Math.max(0, lastYearWelfareAssessment - lastYearWelfareContribs);

  const totalWelfareAssessed = lastYearWelfareBalance + currentWelfareAssessment;
  const netWelfareBalance = totalWelfareAssessed - currYearWelfareContribs;
  const welfareOutstanding = Math.max(0, netWelfareBalance);
  const welfareCredit = netWelfareBalance < 0 ? Math.abs(netWelfareBalance) : 0;

  // Monthly Welfare Standing: Members remain in Good Standing if unpaid welfare dues do not exceed 3 months (GH₵ 75.00)
  const MAX_ALLOWED_WELFARE_ARREARS_MONTHS = 3;
  const maxAllowedWelfareArrears = currMonthlyRate * MAX_ALLOWED_WELFARE_ARREARS_MONTHS;
  
  // Pro-rata arrears up to current month plus prior year balance
  const currentProRataArrears = Math.max(0, (lastYearWelfareBalance + proRataWelfareAssessment) - currYearWelfareContribs);
  const hasAcceptableWelfareStanding = currentProRataArrears <= maxAllowedWelfareArrears;

  // 3. Binary Standing Calculation (Financial & Welfare & Overall)
  const isMemberActive = member.status === 'Active';

  const financialStanding: 'In Good Standing' | 'Not In Good Standing' = (isMemberActive && hasAcceptableFinancialStanding)
    ? 'In Good Standing'
    : 'Not In Good Standing';

  const welfareStanding: 'In Good Standing' | 'Not In Good Standing' = (isMemberActive && hasAcceptableWelfareStanding)
    ? 'In Good Standing'
    : 'Not In Good Standing';

  const standing: 'In Good Standing' | 'Not In Good Standing' = (financialStanding === 'In Good Standing' && welfareStanding === 'In Good Standing')
    ? 'In Good Standing'
    : 'Not In Good Standing';

  let standingReason = 'All financial dues, welfare contributions, and membership requirements are fully satisfied for the current period.';
  
  const financialReasonText = isFirstHalf
    ? `Member has paid GH₵ ${paymentsThisYear.toLocaleString('en-US', { minimumFractionDigits: 2 })} of GH₵ ${requiredDuesThreshold.toLocaleString('en-US', { minimumFractionDigits: 2 })} required for 1st Half standing (50% threshold of GH₵ ${(currentAssessment * 0.5).toLocaleString('en-US', { minimumFractionDigits: 2 })} plus prior arrears due by Aug 31).`
    : `Member has an outstanding dues balance of GH₵ ${outstandingThisYear.toLocaleString('en-US', { minimumFractionDigits: 2 })} for the ${currentYear} period (100% full payment required by Sept 1).`;

  const welfareReasonText = `Member has an outstanding welfare contribution balance of GH₵ ${currentProRataArrears.toLocaleString('en-US', { minimumFractionDigits: 2 })}, which exceeds the allowable ${MAX_ALLOWED_WELFARE_ARREARS_MONTHS}-month grace threshold.`;

  if (!isMemberActive) {
    standingReason = `Member record is currently flagged as ${member.status}.`;
  } else if (financialStanding === 'Not In Good Standing' && welfareStanding === 'Not In Good Standing') {
    standingReason = `${financialReasonText} Additionally, ${welfareReasonText}`;
  } else if (financialStanding === 'Not In Good Standing') {
    standingReason = financialReasonText;
  } else if (welfareStanding === 'Not In Good Standing') {
    standingReason = welfareReasonText;
  }

  // 4. Meeting Attendance & Compliance Statistics
  let totalMeetings = 0;
  let attendedCount = 0;
  let excusedCount = 0;
  let absentCount = 0;
  let complianceRate = 100;
  let attendanceRecords: any[] = [];

  if (member.commandery_id) {
    const [meetingsRes, checkInsRes, excusesRes] = await Promise.all([
      supabase.from('meetings').select('*').eq('commandery_id', member.commandery_id).order('date', { ascending: false }),
      supabase.from('attendance').select('*').eq('member_id', memberId),
      supabase.from('absence_requests').select('*').eq('member_id', memberId)
    ]);

    const meetingsList = meetingsRes.data || [];
    const checkInsList = checkInsRes.data || [];
    const excusesList = excusesRes.data || [];

    totalMeetings = meetingsList.length;

    attendanceRecords = meetingsList.map(m => {
      const checkIn = checkInsList.find(c => c.meeting_id === m.id);
      const excuse = excusesList.find(e => e.meeting_id === m.id);

      let status = 'Absent';
      if (checkIn) {
        const isQr = checkIn.method === 'qr' || checkIn.method === 'qr_scan' || (checkIn.override_note && String(checkIn.override_note).includes('QR'));
        status = checkIn.method === 'gps' ? 'Present (GPS)' : isQr ? 'Present (QR Scan)' : 'Present (Manual)';
        attendedCount++;
      } else if (excuse && excuse.status === 'approved') {
        status = 'Excused';
        excusedCount++;
      } else if (excuse && excuse.status === 'pending') {
        status = 'Excuse Pending';
        absentCount++;
      } else {
        absentCount++;
      }

      return {
        id: m.id,
        meetingTitle: m.title,
        meetingDate: m.date,
        status,
        checkInTime: checkIn?.check_in_time || null
      };
    });

    complianceRate = totalMeetings > 0 ? Math.min(100, Math.round(((attendedCount + excusedCount) / totalMeetings) * 100)) : 100;
  }

  return {
    member,
    standing,
    standingReason,
    financialStanding,
    welfareStanding,
    financial: {
      currentYear,
      currentMonth,
      benchmarkName,
      requiredDuesThreshold,
      lastYearArrears,
      currentAssessment,
      totalAssessed,
      paymentsThisYear,
      outstandingThisYear,
      creditBalance,
      netBalance,
      yearStatus,
      voluntaryPayments,
      totalVoluntaryContributed
    },
    welfare: {
      lastYearBalance: lastYearWelfareBalance,
      currentAssessment: currentWelfareAssessment,
      monthlyRate: currMonthlyRate,
      contributionsThisYear: currYearWelfareContribs,
      totalContributedAllTime,
      totalBenefitsReceived,
      totalWelfareAssessed,
      welfareOutstanding,
      welfareCredit,
      disbursements: formattedDisbursements
    },
    attendance: {
      totalMeetings,
      attendedCount,
      excusedCount,
      absentCount,
      complianceRate,
      records: attendanceRecords
    }
  };
}

