import { createClient } from '@/lib/supabase/server'; import { MilitaryRecord } from '@/types/military';
export async function getMilitaryByMemberId(memberId: string): Promise<MilitaryRecord | null> { const supabase = await createClient(); const { data, error } = await supabase.from('military').select('*').eq('member_id', memberId).maybeSingle(); if (error) throw error; return data || null; }
