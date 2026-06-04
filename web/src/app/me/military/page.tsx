import Link from 'next/link';
import MemberShell from '@/components/layout/MemberShell';
import MilitaryEditor from '@/components/member-sections/MilitaryEditor';
import EmptyState from '@/components/shared/EmptyState';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';
import { getMilitaryByMemberId } from '@/services/militaryService';
import { getRankRecordsByMemberId } from '@/services/rankRecordsService';

export default async function MeMilitaryPage() {
  await requireUser();
  const member = await getMyMember();

  if (!member?.id) {
    return (
      <MemberShell title='Military' subtitle='Create your main member record first.'>
        <EmptyState message='Please save your main member record before editing military information.' />
      </MemberShell>
    );
  }

  const [military, ranks] = await Promise.all([
    getMilitaryByMemberId(member.id),
    getRankRecordsByMemberId(member.id)
  ]);

  return (
    <MemberShell title='Military' subtitle='Manage your uniform and rank details.'>
      <div style={{ display: 'grid', gap: 18 }}>
        <Link href='/me' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>
          ← Back to Overview
        </Link>
        <MilitaryEditor memberId={member.id} initialMilitary={military} initialRanks={ranks} />
      </div>
    </MemberShell>
  );
}
