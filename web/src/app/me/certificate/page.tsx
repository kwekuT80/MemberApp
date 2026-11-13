import React from 'react';
import MemberShell from '@/components/layout/MemberShell';
import EmptyState from '@/components/shared/EmptyState';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember, getMemberPersonalReport } from '@/services/memberService';
import GoodStandingCertificate from '@/components/documents/GoodStandingCertificate';

export default async function MyCertificatePage() {
  await requireUser();
  const myMember = await getMyMember();

  if (!myMember) {
    return (
      <MemberShell title="Certificate of Good Standing" subtitle="Official membership credentials">
        <EmptyState message="Unable to locate your member profile." />
      </MemberShell>
    );
  }

  const report = await getMemberPersonalReport(myMember.id);

  if (!report) {
    return (
      <MemberShell title="Certificate of Good Standing" subtitle="Official membership credentials">
        <EmptyState message="Could not generate certificate report data for your record." />
      </MemberShell>
    );
  }

  return (
    <MemberShell title="Certificate of Good Standing" subtitle="Official fraternal credential issued by Commandery #500">
      <GoodStandingCertificate 
        report={report} 
        backHref="/me" 
        isRegistrarView={false} 
      />
    </MemberShell>
  );
}
