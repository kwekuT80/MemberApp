import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/getCurrentProfile';
export default async function HomePage() { const { user, profile } = await getCurrentProfile(); if (!user) redirect('/login'); if (profile?.role === 'registrar') redirect('/registrar'); redirect('/me'); }
