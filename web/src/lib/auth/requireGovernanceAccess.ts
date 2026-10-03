import { redirect } from 'next/navigation';
import { getCurrentProfile } from './getCurrentProfile';

export async function requireGovernanceAccess() {
  const result = await getCurrentProfile();
  if (!result.user) redirect('/login');

  const role = result.profile?.role;
  const allowed = ['registrar', 'financial_registrar', 'welfare_treasurer', 'super_admin'];

  if (!allowed.includes(role || '')) {
    redirect('/me/governance');
  }

  return {
    ...result,
    isSuperAdmin: role === 'super_admin',
    isRegistrar: role === 'registrar' || role === 'super_admin',
    isFinancialRegistrar: role === 'financial_registrar',
    isWelfareTreasurer: role === 'welfare_treasurer',
    userRole: role,
  };
}
