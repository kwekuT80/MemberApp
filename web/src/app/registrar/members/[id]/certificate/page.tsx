import React from 'react';
import RegistrarShell from '@/components/layout/RegistrarShell';
import EmptyState from '@/components/shared/EmptyState';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMemberPersonalReport } from '@/services/memberService';
import GoodStandingCertificate from '@/components/documents/GoodStandingCertificate';

export default async function RegistrarMemberCertificatePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRegistrar();
  const { id } = await params;
  const report = await getMemberPersonalReport(id);

  if (!report) {
    return (
      <RegistrarShell title="Certificate of Good Standing" subtitle="Official credentials view">
        <EmptyState message="Could not compile certificate report data for this member." />
      </RegistrarShell>
    );
  }

  return (
    <RegistrarShell 
      title="Certificate of Good Standing" 
      subtitle={`Official fraternal standing credential for Bro. ${report.member.surname}`}
    >
      <GoodStandingCertificate 
        report={report} 
        backHref={`/registrar/members/${id}`} 
        isRegistrarView={true} 
      />
    </RegistrarShell>
  );
}
