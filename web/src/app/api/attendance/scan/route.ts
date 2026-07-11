import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { qrText, meetingId } = body;

    // Parse QR code format: [origin]/verify/[member-id]
    const idMatch = qrText.match(/\/verify\/([0-9a-fA-F-]+)/);
    if (!idMatch) {
      return NextResponse.json(
        { error: 'Invalid QR code format. Expected: /verify/[member-id]' },
        { status: 400 }
      );
    }

    const memberId = idMatch[1];

    // Look up member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found with this QR code' },
        { status: 404 }
      );
    }

    // Check if already checked in for this meeting
    const { data: existingCheckIn } = await supabase
      .from('attendance')
      .select('id, method, check_in_time')
      .eq('meeting_id', meetingId)
      .eq('member_id', memberId)
      .maybeSingle();

    if (existingCheckIn) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        method: existingCheckIn.method,
        checkInTime: existingCheckIn.check_in_time,
        member: {
          id: member.id,
          name: `${member.first_name} ${member.surname}`,
          status: member.status,
        },
      });
    }

    // Record attendance via QR scan
    const { data: { user } } = await supabase.auth.getUser();
    const { data: checkIn, error: insertError } = await supabase
      .from('attendance')
      .insert({
        meeting_id: meetingId,
        member_id: memberId,
        method: 'manual',
        verified: true,
        verified_by: user?.id || null,
        commandery_id: member.commandery_id || null,
        check_in_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to record attendance' },
        { status: 500 }
      );
    }

    // Verify meeting exists and belongs to registrars commandery
    const { data: meeting } = await supabase
      .from('meetings')
      .select('id, commandery_id, date')
      .eq('id', meetingId)
      .single();

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      checkInTime: checkIn.check_in_time,
      member: {
        id: member.id,
        name: `${member.first_name} ${member.surname}`,
        status: member.status,
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
      .not('status', 'in', `("Dismissed","Transfer-Out","Deceased")`);

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
