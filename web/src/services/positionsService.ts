'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { PositionRecord } from '@/types/position';

export async function getPositionsByMemberId(memberId: string): Promise<PositionRecord[]> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('positions')
    .select('*')
    .eq('member_id', memberId)
    .order('date_from', { ascending: false });
  if (error) {
    console.error('Error fetching positions:', error);
    return [];
  }
  return (data || []) as PositionRecord[];
}

export async function savePositions(
  memberId: string,
  positions: PositionRecord[],
  toDeleteIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized. Please sign in.' };
    }

    const admin = await createAdminClient();

    // 1. Handle Deletions
    if (toDeleteIds && toDeleteIds.length > 0) {
      const { error: delErr } = await admin
        .from('positions')
        .delete()
        .in('id', toDeleteIds);
      if (delErr) {
        return { success: false, error: delErr.message };
      }
    }

    // 2. Handle Inserts & Updates
    for (const position of positions) {
      if (!(position.position_title || position.date_from || position.date_to)) continue;

      const payload = {
        member_id: memberId,
        position_title: position.position_title || null,
        date_from: position.date_from || null,
        date_to: position.date_to || null,
        level: position.level || 'Local',
        rank: position.rank || null
      };

      if (position.id) {
        const { error: updateErr } = await admin
          .from('positions')
          .update(payload)
          .eq('id', position.id);
        if (updateErr) {
          return { success: false, error: updateErr.message };
        }
      } else {
        const { error: insertErr } = await admin
          .from('positions')
          .insert(payload);
        if (insertErr) {
          return { success: false, error: insertErr.message };
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error occurred while saving positions.' };
  }
}
