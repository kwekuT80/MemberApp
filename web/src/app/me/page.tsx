import Link from 'next/link';
import MemberShell from '@/components/layout/MemberShell';
import MemberSummaryCard from '@/components/members/MemberSummaryCard';
import EmptyState from '@/components/shared/EmptyState';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember, getMyInitiationCohort } from '@/services/memberService';
import BirthdaysWidget from '@/components/dashboard/BirthdaysWidget';
import { formatMemberTitle } from '@/lib/utils/ksji-logic';
import MemberServiceJourneyTimeline from '@/components/members/MemberServiceJourneyTimeline';

export default async function MePage() {
  await requireUser();
  const [member, cohortData] = await Promise.all([
    getMyMember(),
    getMyInitiationCohort()
  ]);

  if (!member) {
    return (
      <MemberShell title='My Record' subtitle='Overview of your current member information.'>
        <EmptyState message='Unable to load your member record.' />
      </MemberShell>
    );
  }

  const displayTitle = formatMemberTitle(member?.title, member?.degrees);

  return (
    <MemberShell title='My Record' subtitle='Overview of your current member information.'>
      <div style={{ display: 'grid', gap: 18 }}>
        <BirthdaysWidget isRegistrar={false} />

        {/* INITIATION COHORT SPOTLIGHT CARD */}
        {cohortData.hasCohort ? (
          <div
            style={{
              background: 'linear-gradient(135deg, #10233F 0%, #1e3a5f 60%, #800020 100%)',
              borderRadius: '12px',
              padding: '18px 22px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 4px 14px rgba(16, 35, 63, 0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: 'rgba(212, 175, 55, 0.2)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}
              >
                ⚔️
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', color: '#D4AF37', textTransform: 'uppercase' }}>
                  Fraternal Initiation Class
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                  Cohort of {cohortData.formattedDate}
                </div>
                <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '2px' }}>
                  {cohortData.totalMembers} Brothers Initiated Together • {cohortData.activeCount} Active • {cohortData.deceasedCount} Roll of Honour
                </div>
              </div>
            </div>

            <Link
              href="/me/cohort"
              style={{
                textDecoration: 'none',
                background: '#D4AF37',
                color: '#0f172a',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              <span>View Full Cohort Roster</span>
              <span>→</span>
            </Link>
          </div>
        ) : (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚔️</span>
              <span style={{ fontSize: '13px', color: '#475569' }}>
                <strong>Initiation Cohort:</strong> Your ceremony date has not yet been linked in the digital roll book.
              </span>
            </div>
            <Link
              href="/me/cohort"
              style={{
                textDecoration: 'none',
                color: '#10233F',
                fontSize: '12.5px',
                fontWeight: 700
              }}
            >
              Learn More →
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 6, alignItems: 'center' }}>
          <Link href='/me/cohort' style={{ textDecoration: 'none', color: '#FFFFFF', fontWeight: 900, background: '#800020', padding: '6px 16px', borderRadius: 8, boxShadow: '0 2px 6px rgba(128,0,32,0.2)' }}>⚔️ My Initiation Cohort</Link>
          <Link href='/me/id-card' style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 900, background: '#D4AF37', padding: '6px 16px', borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>🪪 Digital ID Card</Link>
          <Link href='/me/payments/upload' style={{ textDecoration: 'none', color: '#FFFFFF', fontWeight: 900, background: '#10233F', padding: '6px 16px', borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>📱 Submit MoMo Receipt</Link>
          <Link href='/me/report' style={{ textDecoration: 'none', color: '#2563EB', fontWeight: 900, background: '#EFF6FF', padding: '6px 16px', borderRadius: 8 }}>📊 Personal Report</Link>
          <Link href='/me/edit' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Edit Main Record</Link>
          <Link href='/me/attendance' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Attendance</Link>
          <Link href='/me/education' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Exemplification</Link>
          <Link href='/me/emergency' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Emergency</Link>
          <Link href='/me/family' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Family</Link>
          <Link href='/me/financials' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Financials</Link>
          <Link href='/me/welfare' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Welfare Scheme</Link>
          <Link href='/me/military' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Military</Link>
          <Link href='/me/positions' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Positions</Link>
        </div>
        <MemberSummaryCard member={{ ...member, title: displayTitle }} />

        {/* LIFELONG FRATERNAL SERVICE JOURNEY TIMELINE */}
        <MemberServiceJourneyTimeline
          member={member}
          degrees={member.degrees || []}
          positions={member.positions || []}
          military={member.military || []}
          ranks={member.uniformed_rank_records || []}
        />
      </div>
    </MemberShell>
  );
}
