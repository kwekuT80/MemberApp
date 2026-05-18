export const dynamic = 'force-dynamic';

import React from 'react';
import MemberShell from '@/components/layout/MemberShell';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';
import { getMeetings } from '@/services/attendanceService';
import MemberAttendanceClient from './MemberAttendanceClient';
import { createClient } from '@/lib/supabase/server';

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

  // Fetch all meetings for the member's Commandery
  const meetings = await getMeetings(member.commandery_id);
  
  // Fetch active check-ins for the member
  const supabase = await createClient();
  const { data: attendance } = await supabase
    .from('attendance')
    .select('meeting_id, check_in_time, method')
    .eq('member_id', member.id);

  // Fetch active absence/excuse requests
  const { data: excuses } = await supabase
    .from('absence_requests')
    .select('meeting_id, reason, status')
    .eq('member_id', member.id);

  return (
    <MemberShell title="Meeting Attendance" subtitle="Live geofenced check-in and excuse management.">
      <MemberAttendanceClient 
        member={member} 
        initialMeetings={meetings} 
        initialAttendance={attendance || []}
        initialExcuses={excuses || []}
      />
    </MemberShell>
  );
}
