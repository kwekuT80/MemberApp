import Link from 'next/link';
import MemberShell from '@/components/layout/MemberShell';
import MemberSummaryCard from '@/components/members/MemberSummaryCard';
import EmptyState from '@/components/shared/EmptyState';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';

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
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 12 }}>
          <Link href='/me/edit' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Edit Main Record</Link>
          <Link href='/me/attendance' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Attendance</Link>
          <Link href='/me/education' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Education</Link>
          <Link href='/me/emergency' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Emergency</Link>
          <Link href='/me/family' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Family</Link>
          <Link href='/me/financials' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Financials</Link>
          <Link href='/me/military' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Military</Link>
          <Link href='/me/positions' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Positions</Link>
        </div>
        <MemberSummaryCard member={{ ...member, title: displayTitle }} />
      </div>
    </MemberShell>
  );
}
