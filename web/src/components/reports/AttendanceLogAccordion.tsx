'use client';

import React, { useState } from 'react';
import { formatDisplayDate } from '@/lib/utils/ksji-logic';

interface AttendanceRecord {
  id: string;
  meetingTitle: string;
  meetingDate: string;
  status: string;
  checkInTime?: string | null;
}

interface AttendanceLogAccordionProps {
  records: AttendanceRecord[];
}

export default function AttendanceLogAccordion({ records }: AttendanceLogAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!records || records.length === 0) {
    return (
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
        No scheduled meeting attendance records on file for your Commandery.
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '16px 20px',
          background: '#F8FAFC',
          border: 0,
          borderBottom: expanded ? '1px solid #E2E8F0' : 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🗓️</span>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#0F172A' }}>
            Itemized Meeting Attendance Log ({records.length} Meetings)
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#2563EB' }}>
          <span>{expanded ? 'Hide Itemized Log ▲' : 'Expand Meeting History ▼'}</span>
        </div>
      </button>

      {/* Collapsible Content */}
      {expanded && (
        <div className="no-print-collapse" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#F1F5F9', color: '#475569', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Meeting Title</th>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Check-In Time</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const isPresent = r.status.includes('Present');
                const isExcused = r.status === 'Excused';

                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0F172A' }}>
                      {r.meetingTitle}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B' }}>
                      {formatDisplayDate(r.meetingDate)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B', fontFamily: 'monospace' }}>
                      {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 800,
                        background: isPresent ? '#DCFCE7' : (isExcused ? '#EFF6FF' : '#FEE2E2'),
                        color: isPresent ? '#166534' : (isExcused ? '#1E40AF' : '#991B1B')
                      }}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
