'use server';
import { createClient } from '@/lib/supabase/server'; import { PositionRecord } from '@/types/position';
export async function getPositionsByMemberId(memberId: string): Promise<PositionRecord[]> { const supabase = await createClient(); const { data, error } = await supabase.from('positions').select('*').eq('member_id', memberId).order('date_from', { ascending: false }); if (error) throw error; return (data || []) as PositionRecord[]; }
