import Link from 'next/link';
import MemberShell from '@/components/layout/MemberShell';
import DegreesEditor from '@/components/member-sections/DegreesEditor';
import EmptyState from '@/components/shared/EmptyState';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';
import { getDegreesByMemberId } from '@/services/degreesService';
import { getDegreeTypeNames } from '@/services/lookupService';

export default async function MeExemplificationPage() {
  await requireUser();
  const member = await getMyMember();

  if (!member?.id) {
    return (
      <MemberShell title='Exemplification' subtitle='Create your main member record first.'>
        <EmptyState message='Please save your main member record before editing exemplification records.' />
      </MemberShell>
    );
  }

  const [degrees, degreeTypes] = await Promise.all([
    getDegreesByMemberId(member.id),
    getDegreeTypeNames()
  ]);

  return (
    <MemberShell title='Exemplification' subtitle='Manage your exemplification records.'>
      <div style={{ display: 'grid', gap: 18 }}>
        <Link href='/me' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>
          ← Back to Overview
        </Link>
        <DegreesEditor memberId={member.id} initialDegrees={degrees} degreeTypes={degreeTypes} />
      </div>
    </MemberShell>
  );
}
