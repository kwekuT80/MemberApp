import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import FamilyEditor from '@/components/member-sections/FamilyEditor';
import EmptyState from '@/components/shared/EmptyState';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMemberById } from '@/services/memberService';
import { getSpouseByMemberId } from '@/services/spouseService';
import { getChildrenByMemberId } from '@/services/childrenService';
export default async function RegistrarMemberFamilyPage({ params }: { params: Promise<{ id: string }> }) { await requireRegistrar(); const { id } = await params; const member = await getMemberById(id); if (!member?.id) return <RegistrarShell title='Family' subtitle='Member not found.'><EmptyState message='This member record could not be loaded.' /></RegistrarShell>; const [spouse, children] = await Promise.all([getSpouseByMemberId(member.id), getChildrenByMemberId(member.id)]); return <RegistrarShell title='Family' subtitle='Manage spouse and children records for the selected member.'><div style={{ display:'grid', gap:18 }}><Link href={`/registrar/members/${id}`} style={{ textDecoration:'none', color:'#10233f', fontWeight:700 }}>Back to member</Link><FamilyEditor memberId={member.id} initialSpouse={spouse} initialChildren={children} /></div></RegistrarShell>; }
