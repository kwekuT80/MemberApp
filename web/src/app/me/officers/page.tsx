export const dynamic = 'force-dynamic';

import React from 'react';
import MemberShell from '@/components/layout/MemberShell';
import { requireUser } from '@/lib/auth/requireUser';
import { getCommanderyOfficersData } from '@/services/officersService';
import CommanderyOfficersClient from '@/components/officers/CommanderyOfficersClient';

export default async function MemberOfficersPage() {
  await requireUser();
  const { positions, members } = await getCommanderyOfficersData();

  return (
    <MemberShell
      title="Commandery Officers"
      subtitle="Directory of Commandery leadership and administration officers."
    >
      <CommanderyOfficersClient
        initialPositions={positions}
        allMembers={members}
        isRegistrar={false}
      />
    </MemberShell>
  );
}
