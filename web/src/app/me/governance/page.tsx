export const dynamic = 'force-dynamic';

import React from 'react';
import MemberShell from '@/components/layout/MemberShell';
import { requireUser } from '@/lib/auth/requireUser';
import { getGovernanceHubData } from '@/services/governanceService';
import GovernanceHubClient from '@/components/governance/GovernanceHubClient';

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function MemberGovernancePage({ searchParams }: Props) {
  await requireUser();
  const { tab } = await searchParams;

  const initialData = await getGovernanceHubData();

  const validTabs = ['officers', 'trustees', 'temples', 'committees'] as const;
  const activeTab = validTabs.includes(tab as any) ? (tab as any) : 'officers';

  return (
    <MemberShell
      title="Commandery Governance & Temples"
      subtitle="Directory of Leadership, Constitutional Board of Trustees, Higher Degree Temples & Committees"
    >
      <GovernanceHubClient
        initialData={initialData}
        isRegistrar={false}
        defaultTab={activeTab}
      />
    </MemberShell>
  );
}
