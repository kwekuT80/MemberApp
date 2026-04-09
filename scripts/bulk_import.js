const { createClient } = require('@supabase/supabase-js');

// Config - using the values from src/db/supabase.js
const SUPABASE_URL = 'https://pcsslgufwjzvolbtygwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjc3NsZ3Vmd2p6dm9sYnR5Z3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY0OTQ5NCwiZXhwIjoyMDkwMjI1NDk0fQ.CU0VoIqKl5cd9g86jSYFxjx4qPKocmJgILxAx29sESo'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function toPgDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = String(value).match(/^(\d{2})[/\-](\d{2})[/\-](\d{2,4})$/);
  if (match) {
    let [, dd, mm, yyyy] = match;
    if (yyyy.length === 2) yyyy = (parseInt(yyyy) > 30 ? '19' : '20') + yyyy;
    return `${yyyy}-${mm}-${dd}`;
  }
  return value;
}

async function importMember(data, existingMemberId = null) {
  let memberId = existingMemberId;
  const fullName = `${data.member_info.first_name || ''} ${data.member_info.surname || ''}`.trim();
  console.log(`\n--- Processing: ${fullName} ---`);

  // 1. Members Table Payload
  const memberPayload = {
    title:               data.member_info.title               || null,
    surname:             data.member_info.surname             || null,
    first_name:          data.member_info.first_name          || null,
    other_names:         data.member_info.middle_names        || null,
    date_of_birth:       toPgDate(data.member_info.date_of_birth),
    birth_town:          data.member_info.place_of_birth      || null,
    birth_region:        data.member_info.region              || null,
    nationality:         data.member_info.nationality         || null,
    home_town:           data.member_info.home_town           || null,
    home_region:         data.member_info.home_region         || null,
    residential_address: data.member_info.residential_address || null,
    postal_address:      data.member_info.postal_address      || null,
    phone:               data.member_info.phone               || null,
    mobile:              data.member_info.mobile              || null,
    email:               data.member_info.email               || null,
    fathers_name:        data.member_info.father_name        || null,
    mothers_name:        data.member_info.mother_name        || null,
    marital_status:      data.member_info.marital_status      || null,
    emp_status:          data.member_info.employment_status   || null,
    occupation:          data.member_info.occupation          || null,
    workplace:           data.member_info.workplace           || null,
    job_status:          data.member_info.job_title           || null,
    work_address:        data.member_info.work_address        || null,
    date_joined:         toPgDate(data.member_info.date_joined) || null,
  };

  // 1b. Member Lookup
  if (!memberId) {
    const { data: existing, error: searchErr } = await supabase
      .from('members')
      .select('id')
      .eq('surname', data.member_info.surname)
      .ilike('first_name', `%${data.member_info.first_name}%`)
      .maybeSingle();

    if (existing) {
      memberId = existing.id;
      console.log(`[Info] Found existing member (ID: ${memberId}). Switching to Update mode.`);
    }
  }

  if (!memberId) {
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert(memberPayload)
      .select()
      .single();

    if (memberError) {
      console.error(`[Error] Members table:`, memberError.message);
      return;
    }
    memberId = member.id;
    console.log(`[Success] New member record created (ID: ${memberId})`);
  } else {
    // Update basic info for existing member
    const { error: updErr } = await supabase.from('members').update(memberPayload).eq('id', memberId);
    if (updErr) console.error(`[Error] Members update:`, updErr.message);
    else console.log(`[Info] Basic profile updated for existing brother.`);
  }

  // ── Clean Sub-tables for Re-insertion ──────────────────────────────────────────
  const relatedTables = ['degrees', 'children', 'emergency_contacts', 'positions', 'spouse', 'military', 'uniformed_rank_records'];
  for (const table of relatedTables) {
    await supabase.from(table).delete().eq('member_id', memberId);
  }

  // 2. Spouse Table
  if (data.member_info.spouse_name || data.spouse_info) {
    const s = data.spouse_info || {};
    const spousePayload = {
      member_id: memberId,
      spouse_name: data.member_info.spouse_name || s.name || null,
      spouse_dob: toPgDate(s.dob),
      spouse_nationality: s.nationality || null,
      spouse_denomination: s.denomination || null,
      spouse_is_sister: !!s.is_sister,
      spouse_parish: s.parish || null,
      auxiliary_name: s.auxiliary_name || null,
      auxiliary_number: s.auxiliary_number || null,
    };
    const { error: sErr } = await supabase.from('spouse').insert(spousePayload);
    if (sErr) console.error(`[Error] Spouse table:`, sErr.message);
    else console.log(`[Success] Spouse record linked.`);
  }

  // 3. Degrees Table
  if (data.degrees && data.degrees.length > 0) {
    const degreePayloads = data.degrees.map(d => ({
      member_id: memberId,
      degree_type: d.degree_type,
      degree_date: toPgDate(d.date),
      degree_place: d.place
    }));
    const { error: dErr } = await supabase.from('degrees').insert(degreePayloads);
    if (dErr) console.error(`[Error] Degrees table:`, dErr.message);
    else console.log(`[Success] ${data.degrees.length} degrees linked.`);
  }

  // 4. Children Table
  if (data.children && data.children.length > 0) {
    const childPayloads = data.children.map(c => ({
      member_id: memberId,
      child_name: typeof c === 'string' ? c : c.name,
      birth_date: toPgDate(c.dob),
      birth_place: c.place
    }));
    const { error: cErr } = await supabase.from('children').insert(childPayloads);
    if (cErr) console.error(`[Error] Children table:`, cErr.message);
    else console.log(`[Success] ${data.children.length} children linked.`);
  }

  // 5. Emergency Contacts Table
  if (data.emergency_contacts && data.emergency_contacts.length > 0) {
    const contactPayloads = data.emergency_contacts.map(e => ({
      member_id: memberId,
      contact_name: e.name,
      phone1: e.phone
    }));
    const { error: eErr } = await supabase.from('emergency_contacts').insert(contactPayloads);
    if (eErr) console.error(`[Error] Emergency Contacts:`, eErr.message);
    else console.log(`[Success] ${data.emergency_contacts.length} emergency contacts linked.`);
  }

  // 6. Military & Ranks
  if (data.ceremonial || data.member_info.current_rank) {
    // Military base record
    const millPayload = {
      member_id: memberId,
      is_military: true,
      uniform_blessed_date: toPgDate(data.ceremonial?.blessed_date),
      first_uniform_use_date: toPgDate(data.ceremonial?.first_uniform_use_date),
      current_rank: data.member_info.current_rank || null,
      commission: toPgDate(data.member_info.commission_date) || null
    };
    await supabase.from('military').insert(millPayload);

    // Rank history record
    if (data.member_info.current_rank) {
      await supabase.from('uniformed_rank_records').insert({
        member_id: memberId,
        rank_title: data.member_info.current_rank,
        commission_date: toPgDate(data.member_info.commission_date),
        is_current: true
      });
    }
    console.log(`[Success] Military/Rank info linked.`);
  }

  // 7. Positions Table
  if (data.positions && data.positions.length > 0) {
    const posPayloads = data.positions.map(p => ({
      member_id: memberId,
      position_title: typeof p === 'string' ? p : p.title,
      date_from: toPgDate(p.from),
      date_to: toPgDate(p.to)
    }));
    const { error: pErr } = await supabase.from('positions').insert(posPayloads);
    if (pErr) console.error(`[Error] Positions table:`, pErr.message);
    else console.log(`[Success] ${data.positions.length} positions linked.`);
  }

  console.log(`--- Finished: ${fullName} ---\n`);
}

module.exports = { importMember, supabase };
