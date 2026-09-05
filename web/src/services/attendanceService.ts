'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isSystemMember } from '@/lib/utils/ksji-logic';
import { fetchAllPaginated } from '@/lib/supabase/pagination';

export async function getCommanderies() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('commanderies')
    .select('*')
    .order('number');
  if (error) throw error;
  return data || [];
}

export async function getMeetings(commanderyId: string) {
  const supabase = await createClient();
  return fetchAllPaginated((from, to) =>
    supabase
      .from('meetings')
      .select('*')
      .or(`commandery_id.eq.${commanderyId},commandery_id.is.null`)
      .order('date', { ascending: false })
      .range(from, to)
  );
}

export async function createMeeting(payload: {
  commandery_id: string;
  title: string;
  date: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('meetings')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMeeting(meetingId: string, isTestMeeting: boolean = false) {
  const supabase = await createClient();

  // Fetch meeting details to verify if it is a test meeting or official record
  const { data: meeting } = await supabase
    .from('meetings')
    .select('title')
    .eq('id', meetingId)
    .single();

  const title = (meeting?.title || '').toLowerCase();
  const isRecognizedTest = isTestMeeting || title.includes('test') || title.includes('sample') || title.includes('trial') || title.includes('demo') || title.includes('fictitious') || title.includes('practice');

  if (!isRecognizedTest) {
    // Protect official meetings with active data
    const [{ count: attendanceCount }, { count: absenceCount }] = await Promise.all([
      supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('meeting_id', meetingId),
      supabase.from('absence_requests').select('*', { count: 'exact', head: true }).eq('meeting_id', meetingId)
    ]);

    if ((attendanceCount || 0) > 0 || (absenceCount || 0) > 0) {
      throw new Error(`Protected Official Record: "${meeting?.title}" is an official record containing ${attendanceCount || 0} check-ins. If this was a test, include "Test" or "Sample" in the meeting title to delete it.`);
    }
  }

  // Purge associated test check-ins and absence requests
  await supabase.from('attendance').delete().eq('meeting_id', meetingId);
  await supabase.from('absence_requests').delete().eq('meeting_id', meetingId);

  // Delete meeting
  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', meetingId);

  if (error) throw error;
  return true;
}

export async function checkInMember(payload: {
  meeting_id: string;
  member_id: string;
  method: 'gps' | 'manual' | 'gps_auto' | 'manual_registrar' | 'qr_scan';
  verified_by?: string;
  commandery_id: string;
  gps_latitude?: number;
  gps_longitude?: number;
  accuracy_meters?: number;
  accuracy?: number;
  verified?: boolean;
  override_note?: string;
}) {
  const supabase = await createClient();
  
  // Prevent double check-in
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('meeting_id', payload.meeting_id)
    .eq('member_id', payload.member_id)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('attendance')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Registrar rejects / revokes an existing check-in sign-in for a member.
 * Deletes the sign-in record from the attendance table, reverting their status to Absent.
 */
export async function rejectCheckIn(payload: {
  meeting_id: string;
  member_id: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('meeting_id', payload.meeting_id)
    .eq('member_id', payload.member_id);

  if (error) throw error;
}

/**
 * Registrar directly grants an excused absence on behalf of a member
 * who submitted an official letter to the secretary (bypassing the member portal).
 * Upserts so that existing pending requests are promoted to 'approved'.
 */
export async function registrarGrantExcuse(payload: {
  meeting_id: string;
  member_id: string;
  reason: string;
  granted_by: string;
}) {
  const supabase = await createClient();

  // Check if there is already an absence request for this member + meeting
  const { data: existing } = await supabase
    .from('absence_requests')
    .select('id')
    .eq('meeting_id', payload.meeting_id)
    .eq('member_id', payload.member_id)
    .maybeSingle();

  if (existing) {
    // Promote the existing request to approved
    const { data, error } = await supabase
      .from('absence_requests')
      .update({
        status: 'approved',
        reason: payload.reason,
        reviewed_by: payload.granted_by,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Insert a new pre-approved request
    const { data, error } = await supabase
      .from('absence_requests')
      .insert({
        meeting_id: payload.meeting_id,
        member_id: payload.member_id,
        reason: payload.reason,
        status: 'approved',
        reviewed_by: payload.granted_by,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function getAbsenceRequests(meetingId: string) {
  const supabase = await createClient();
  return fetchAllPaginated((from, to) =>
    supabase
      .from('absence_requests')
      .select('*, members(*)')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .range(from, to)
  );
}

export async function submitAbsenceRequest(payload: {
  meeting_id: string;
  member_id: string;
  reason: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('absence_requests')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reviewAbsenceRequest(payload: {
  id: string;
  status: 'approved' | 'declined';
  reviewed_by: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('absence_requests')
    .update({ status: payload.status, reviewed_by: payload.reviewed_by })
    .eq('id', payload.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAttendanceReport(meetingId: string, commanderyId: string) {
  const supabase = await createClient();

  // 1. Fetch all members in this commandery who are on the active roll (paginated, excluding system accounts)
  const members = await fetchAllPaginated((from, to) =>
    supabase
      .from('members')
      .select('*')
      .eq('commandery_id', commanderyId)
      .not('status', 'in', '("Dismissed","Transfer-Out","Deceased","System")')
      .neq('id', 'f0000000-0000-0000-0000-000000000000')
      .not('surname', 'ilike', '%Operational Outflows%')
      .range(from, to)
  );

  // 2. Fetch all verified check-ins for this meeting (paginated)
  const attendance = await fetchAllPaginated((from, to) =>
    supabase
      .from('attendance')
      .select('*')
      .eq('meeting_id', meetingId)
      .range(from, to)
  );

  // 3. Fetch all absence requests for this meeting (paginated)
  const absences = await fetchAllPaginated((from, to) =>
    supabase
      .from('absence_requests')
      .select('*')
      .eq('meeting_id', meetingId)
      .range(from, to)
  );

  // 4. Filter out any remaining phantom system accounts and map everything together
  const realMembers = (members || []).filter(m => !isSystemMember(m) && !m.is_deceased);

  return realMembers.map(m => {
    const checkIn = (attendance || []).find(a => a.member_id === m.id);
    const absence = (absences || []).find(a => a.member_id === m.id);

    let status = 'Absent';
    if (checkIn) {
      const isQr = checkIn.method === 'qr' || checkIn.method === 'qr_scan' || (checkIn.override_note && String(checkIn.override_note).includes('QR'));
      status = checkIn.method === 'gps' ? 'Present (GPS)' : isQr ? 'Present (QR Scan)' : 'Present (Manual)';
    } else if (absence && absence.status === 'approved') {
      status = 'Excused';
    } else if (absence && absence.status === 'pending') {
      status = 'Excuse Pending';
    } else if (absence && absence.status === 'declined') {
      status = 'Absent (Excuse Declined)';
    }

    return {
      id: m.id,
      first_name: m.first_name,
      surname: m.surname,
      phone: m.phone || m.mobile,
      email: m.email,
      status,
      checkInTime: checkIn?.check_in_time || null,
      excuseReason: absence?.reason || null
    };
  });
}

export async function getMemberAttendance(memberId: string) {
  const supabase = await createAdminClient();
  return fetchAllPaginated((from, to) =>
    supabase
      .from('attendance')
      .select('*')
      .eq('member_id', memberId)
      .range(from, to)
  );
}

export async function getMemberAbsences(memberId: string) {
  const supabase = await createAdminClient();
  return fetchAllPaginated((from, to) =>
    supabase
      .from('absence_requests')
      .select('*')
      .eq('member_id', memberId)
      .range(from, to)
  );
}
