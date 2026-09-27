export const dynamic = 'force-dynamic';

import React from 'react';
import MemberShell from '@/components/layout/MemberShell';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyInitiationCohort } from '@/services/memberService';
import MyCohortClient from './MyCohortClient';

export default async function MyCohortPage() {
  await requireUser();
  const cohortData = await getMyInitiationCohort();

  const title = cohortData.hasCohort
    ? `My Initiation Cohort (${cohortData.formattedDate})`
    : 'My Initiation Cohort';

  const subtitle = cohortData.hasCohort
    ? `View the brothers initiated alongside you in St. Margaret-Mary Commandery #500.`
    : 'Overview of your initiation class and fraternal brethren.';

  return (
    <MemberShell title={title} subtitle={subtitle}>
      <MyCohortClient cohortData={cohortData} />
    </MemberShell>
  );
}
