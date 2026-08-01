import Link from 'next/link';
import MemberShell from '@/components/layout/MemberShell';
import MemberSummaryCard from '@/components/members/MemberSummaryCard';
import EmptyState from '@/components/shared/EmptyState';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';
import BirthdaysWidget from '@/components/dashboard/BirthdaysWidget';

export default async function MePage() {
  await requireUser();
  const member = await getMyMember();

  if (!member) {
    return (
      <MemberShell title='My Record' subtitle='Overview of your current member information.'>
        <EmptyState message='Unable to load your member record.' />
      </MemberShell>
    );
  }

  const displayTitle = member?.title === 'N/B' ? 'Noble Brother' : member?.title;

  return (
    <MemberShell title='My Record' subtitle='Overview of your current member information.'>
      <div style={{ display: 'grid', gap: 18 }}>
        <BirthdaysWidget isRegistrar={false} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 12, alignItems: 'center' }}>
          <Link href='/me/id-card' style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 900, background: '#D4AF37', padding: '6px 16px', borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>🪪 Digital ID Card</Link>
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
      </div>
    </MemberShell>
  );
}
