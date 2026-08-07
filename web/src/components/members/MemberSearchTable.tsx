'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Member } from '@/types/member';
import { formatDisplayDate, isSystemMember } from '@/lib/utils/ksji-logic';

export default function MemberSearchTable({ members, basePath='/registrar/members', emptyMessage='No member records found.' }: { members: any[]; basePath?: string; emptyMessage?: string }) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deceased' | 'inactive'>('all');

  // Filter out system/fictitious operational accounts from all member table views
  const actualMembers = (members || []).filter(m => !isSystemMember(m));

  const filteredMembers = actualMembers.filter(m => {
    if (statusFilter === 'active') return !['Deceased', 'Dismissed', 'Transfer-Out', 'Suspended'].includes(m.status || '') && !m.is_deceased;
    if (statusFilter === 'deceased') return m.status === 'Deceased' || m.is_deceased;
    if (statusFilter === 'inactive') return ['Dismissed', 'Suspended', 'Transfer-Out'].includes(m.status || '');
    return true;
  });

  if (!actualMembers.length) {
    return <div className="card" style={{ textAlign: 'center', color: 'var(--grey)' }}>{emptyMessage}</div>;
  }

  const activeCount = actualMembers.filter(m => !['Deceased', 'Dismissed', 'Transfer-Out', 'Suspended'].includes(m.status || '') && !m.is_deceased).length;
  const deceasedCount = actualMembers.filter(m => m.status === 'Deceased' || m.is_deceased).length;
  const inactiveCount = actualMembers.filter(m => ['Dismissed', 'Suspended', 'Transfer-Out'].includes(m.status || '')).length;

  return (
    <div>
      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#53657d', marginRight: 2 }}>Quick Filter:</span>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          style={chipStyle(statusFilter === 'all', '#10233f')}
        >
          All ({actualMembers.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('active')}
          style={chipStyle(statusFilter === 'active', '#1f6f43')}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('deceased')}
          style={chipStyle(statusFilter === 'deceased', '#111827')}
        >
          🕯️ Final Roll ({deceasedCount})
        </button>
        {inactiveCount > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            style={chipStyle(statusFilter === 'inactive', '#991b1b')}
          >
            Dismissed / Suspended ({inactiveCount})
          </button>
        )}
      </div>

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
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  No members found in this filtered view.
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => {
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
                      <Link href={`${basePath}/${member.id}`} className="btn btn-primary btn-action">
                        Profile
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function chipStyle(active: boolean, activeBg: string): React.CSSProperties {
  return {
    background: active ? activeBg : '#f1f5f9',
    color: active ? '#ffffff' : '#334155',
    border: active ? `1px solid ${activeBg}` : '1px solid #cbd5e1',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: active ? 700 : 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };
}

