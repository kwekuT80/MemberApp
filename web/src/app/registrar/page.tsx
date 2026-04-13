import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import MemberSearchTable from '@/components/members/MemberSearchTable';
import RegistrarSearchBar from '@/components/members/RegistrarSearchBar';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMemberCount, searchMembers } from '@/services/memberService';

export default async function RegistrarPage() { 
  await requireRegistrar(); 
  const [members, memberCount] = await Promise.all([searchMembers(''), getMemberCount()]); 

  return (
    <RegistrarShell title='Registrar Dashboard' subtitle='Official Membership Registry & Commandery Records'>
      <div className="grid-cols-2" style={{ marginBottom: 32 }}>
        <SummaryCard title='Total Members' value={String(memberCount)} icon="👥" />
        <SummaryCard title='Registration' value='Create New' link='/registrar/members/new' icon="➕" />
      </div>

      <div className="card">
        <RegistrarSearchBar />
      </div>

      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 className="main-title" style={{ fontSize: 20 }}>Registry Registry</h2>
          <Link href='/registrar/members' className="tab tab-active">View All</Link>
        </div>
        <MemberSearchTable members={members.slice(0,10)} />
      </div>
    </RegistrarShell>
  ); 
}

function SummaryCard({ title, value, link, icon }: { title:string; value:string; link?:string; icon: string }) { 
  const content = (
    <div className="summary-card" style={{ cursor: link ? 'pointer' : 'default', padding: 24, borderLeft: '4px solid var(--gold)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="label">{title}</div>
          <div className="main-title" style={{ fontSize: 28 }}>{value}</div>
        </div>
        <div style={{ fontSize: 32 }}>{icon}</div>
      </div>
    </div>
  ); 

  return link ? <Link href={link} style={{ textDecoration:'none' }}>{content}</Link> : content; 
}
