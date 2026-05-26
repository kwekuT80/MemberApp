'use server';
import { createClient } from '@/lib/supabase/server';
import { Member } from '@/types/member';

const FULL_SELECT = `
  *,
  children(*),
  positions(*),
  degrees(*),
  spouse(*),
  military(*),
  uniformed_rank_records(*)
`;

function sanitizeQuery(query = '') { return query.trim().replace(/,/g, ' ').replace(/%/g, ''); }

export async function getMyMember(): Promise<any | null> {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Fetch profile to see if they have a linked member_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('member_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.member_id) {
    const { data, error } = await supabase
      .from('members')
      .select(FULL_SELECT)
      .eq('id', profile.member_id)
      .maybeSingle();
    if (!error && data) return data;
  }

  // 2. Fallback to user_id match with limit to avoid PGRST116 multiple rows exception
  const { data, error } = await supabase
    .from('members')
    .select(FULL_SELECT)
    .eq('user_id', user.id)
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

export async function getMemberById(id: string): Promise<any | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('members').select(FULL_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function searchMembers(query = ''): Promise<Member[]> {
  const supabase = await createClient();
  let builder = supabase.from('members').select('*, children(id), positions(position_title)').order('surname').order('first_name');
  const safeQuery = sanitizeQuery(query);
  if (safeQuery) {
    builder = builder.or(`surname.ilike.%${safeQuery}%,first_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%,phone.ilike.%${safeQuery}%,mobile.ilike.%${safeQuery}%`);
  }
  const { data, error } = await builder;
  if (error) throw error;
  return (data || []) as Member[];
}

export async function getMemberCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from('members').select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

/**
 * Fetch members with birthdays today or within the next 7 days.
 * Handles cross-month boundaries (e.g., Dec 30 → Jan 6).
 */
export async function getUpcomingBirthdayMembers(): Promise<Member[]> {
  const supabase = await createClient();

  // Fetch active members who have a date_of_birth
  const { data, error } = await supabase
    .from('members')
    .select(`
      id, title, first_name, surname, date_of_birth, status
    `)
    .not('date_of_birth', 'is', null)
    .eq('status', 'Active')
    .neq('status', 'Deceased')
    .order('surname');

  if (error) throw error;

  const members = data || [];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  // Helper: get month-day as a comparable number (e.g., Dec 31 → 1231)
  const monthDay = (d: string | null): number => {
    if (!d) return -1;
    const parts = d.split('-');
    const m = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    return m * 100 + day;
  };

  // Helper: days until birthday from today (handles year wrap)
  const daysUntilBirthday = (d: string | null): number => {
    if (!d) return -1;
    const [yearStr, monthStr, dayStr] = d.split('-');
    const bMonth = parseInt(monthStr, 10);
    const bDay = parseInt(dayStr, 10);

    // Calculate days until this birthday
    let birthdayThisYear = new Date(today.getFullYear(), bMonth - 1, bDay);

    if (birthdayThisYear < today) {
      // Birthday already passed this year — check next year
      birthdayThisYear = new Date(today.getFullYear() + 1, bMonth - 1, bDay);
    }

    const diffMs = birthdayThisYear.getTime() - today.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  // Filter: birthday is today OR within next 7 days
  const upcoming = members.filter(m => {
    const daysUntil = daysUntilBirthday(m.date_of_birth);
    return daysUntil >= 0 && daysUntil <= 7;
  });

  // Sort by proximity (soonest first)
  upcoming.sort((a, b) => {
    return daysUntilBirthday(a.date_of_birth!) - daysUntilBirthday(b.date_of_birth!);
  });

  return upcoming as Member[];
}

/**
 * Column-safe save function to prevent database pollution
 */
export async function saveMember(form: any): Promise<Member> {
  const supabase = await createClient();
  
  // Explicitly define the columns to extract from the form object
  const validColumns = [
    'user_id', 'photo_url', 'title', 'surname', 'first_name', 'other_names', 
    'date_of_birth', 'birth_town', 'birth_region', 'nationality', 
    'home_town', 'home_region', 'residential_address', 'postal_address', 
    'phone', 'mobile', 'email', 'fathers_name', 'mothers_name', 
    'marital_status', 'emp_status', 'occupation', 'workplace', 
    'job_status', 'work_address', 'uniform_positions', 'date_joined',
    'degree1_place', 'degree23_place', 'degree4_place', 'degree_noble_place',
    'status', 'is_deceased', 'date_of_death', 'burial_date', 'burial_place',
    'transfer_from', 'transfer_to', 'transfer_date',
    'date_of_suspension', 'date_of_dismissal', 'date_of_reinstatement'
  ];

  const payload: any = {};
  validColumns.forEach(col => {
    if (form[col] !== undefined) {
      // Correctly handle false values for booleans
      payload[col] = (form[col] === '' || form[col] === undefined) ? null : form[col];
    }
  });

  if (form.id) {
    const { data, error } = await supabase.from('members').update(payload).eq('id', form.id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('members').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
}
