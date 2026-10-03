import { redirect } from 'next/navigation';

export default async function LegacyRegistrarMemberEducationRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/registrar/members/${id}/exemplification`);
}
