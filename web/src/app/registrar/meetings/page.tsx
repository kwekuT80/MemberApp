export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMeetings, getAttendanceReport, getAbsenceRequests } from '@/services/attendanceService';
import { searchMembers } from '@/services/memberService';
import RegistrarMeetingsClient from './RegistrarMeetingsClient';

export default async function RegistrarMeetingsPage() {
  const { user, profile } = await requireRegistrar();

  if (!profile || !profile.commandery_id) {
    return (
      <RegistrarShell title="Meeting & Attendance" subtitle="Manage Commandery meetings, check-ins, and absence excuses.">
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--navy)' }}>Commandery Unassigned</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
            Your registrar profile does not have an assigned Commandery yet. Please assign a Commandery to start managing meetings.
          </p>
        </div>
      </RegistrarShell>
    );
  }

  // 1. Fetch meetings for the Commandery
  const meetings = await getMeetings(profile.commandery_id);

  // 2. Fetch all active members on the roll for this Commandery
  const allMembers = await searchMembers('');
  const commanderyMembers = allMembers.filter(m => m.commandery_id === profile.commandery_id && !['Dismissed', 'Transfer-Out', 'Deceased'].includes(m.status || ''));

  return (
    <RegistrarShell title="Meeting & Attendance" subtitle="Schedule geofenced meetings, review excuses, and trigger manual check-in overrides.">
      <RegistrarMeetingsClient 
        profile={profile}
        initialMeetings={meetings}
        members={commanderyMembers}
      />
    </RegistrarShell>
  );
}
