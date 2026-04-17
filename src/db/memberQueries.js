// src/db/memberQueries.js
// All data operations via Supabase.
// FIXED: All subform saves now look up member_id automatically if not provided.

import { supabase } from './supabase';

/**
 * PHOTO SERVICE: Uploads member portraits to Supabase Storage.
 */
export async function uploadPhoto(uri) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  // We use a unique name for each upload to avoid caching issues
  const fileName = `portraits/${user.id}-${Date.now()}.jpg`;

  try {
    // 1. Fetch file as blob (Universal approach for Web/Mobile)
    const response = await fetch(uri);
    const blob = await response.blob();

    // 2. Upload to Storage
    const { data, error } = await supabase.storage
      .from('member-portraits')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Supabase Storage Error:', error);
      throw new Error(`Storage Error: ${error.message}`);
    }

    // 3. Return the Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('member-portraits')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (e) {
    console.error('Photo Upload Failed:', e);
    throw new Error('Failed to save photo. Please check your connection.');
  }
}

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

function toPgDate(value) {
  if (!value || value.trim() === '') return null;

  // Already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // Convert DD/MM/YYYY -> YYYY-MM-DD
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  return value;
}

/**
 * Converts YYYY-MM-DD -> DD/MM/YYYY for the UI
 */
export function fromPgDate(value) {
  if (!value) return '';
  
  // If it's already DD/MM/YYYY, return it
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;

  // Convert YYYY-MM-DD -> DD/MM/YYYY
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    // CRITICAL: Ensure we return DD/MM/YYYY
    return `${dd}/${mm}/${yyyy}`;
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

function cleanMemberDates(m) {
  if (!m) return m;
  return {
    ...m,
    date_of_birth: fromPgDate(m.date_of_birth),
    date_joined:   fromPgDate(m.date_joined),
    date_of_death: fromPgDate(m.date_of_death),
    burial_date:   fromPgDate(m.burial_date),
    transfer_date: fromPgDate(m.transfer_date),
  };
}

export async function getMyMemberRecord() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return cleanMemberDates(data);
}

export async function getMemberRecord(id) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return cleanMemberDates(data);
}

export async function saveMember(form) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  // Determine user_id safely
  let finalUserId = null;
  if (form.id) {
    // Editing an existing member: keep their user_id exactly as it was
    finalUserId = form.user_id === '' ? null : (form.user_id || null);
  } else {
    // New member: Is it for me, or a new member created by an admin?
    // We use a flag 'is_my_profile' which we'll add to MemberFormScreen.
    if (form.is_my_profile) {
      finalUserId = user.id;
    } else {
      finalUserId = null;
    }
  }

  const payload = {
    user_id:             finalUserId,
    title:               form.title               || null,
    surname:             form.surname             || null,
    first_name:          form.first_name          || null,
    other_names:         form.other_names         || null,
    date_of_birth:       toPgDate(form.date_of_birth),
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
    date_joined:         toPgDate(form.date_joined),
    status:              form.status              || 'Active',
    is_deceased:         !!form.is_deceased,
    date_of_death:       toPgDate(form.date_of_death),
    burial_date:         toPgDate(form.burial_date),
    burial_place:        form.burial_place        || null,
    transfer_from:       form.transfer_from       || null,
    transfer_to:         form.transfer_to         || null,
    transfer_date:       toPgDate(form.transfer_date),
    photo_url:           form.photo_url           || null,
  };

  if (form.id) {
    const { data, error } = await supabase
      .from('members')
      .update(payload)
      .eq('id', form.id)
      .select()
      .single();
    if (error) throw error;
    return cleanMemberDates(data);
  } else {
    const { data, error } = await supabase
      .from('members')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return cleanMemberDates(data);
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
  return (data || []).map(c => ({
    ...c,
    birth_date: fromPgDate(c.birth_date)
  }));
}

export async function saveChild(item) {
  const memberId = item.member_id || await getMyMemberId();
  let result;
  if (item.id) {
    const { data, error } = await supabase
      .from('children')
      .update({
        child_name:  item.child_name  || null,
        birth_date:  toPgDate(item.birth_date),
        birth_place: item.birth_place || null,
      })
      .eq('id', item.id)
      .select().single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('children')
      .insert({
        member_id:   memberId,
        child_name:  item.child_name  || null,
        birth_date:  toPgDate(item.birth_date),
        birth_place: item.birth_place || null,
      })
      .select().single();
    if (error) throw error;
    result = data;
  }
  return { ...result, birth_date: fromPgDate(result.birth_date) };
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
  return (data || []).map(p => ({
    ...p,
    date_from: fromPgDate(p.date_from),
    date_to:   fromPgDate(p.date_to)
  }));
}

export async function savePosition(item) {
  const memberId = item.member_id || await getMyMemberId();
  let result;
  if (item.id) {
    const { data, error } = await supabase
      .from('positions')
      .update({
        position_title: item.position_title || null,
        date_from:      toPgDate(item.date_from),
        date_to:        toPgDate(item.date_to),
      })
      .eq('id', item.id)
      .select().single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('positions')
      .insert({
        member_id:      memberId,
        position_title: item.position_title || null,
        date_from:      toPgDate(item.date_from),
        date_to:        toPgDate(item.date_to),
      })
      .select().single();
    if (error) throw error;
    result = data;
  }
  return { ...result, date_from: fromPgDate(result.date_from), date_to: fromPgDate(result.date_to) };
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
  if (!data) return { member_id: memberId, is_military: false };
  return {
    ...data,
    uniform_blessed_date:   fromPgDate(data.uniform_blessed_date),
    first_uniform_use_date: fromPgDate(data.first_uniform_use_date),
    commission:             fromPgDate(data.commission),
  };
}

export async function saveMilitary(item) {
  const memberId = item.member_id || await getMyMemberId();
  const payload = {
    is_military:            item.is_military            || false,
    uniform_blessed_date:   toPgDate(item.uniform_blessed_date),
    first_uniform_use_date: toPgDate(item.first_uniform_use_date),
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
  return (data || []).map(d => ({
    ...d,
    degree_date: fromPgDate(d.degree_date)
  }));
}

export async function saveDegree(item) {
  const memberId = item.member_id || await getMyMemberId();
  let result;
  if (item.id) {
    const { data, error } = await supabase
      .from('degrees')
      .update({
        degree_type:  item.degree_type  || null,
        degree_date:  toPgDate(item.degree_date),
        degree_place: item.degree_place || null,
      })
      .eq('id', item.id)
      .select().single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('degrees')
      .insert({
        member_id:    memberId,
        degree_type:  item.degree_type  || null,
        degree_date:  toPgDate(item.degree_date),
        degree_place: item.degree_place || null,
      })
      .select().single();
    if (error) throw error;
    result = data;
  }
  return { ...result, degree_date: fromPgDate(result.degree_date) };
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
  if (!data) return { member_id: memberId };
  return {
    ...data,
    spouse_dob: fromPgDate(data.spouse_dob)
  };
}

export async function saveSpouse(item) {
  const memberId = item.member_id || await getMyMemberId();
  const payload = {
    spouse_name:         item.spouse_name         || null,
    spouse_dob:          toPgDate(item.spouse_dob),
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
  return (data || []).map(r => ({
    ...r,
    commission_date: fromPgDate(r.commission_date)
  }));
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
// ── Analytics & Insights ────────────────────────────────────────────────────────
/**
 * Aggregates membership data for dashboard charts.
 */
export async function getDashboardInsights() {
  const { data: members, error } = await supabase
    .from('members')
    .select('status, occupation, date_joined');
  
  if (error) throw error;

  const insights = {
    statusDistribution: {},
    professionGrowth: {},
    yearlyJoins: {},
    totalMembers: members.length,
  };

  members.forEach(m => {
    // 1. Status
    const s = m.status || 'Active';
    insights.statusDistribution[s] = (insights.statusDistribution[s] || 0) + 1;

    // 2. Yearly Growth
    if (m.date_joined) {
      const year = m.date_joined.split('-')[0] || m.date_joined.split('/')[2];
      if (year && year.length === 4) {
        insights.yearlyJoins[year] = (insights.yearlyJoins[year] || 0) + 1;
      }
    }

    // 3. Professions
    const prof = m.occupation || 'Other';
    insights.professionGrowth[prof] = (insights.professionGrowth[prof] || 0) + 1;
  });

  return insights;
}

/**
 * Finds members whose birthday matches the current date.
 */
export async function getBirthdayReminders() {
  const now = new Date();
  const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
  const todayDay = String(now.getDate()).padStart(2, '0');
  const matchString = `-${todayMonth}-${todayDay}`; // Matches YYYY-MM-DD

  // Note: For better scalability, you'd use a Postgres function, 
  // but this is efficient for reasonable member lists.
  const { data, error } = await supabase
    .from('members')
    .select('first_name, surname, title, date_of_birth')
    .not('date_of_birth', 'is', null);

  if (error) throw error;

  return data.filter(m => {
    const dob = m.date_of_birth;
    // Handle DD/MM/YYYY or YYYY-MM-DD (ISO)
    if (dob.includes('-')) {
      const parts = dob.split('-');
      // ISO is YYYY-MM-DD, so M is index 1, D is index 2
      return parts[1] === todayMonth && parts[2] === todayDay;
    }
    const parts = dob.split('/');
    return parts[0] === todayDay && parts[1] === todayMonth;
  });
}
