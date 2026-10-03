export const dynamic = 'force-dynamic';

import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import { requireGovernanceAccess } from '@/lib/auth/requireGovernanceAccess';
import { getGovernanceHubData } from '@/services/governanceService';
import GovernanceHubClient from '@/components/governance/GovernanceHubClient';

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function RegistrarGovernancePage({ searchParams }: Props) {
  const { isRegistrar } = await requireGovernanceAccess();
  const { tab } = await searchParams;

  const initialData = await getGovernanceHubData();

  const validTabs = ['officers', 'trustees', 'temples', 'committees'] as const;
  const activeTab = validTabs.includes(tab as any) ? (tab as any) : 'officers';

  return (
    <RegistrarShell
      title="Governance & Temples Hub"
      subtitle="Executive Leadership, Board of Trustees, Degree Temples & Standing Committees"
    >
      <GovernanceHubClient
        initialData={initialData}
        isRegistrar={isRegistrar}
        defaultTab={activeTab}
      />
    </RegistrarShell>
  );
}
