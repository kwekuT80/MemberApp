import { supabase } from '../db/supabase';

export async function fetchPersonalReportData(memberId) {
  try {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    // 1. Member Profile
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (!member) return null;

    // 2. Financial Assessments & Payments
    const [lastYearAssRes, currYearAssRes, currPaymentsRes] = await Promise.all([
      supabase.from('financial_assessments').select('*').eq('member_id', memberId).eq('year', lastYear).single(),
      supabase.from('financial_assessments').select('*').eq('member_id', memberId).eq('year', currentYear).single(),
      supabase.from('financial_payments').select('*').eq('member_id', memberId).eq('assessment_year', currentYear).order('payment_date', { ascending: true })
    ]);

    const lastYearAss = lastYearAssRes.data;
    const currAss = currYearAssRes.data;
    const currPayments = currPaymentsRes.data || [];

    const lastYearArrears = currAss
      ? Number(currAss.arrears_brought_forward || 0)
      : (lastYearAss ? Math.max(0, (Number(lastYearAss.annual_assessment || 0) + Number(lastYearAss.arrears_brought_forward || 0))) : 0);

    const currentAssessment = currAss ? Number(currAss.annual_assessment || 0) : 0;
    const totalAssessed = lastYearArrears + currentAssessment;
    const paymentsThisYear = currPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    const netBalance = totalAssessed - paymentsThisYear;
    const outstandingThisYear = Math.max(0, netBalance);
    const creditBalance = netBalance < 0 ? Math.abs(netBalance) : 0;

    let yearStatus = 'Unpaid';
    if (creditBalance > 0) {
      yearStatus = 'Credit Balance';
    } else if (paymentsThisYear >= totalAssessed && totalAssessed > 0) {
      yearStatus = 'Fully Paid';
    } else if (paymentsThisYear > 0) {
      yearStatus = 'Partially Paid';
    }

    // 3. Welfare Scheme
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

    const currentWelfareAssessment = 240;
    const lastYearWelfareBalance = Math.max(0, currentWelfareAssessment - lastYearWelfareContribs);

    // 4. Binary Standing Calculation
    const isMemberActive = member.status === 'Active';
    const hasZeroOutstanding = outstandingThisYear <= 0;

    const standing = (isMemberActive && hasZeroOutstanding)
      ? 'In Good Standing'
      : 'Not In Good Standing';

    const standingReason = standing === 'In Good Standing'
      ? 'All annual dues, assessments, and membership requirements are fully satisfied for the current period.'
      : outstandingThisYear > 0 
        ? `Member has an outstanding balance of GH¢ ${outstandingThisYear.toLocaleString('en-US', { minimumFractionDigits: 2 })} for the ${currentYear} period.`
        : `Member record status is currently ${member.status}.`;

    return {
      member,
      standing,
      standingReason,
      financial: {
        currentYear,
        lastYearArrears,
        currentAssessment,
        totalAssessed,
        paymentsThisYear,
        outstandingThisYear,
        creditBalance,
        netBalance,
        yearStatus
      },
      welfare: {
        lastYearBalance: lastYearWelfareBalance,
        currentAssessment: currentWelfareAssessment,
        contributionsThisYear: currYearWelfareContribs,
        totalContributedAllTime,
        totalBenefitsReceived,
        disbursements: formattedDisbursements
      }
    };
  } catch (e) {
    console.error('Failed to fetch personal report data:', e.message);
    return null;
  }
}
