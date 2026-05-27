import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';

// CSV-safe value - escape quotes and wrap in quotes if contains commas
function csvEscape(value: string | number | null): string {
  const str = String(value || '');
  // If contains comma, quote, or newline, wrap in double quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper to format status for display
function getDisplayStatus(status: string): string {
  const map: Record<string, string> = {
    'gps': 'Present (GPS)',
    'manual': 'Present (Manual)',
    'qr_scan': 'Present (QR Scan)',
    'approved': 'Excused',
    'declined': 'Absent (Excuse Declined)',
  };
  return map[status] || status;
}

// GET /api/attendance/export - Download attendance records as CSV
export async function GET(request: NextRequest) {
  try {
    await requireRegistrar();

    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;

    // Parse optional filters
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const commanderyId = searchParams.get('commandery_id');
    const statusFilter = searchParams.get('status');

    // Build query for meetings with date filtering
    let meetingQuery = supabase.from('meetings').select('*');

    if (fromDate) {
      meetingQuery = meetingQuery.gte('date', fromDate);
    }
    if (toDate) {
      meetingQuery = meetingQuery.lte('date', toDate);
    }
    if (commanderyId) {
      meetingQuery = meetingQuery.eq('commandery_id', commanderyId);
    }

    const { data: meetings }: any[] = await meetingQuery.order('date');

    if (!meetings || meetings.length === 0) {
      return NextResponse.json({ error: 'No meetings found for the selected filters' }, { status: 404 });
    }

    // Get all members (optionally filtered by commandery)
    let memberQuery = supabase.from('members').select('*');
    if (commanderyId) {
      memberQuery = memberQuery.eq('commandery_id', commanderyId);
    }
    const { data: members }: any[] = await memberQuery.order('surname');

    // Build member lookup map for quick access
    const memberMap = new Map<string, typeof members[0]>();
    (members || []).forEach(m => memberMap.set(m.id, m));

    // Fetch all attendance and absence data in one pass per meeting
    let csvLines: string[] = [];
    const headers = [
      'Meeting Date', 'Meeting Title', 'Member Name', 'Status',
      'Check-in Method', 'Check-in Time', 'GPS Latitude', 'GPS Longitude'
    ];

    for (const meeting of meetings) {
      // Fetch attendance records for this meeting
      const { data: attendance }: any[] = await supabase
        .from('attendance')
        .select('*')
        .eq('meeting_id', meeting.id);

      // Fetch approved absence requests
      const { data: absences }: any[] = await supabase
        .from('absence_requests')
        .select('*')
        .eq('meeting_id', meeting.id)
        .eq('status', 'approved');

      // Build attendance lookup for this meeting
      const attendanceMap = new Map<string, any>();
      (attendance || []).forEach(a => attendanceMap.set(a.member_id, a));

      const absenceMap = new Map<string, any>();
      (absences || []).forEach(a => absenceMap.set(a.member_id, a));

      // Generate CSV rows for each member
      for (const m of members) {
        const attRecord = attendanceMap.get(m.id);
        const absenceRecord = absenceMap.get(m.id);

        let status = 'Absent';
        let method = '';
        let checkInTime = '';

        if (attRecord) {
          status = getDisplayStatus(attRecord.method);
          method = attRecord.method;
          checkInTime = new Date(attRecord.check_in_time).toLocaleString('en-US');
        } else if (absenceRecord) {
          status = 'Excused';
        }

        // Apply status filter if set
        if (statusFilter && !status.toLowerCase().includes(statusFilter.toLowerCase())) {
          continue;
        }

        const memberName = `${m.first_name || ''} ${m.surname}`.trim();

        csvLines.push([
          meeting.date,
          meeting.title,
          memberName,
          status,
          method,
          checkInTime,
          attRecord?.gps_latitude || '',
          attRecord?.gps_longitude || ''
        ].map(csvEscape).join(','));
      }
    }

    if (csvLines.length === 0) {
      return NextResponse.json({ error: 'No records match the selected filters' }, { status: 404 });
    }

    // Add headers and build final CSV
    const csvContent = [headers.join(',')].concat(csvLines).join('\n');

    // Generate filename with date range if available
    const dateStr = fromDate || new Date().toISOString().split('T')[0];
    const endDate = toDate || dateStr;
    const filename = `ksji-attendance-${dateStr}-to-${endDate}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache',
      },
    });
  } catch (error) {
    console.error('Attendance export error:', error);
    return NextResponse.json({ error: 'Failed to export attendance data' }, { status: 500 });
  }
}
