import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { fetchAllPaginated } from '@/lib/supabase/pagination';
import { isSystemMember } from '@/lib/utils/ksji-logic';

// CSV-safe value - escape quotes and wrap in quotes if contains commas
function csvEscape(value: string | number | null): string {
  const str = String(value || '');

  // If contains comma, quote, or newline, wrap in double quotes and escape internal quotes
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

// Helper to format status for display
function getDisplayStatus(status: string): string {
  const map: Record<string, string> = {
    gps: 'Present (GPS)',
    manual: 'Present (Manual)',
    qr_scan: 'Present (QR Scan)',
    approved: 'Excused',
    declined: 'Absent (Excuse Declined)',
  };

  return map[status] || status;
}

// GET /api/attendance/export - Download attendance records as CSV
export async function GET(request: NextRequest) {
  try {
    await requireRegistrar();

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const commanderyId = searchParams.get('commandery_id');
    const statusFilter = searchParams.get('status');

    const supabase = await createClient();

    // Fetch meetings with date filtering (paginated across 1000-row cap)
    const meetings = await fetchAllPaginated((from, to) => {
      let meetingQuery = supabase.from('meetings').select('*');
      if (fromDate) meetingQuery = meetingQuery.gte('date', fromDate);
      if (toDate) meetingQuery = meetingQuery.lte('date', toDate);
      if (commanderyId) meetingQuery = meetingQuery.eq('commandery_id', commanderyId);
      return meetingQuery.order('date').range(from, to);
    });

    if (!meetings || meetings.length === 0) {
      return NextResponse.json(
        { error: 'No meetings found for the selected filters' },
        { status: 404 }
      );
    }

    // Get all living active members (optionally filtered by commandery, paginated)
    const rawMembers = await fetchAllPaginated((from, to) => {
      let memberQuery = supabase
        .from('members')
        .select('*')
        .not('status', 'in', '("Dismissed","Transfer-Out","Deceased","System")')
        .neq('id', 'f0000000-0000-0000-0000-000000000000');
      if (commanderyId) memberQuery = memberQuery.eq('commandery_id', commanderyId);
      return memberQuery.order('surname').range(from, to);
    });
    const members = (rawMembers || []).filter((m: any) => !isSystemMember(m) && !m.is_deceased);

    // Build member lookup map for quick access
    const memberMap = new Map();
    (members || []).forEach((m: any) => memberMap.set(m.id, m));

    // Fetch all attendance and absence data in one pass per meeting
    const csvLines: string[] = [];

    const headers = [
      'Meeting Date',
      'Meeting Title',
      'Member Name',
      'Status',
      'Check-in Method',
      'Check-in Time',
      'GPS Latitude',
      'GPS Longitude',
    ];

    for (const meeting of meetings) {
      // Fetch attendance records for this meeting (paginated)
      const attendance = await fetchAllPaginated((from, to) =>
        supabase
          .from('attendance')
          .select('*')
          .eq('meeting_id', meeting.id)
          .range(from, to)
      );

      // Fetch approved absence requests
      const {
        data: absences,
        error: absencesError,
      } = await supabase
        .from('absence_requests')
        .select('*')
        .eq(
          'meeting_id',
          meeting.id
        )
        .eq('status', 'approved');

      if (absencesError) {
        throw absencesError;
      }

      // Build attendance lookup for this meeting
      const attendanceMap =
        new Map<string, any>();

      (attendance || []).forEach(
        (a: any) =>
          attendanceMap.set(
            a.member_id,
            a
          )
      );

      const absenceMap =
        new Map<string, any>();

      (absences || []).forEach(
        (a: any) =>
          absenceMap.set(
            a.member_id,
            a
          )
      );

      // Generate CSV rows for each member
      for (const m of members || []) {
        const attRecord =
          attendanceMap.get(m.id);

        const absenceRecord =
          absenceMap.get(m.id);

        let status = 'Absent';

        let method = '';

        let checkInTime = '';

        if (attRecord) {
          status =
            getDisplayStatus(
              attRecord.method
            );

          method =
            attRecord.method;

          checkInTime = new Date(
            attRecord.check_in_time
          ).toLocaleString('en-US');
        } else if (
          absenceRecord
        ) {
          status = 'Excused';
        }

        // Apply status filter if set
        if (
          statusFilter &&
          !status
            .toLowerCase()
            .includes(
              statusFilter.toLowerCase()
            )
        ) {
          continue;
        }

        const memberName = `${m.first_name || ''} ${
          m.surname || ''
        }`.trim();

        csvLines.push(
          [
            meeting.date,
            meeting.title,
            memberName,
            status,
            method,
            checkInTime,
            attRecord
              ?.gps_latitude || '',
            attRecord
              ?.gps_longitude || '',
          ]
            .map(csvEscape)
            .join(',')
        );
      }
    }

    if (
      csvLines.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            'No records match the selected filters',
        },
        { status: 404 }
      );
    }

    // Add headers and build final CSV
    const csvContent = [
      headers.join(','),
    ]
      .concat(csvLines)
      .join('\n');

    // Generate filename with date range if available
    const dateStr =
      fromDate ||
      new Date()
        .toISOString()
        .split('T')[0];

    const endDate =
      toDate || dateStr;

    const filename = `ksji-attendance-${dateStr}-to-${endDate}.csv`;

    return new NextResponse(
      csvContent,
      {
        status: 200,
        headers: {
          'Content-Type':
            'text/csv; charset=utf-8',

          'Content-Disposition': `attachment; filename="${filename}"`,

          'Cache-Control':
            'no-store, no-cache',
        },
      }
    );
  } catch (error) {
    console.error(
      'Attendance export error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Failed to export attendance data',
      },
      { status: 500 }
    );
  }
}