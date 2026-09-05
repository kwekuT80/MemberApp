'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { SpouseRecord } from '@/types/spouse';

export async function getSpouseByMemberId(memberId: string): Promise<SpouseRecord | null> {
  const admin = await createAdminClient();
  const { data, error } = await admin.from('spouse').select('*').eq('member_id', memberId).maybeSingle();
  if (error) {
    console.error('Error fetching spouse:', error);
    return null;
  }
  return data || null;
}

export async function saveFamilyData(
  memberId: string,
  spouse: any,
  children: any[],
  toDeleteChildIds: string[],
  dependents: any[],
  toDeleteDepIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized. Please sign in.' };

    const admin = await createAdminClient();

    // 1. Save Spouse
    if (spouse) {
      const spousePayload = {
        ...spouse,
        member_id: memberId,
        spouse_dob: spouse.spouse_dob || null
      };
      const { error: sErr } = await admin
        .from('spouse')
        .upsert(spousePayload, { onConflict: 'member_id' });
      if (sErr) return { success: false, error: sErr.message };
    }

    // 2. Delete removed children
    if (toDeleteChildIds && toDeleteChildIds.length > 0) {
      const { error: delChildErr } = await admin.from('children').delete().in('id', toDeleteChildIds);
      if (delChildErr) return { success: false, error: delChildErr.message };
    }

    // 3. Save Children
    for (const child of children) {
      if (!(child.child_name || child.birth_date || child.birth_place)) continue;
      const childPayload = {
        ...child,
        member_id: memberId,
        birth_date: child.birth_date || null
      };
      if (child.id) {
        const { error: cErr } = await admin.from('children').update(childPayload).eq('id', child.id);
        if (cErr) return { success: false, error: cErr.message };
      } else {
        const { error: cErr } = await admin.from('children').insert(childPayload);
        if (cErr) return { success: false, error: cErr.message };
      }
    }

    // 4. Delete removed dependents
    if (toDeleteDepIds && toDeleteDepIds.length > 0) {
      await admin.from('dependents').delete().in('id', toDeleteDepIds);
    }

    // 5. Save Dependents
    for (const dep of dependents) {
      if (!(dep.dependent_name || dep.relationship || dep.birth_date)) continue;
      const depPayload = {
        ...dep,
        member_id: memberId,
        birth_date: dep.birth_date || null
      };
      if (dep.id) {
        await admin.from('dependents').update(depPayload).eq('id', dep.id);
      } else {
        await admin.from('dependents').insert(depPayload);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error saving family records' };
  }
}
