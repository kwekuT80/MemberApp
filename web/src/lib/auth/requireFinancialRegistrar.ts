import { redirect } from 'next/navigation';
import { getCurrentProfile } from './getCurrentProfile';

export async function requireFinancialRegistrar() {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');
  const role = result.profile?.role;
  if (role !== 'registrar' && role !== 'financial_registrar') redirect('/me');
  return result;
}
