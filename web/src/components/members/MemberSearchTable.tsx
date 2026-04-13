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
          {members.map((member) => (
            <tr key={member.id}>
              <td>
                <div style={{ fontWeight: 700, color: 'var(--navy)' }}>
                  {[member.first_name, member.surname].filter(Boolean).join(' ') || 'Unnamed member'}
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
                {member.positions?.[0] ? (
                  <span className="badge-gold">{member.positions[0].position_title}</span>
                ) : '—'}
              </td>
              <td style={{ fontSize: 12 }}>{member.date_joined || '—'}</td>
              <td align='center'>
                <Link href={`${basePath}/${member.id}`} className="tab tab-active" style={{ padding: '6px 12px', fontSize: 12 }}>
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
