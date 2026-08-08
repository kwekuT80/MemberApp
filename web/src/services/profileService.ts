'use server';
import { createClient } from '@/lib/supabase/server';
import { Profile } from '@/types/profile';

export async function getCurrentProfileRecord(): Promise<Profile | null> { 
  const supabase = await createClient(); 
  const { data:{ user } } = await supabase.auth.getUser(); 
  if (!user) return null; 
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(); 
  if (error) throw error; 
  return data || null; 
}

export async function getPendingProfilesWithMatches(): Promise<any[]> {
  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*, commanderies(name, number)')
    .eq('status', 'pending');
  
  if (error) throw error;
  if (!profiles || profiles.length === 0) return [];

  // Fetch all unlinked members for robust multi-criteria matching (contact & name)
  const { data: unlinkedMembers } = await supabase
    .from('members')
    .select('id, first_name, surname, email, phone, mobile, commandery_id, status')
    .is('user_id', null);

  const unlinked = unlinkedMembers || [];

  const profilesWithMatches = profiles.map((profile) => {
    const email = (profile.email || '').trim().toLowerCase();
    const phone = (profile.phone || '').trim();
    const firstName = (profile.first_name || '').trim().toLowerCase();
    const surname = (profile.surname || '').trim().toLowerCase();

    const candidateMatches = unlinked.filter((m: any) => {
      // 1. Direct Email Match
      if (email && m.email && m.email.trim().toLowerCase() === email) return true;
      // 2. Direct Phone Match
      if (phone && (m.phone === phone || m.mobile === phone)) return true;
      // 3. Name Match (First Name AND Surname match)
      if (firstName && surname && m.first_name && m.surname) {
        const mFirst = m.first_name.trim().toLowerCase();
        const mSurname = m.surname.trim().toLowerCase();
        const fnMatch = mFirst.includes(firstName) || firstName.includes(mFirst);
        const snMatch = mSurname.includes(surname) || surname.includes(mSurname);
        if (fnMatch && snMatch) return true;
      }
      return false;
    });

    return {
      ...profile,
      match: candidateMatches.length > 0 ? candidateMatches[0] : null,
      matches: candidateMatches
    };
  });

  return profilesWithMatches;
}

export async function approveProfileLink(profileId: string, memberId: string): Promise<void> {
  const supabase = await createClient();
  
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();
  if (profileErr || !profile) throw new Error('Profile not found');

  // Fetch member first to check commandery_id
  const { data: member, error: getMemberErr } = await supabase
    .from('members')
    .select('commandery_id')
    .eq('id', memberId)
    .single();
  if (getMemberErr) throw getMemberErr;

  const memberUpdate: any = { user_id: profileId };
  if (!member.commandery_id && profile.commandery_id) {
    memberUpdate.commandery_id = profile.commandery_id;
  }

  const { error: memberErr } = await supabase
    .from('members')
    .update(memberUpdate)
    .eq('id', memberId);
  if (memberErr) throw memberErr;

  const newRole = profile.role === 'registrar' ? 'registrar' : 'member';
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      status: 'approved',
      member_id: memberId,
      role: newRole
    })
    .eq('id', profileId);
  if (updateErr) throw updateErr;
}

export async function rejectProfile(profileId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId);
  if (error) throw error;
}

export async function approveAsNewMember(profileId: string): Promise<void> {
  const supabase = await createClient();
  
  // 1. Fetch profile metadata
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();
  if (profileErr || !profile) throw new Error('Profile not found');

  // 2. Insert new member in the members table
  const { data: newMember, error: memberErr } = await supabase
    .from('members')
    .insert({
      first_name: profile.first_name || '',
      surname: profile.surname || '',
      email: profile.email,
      phone: profile.phone || null,
      commandery_id: profile.commandery_id,
      user_id: profileId,
      status: 'Active'
    })
    .select()
    .single();
  if (memberErr) throw memberErr;

  // 3. Update profile to approved and link new member ID
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      status: 'approved',
      member_id: newMember.id,
      role: 'member'
    })
    .eq('id', profileId);
  if (updateErr) throw updateErr;
}

export async function getUnlinkedMembers(): Promise<any[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('members')
    .select('id, first_name, surname, commandery_id, email, phone')
    .is('user_id', null)
    .order('surname');
  if (error) throw error;
  return data || [];
}
