export interface MilitaryRecord {
  id?: string;
  member_id?: string;
  is_military?: boolean | null;
  uniform_blessed_date?: string | null;
  first_uniform_use_date?: string | null;
  current_rank?: string | null;
  commission?: string | null;
}
