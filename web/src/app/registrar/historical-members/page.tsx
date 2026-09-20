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

  // 2. Fetch roll book entries from Supabase table first (Option 2: Private Cloud Storage)
  let ledgerData: LedgerItem[] = [];
  try {
    const { data: dbLedger, error } = await supabase
      .from('roll_book_entries')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && dbLedger && dbLedger.length > 0) {
      ledgerData = dbLedger.map((r: any) => ({
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
        notes: r.notes
      }));
    }
  } catch (err) {
    // Non-blocking if table is being created
  }

  // 3. Fallback to local gitignored file if Supabase table is not yet seeded
  if (ledgerData.length === 0) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const localPath = path.resolve(process.cwd(), 'src/data/historicalLedgerData.json');
      if (fs.existsSync(localPath)) {
        ledgerData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      }
    } catch (e) {
      ledgerData = [];
    }
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
