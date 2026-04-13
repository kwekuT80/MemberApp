import MemberShell from '@/components/layout/MemberShell';
import MemberMainForm from '@/components/members/MemberMainForm';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';
export default async function MeEditPage() { await requireUser(); const member = await getMyMember(); return <MemberShell title='Edit Main Record' subtitle='Update the core member information stored in the members table.'><MemberMainForm initialMember={member} mode='self' /></MemberShell>; }
