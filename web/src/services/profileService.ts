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

  const profilesWithMatches = await Promise.all(
    profiles.map(async (profile) => {
      // If a member_id is already linked to the profile, fetch it directly
      if (profile.member_id) {
        const { data: directMember } = await supabase
          .from('members')
          .select('*')
          .eq('id', profile.member_id)
          .maybeSingle();
        if (directMember) {
          return {
            ...profile,
            match: directMember
          };
        }
      }

      const email = profile.email || '';
      const phone = profile.phone || '';
      const commanderyId = profile.commandery_id;

      if (!commanderyId) return { ...profile, match: null };

      // Search for members belonging to selected commandery OR whose commandery is null/unassigned
      let memberQuery = supabase
        .from('members')
        .select('*')
        .or(`commandery_id.eq.${commanderyId},commandery_id.is.null`);

      if (email && phone) {
        memberQuery = memberQuery.or(`email.eq.${email},phone.eq.${phone},mobile.eq.${phone}`);
      } else if (email) {
        memberQuery = memberQuery.eq('email', email);
      } else if (phone) {
        memberQuery = memberQuery.or(`phone.eq.${phone},mobile.eq.${phone}`);
      } else {
        return { ...profile, match: null };
      }

      const { data: matches, error: matchError } = await memberQuery;
      if (matchError) {
        console.error('Error fetching matches for profile:', profile.id, matchError);
      }

      return {
        ...profile,
        match: matches && matches.length > 0 ? matches[0] : null
      };
    })
  );

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

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({
      status: 'approved',
      member_id: memberId,
      role: 'member'
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
