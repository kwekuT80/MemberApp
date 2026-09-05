'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { MilitaryRecord } from '@/types/military';
import { RankRecord } from '@/types/rankRecord';

export async function getMilitaryByMemberId(memberId: string): Promise<MilitaryRecord | null> {
  const admin = await createAdminClient();
  const { data, error } = await admin.from('military').select('*').eq('member_id', memberId).maybeSingle();
  if (error) {
    console.error('Error fetching military:', error);
    return null;
  }
  return data || null;
}

export async function saveMilitaryAndRanks(
  memberId: string,
  military: any,
  ranks: RankRecord[],
  toDeleteRankIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized. Please sign in.' };

    const admin = await createAdminClient();

    // 1. Save Military record
    const militaryPayload = {
      member_id: memberId,
      uniform_blessed_date: military.uniform_blessed_date || null,
      first_uniform_use_date: military.first_uniform_use_date || null
    };

    if (military.id) {
      const { error: mErr } = await admin.from('military').update(militaryPayload).eq('id', military.id);
      if (mErr) return { success: false, error: mErr.message };
    } else {
      const { error: mErr } = await admin.from('military').insert(militaryPayload);
      if (mErr) return { success: false, error: mErr.message };
    }

    // 2. Delete removed ranks
    if (toDeleteRankIds && toDeleteRankIds.length > 0) {
      const { error: delErr } = await admin.from('uniformed_rank_records').delete().in('id', toDeleteRankIds);
      if (delErr) return { success: false, error: delErr.message };
    }

    // 3. Save ranks
    for (const rank of ranks) {
      if (!(rank.rank_title || rank.commission_date || rank.notes || rank.is_current)) continue;
      const rankPayload = {
        member_id: memberId,
        rank_title: rank.rank_title || null,
        commission_date: rank.commission_date || null,
        notes: rank.notes || null,
        is_current: rank.is_current ?? false
      };
      if (rank.id) {
        const { error: rErr } = await admin.from('uniformed_rank_records').update(rankPayload).eq('id', rank.id);
        if (rErr) return { success: false, error: rErr.message };
      } else {
        const { error: rErr } = await admin.from('uniformed_rank_records').insert(rankPayload);
        if (rErr) return { success: false, error: rErr.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error saving military and rank records' };
  }
}
