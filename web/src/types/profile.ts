export type UserRole = 'member' | 'registrar';
export interface Profile {
  id: string;
  email: string | null;
  role: UserRole;
  updated_at?: string | null;
}
