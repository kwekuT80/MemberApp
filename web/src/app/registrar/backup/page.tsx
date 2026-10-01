export const dynamic = 'force-dynamic';

import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { getDatabaseStats } from '@/services/backupService';
import BackupClient from './BackupClient';

export default async function BackupPage() {
  const { profile, user } = await requireRegistrar();
  const stats = await getDatabaseStats();

  return (
    <RegistrarShell
      title="Database Vault & Disaster Recovery"
      subtitle="Complete off-site database backups and emergency restoration archives"
    >
      <BackupClient stats={stats} profile={profile} userEmail={user.email || ''} />
    </RegistrarShell>
  );
}
