import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import MemberSearchTable from '@/components/members/MemberSearchTable';
import RegistrarSearchBar from '@/components/members/RegistrarSearchBar';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMemberCount, searchMembers } from '@/services/memberService';
import WaitingRoom from '@/components/auth/WaitingRoom';
import { getPendingProfilesWithMatches, getUnlinkedMembers } from '@/services/profileService';

export default async function RegistrarPage() { 
  await requireRegistrar(); 
  const [members, memberCount, pending, unlinkedMembers] = await Promise.all([
    searchMembers(''),
    getMemberCount(),
    getPendingProfilesWithMatches(),
    getUnlinkedMembers()
  ]); 

  // Status Breakdown Calculation
  const stats = {
    active: members.filter(m => m.status === 'Active' || !m.status).length,
    retired: members.filter(m => m.status === 'Retired').length,
    deceased: members.filter(m => m.status === 'Deceased').length,
    other: members.filter(m => m.status && !['Active', 'Retired', 'Deceased'].includes(m.status)).length,
  };

  const total = members.length || 1;
  const getPct = (val: number) => Math.round((val / total) * 100);

  // Lifecycle Alerts Calculation (Suspended for >= 3 months or approaching deadline)
  const alerts = members
    .filter(m => m.status === 'Suspended' && m.date_of_suspension)
    .map(m => {
      const suspDate = new Date(m.date_of_suspension!);
      const today = new Date();
      const diffMs = today.getTime() - suspDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const isCritical = diffDays >= 90;
      
      const deadlineDate = new Date(suspDate);
      deadlineDate.setDate(deadlineDate.getDate() + 90);
      const formattedDeadline = deadlineDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      
      return {
        member: m,
        daysSuspended: diffDays,
        isCritical,
        deadline: formattedDeadline,
        daysRemaining: 90 - diffDays
      };
    });

  return (
    <RegistrarShell title='Registrar Dashboard' subtitle='Official Membership Registry & Commandery Records'>
      <WaitingRoom initialPending={pending} unlinkedMembers={unlinkedMembers} />

      {/* Lifecycle Warnings Banner */}
      {alerts.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #b91c1c', background: 'rgba(185, 28, 28, 0.01)', marginBottom: 32, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 24 }}>🚨</span>
            <div>
              <h3 style={{ margin: 0, color: '#991b1b', fontSize: 16, fontWeight: 800 }}>Suspension Lifecycle Action Required</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#7f1d1d', opacity: 0.8 }}>Automatic alert for suspended brothers nearing or past the 3-month reinstatement window.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {alerts.map(({ member, daysSuspended, isCritical, deadline, daysRemaining }) => (
              <div 
                key={member.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '12px 16px', 
                  borderRadius: 8, 
                  background: isCritical ? 'rgba(220, 38, 38, 0.05)' : 'rgba(245, 158, 11, 0.05)', 
                  border: isCritical ? '1px solid rgba(220, 38, 38, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: isCritical ? '#991b1b' : '#92400e' }}>
                    {member.title || 'Bro.'} {member.first_name} {member.surname}
                  </div>
                  <div style={{ fontSize: 12, color: isCritical ? '#b91c1c' : '#b45309', marginTop: 4 }}>
                    {isCritical ? (
                      <strong>⚠️ ACTION REQUIRED: Suspended for {daysSuspended} days. Reinstatement or Dismissal window expired on {deadline}.</strong>
                    ) : (
                      <span>ℹ️ Under suspension for {daysSuspended} days. {daysRemaining} days remaining to reinstate or dismiss (Deadline: {deadline}).</span>
                    )}
                  </div>
                </div>
                <Link 
                  href={`/registrar/members/${member.id}/edit`} 
                  style={{ 
                    fontSize: 12, 
                    padding: '8px 14px', 
                    borderRadius: 8,
                    background: isCritical ? '#b91c1c' : '#d97706',
                    color: 'white',
                    border: 'none',
                    fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Review Status →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid-cols-3" style={{ marginBottom: 32 }}>
        <SummaryCard title='Total Registry' value={String(memberCount)} icon="👥" />
        <SummaryCard title='Onboarding' value='Bulk Import' link='/registrar/import' icon="📥" />
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
          <h2 className="main-title" style={{ fontSize: 20 }}>Member Registry</h2>
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
