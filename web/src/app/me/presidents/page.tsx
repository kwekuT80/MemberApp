export const dynamic = 'force-dynamic';

import React from 'react';
import MemberShell from '@/components/layout/MemberShell';
import { requireUser } from '@/lib/auth/requireUser';
import { createClient } from '@/lib/supabase/server';
import RollOfWorthyPresidentsClient, { PresidentItem } from '@/components/presidents/RollOfWorthyPresidentsClient';

export default async function MemberWorthyPresidentsPage() {
  await requireUser();
  const supabase = await createClient();

  // Dynamically query positions table for all Presidents of the Commandery
  const { data: dbPositions } = await supabase
    .from('positions')
    .select(`
      id,
      position_title,
      date_from,
      date_to,
      members!inner (
        id,
        title,
        first_name,
        surname,
        status,
        is_deceased
      )
    `)
    .in('position_title', ['President', 'Worthy President'])
    .order('date_from', { ascending: true });

  // Group contiguous/sequential terms for each president dynamically
  const presidentsList: PresidentItem[] = [];
  const rawList = dbPositions || [];

  let currentSeq = 1;

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    const m = item.members as any;
    if (!m) continue;

    const fromYear = item.date_from ? item.date_from.substring(0, 4) : '';
    let toYear = item.date_to ? item.date_to.substring(0, 4) : '';
    let endYearNum = toYear ? parseInt(toYear, 10) : new Date().getFullYear();

    // Combine consecutive terms for the same member
    while (i + 1 < rawList.length && (rawList[i + 1].members as any)?.id === m.id) {
      i++;
      const nextTo = rawList[i].date_to ? rawList[i].date_to.substring(0, 4) : '';
      if (nextTo) {
        toYear = nextTo;
        endYearNum = parseInt(nextTo, 10);
      } else {
        toYear = '';
      }
    }

    const startYearNum = fromYear ? parseInt(fromYear, 10) : 1996;
    const isIncumbent = !toYear || endYearNum >= 2026;

    let tenure = '';
    let duration = '';

    if (isIncumbent) {
      tenure = `${fromYear || '2026'}–Present`;
      duration = 'Incumbent';
    } else {
      tenure = `${fromYear}–${toYear}`;
      const diff = Math.max(1, endYearNum - startYearNum + 1);
      duration = `${diff} year${diff > 1 ? 's' : ''}`;
    }

    const isDeceased = m.is_deceased || String(m.status).toLowerCase() === 'deceased';

    // Format title prefix according to app convention
    let formattedTitle = m.title || 'Bro.';
    if (formattedTitle === 'N Bro.' || formattedTitle === 'N Bro') {
      formattedTitle = 'N/B';
    }

    presidentsList.push({
      no: currentSeq++,
      memberId: m.id,
      title: formattedTitle,
      name: `${m.first_name || ''} ${m.surname || ''}`.trim(),
      tenure,
      duration,
      status: m.status || (isDeceased ? 'Deceased' : 'Active'),
      isDeceased,
      isIncumbent,
    });
  }

  return (
    <MemberShell 
      title="Roll of Worthy Presidents" 
      subtitle="St. Margaret-Mary Commandery No. 500 — Historical Succession & Eternal Roll of Honor"
    >
      <RollOfWorthyPresidentsClient 
        presidentsList={presidentsList}
        isRegistrar={false}
      />
    </MemberShell>
  );
}
