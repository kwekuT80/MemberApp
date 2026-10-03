export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { createClient } from '@/lib/supabase/server';
import { getAllMemberSummaries } from '@/services/financialService';
import BroadcastComposerClient from './BroadcastComposerClient';

export interface EnrichedBroadcastMember {
  id: string;
  fullName: string;
  title: string;
  email: string | null;
  phone: string | null;
  status: string;
  highestDegree: 'Noble (5th Degree)' | 'Chevalier (4th Degree)' | 'Knight (3rd Degree)' | 'Knight (2nd Degree)' | 'Knight (1st Degree)';
  isNoble: boolean;
  isChevalier: boolean;
  isPastPresident: boolean;
  isTrustee: boolean;
  cohortYear: string;
  totalAssessed: number;
  totalPaid: number;
  outstandingBalance: number;
  paymentStatus: string;
  activePositions: string[];
}

export default async function BroadcastComposerPage() {
  await requireRegistrar();
  const supabase = await createClient();

  // 1. Fetch living active members (excluding deceased, dismissed, transferred)
  const { data: members } = await supabase
    .from('members')
    .select('id, title, first_name, surname, other_names, email, phone, status, is_deceased, date_joined, commandery_id')
    .neq('id', 'f0000000-0000-0000-0000-000000000000')
    .not('status', 'in', '("Dismissed","Transfer-Out","Deceased","System")')
    .order('surname', { ascending: true });

  // 2. Fetch all degrees
  const { data: degrees } = await supabase
    .from('degrees')
    .select('member_id, degree_type, degree_date');

  // 3. Fetch leadership positions
  const { data: positions } = await supabase
    .from('positions')
    .select('member_id, position_title, date_from, date_to');

  // 4. Fetch financial summaries
  let financialMap = new Map<string, any>();
  try {
    const summaries = await getAllMemberSummaries();
    summaries.forEach((s: any) => {
      financialMap.set(s.id || s.member_id, s);
    });
  } catch (err) {
    console.warn('Could not load financial summaries for composer:', err);
  }

  // Build degree lookup
  const memberDegreesMap = new Map<string, any[]>();
  (degrees || []).forEach((d) => {
    if (d.member_id) {
      if (!memberDegreesMap.has(d.member_id)) {
        memberDegreesMap.set(d.member_id, []);
      }
      memberDegreesMap.get(d.member_id)!.push(d);
    }
  });

  // Build positions lookup
  const memberPositionsMap = new Map<string, any[]>();
  (positions || []).forEach((p) => {
    if (p.member_id) {
      if (!memberPositionsMap.has(p.member_id)) {
        memberPositionsMap.set(p.member_id, []);
      }
      memberPositionsMap.get(p.member_id)!.push(p);
    }
  });

  // Enrich members list
  const enrichedMembers: EnrichedBroadcastMember[] = (members || [])
    .filter((m) => !m.is_deceased && String(m.status || '').toLowerCase() !== 'deceased')
    .map((m) => {
      const memDegrees = memberDegreesMap.get(m.id) || [];
      const memPositions = memberPositionsMap.get(m.id) || [];
      const fin = financialMap.get(m.id);

      const has5th =
        memDegrees.some((d) => {
          const t = String(d.degree_type || '').toLowerCase();
          return t.includes('5th') || t.includes('fifth') || t.includes('noble');
        }) || String(m.title || '').toLowerCase().includes('noble');

      const has4th = memDegrees.some((d) => {
        const t = String(d.degree_type || '').toLowerCase();
        return t.includes('4th') || t.includes('fourth') || t.includes('chevalier');
      });

      const isTransferredOrDismissed =
        ['transfer-out', 'dismissed', 'deceased'].includes(String(m.status || '').toLowerCase()) ||
        Boolean(m.is_deceased);

      const isPastPresident =
        !isTransferredOrDismissed &&
        memPositions.some((p) => {
          const t = String(p.position_title || '').toLowerCase();
          return (
            t.includes('past worthy president') ||
            ((t.includes('worthy president') || t === 'president') && p.date_to)
          );
        });

      const isTrustee =
        !isTransferredOrDismissed &&
        (memPositions.some((p) => {
          const t = String(p.position_title || '').toLowerCase();
          return t.includes('trustee');
        }) || isPastPresident);

      let highestDegree: EnrichedBroadcastMember['highestDegree'] = 'Knight (1st Degree)';
      if (has5th) highestDegree = 'Noble (5th Degree)';
      else if (has4th) highestDegree = 'Chevalier (4th Degree)';
      else if (memDegrees.some((d) => String(d.degree_type || '').includes('3rd'))) highestDegree = 'Knight (3rd Degree)';
      else if (memDegrees.some((d) => String(d.degree_type || '').includes('2nd'))) highestDegree = 'Knight (2nd Degree)';

      // Cohort year
      const firstDeg = memDegrees.find((d) => String(d.degree_type || '').includes('1st'));
      const cohortDate = m.date_joined || firstDeg?.degree_date;
      const cohortYear = cohortDate ? String(cohortDate).substring(0, 4) : 'Unknown';

      const activePositions = memPositions
        .filter((p) => !p.date_to)
        .map((p) => p.position_title);

      const totalAssessed = fin ? parseFloat(fin.total_assessed || 0) : 0;
      const totalPaid = fin ? parseFloat(fin.total_paid || 0) : 0;
      const outstandingBalance = fin ? parseFloat(fin.outstanding_balance || 0) : 0;
      const paymentStatus = fin ? fin.payment_status || 'delinquent' : 'unassessed_new';

      return {
        id: m.id,
        fullName: [m.title, m.first_name, m.other_names, m.surname].filter(Boolean).join(' '),
        title: m.title || 'Bro.',
        email: m.email || null,
        phone: m.phone || null,
        status: m.status || 'Active',
        highestDegree,
        isNoble: has5th,
        isChevalier: has4th,
        isPastPresident,
        isTrustee,
        cohortYear,
        totalAssessed,
        totalPaid,
        outstandingBalance,
        paymentStatus,
        activePositions,
      };
    });

  return (
    <RegistrarShell
      title="Targeted Broadcast Composer"
      subtitle="Send communications across Active Members, Committees, Trustees, Nobles, Chevaliers, and Cohorts"
    >
      <BroadcastComposerClient members={enrichedMembers} />
    </RegistrarShell>
  );
}
