'use server';

import { createClient } from '@/lib/supabase/server';

export async function getRateHistory() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rate_history')
    .select('*')
    .order('effective_from', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getRatesForDate(date: Date) {
  const supabase = await createClient();
  const isoDate = date.toISOString();
  
  const { data, error } = await supabase
    .from('rate_history')
    .select('*')
    .lte('effective_from', isoDate)
    .or(`effective_until.is.null,effective_until.gt.${isoDate}`)
    .eq('active', true);

  if (error) throw error;
  return data || [];
}


