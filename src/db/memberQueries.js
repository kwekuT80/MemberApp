// src/db/memberQueries.js
// All data operations via Supabase.
// FIXED: All subform saves now look up member_id automatically if not provided.

import { supabase } from './supabase';

// ── Auth helpers ───────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * GATEKEEPER SERVICE: Checks if an email or phone number exists in the 
 * pre-populated masterlist (members table) to prevent unauthorized registrations.
 */
/**
 * GATEKEEPER SERVICE: Strictly prioritized authorization check.
 * Priority: 1. Email, 2. Phone, 3. Name
 */
export async function isUserAuthorized(email, phone, firstName, surname) {
  // 1. Primary: Email Match
  if (email) {
    const { data: eMatch } = await supabase.from('members').select('id').is('user_id', null).eq('email', email);
    if (eMatch && eMatch.length > 0) return true;
  }

  // 2. Secondary: Phone Match
  if (phone) {
    const { data: pMatch } = await supabase.from('members').select('id').is('user_id', null)
      .or(`phone.eq.${phone},mobile.eq.${phone}`);
    if (pMatch && pMatch.length > 0) return true;
  }

  // 3. Fallback: Name Match
  if (firstName && surname) {
    const { data: nMatch } = await supabase.from('members').select('id').is('user_id', null)
      .eq('first_name', firstName).eq('surname', surname);
    if (nMatch && nMatch.length > 0) return true;
  }

  return false;
}

/**
 * Priority Linker: Matches by Email, then Phone, then Name.
 */
export async function linkMemberRecord(email, userId, phone, firstName, surname) {
  if (!userId) return;

  // Function to perform the actual update
  const claim = async (column, value, fallbackMode = false) => {
    let query = supabase.from('members').update({ user_id: userId }).is('user_id', null);
    
    if (fallbackMode === 'phone') {
      query = query.or(`phone.eq.${value},mobile.eq.${value}`);
    } else if (fallbackMode === 'name') {
      query = query.eq('first_name', firstName).eq('surname', surname);
    } else {
      query = query.eq(column, value);
    }

    const { data, error } = await query.select();
    return { data, error };
  };

  // 1. Try Email
  if (email) {
    const { data } = await claim('email', email);
    if (data && data.length > 0) return; // Linked!
  }

  // 2. Try Phone
  if (phone) {
    const { data } = await claim(null, phone, 'phone');
    if (data && data.length > 0) return; // Linked!
  }

  // 3. Try Name
  if (firstName && surname) {
    await claim(null, null, 'name');
  }
}

  if (error) {
    console.warn('Auto-linking failed:', error.message);
  } else if (data && data.length > 0) {
    console.log(`Successfully linked ${data.length} records for user ${userId}`);
  }
}

function toPgDate(value) {
  if (!value) return null;

  // Already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // Convert DD/MM/YYYY -> YYYY-MM-DD
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }

  return value;
}

// Helper — gets the current user's member record ID
async function getMyMemberId() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');
  const { data, error } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (error || !data) throw new Error('Please save your main profile first.');
  return data.id;
}

// ── Members ────────────────────────────────────────────────────────────────────

export async function getMyMemberRecord() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getMemberRecord(id) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function saveMember(form) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  const payload = {
    user_id:             form.user_id || user.id,
    title:               form.title               || null,
    surname:             form.surname             || null,
    first_name:          form.first_name          || null,
    other_names:         form.other_names         || null,
    date_of_birth:       form.date_of_birth       || null,
    birth_town:          form.birth_town          || null,
    birth_region:        form.birth_region        || null,
    nationality:         form.nationality         || null,
    home_town:           form.home_town           || null,
    home_region:         form.home_region         || null,
    residential_address: form.residential_address || null,
    postal_address:      form.postal_address      || null,
    phone:               form.phone               || null,
    mobile:              form.mobile              || null,
    email:               form.email               || null,
    fathers_name:        form.fathers_name        || null,
    mothers_name:        form.mothers_name        || null,
    marital_status:      form.marital_status      || null,
    emp_status:          form.emp_status          || null,
    occupation:          form.occupation          || null,
    workplace:           form.workplace           || null,
    job_status:          form.job_status          || null,
    work_address:        form.work_address        || null,
    uniform_positions:   form.uniform_positions   || null,
    degree1_place:       form.degree1_place       || null,
    degree23_place:      form.degree23_place      || null,
    degree4_place:       form.degree4_place       || null,
    degree_noble_place:  form.degree_noble_place  || null,
    date_joined:         form.date_joined         || null,
    // [NEW] Lifecycle & Status
    status:              form.status              || 'Active',
    is_deceased:         !!form.is_deceased,
    date_of_death:       form.date_of_death       || null,
    burial_date:         form.burial_date         || null,
    burial_place:        form.burial_place        || null,
    transfer_from:       form.transfer_from       || null,
    transfer_to:         form.transfer_to         || null,
    transfer_date:       form.transfer_date       || null,
  };

  if (form.id) {
    const { data, error } = await supabase
      .from('members')
      .update(payload)
      .eq('id', form.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('members')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

// ── Children ───────────────────────────────────────────────────────────────────

export async function getChildren(memberId) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('member_id', memberId)
    .order('id');
  if (error) throw error;
  return data || [];
}

export async function saveChild(item) {
  const memberId = item.member_id || await getMyMemberId();
  if (item.id) {
    const { error } = await supabase
      .from('children')
      .update({
        child_name:  item.child_name  || null,
        birth_date:  item.birth_date  || null,
        birth_place: item.birth_place || null,
      })
      .eq('id', item.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('children')
      .insert({
        member_id:   memberId,
        child_name:  item.child_name  || null,
        birth_date:  item.birth_date  || null,
        birth_place: item.birth_place || null,
      });
    if (error) throw error;
  }
}

export async function deleteChild(id) {
  const { error } = await supabase.from('children').delete().eq('id', id);
  if (error) throw error;
}

// ── Positions ──────────────────────────────────────────────────────────────────

export async function getPositions(memberId) {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('member_id', memberId)
    .order('date_from', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function savePosition(item) {
  const memberId = item.member_id || await getMyMemberId();
  if (item.id) {
    const { error } = await supabase
      .from('positions')
      .update({
        position_title: item.position_title || null,
        date_from:      item.date_from      || null,
        date_to:        item.date_to        || null,
      })
      .eq('id', item.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('positions')
      .insert({
        member_id:      memberId,
        position_title: item.position_title || null,
        date_from:      item.date_from      || null,
        date_to:        item.date_to        || null,
      });
    if (error) throw error;
  }
}

export async function deletePosition(id) {
  const { error } = await supabase.from('positions').delete().eq('id', id);
  if (error) throw error;
}

// ── Emergency Contacts ─────────────────────────────────────────────────────────

export async function getEmergencyContacts(memberId) {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('member_id', memberId)
    .order('id');
  if (error) throw error;
  return data || [];
}

export async function saveEmergencyContact(item) {
  const memberId = item.member_id || await getMyMemberId();
  if (item.id) {
    const { error } = await supabase
      .from('emergency_contacts')
      .update({
        contact_name: item.contact_name || null,
        relationship: item.relationship || null,
        phone1:       item.phone1       || null,
        phone2:       item.phone2       || null,
      })
      .eq('id', item.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('emergency_contacts')
      .insert({
        member_id:    memberId,
        contact_name: item.contact_name || null,
        relationship: item.relationship || null,
        phone1:       item.phone1       || null,
        phone2:       item.phone2       || null,
      });
    if (error) throw error;
  }
}

export async function deleteEmergencyContact(id) {
  const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);
  if (error) throw error;
}

// ── Military ───────────────────────────────────────────────────────────────────

export async function getMilitary(memberId) {
  const { data, error } = await supabase
    .from('military')
    .select('*')
    .eq('member_id', memberId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || { member_id: memberId, is_military: false };
}

export async function saveMilitary(item) {
  const memberId = item.member_id || await getMyMemberId();
  const payload = {
    is_military:            item.is_military            || false,
    uniform_blessed_date:   item.uniform_blessed_date   || null,
    first_uniform_use_date: item.first_uniform_use_date || null,
    current_rank:           item.current_rank           || null,
    commission:             item.commission             || null,
  };
  const existing = await getMilitary(memberId);
  if (existing.id) {
    const { error } = await supabase
      .from('military')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('military')
      .insert({ member_id: memberId, ...payload });
    if (error) throw error;
  }
}

// ── Degrees ────────────────────────────────────────────────────────────────────

export async function getDegrees(memberId) {
  const { data, error } = await supabase
    .from('degrees')
    .select('*')
    .eq('member_id', memberId)
    .order('degree_date');
  if (error) throw error;
  return data || [];
}

export async function saveDegree(item) {
  const memberId = item.member_id || await getMyMemberId();
  if (item.id) {
    const { error } = await supabase
      .from('degrees')
      .update({
        degree_type:  item.degree_type  || null,
        degree_date:  item.degree_date  || null,
        degree_place: item.degree_place || null,
      })
      .eq('id', item.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('degrees')
      .insert({
        member_id:    memberId,
        degree_type:  item.degree_type  || null,
        degree_date:  item.degree_date  || null,
        degree_place: item.degree_place || null,
      });
    if (error) throw error;
  }
}

export async function deleteDegree(id) {
  const { error } = await supabase.from('degrees').delete().eq('id', id);
  if (error) throw error;
}

// ── Spouse ─────────────────────────────────────────────────────────────────────

export async function getSpouse(memberId) {
  const { data, error } = await supabase
    .from('spouse')
    .select('*')
    .eq('member_id', memberId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || { member_id: memberId };
}

export async function saveSpouse(item) {
  const memberId = item.member_id || await getMyMemberId();
  const payload = {
    spouse_name:         item.spouse_name         || null,
    spouse_dob:          item.spouse_dob          || null,
    spouse_nationality:  item.spouse_nationality  || null,
    spouse_denomination: item.spouse_denomination || null,
    spouse_is_sister:    item.spouse_is_sister    || false,
    spouse_parish:       item.spouse_parish       || null,
    auxiliary_name:      item.auxiliary_name      || null,
    auxiliary_number:    item.auxiliary_number    || null,
    spouse_notes:        item.spouse_notes        || null,
  };
  const existing = await getSpouse(memberId);
  if (existing.id) {
    const { error } = await supabase
      .from('spouse')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('spouse')
      .insert({ member_id: memberId, ...payload });
    if (error) throw error;
  }
}

// ── Lookups ────────────────────────────────────────────────────────────────────

export async function getRegions() {
  const { data, error } = await supabase
    .from('regions')
    .select('region_name')
    .order('region_name');
  if (error) throw error;
  return (data || []).map(r => r.region_name);
}

export async function getDegreeTypes() {
  const { data, error } = await supabase
    .from('degree_types')
    .select('degree_type_name')
    .order('id');
  if (error) throw error;
  return (data || []).map(r => r.degree_type_name);
}

export async function getUniformedRankRecords(memberId) {
  const { data, error } = await supabase
    .from('uniformed_rank_records')
    .select('*')
    .eq('member_id', memberId)
    .order('is_current', { ascending: false })
    .order('commission_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function syncCurrentUniformedRank(memberId) {
  const records = await getUniformedRankRecords(memberId);
  const current =
    records.find(r => r.is_current) ||
    records
      .filter(r => !!r.commission_date)
      .sort((a, b) => String(b.commission_date).localeCompare(String(a.commission_date)))[0] ||
    records[0] ||
    null;

  const military = await getMilitary(memberId);

  await saveMilitary({
    member_id: memberId,
    is_military: !!military.is_military,
    uniform_blessed_date: military.uniform_blessed_date || null,
    first_uniform_use_date: military.first_uniform_use_date || null,
    current_rank: current?.rank_title || null,
    commission: current?.commission_date || null,
  });
}

export async function saveUniformedRankRecord(item) {
  const memberId = item.member_id || await getMyMemberId();

  if (item.is_current) {
    const { error: resetError } = await supabase
      .from('uniformed_rank_records')
      .update({ is_current: false })
      .eq('member_id', memberId);

    if (resetError) throw resetError;
  }

const payload = {
  member_id: memberId,
  rank_title: item.rank_title || null,
  commission_date: toPgDate(item.commission_date),
  notes: item.notes || null,
  is_current: !!item.is_current,
};

  if (item.id) {
    const { error } = await supabase
      .from('uniformed_rank_records')
      .update(payload)
      .eq('id', item.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('uniformed_rank_records')
      .insert(payload);

    if (error) throw error;
  }

  await syncCurrentUniformedRank(memberId);
}

export async function deleteUniformedRankRecord(id, memberId) {
  const { error } = await supabase
    .from('uniformed_rank_records')
    .delete()
    .eq('id', id);

  if (error) throw error;

  await syncCurrentUniformedRank(memberId);
}
