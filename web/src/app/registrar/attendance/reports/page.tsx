export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMeetings, getAttendanceReport } from '@/services/attendanceService';
import { searchMembers } from '@/services/memberService';

// Calculate summary statistics from attendance report data
function calculateStats(reportData: any[]) {
  if (!reportData || reportData.length === 0) return null;

  let present = 0;
  let excused = 0;
  let absent = 0;

  for (const entry of reportData) {
    if (entry.status.includes('Present')) present++;
    else if (entry.status === 'Excused') excused++;
    else absent++;
  }

  const total = present + excused + absent;
  return {
    present,
    excused,
    absent,
    attendanceRate: ((present / total) * 100).toFixed(1),
    total,
  };
}

export default async function AttendanceReportsPage() {
  await requireRegistrar();

  const currentYear = new Date().getFullYear();

  // Fetch all meetings this year (without commandery filter for global view)
  let meetings: any[] = [];
  try {
   const { createClient } = await import(
     '@/lib/supabase/server'
   );

   const supabase = await createClient();
    const { data } = await supabase
      .from('meetings')
      .select('*')
      .gte('date', `${currentYear}-01-01`)
      .lte('date', `${currentYear}-12-31`)
      .order('date', { ascending: false });
    meetings = data || [];
  } catch (err) {
    // Meetings table may not exist yet
  }

  return (
    <RegistrarShell title="Attendance Reports" subtitle={`Historical meeting attendance summary for ${currentYear}`}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Export Button */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Filter and export attendance records by date range or commandery.
          </p>
          <a
            href="/api/attendance/export"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
          >
            Export to CSV
          </a>
        </div>

        {/* Report Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ReportCard label="Total Meetings" value={String(meetings.length)} icon="📅" color="var(--navy)" />
          <ReportCard label="Avg Attendance" value={`${meetings.length > 0 ? 'N/A' : 'No Data'}`} icon="👥" color="blue-600" />
          <ReportCard label="Date Range" value={meetings.length > 0 ? `${meetings[meetings.length - 1]?.date} → ${meetings[0]?.date}` : 'N/A'} icon="📊" color="purple-600" />
          <ReportCard label="Export Format" value="CSV" icon="📄" color="green-600" />
        </div>

        {/* Filter Section */}
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontWeight: 800, fontSize: 16 }}>
            🔍 Report Filters
          </h3>
          <form action="/api/attendance/export" method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="from" style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>From Date</label>
              <input type="date" id="from" name="from" className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label htmlFor="to" style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>To Date</label>
              <input type="date" id="to" name="to" className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label htmlFor="commandery_id" style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Commandery</label>
              <select id="commandery_id" name="commandery_id" className="w-full p-2 border rounded-lg">
                <option value="">All Commanderies</option>
                {/* Would populate from commanderies table */}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors">
                Apply Filters & Export
              </button>
            </div>
          </form>
        </div>

        {/* Meeting List */}
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontWeight: 800, fontSize: 16 }}>
            📋 Meetings in Period
          </h3>
          {meetings.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No meetings found for this period.</p>
          ) : (
            <div className="space-y-2">
              {meetings.map((meeting) => (
                <div key={meeting.id} style={{ padding: 16, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{meeting.title}</strong>
                    <span style={{ marginLeft: 12, color: '#9ca3af' }}>{meeting.date}</span>
                  </div>
                  <a href={`/registrar/meetings/${meeting.id}`} className="text-blue-600 hover:text-blue-800 text-sm">View Report →</a>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </RegistrarShell>
  );
}

function ReportCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}
