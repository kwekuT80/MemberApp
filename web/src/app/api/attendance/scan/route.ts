import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { qrText, meetingId } = body;

    // Parse QR code format: supports URLs (/verify/[id]), JSON payloads, raw UUIDs, and KSJI short IDs
    let extractedId: string | null = null;
    let str = (qrText || '').trim();

    // Check if payload is serialized JSON (e.g. {"id": "..."})
    if (str.startsWith('{') && str.endsWith('}')) {
      try {
        const parsed = JSON.parse(str);
        if (parsed && parsed.id) {
          str = String(parsed.id).trim();
        }
      } catch (e) {
        // Fall back to regex parsing if JSON parse fails
      }
    }

    const verifyMatch = str.match(/\/verify\/([a-zA-Z0-9_-]{8,64})/i);
    const uuidMatch = str.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    const ksjiMatch = str.match(/KSJI-([a-zA-Z0-9_-]{8,64})/i);

    if (verifyMatch) {
      extractedId = verifyMatch[1];
    } else if (uuidMatch) {
      extractedId = uuidMatch[0];
    } else if (ksjiMatch) {
      extractedId = ksjiMatch[1];
    } else if (/^[a-zA-Z0-9_-]{8,64}$/.test(str)) {
      extractedId = str;
    }

    if (!extractedId) {
      return NextResponse.json(
        { error: 'Invalid QR code format. Expected a valid member ID or verification URL.' },
        { status: 400 }
      );
    }

    // Look up member (support full UUID or short ID prefix)
    let member = null;
    const { data: exactMember } = await supabase
      .from('members')
      .select('*')
      .eq('id', extractedId)
      .maybeSingle();

    if (exactMember) {
      member = exactMember;
    } else {
      // Try prefix lookup for short IDs
      const { data: prefixMember } = await supabase
        .from('members')
        .select('*')
        .ilike('id', `${extractedId}%`)
        .limit(1)
        .maybeSingle();
      if (prefixMember) {
        member = prefixMember;
      }
    }

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found with this QR code' },
        { status: 404 }
      );
    }

    const memberId = member.id;

    // Helper to fetch member degree & leadership honors
    const getMemberHonors = async (mid: string, title?: string) => {
      const [{ data: degrees }, { data: positions }] = await Promise.all([
        supabase.from('degrees').select('degree_type').eq('member_id', mid),
        supabase.from('positions').select('position_title, date_to').eq('member_id', mid),
      ]);

      let highestDegree = 'Knight (1st Degree)';
      const degTypes = (degrees || []).map((d: any) => String(d.degree_type || '').toLowerCase());
      const has5th = degTypes.some((t: string) => t.includes('5th') || t.includes('fifth') || t.includes('noble')) ||
        String(title || '').toLowerCase().includes('noble');
      const has4th = degTypes.some((t: string) => t.includes('4th') || t.includes('fourth') || t.includes('chevalier'));
      const has3rd = degTypes.some((t: string) => t.includes('3rd') || t.includes('third'));
      const has2nd = degTypes.some((t: string) => t.includes('2nd') || t.includes('second'));

      if (has5th) highestDegree = 'Noble (5th Degree)';
      else if (has4th) highestDegree = 'Chevalier (4th Degree)';
      else if (has3rd) highestDegree = 'Knight (3rd Degree)';
      else if (has2nd) highestDegree = 'Knight (2nd Degree)';

      const activePositions = (positions || []).filter((p: any) => !p.date_to);
      const officeTitle = activePositions[0]?.position_title || (positions && positions.length > 0 ? positions[0].position_title : null);

      return { highestDegree, officeTitle };
    };

    // Check if already checked in for this meeting
    const { data: existingCheckIn } = await supabase
      .from('attendance')
      .select('id, method, check_in_time')
      .eq('meeting_id', meetingId)
      .eq('member_id', memberId)
      .maybeSingle();

    if (existingCheckIn) {
      const honors = await getMemberHonors(member.id, member.title);
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        method: existingCheckIn.method,
        checkInTime: existingCheckIn.check_in_time,
        member: {
          id: member.id,
          name: `${member.first_name || ''} ${member.surname || ''}`.trim() || 'Brother',
          status: member.status,
          title: member.title,
          highestDegree: honors.highestDegree,
          officeTitle: honors.officeTitle,
        },
      });
    }

    // Verify meeting exists and get commandery_id
    const { data: meeting } = await supabase
      .from('meetings')
      .select('id, commandery_id, date')
      .eq('id', meetingId)
      .maybeSingle();

    const commanderyId = member.commandery_id || meeting?.commandery_id || null;

    // Record attendance via QR scan
    const { data: { user } } = await supabase.auth.getUser();
    let { data: checkIn, error: insertError } = await supabase
      .from('attendance')
      .insert({
        meeting_id: meetingId,
        member_id: memberId,
        method: 'qr',
        verified: true,
        verified_by: user?.id || null,
        commandery_id: commanderyId,
        override_note: 'QR Scan',
        check_in_time: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    // If database check constraint 'attendance_method_check' rejects 'qr', fall back to 'manual'
    if (insertError && (insertError.message?.includes('attendance_method_check') || insertError.code === '23514')) {
      console.warn('Database method constraint rejected "qr", falling back to "manual"');
      const retry = await supabase
        .from('attendance')
        .insert({
          meeting_id: meetingId,
          member_id: memberId,
          method: 'manual',
          verified: true,
          verified_by: user?.id || null,
          commandery_id: commanderyId,
          override_note: 'QR Scan',
          check_in_time: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      checkIn = retry.data;
      insertError = retry.error;
    }

    if (insertError) {
      console.error('Attendance insert error:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Failed to record attendance' },
        { status: 500 }
      );
    }

    const honors = await getMemberHonors(member.id, member.title);
    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      checkInTime: checkIn?.check_in_time || new Date().toISOString(),
      member: {
        id: member.id,
        name: `${member.first_name || ''} ${member.surname || ''}`.trim() || 'Brother',
        status: member.status,
        title: member.title,
        highestDegree: honors.highestDegree,
        officeTitle: honors.officeTitle,
      },
    });
  } catch (error) {
    console.error('QR scan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch active meeting and members
export async function GET(request: Request) {
  const supabase = await createClient();

  try {
    const { searchParams } = new URL(request.url);
    const commanderyId = searchParams.get('commandery_id');

    if (!commanderyId) {
      return NextResponse.json(
        { error: 'Commandery ID required' },
        { status: 400 }
      );
    }

    // Get active/upcoming meeting
    const { data: meetings } = await supabase
      .from('meetings')
      .select('*')
      .eq('commandery_id', commanderyId)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(1);

    // Get all active members
    const { data: members } = await supabase
      .from('members')
      .select('*')
      .eq('commandery_id', commanderyId)
      .not('status', 'in', '("Dismissed","Transfer-Out","Deceased","System")');

    return NextResponse.json({
      meeting: meetings?.[0] || null,
      members: members || [],
    });
  } catch (error) {
    console.error('Meeting data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting data' },
      { status: 500 }
    );
  }
}
