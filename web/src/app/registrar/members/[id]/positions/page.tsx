import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import PositionsEditor from '@/components/member-sections/PositionsEditor';
import EmptyState from '@/components/shared/EmptyState';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMemberById } from '@/services/memberService';
import { getPositionsByMemberId } from '@/services/positionsService';
export default async function RegistrarMemberPositionsPage({ params }: { params: Promise<{ id: string }> }) { await requireRegistrar(); const { id } = await params; const member = await getMemberById(id); if (!member?.id) return <RegistrarShell title='Positions' subtitle='Member not found.'><EmptyState message='This member record could not be loaded.' /></RegistrarShell>; const positions = await getPositionsByMemberId(member.id); return <RegistrarShell title='Positions' subtitle='Manage positions held by the selected member.'><div style={{ display:'grid', gap:18 }}><Link href={`/registrar/members/${id}`} style={{ textDecoration:'none', color:'#10233f', fontWeight:700 }}>Back to member</Link><PositionsEditor memberId={member.id} initialPositions={positions} /></div></RegistrarShell>; }
