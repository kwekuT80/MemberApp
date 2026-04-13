import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import MemberMainForm from '@/components/members/MemberMainForm';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
export default async function RegistrarNewMemberPage() { await requireRegistrar(); return <RegistrarShell title='Create Member' subtitle='Add a new member record under the current registrar-owned workflow.'><div style={{ display:'grid', gap:18 }}><div style={{ display:'flex', gap:12, flexWrap:'wrap' }}><Link href='/registrar/members' style={{ textDecoration:'none', color:'#10233f', fontWeight:700 }}>Back to members</Link></div><MemberMainForm initialMember={null} mode='registrar' /></div></RegistrarShell>; }
