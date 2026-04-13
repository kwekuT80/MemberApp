import Link from 'next/link';
import RegistrarShell from '@/components/layout/RegistrarShell';
import EmergencyContactsEditor from '@/components/member-sections/EmergencyContactsEditor';
import EmptyState from '@/components/shared/EmptyState';
import { requireRegistrar } from '@/lib/auth/requireRegistrar';
import { getMemberById } from '@/services/memberService';
import { getEmergencyContactsByMemberId } from '@/services/emergencyContactsService';
export default async function RegistrarMemberEmergencyPage({ params }: { params: Promise<{ id: string }> }) { await requireRegistrar(); const { id } = await params; const member = await getMemberById(id); if (!member?.id) return <RegistrarShell title='Emergency Contacts' subtitle='Member not found.'><EmptyState message='This member record could not be loaded.' /></RegistrarShell>; const contacts = await getEmergencyContactsByMemberId(member.id); return <RegistrarShell title='Emergency Contacts' subtitle='Manage emergency contacts for the selected member.'><div style={{ display:'grid', gap:18 }}><Link href={`/registrar/members/${id}`} style={{ textDecoration:'none', color:'#10233f', fontWeight:700 }}>Back to member</Link><EmergencyContactsEditor memberId={member.id} initialContacts={contacts} /></div></RegistrarShell>; }
