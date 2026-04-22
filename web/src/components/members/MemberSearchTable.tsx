import Link from 'next/link';
import { Member } from '@/types/member';

export default function MemberSearchTable({ members, basePath='/registrar/members', emptyMessage='No member records found.' }: { members: any[]; basePath?: string; emptyMessage?: string }) {
  if (!members.length) {
    return <div className="card" style={{ textAlign: 'center', color: 'var(--grey)' }}>{emptyMessage}</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="member-table">
        <thead>
          <tr>
            <th align='left'>Brother Name</th>
            <th align='left'>Phone</th>
            <th align='left'>Children</th>
            <th align='left'>Latest Position</th>
            <th align='left'>Joined</th>
            <th align='center'>Action</th>
          </tr>
        </thead>
        <tbody>
            {members.map((member) => {
              // Leadership Logic
              const posList = [...(member.positions || [])].sort((a: any, b: any) => 
                String(b.date_from || '').localeCompare(String(a.date_from || ''))
              );
              
              // A member can only have a 'Current' position if they are 'Active'
              // AND the tenure hasn't expired
              const today = new Date().toISOString().split('T')[0];
              const isActiveMember = member.status === 'Active' || !member.status;
              
              const currentPos = isActiveMember ? posList.find((p: any) => {
                const hasNoEndDate = !p.date_to || p.date_to === '';
                const isTenureActive = !hasNoEndDate ? p.date_to >= today : true;
                return hasNoEndDate || isTenureActive;
              }) : null;
              
              const latestPos = posList[0];

              let leadershipTag = '—';
              if (currentPos) {
                leadershipTag = `Current: ${currentPos.position_title}`;
              } else if (latestPos) {
                const startYear = latestPos.date_from?.split('-')[0] || latestPos.date_from?.split('/')[2] || '??';
                const endYear = latestPos.date_to?.split('-')[0] || latestPos.date_to?.split('/')[2] || latestPos.date_to || '??';
                
                // Use 'Former' for Deceased/Dismissed, 'Past' for others
                const prefix = (member.status === 'Deceased' || member.status === 'Dismissed') ? 'Former' : 'Past';
                leadershipTag = `${prefix}: ${latestPos.position_title} (${startYear}-${endYear})`;
              }

              return (
                <tr key={member.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 700, color: 'var(--navy)' }}>
                        {[member.title, member.first_name, member.surname].filter(Boolean).join(' ') || 'Unnamed'}
                      </div>
                      {member.status === 'Deceased' && (
                        <span style={{ backgroundColor: '#111827', color: '#F3F4F6', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>🕯️ RIP</span>
                      )}
                      {member.status === 'Dismissed' && (
                        <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>DISMISSED</span>
                      )}
                      {member.status === 'Suspended' && (
                        <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>SUSPENDED</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--grey)' }}>{member.occupation || 'N/A'}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{member.phone || member.mobile || '—'}</td>
                  <td align='center'>
                    {member.children?.length > 0 ? (
                      <span className="badge-blue">👶 {member.children.length}</span>
                    ) : '—'}
                  </td>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 600, color: currentPos ? 'var(--gold)' : 'var(--grey)' }}>
                      {leadershipTag}
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{member.date_joined || '—'}</td>
                  <td align='center'>
                    <Link href={`${basePath}/${member.id}`} className="tab tab-active" style={{ padding: '6px 12px', fontSize: 12 }}>
                      View Profile
                    </Link>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
