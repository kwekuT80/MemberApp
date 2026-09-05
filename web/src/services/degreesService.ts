'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { DegreeRecord } from '@/types/degree';

export async function getDegreesByMemberId(memberId: string): Promise<DegreeRecord[]> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from('degrees')
    .select('*')
    .eq('member_id', memberId)
    .order('degree_date', { ascending: false });
  if (error) {
    console.error('Error fetching degrees:', error);
    return [];
  }
  return (data || []) as DegreeRecord[];
}

export async function saveDegrees(
  memberId: string,
  degrees: DegreeRecord[],
  toDeleteIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized. Please sign in.' };

    const admin = await createAdminClient();

    if (toDeleteIds && toDeleteIds.length > 0) {
      const { error: delErr } = await admin.from('degrees').delete().in('id', toDeleteIds);
      if (delErr) return { success: false, error: delErr.message };
    }

    for (const degree of degrees) {
      if (!(degree.degree_type || degree.degree_date || degree.degree_place)) continue;
      const payload = {
        member_id: memberId,
        degree_type: degree.degree_type || null,
        degree_date: degree.degree_date || null,
        degree_place: degree.degree_place || null
      };

      if (degree.id) {
        const { error: updateErr } = await admin.from('degrees').update(payload).eq('id', degree.id);
        if (updateErr) return { success: false, error: updateErr.message };
      } else {
        const { error: insertErr } = await admin.from('degrees').insert(payload);
        if (insertErr) return { success: false, error: insertErr.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error saving degree records' };
  }
}
