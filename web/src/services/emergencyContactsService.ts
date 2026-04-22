'use server';
import { createClient } from '@/lib/supabase/server'; import { EmergencyContactRecord } from '@/types/emergencyContact';
export async function getEmergencyContactsByMemberId(memberId: string): Promise<EmergencyContactRecord[]> { const supabase = await createClient(); const { data, error } = await supabase.from('emergency_contacts').select('*').eq('member_id', memberId).order('id'); if (error) throw error; return (data || []) as EmergencyContactRecord[]; }
