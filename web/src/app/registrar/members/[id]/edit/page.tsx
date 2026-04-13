import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import MemberMainForm from '@/components/members/MemberMainForm';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMemberById } from '@/services/memberService';
export default async function RegistrarMemberEditPage({ params }: { params: Promise<{ id: string }> }) { await requireRegistrar(); const { id } = await params; const member = await getMemberById(id); return <RegistrarShell title='Edit Member' subtitle="Update the selected member's main record."><div style={{ display:'grid', gap:18 }}><div style={{ display:'flex', gap:12, flexWrap:'wrap' }}><Link href={`/registrar/members/${id}`} style={{ textDecoration:'none', color:'#10233f', fontWeight:700 }}>Back to member</Link></div><MemberMainForm initialMember={member} mode='registrar' redirectTo={`/registrar/members/${id}`} /></div></RegistrarShell>; }
