export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getCommanderyOfficersData } from '@/services/officersService';
import CommanderyOfficersClient from '@/components/officers/CommanderyOfficersClient';

import Link from 'next/link';

export default async function RegistrarOfficersPage() {
  await requireRegistrar();
  const { positions, members } = await getCommanderyOfficersData();

  return (
    <RegistrarShell
      title="Commandery Officers"
      subtitle="View and manage official leadership positions across Commandery administrations."
    >
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/registrar/governance?tab=officers"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 700,
            color: '#1E3A8A',
            textDecoration: 'none',
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            padding: '6px 12px',
            borderRadius: 8,
          }}
        >
          🏛️ View in Unified Governance & Temples Hub →
        </Link>
      </div>
      <CommanderyOfficersClient
        initialPositions={positions}
        allMembers={members}
        isRegistrar={true}
      />
    </RegistrarShell>
  );
}
