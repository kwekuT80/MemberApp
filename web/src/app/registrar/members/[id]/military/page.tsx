import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import MilitaryEditor from '@/components/member-sections/MilitaryEditor';
import EmptyState from '@/components/shared/EmptyState';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMemberById } from '@/services/memberService';
import { getMilitaryByMemberId } from '@/services/militaryService';
import { getRankRecordsByMemberId } from '@/services/rankRecordsService';
export default async function RegistrarMemberMilitaryPage({ params }: { params: Promise<{ id: string }> }) { await requireRegistrar(); const { id } = await params; const member = await getMemberById(id); if (!member?.id) return <RegistrarShell title='Military' subtitle='Member not found.'><EmptyState message='This member record could not be loaded.' /></RegistrarShell>; const [military, ranks] = await Promise.all([getMilitaryByMemberId(member.id), getRankRecordsByMemberId(member.id)]); return <RegistrarShell title='Military' subtitle='Manage military and rank records for the selected member.'><div style={{ display:'grid', gap:18 }}><Link href={`/registrar/members/${id}`} style={{ textDecoration:'none', color:'#10233f', fontWeight:700 }}>Back to member</Link><MilitaryEditor memberId={member.id} initialMilitary={military} initialRanks={ranks} /></div></RegistrarShell>; }
