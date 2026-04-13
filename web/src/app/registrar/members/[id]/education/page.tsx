import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import DegreesEditor from '@/components/member-sections/DegreesEditor';
import EmptyState from '@/components/shared/EmptyState';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMemberById } from '@/services/memberService';
import { getDegreesByMemberId } from '@/services/degreesService';
import { getDegreeTypeNames } from '@/services/lookupService';

export default async function RegistrarMemberEducationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRegistrar();
  const { id } = await params;
  const member = await getMemberById(id);
  if (!member?.id) {
    return (
      <RegistrarShell title='Degree' subtitle='Member not found.'>
        <EmptyState message='This member record could not be loaded.' />
      </RegistrarShell>
    );
  }
  const [degrees, degreeTypes] = await Promise.all([getDegreesByMemberId(member.id), getDegreeTypeNames()]);
  return (
    <RegistrarShell title='Degree' subtitle='Manage degree records for the selected member.'>
      <div style={{ display: 'grid', gap: 18 }}>
        <Link href={`/registrar/members/${id}`} style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>Back to member</Link>
        <DegreesEditor memberId={member.id} initialDegrees={degrees} degreeTypes={degreeTypes} />
      </div>
    </RegistrarShell>
  );
}
