import { redirect } from 'next/navigation';
import { getCurrentProfile } from './getCurrentProfile';

export async function requireFinancialRegistrar() {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');
  
  const role = result.profile?.role;
  if (role !== 'financial_registrar' && role !== 'super_admin') {
    redirect('/me');
  }
  
  return result;
}
