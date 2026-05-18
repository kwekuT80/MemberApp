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
      const email = profile.email || '';
      const phone = profile.phone || '';
      const commanderyId = profile.commandery_id;

      if (!commanderyId) return { ...profile, match: null };

      let memberQuery = supabase
        .from('members')
        .select('*')
        .eq('commandery_id', commanderyId);

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

  const { error: memberErr } = await supabase
    .from('members')
    .update({ user_id: profileId })
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
