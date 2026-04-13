import { createClient } from '@/lib/supabase/server'; import { SpouseRecord } from '@/types/spouse';
export async function getSpouseByMemberId(memberId: string): Promise<SpouseRecord | null> { const supabase = await createClient(); const { data, error } = await supabase.from('spouse').select('*').eq('member_id', memberId).maybeSingle(); if (error) throw error; return data || null; }
