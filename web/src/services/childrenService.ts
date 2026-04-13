import { createClient } from '@/lib/supabase/server'; import { ChildRecord } from '@/types/child';
export async function getChildrenByMemberId(memberId: string): Promise<ChildRecord[]> { const supabase = await createClient(); const { data, error } = await supabase.from('children').select('*').eq('member_id', memberId).order('id'); if (error) throw error; return (data || []) as ChildRecord[]; }
