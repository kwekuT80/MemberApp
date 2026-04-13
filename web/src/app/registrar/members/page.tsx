import RegistrarShell from '@/components/layout/RegistrarShell';
import MemberSearchTable from '@/components/members/MemberSearchTable';
import RegistrarSearchBar from '@/components/members/RegistrarSearchBar';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { searchMembers } from '@/services/memberService';
export default async function RegistrarMembersPage({ searchParams }: { searchParams?: Promise<{ q?: string }> }) { await requireRegistrar(); const params = searchParams ? await searchParams : {}; const query = params?.q || ''; const members = await searchMembers(query); return <RegistrarShell title='Members' subtitle='Search, browse, and open any member record.'><div style={{ display:'grid', gap:18 }}><RegistrarSearchBar defaultQuery={query} /><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}><h2 style={{ margin:0 }}>{query ? `Results for “${query}”` : 'All members'}</h2><span style={{ color:'#53657d' }}>{members.length} record{members.length===1?'':'s'}</span></div><MemberSearchTable members={members} emptyMessage='No members match this search yet.' /></div></RegistrarShell>; }
