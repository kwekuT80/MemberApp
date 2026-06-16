'use server';

import { createClient } from '@/lib/supabase/server';

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
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('commandery_id', commanderyId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
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
  const { data, error } = await supabase
    .from('absence_requests')
    .select('*, members(*)')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
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

  // 1. Fetch all members in this commandery who are on the active roll
  const { data: members, error: memError } = await supabase
    .from('members')
    .select('*')
    .eq('commandery_id', commanderyId)
    .not('status', 'in', '("Dismissed","Transfer-Out","Deceased")');
  if (memError) throw memError;

  // 2. Fetch all verified check-ins for this meeting
  const { data: attendance, error: attError } = await supabase
    .from('attendance')
    .select('*')
    .eq('meeting_id', meetingId);
  if (attError) throw attError;

  // 3. Fetch all absence requests for this meeting
  const { data: absences, error: absError } = await supabase
    .from('absence_requests')
    .select('*')
    .eq('meeting_id', meetingId);
  if (absError) throw absError;

  // 4. Map everything together
  return (members || []).map(m => {
    const checkIn = (attendance || []).find(a => a.member_id === m.id);
    const absence = (absences || []).find(a => a.member_id === m.id);

    let status = 'Absent';
    if (checkIn) {
      status = checkIn.method === 'gps' ? 'Present (GPS)' : 'Present (Manual)';
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
