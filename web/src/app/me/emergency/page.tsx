import MemberShell from '@/components/layout/MemberShell';
import EmergencyContactsEditor from '@/components/member-sections/EmergencyContactsEditor';
import EmptyState from '@/components/shared/EmptyState';
import { requireUser } from '@/lib/auth/requireUser';
import { getMyMember } from '@/services/memberService';
import { getEmergencyContactsByMemberId } from '@/services/emergencyContactsService';
export default async function MeEmergencyPage() { await requireUser(); const member = await getMyMember(); if (!member?.id) return <MemberShell title='Emergency Contacts' subtitle='Create your main member record first.'><EmptyState message='Please save your main member record before editing emergency contacts.' /></MemberShell>; const contacts = await getEmergencyContactsByMemberId(member.id); return <MemberShell title='Emergency Contacts' subtitle='Manage emergency contact records.'><EmergencyContactsEditor memberId={member.id} initialContacts={contacts} /></MemberShell>; }
