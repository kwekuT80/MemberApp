import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/getCurrentProfile';

export default async function HomePage() {
  const { user, profile } = await getCurrentProfile();
  if (!user) {
    redirect('/login');
  }

  const role = profile?.role;
  if (role === 'registrar' || role === 'super_admin') {
    redirect('/registrar');
  } else if (role === 'financial_registrar') {
    redirect('/registrar/financials');
  }

  redirect('/me');
}
