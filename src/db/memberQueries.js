// src/db/memberQueries.js
// All data operations via Supabase — replaces local SQLite queries.
// Each member record is linked to the logged-in user via user_id.

import { supabase } from './supabase';

// ── Auth helpers ───────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
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
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data || null;
}

export async function saveMember(form) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  const payload = {
    user_id:             user.id,
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
  };

  if (form.id) {
    // Update existing record
    const { data, error } = await supabase
      .from('members')
      .update(payload)
      .eq('id', form.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Create new record
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
  if (item.id) {
    const { error } = await supabase.from('children').update({
      child_name:  item.child_name,
      birth_date:  item.birth_date,
      birth_place: item.birth_place,
    }).eq('id', item.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('children').insert({
      member_id:   item.member_id,
      child_name:  item.child_name,
      birth_date:  item.birth_date,
      birth_place: item.birth_place,
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
  if (item.id) {
    const { error } = await supabase.from('positions').update({
      position_title: item.position_title,
      date_from:      item.date_from,
      date_to:        item.date_to,
    }).eq('id', item.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('positions').insert({
      member_id:      item.member_id,
      position_title: item.position_title,
      date_from:      item.date_from,
      date_to:        item.date_to,
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
  if (item.id) {
    const { error } = await supabase.from('emergency_contacts').update({
      contact_name: item.contact_name,
      relationship: item.relationship,
      phone1:       item.phone1,
      phone2:       item.phone2,
    }).eq('id', item.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('emergency_contacts').insert({
      member_id:    item.member_id,
      contact_name: item.contact_name,
      relationship: item.relationship,
      phone1:       item.phone1,
      phone2:       item.phone2,
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
  const payload = {
    is_military:            item.is_military,
    uniform_blessed_date:   item.uniform_blessed_date   || null,
    first_uniform_use_date: item.first_uniform_use_date || null,
    current_rank:           item.current_rank           || null,
    commission:             item.commission             || null,
  };
  const existing = await getMilitary(item.member_id);
  if (existing.id) {
    const { error } = await supabase.from('military').update(payload).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('military').insert({ member_id: item.member_id, ...payload });
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
  if (item.id) {
    const { error } = await supabase.from('degrees').update({
      degree_type:  item.degree_type,
      degree_date:  item.degree_date,
      degree_place: item.degree_place,
    }).eq('id', item.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('degrees').insert({
      member_id:    item.member_id,
      degree_type:  item.degree_type,
      degree_date:  item.degree_date,
      degree_place: item.degree_place,
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
  const existing = await getSpouse(item.member_id);
  if (existing.id) {
    const { error } = await supabase.from('spouse').update(payload).eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('spouse').insert({ member_id: item.member_id, ...payload });
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
