'use server';
import { createClient } from '@/lib/supabase/server'; 
import { EmergencyContactRecord } from '@/types/emergencyContact';

export async function getEmergencyContactsByMemberId(memberId: string): Promise<EmergencyContactRecord[]> { 
  const supabase = await createClient(); 
  const { data, error } = await supabase.from('emergency_contacts').select('*').eq('member_id', memberId).order('id'); 
  if (error) throw error; 
  return (data || []) as EmergencyContactRecord[]; 
}

export async function saveEmergencyContacts(memberId: string, contacts: EmergencyContactRecord[], toDeleteIds: string[]) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (toDeleteIds.length > 0) {
      const { error } = await supabase.from('emergency_contacts').delete().in('id', toDeleteIds);
      if (error) return { success: false, error: error.message };
    }

    for (const contact of contacts) {
      if (!(contact.contact_name || contact.relationship || contact.phone1 || contact.phone2)) continue;
      
      const payload = {
        member_id: memberId,
        contact_name: contact.contact_name || null,
        relationship: contact.relationship || null,
        phone1: contact.phone1 || null,
        phone2: contact.phone2 || null
      };

      if (contact.id) {
        const { error } = await supabase.from('emergency_contacts').update(payload).eq('id', contact.id);
        if (error) return { success: false, error: error.message };
      } else {
        const { error } = await supabase.from('emergency_contacts').insert(payload);
        if (error) return { success: false, error: error.message };
      }
    }
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown server error' };
  }
}
