'use server';

import { createClient } from '@/lib/supabase/server';
import { DependentRecord } from '@/types/dependent';

export async function getDependentsByMemberId(memberId: string): Promise<DependentRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('dependents')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at');

  if (error) {
    // If table doesn't exist yet, return empty list gracefully to avoid breaking page load
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  }
  return (data || []) as DependentRecord[];
}

export async function saveDependents(memberId: string, dependents: DependentRecord[], toDeleteIds: string[]) {
  const supabase = await createClient();

  // Verify authorization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Perform deletions
  if (toDeleteIds.length > 0) {
    const { error } = await supabase
      .from('dependents')
      .delete()
      .in('id', toDeleteIds);
    if (error) throw error;
  }

  // Perform upserts/inserts
  for (const dep of dependents) {
    if (!(dep.dependent_name || dep.relationship || dep.birth_date)) continue;

    const payload = {
      member_id: memberId,
      dependent_name: dep.dependent_name || null,
      relationship: dep.relationship || null,
      birth_date: dep.birth_date || null
    };

    if (dep.id) {
      const { error } = await supabase
        .from('dependents')
        .update(payload)
        .eq('id', dep.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('dependents')
        .insert(payload);
      if (error) throw error;
    }
  }
}
