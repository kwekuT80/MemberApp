import Link from 'next/link';
import MemberShell from '@/components/layout/MemberShell';
import MemberMainForm from '@/components/members/MemberMainForm';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';

export default async function MeEditPage() {
  await requireUser();
  const member = await getMyMember();

  return (
    <MemberShell title='Edit Main Record' subtitle='Update the core member information stored in the members table.'>
      <div style={{ display: 'grid', gap: 18 }}>
        <Link href='/me' style={{ textDecoration: 'none', color: '#10233f', fontWeight: 700 }}>
          ← Back to Overview
        </Link>
        <MemberMainForm initialMember={member} mode='self' />
      </div>
    </MemberShell>
  );
}
