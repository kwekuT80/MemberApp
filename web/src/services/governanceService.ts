'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { revalidatePath } from 'next/cache';
import {
  GovernanceHubData,
  TempleMemberRecord,
  TempleOfficerRecord,
  EnhancedCommittee,
  CommitteeMemberRecord,
} from '@/types/governance';
import {
  STANDARD_OFFICER_ROLES,
  normalizePositionTitle,
  AssignedOfficer,
  TermAdministration,
} from '@/types/officers';
import { PresidentItem } from '@/components/presidents/RollOfWorthyPresidentsClient';
import { KSJI_COMMANDERY_COMMITTEES } from '@/lib/constants/committees';
import { isSystemMember } from '@/lib/utils/ksji-logic';

export async function getGovernanceHubData(): Promise<GovernanceHubData> {
  const admin = await createAdminClient();

  // 1. Fetch all positions across all levels
  const { data: rawPositions, error: posErr } = await admin
    .from('positions')
    .select(`
      id,
      position_title,
      level,
      rank,
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
        is_deceased,
        date_of_death
      )
    `)
    .order('date_from', { ascending: false });

  if (posErr) {
    console.error('Error fetching positions in governanceService:', posErr);
  }

  // 2. Fetch all members
  const { data: rawMembers, error: memErr } = await admin
    .from('members')
    .select('id, title, first_name, surname, other_names, phone, email, photo_url, status, is_deceased, date_of_death, date_joined')
    .order('surname', { ascending: true })
    .order('first_name', { ascending: true });

  if (memErr) {
    console.error('Error fetching members in governanceService:', memErr);
  }

  const eligibleMembers = (rawMembers || []).filter((m) => !isSystemMember(m));
  const memberMap = new Map<string, any>();
  eligibleMembers.forEach((m) => memberMap.set(m.id, m));

  // 3. Fetch all degrees
  const { data: rawDegrees, error: degErr } = await admin
    .from('degrees')
    .select('id, member_id, degree_type, degree_date, degree_place')
    .order('degree_date', { ascending: false });

  if (degErr) {
    console.error('Error fetching degrees in governanceService:', degErr);
  }

  // ── A. Build Officers Administrations (Local Positions) ───────────────────
  const localPositions = (rawPositions || []).filter((p) => p.level === 'Local');
  const administrationsMap = new Map<string, TermAdministration>();

  // Determine standard biennial terms (e.g. 2026-2027, 2024-2025, etc.)
  const currentYear = new Date().getFullYear();
  const currentTermStart = currentYear % 2 === 0 ? currentYear : currentYear - 1;

  localPositions.forEach((pos) => {
    const m = pos.members as any;
    if (!m) return;

    const fromYear = pos.date_from ? parseInt(pos.date_from.substring(0, 4), 10) : currentTermStart;
    const termStart = fromYear % 2 === 0 ? fromYear : fromYear - 1;
    const termEnd = termStart + 1;
    const termKey = `${termStart}-${termEnd}`;

    if (!administrationsMap.has(termKey)) {
      administrationsMap.set(termKey, {
        termKey,
        startYear: termStart,
        endYear: termEnd,
        label: termStart >= currentTermStart ? `${termStart}–Present (Incumbent)` : `${termStart}–${termEnd} Administration`,
        isCurrent: termStart >= currentTermStart,
        slots: STANDARD_OFFICER_ROLES.map((r) => ({ role: r, assigned: null })),
        additionalOfficers: [],
      });
    }

    const adminItem = administrationsMap.get(termKey)!;
    const canonicalTitle = normalizePositionTitle(pos.position_title);

    const isIncumbent = !pos.date_to || parseInt(pos.date_to.substring(0, 4), 10) >= currentYear;
    const tenureDisplay = pos.date_from
      ? `${pos.date_from.substring(0, 4)} – ${pos.date_to ? pos.date_to.substring(0, 4) : 'Present'}`
      : 'Tenure Unspecified';

    const assignedObj: AssignedOfficer = {
      positionId: pos.id,
      memberId: m.id,
      title: m.title || 'Bro.',
      firstName: m.first_name || '',
      surname: m.surname || '',
      memberTitle: m.title,
      phone: m.phone,
      email: m.email,
      photoUrl: m.photo_url,
      status: m.status,
      positionTitle: pos.position_title,
      level: pos.level,
      dateFrom: pos.date_from,
      dateTo: pos.date_to,
      tenureDisplay,
      isIncumbent,
    };

    const slot = adminItem.slots.find((s) => s.role.title === canonicalTitle);
    if (slot && !slot.assigned) {
      slot.assigned = assignedObj;
    } else {
      adminItem.additionalOfficers.push(assignedObj);
    }
  });

  // Sort administrations descending
  const administrations = Array.from(administrationsMap.values()).sort(
    (a, b) => b.startYear - a.startYear
  );

  const currentTerm = administrations.find((a) => a.isCurrent) || administrations[0] || null;

  // ── B. Build Board of Trustees ─────────────────────────────────────────────
  // 1. Current Incumbent President (Chairman)
  const chairman =
    currentTerm?.slots.find((s) => s.role.id === 'worthy_president')?.assigned || null;

  // 2. Elected Trustees (1st, 2nd, 3rd)
  const electedTrustees = (currentTerm?.slots || [])
    .filter((s) => s.role.category === 'trustees' && s.assigned)
    .map((s) => s.assigned!);

  // 3. Executive Officers (1st VP, 2nd VP, Recording Sec, Asst Sec, Financial Sec, Treasurer)
  const executiveOfficers = (currentTerm?.slots || [])
    .filter(
      (s) =>
        s.role.category === 'commandery' &&
        s.role.id !== 'worthy_president' &&
        s.assigned
    )
    .map((s) => s.assigned!);

  // 4. Roll of Past Worthy Presidents
  const dbPresidents = (localPositions || [])
    .filter((p) => {
      const t = (p.position_title || '').trim().toLowerCase();
      return t === 'president' || t === 'worthy president' || t.includes('worthy president');
    })
    .sort((a, b) => (a.date_from || '').localeCompare(b.date_from || ''));

  const pastPresidents: PresidentItem[] = [];
  let seq = 1;

  for (let i = 0; i < dbPresidents.length; i++) {
    const p = dbPresidents[i];
    const m = p.members as any;
    if (!m) continue;

    const fromYear = p.date_from ? p.date_from.substring(0, 4) : '';
    let toYear = p.date_to ? p.date_to.substring(0, 4) : '';
    let endYearNum = toYear ? parseInt(toYear, 10) : currentYear;

    // Combine contiguous terms for the same president
    while (i + 1 < dbPresidents.length && (dbPresidents[i + 1].members as any)?.id === m.id) {
      i++;
      const nextTo = dbPresidents[i].date_to ? dbPresidents[i].date_to.substring(0, 4) : '';
      if (nextTo) {
        toYear = nextTo;
        endYearNum = parseInt(nextTo, 10);
      } else {
        toYear = '';
      }
    }

    const startYearNum = fromYear ? parseInt(fromYear, 10) : 1996;
    const isIncumbentPres = !toYear || endYearNum >= currentYear;

    let tenure = '';
    let duration = '';
    if (isIncumbentPres) {
      tenure = `${fromYear || currentYear}–Present`;
      duration = 'Incumbent';
    } else {
      tenure = `${fromYear}–${toYear}`;
      const diff = Math.max(1, endYearNum - startYearNum + 1);
      duration = `${diff} year${diff > 1 ? 's' : ''}`;
    }

    const isDeceased = m.is_deceased || String(m.status).toLowerCase() === 'deceased';
    const isTransferred = String(m.status).toLowerCase() === 'transfer-out' || String(m.status).toLowerCase() === 'transferred';
    let formattedTitle = m.title || 'Bro.';
    if (formattedTitle === 'N Bro.' || formattedTitle === 'N Bro') {
      formattedTitle = 'N/B';
    }

    pastPresidents.push({
      no: seq++,
      memberId: m.id,
      title: formattedTitle,
      name: `${m.first_name || ''} ${m.surname || ''}`.trim(),
      tenure,
      duration,
      status: m.status || (isDeceased ? 'Deceased' : isTransferred ? 'Transfer-Out' : 'Active'),
      isDeceased,
      isIncumbent: isIncumbentPres,
      isTransferred,
    });
  }

  // 5. Active Life Trustees on the Board of Trustees
  // Under KSJI governance, only living past presidents in active standing in Commandery No. 500
  // serve on the Board of Trustees as Life Trustees. Deceased and transferred past presidents do not sit on the Board.
  const activeLifeTrustees = pastPresidents
    .filter(
      (p) =>
        !p.isDeceased &&
        !p.isIncumbent &&
        !p.isTransferred &&
        p.status !== 'Transfer-Out' &&
        p.status !== 'Transferred' &&
        p.status !== 'Dismissed'
    )
    .map((p, idx) => ({
      ...p,
      no: idx + 1,
    }));

  // ── C. Build Degree Temples Data ───────────────────────────────────────────
  // 1. 4th Degree (Chevaliers) - Archbishop William Porter Chapter of Chevaliers
  const deg4List = (rawDegrees || []).filter((d) => {
    const t = String(d.degree_type || '').toLowerCase();
    return t.includes('4th') || t.includes('fourth') || t.includes('chevalier');
  });

  const chevaliersRoster: TempleMemberRecord[] = [];
  const seenChevIds = new Set<string>();

  deg4List.forEach((d) => {
    const m = memberMap.get(d.member_id);
    if (!m || seenChevIds.has(m.id)) return;
    seenChevIds.add(m.id);

    const yr = d.degree_date ? parseInt(d.degree_date.substring(0, 4), 10) : null;
    const yearsInDegree = yr ? Math.max(0, currentYear - yr) : null;
    const isDeceased = m.is_deceased || String(m.status).toLowerCase() === 'deceased';

    chevaliersRoster.push({
      id: d.id,
      memberId: m.id,
      name: `${m.first_name || ''} ${m.surname || ''}`.trim(),
      title: m.title || 'Chev.',
      phone: m.phone,
      email: m.email,
      photoUrl: m.photo_url,
      conferralDate: d.degree_date,
      conferralPlace: d.degree_place || 'Archbishop William Porter Chapter',
      yearsInDegree,
      status: m.status || (isDeceased ? 'Deceased' : 'Active'),
      isDeceased,
    });
  });

  // Sort Chevaliers by conferral date descending
  chevaliersRoster.sort((a, b) => (b.conferralDate || '').localeCompare(a.conferralDate || ''));

  // Chevaliers Chapter Officers
  const chapterPositions = (rawPositions || []).filter((p) => {
    const lvl = (p.level || '').toLowerCase();
    const title = (p.position_title || '').toLowerCase();
    return (
      lvl === 'chapter' ||
      lvl === 'chevaliers chapter' ||
      title.includes('chapter') ||
      title.includes('grand master') ||
      title.includes('chevalier')
    );
  });

  const chevalierOfficers: TempleOfficerRecord[] = chapterPositions.map((p) => {
    const m = p.members as any;
    return {
      positionId: p.id,
      memberId: p.member_id,
      name: m ? `${m.first_name || ''} ${m.surname || ''}`.trim() : 'Unknown Member',
      title: m?.title || 'Chev.',
      positionTitle: p.position_title,
      dateFrom: p.date_from,
      dateTo: p.date_to,
      isIncumbent: !p.date_to || parseInt(p.date_to.substring(0, 4), 10) >= currentYear,
    };
  });

  // 2. 5th Degree (Nobles) - Accra West Nobles’ Temple
  const deg5List = (rawDegrees || []).filter((d) => {
    const t = String(d.degree_type || '').toLowerCase();
    return t.includes('5th') || t.includes('fifth') || t.includes('noble');
  });

  const noblesRoster: TempleMemberRecord[] = [];
  const seenNobleIds = new Set<string>();

  // Add all degree 5 records
  deg5List.forEach((d) => {
    const m = memberMap.get(d.member_id);
    if (!m || seenNobleIds.has(m.id)) return;
    seenNobleIds.add(m.id);

    const yr = d.degree_date ? parseInt(d.degree_date.substring(0, 4), 10) : null;
    const yearsInDegree = yr ? Math.max(0, currentYear - yr) : null;
    const isDeceased = m.is_deceased || String(m.status).toLowerCase() === 'deceased';

    noblesRoster.push({
      id: d.id,
      memberId: m.id,
      name: `${m.first_name || ''} ${m.surname || ''}`.trim(),
      title: m.title || 'N/B',
      phone: m.phone,
      email: m.email,
      photoUrl: m.photo_url,
      conferralDate: d.degree_date,
      conferralPlace: d.degree_place || 'Accra West Nobles’ Temple',
      yearsInDegree,
      status: m.status || (isDeceased ? 'Deceased' : 'Active'),
      isDeceased,
    });
  });

  // Also include any members who have title Noble Brother / N/B if not already in roster
  eligibleMembers.forEach((m) => {
    const t = (m.title || '').toLowerCase();
    if ((t.includes('noble') || t.includes('n/b') || t.startsWith('n bro')) && !seenNobleIds.has(m.id)) {
      seenNobleIds.add(m.id);
      const isDeceased = m.is_deceased || String(m.status).toLowerCase() === 'deceased';
      noblesRoster.push({
        id: `title-noble-${m.id}`,
        memberId: m.id,
        name: `${m.first_name || ''} ${m.surname || ''}`.trim(),
        title: m.title || 'N/B',
        phone: m.phone,
        email: m.email,
        photoUrl: m.photo_url,
        conferralDate: null,
        conferralPlace: 'Accra West Nobles’ Temple',
        yearsInDegree: null,
        status: m.status || (isDeceased ? 'Deceased' : 'Active'),
        isDeceased,
      });
    }
  });

  // Sort Nobles by conferral date descending
  noblesRoster.sort((a, b) => (b.conferralDate || '').localeCompare(a.conferralDate || ''));

  // Nobles Temple Officers
  const templePositions = (rawPositions || []).filter((p) => {
    const lvl = (p.level || '').toLowerCase();
    const title = (p.position_title || '').toLowerCase();
    return (
      lvl === 'nobles temple' ||
      lvl === 'temple' ||
      title.includes('temple') ||
      title.includes('noble grandmaster') ||
      title.includes('noble grand master')
    );
  });

  const nobleOfficers: TempleOfficerRecord[] = templePositions.map((p) => {
    const m = p.members as any;
    return {
      positionId: p.id,
      memberId: p.member_id,
      name: m ? `${m.first_name || ''} ${m.surname || ''}`.trim() : 'Unknown Member',
      title: m?.title || 'N/B',
      positionTitle: p.position_title,
      dateFrom: p.date_from,
      dateTo: p.date_to,
      isIncumbent: !p.date_to || parseInt(p.date_to.substring(0, 4), 10) >= currentYear,
    };
  });

  // ── D. Build Standing Committees Data ──────────────────────────────────────
  const committeePositions = (rawPositions || []).filter((p) => p.level === 'Committee');

  const committees: EnhancedCommittee[] = KSJI_COMMANDERY_COMMITTEES.map((comDef) => {
    const assigned: CommitteeMemberRecord[] = [];

    committeePositions.forEach((pos) => {
      const posTitle = (pos.position_title || '').toLowerCase();
      const rank = (pos.rank || '').toLowerCase();
      // Match committee by ID or shortName
      if (
        posTitle.includes(comDef.shortName.toLowerCase()) ||
        posTitle.includes(comDef.id.toLowerCase()) ||
        rank.includes(comDef.id.toLowerCase())
      ) {
        const m = pos.members as any;
        if (!m) return;
        let roleInCom = 'Member';
        if (posTitle.includes('chair') || rank.includes('chair')) {
          roleInCom = 'Chairman';
        } else if (posTitle.includes('sec') || rank.includes('sec')) {
          roleInCom = 'Secretary';
        } else if (posTitle.includes('vice') || rank.includes('vice')) {
          roleInCom = 'Vice Chairman';
        } else if (pos.rank) {
          roleInCom = pos.rank;
        }

        assigned.push({
          positionId: pos.id,
          memberId: m.id,
          name: `${m.first_name || ''} ${m.surname || ''}`.trim(),
          title: m.title || 'Bro.',
          committeeRole: roleInCom,
          dateFrom: pos.date_from,
          dateTo: pos.date_to,
        });
      }
    });

    const activeChair = assigned.find((a) => a.committeeRole.toLowerCase().includes('chair')) || null;

    return {
      ...comDef,
      assignedMembers: assigned,
      activeChair,
    };
  });

  return {
    officers: {
      administrations,
      currentTerm,
    },
    boardOfTrustees: {
      chairman,
      electedTrustees,
      executiveOfficers,
      activeLifeTrustees,
      pastPresidents,
    },
    degreeTemples: {
      chevaliersChapter: {
        name: 'Archbishop William Porter Chapter of Chevaliers',
        shortName: 'Chapter of Chevaliers',
        degreeLevel: '4th Degree',
        badgeLabel: 'Chevalier (Chev.)',
        crestEmoji: '🏅',
        themeColor: '#1E3A8A',
        accentBg: 'linear-gradient(135deg, rgba(30, 58, 138, 0.08) 0%, rgba(201, 168, 76, 0.12) 100%)',
        borderColor: '#3B82F6',
        leadershipTitle: 'Grand Master & Chapter Officers',
        description:
          'Solemn chivalric body for 4th Degree Chevaliers consecrated under the patronage of Archbishop William Porter. Preserves advanced knightly ceremonies, chivalric formation, and heraldic honors.',
        roster: chevaliersRoster,
        officers: chevalierOfficers,
      },
      noblesTemple: {
        name: 'Accra West Nobles’ Temple',
        shortName: 'Nobles’ Temple',
        degreeLevel: '5th Degree',
        badgeLabel: 'Noble Brother (N/B)',
        crestEmoji: '👑',
        themeColor: '#800020',
        accentBg: 'linear-gradient(135deg, rgba(128, 0, 32, 0.08) 0%, rgba(201, 168, 76, 0.15) 100%)',
        borderColor: '#C9A84C',
        leadershipTitle: 'Noble Grand Master & Temple Officers',
        description:
          'The apex fraternal sanctuary of the Knights of St. John International. Comprises elevated Noble Brothers vested with the highest ceremonial and deliberative responsibilities of the Order.',
        roster: noblesRoster,
        officers: nobleOfficers,
      },
    },
    committees,
    allEligibleMembers: eligibleMembers.map((m) => ({
      id: m.id,
      title: m.title || 'Bro.',
      firstName: m.first_name || '',
      surname: m.surname || '',
      status: m.status || 'Active',
      isDeceased: m.is_deceased || String(m.status).toLowerCase() === 'deceased',
    })),
  };
}

/**
 * Assign a member to a Standing Committee
 */
export async function assignCommitteeMember(payload: {
  memberId: string;
  committeeId: string;
  committeeRole: string; // e.g. "Chairman", "Secretary", "Member"
  dateFrom: string;
  dateTo?: string | null;
}) {
  await requireRegistrar();
  const admin = await createAdminClient();

  const committee = KSJI_COMMANDERY_COMMITTEES.find((c) => c.id === payload.committeeId);
  const committeeName = committee ? committee.shortName : payload.committeeId;

  const positionTitle = `${committeeName} Committee — ${payload.committeeRole}`;

  const { data, error } = await admin
    .from('positions')
    .insert({
      member_id: payload.memberId,
      position_title: positionTitle,
      level: 'Committee',
      rank: payload.committeeRole,
      date_from: payload.dateFrom || null,
      date_to: payload.dateTo || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/registrar/governance');
  revalidatePath('/me/governance');
  return { success: true, data };
}

/**
 * Remove a committee member assignment
 */
export async function removeCommitteeMember(positionId: string) {
  await requireRegistrar();
  const admin = await createAdminClient();

  const { error } = await admin
    .from('positions')
    .delete()
    .eq('id', positionId)
    .eq('level', 'Committee');

  if (error) throw new Error(error.message);

  revalidatePath('/registrar/governance');
  revalidatePath('/me/governance');
  return { success: true };
}

/**
 * Assign a Temple / Chapter Officer
 */
export async function assignTempleOfficer(payload: {
  memberId: string;
  templeLevel: 'Nobles Temple' | 'Chapter';
  positionTitle: string;
  dateFrom: string;
  dateTo?: string | null;
}) {
  await requireRegistrar();
  const admin = await createAdminClient();

  const { data, error } = await admin
    .from('positions')
    .insert({
      member_id: payload.memberId,
      position_title: payload.positionTitle.trim(),
      level: payload.templeLevel,
      date_from: payload.dateFrom || null,
      date_to: payload.dateTo || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/registrar/governance');
  revalidatePath('/me/governance');
  return { success: true, data };
}

/**
 * Remove a Temple / Chapter Officer
 */
export async function removeTempleOfficer(positionId: string) {
  await requireRegistrar();
  const admin = await createAdminClient();

  const { error } = await admin
    .from('positions')
    .delete()
    .eq('id', positionId);

  if (error) throw new Error(error.message);

  revalidatePath('/registrar/governance');
  revalidatePath('/me/governance');
  return { success: true };
}
