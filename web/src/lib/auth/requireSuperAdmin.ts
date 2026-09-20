import { redirect } from 'next/navigation';
import { getCurrentProfile } from './getCurrentProfile';

export async function requireSuperAdmin() {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');
  
  const role = result.profile?.role;
  if (role !== 'super_admin') {
    redirect('/registrar');
  }
  
  return result;
}
