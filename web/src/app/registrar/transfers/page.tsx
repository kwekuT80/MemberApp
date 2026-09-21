export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireSuperAdmin } from '@/lib/auth/requireSuperAdmin';
import { createClient } from '@/lib/supabase/server';
import TransferOutClient from './TransferOutClient';

export default async function TransfersPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  // 1. Fetch unassigned roll book entries (where enrolled_member_id is null)
  let unassignedEntries: any[] = [];
  try {
    const { data, error } = await supabase
      .from('roll_book_entries')
      .select('*')
      .is('enrolled_member_id', null)
      .order('entry_no', { ascending: true });

    if (!error && data) {
      unassignedEntries = data;
    }
  } catch (e) {
    console.error('Error fetching unassigned roll book entries:', e);
  }

  // 2. Fetch active registered members in case needed for transfer
  let activeMembers: any[] = [];
  try {
    const { data: members, error: mErr } = await supabase
      .from('members')
      .select('id, title, first_name, surname, other_names, status, date_joined, occupation, residential_address, transfer_to, transfer_date')
      .neq('id', 'f0000000-0000-0000-0000-000000000000')
      .not('status', 'in', '("Dismissed","Transfer-Out","Deceased")')
      .order('surname', { ascending: true });

    if (!mErr && members) {
      activeMembers = members;
    }
  } catch (e) {
    console.error('Error fetching registered members:', e);
  }

  return (
    <RegistrarShell
      title="Member Transfers Out"
      subtitle="Super Admin Charter Transfers — Transfer unassigned historical brothers or active members directly to daughter Commanderies."
    >
      <TransferOutClient
        initialUnassigned={unassignedEntries}
        initialActiveMembers={activeMembers}
      />
    </RegistrarShell>
  );
}
