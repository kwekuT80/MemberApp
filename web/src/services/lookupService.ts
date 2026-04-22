'use server';
import { createClient } from '@/lib/supabase/server';

export async function getRegions(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('regions')
    .select('region_name')
    .order('region_name');
  if (error) throw error;
  return (data || []).map((item: { region_name?: string | null }) => item.region_name || '').filter(Boolean);
}

export async function getDegreeTypeNames(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('degree_types')
    .select('degree_type_name')
    .order('degree_type_name');
  if (error) throw error;
  return (data || []).map((item: { degree_type_name?: string | null }) => item.degree_type_name || '').filter(Boolean);
}
