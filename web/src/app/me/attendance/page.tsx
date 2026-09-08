export const dynamic = 'force-dynamic';

import Link from 'next/link';
import React from 'react';
import MemberShell from '@/components/layout/MemberShell';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';
import { getMeetings, getMemberAttendance, getMemberAbsences } from '@/services/attendanceService';
import MemberAttendanceClient from './MemberAttendanceClient';

export default async function MemberAttendancePage() {
  await requireUser();
  const member = await getMyMember();
  
  if (!member || !member.commandery_id) {
    return (
      <MemberShell title="Meeting Attendance" subtitle="Check-in to Commandery meetings and request excuses.">
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--navy)' }}>Registry Link Pending</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14, maxWidth: 500, marginInline: 'auto' }}>
            Your account is not linked to a registry record yet, or your Commandery is unassigned. Please contact your Registrar to complete your onboarding approval!
          </p>
        </div>
      </MemberShell>
    );
  }

  // Fetch meetings, member attendance check-ins, and absence requests reliably
  const [meetings, attendance, excuses] = await Promise.all([
    getMeetings(member.commandery_id),
    getMemberAttendance(member.id),
    getMemberAbsences(member.id)
  ]);

  return (
    <MemberShell title="Meeting Attendance" subtitle="Live geofenced check-in and excuse management.">
      <div style={{ display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Link href='/me' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>
            ← Back to Overview
          </Link>
          <Link
            href='/me/meetings'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              background: '#0f172a',
              color: '#f8fafc',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <span>📊</span>
            <span>View Commandery Meeting Metrics & Attendance Roll →</span>
          </Link>
        </div>
        <MemberAttendanceClient 
          member={member} 
          initialMeetings={meetings} 
          initialAttendance={attendance || []}
          initialExcuses={excuses || []}
        />
      </div>
    </MemberShell>
  );
}
