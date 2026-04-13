import MemberShell from '@/components/layout/MemberShell';
import MemberSummaryCard from '@/components/members/MemberSummaryCard';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';
export default async function MePage() { await requireUser(); const member = await getMyMember(); return <MemberShell title='My Record' subtitle='Overview of your current member information.'><MemberSummaryCard member={member} /></MemberShell>; }
