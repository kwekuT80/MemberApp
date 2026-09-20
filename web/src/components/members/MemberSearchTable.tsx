'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Member } from '@/types/member';
import { formatDisplayDate, isSystemMember } from '@/lib/utils/ksji-logic';

export default function MemberSearchTable({ 
  members, 
  basePath = '/registrar/members', 
  emptyMessage = 'No member records found.',
  initialCohort = ''
}: { 
  members: any[]; 
  basePath?: string; 
  emptyMessage?: string;
  initialCohort?: string;
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deceased' | 'inactive'>('all');
  const [cohortFilter, setCohortFilter] = useState<string>(initialCohort || 'all');

  // Filter out system/fictitious operational accounts from all member table views
  const actualMembers = useMemo(() => (members || []).filter(m => !isSystemMember(m)), [members]);

  // Compute cohort counts across all actual members
  const cohortCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    actualMembers.forEach(m => {
      if (m.date_joined) {
        counts[m.date_joined] = (counts[m.date_joined] || 0) + 1;
      }
    });
    return counts;
  }, [actualMembers]);

  // Sorted unique cohort list (most recent first)
  const cohortOptions = useMemo(() => {
    const dates = Object.keys(cohortCounts).sort((a, b) => b.localeCompare(a));
    return dates.map(d => ({
      date: d,
      count: cohortCounts[d],
      label: formatDisplayDate(d)
    }));
  }, [cohortCounts]);

  // Apply status and cohort filters
  const filteredMembers = actualMembers.filter(m => {
    // Status filter
    if (statusFilter === 'active' && (['Deceased', 'Dismissed', 'Transfer-Out'].includes(m.status || '') || m.is_deceased)) {
      return false;
    }
    if (statusFilter === 'deceased' && !(m.status === 'Deceased' || m.is_deceased)) {
      return false;
    }
    if (statusFilter === 'inactive' && !['Dismissed', 'Transfer-Out'].includes(m.status || '')) {
      return false;
    }

    // Cohort filter
    if (cohortFilter !== 'all' && m.date_joined !== cohortFilter) {
      return false;
    }

    return true;
  });

  if (!actualMembers.length) {
    return <div className="card" style={{ textAlign: 'center', color: 'var(--grey)' }}>{emptyMessage}</div>;
  }

  const activeCount = actualMembers.filter(m => !['Deceased', 'Dismissed', 'Transfer-Out'].includes(m.status || '') && !m.is_deceased).length;
  const deceasedCount = actualMembers.filter(m => m.status === 'Deceased' || m.is_deceased).length;
  const inactiveCount = actualMembers.filter(m => ['Dismissed', 'Transfer-Out'].includes(m.status || '')).length;

  return (
    <div>
      {/* Quick Filters and Cohort Selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Status Chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#53657d', marginRight: 2 }}>Status:</span>
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
            🕊️ Final Roll ({deceasedCount})
          </button>
          {inactiveCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              style={chipStyle(statusFilter === 'inactive', '#991b1b')}
            >
              Dismissed / Transfer-Out ({inactiveCount})
            </button>
          )}
        </div>

        {/* Cohort Dropdown Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label htmlFor="cohort-select" style={{ fontSize: 12, fontWeight: 700, color: '#53657d' }}>
            👥 Cohort:
          </label>
          <select
            id="cohort-select"
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            style={{
              padding: '5px 12px',
              borderRadius: 8,
              border: cohortFilter !== 'all' ? '2px solid #16a34a' : '1px solid #cbd5e1',
              backgroundColor: cohortFilter !== 'all' ? '#f0fdf4' : '#ffffff',
              color: cohortFilter !== 'all' ? '#166534' : '#1e293b',
              fontWeight: cohortFilter !== 'all' ? 700 : 500,
              fontSize: 12.5,
              cursor: 'pointer'
            }}
          >
            <option value="all">-- All Cohorts ({cohortOptions.length} Batches) --</option>
            {cohortOptions.map(c => (
              <option key={c.date} value={c.date}>
                Cohort of {c.label} ({c.count} Brother{c.count > 1 ? 's' : ''})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Cohort Banner */}
      {cohortFilter !== 'all' && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1px solid #86efac',
          borderRadius: 10,
          padding: '10px 16px',
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🎖️</span>
            <div>
              <span style={{ fontWeight: 800, color: '#166534', fontSize: 13.5 }}>
                Viewing Cohort of {formatDisplayDate(cohortFilter)}
              </span>
              <span style={{ color: '#15803d', fontSize: 12.5, marginLeft: 8 }}>
                ({filteredMembers.length} Brother{filteredMembers.length === 1 ? '' : 's'} Initiated Together)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCohortFilter('all')}
            style={{
              background: '#ffffff',
              border: '1px solid #16a34a',
              color: '#166534',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ✕ Show All Cohorts
          </button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="member-table">
          <thead>
            <tr>
              <th align='left'>Brother Name</th>
              <th align='left'>Phone</th>
              <th align='left'>Children</th>
              <th align='left'>Latest Position</th>
              <th align='left'>Initiation Cohort</th>
              <th align='center'>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  No members found matching this filter criteria.
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => {
                const latestPos = (member.positions || []).sort((a: any, b: any) => 
                  String(b.date_from || '').localeCompare(String(a.date_from || ''))
                )[0];

                const batchSize = member.date_joined ? (cohortCounts[member.date_joined] || 0) : 0;
                const isSelectedCohort = cohortFilter === member.date_joined;

                return (
                  <tr key={member.id} style={isSelectedCohort ? { backgroundColor: '#f0fdf4' } : undefined}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontWeight: 700, color: 'var(--navy)' }}>
                          {[member.title, member.first_name, member.surname].filter(Boolean).join(' ') || 'Unnamed'}
                        </div>
                        {member.status === 'Deceased' && (
                          <span style={{ backgroundColor: '#111827', color: '#F3F4F6', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6 }}>🕊️ RIP</span>
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
                              <a href={`https://wa.me/${(member.phone || member.mobile)?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" title="WhatsApp Brother" style={{ textDecoration: 'none', fontSize: 14 }}>💬</a>
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
                    <td style={{ fontSize: 12 }}>
                      {member.date_joined ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {formatDisplayDate(member.date_joined)}
                          </div>
                          {batchSize > 1 ? (
                            <button
                              type="button"
                              onClick={() => setCohortFilter(isSelectedCohort ? 'all' : member.date_joined)}
                              title={`Click to view all ${batchSize} brothers in this initiation cohort`}
                              style={{
                                marginTop: 3,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: isSelectedCohort ? '#166534' : '#eff6ff',
                                color: isSelectedCohort ? '#ffffff' : '#1d4ed8',
                                border: '1px solid ' + (isSelectedCohort ? '#15803d' : '#bfdbfe'),
                                borderRadius: 10,
                                padding: '2px 8px',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>👥</span>
                              <span>{isSelectedCohort ? 'Showing Batch' : `Cohort of ${batchSize}`}</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: 10.5, color: '#64748b' }}>Individual</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td align='center'>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <Link href={`${basePath}/${member.id}`} className="btn btn-primary btn-action">
                          Profile
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
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
