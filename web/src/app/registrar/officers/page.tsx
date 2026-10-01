export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getCommanderyOfficersData } from '@/services/officersService';
import CommanderyOfficersClient from '@/components/officers/CommanderyOfficersClient';

export default async function RegistrarOfficersPage() {
  await requireRegistrar();
  const { positions, members } = await getCommanderyOfficersData();

  return (
    <RegistrarShell
      title="Commandery Officers"
      subtitle="View and manage official leadership positions across Commandery administrations."
    >
      <CommanderyOfficersClient
        initialPositions={positions}
        allMembers={members}
        isRegistrar={true}
      />
    </RegistrarShell>
  );
}
