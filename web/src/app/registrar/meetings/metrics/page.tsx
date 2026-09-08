export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getAllMeetingsMetrics } from '@/services/attendanceService';
import MeetingMetricsClient from './MeetingMetricsClient';

export default async function MeetingMetricsPage() {
  const { profile } = await requireRegistrar();

  const metrics = await getAllMeetingsMetrics(profile?.commandery_id || undefined);

  return (
    <RegistrarShell
      title="Meeting Metrics & Analytics"
      subtitle="Comprehensive key metrics, attendance turnout, check-in methods, and records across all Commandery sessions."
    >
      <MeetingMetricsClient metrics={metrics} />
    </RegistrarShell>
  );
}
