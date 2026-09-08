export const dynamic = 'force-dynamic';

import React from 'react';
import MemberShell from '@/components/layout/MemberShell';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';
import { getAllMeetingsMetrics } from '@/services/attendanceService';
import MeetingMetricsClient from '@/app/registrar/meetings/metrics/MeetingMetricsClient';

export default async function MemberMeetingMetricsPage() {
  await requireUser();
  const member = await getMyMember();

  const metrics = await getAllMeetingsMetrics(member?.commandery_id || undefined);

  return (
    <MemberShell
      title="Commandery Meeting Metrics"
      subtitle="Comprehensive key metrics, attendance turnout, check-in methods, and records across all Commandery sessions."
    >
      <MeetingMetricsClient
        metrics={metrics}
        isMemberView={true}
        backHref="/me/attendance"
        backLabel="← Back to My Attendance"
      />
    </MemberShell>
  );
}
