import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { 
  getOfficialDegreeDetail, 
  getLeadershipOfficeSummary, 
  formatMemberTitle,
  formatDisplayDate 
} from '@/lib/utils/ksji-logic';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Use service role key if available to bypass RLS for public ID verification
    let supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      supabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      supabase = await createClient();
    }

    // Support short ID prefix (e.g. KSJI-589578EF)
    let searchId = id.trim();
    if (searchId.toUpperCase().startsWith('KSJI-')) {
      const shortCode = searchId.slice(5).toLowerCase();
      const { data: matchedMember } = await supabase
        .from('members')
        .select('id')
        .ilike('id', `${shortCode}%`)
        .limit(1)
        .maybeSingle();

      if (matchedMember) {
        searchId = matchedMember.id;
      }
    }

    // Fetch member profile along with degrees, positions, and commandery name
    const { data: member, error } = await supabase
      .from('members')
      .select('*, degrees(*), positions(*), commanderies(name, code)')
      .eq('id', searchId)
      .single();

    if (error || !member) {
      return NextResponse.json(
        { error: 'Membership record not found' },
        { status: 404 }
      );
    }

    const isDeceased = member.is_deceased === true || String(member.status || '').toLowerCase() === 'deceased' || Boolean(member.date_of_death);
    const isDismissed = String(member.status || '').toLowerCase() === 'dismissed' || Boolean(member.date_of_dismissal);
    const isTransferred = ['transfer-out', 'transferred'].includes(String(member.status || '').toLowerCase()) || Boolean(member.transfer_to);

    // Calculate age for senior exemption
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    let age = 0;
    if (member.date_of_birth) {
      const birthYear = new Date(member.date_of_birth).getFullYear();
      if (!isNaN(birthYear)) {
        age = currentYear - birthYear;
      }
    }
    const isSeniorExempt = age >= 80;

    // Evaluate Fraternal Good Standing certification
    let isGoodStanding = true;
    let standingCode = 'GOOD_STANDING';
    let standingLabel = 'CERTIFIED IN GOOD STANDING';
    let standingDescription = 'Active Member in Good Standing with Commandery #500';
    let standingColor = '#10b981'; // Emerald

    if (isDeceased) {
      isGoodStanding = true; // Honored permanent status
      standingCode = 'MEMORIAL_ROLL';
      standingLabel = 'MEMORIAL ROLL OF HONOUR';
      standingDescription = 'Dignified Archival Record • Knight of the Heavenly Commandery';
      standingColor = '#6366f1'; // Dignified indigo/purple
    } else if (isDismissed) {
      isGoodStanding = false;
      standingCode = 'ARCHIVED_DISMISSED';
      standingLabel = 'FORMER MEMBER (DISMISSED)';
      standingDescription = 'Archived Membership Record • Not In Standing';
      standingColor = '#ef4444'; // Red
    } else if (isTransferred) {
      isGoodStanding = true;
      standingCode = 'ARCHIVED_TRANSFERRED';
      standingLabel = member.transfer_to ? `TRANSFERRED TO ${member.transfer_to.toUpperCase()}` : 'TRANSFERRED OUT';
      standingDescription = 'Transferred Member in Good Standing with Order';
      standingColor = '#64748b'; // Slate
    } else if (isSeniorExempt) {
      isGoodStanding = true;
      standingCode = 'SENIOR_EXEMPT';
      standingLabel = 'HONORED SENIOR EXEMPTION (80+)';
      standingDescription = 'Senior Brother • Honored Lifetime Good Standing Certification';
      standingColor = '#d97706'; // Gold
    } else {
      // Living active member: evaluate financial assessment compliance
      try {
        const [currAssRes, paymentsRes] = await Promise.all([
          supabase
            .from('financial_assessments')
            .select('annual_assessment, arrears_brought_forward')
            .eq('member_id', searchId)
            .eq('year', currentYear)
            .maybeSingle(),
          supabase
            .from('financial_payments')
            .select('amount, assessment_year, month')
            .eq('member_id', searchId)
        ]);

        const currAss = currAssRes.data;
        const allPayments = paymentsRes.data || [];
        const arrearsBF = Number(currAss?.arrears_brought_forward || 0);
        const annualAssessment = Number(currAss?.annual_assessment || 0);
        const totalAssessed = arrearsBF + annualAssessment;

        const isVoluntaryPayment = (p: any) => {
          const m = String(p.month || '').toLowerCase();
          return m.includes('voluntary') || m.includes('appeal') || m.includes('relief') || m.includes('donation');
        };

        const currentYearPayments = allPayments
          .filter((p: any) => Number(p.assessment_year) === currentYear && !isVoluntaryPayment(p))
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

        // Required threshold: Months 1-8: 100% arrears + 50% current assessment. Months 9-12: 100% full assessment.
        const isFirstHalf = currentMonth < 9;
        const requiredThreshold = isFirstHalf ? (arrearsBF + (annualAssessment * 0.5)) : totalAssessed;

        if (totalAssessed > 0 && currentYearPayments < requiredThreshold && (totalAssessed - currentYearPayments) > 50) {
          standingCode = 'ASSESSMENT_PENDING';
          standingLabel = 'ASSESSMENT IN PROGRESS';
          standingDescription = 'Active Member • Annual Dues Assessment Under Settlement';
          standingColor = '#f59e0b';
          isGoodStanding = false;
        }
      } catch (finErr) {
        console.warn('Could not query financial standing for verification:', finErr);
      }
    }

    const degreeDetail = getOfficialDegreeDetail(member.degrees || []);
    const leadershipSummary = getLeadershipOfficeSummary(member.positions || []);
    const canonicalTitle = formatMemberTitle(member.title, member.degrees || []);
    const shortCode = `KSJI-${member.id.slice(0, 8).toUpperCase()}`;

    // Return official public verification payload
    return NextResponse.json({
      id: member.id,
      shortCode,
      first_name: member.first_name,
      surname: member.surname,
      other_names: member.other_names,
      title: canonicalTitle,
      photo_url: member.photo_url,
      status: member.status,
      date_joined: member.date_joined,
      date_joined_formatted: formatDisplayDate(member.date_joined),
      commandery: member.commanderies?.name || 'St. Margaret-Mary Commandery No. 500',
      commandery_code: member.commanderies?.code || '#500',
      commandery_location: 'Dansoman, Accra, Ghana',
      degrees: member.degrees || [],
      positions: member.positions || [],
      degreeDetail,
      leadership: leadershipSummary,
      standing: {
        code: standingCode,
        label: standingLabel,
        description: standingDescription,
        color: standingColor,
        isGoodStanding,
        isDeceased,
        isSeniorExempt,
      },
      verifiedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Member verification error:', err);
    return NextResponse.json(
      { error: 'Internal server error verifying member ID' },
      { status: 500 }
    );
  }
}
