import { createClient } from '@/lib/supabase/server';
import { Profile } from '@/types/profile';
export async function getCurrentProfileRecord(): Promise<Profile | null> { const supabase = await createClient(); const { data:{ user } } = await supabase.auth.getUser(); if (!user) return null; const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(); if (error) throw error; return data || null; }
