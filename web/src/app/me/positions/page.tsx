import MemberShell from '@/components/layout/MemberShell';
import PositionsEditor from '@/components/member-sections/PositionsEditor';
import EmptyState from '@/components/shared/EmptyState';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';
import { getPositionsByMemberId } from '@/services/positionsService';
export default async function MePositionsPage() { await requireUser(); const member = await getMyMember(); if (!member?.id) return <MemberShell title='Positions' subtitle='Create your main member record first.'><EmptyState message='Please save your main member record before editing positions.' /></MemberShell>; const positions = await getPositionsByMemberId(member.id); return <MemberShell title='Positions' subtitle='Manage positions held.'><PositionsEditor memberId={member.id} initialPositions={positions} /></MemberShell>; }
