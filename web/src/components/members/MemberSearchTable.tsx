import Link from 'next/link';
import { Member } from '@/types/member';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

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
              const latestPos = (member.positions || []).sort((a: any, b: any) => 
                String(b.date_from || '').localeCompare(String(a.date_from || ''))
              )[0];

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
                  <td style={{ fontSize: 13 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{member.phone || member.mobile || '—'}</span>
                        {(member.phone || member.mobile) && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <a href={`tel:${member.phone || member.mobile}`} title="Call Brother" style={{ textDecoration: 'none', fontSize: 14 }}>📞</a>
                            <a href={`https://wa.me/${(member.phone || member.mobile)?.replace(/\D/g, '')}`} target="_blank" title="WhatsApp Brother" style={{ textDecoration: 'none', fontSize: 14 }}>💬</a>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td align='center'>
                    {member.children?.length > 0 ? (
                      <span className="badge-blue">👶 {member.children.length}</span>
                    ) : '—'}
                  </td>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>
                      {latestPos?.position_title || '—'}
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{formatDisplayDate(member.date_joined)}</td>
                  <td align='center'>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <Link href={`${basePath}/${member.id}`} className="tab tab-active" style={{ padding: '6px 12px', fontSize: 12 }}>
                        Profile
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
