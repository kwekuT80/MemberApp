import MemberShell from '@/components/layout/MemberShell';
import FamilyEditor from '@/components/member-sections/FamilyEditor';
import EmptyState from '@/components/shared/EmptyState';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';
import { getSpouseByMemberId } from '@/services/spouseService';
import { getChildrenByMemberId } from '@/services/childrenService';
import { getDependentsByMemberId } from '@/services/dependentsService';

export default async function MeFamilyPage() {
  await requireUser();
  const member = await getMyMember();
  
  if (!member?.id) {
    return (
      <MemberShell title='Family' subtitle='Create your main member record first.'>
        <EmptyState message='Please save your main member record before editing family information.' />
      </MemberShell>
    );
  }

  const [spouse, children, dependents] = await Promise.all([
    getSpouseByMemberId(member.id),
    getChildrenByMemberId(member.id),
    getDependentsByMemberId(member.id)
  ]);

  return (
    <MemberShell title='Family & Dependents' subtitle='Manage spouse, children, and dependent records.'>
      <FamilyEditor 
        memberId={member.id} 
        initialSpouse={spouse} 
        initialChildren={children} 
        initialDependents={dependents}
      />
    </MemberShell>
  );
}
