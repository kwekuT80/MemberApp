export type UserRole = 'member' | 'registrar';
export interface Profile {
  id: string;
  email: string | null;
  role: UserRole;
  commandery_id?: string | null;
  status?: 'pending' | 'approved' | 'active' | null;
  member_id?: string | null;
  first_name?: string | null;
  surname?: string | null;
  phone?: string | null;
  updated_at?: string | null;
}
