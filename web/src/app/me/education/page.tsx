import MemberShell from '@/components/layout/MemberShell';
import DegreesEditor from '@/components/member-sections/DegreesEditor';
import EmptyState from '@/components/shared/EmptyState';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';
import { getDegreesByMemberId } from '@/services/degreesService';
import { getDegreeTypeNames } from '@/services/lookupService';

export default async function MeEducationPage() {
  await requireUser();
  const member = await getMyMember();
  if (!member?.id) {
    return (
      <MemberShell title='Degree' subtitle='Create your main member record first.'>
        <EmptyState message='Please save your main member record before editing degree records.' />
      </MemberShell>
    );
  }
  const [degrees, degreeTypes] = await Promise.all([getDegreesByMemberId(member.id), getDegreeTypeNames()]);
  return (
    <MemberShell title='Degree' subtitle='Manage degree records.'>
      <DegreesEditor memberId={member.id} initialDegrees={degrees} degreeTypes={degreeTypes} />
    </MemberShell>
  );
}
