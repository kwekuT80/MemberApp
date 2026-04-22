import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import MemberSearchTable from '@/components/members/MemberSearchTable';
import RegistrarSearchBar from '@/components/members/RegistrarSearchBar';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMemberCount, searchMembers } from '@/services/memberService';

export default async function RegistrarPage() { 
  await requireRegistrar(); 
  const [members, memberCount] = await Promise.all([searchMembers(''), getMemberCount()]); 

  // Status Breakdown Calculation
  const stats = {
    active: members.filter(m => m.status === 'Active' || !m.status).length,
    retired: members.filter(m => m.status === 'Retired').length,
    deceased: members.filter(m => m.status === 'Deceased').length,
    other: members.filter(m => m.status && !['Active', 'Retired', 'Deceased'].includes(m.status)).length,
  };

  const total = members.length || 1;
  const getPct = (val: number) => Math.round((val / total) * 100);

  return (
    <RegistrarShell title='Registrar Dashboard' subtitle='Official Membership Registry & Commandery Records'>
      <div className="grid-cols-2" style={{ marginBottom: 32 }}>
        <SummaryCard title='Total Registry' value={String(memberCount)} icon="👥" />
        <SummaryCard title='Registration' value='Create New' link='/registrar/members/new' icon="➕" />
      </div>

      {/* Visual Insights Section */}
      <div className="card" style={{ marginBottom: 32 }}>
        <h3 className="label" style={{ marginBottom: 20, color: 'var(--navy)' }}>Registry Health & Distribution</h3>
        <div style={{ display: 'flex', height: 40, borderRadius: 12, overflow: 'hidden', marginBottom: 20, background: '#eee' }}>
           <div style={{ width: `${getPct(stats.active)}%`, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)', fontSize: 11, fontWeight: 800 }}>{getPct(stats.active)}% Active</div>
           <div style={{ width: `${getPct(stats.retired)}%`, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800 }}>{getPct(stats.retired)}% Retired</div>
           <div style={{ width: `${getPct(stats.deceased)}%`, background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800 }}>{getPct(stats.deceased)}% RIP</div>
           <div style={{ width: `${getPct(stats.other)}%`, background: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800 }}>{getPct(stats.other)}% Other</div>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--gold)' }} /> <strong>{stats.active}</strong> Active Brothers</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#3b82f6' }} /> <strong>{stats.retired}</strong> Retired</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#111827' }} /> <strong>{stats.deceased}</strong> Deceased (RIP)</div>
        </div>
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
