'use server';
import { createClient } from '@/lib/supabase/server'; import { RankRecord } from '@/types/rankRecord';
export async function getRankRecordsByMemberId(memberId: string): Promise<RankRecord[]> { const supabase = await createClient(); const { data, error } = await supabase.from('uniformed_rank_records').select('*').eq('member_id', memberId).order('commission_date', { ascending: false }); if (error) throw error; return (data || []) as RankRecord[]; }
