export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { createClient } from '@/lib/supabase/server';
import InitiationCohortsClient, { CohortMemberItem } from './InitiationCohortsClient';

export default async function InitiationCohortsPage() {
  await requireRegistrar();
  const supabase = await createClient();

  // 1. Fetch all members (regardless of status: Active, Deceased, Transfer-Out, Dismissed)
  const { data: members, error: mErr } = await supabase
    .from('members')
    .select('id, title, first_name, surname, other_names, date_joined, status, is_deceased, transfer_from, transfer_to, transfer_date, date_of_death, burial_place, burial_date, date_of_dismissal, notes, occupation, residential_address, photo_url')
    .neq('id', 'f0000000-0000-0000-0000-000000000000')
    .order('surname', { ascending: true });

  // 2. Fetch all historical roll book entries
  const { data: rollEntries, error: rErr } = await supabase
    .from('roll_book_entries')
    .select('*')
    .order('entry_no', { ascending: true });

  // 3. Fetch 1st degree records for any fallback dates
  const { data: degrees } = await supabase
    .from('degrees')
    .select('member_id, degree_type, degree_date, degree_place')
    .eq('degree_type', '1st Degree');

  const degreeMap = new Map<string, string>();
  if (degrees) {
    degrees.forEach(d => {
      if (d.member_id && d.degree_date) {
        degreeMap.set(d.member_id, d.degree_date);
      }
    });
  }

  // 4. Combine into unified cohort roster
  const unifiedMembers: CohortMemberItem[] = [];

  // Track linked roll book entries so they are not duplicated
  const linkedRollIds = new Set<string>();

  // Map of enrolled_member_id -> roll entry
  const enrolledMap = new Map<string, any>();
  if (rollEntries) {
    rollEntries.forEach(r => {
      if (r.enrolled_member_id) {
        enrolledMap.set(r.enrolled_member_id, r);
        linkedRollIds.add(r.id);
      }
    });
  }

  // Add members
  if (members) {
    members.forEach(m => {
      const linkedRoll = enrolledMap.get(m.id);
      // Determine initiation date: date_joined or 1st degree date or roll date
      const dateOfInitiation = m.date_joined || degreeMap.get(m.id) || linkedRoll?.date_of_initiation || null;

      // Extract entry no from notes if not in roll_book_entries (e.g. "[Roll Book #2]")
      let entryNo = linkedRoll?.entry_no || null;
      if (!entryNo && m.notes) {
        const match = m.notes.match(/Roll Book #?(\d+)/i) || m.notes.match(/Entry #?(\d+)/i);
        if (match) {
          entryNo = match[1];
        }
      }

      unifiedMembers.push({
        id: m.id,
        memberId: m.id,
        rollBookId: linkedRoll ? linkedRoll.id : null,
        entryNo: entryNo,
        title: m.title || 'Bro.',
        firstName: m.first_name || '',
        surname: m.surname || '',
        otherNames: m.other_names || '',
        fullName: [m.title, m.first_name, m.other_names, m.surname].filter(Boolean).join(' '),
        dateOfInitiation: dateOfInitiation,
        cohortYear: dateOfInitiation ? dateOfInitiation.substring(0, 4) : 'Unknown',
        status: m.status || (m.is_deceased ? 'Deceased' : 'Active'),
        isDeceased: Boolean(m.is_deceased || m.status === 'Deceased'),
        transferTo: m.transfer_to || null,
        transferDate: m.transfer_date || null,
        transferFrom: m.transfer_from || null,
        dateOfDeath: m.date_of_death || null,
        burialPlace: m.burial_place || null,
        dateOfDismissal: m.date_of_dismissal || null,
        occupation: m.occupation || linkedRoll?.occupation || null,
        residence: m.residential_address || linkedRoll?.residence || null,
        ageAtInitiation: linkedRoll?.age_at_initiation || null,
        notes: m.notes || linkedRoll?.notes || null,
        source: 'Registered Member',
        photoUrl: m.photo_url || null,
        rank: null,
        memberNumber: null
      });
    });
  }

  // Add remaining unlinked roll book entries (historical brothers awaiting auth registration)
  if (rollEntries) {
    rollEntries.forEach(r => {
      if (linkedRollIds.has(r.id)) return;
      if (r.enrolled_member_id) return;

      const dateOfInitiation = r.date_of_initiation || null;
      const cohortYear = r.cohort_year || (dateOfInitiation ? dateOfInitiation.substring(0, 4) : 'Unknown');

      unifiedMembers.push({
        id: `roll-${r.id}`,
        memberId: null,
        rollBookId: r.id,
        entryNo: r.entry_no || null,
        title: r.title || 'Bro.',
        firstName: r.first_name || '',
        surname: r.surname || '',
        otherNames: '',
        fullName: r.raw_name || [r.title, r.first_name, r.surname].filter(Boolean).join(' '),
        dateOfInitiation: dateOfInitiation,
        cohortYear: cohortYear,
        status: 'Archived Roll',
        isDeceased: false,
        transferTo: null,
        transferDate: null,
        transferFrom: null,
        dateOfDeath: null,
        burialPlace: null,
        dateOfDismissal: null,
        occupation: r.occupation || null,
        residence: r.residence || null,
        ageAtInitiation: r.age_at_initiation || null,
        notes: r.notes || null,
        source: r.source || 'Roll Book Archive',
        photoUrl: null,
        rank: null,
        memberNumber: null
      });
    });
  }

  return (
    <RegistrarShell
      title="Initiation Cohorts Directory"
      subtitle="Historical Initiation Annals — Complete rosters of brothers initiated into the Commandery grouped by ceremony date and year."
    >
      <InitiationCohortsClient initialMembers={unifiedMembers} />
    </RegistrarShell>
  );
}
