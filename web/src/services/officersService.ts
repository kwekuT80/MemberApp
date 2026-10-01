'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { revalidatePath } from 'next/cache';
import {
  OfficerRoleDefinition,
  STANDARD_OFFICER_ROLES,
  normalizePositionTitle,
  AssignedOfficer,
  OfficerSlot,
  TermAdministration,
} from '@/types/officers';

export type {
  OfficerRoleDefinition,
  AssignedOfficer,
  OfficerSlot,
  TermAdministration,
};

/**
 * Fetch all local commandery positions & active members for the officers roster
 */
import { isSystemMember } from '@/lib/utils/ksji-logic';

export async function getCommanderyOfficersData() {
  const admin = await createAdminClient();

  // 1. Fetch Local positions with joined member data
  const { data: positions, error: posErr } = await admin
    .from('positions')
    .select(`
      id,
      position_title,
      level,
      date_from,
      date_to,
      member_id,
      members (
        id,
        first_name,
        surname,
        title,
        status,
        phone,
        email,
        photo_url,
        is_deceased
      )
    `)
    .eq('level', 'Local')
    .order('date_from', { ascending: false });

  if (posErr) {
    console.error('Error fetching officers positions:', posErr);
  }

  // 2. Fetch all real members for assignment picker (excludes operational/system accounts)
  const { data: members, error: memErr } = await admin
    .from('members')
    .select('id, title, first_name, surname, other_names, phone, email, photo_url, status, is_deceased, is_system, is_fictitious, member_type')
    .order('surname', { ascending: true })
    .order('first_name', { ascending: true });

  if (memErr) {
    console.error('Error fetching members list:', memErr);
  }

  // Filter out system accounts & operational outflows only
  const eligibleMembers = (members || []).filter((m) => !isSystemMember(m));

  return {
    positions: positions || [],
    members: eligibleMembers,
  };
}

/**
 * Assign or update an officer position for a given member and term
 */
export async function assignOfficerPosition(payload: {
  positionId?: string; // If updating an existing position record
  memberId: string;
  positionTitle: string;
  dateFrom: string;
  dateTo?: string | null;
}) {
  await requireRegistrar();
  const admin = await createAdminClient();

  const record = {
    member_id: payload.memberId,
    position_title: payload.positionTitle.trim(),
    level: 'Local',
    date_from: payload.dateFrom ? payload.dateFrom.trim() : null,
    date_to: payload.dateTo ? payload.dateTo.trim() : null,
  };

  const selectFields = `
    id,
    position_title,
    level,
    date_from,
    date_to,
    member_id,
    members (
      id,
      first_name,
      surname,
      title,
      status,
      phone,
      email,
      photo_url,
      is_deceased
    )
  `;

  let resultData: any = null;

  if (payload.positionId) {
    // Update existing record
    const { data, error } = await admin
      .from('positions')
      .update(record)
      .eq('id', payload.positionId)
      .select(selectFields)
      .single();

    if (error) throw new Error(error.message);
    resultData = data;
  } else {
    // Insert new record
    const { data, error } = await admin
      .from('positions')
      .insert(record)
      .select(selectFields)
      .single();

    if (error) throw new Error(error.message);
    resultData = data;
  }

  // Prevent conflicting duplicate rows for the same office in the same term
  if (resultData && record.date_from) {
    await admin
      .from('positions')
      .delete()
      .eq('position_title', record.position_title)
      .eq('date_from', record.date_from)
      .eq('level', 'Local')
      .neq('id', resultData.id);
  }

  revalidatePath('/registrar/officers');
  revalidatePath('/me/officers');
  return { success: true, data: resultData };
}

/**
 * Remove an officer assignment (for clearing erroneous self-reported records)
 */
export async function deleteOfficerPosition(positionId: string) {
  await requireRegistrar();
  const admin = await createAdminClient();

  const { error } = await admin
    .from('positions')
    .delete()
    .eq('id', positionId);

  if (error) throw new Error(error.message);

  revalidatePath('/registrar/officers');
  revalidatePath('/me/officers');
  return { success: true };
}
