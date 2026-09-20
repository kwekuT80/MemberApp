export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireSuperAdmin } from '@/lib/auth/requireSuperAdmin';
import { createClient } from '@/lib/supabase/server';
import HistoricalMembersClient, { LedgerItem } from './HistoricalMembersClient';

export default async function HistoricalMembersPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  // 1. Fetch current members from Supabase
  const { data: members } = await supabase
    .from('members')
    .select('id, title, first_name, surname, other_names, status, is_deceased, date_joined, date_of_birth, occupation, residential_address, notes, transfer_to, transfer_date, date_of_death, burial_place, burial_date, date_of_dismissal')
    .neq('id', 'f0000000-0000-0000-0000-000000000000')
    .order('surname', { ascending: true });

  // 2. Fetch roll book entries from Supabase table
  let ledgerData: LedgerItem[] = [];
  try {
    const { data: dbLedger, error } = await supabase
      .from('roll_book_entries')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && dbLedger && dbLedger.length > 0) {
      ledgerData = dbLedger.map((r: any) => ({
        id: r.id,
        ledgerId: r.ledger_id || r.id,
        source: r.source || 'Supabase Roll Book Archive',
        entryNo: r.entry_no,
        rawName: r.raw_name,
        title: r.title || 'Bro.',
        firstName: r.first_name || '',
        surname: r.surname || '',
        dateOfInitiation: r.date_of_initiation,
        cohortYear: r.cohort_year || 'Unknown',
        residence: r.residence,
        occupation: r.occupation,
        ageAtInitiation: r.age_at_initiation,
        notes: r.notes,
        enrolledMemberId: r.enrolled_member_id || null
      }));
    }
  } catch (err) {
    // Non-blocking
  }

  return (
    <RegistrarShell
      title="Roll Book & Historical Member Archives"
      subtitle="Super Admin Master Ledger — Reconcile historical brothers, Roll of Honour, transfers, and past records."
    >
      <HistoricalMembersClient
        initialDbMembers={members || []}
        ledgerData={ledgerData}
      />
    </RegistrarShell>
  );
}
